import React from 'react';
import { motion } from 'framer-motion';

export default function StudioStarting({ gpuName, costPerHour, statusMessage, bootProgress, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-10">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6 max-w-md px-6 w-full"
      >
        {/* Animated pulse */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-full border border-white/10"
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border border-white/15"
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          />
          <div className="w-3 h-3 rounded-full bg-white/30" />
        </div>

        {/* GPU info */}
        {gpuName && (
          <div className="flex flex-col items-center gap-1">
            <p className="text-white/60 text-sm tracking-wide" style={{ fontFamily: 'var(--font-sans)' }}>
              {gpuName}
            </p>
            {costPerHour > 0 && (
              <p className="text-white/25 text-[10px] tracking-widest uppercase">
                ${costPerHour.toFixed(2)}/hr
              </p>
            )}
          </div>
        )}

        {/* Status message */}
        <motion.p
          key={statusMessage}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white/35 text-xs tracking-wide text-center"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {statusMessage}
        </motion.p>

        {/* Progress bar */}
        <div className="w-full max-w-xs">
          <div className="h-px bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white/30"
              style={{ width: `${bootProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-white/20 text-[10px] tracking-widest text-center mt-2">
            {Math.round(bootProgress)}%
          </p>
        </div>

        {/* Cancel */}
        <button
          onClick={onCancel}
          className="text-white/20 text-[10px] tracking-widest uppercase hover:text-white/40 transition-colors mt-4"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          Cancel
        </button>
      </motion.div>
    </div>
  );
}