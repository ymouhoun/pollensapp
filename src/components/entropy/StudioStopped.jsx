import React from 'react';
import { motion } from 'framer-motion';

export default function StudioStopped({ onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-6"
    >
      <button
        onClick={() => onStart()}
        className="group px-8 py-3 rounded-xl border border-entropy-border bg-entropy-panel transition-all duration-300 hover:shadow-lg"
      >
        <span className="text-sm text-entropy-muted group-hover:text-entropy-foreground tracking-wide transition-colors" style={{ fontFamily: 'var(--font-sans)' }}>
          Start Studio
        </span>
        <p className="text-[10px] text-entropy-faint mt-1 tracking-widest" style={{ fontFamily: 'var(--font-sans)' }}>
          ON-DEMAND GPU
        </p>
      </button>
    </motion.div>
  );
}