import React from 'react';
import { motion } from 'framer-motion';

export default function EvolveGradientBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'linear-gradient(135deg, #f5f5f5 0%, #e8e0f5 50%, #f5f5f5 100%)',
            'linear-gradient(135deg, #f0f5f5 0%, #f5e8f0 50%, #f5f5f0 100%)',
            'linear-gradient(135deg, #f5f5f5 0%, #f0f0f5 50%, #f5f5f5 100%)',
            'linear-gradient(135deg, #f5f0f5 0%, #f0f5f0 50%, #f5f5f5 100%)',
            'linear-gradient(135deg, #f5f5f5 0%, #e8e0f5 50%, #f5f5f5 100%)',
          ],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Grain overlay */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' fill='%23ffffff'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}