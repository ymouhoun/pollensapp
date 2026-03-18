import React from 'react';
import { motion } from 'framer-motion';

export default function StudioError({ message, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-4"
    >
      <p className="text-xs text-red-400/70 tracking-wide text-center max-w-xs" style={{ fontFamily: 'var(--font-sans)' }}>
        {message}
      </p>
      <button
        onClick={onRetry}
        className="px-6 py-2 rounded-lg border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all text-xs text-white/60 hover:text-white/90 tracking-wide"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        Retry
      </button>
    </motion.div>
  );
}