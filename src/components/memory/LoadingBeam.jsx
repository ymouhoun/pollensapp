import React from 'react';
import { motion } from 'framer-motion';

export default function LoadingBeam({ visible }) {
  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] overflow-visible pointer-events-none">
      {/* Hair-thin track */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

      {/* Beam */}
      <motion.div
        className="absolute top-0 h-px w-[18%]"
        style={{
          height: '0.5px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,20,147,0.2) 25%, rgba(255,20,147,1) 50%, rgba(255,20,147,0.2) 75%, transparent 100%)',
          boxShadow: '0 0 4px 1px rgba(255,20,147,1), 0 0 12px 3px rgba(255,20,147,0.6), 0 0 30px 6px rgba(255,20,147,0.2)',
        }}
        initial={{ left: '-18%' }}
        animate={{ left: '110%' }}
        transition={{
          duration: 2,
          ease: [0.4, 0, 0.2, 1],
          repeat: Infinity,
          repeatDelay: 0.6,
        }}
      />
    </div>
  );
}