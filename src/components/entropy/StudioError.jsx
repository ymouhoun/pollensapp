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
        className="px-6 py-2 rounded-lg border border-entropy-border bg-entropy-panel transition-all text-xs text-entropy-muted hover:text-entropy-foreground tracking-wide"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        Retry
      </button>
    </motion.div>
  );
}