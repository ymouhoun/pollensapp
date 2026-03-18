import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MODELS } from '@/hooks/useStudio';

export default function StudioStopped({ onStart }) {
  const [selectedModel, setSelectedModel] = useState(MODELS[0].checkpoint);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-6"
    >
      {/* Model selector */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-[10px] tracking-widest uppercase text-white/30" style={{ fontFamily: 'var(--font-sans)' }}>
          Model
        </span>
        <div className="flex gap-2">
          {MODELS.map(m => (
            <button
              key={m.checkpoint}
              onClick={() => setSelectedModel(m.checkpoint)}
              className={`px-4 py-1.5 rounded-lg text-xs tracking-wide transition-all border ${
                selectedModel === m.checkpoint
                  ? 'border-white/25 bg-white/10 text-white/80'
                  : 'border-white/8 text-white/30 hover:text-white/50 hover:border-white/15'
              }`}
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onStart(selectedModel)}
        className="group px-8 py-3 rounded-xl border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all duration-300"
      >
        <span className="text-sm text-white/60 group-hover:text-white/90 tracking-wide transition-colors" style={{ fontFamily: 'var(--font-sans)' }}>
          Start Studio
        </span>
        <p className="text-[10px] text-white/25 mt-1 tracking-widest" style={{ fontFamily: 'var(--font-sans)' }}>
          ~6 MIN BOOT TIME
        </p>
      </button>
    </motion.div>
  );
}