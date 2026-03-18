import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InactivityToast({ visible, onKeepAlive, isDark = true }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl backdrop-blur-xl ${
            isDark 
              ? 'border border-yellow-500/20 bg-yellow-500/10' 
              : 'border border-yellow-600/20 bg-yellow-600/10'
          }`}
        >
          <p className={`text-[11px] tracking-wide ${isDark ? 'text-yellow-200/70' : 'text-yellow-700/70'}`} style={{ fontFamily: 'var(--font-sans)' }}>
            No activity detected — your studio will stop in 2 minutes.
          </p>
          <button
            onClick={onKeepAlive}
            className={`px-3 py-1 rounded-md text-[10px] tracking-widest uppercase transition-colors ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 text-white/80'
                : 'bg-black/10 hover:bg-black/20 text-black/80'
            }`}
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            Keep alive
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}