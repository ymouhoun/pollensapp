import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { OctagonX } from 'lucide-react';

export default function StudioIndicator({ status, gpuName, onStop, isDark = true }) {
  if (status !== 'READY') return null;

  return (
    <div className="flex items-center gap-2 text-[10px] tracking-widest" style={{ fontFamily: 'var(--font-sans)' }}>
      <span className="relative flex h-2 w-2 items-center justify-center">
        <span
          className={`absolute inline-flex h-full w-full rounded-full animate-ping blur-[1px] ${isDark ? 'bg-white/30' : 'bg-black/30'}`}
          style={{ animationDuration: '2s' }}
        />
        <span 
          className={`relative inline-flex h-1 w-1 rounded-full blur-[0.5px] ${isDark ? 'bg-white' : 'bg-black'}`} 
          style={{ boxShadow: isDark ? '0 0 4px 1.5px rgba(255,255,255,0.5)' : '0 0 4px 1.5px rgba(0,0,0,0.5)' }} 
        />
      </span>
      <span className={isDark ? 'text-white/30' : 'text-black/30'}>{gpuName || 'GPU'}</span>
      <motion.button
        onClick={onStop}
        className={`transition-colors ${isDark ? 'text-white/25 hover:text-red-500' : 'text-black/25 hover:text-red-600'}`}
        whileHover={{ rotate: [0, -8, 8, -8, 8, 0] }}
        transition={{ duration: 0.4 }}
      >
        <OctagonX className="w-2.5 h-2.5" strokeWidth={1.5} />
      </motion.button>
    </div>
  );
}