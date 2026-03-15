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
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,220,240,0.15) 25%, rgba(255,235,248,1) 50%, rgba(255,220,240,0.15) 75%, transparent 100%)',
          boxShadow: '0 0 6px 1px rgba(255,210,235,0.8), 0 0 20px 4px rgba(220,160,200,0.4), 0 0 50px 10px rgba(180,100,150,0.15)',
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