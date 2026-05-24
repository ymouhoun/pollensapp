import React from 'react';
import { motion } from 'framer-motion';
import { Square } from 'lucide-react';

export default function GenerationPreview({ previewUrl, progress, onInterrupt, interrupted }) {
  const { step, total } = progress;
  const ratio = total > 0 ? step / total : 0;
  const blur = Math.max(0, 8 - ratio * 8);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative max-w-lg max-h-[70vh] rounded-sm overflow-hidden shadow-2xl">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="w-full h-full object-contain"
            style={{
              filter: interrupted ? 'none' : `blur(${blur}px)`,
              transition: 'filter 0.5s ease, opacity 0.3s ease',
            }}
          />
        ) : (
          <div className="w-64 h-80 flex items-center justify-center">
            <div className="w-6 h-6 border border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}

        {/* Interrupt button overlay */}
        {!interrupted && onInterrupt && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onInterrupt}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 backdrop-blur-xl transition-all hover:bg-white/15 hover:border-white/25"
            style={{
              background: 'rgba(0,0,0,0.5)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <Square className="w-2.5 h-2.5 text-white/70 fill-white/70" />
            <span className="text-[10px] text-white/70 tracking-widest uppercase">Stop</span>
          </motion.button>
        )}
      </div>

      <p
        className="text-[10px] text-white/30 tracking-widest uppercase"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {interrupted
          ? 'Generation interrupted — last preview shown'
          : `Step ${step} / ${total}`
        }
      </p>
    </div>
  );
}