import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Image as ImageIcon, Infinity, Camera, Square, Upload, ChevronDown } from 'lucide-react';
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';

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
  const [prompt, setPrompt] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('prompt') || '';
  });
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

      {/* Prompt section */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <h1 className="text-white text-3xl font-light mb-12 tracking-wide" style={{ fontFamily: "var(--font-gerstner)" }}>What are you thinking about today?</h1>
        
        <div className="pointer-events-auto max-w-2xl w-full px-6">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
            {/* Input area */}
            <div className="flex items-center gap-3 px-5 py-4">
              <button className="text-white/40 hover:text-white/60 transition-colors flex-shrink-0">
                <Plus className="w-5 h-5" strokeWidth={1.5} />
              </button>
              
              <input
                ref={inputRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleGenerate()}
                placeholder="How can i help you today?"
                className="flex-1 bg-transparent text-white/80 placeholder-white/40 text-sm font-light outline-none"
              />
              
              <button className="text-white/40 hover:text-white/60 transition-colors flex-shrink-0">
                <Camera className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 px-5 pb-4">
              <LiquidMetalButton label="Thinking" viewMode="text" onClick={() => {}} />
              <LiquidMetalButton label="Search" viewMode="text" onClick={() => {}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}