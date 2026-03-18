import React from 'react';
import { motion } from 'framer-motion';

const THEMES = {
  red: {
    primary: 'rgba(255, 76, 76, 0.92)',
    secondary: 'rgba(255, 124, 96, 0.68)',
    tertiary: 'rgba(255, 38, 86, 0.42)',
  },
  orange: {
    primary: 'rgba(255, 157, 64, 0.92)',
    secondary: 'rgba(255, 110, 48, 0.7)',
    tertiary: 'rgba(255, 205, 112, 0.38)',
  },
  purple: {
    primary: 'rgba(153, 111, 255, 0.9)',
    secondary: 'rgba(214, 112, 255, 0.64)',
    tertiary: 'rgba(99, 118, 255, 0.38)',
  },
  blue: {
    primary: 'rgba(92, 164, 255, 0.9)',
    secondary: 'rgba(80, 215, 255, 0.64)',
    tertiary: 'rgba(132, 132, 255, 0.36)',
  },
};

export default function DisplayGlowOverlay({ phase = 'purple' }) {
  const theme = THEMES[phase] || THEMES.purple;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      <motion.div
        className="absolute inset-[-18%] blur-3xl opacity-85"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, ${theme.primary} 32deg, transparent 96deg, ${theme.secondary} 160deg, transparent 224deg, ${theme.tertiary} 288deg, transparent 360deg)`,
        }}
        animate={{ rotate: [0, 180, 360], scale: [1, 1.04, 0.98, 1] }}
        transition={{ duration: 14, ease: 'linear', repeat: Infinity }}
      />
      <motion.div
        className="absolute -left-[8%] top-[10%] h-48 w-72 rounded-full blur-[80px]"
        style={{ background: theme.primary }}
        animate={{ x: [0, 36, -12, 0], y: [0, 16, -10, 0], scale: [1, 1.08, 0.94, 1] }}
        transition={{ duration: 7.2, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.div
        className="absolute right-[0%] top-[8%] h-44 w-64 rounded-full blur-[80px]"
        style={{ background: theme.secondary }}
        animate={{ x: [0, -28, 12, 0], y: [0, -8, 12, 0], scale: [0.96, 1.08, 1, 0.96] }}
        transition={{ duration: 8.2, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-[6%] left-[10%] h-44 w-72 rounded-full blur-[88px]"
        style={{ background: theme.tertiary }}
        animate={{ x: [0, 24, -18, 0], y: [0, -12, 10, 0], scale: [1, 1.12, 0.92, 1] }}
        transition={{ duration: 9, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-[4%] right-[8%] h-40 w-64 rounded-full blur-[88px]"
        style={{ background: theme.primary }}
        animate={{ x: [0, -24, 10, 0], y: [0, 10, -12, 0], scale: [0.96, 1.1, 1, 0.96] }}
        transition={{ duration: 6.8, ease: 'easeInOut', repeat: Infinity }}
      />
      <div className="absolute inset-[14px] rounded-[32px] border border-white/8" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_52%,rgba(0,0,0,0.22)_100%)]" />
    </div>
  );
}