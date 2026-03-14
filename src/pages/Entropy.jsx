import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Image as ImageIcon, Infinity, Camera, Square, Upload, ChevronDown } from 'lucide-react';

const ASPECT_CLASSES = [
  'col-span-1 row-span-2',
  'col-span-1 row-span-1',
  'col-span-1 row-span-1',
  'col-span-1 row-span-2',
  'col-span-1 row-span-1',
  'col-span-1 row-span-1',
  'col-span-1 row-span-2',
  'col-span-1 row-span-1',
  'col-span-1 row-span-1',
];

const PLACEHOLDER_IMGS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80',
  'https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=400&q=80',
  'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400&q=80',
  'https://images.unsplash.com/photo-1574169208507-84376144848b?w=400&q=80',
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400&q=80',
  'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=400&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=80',
  'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400&q=80',
];

const TABS = ['KEYFRAME', 'REFERENCE', 'MODIFY'];

export default function Entropy() {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('KEYFRAME');
  const [draft, setDraft] = useState(true);
  const inputRef = useRef(null);

  const gridItems = history.length > 0
    ? [...history.map(h => ({ url: h.url, prompt: h.prompt })), ...PLACEHOLDER_IMGS.slice(0, Math.max(0, 12 - history.length)).map(url => ({ url, prompt: '' }))]
    : PLACEHOLDER_IMGS.map(url => ({ url, prompt: '' }));

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    const currentPrompt = prompt;
    setPrompt('');

    const result = await base44.integrations.Core.GenerateImage({ prompt: currentPrompt });
    setHistory(prev => [{ url: result.url, prompt: currentPrompt, timestamp: new Date() }, ...prev]);
    setGenerating(false);
  };

  const handleSave = async (item) => {
    await base44.entities.MediaItem.create({
      title: item.prompt.slice(0, 60) || 'Generated',
      file_url: item.url,
      content_type: 'image',
      tags: ['generated', 'entropy'],
      collection: 'generated',
    });
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden" style={{ left: 56 }}>
      {/* Masonry grid background */}
      <div
        className="absolute inset-0 grid gap-1 p-1 overflow-hidden"
        style={{ gridTemplateColumns: 'repeat(5, 1fr)', gridTemplateRows: 'repeat(4, 1fr)', gridAutoFlow: 'dense' }}
      >
        {gridItems.slice(0, 12).map((item, i) => (
          <motion.div
            key={item.url + i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04, duration: 0.5 }}
            className={`relative overflow-hidden rounded-lg group cursor-pointer ${ASPECT_CLASSES[i % ASPECT_CLASSES.length]}`}
            onClick={() => item.prompt && handleSave(item)}
          >
            <img
              src={item.url}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
            {/* Badge */}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/50 backdrop-blur-sm text-white/70 text-[10px] font-light tracking-wide">
              {i % 3 === 0 ? '1080p · 5s' : i % 3 === 1 ? '720p · 5s' : '540p · 5s'}
            </div>
            {history.find(h => h.url === item.url) && (
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-white/10 backdrop-blur-sm text-white/60 text-[9px] tracking-widest uppercase">
                saved
              </div>
            )}
          </motion.div>
        ))}

        {/* Loading tile */}
        {generating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-1 row-span-2 relative rounded-lg overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
              <p className="text-white/30 text-xs font-light">generating...</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

      {/* Floating prompt bar */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Tab row */}
            <div className="flex items-center gap-0 px-4 pt-3 pb-0">
              {TABS.map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-[11px] font-medium tracking-widest transition-colors ${
                    activeTab === tab ? 'text-white' : 'text-white/30 hover:text-white/60'
                  }`}
                >
                  {tab}
                </button>
              ))}
              <span className="ml-1 w-5 h-5 rounded bg-white/10 text-white/50 text-[10px] flex items-center justify-center">7</span>
            </div>

            {/* Input */}
            <div className="px-4 py-3">
              <input
                ref={inputRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleGenerate()}
                placeholder="What do you want to see..."
                className="w-full bg-transparent text-white/80 placeholder-white/25 text-sm font-light outline-none"
              />
            </div>

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-4 pb-3">
              {/* Left tools */}
              <div className="flex items-center gap-3 text-white/30">
                <button className="hover:text-white/60 transition-colors">
                  <Camera className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button className="hover:text-white/60 transition-colors">
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button className="hover:text-white/60 transition-colors">
                  <Square className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button className="hover:text-white/60 transition-colors">
                  <Infinity className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-3">
                {/* Draft toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-[11px] tracking-wider">DRAFT</span>
                  <button
                    onClick={() => setDraft(!draft)}
                    className={`relative w-8 h-4 rounded-full transition-colors ${draft ? 'bg-white/30' : 'bg-white/10'}`}
                  >
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${draft ? 'left-4' : 'left-0.5'}`} />
                  </button>
                </div>

                {/* Mode selector */}
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
                  <span className="text-white/50 text-[11px] tracking-wide">IMAGE · FLUX</span>
                  <ChevronDown className="w-3 h-3 text-white/30" />
                </button>

                {/* Generate button */}
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || generating}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  {generating ? (
                    <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}