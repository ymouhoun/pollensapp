import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InactivityWarning({ visible, onKeepAlive }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl border border-yellow-500/20 backdrop-blur-xl flex items-center gap-4"
          style={{ background: 'rgba(30,25,10,0.85)' }}
        >
          <p className="text-yellow-200/70 text-xs tracking-wide" style={{ fontFamily: 'var(--font-sans)' }}>
            No activity detected — studio will stop in 2 minutes
          </p>
          <button
            onClick={onKeepAlive}
            className="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-200/80 text-[10px] tracking-widest uppercase hover:bg-yellow-500/30 transition-colors"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            Keep alive
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}