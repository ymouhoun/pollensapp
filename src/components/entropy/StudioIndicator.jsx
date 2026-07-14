import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { OctagonX } from 'lucide-react';

export default function StudioIndicator({ status, gpuName, onStop }) {
  if (status !== 'READY') return null;

  return (
    <div className="flex items-center gap-2 text-[10px] tracking-widest" style={{ fontFamily: 'var(--font-sans)' }}>
      <span className="relative flex h-2 w-2 items-center justify-center">
        <span
          className="absolute inline-flex h-full w-full rounded-full bg-entropy-muted animate-ping blur-[1px]"
          style={{ animationDuration: '2s' }}
        />
        <span className="relative inline-flex h-1 w-1 rounded-full bg-entropy-foreground blur-[0.5px]" style={{ boxShadow: '0 0 4px 1.5px hsl(var(--entropy-foreground) / 0.35)' }} />
      </span>
      <span className="text-entropy-muted">{gpuName || 'GPU'}</span>
      <motion.button
        onClick={onStop}
        className="text-entropy-faint hover:text-red-500 transition-colors"
        whileHover={{ rotate: [0, -8, 8, -8, 8, 0] }}
        transition={{ duration: 0.4 }}
      >
        <OctagonX className="w-2.5 h-2.5" strokeWidth={1.5} />
      </motion.button>
    </div>
  );
}