import React from 'react';
import { motion } from 'framer-motion';

export default function StudioLoading({ gpuName, costPerHour, statusMessage, bootProgress }) {
  const percent = Math.round(bootProgress * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-5"
    >
      {/* Spinner */}
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border border-white/10" />
        <motion.div
          className="absolute inset-0 rounded-full border border-transparent border-t-white/50"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
        />
      </div>

      {/* GPU info */}
      {gpuName && (
        <div className="text-center">
          <p className="text-xs text-white/50 tracking-wide" style={{ fontFamily: 'var(--font-sans)' }}>
            {gpuName}
          </p>
          {costPerHour > 0 && (
            <p className="text-[10px] text-white/25 mt-0.5 tracking-widest" style={{ fontFamily: 'var(--font-sans)' }}>
              ${costPerHour.toFixed(3)}/HR
            </p>
          )}
        </div>
      )}

      {/* Status message */}
      <motion.p
        key={statusMessage}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[11px] text-white/35 tracking-wide"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {statusMessage}
      </motion.p>

      {/* Progress bar */}
      <div className="w-48 h-px bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-white/30"
          style={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      <p className="text-[10px] text-white/20 tracking-widest" style={{ fontFamily: 'var(--font-sans)' }}>
        {percent}%
      </p>
    </motion.div>
  );
}