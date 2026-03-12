import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Download, RotateCcw, Zap, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MODELS = ['Stable Diffusion XL', 'Flux', 'Midjourney Style', 'Anime Diffusion'];
const SIZES = ['512x512', '768x768', '1024x1024', '768x1024', '1024x768'];

export default function Iterate() {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [model, setModel] = useState('Stable Diffusion XL');
  const [size, setSize] = useState('1024x1024');
  const [steps, setSteps] = useState([30]);
  const [cfgScale, setCfgScale] = useState([7]);
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [history, setHistory] = useState([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    
    const result = await base44.integrations.Core.GenerateImage({
      prompt: `${prompt}${negativePrompt ? ` --no ${negativePrompt}` : ''}`,
    });
    
    setGeneratedImage(result.url);
    setHistory(prev => [{ url: result.url, prompt, timestamp: new Date() }, ...prev]);
    setGenerating(false);
  };

  const handleSaveToMemory = async () => {
    if (!generatedImage) return;
    await base44.entities.MediaItem.create({
      title: prompt.slice(0, 60),
      file_url: generatedImage,
      media_type: 'image',
      tags: ['generated', 'iterate'],
      collection: 'generated',
    });
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-normal tracking-tight">Iterate</h1>
        <p className="text-muted-foreground/60 text-xs mt-1 font-light">Generate and refine images</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl">
        {/* Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="space-y-4 p-5 rounded-2xl border border-border/40 bg-card/50">
            <div>
              <Label className="text-xs text-muted-foreground font-light mb-2 block">Prompt</Label>
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe your vision..."
                className="bg-transparent border-border/40 font-light text-sm min-h-[100px] resize-none"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground font-light mb-2 block">Negative Prompt</Label>
              <Input
                value={negativePrompt}
                onChange={e => setNegativePrompt(e.target.value)}
                placeholder="What to avoid..."
                className="bg-transparent border-border/40 font-light text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground font-light mb-2 block">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="bg-transparent border-border/40 text-xs font-light">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map(m => (
                      <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-light mb-2 block">Size</Label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger className="bg-transparent border-border/40 text-xs font-light">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map(s => (
                      <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-xs text-muted-foreground font-light">Steps</Label>
                <span className="text-xs text-muted-foreground/60">{steps[0]}</span>
              </div>
              <Slider value={steps} onValueChange={setSteps} min={10} max={50} step={1} />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-xs text-muted-foreground font-light">CFG Scale</Label>
                <span className="text-xs text-muted-foreground/60">{cfgScale[0]}</span>
              </div>
              <Slider value={cfgScale} onValueChange={setCfgScale} min={1} max={20} step={0.5} />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="w-full bg-foreground text-background hover:bg-foreground/90 font-light gap-2 rounded-xl"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="lg:col-span-8">
          <div className="relative aspect-square max-w-2xl mx-auto rounded-2xl border border-border/30 bg-muted/20 overflow-hidden">
            <AnimatePresence mode="wait">
              {generating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center"
                >
                  <div className="relative">
                    <div className="w-16 h-16 border border-border/30 rounded-full animate-spin" style={{ borderTopColor: 'hsl(var(--foreground))' }} />
                    <Zap className="w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-4 font-light">Creating your vision...</p>
                </motion.div>
              ) : generatedImage ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="relative w-full h-full"
                >
                  <img src={generatedImage} alt="Generated" className="w-full h-full object-contain" />
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="glass rounded-full text-xs font-light gap-1.5"
                      onClick={handleSaveToMemory}
                    >
                      <ImageIcon className="w-3 h-3" />
                      Save to Memory
                    </Button>
                    <a href={generatedImage} download target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="secondary" className="glass rounded-full text-xs font-light gap-1.5">
                        <Download className="w-3 h-3" />
                        Download
                      </Button>
                    </a>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center"
                >
                  <Sparkles className="w-8 h-8 text-muted-foreground/20 mb-3" strokeWidth={1} />
                  <p className="text-sm text-muted-foreground/40 font-light">Describe something to generate</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="mt-6">
              <p className="text-xs text-muted-foreground/50 font-light mb-3">History</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {history.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => setGeneratedImage(h.url)}
                    className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border/30 hover:border-border transition-colors"
                  >
                    <img src={h.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}