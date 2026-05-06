export function compileReact(figmaData: any, hostedImages: any) {
    const rootX = figmaData.absoluteBoundingBox ? figmaData.absoluteBoundingBox.x : 0;
    const rootY = figmaData.absoluteBoundingBox ? figmaData.absoluteBoundingBox.y : 0;
    const rootWidth = figmaData.absoluteBoundingBox ? figmaData.absoluteBoundingBox.width : 1440;
    const rootHeight = figmaData.absoluteBoundingBox ? figmaData.absoluteBoundingBox.height : 3000;
    
    function toCqw(val: number) { return +(val / rootWidth * 100).toFixed(4) + 'cqw'; }
    
    let fontFamilies = new Set<string>();
    
    function escapeJSX(str: string) {
        let clean = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        clean = clean.replace(/{/g, '{"{"}').replace(/}/g, '{"}"}');
        clean = clean.replace(/(\r\n|\n|\r)/g, '<br />');
        return clean;
    }
    
    function cssToReactStyle(cssString: string) {
        const styleObj: any = {};
        cssString.split(';').forEach(rule => {
            const parts = rule.split(':');
            const key = parts.shift();
            if (key && parts.length > 0) {
                let camelKey = key.trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
                if (camelKey.startsWith('webkit')) camelKey = 'W' + camelKey.slice(1);
                styleObj[camelKey] = parts.join(':').trim();
            }
        });
        return styleObj;
    }
    
    function getRotationAngle(node: any) {
        if (!node.relativeTransform) return 0;
        const m00 = node.relativeTransform[0][0];
        const m10 = node.relativeTransform[1][0];
        return Math.atan2(m10, m00) * (180 / Math.PI);
    }
    
    function buildMaskReact(maskNode: any, maskHtml: string, parentX: number, parentY: number) {
        if (!maskNode || !maskNode.absoluteBoundingBox) return maskHtml;
        const mX = maskNode.absoluteBoundingBox.x - parentX;
        const mY = maskNode.absoluteBoundingBox.y - parentY;
        const mW = maskNode.absoluteBoundingBox.width;
        const mH = maskNode.absoluteBoundingBox.height;
        
        let maskStyle = `position: absolute; left: ${toCqw(mX)}; top: ${toCqw(mY)}; width: max(1px, ${toCqw(mW)}); height: max(1px, ${toCqw(mH)}); overflow: hidden; z-index: 0; `;
    
        if (maskNode.rectangleCornerRadii && maskNode.rectangleCornerRadii.length === 4) {
            maskStyle += `border-radius: ${toCqw(maskNode.rectangleCornerRadii[0])} ${toCqw(maskNode.rectangleCornerRadii[1])} ${toCqw(maskNode.rectangleCornerRadii[2])} ${toCqw(maskNode.rectangleCornerRadii[3])}; `;
        } else if (maskNode.cornerRadius) {
            maskStyle += `border-radius: ${toCqw(maskNode.cornerRadius)}; `;
        } else if (maskNode.type === 'ELLIPSE') {
            maskStyle += `border-radius: 50%; `;
        }
    
        return `<div style={${JSON.stringify(cssToReactStyle(maskStyle))}}>${maskHtml}</div>`;
    }
    
    function buildSpanJSX(textChunk: string, overrideId: number, node: any) {
        if (!textChunk) return '';
        let escapedText = escapeJSX(textChunk);
        if (overrideId === 0 || !node.styleOverrideTable || !node.styleOverrideTable[overrideId]) {
            return escapedText;
        }
        const overrideStyle = node.styleOverrideTable[overrideId];
        let spanStyle = '';
    
        let fw = overrideStyle.fontWeight;
        if (fw === undefined && overrideStyle.fontPostScriptName) {
            const ps = overrideStyle.fontPostScriptName.toLowerCase();
            if (ps.includes('bold')) fw = 700;
            else if (ps.includes('semibold')) fw = 600;
            else if (ps.includes('medium')) fw = 500;
            else if (ps.includes('light')) fw = 300;
            else if (ps.includes('black') || ps.includes('heavy')) fw = 900;
        }
        if (fw !== undefined) spanStyle += `font-weight: ${fw}; `;
    
        if (overrideStyle.fontSize !== undefined) spanStyle += `font-size: ${toCqw(overrideStyle.fontSize)}; `;
        if (overrideStyle.fontFamily) {
            fontFamilies.add(overrideStyle.fontFamily);
            spanStyle += `font-family: '${overrideStyle.fontFamily}', -apple-system, sans-serif; `;
        }
        if (overrideStyle.italic) spanStyle += `font-style: italic; `;
        if (overrideStyle.textDecoration === 'UNDERLINE') spanStyle += `text-decoration: underline; `;
        if (overrideStyle.textDecoration === 'STRIKETHROUGH') spanStyle += `text-decoration: line-through; `;
        
        if (overrideStyle.fills && overrideStyle.fills.length > 0) {
            const solidFill = overrideStyle.fills.find((f: any) => f.type === 'SOLID' && f.visible !== false);
            if (solidFill) {
                const c = solidFill.color; 
                const a = solidFill.opacity !== undefined ? solidFill.opacity : (c.a !== undefined ? c.a : 1);
                spanStyle += `color: rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a}); `;
            }
        }
    
        if (spanStyle) {
            return `<span style={${JSON.stringify(cssToReactStyle(spanStyle))}}>${escapedText}</span>`;
        }
        return escapedText;
    }
    
    function buildNode(node: any, parentAbsX: number, parentAbsY: number, pW: number, pH: number, inheritedOpacity = 1): string {
        if (!node || node.visible === false || !node.absoluteBoundingBox) return '';
    
        const isHostedImage = hostedImages[node.id] !== undefined;
        const currentOpacity = (node.opacity !== undefined ? node.opacity : 1) * inheritedOpacity;
        const rotationAngle = getRotationAngle(node);
        const isText = node.type === 'TEXT';
    
        let w = node.size ? node.size.x : node.absoluteBoundingBox.width;
        let h = node.size ? node.size.y : node.absoluteBoundingBox.height;
    
        let isEffectivelyLine = !isText && (node.type === 'LINE' || w <= 0.01 || h <= 0.01);
        if (isEffectivelyLine) {
            const weight = node.strokeWeight || 1;
            if (h <= 0.01) h = Math.max(weight, 1);
            if (w <= 0.01) w = Math.max(weight, 1);
        }
    
        const aabbX = node.absoluteBoundingBox.x - parentAbsX;
        const aabbY = node.absoluteBoundingBox.y - parentAbsY;
    
        let containerStyle = `position: absolute; box-sizing: border-box; margin: 0; padding: 0; `;
        containerStyle += `left: ${toCqw(aabbX)}; top: ${toCqw(aabbY)}; width: max(1px, ${toCqw(w)}); height: max(1px, ${toCqw(h)}); `;
        
        if (Math.abs(rotationAngle) > 0.01) containerStyle += `transform: rotate(${rotationAngle}deg); `;
        if (currentOpacity < 1) containerStyle += `opacity: ${currentOpacity}; `;
        if (node.blendMode && !['PASS_THROUGH', 'NORMAL'].includes(node.blendMode)) containerStyle += `mix-blend-mode: ${node.blendMode.toLowerCase().replace('_', '-')}; `;
        if (node.clipsContent) containerStyle += `overflow: hidden; `;
    
        let radiusStyle = '';
    
        if (!isText && !isHostedImage) {
            if (node.rectangleCornerRadii && node.rectangleCornerRadii.length === 4) {
                radiusStyle = `border-radius: ${toCqw(node.rectangleCornerRadii[0])} ${toCqw(node.rectangleCornerRadii[1])} ${toCqw(node.rectangleCornerRadii[2])} ${toCqw(node.rectangleCornerRadii[3])}; `;
            } else if (node.cornerRadius) {
                radiusStyle = `border-radius: ${toCqw(node.cornerRadius)}; `;
            } else if (node.type === 'ELLIPSE') {
                radiusStyle = `border-radius: 50%; `;
            }
        }
        containerStyle += radiusStyle;
    
        let visualStyle = `position: absolute; top: 0; left: 0; right: 0; bottom: 0; box-sizing: border-box; pointer-events: none; border-radius: inherit; `;
        let hasVisuals = false;
    
        let imgHTML = ''; let textHTML = ''; let innerHTML = ''; let strokeOverlayHTML = ''; let textShadowStyle = '';
    
        const isPureShape = ['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'REGULAR_POLYGON'].includes(node.type) || (node.type === 'ELLIPSE' && node.arcData);
    
        if (isHostedImage) {
            let objectFit = isPureShape ? 'contain' : 'cover';
            imgHTML = `<img src="${hostedImages[node.id]}" style={${JSON.stringify(cssToReactStyle(`position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: ${objectFit}; object-position: center; border-radius: inherit; pointer-events: none; display: block;`))}} />`;
        } else if (isEffectivelyLine) {
            const paint = (node.strokes && node.strokes.find((s: any) => s.visible !== false)) || (node.fills && node.fills.find((f: any) => f.visible !== false));
            if (paint) {
                hasVisuals = true;
                let fillOpacity = paint.opacity !== undefined ? paint.opacity : 1;
                if (paint.type === 'SOLID') {
                    const c = paint.color; const a = (c.a !== undefined ? c.a : 1) * fillOpacity;
                    const colorStr = `rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a})`;
                    const isDashed = node.strokeDashes && node.strokeDashes.length > 0;
                    if (isDashed) {
                        const dash = node.strokeDashes[0] || 6;
                        const gap = node.strokeDashes.length > 1 ? node.strokeDashes[1] : dash;
                        if (h > w) {
                            visualStyle += `background-image: repeating-linear-gradient(to bottom, ${colorStr} 0, ${colorStr} ${toCqw(dash)}, transparent ${toCqw(dash)}, transparent ${toCqw(dash + gap)}); background-color: transparent; border: none; `;
                        } else {
                            visualStyle += `background-image: repeating-linear-gradient(to right, ${colorStr} 0, ${colorStr} ${toCqw(dash)}, transparent ${toCqw(dash)}, transparent ${toCqw(dash + gap)}); background-color: transparent; border: none; `;
                        }
                    } else {
                        visualStyle += `background-color: ${colorStr}; border: none; `;
                    }
                } else if (paint.type.includes('GRADIENT')) {
                    let gradStyle = '';
                    const stops = paint.gradientStops.map((s: any) => {
                        const c = s.color; const a = (c.a !== undefined ? c.a : 1) * fillOpacity;
                        return `rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a}) ${+(s.position * 100).toFixed(1)}%`;
                    }).join(', ');
                    if (paint.type === 'GRADIENT_LINEAR') {
                        let angle = 90;
                        if (paint.gradientHandlePositions && paint.gradientHandlePositions.length >= 2) {
                            const p1 = paint.gradientHandlePositions[0];
                            const p2 = paint.gradientHandlePositions[1];
                            angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI) + 90;
                        }
                        gradStyle = `linear-gradient(${angle}deg, ${stops})`;
                    } else {
                        gradStyle = `radial-gradient(circle, ${stops})`;
                    }
                    visualStyle += `background: ${gradStyle}; border: none; `;
                }
            }
        } else if (isPureShape) {
            // Blob protection explicitly disables CSS fills for missing vectors
        } else {
            if (node.fills && !isText) {
                let bgStylesArray: string[] = [];
                node.fills.forEach((fill: any) => {
                    if (fill.visible === false) return;
                    const fillOpacity = fill.opacity !== undefined ? fill.opacity : 1;
                    if (fill.type === 'SOLID') {
                        const c = fill.color; const a = (c.a !== undefined ? c.a : 1) * fillOpacity;
                        if (a > 0) bgStylesArray.push(`rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a})`);
                    } else if (fill.type === 'GRADIENT_LINEAR') {
                        const stops = fill.gradientStops.map((s: any) => {
                            const c = s.color; const a = (c.a !== undefined ? c.a : 1) * fillOpacity;
                            return `rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a}) ${+(s.position * 100).toFixed(1)}%`;
                        }).join(', ');
                        let angle = 90; 
                        if (fill.gradientHandlePositions && fill.gradientHandlePositions.length >= 2) {
                            const p1 = fill.gradientHandlePositions[0];
                            const p2 = fill.gradientHandlePositions[1];
                            angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI) + 90;
                        }
                        bgStylesArray.push(`linear-gradient(${angle}deg, ${stops})`);
                    } else if (fill.type === 'GRADIENT_RADIAL') {
                        const stops = fill.gradientStops.map((s: any) => {
                            const c = s.color; const a = (c.a !== undefined ? c.a : 1) * fillOpacity;
                            return `rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a}) ${+(s.position * 100).toFixed(1)}%`;
                        }).join(', ');
                        bgStylesArray.push(`radial-gradient(circle, ${stops})`);
                    }
                });
                if (bgStylesArray.length > 0) { 
                    bgStylesArray.reverse();
                    visualStyle += `background: ${bgStylesArray.join(', ')}; `; 
                    hasVisuals = true; 
                }
            }
            
            if (node.strokes && !isText) {
                const stroke = node.strokes.find((s: any) => s.visible !== false);
                if (stroke) {
                    hasVisuals = true;
                    let fillOpacity = stroke.opacity !== undefined ? stroke.opacity : 1;
                    if (stroke.type === 'SOLID') {
                        const c = stroke.color; const a = (c.a !== undefined ? c.a : 1) * fillOpacity;
                        const colorStr = `rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a})`;
                        const isDashed = node.strokeDashes && node.strokeDashes.length > 0;
                        const borderStyle = isDashed ? 'dashed' : 'solid';
                        if (node.individualStrokeWeights) {
                            if (node.individualStrokeWeights.top > 0) visualStyle += `border-top: max(1px, ${toCqw(node.individualStrokeWeights.top)}) ${borderStyle} ${colorStr}; `;
                            if (node.individualStrokeWeights.right > 0) visualStyle += `border-right: max(1px, ${toCqw(node.individualStrokeWeights.right)}) ${borderStyle} ${colorStr}; `;
                            if (node.individualStrokeWeights.bottom > 0) visualStyle += `border-bottom: max(1px, ${toCqw(node.individualStrokeWeights.bottom)}) ${borderStyle} ${colorStr}; `;
                            if (node.individualStrokeWeights.left > 0) visualStyle += `border-left: max(1px, ${toCqw(node.individualStrokeWeights.left)}) ${borderStyle} ${colorStr}; `;
                        } else {
                            const sw = node.strokeWeight || 1; visualStyle += `border: max(1px, ${toCqw(sw)}) ${borderStyle} ${colorStr}; `;
                        }
                    } else if (stroke.type.includes('GRADIENT')) {
                        let gradStyle = '';
                        const stops = stroke.gradientStops.map((s: any) => {
                            const c = s.color; const a = (c.a !== undefined ? c.a : 1) * fillOpacity;
                            return `rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a}) ${+(s.position * 100).toFixed(1)}%`;
                        }).join(', ');
                        if (stroke.type === 'GRADIENT_LINEAR') {
                            let angle = 90;
                            if (stroke.gradientHandlePositions && stroke.gradientHandlePositions.length >= 2) {
                                const p1 = stroke.gradientHandlePositions[0];
                                const p2 = stroke.gradientHandlePositions[1];
                                angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI) + 90;
                            }
                            gradStyle = `linear-gradient(${angle}deg, ${stops})`;
                        } else {
                            gradStyle = `radial-gradient(circle, ${stops})`;
                        }
                        const sw = node.strokeWeight || 1;
                        let overlayStyle = `position: absolute; top: 0; left: 0; right: 0; bottom: 0; box-sizing: border-box; pointer-events: none; border: max(1px, ${toCqw(sw)}) solid transparent; background: ${gradStyle} border-box; -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; border-radius: inherit; `;
                        strokeOverlayHTML = `<div style={${JSON.stringify(cssToReactStyle(overlayStyle))}}></div>`;
                    }
                }
            }
        }
    
        if (node.effects) {
            let innerShadows = [];
            let dropShadows = [];
            let textShadows = [];
            for (const effect of node.effects) {
                if (effect.visible !== false && (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW')) {
                    const c = effect.color;
                    const alpha = c.a !== undefined ? c.a : 1;
                    const spread = effect.spread !== undefined ? toCqw(effect.spread) + ' ' : '';
                    const colorStr = `rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${alpha})`;
                    
                    if (isText && effect.type === 'DROP_SHADOW') {
                        textShadows.push(`${toCqw(effect.offset.x)} ${toCqw(effect.offset.y)} ${toCqw(effect.radius)} ${colorStr}`);
                    } else if (!isText) {
                        if (effect.type === 'INNER_SHADOW') {
                            innerShadows.push(`inset ${toCqw(effect.offset.x)} ${toCqw(effect.offset.y)} ${toCqw(effect.radius)} ${spread}${colorStr}`);
                        } else {
                            dropShadows.push(`${toCqw(effect.offset.x)} ${toCqw(effect.offset.y)} ${toCqw(effect.radius)} ${spread}${colorStr}`);
                        }
                    }
                }
                if (effect.visible !== false && effect.type === 'BACKGROUND_BLUR') {
                    if (!isText) {
                        visualStyle += `backdrop-filter: blur(${toCqw(effect.radius)}); -webkit-backdrop-filter: blur(${toCqw(effect.radius)}); `; hasVisuals = true;
                    }
                }
                if (effect.visible !== false && effect.type === 'LAYER_BLUR') {
                    containerStyle += `filter: blur(${toCqw(effect.radius)}); -webkit-filter: blur(${toCqw(effect.radius)}); `;
                }
            }
            if (!isText && innerShadows.length > 0) { visualStyle += `box-shadow: ${innerShadows.join(', ')}; `; hasVisuals = true; }
            if (!isText && dropShadows.length > 0) { containerStyle += `box-shadow: ${dropShadows.join(', ')}; `; }
            if (isText && textShadows.length > 0) { textShadowStyle = `text-shadow: ${textShadows.join(', ')}; `; }
        }
    
        if (isText) {
            containerStyle += textShadowStyle;
            containerStyle += 'display: flex; flex-direction: column; overflow: visible; font-kerning: normal; text-rendering: optimizeLegibility; ';
            
            if (node.style && node.style.textAutoResize === 'WIDTH_AND_HEIGHT') {
                containerStyle += 'white-space: pre; ';
            } else {
                containerStyle += 'white-space: pre-wrap; overflow-wrap: break-word; word-break: break-word; ';
            }
    
            if (node.characters) {
                if (node.characterStyleOverrides && node.characterStyleOverrides.length > 0 && node.styleOverrideTable) {
                    let currentOverride = node.characterStyleOverrides[0];
                    let currentSpanText = '';
                    textHTML = '';
                    for (let i = 0; i < node.characters.length; i++) {
                        const char = node.characters[i];
                        const overrideId = node.characterStyleOverrides[i] !== undefined ? node.characterStyleOverrides[i] : 0;
                        if (overrideId !== currentOverride) {
                            textHTML += buildSpanJSX(currentSpanText, currentOverride, node);
                            currentSpanText = char;
                            currentOverride = overrideId;
                        } else {
                            currentSpanText += char;
                        }
                    }
                    if (currentSpanText.length > 0) {
                        textHTML += buildSpanJSX(currentSpanText, currentOverride, node);
                    }
                } else {
                    textHTML = escapeJSX(node.characters);
                }
            }
    
            if (node.style) {
                containerStyle += `font-size: ${toCqw(node.style.fontSize)}; font-weight: ${node.style.fontWeight}; `;
                if (node.style.fontFamily) {
                    fontFamilies.add(node.style.fontFamily);
                    containerStyle += `font-family: '${node.style.fontFamily}', -apple-system, sans-serif; `;
                }
                if (node.style.textCase === 'UPPER') containerStyle += `text-transform: uppercase; `;
                else if (node.style.textCase === 'LOWER') containerStyle += `text-transform: lowercase; `;
                else if (node.style.textCase === 'TITLE') containerStyle += `text-transform: capitalize; `;
                if (node.style.italic) containerStyle += `font-style: italic; `;
                if (node.style.lineHeightPx) containerStyle += `line-height: ${toCqw(node.style.lineHeightPx)}; `;
                else containerStyle += `line-height: normal; `;
                if (node.style.letterSpacing !== undefined) containerStyle += `letter-spacing: ${toCqw(node.style.letterSpacing)}; `;
                
                if (node.style.textAlignHorizontal === 'CENTER') containerStyle += `text-align: center; align-items: center; `;
                else if (node.style.textAlignHorizontal === 'RIGHT') containerStyle += `text-align: right; align-items: flex-end; `;
                else containerStyle += `text-align: left; align-items: flex-start; `;
                
                if (node.style.textAlignVertical === 'CENTER') containerStyle += `justify-content: center; `;
                else if (node.style.textAlignVertical === 'BOTTOM') containerStyle += `justify-content: flex-end; `;
                else containerStyle += `justify-content: flex-start; `;
            }
    
            let fontColorHTML = `color: #000000; `;
            if (node.fills && node.fills.length > 0) {
                const solidFill = node.fills.find((f: any) => f.type === 'SOLID' && f.visible !== false);
                const gradFill = node.fills.find((f: any) => f.type === 'GRADIENT_LINEAR' && f.visible !== false);
                if (solidFill) {
                    const c = solidFill.color; const a = solidFill.opacity !== undefined ? solidFill.opacity : (c.a !== undefined ? c.a : 1);
                    fontColorHTML = `color: rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a}); `;
                } else if (gradFill) {
                    const stops = gradFill.gradientStops.map((s: any) => {
                        const c = s.color; const a = c.a !== undefined ? c.a : 1;
                        return `rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a}) ${+(s.position * 100).toFixed(1)}%`;
                    }).join(', ');
                    fontColorHTML = `background: linear-gradient(90deg, ${stops}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; `;
                }
            }
            
            textHTML = `<div style={${JSON.stringify(cssToReactStyle("display: block; width: 100%; margin: 0; padding: 0; " + fontColorHTML))}}>${textHTML}</div>`;
        }
    
        if (!isHostedImage && node.children) {
            let currentMask: any = null;
            let maskInnerHtml = '';
            node.children.forEach((child: any) => {
                if (child.isMask) {
                    if (currentMask) {
                        innerHTML += buildMaskReact(currentMask, maskInnerHtml, node.absoluteBoundingBox.x, node.absoluteBoundingBox.y);
                    }
                    currentMask = child;
                    maskInnerHtml = '';
                } else if (currentMask) {
                    maskInnerHtml += buildNode(child, currentMask.absoluteBoundingBox.x, currentMask.absoluteBoundingBox.y, currentMask.absoluteBoundingBox.width, currentMask.absoluteBoundingBox.height, currentOpacity);
                } else {
                    innerHTML += buildNode(child, node.absoluteBoundingBox.x, node.absoluteBoundingBox.y, w, h, currentOpacity);
                }
            });
            if (currentMask) {
                innerHTML += buildMaskReact(currentMask, maskInnerHtml, node.absoluteBoundingBox.x, node.absoluteBoundingBox.y);
            }
        }
    
        let htmlTag = 'div';
        let extraAttributes = '';
        
        const hasReactions = node.reactions && node.reactions.length > 0;
        const hasTransition = !!node.transitionNodeID;
    
        if (hasReactions || hasTransition) {
            let isUrl = false;
            let urlHref = '';
            
            if (hasReactions) {
                const urlReaction = node.reactions.find((r: any) => r.action && r.action.type === 'URL');
                if (urlReaction) {
                    isUrl = true;
                    urlHref = urlReaction.action.url;
                }
            }
    
            if (isUrl) {
                htmlTag = 'a';
                extraAttributes = ` href="${urlHref}" target="_blank" rel="noopener noreferrer"`;
            } else {
                htmlTag = 'button';
                extraAttributes = ` type="button"`;
            }
            
            containerStyle += `appearance: none; background: transparent; border: none; padding: 0; margin: 0; text-decoration: none; cursor: pointer; outline: none; box-shadow: none; z-index: 50; pointer-events: auto; `;
        }
    
        let finalVisualDiv = hasVisuals ? `<div style={${JSON.stringify(cssToReactStyle(visualStyle))}}></div>` : '';
        return `<${htmlTag} style={${JSON.stringify(cssToReactStyle(containerStyle))}}${extraAttributes}>${finalVisualDiv}${imgHTML}${strokeOverlayHTML}${textHTML}${innerHTML}</${htmlTag}>`;
    }
    
    let rootBg = '#ffffff';
    if (figmaData.fills && figmaData.fills.length > 0) {
        const bgFill = figmaData.fills.find((f: any) => f.type === 'SOLID' && f.visible !== false);
        if (bgFill) {
            const a = bgFill.opacity !== undefined ? bgFill.opacity : (bgFill.color.a !== undefined ? bgFill.color.a : 1);
            rootBg = `rgba(${Math.round(bgFill.color.r*255)}, ${Math.round(bgFill.color.g*255)}, ${Math.round(bgFill.color.b*255)}, ${a})`;
        }
    }
    
    let elementsHTML = '';
    if (figmaData.children) {
        figmaData.children.forEach((child: any) => {
            elementsHTML += buildNode(child, rootX, rootY, rootWidth, rootHeight, 1);
        });
    }
    
    let fontsHTML = '';
    fontFamilies.forEach(f => {
        const familyName = f.replace(/\s+/g, '+');
        fontsHTML += `<link href="https://fonts.googleapis.com/css2?family=${familyName}:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />\n        `;
    });
    
    const rootContainerStyle = `position: relative; width: 100%; min-height: 100vh; height: ${(rootHeight/rootWidth)*100}vw; background-color: ${rootBg}; margin: 0; overflow-x: hidden; overflow-y: hidden; -webkit-font-smoothing: antialiased; container-type: inline-size;`;
    
    const finalCode = `import React from 'react';\n\nexport default function FigmaDesign() {\n  return (\n    <>\n        ${fontsHTML}\n        <style dangerouslySetInnerHTML={{ __html: \`body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow-x: hidden; }\` }} />\n        <div style={${JSON.stringify(cssToReactStyle(rootContainerStyle))}}>\n            ${elementsHTML}\n        </div>\n    </>\n  );\n}`;
    
    return finalCode;
}

export function compileHtml(figmaData: any, hostedImages: any) {
    const rootX = figmaData.absoluteBoundingBox ? figmaData.absoluteBoundingBox.x : 0;
    const rootY = figmaData.absoluteBoundingBox ? figmaData.absoluteBoundingBox.y : 0;
    const rootWidth = figmaData.absoluteBoundingBox ? figmaData.absoluteBoundingBox.width : 1440;
    const rootHeight = figmaData.absoluteBoundingBox ? figmaData.absoluteBoundingBox.height : 3000;

    function toCqw(val: number) { return +(val / rootWidth * 100).toFixed(4) + 'cqw'; }

    let fontFamilies = new Set<string>();

    function escapeHTML(str: string) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/(\r\n|\n|\r)/g, '<br />');
    }

    function getRotationAngle(node: any) {
        if (!node.relativeTransform) return 0;
        const m00 = node.relativeTransform[0][0];
        const m10 = node.relativeTransform[1][0];
        return Math.atan2(m10, m00) * (180 / Math.PI);
    }

    function buildMaskHTML(maskNode: any, maskHtml: string, parentX: number, parentY: number) {
        if (!maskNode || !maskNode.absoluteBoundingBox) return maskHtml;
        const mX = maskNode.absoluteBoundingBox.x - parentX;
        const mY = maskNode.absoluteBoundingBox.y - parentY;
        const mW = maskNode.absoluteBoundingBox.width;
        const mH = maskNode.absoluteBoundingBox.height;
        
        let maskStyle = `position: absolute; left: ${toCqw(mX)}; top: ${toCqw(mY)}; width: max(1px, ${toCqw(mW)}); height: max(1px, ${toCqw(mH)}); overflow: hidden; z-index: 0; `;

        if (maskNode.rectangleCornerRadii && maskNode.rectangleCornerRadii.length === 4) {
            maskStyle += `border-radius: ${toCqw(maskNode.rectangleCornerRadii[0])} ${toCqw(maskNode.rectangleCornerRadii[1])} ${toCqw(maskNode.rectangleCornerRadii[2])} ${toCqw(maskNode.rectangleCornerRadii[3])}; `;
        } else if (maskNode.cornerRadius) {
            maskStyle += `border-radius: ${toCqw(maskNode.cornerRadius)}; `;
        } else if (maskNode.type === 'ELLIPSE') {
            maskStyle += `border-radius: 50%; `;
        }

        return `<div style="${maskStyle}">${maskHtml}</div>`;
    }

    function buildSpanHTML(textChunk: string, overrideId: number, node: any) {
        if (!textChunk) return '';
        let escapedText = escapeHTML(textChunk);
        if (overrideId === 0 || !node.styleOverrideTable || !node.styleOverrideTable[overrideId]) {
            return escapedText;
        }
        const overrideStyle = node.styleOverrideTable[overrideId];
        let spanStyle = '';

        let fw = overrideStyle.fontWeight;
        if (fw === undefined && overrideStyle.fontPostScriptName) {
            const ps = overrideStyle.fontPostScriptName.toLowerCase();
            if (ps.includes('bold')) fw = 700;
            else if (ps.includes('semibold')) fw = 600;
            else if (ps.includes('medium')) fw = 500;
            else if (ps.includes('light')) fw = 300;
            else if (ps.includes('black') || ps.includes('heavy')) fw = 900;
        }
        if (fw !== undefined) spanStyle += `font-weight: ${fw}; `;

        if (overrideStyle.fontSize !== undefined) spanStyle += `font-size: ${toCqw(overrideStyle.fontSize)}; `;
        if (overrideStyle.fontFamily) {
            fontFamilies.add(overrideStyle.fontFamily);
            spanStyle += `font-family: '${overrideStyle.fontFamily}', -apple-system, sans-serif; `;
        }
        if (overrideStyle.italic) spanStyle += `font-style: italic; `;
        if (overrideStyle.textDecoration === 'UNDERLINE') spanStyle += `text-decoration: underline; `;
        if (overrideStyle.textDecoration === 'STRIKETHROUGH') spanStyle += `text-decoration: line-through; `;
        
        if (overrideStyle.fills && overrideStyle.fills.length > 0) {
            const solidFill = overrideStyle.fills.find((f: any) => f.type === 'SOLID' && f.visible !== false);
            if (solidFill) {
                const c = solidFill.color; 
                const a = solidFill.opacity !== undefined ? solidFill.opacity : (c.a !== undefined ? c.a : 1);
                spanStyle += `color: rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a}); `;
            }
        }

        if (spanStyle) {
            return `<span style="${spanStyle}">${escapedText}</span>`;
        }
        return escapedText;
    }

    function buildNode(node: any, parentAbsX: number, parentAbsY: number, pW: number, pH: number, inheritedOpacity = 1): string {
        if (!node || node.visible === false || !node.absoluteBoundingBox) return '';

        const isHostedImage = hostedImages[node.id] !== undefined;
        const currentOpacity = (node.opacity !== undefined ? node.opacity : 1) * inheritedOpacity;
        const rotationAngle = getRotationAngle(node);
        const isText = node.type === 'TEXT';

        let w = node.size ? node.size.x : node.absoluteBoundingBox.width;
        let h = node.size ? node.size.y : node.absoluteBoundingBox.height;

        let isEffectivelyLine = !isText && (node.type === 'LINE' || w <= 0.01 || h <= 0.01);
        if (isEffectivelyLine) {
            const weight = node.strokeWeight || 1;
            if (h <= 0.01) h = Math.max(weight, 1);
            if (w <= 0.01) w = Math.max(weight, 1);
        }

        const aabbX = node.absoluteBoundingBox.x - parentAbsX;
        const aabbY = node.absoluteBoundingBox.y - parentAbsY;

        let containerStyle = `position: absolute; box-sizing: border-box; margin: 0; padding: 0; `;
        containerStyle += `left: ${toCqw(aabbX)}; top: ${toCqw(aabbY)}; width: max(1px, ${toCqw(w)}); height: max(1px, ${toCqw(h)}); `;
        
        if (Math.abs(rotationAngle) > 0.01) containerStyle += `transform: rotate(${rotationAngle}deg); `;
        if (currentOpacity < 1) containerStyle += `opacity: ${currentOpacity}; `;
        if (node.blendMode && !['PASS_THROUGH', 'NORMAL'].includes(node.blendMode)) containerStyle += `mix-blend-mode: ${node.blendMode.toLowerCase().replace('_', '-')}; `;
        if (node.clipsContent) containerStyle += `overflow: hidden; `;

        let radiusStyle = '';

        if (!isText && !isHostedImage) {
            if (node.rectangleCornerRadii && node.rectangleCornerRadii.length === 4) {
                radiusStyle = `border-radius: ${toCqw(node.rectangleCornerRadii[0])} ${toCqw(node.rectangleCornerRadii[1])} ${toCqw(node.rectangleCornerRadii[2])} ${toCqw(node.rectangleCornerRadii[3])}; `;
            } else if (node.cornerRadius) {
                radiusStyle = `border-radius: ${toCqw(node.cornerRadius)}; `;
            } else if (node.type === 'ELLIPSE') {
                radiusStyle = `border-radius: 50%; `;
            }
        }
        containerStyle += radiusStyle;

        let visualStyle = `position: absolute; top: 0; left: 0; right: 0; bottom: 0; box-sizing: border-box; pointer-events: none; border-radius: inherit; `;
        let hasVisuals = false;

        let imgHTML = ''; let textHTML = ''; let innerHTML = ''; let strokeOverlayHTML = ''; let textShadowStyle = '';

        const isPureShape = ['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'REGULAR_POLYGON'].includes(node.type) || (node.type === 'ELLIPSE' && node.arcData);

        if (isHostedImage) {
            let objectFit = isPureShape ? 'contain' : 'cover';
            imgHTML = `<img src="${hostedImages[node.id]}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: ${objectFit}; object-position: center; border-radius: inherit; pointer-events: none; display: block;" />`;
        } else if (isEffectivelyLine) {
            const paint = (node.strokes && node.strokes.find((s: any) => s.visible !== false)) || (node.fills && node.fills.find((f: any) => f.visible !== false));
            if (paint) {
                hasVisuals = true;
                let fillOpacity = paint.opacity !== undefined ? paint.opacity : 1;
                if (paint.type === 'SOLID') {
                    const c = paint.color; const a = (c.a !== undefined ? c.a : 1) * fillOpacity;
                    const colorStr = `rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a})`;
                    const isDashed = node.strokeDashes && node.strokeDashes.length > 0;
                    if (isDashed) {
                        const dash = node.strokeDashes[0] || 6;
                        const gap = node.strokeDashes.length > 1 ? node.strokeDashes[1] : dash;
                        if (h > w) {
                            visualStyle += `background-image: repeating-linear-gradient(to bottom, ${colorStr} 0, ${colorStr} ${toCqw(dash)}, transparent ${toCqw(dash)}, transparent ${toCqw(dash + gap)}); background-color: transparent; border: none; `;
                        } else {
                            visualStyle += `background-image: repeating-linear-gradient(to right, ${colorStr} 0, ${colorStr} ${toCqw(dash)}, transparent ${toCqw(dash)}, transparent ${toCqw(dash + gap)}); background-color: transparent; border: none; `;
                        }
                    } else {
                        visualStyle += `background-color: ${colorStr}; border: none; `;
                    }
                } else if (paint.type.includes('GRADIENT')) {
                    let gradStyle = '';
                    const stops = paint.gradientStops.map((s: any) => {
                        const c = s.color; const a = (c.a !== undefined ? c.a : 1) * fillOpacity;
                        return `rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a}) ${+(s.position * 100).toFixed(1)}%`;
                    }).join(', ');
                    if (paint.type === 'GRADIENT_LINEAR') {
                        let angle = 90;
                        if (paint.gradientHandlePositions && paint.gradientHandlePositions.length >= 2) {
                            const p1 = paint.gradientHandlePositions[0];
                            const p2 = paint.gradientHandlePositions[1];
                            angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI) + 90;
                        }
                        gradStyle = `linear-gradient(${angle}deg, ${stops})`;
                    } else {
                        gradStyle = `radial-gradient(circle, ${stops})`;
                    }
                    visualStyle += `background: ${gradStyle}; border: none; `;
                }
            }
        } else if (isPureShape) {
            // Blob protection explicitly disables CSS fills for missing vectors
        } else {
            if (node.fills && !isText) {
                let bgStylesArray: string[] = [];
                node.fills.forEach((fill: any) => {
                    if (fill.visible === false) return;
                    const fillOpacity = fill.opacity !== undefined ? fill.opacity : 1;
                    if (fill.type === 'SOLID') {
                        const c = fill.color; const a = (c.a !== undefined ? c.a : 1) * fillOpacity;
                        if (a > 0) bgStylesArray.push(`rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a})`);
                    } else if (fill.type === 'GRADIENT_LINEAR') {
                        const stops = fill.gradientStops.map((s: any) => {
                            const c = s.color; const a = (c.a !== undefined ? c.a : 1) * fillOpacity;
                            return `rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a}) ${+(s.position * 100).toFixed(1)}%`;
                        }).join(', ');
                        let angle = 90; 
                        if (fill.gradientHandlePositions && fill.gradientHandlePositions.length >= 2) {
                            const p1 = fill.gradientHandlePositions[0];
                            const p2 = fill.gradientHandlePositions[1];
                            angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI) + 90;
                        }
                        bgStylesArray.push(`linear-gradient(${angle}deg, ${stops})`);
                    } else if (fill.type === 'GRADIENT_RADIAL') {
                        const stops = fill.gradientStops.map((s: any) => {
                            const c = s.color; const a = (c.a !== undefined ? c.a : 1) * fillOpacity;
                            return `rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a}) ${+(s.position * 100).toFixed(1)}%`;
                        }).join(', ');
                        bgStylesArray.push(`radial-gradient(circle, ${stops})`);
                    }
                });
                if (bgStylesArray.length > 0) { 
                    bgStylesArray.reverse();
                    visualStyle += `background: ${bgStylesArray.join(', ')}; `; 
                    hasVisuals = true; 
                }
            }
            
            if (node.strokes && !isText) {
                const stroke = node.strokes.find((s: any) => s.visible !== false);
                if (stroke) {
                    hasVisuals = true;
                    let fillOpacity = stroke.opacity !== undefined ? stroke.opacity : 1;
                    if (stroke.type === 'SOLID') {
                        const c = stroke.color; const a = (c.a !== undefined ? c.a : 1) * fillOpacity;
                        const colorStr = `rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a})`;
                        const isDashed = node.strokeDashes && node.strokeDashes.length > 0;
                        const borderStyle = isDashed ? 'dashed' : 'solid';
                        if (node.individualStrokeWeights) {
                            if (node.individualStrokeWeights.top > 0) visualStyle += `border-top: max(1px, ${toCqw(node.individualStrokeWeights.top)}) ${borderStyle} ${colorStr}; `;
                            if (node.individualStrokeWeights.right > 0) visualStyle += `border-right: max(1px, ${toCqw(node.individualStrokeWeights.right)}) ${borderStyle} ${colorStr}; `;
                            if (node.individualStrokeWeights.bottom > 0) visualStyle += `border-bottom: max(1px, ${toCqw(node.individualStrokeWeights.bottom)}) ${borderStyle} ${colorStr}; `;
                            if (node.individualStrokeWeights.left > 0) visualStyle += `border-left: max(1px, ${toCqw(node.individualStrokeWeights.left)}) ${borderStyle} ${colorStr}; `;
                        } else {
                            const sw = node.strokeWeight || 1; visualStyle += `border: max(1px, ${toCqw(sw)}) ${borderStyle} ${colorStr}; `;
                        }
                    } else if (stroke.type.includes('GRADIENT')) {
                        let gradStyle = '';
                        const stops = stroke.gradientStops.map((s: any) => {
                            const c = s.color; const a = (c.a !== undefined ? c.a : 1) * fillOpacity;
                            return `rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a}) ${+(s.position * 100).toFixed(1)}%`;
                        }).join(', ');
                        if (stroke.type === 'GRADIENT_LINEAR') {
                            let angle = 90;
                            if (stroke.gradientHandlePositions && stroke.gradientHandlePositions.length >= 2) {
                                const p1 = stroke.gradientHandlePositions[0];
                                const p2 = stroke.gradientHandlePositions[1];
                                angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI) + 90;
                            }
                            gradStyle = `linear-gradient(${angle}deg, ${stops})`;
                        } else {
                            gradStyle = `radial-gradient(circle, ${stops})`;
                        }
                        const sw = node.strokeWeight || 1;
                        let overlayStyle = `position: absolute; top: 0; left: 0; right: 0; bottom: 0; box-sizing: border-box; pointer-events: none; border: max(1px, ${toCqw(sw)}) solid transparent; background: ${gradStyle} border-box; -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; border-radius: inherit; `;
                        strokeOverlayHTML = `<div style="${overlayStyle}"></div>`;
                    }
                }
            }
        }

        if (node.effects) {
            let innerShadows = [];
            let dropShadows = [];
            let textShadows = [];
            for (const effect of node.effects) {
                if (effect.visible !== false && (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW')) {
                    const c = effect.color;
                    const alpha = c.a !== undefined ? c.a : 1;
                    const spread = effect.spread !== undefined ? toCqw(effect.spread) + ' ' : '';
                    const colorStr = `rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${alpha})`;
                    
                    if (isText && effect.type === 'DROP_SHADOW') {
                        textShadows.push(`${toCqw(effect.offset.x)} ${toCqw(effect.offset.y)} ${toCqw(effect.radius)} ${colorStr}`);
                    } else if (!isText) {
                        if (effect.type === 'INNER_SHADOW') {
                            innerShadows.push(`inset ${toCqw(effect.offset.x)} ${toCqw(effect.offset.y)} ${toCqw(effect.radius)} ${spread}${colorStr}`);
                        } else {
                            dropShadows.push(`${toCqw(effect.offset.x)} ${toCqw(effect.offset.y)} ${toCqw(effect.radius)} ${spread}${colorStr}`);
                        }
                    }
                }
                if (effect.visible !== false && effect.type === 'BACKGROUND_BLUR') {
                    if (!isText) {
                        visualStyle += `backdrop-filter: blur(${toCqw(effect.radius)}); -webkit-backdrop-filter: blur(${toCqw(effect.radius)}); `; hasVisuals = true;
                    }
                }
                if (effect.visible !== false && effect.type === 'LAYER_BLUR') {
                    containerStyle += `filter: blur(${toCqw(effect.radius)}); -webkit-filter: blur(${toCqw(effect.radius)}); `;
                }
            }
            if (!isText && innerShadows.length > 0) { visualStyle += `box-shadow: ${innerShadows.join(', ')}; `; hasVisuals = true; }
            if (!isText && dropShadows.length > 0) { containerStyle += `box-shadow: ${dropShadows.join(', ')}; `; }
            if (isText && textShadows.length > 0) { textShadowStyle = `text-shadow: ${textShadows.join(', ')}; `; }
        }

        if (isText) {
            containerStyle += textShadowStyle;
            containerStyle += 'display: flex; flex-direction: column; overflow: visible; font-kerning: normal; text-rendering: optimizeLegibility; ';
            
            if (node.style && node.style.textAutoResize === 'WIDTH_AND_HEIGHT') {
                containerStyle += 'white-space: pre; ';
            } else {
                containerStyle += 'white-space: pre-wrap; overflow-wrap: break-word; word-break: break-word; ';
            }

            if (node.characters) {
                if (node.characterStyleOverrides && node.characterStyleOverrides.length > 0 && node.styleOverrideTable) {
                    let currentOverride = node.characterStyleOverrides[0];
                    let currentSpanText = '';
                    textHTML = '';
                    for (let i = 0; i < node.characters.length; i++) {
                        const char = node.characters[i];
                        const overrideId = node.characterStyleOverrides[i] !== undefined ? node.characterStyleOverrides[i] : 0;
                        if (overrideId !== currentOverride) {
                            textHTML += buildSpanHTML(currentSpanText, currentOverride, node);
                            currentSpanText = char;
                            currentOverride = overrideId;
                        } else {
                            currentSpanText += char;
                        }
                    }
                    if (currentSpanText.length > 0) {
                        textHTML += buildSpanHTML(currentSpanText, currentOverride, node);
                    }
                } else {
                    textHTML = escapeHTML(node.characters);
                }
            }

            if (node.style) {
                containerStyle += `font-size: ${toCqw(node.style.fontSize)}; font-weight: ${node.style.fontWeight}; `;
                if (node.style.fontFamily) {
                    fontFamilies.add(node.style.fontFamily);
                    containerStyle += `font-family: '${node.style.fontFamily}', -apple-system, sans-serif; `;
                }
                if (node.style.textCase === 'UPPER') containerStyle += `text-transform: uppercase; `;
                else if (node.style.textCase === 'LOWER') containerStyle += `text-transform: lowercase; `;
                else if (node.style.textCase === 'TITLE') containerStyle += `text-transform: capitalize; `;
                if (node.style.italic) containerStyle += `font-style: italic; `;
                if (node.style.lineHeightPx) containerStyle += `line-height: ${toCqw(node.style.lineHeightPx)}; `;
                else containerStyle += `line-height: normal; `;
                if (node.style.letterSpacing !== undefined) containerStyle += `letter-spacing: ${toCqw(node.style.letterSpacing)}; `;
                
                if (node.style.textAlignHorizontal === 'CENTER') containerStyle += `text-align: center; align-items: center; `;
                else if (node.style.textAlignHorizontal === 'RIGHT') containerStyle += `text-align: right; align-items: flex-end; `;
                else containerStyle += `text-align: left; align-items: flex-start; `;
                
                if (node.style.textAlignVertical === 'CENTER') containerStyle += `justify-content: center; `;
                else if (node.style.textAlignVertical === 'BOTTOM') containerStyle += `justify-content: flex-end; `;
                else containerStyle += `justify-content: flex-start; `;
            }

            let fontColorHTML = `color: #000000; `;
            if (node.fills && node.fills.length > 0) {
                const solidFill = node.fills.find((f: any) => f.type === 'SOLID' && f.visible !== false);
                const gradFill = node.fills.find((f: any) => f.type === 'GRADIENT_LINEAR' && f.visible !== false);
                if (solidFill) {
                    const c = solidFill.color; const a = solidFill.opacity !== undefined ? solidFill.opacity : (c.a !== undefined ? c.a : 1);
                    fontColorHTML = `color: rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a}); `;
                } else if (gradFill) {
                    const stops = gradFill.gradientStops.map((s: any) => {
                        const c = s.color; const a = c.a !== undefined ? c.a : 1;
                        return `rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${a}) ${+(s.position * 100).toFixed(1)}%`;
                    }).join(', ');
                    fontColorHTML = `background: linear-gradient(90deg, ${stops}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; `;
                }
            }
            
            textHTML = `<div style="display: block; width: 100%; margin: 0; padding: 0; ${fontColorHTML}">${textHTML}</div>`;
        }

        if (!isHostedImage && node.children) {
            let currentMask: any = null;
            let maskInnerHtml = '';
            node.children.forEach((child: any) => {
                if (child.isMask) {
                    if (currentMask) {
                        innerHTML += buildMaskHTML(currentMask, maskInnerHtml, node.absoluteBoundingBox.x, node.absoluteBoundingBox.y);
                    }
                    currentMask = child;
                    maskInnerHtml = '';
                } else if (currentMask) {
                    maskInnerHtml += buildNode(child, currentMask.absoluteBoundingBox.x, currentMask.absoluteBoundingBox.y, currentMask.absoluteBoundingBox.width, currentMask.absoluteBoundingBox.height, currentOpacity);
                } else {
                    innerHTML += buildNode(child, node.absoluteBoundingBox.x, node.absoluteBoundingBox.y, w, h, currentOpacity);
                }
            });
            if (currentMask) {
                innerHTML += buildMaskHTML(currentMask, maskInnerHtml, node.absoluteBoundingBox.x, node.absoluteBoundingBox.y);
            }
        }

        let htmlTag = 'div';
        let extraAttributes = '';
        
        const hasReactions = node.reactions && node.reactions.length > 0;
        const hasTransition = !!node.transitionNodeID;

        if (hasReactions || hasTransition) {
            let isUrl = false;
            let urlHref = '';
            
            if (hasReactions) {
                const urlReaction = node.reactions.find((r: any) => r.action && r.action.type === 'URL');
                if (urlReaction) {
                    isUrl = true;
                    urlHref = urlReaction.action.url;
                }
            }

            if (isUrl) {
                htmlTag = 'a';
                extraAttributes = ` href="${urlHref}" target="_blank" rel="noopener noreferrer"`;
            } else {
                htmlTag = 'button';
                extraAttributes = ` type="button"`;
            }
            
            containerStyle += `appearance: none; background: transparent; border: none; padding: 0; margin: 0; text-decoration: none; cursor: pointer; outline: none; box-shadow: none; z-index: 50; pointer-events: auto; `;
        }

        let finalVisualDiv = hasVisuals ? `<div style="${visualStyle}"></div>` : '';
        return `<${htmlTag} style="${containerStyle}"${extraAttributes}>${finalVisualDiv}${imgHTML}${strokeOverlayHTML}${textHTML}${innerHTML}</${htmlTag}>`;
    }

    let rootBg = '#ffffff';
    if (figmaData.fills && figmaData.fills.length > 0) {
        const bgFill = figmaData.fills.find((f: any) => f.type === 'SOLID' && f.visible !== false);
        if (bgFill) {
            const a = bgFill.opacity !== undefined ? bgFill.opacity : (bgFill.color.a !== undefined ? bgFill.color.a : 1);
            rootBg = `rgba(${Math.round(bgFill.color.r*255)}, ${Math.round(bgFill.color.g*255)}, ${Math.round(bgFill.color.b*255)}, ${a})`;
        }
    }

    let elementsHTML = '';
    if (figmaData.children) {
        figmaData.children.forEach((child: any) => {
            elementsHTML += buildNode(child, rootX, rootY, rootWidth, rootHeight, 1);
        });
    }

    let fontsHTML = '';
    fontFamilies.forEach(f => {
        const familyName = f.replace(/\s+/g, '+');
        fontsHTML += `<link href="https://fonts.googleapis.com/css2?family=${familyName}:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">`;
    });

    const globalResetCSS = `<style>body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow-x: hidden; }</style>`;

    const finalCode = `${fontsHTML}${globalResetCSS}<div style="position: relative; width: 100%; min-height: 100vh; height: ${(rootHeight/rootWidth)*100}vw; background-color: ${rootBg}; margin: 0; overflow-x: hidden; overflow-y: hidden; -webkit-font-smoothing: antialiased; container-type: inline-size;">${elementsHTML}</div>`;

    return finalCode;
}
