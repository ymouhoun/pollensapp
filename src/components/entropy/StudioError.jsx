import React from 'react';
import { motion } from 'framer-motion';

export default function StudioError({ message, onRetry, isDark = true }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-4"
    >
      <p className={`text-xs tracking-wide text-center max-w-xs ${isDark ? 'text-red-400/70' : 'text-red-600/70'}`} style={{ fontFamily: 'var(--font-sans)' }}>
        {message}
      </p>
      <button
        onClick={onRetry}
        className={`px-6 py-2 rounded-lg transition-all text-xs tracking-wide ${
          isDark
            ? 'border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90'
            : 'border border-black/15 hover:border-black/30 bg-black/5 hover:bg-black/10 text-black/60 hover:text-black/90'
        }`}
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        Retry
      </button>
    </motion.div>
  );
}