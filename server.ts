import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import * as url from 'url';
import { compileReact, compileHtml } from 'zeno-compiler-core';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post('/api/compile', async (req, res) => {
    try {
      const body = req.body;
      const figmaUrl = body.figmaUrl || body.url;
      const format = body.format || body.outputFormat || 'react';
      const figmaToken = body.figmaToken || process.env.FIGMA_TOKEN;

      if (!figmaUrl) return res.status(400).json({ error: "Missing Figma URL." });
      if (!figmaToken) return res.status(400).json({ error: "Missing Figma Token." });

      // Parse URL
      const fileIdMatch = figmaUrl.match(/\/(?:file|design)\/([a-zA-Z0-9]+)/);
      const fileId = fileIdMatch ? fileIdMatch[1] : null;

      const nodeIdMatch = figmaUrl.match(/node-id=([a-zA-Z0-9\-%]+)/);
      let nodeId = nodeIdMatch ? nodeIdMatch[1] : null;

      if (nodeId) {
        nodeId = decodeURIComponent(nodeId).replace(/-/g, ':');
      }

      if (!fileId || !nodeId) {
        return res.status(400).json({ error: "Could not extract File ID or Node ID from URL." });
      }

      // Fetch layout
      const layoutRes = await fetch(`https://api.figma.com/v1/files/${fileId}/nodes?ids=${nodeId}`, {
        headers: { 'X-Figma-Token': figmaToken }
      });
      if (!layoutRes.ok) {
        if (layoutRes.status === 403) {
           return res.status(403).json({ error: "Figma token is invalid or expired." });
        }
        throw new Error(`Figma Layout API Error: ${layoutRes.status} ${await layoutRes.text()}`);
      }
      const layoutData = await layoutRes.json();
      
      if (!layoutData.nodes || !layoutData.nodes[nodeId]) {
         return res.status(400).json({ error: "Figma node not found in Layout data." });
      }
      const figmaData = layoutData.nodes[nodeId].document;

      // ID Extractor logic
      let targetIds: string[] = [];

      function hasVectorDeep(n: any): boolean {
        if (!n || n.visible === false) return false;
        let bw = n.size ? n.size.x : (n.absoluteBoundingBox ? n.absoluteBoundingBox.width : 0);
        let bh = n.size ? n.size.y : (n.absoluteBoundingBox ? n.absoluteBoundingBox.height : 0);
        const isOrthogonalLine = n.type === 'LINE' || bw <= 0.01 || bh <= 0.01;
        
        if (!isOrthogonalLine) {
            if (['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'REGULAR_POLYGON'].includes(n.type)) return true;
            if (n.type === 'ELLIPSE' && n.arcData) return true;
        }
        if (n.children) return n.children.some(hasVectorDeep);
        return false;
      }

      function extractIds(node: any) {
        if (!node || node.visible === false) return;

        const isImage = node.fills && node.fills.some((f: any) => f.type === 'IMAGE' && f.visible !== false);
        if (isImage) {
            targetIds.push(node.id);
            return;
        }

        function hasTextDeep(n: any): boolean {
            if (!n || n.visible === false) return false;
            if (n.type === 'TEXT') return true;
            if (n.children) return n.children.some(hasTextDeep);
            return false;
        }

        const isContainer = ['FRAME', 'GROUP', 'INSTANCE', 'COMPONENT', 'SECTION'].includes(node.type);
        if (isContainer) {
            if (node.id !== nodeId && hasVectorDeep(node) && !hasTextDeep(node)) {
                targetIds.push(node.id);
                return;
            }
        }

        let bw = node.size ? node.size.x : (node.absoluteBoundingBox ? node.absoluteBoundingBox.width : 0);
        let bh = node.size ? node.size.y : (node.absoluteBoundingBox ? node.absoluteBoundingBox.height : 0);
        const isOrthogonalLine = node.type === 'LINE' || bw <= 0.01 || bh <= 0.01;

        let isVector = false;
        if (!isOrthogonalLine) {
            isVector = ['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'REGULAR_POLYGON'].includes(node.type) || (node.type === 'ELLIPSE' && node.arcData);
        }
        
        if (isVector) {
            targetIds.push(node.id);
            return;
        }

        if (node.children) node.children.forEach(extractIds);
      }

      extractIds(figmaData);
      if (targetIds.length === 0) targetIds.push(nodeId);
      targetIds = [...new Set(targetIds)];

      const encodedIds = targetIds.map(id => encodeURIComponent(id)).join(',');

      // Fetch svg images
      const imagesRes = await fetch(`https://api.figma.com/v1/images/${fileId}?ids=${encodedIds}&format=svg&use_absolute_bounds=true`, {
        headers: { 'X-Figma-Token': figmaToken }
      });
      let hostedImages = {};
      if (imagesRes.ok) {
         const imagesData = await imagesRes.json();
         hostedImages = imagesData.images || {};
      }

      // Compile engines
      let finalCode = '';
      if (format === 'react') {
         finalCode = compileReact(figmaData, hostedImages);
      } else {
         finalCode = compileHtml(figmaData, hostedImages);
      }

      res.json({ status: "success", rawCode: finalCode });

    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Internal server error" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
