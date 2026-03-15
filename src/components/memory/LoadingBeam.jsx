import React from 'react';
import { motion } from 'framer-motion';

export default function LoadingBeam({ visible }) {
  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-[2px] overflow-hidden">
      {/* Dark base track */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Traveling beam */}
      <motion.div
        className="absolute top-0 h-full w-[30%]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(180,120,160,0.4) 20%, rgba(220,160,200,0.9) 50%, rgba(255,200,230,1) 65%, rgba(220,160,200,0.9) 80%, transparent 100%)',
          boxShadow: '0 0 12px 4px rgba(200,130,170,0.6), 0 0 30px 8px rgba(180,100,140,0.3)',
        }}
        initial={{ left: '-30%' }}
        animate={{ left: '110%' }}
        transition={{
          duration: 1.4,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatDelay: 0.2,
        }}
      />
    </div>
  );
}