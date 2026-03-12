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
        className="group flex items-center justify-center w-[72px] h-[72px] rounded-full border border-border/50 bg-background/40 backdrop-blur-md hover:bg-background/70 hover:border-border transition-all duration-200 hover:scale-105 active:scale-95 shadow-macos-sm"
      >
        <span className="text-macos-sm text-muted-foreground group-hover:text-foreground transition-colors">
          forget
        </span>
      </button>

      <button
        onClick={onKeep}
        className="group flex items-center justify-center w-[72px] h-[72px] rounded-full border border-border/50 bg-background/40 backdrop-blur-md hover:bg-background/70 hover:border-primary/40 transition-all duration-200 hover:scale-105 active:scale-95 shadow-macos-sm"
      >
        <span className="text-macos-sm text-muted-foreground group-hover:text-foreground transition-colors">
          keep
        </span>
      </button>
    </motion.div>
  );
}