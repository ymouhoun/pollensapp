import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

export default function StudioStopped({ onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-6"
    >
      <button
        onClick={() => onStart()}
        className="group px-8 py-3 rounded-xl border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all duration-300 flex flex-col items-center gap-2"
      >
        <ArrowUp className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" strokeWidth={1.5} />
        <span className="text-sm text-white/60 group-hover:text-white/90 tracking-wide transition-colors" style={{ fontFamily: 'var(--font-sans)' }}>
          Start Studio
        </span>
        <p className="text-[10px] text-white/25 mt-0.5 tracking-widest" style={{ fontFamily: 'var(--font-sans)' }}>
          ~6 MIN BOOT TIME
        </p>
      </button>
    </motion.div>
  );
}