import React from 'react';
import { motion } from 'framer-motion';

const THEMES = {
  red: {
    primary: 'rgba(255, 76, 76, 0.9)',
    secondary: 'rgba(255, 124, 96, 0.65)',
    tertiary: 'rgba(255, 38, 86, 0.45)',
    aura: '0 0 80px rgba(255, 76, 76, 0.18)',
  },
  orange: {
    primary: 'rgba(255, 157, 64, 0.92)',
    secondary: 'rgba(255, 110, 48, 0.68)',
    tertiary: 'rgba(255, 205, 112, 0.4)',
    aura: '0 0 80px rgba(255, 157, 64, 0.2)',
  },
  purple: {
    primary: 'rgba(153, 111, 255, 0.92)',
    secondary: 'rgba(214, 112, 255, 0.66)',
    tertiary: 'rgba(99, 118, 255, 0.42)',
    aura: '0 0 90px rgba(153, 111, 255, 0.22)',
  },
  blue: {
    primary: 'rgba(92, 164, 255, 0.92)',
    secondary: 'rgba(80, 215, 255, 0.68)',
    tertiary: 'rgba(132, 132, 255, 0.4)',
    aura: '0 0 90px rgba(92, 164, 255, 0.22)',
  },
};

export default function EdgeGlowFrame({ phase = 'purple', className = '', innerClassName = '', children }) {
  const theme = THEMES[phase] || THEMES.purple;

  return (
    <div className={`relative rounded-[28px] p-[1px] ${className}`} style={{ boxShadow: theme.aura }}>
      <div className="absolute inset-0 rounded-[28px] overflow-hidden pointer-events-none">
        <motion.div
          className="absolute inset-[-32%] blur-2xl opacity-90"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${theme.primary} 36deg, transparent 96deg, ${theme.secondary} 152deg, transparent 218deg, ${theme.tertiary} 282deg, transparent 360deg)`,
          }}
          animate={{ rotate: [0, 180, 360], scale: [1, 1.06, 0.98, 1] }}
          transition={{ duration: 10, ease: 'linear', repeat: Infinity }}
        />
        <motion.div
          className="absolute -left-[6%] top-[6%] h-24 w-44 rounded-full blur-3xl"
          style={{ background: theme.primary }}
          animate={{ x: [0, 32, -8, 0], y: [0, 8, -10, 0], scale: [1, 1.15, 0.96, 1] }}
          transition={{ duration: 6.5, ease: 'easeInOut', repeat: Infinity }}
        />
        <motion.div
          className="absolute right-[2%] top-[10%] h-20 w-36 rounded-full blur-3xl"
          style={{ background: theme.secondary }}
          animate={{ x: [0, -26, 10, 0], y: [0, -6, 10, 0], scale: [0.94, 1.08, 1, 0.94] }}
          transition={{ duration: 7.2, ease: 'easeInOut', repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-[4%] left-[12%] h-24 w-40 rounded-full blur-3xl"
          style={{ background: theme.tertiary }}
          animate={{ x: [0, 18, -16, 0], y: [0, -8, 6, 0], scale: [1, 1.1, 0.92, 1] }}
          transition={{ duration: 8.2, ease: 'easeInOut', repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-[2%] right-[10%] h-20 w-32 rounded-full blur-3xl"
          style={{ background: theme.primary }}
          animate={{ x: [0, -20, 8, 0], y: [0, 6, -10, 0], scale: [0.96, 1.06, 1, 0.96] }}
          transition={{ duration: 5.8, ease: 'easeInOut', repeat: Infinity }}
        />
        <div className="absolute inset-[1px] rounded-[27px] bg-black/78 backdrop-blur-xl" />
      </div>

      <div className={`relative rounded-[27px] border border-white/8 bg-black/26 ${innerClassName}`}>
        {children}
      </div>
    </div>
  );
}