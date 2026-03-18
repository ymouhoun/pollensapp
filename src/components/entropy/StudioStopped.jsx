import React from 'react';
import { motion } from 'framer-motion';

export default function StudioStopped({ onStart, isDark = true }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-6"
    >
      <button
        onClick={() => onStart()}
        className={`group px-8 py-3 rounded-xl transition-all duration-300 ${
          isDark
            ? 'border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10'
            : 'border border-black/15 hover:border-black/30 bg-black/5 hover:bg-black/10'
        }`}
      >
        <span className={`text-sm tracking-wide transition-colors ${
          isDark
            ? 'text-white/60 group-hover:text-white/90'
            : 'text-black/60 group-hover:text-black/90'
        }`} style={{ fontFamily: 'var(--font-sans)' }}>
          Start Studio
        </span>
        <p className={`text-[10px] mt-1 tracking-widest ${isDark ? 'text-white/25' : 'text-black/25'}`} style={{ fontFamily: 'var(--font-sans)' }}>
          ~6 MIN BOOT TIME
        </p>
      </button>
    </motion.div>
  );
}