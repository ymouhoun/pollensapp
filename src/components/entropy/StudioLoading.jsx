import React from 'react';
import { motion } from 'framer-motion';

export default function StudioLoading({ gpuName, costPerHour, statusMessage, bootProgress }) {
  const percent = Math.round(bootProgress * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-[min(34rem,calc(100vw-3rem))]"
    >
      <div className="flex flex-col items-center gap-5 text-center">
        {gpuName && (
          <div>
            <p className="text-xs text-white/55 tracking-wide" style={{ fontFamily: 'var(--font-sans)' }}>
              {gpuName}
            </p>
            {costPerHour > 0 && (
              <p className="mt-1 text-[10px] text-white/25 tracking-[0.24em]" style={{ fontFamily: 'var(--font-sans)' }}>
                ${costPerHour.toFixed(3)}/HR
              </p>
            )}
          </div>
        )}

        <motion.p
          key={statusMessage}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] text-white/42 tracking-wide"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {statusMessage}
        </motion.p>

        <div className="w-full max-w-56 h-px bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white/40"
            style={{ width: `${percent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        <p className="text-[10px] text-white/22 tracking-[0.28em]" style={{ fontFamily: 'var(--font-sans)' }}>
          {percent}%
        </p>
      </div>
    </motion.div>
  );
}