import React from 'react';
import { motion } from 'framer-motion';

export default function StudioIndicator({ status, gpuName, onStop }) {
  if (status !== 'READY') return null;

  return (
    <div className="flex items-center gap-2 text-[10px] tracking-widest" style={{ fontFamily: 'var(--font-sans)' }}>
      <motion.div
        className="w-1.5 h-1.5 rounded-full bg-emerald-400"
        animate={{ opacity: [0.5, 1, 0.5], boxShadow: ['0 0 3px 1px rgba(52,211,153,0.2)', '0 0 8px 3px rgba(52,211,153,0.6)', '0 0 3px 1px rgba(52,211,153,0.2)'] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      />
      <span className="text-white/30">{gpuName || 'GPU'}</span>
      <span className="text-white/15">|</span>
      <button
        onClick={onStop}
        className="text-white/25 hover:text-red-400/60 transition-colors"
      >
        STOP
      </button>
    </div>
  );
}