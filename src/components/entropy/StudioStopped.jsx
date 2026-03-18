import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

const MODELS = [
  { label: "Editorial", checkpoint: "editorial.safetensors" },
];

export default function StudioStopped({ selectedModel, setSelectedModel, onStart, error }) {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center gap-8 max-w-md px-6"
      >
        {/* Title */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mb-2">
            <Zap className="w-5 h-5 text-white/40" strokeWidth={1.5} />
          </div>
          <h2 className="text-white/80 text-lg tracking-wide" style={{ fontFamily: 'var(--font-sans)' }}>
            Start Studio
          </h2>
          <p className="text-white/30 text-xs tracking-wide text-center">
            Boot time ~6 minutes · GPU on demand
          </p>
        </div>

        {/* Model selector */}
        <div className="w-full">
          <p className="text-white/30 text-[10px] tracking-widest uppercase mb-3">Model</p>
          <div className="flex gap-2">
            {MODELS.map(m => (
              <button
                key={m.checkpoint}
                onClick={() => setSelectedModel(m)}
                className={`px-4 py-2.5 rounded-lg text-xs tracking-wide transition-all ${
                  selectedModel.checkpoint === m.checkpoint
                    ? 'bg-white/15 text-white/80 border border-white/20'
                    : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'
                }`}
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="w-full px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-red-400/80 text-xs text-center" style={{ fontFamily: 'var(--font-sans)' }}>
              {error}
            </p>
          </div>
        )}

        {/* Start button */}
        <button
          onClick={() => onStart(selectedModel)}
          className="w-full py-3.5 rounded-xl text-sm tracking-wide text-white/80 transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/10"
          style={{
            fontFamily: 'var(--font-sans)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
          }}
        >
          {error ? 'Retry' : 'Launch'}
        </button>
      </motion.div>
    </div>
  );
}