import React from 'react';
import { motion } from 'framer-motion';

export default function EntropyActions({ onForget, onKeep }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="flex items-center gap-3 mt-8"
    >
      <button
        onClick={onForget}
        className="group flex items-center justify-center w-20 h-20 rounded-full border border-border/60 hover:border-muted-foreground/40 transition-all duration-300 hover:scale-105 active:scale-95"
      >
        <span className="text-sm font-light text-muted-foreground group-hover:text-foreground transition-colors">
          forget
        </span>
      </button>

      <button
        onClick={onKeep}
        className="group flex items-center justify-center w-20 h-20 rounded-full border border-border/60 hover:border-primary/40 transition-all duration-300 hover:scale-105 active:scale-95"
      >
        <span className="text-sm font-light text-muted-foreground group-hover:text-foreground transition-colors">
          keep
        </span>
      </button>
    </motion.div>
  );
}