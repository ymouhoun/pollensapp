import React from 'react';

/**
 * Progressive blur using stacked backdrop-filter layers with gradient masks.
 * Each layer has increasing blur and decreasing coverage toward the content edge,
 * creating a smooth "depth-of-field" fade identical to the WebGL approach.
 */
const LAYERS = 8;

export default function ProgressiveBlur({ side = 'top', height = 160 }) {
  return (
    <div
      className="pointer-events-none fixed z-30"
      style={{
        [side]: 0,
        left: 0,
        right: 0,
        height,
      }}
    >
      {Array.from({ length: LAYERS }, (_, i) => {
        const blur = Math.pow(2, i - 1); // 0.5, 1, 2, 4, 8, 16, 32, 64 px
        const coverage = ((LAYERS - i) / LAYERS) * 100; // 100%, 87.5%, 75% …

        const gradient =
          side === 'top'
            ? `linear-gradient(to bottom, black 0%, black ${coverage * 0.5}%, transparent ${coverage}%)`
            : `linear-gradient(to top, black 0%, black ${coverage * 0.5}%, transparent ${coverage}%)`;

        const distortion = (i / LAYERS) * 0.15; // 0 to 0.15 skew
        const direction = side === 'top' ? 1 : -1;

        return (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              maskImage: gradient,
              WebkitMaskImage: gradient,
              transform: `skewY(${distortion * direction}rad)`,
              transformOrigin: side === 'top' ? 'center bottom' : 'center top',
            }}
          />
        );
      })}

      {/* Solid colour fade on the outermost edge */}
      <div
        className="absolute inset-0"
        style={{
          background:
            side === 'top'
              ? 'linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 60%)'
              : 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 60%)',
        }}
      />
    </div>
  );
}