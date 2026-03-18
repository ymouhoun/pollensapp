import React from 'react';
import { motion } from 'framer-motion';

export default function ProgressVisualization({ ratio }) {
  return (
    <div className="relative w-64 h-80 overflow-hidden rounded-sm bg-white/[0.03] border border-white/10">
      <motion.div
        className="absolute inset-[-20%] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent_35%),radial-gradient(circle_at_70%_40%,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_50%_75%,rgba(255,255,255,0.1),transparent_35%)]"
        animate={{ rotate: [0, 8, -6, 0], scale: [1, 1.04, 0.98, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%,rgba(255,255,255,0.08))]"
        animate={{ opacity: [0.35, 0.7, 0.4] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-x-6 bottom-6 h-px bg-white/10">
        <motion.div
          className="h-full bg-white/70"
          initial={{ width: '0%' }}
          animate={{ width: `${Math.max(4, ratio * 100)}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="w-24 h-24 rounded-full border border-white/15"
          animate={{ scale: [0.92, 1.05, 0.96], opacity: [0.35, 0.7, 0.45] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}