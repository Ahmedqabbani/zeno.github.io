/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Terminal, Copy, Check, ArrowRight, Loader2, Sparkles, Key, Info } from 'lucide-react';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import FeaturedSectionStats from './components/ui/featured-section-stats';
import { Features } from './components/blocks/features-8';
import { Pricing } from './components/ui/single-pricing-card-1';
import { Faq } from './components/ui/faq';
import { Footer } from './components/ui/footer';

SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('html', markup);

interface AnimatedTextCycleProps {
  words: string[];
  interval?: number;
  className?: string;
}

function AnimatedTextCycle({
  words,
  interval = 5000,
  className = "",
}: AnimatedTextCycleProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [width, setWidth] = useState("auto");
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (measureRef.current) {
      const elements = measureRef.current.children;
      if (elements.length > currentIndex) {
        const newWidth = elements[currentIndex].getBoundingClientRect().width;
        setWidth(`${newWidth}px`);
      }
    }
  }, [currentIndex]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, interval);

    return () => clearInterval(timer);
  }, [interval, words.length]);

  const containerVariants: Variants = {
    hidden: {
      y: -20,
      opacity: 0,
      filter: "blur(8px)",
    },
    visible: {
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        duration: 0.4,
        ease: "easeOut" as const,
      },
    },
    exit: {
      y: 20,
      opacity: 0,
      filter: "blur(8px)",
      transition: {
        duration: 0.3,
        ease: "easeIn" as const,
      },
    },
  };

  return (
    <>
      {/* Hidden measurement div */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="absolute opacity-0 pointer-events-none"
        style={{ visibility: "hidden" }}
      >
        {words.map((word, i) => (
          <span key={i} className={`font-bold ${className}`}>
            {word}
          </span>
        ))}
      </div>

      {/* Visible animated word */}
      <motion.span
        className="relative inline-block"
        animate={{
          width,
          transition: {
            type: "spring",
            stiffness: 150,
            damping: 15,
            mass: 1.2,
          },
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={currentIndex}
            className={`inline-block font-bold ${className}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ whiteSpace: "nowrap" }}
          >
            {words[currentIndex]}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </>
  );
}

import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Checkout from './pages/checkout';
import Login from './pages/login';
import { useAuth } from './lib/auth';

export function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    url: '',
    token: '',
    format: 'react'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [outputCode, setOutputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Initializing compiler...');

  const [showTokenInput, setShowTokenInput] = useState(true); // Always true initially since we need it

  useEffect(() => {
    if (user) {
      const savedToken = localStorage.getItem(`figmaToken_${user.uid}`);
      if (savedToken) {
        setFormData(prev => ({ ...prev, token: savedToken }));
        setShowTokenInput(false);
      } else {
        setShowTokenInput(true);
      }
    } else {
      setFormData(prev => ({ ...prev, token: '' }));
      setShowTokenInput(true);
    }
  }, [user]);

  const handleCompile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.url.trim()) return;
    if (!formData.token.trim()) {
      setError('Please provide a Figma Personal Access Token.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setOutputCode('');
    setLoadingMessage('Connecting to Figma...');

    const messages = ['Extracting Nodes...', 'Compiling JSX...', 'Optimizing Layout...', 'Generating Components...', 'Finalizing Output...'];
    let msgIndex = 0;
    
    const msgInterval = setInterval(() => {
      setLoadingMessage(messages[msgIndex % messages.length]);
      msgIndex++;
    }, 3000);

    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          figmaUrl: formData.url,
          figmaToken: formData.token,
          format: formData.format
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 || (data.error && data.error.includes("invalid or expired"))) {
           if (user) localStorage.removeItem(`figmaToken_${user.uid}`);
           setShowTokenInput(true);
           setFormData(prev => ({ ...prev, token: '' }));
           alert("Your Figma token has expired or is invalid. Please enter a new one.");
        }
        throw new Error(data.error || 'Compilation failed');
      }
      
      setOutputCode(data.rawCode);
      if (data.rawCode) {
        setShowTokenInput(false); // Hide token input once successful
        if (user && formData.token) {
           localStorage.setItem(`figmaToken_${user.uid}`, formData.token);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      clearInterval(msgInterval);
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const MAX_DISPLAY_LENGTH = 15000;
  const displayCode = outputCode.length > MAX_DISPLAY_LENGTH 
    ? outputCode.slice(0, MAX_DISPLAY_LENGTH) + '\n\n// ... \n// [Click "Copy Full Code" to copy the ENTIRE file!] \n// ...'
    : outputCode;

  return (
    <div className="min-h-screen bg-[#000] text-[#EAEAEA] selection:bg-[#333] selection:text-white font-sans overflow-x-hidden">
      <div className="fixed inset-0 grid-background pointer-events-none"></div>

      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
          <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-tr from-slate-400 to-white rounded-md shadow-sm">
            <span className="text-black text-xl leading-none font-black italic pr-0.5 -mt-0.5">Z</span>
          </div>
          <span>ZENO</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#888]">
          <a href="#compiler" className="hover:text-white transition-colors">Compiler</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </div>
        <div className="flex items-center gap-4">
          {!user ? (
            <>
              <Link to="/login" className="text-[#888] hover:text-white text-sm font-bold transition-colors">Sign In</Link>
              <Link to="/login" className="bg-white text-black text-sm font-bold px-4 py-2 rounded-full hover:bg-[#DDD] transition-colors">Sign Up</Link>
            </>
          ) : (
            <>
              <button onClick={logout} className="text-[#888] hover:text-white text-sm font-bold transition-colors">Sign Out</button>
            </>
          )}
        </div>
      </nav>

      <main id="compiler" className="relative z-10 flex flex-col items-center pt-16 pb-32 px-6">
        
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111] border border-[#222] text-[#888] text-[11px] font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Zeno Engine v2.0 Online
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-[#888]">
            Figma to Code,{" "}
            <br />
            <AnimatedTextCycle
              words={[
                "Instantly.",
                "Precisely.",
                "Perfectly.",
                "Securely.",
                "Blazingly.",
                "Natively.",
              ]}
              interval={2500}
              className="bg-clip-text text-transparent bg-gradient-to-b from-white to-[#888]"
            />
          </h1>

          <p className="text-[#888] text-lg max-w-lg mx-auto">
            Generate pixel-perfect frontends instantly HTML or React. No AI guesswork, no hallucinations—just exact UI replication.
          </p>
        </div>

        <div className="relative w-full max-w-[720px] mb-24 group p-[1px] rounded-[32px] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] bg-white/[0.04] transition-all duration-700">
          
          <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_0%,#00000000_60%,#444444_85%,#ffffff_100%)] opacity-40 group-hover:opacity-100 transition-opacity duration-1000"></div>

          <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_0%,#00000000_60%,#444444_85%,#ffffff_100%)] blur-lg opacity-0 group-hover:opacity-80 transition-opacity duration-1000"></div>

          <div className="relative z-10 h-full w-full bg-[#050505] rounded-[31px] flex flex-col overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
            
            <div className="h-14 border-b border-[#222] bg-white/[0.02] px-6 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[#888]">
                <Terminal size={16} />
                <span className="text-[13px] font-semibold tracking-wide uppercase">Compiler Engine</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#444] uppercase tracking-[0.2em]">Ready to Execute</span>
              </div>
            </div>

            <div className="p-8 flex flex-col gap-8">
              
              {!user ? (
                <div className="flex flex-col items-center justify-center py-12 gap-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mb-2">
                    <Key size={24} className="text-[#666]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Authentication Required</h3>
                    <p className="text-[#888] text-sm max-w-[280px]">Please sign in with Google to use the Zeno Compiler Engine.</p>
                  </div>
                  <button
                    onClick={() => navigate('/login')}
                    className="bg-white text-black px-6 py-3 rounded-[16px] text-sm font-bold hover:bg-[#DDD] transition-all flex items-center gap-2 shadow-lg"
                  >
                    Sign in to Continue <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <>
                  {showTokenInput && (
                    <div className="bg-[#111] border border-[#333] p-4 rounded-xl flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">Figma Token</span>
                        <a href="https://www.figma.com/settings/tokens" target="_blank" rel="noreferrer" className="text-[11px] text-[#888] hover:text-white transition-colors underline">Get PAT</a>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="relative">
                          <div className="absolute left-3 top-3 text-[#666]"><Key size={14} /></div>
                          <input
                            type="password"
                            value={formData.token}
                            onChange={(e) => setFormData({...formData, token: e.target.value})}
                            placeholder="figd_..."
                            className="w-full bg-black border border-[#333] rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-[#555] outline-none"
                          />
                        </div>
                        <p className="text-[11px] text-[#666] pl-1 pt-1">
                          Tip: Please ensure you select <strong>"File content: Read"</strong> when creating your token.
                        </p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleCompile} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[11px] font-bold text-[#555] uppercase tracking-widest">
                      Source Figma URL
                    </label>
                    <span className="text-[11px] text-[#444]">Node ID or Full Link</span>
                  </div>
                  
                  <div className="relative group/input">
                    <div className="absolute inset-0 bg-white/[0.02] rounded-[20px] transition-all group-focus-within/input:bg-white/[0.05]"></div>
                    <div className="relative flex items-center">
                      <div className="absolute left-5 text-[#444] group-focus-within/input:text-[#888] transition-colors">
                        <Sparkles size={16} />
                      </div>
                      <input
                        type="url"
                        value={formData.url}
                        onChange={(e) => setFormData({...formData, url: e.target.value})}
                        placeholder="https://www.figma.com/file/..."
                        className="w-full bg-transparent border border-[#222] rounded-[20px] pl-12 pr-36 py-4 text-[14px] text-white placeholder-[#444] focus:outline-none focus:border-[#444] transition-all"
                        required
                      />
                      <button
                        type="submit"
                        disabled={isLoading || !formData.url || !formData.token}
                        className="absolute right-2 top-2 bottom-2 bg-white text-black px-6 rounded-[14px] text-[13px] font-bold hover:bg-[#DDD] transition-all disabled:opacity-20 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg min-w-[140px] justify-center"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span className="animate-pulse">{loadingMessage.split(' ')[0]}</span>
                          </>
                        ) : (
                          <>
                            Compile <ArrowRight size={16} strokeWidth={3} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-1.5 px-2 mt-1 opacity-80">
                    <Info size={12} className="text-[#666] mt-[2px] flex-shrink-0" />
                    <span className="text-[11px] text-[#666] leading-relaxed">
                      <strong>Tip:</strong> Make sure to click on the specific UI screen or frame in your Figma canvas <em>before</em> copying the link.
                    </span>
                  </div>

                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, format: 'react'})}
                    className={`flex-1 py-3 rounded-[16px] text-[12px] font-bold border transition-all ${
                      formData.format === 'react' 
                        ? 'bg-white/10 text-white border-white/20' 
                        : 'bg-transparent text-[#666] border-transparent hover:text-[#888] hover:bg-white/5'
                    }`}
                  >
                    React JSX
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, format: 'html'})}
                    className={`flex-1 py-3 rounded-[16px] text-[12px] font-bold border transition-all ${
                      formData.format === 'html' 
                        ? 'bg-white/10 text-white border-white/20' 
                        : 'bg-transparent text-[#666] border-transparent hover:text-[#888] hover:bg-white/5'
                    }`}
                  >
                    HTML
                  </button>
                </div>
              </form>

              {error && (
                <div className="px-5 py-4 bg-[#FF4444]/[0.05] border border-[#FF4444]/20 rounded-[16px] flex items-center gap-4 text-[#FF4444]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF4444]"></div>
                  <span className="text-[13px] font-medium">{error}</span>
                </div>
              )}

              {outputCode && (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-green-500"></div>
                      <span className="text-[11px] font-bold text-[#555] uppercase tracking-widest">
                        {formData.format === 'react' ? 'React' : 'HTML'} Output Generated
                      </span>
                    </div>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111] border border-[#222] text-[11px] font-bold text-[#888] hover:text-white hover:border-[#444] transition-all"
                    >
                      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      {copied ? 'Copied Full File!' : 'Copy Full Code'}
                    </button>
                  </div>
                  
                  <div className="relative w-full rounded-[20px] border border-[#222] bg-[#1e1e1e] overflow-hidden group/output">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none z-10"></div>
                    <div className="overflow-x-auto overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent">
                      <SyntaxHighlighter
                        language={formData.format === 'react' ? 'tsx' : 'html'}
                        style={vscDarkPlus}
                        customStyle={{
                          margin: 0,
                          padding: '1.5rem',
                          background: 'transparent',
                          fontSize: '13px',
                          lineHeight: '1.5',
                        }}
                        wrapLines={true}
                      >
                        {displayCode}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          </div>
        </div>

      </main>

      <div className="relative z-10 border-t border-[#111]">
        <FeaturedSectionStats />
      </div>

      <div id="features" className="relative z-10">
        <Features />
      </div>

      <div className="relative z-10 border-t border-[#111]">
        <Pricing />
      </div>

      <div id="faq" className="relative z-10 border-t border-[#111] bg-[#000]">
        <Faq />
      </div>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/checkout" element={<Checkout />} />
      </Routes>
    </Router>
  );
}

