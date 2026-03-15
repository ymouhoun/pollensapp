import React from 'react';

export default function ProgressiveBlur({ side = 'top', height = 160 }) {
  const isTop = side === 'top';
  
  return (
    <div
      className="pointer-events-none fixed z-30 overflow-hidden"
      style={{
        [side]: 0,
        left: 0,
        right: 0,
        height,
      }}
    >
      {/* Smooth directional motion blur with diagonal streaks */}
      <div
        className="absolute inset-0"
        style={{
          background: isTop
            ? 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.04) 50%, transparent 100%)'
            : 'linear-gradient(315deg, transparent 0%, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.04) 50%, transparent 100%)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          maskImage: isTop
            ? 'linear-gradient(to bottom, black 0%, transparent 100%)'
            : 'linear-gradient(to top, black 0%, transparent 100%)',
          WebkitMaskImage: isTop
            ? 'linear-gradient(to bottom, black 0%, transparent 100%)'
            : 'linear-gradient(to top, black 0%, transparent 100%)',
        }}
      />
      
      {/* Soft edge fade */}
      <div
        className="absolute inset-0"
        style={{
          background: isTop
            ? 'linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 70%)'
            : 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}