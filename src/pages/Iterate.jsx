import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Download, Image as ImageIcon, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MODELS = ['Stable Diffusion XL', 'Flux', 'Midjourney Style', 'Anime Diffusion'];
const SIZES  = ['512×512', '768×768', '1024×1024', '768×1024', '1024×768'];

export default function Iterate() {
  const [prompt, setPrompt]               = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [model, setModel]                 = useState('Stable Diffusion XL');
  const [size, setSize]                   = useState('1024×1024');
  const [steps, setSteps]                 = useState([30]);
  const [cfgScale, setCfgScale]           = useState([7]);
  const [generating, setGenerating]       = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [history, setHistory]             = useState([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    const result = await base44.integrations.Core.GenerateImage({ prompt });
    setGeneratedImage(result.url);
    setHistory(prev => [{ url: result.url, prompt }, ...prev.slice(0, 19)]);
    setGenerating(false);
  };

  const handleSaveToMemory = async () => {
    if (!generatedImage) return;
    await base44.entities.MediaItem.create({
      title: prompt.slice(0, 80),
      file_url: generatedImage,
      media_type: 'image',
      tags: ['generated'],
      collection: 'generated',
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* macOS toolbar */}
      <div className="flex items-center gap-3 px-4 h-10 border-b border-black/[0.06] vibrancy flex-shrink-0">
        <span className="text-macos-xs text-muted-foreground/60 font-medium tracking-wide uppercase">
          ComfyUI · Image Generation
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — controls */}
        <div className="w-[260px] flex-shrink-0 border-r border-black/[0.06] overflow-y-auto p-4 space-y-5 vibrancy-sidebar">

          {/* Prompt */}
          <div className="space-y-1.5">
            <label className="text-macos-xs text-muted-foreground font-medium uppercase tracking-wide">Prompt</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleGenerate(); }}
              placeholder="Describe your image..."
              rows={5}
              className="w-full px-2.5 py-2 bg-background/80 border border-border/60 rounded-macos text-macos-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
            />
          </div>

          {/* Negative */}
          <div className="space-y-1.5">
            <label className="text-macos-xs text-muted-foreground font-medium uppercase tracking-wide">Negative</label>
            <input
              value={negativePrompt}
              onChange={e => setNegativePrompt(e.target.value)}
              placeholder="What to avoid..."
              className="w-full px-2.5 py-1.5 bg-background/80 border border-border/60 rounded-macos text-macos-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <label className="text-macos-xs text-muted-foreground font-medium uppercase tracking-wide">Model</label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-7 text-macos-sm bg-background/80 border-border/60 rounded-macos">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map(m => <SelectItem key={m} value={m} className="text-macos-sm">{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Size */}
          <div className="space-y-1.5">
            <label className="text-macos-xs text-muted-foreground font-medium uppercase tracking-wide">Size</label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger className="h-7 text-macos-sm bg-background/80 border-border/60 rounded-macos">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZES.map(s => <SelectItem key={s} value={s} className="text-macos-sm">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-macos-xs text-muted-foreground font-medium uppercase tracking-wide">Steps</label>
              <span className="text-macos-xs text-muted-foreground tabular-nums">{steps[0]}</span>
            </div>
            <Slider value={steps} onValueChange={setSteps} min={10} max={50} step={1} className="h-1.5" />
          </div>

          {/* CFG Scale */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-macos-xs text-muted-foreground font-medium uppercase tracking-wide">CFG Scale</label>
              <span className="text-macos-xs text-muted-foreground tabular-nums">{cfgScale[0]}</span>
            </div>
            <Slider value={cfgScale} onValueChange={setCfgScale} min={1} max={20} step={0.5} className="h-1.5" />
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 py-1.5 bg-primary text-primary-foreground rounded-macos text-macos-sm font-medium shadow-macos-sm hover:bg-primary/90 disabled:opacity-40 active:scale-[0.98] transition-all duration-100"
          >
            {generating
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
              : <><Sparkles className="w-3.5 h-3.5" strokeWidth={2} /> Generate  <span className="opacity-50 text-macos-xs">⌘↵</span></>
            }
          </button>
        </div>

        {/* Right — canvas */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[repeating-linear-gradient(45deg,hsl(var(--muted)/0.3)_0px,hsl(var(--muted)/0.3)_1px,transparent_0px,transparent_50%)] bg-[length:20px_20px]">
          <div className="flex-1 flex items-center justify-center p-6">
            <AnimatePresence mode="wait">
              {generating ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-2 border-primary/20 rounded-full animate-ping" />
                    <div className="absolute inset-2 border-2 border-primary/40 rounded-full animate-spin"
                      style={{ borderTopColor: 'hsl(var(--primary))' }} />
                    <Zap className="absolute inset-0 m-auto w-5 h-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <p className="text-macos-xs text-muted-foreground">Creating your vision…</p>
                </motion.div>
              ) : generatedImage ? (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.22,1,0.36,1] }}
                  className="relative group max-w-xl w-full">
                  <img src={generatedImage} alt="Generated"
                    className="w-full rounded-macos-lg shadow-macos-lg border border-white/10 object-contain" />
                  {/* Hover actions */}
                  <div className="absolute inset-x-0 bottom-0 p-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button onClick={handleSaveToMemory}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-background/80 backdrop-blur-md text-foreground rounded-macos text-macos-xs font-medium shadow-macos-sm border border-white/20 hover:bg-background transition-colors">
                      <ImageIcon className="w-3 h-3" /> Save to Memory
                    </button>
                    <a href={generatedImage} download target="_blank" rel="noopener noreferrer">
                      <button className="flex items-center gap-1.5 px-2.5 py-1 bg-background/80 backdrop-blur-md text-foreground rounded-macos text-macos-xs font-medium shadow-macos-sm border border-white/20 hover:bg-background transition-colors">
                        <Download className="w-3 h-3" /> Download
                      </button>
                    </a>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-2 text-center">
                  <div className="w-14 h-14 rounded-macos-lg bg-muted/50 flex items-center justify-center mb-1">
                    <Sparkles className="w-6 h-6 text-muted-foreground/40" strokeWidth={1.2} />
                  </div>
                  <p className="text-macos-sm text-muted-foreground/60">Your image will appear here</p>
                  <p className="text-macos-xs text-muted-foreground/40">Write a prompt and press Generate</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* History strip */}
          {history.length > 0 && (
            <div className="border-t border-black/[0.06] vibrancy px-4 py-2 flex items-center gap-2 overflow-x-auto">
              <span className="text-macos-xs text-muted-foreground/50 flex-shrink-0 mr-1">History</span>
              {history.map((h, i) => (
                <button key={i} onClick={() => setGeneratedImage(h.url)}
                  title={h.prompt}
                  className="flex-shrink-0 w-12 h-12 rounded-macos overflow-hidden border-2 border-transparent hover:border-primary/60 transition-colors shadow-macos-sm">
                  <img src={h.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}