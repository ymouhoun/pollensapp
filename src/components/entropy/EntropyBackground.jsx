import React from 'react';
import { motion } from 'framer-motion';

export default function EntropyBackground() {
  return (
    <div className="absolute inset-0">
      {/* Animated gradient */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'linear-gradient(135deg, #f0ebe5 0%, #e8dff5 50%, #f0ebe5 100%)',
            'linear-gradient(135deg, #ebe5f0 0%, #f5e8e0 50%, #e5f0eb 100%)',
            'linear-gradient(135deg, #f0ebe5 0%, #e0e8f5 50%, #f0ebe5 100%)',
            'linear-gradient(135deg, #ebe5f0 0%, #f5e8e0 50%, #e5f0eb 100%)',
            'linear-gradient(135deg, #f0ebe5 0%, #e8dff5 50%, #f0ebe5 100%)',
          ],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Subtle noise */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' fill='%23000000'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 pointer-events-none" />
    </div>
  );
}