import React from 'react';
import { motion } from 'framer-motion';

export default function StudioIndicator({ status, gpuName, onStop }) {
  if (status !== 'READY') return null;

  return (
    <div className="flex items-center gap-2 text-[10px] tracking-widest" style={{ fontFamily: 'var(--font-sans)' }}>
      <span className="relative flex h-3 w-3 items-center justify-center">
        <span
          className="absolute inline-flex h-full w-full rounded-full bg-white/40 animate-ping"
          style={{ animationDuration: '2s' }}
        />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" style={{ boxShadow: '0 0 6px 2px rgba(255,255,255,0.7)' }} />
      </span>
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