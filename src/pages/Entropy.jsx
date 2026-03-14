import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Image as ImageIcon, Infinity, Camera, Square, Upload, ChevronDown } from 'lucide-react';
import FloatingImagesBackground from '@/components/entropy/FloatingImagesBackground';

const PLACEHOLDER_IMGS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80',
  'https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=400&q=80',
  'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400&q=80',
  'https://images.unsplash.com/photo-1574169208507-84376144848b?w=400&q=80',
];

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

  const floatingImages = history.length > 0
    ? history.map(h => ({ 
        file_url: h.url, 
        prompt: h.prompt,
        content_type: 'image',
        title: h.prompt.slice(0, 30)
      }))
    : PLACEHOLDER_IMGS.map(url => ({ 
        file_url: url, 
        prompt: '',
        content_type: 'image',
        title: ''
      }));

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
      {/* Floating images background */}
      <FloatingImagesBackground items={floatingImages} />

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
            <div className="flex items-center gap-2 px-5 pb-4">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 transition-colors border border-white/30 text-white/70 text-xs font-light backdrop-blur-md">
                <span>💭</span>
                Thinking
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 transition-colors border border-white/30 text-white/70 text-xs font-light backdrop-blur-md">
                <span>🔍</span>
                Search
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}