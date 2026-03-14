import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Camera } from 'lucide-react';
import EntropyBackground from '@/components/entropy/EntropyBackground';
import EntropyGrid from '@/components/entropy/EntropyGrid';
import EntropyPrompt from '@/components/entropy/EntropyPrompt';

const PLACEHOLDER_IMGS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80',
  'https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=400&q=80',
];

export default function Entropy() {
  const [prompt, setPrompt] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('prompt') || '';
  });
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);

  const images = history.length > 0
    ? history.map(h => ({ 
        url: h.url, 
        prompt: h.prompt,
      }))
    : PLACEHOLDER_IMGS.map(url => ({ 
        url,
        prompt: '',
      }));

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    const currentPrompt = prompt;
    setPrompt('');

    try {
      const result = await base44.integrations.Core.GenerateImage({ prompt: currentPrompt });
      setHistory(prev => [{ url: result.url, prompt: currentPrompt, timestamp: new Date() }, ...prev]);
      
      await base44.entities.MediaItem.create({
        title: currentPrompt.slice(0, 60) || 'Generated',
        file_url: result.url,
        content_type: 'image',
        tags: ['generated', 'entropy'],
        collection: 'generated',
      });
    } catch (error) {
      console.error('Failed to generate image:', error);
    }
    
    setGenerating(false);
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ left: 56 }}>
      {/* Background */}
      <EntropyBackground />

      {/* Grid of images */}
      <EntropyGrid images={images} />

      {/* Loading state */}
      <AnimatePresence>
        {generating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
          >
            <Loader2 className="w-6 h-6 text-foreground/40 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center prompt bar */}
      <EntropyPrompt
        prompt={prompt}
        setPrompt={setPrompt}
        onGenerate={handleGenerate}
        generating={generating}
        inputRef={inputRef}
      />
    </div>
  );
}