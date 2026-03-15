import React, { useRef, useEffect } from 'react';

const LAYERS = 8;

/**
 * SVG turbulence distortion filter — renders once, ID scoped to side.
 */
function DistortionFilter({ id }) {
  return (
    <svg width="0" height="0" className="absolute pointer-events-none" style={{ position: 'absolute' }}>
      <defs>
        <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.018 0.032"
            numOctaves="3"
            seed="4"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="14"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

export default function ProgressiveBlur({ side = 'top', height = 160 }) {
  const filterId = `distort-${side}`;

  return (
    <div
      className="pointer-events-none fixed z-30"
      style={{ [side]: 0, left: 0, right: 0, height }}
    >
      <DistortionFilter id={filterId} />

      {/* Blur layers */}
      {Array.from({ length: LAYERS }, (_, i) => {
        const blur = Math.pow(2, i - 1);
        const coverage = ((LAYERS - i) / LAYERS) * 100;

        const gradient =
          side === 'top'
            ? `linear-gradient(to bottom, black 0%, black ${coverage * 0.5}%, transparent ${coverage}%)`
            : `linear-gradient(to top, black 0%, black ${coverage * 0.5}%, transparent ${coverage}%)`;

        return (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              maskImage: gradient,
              WebkitMaskImage: gradient,
            }}
          />
        );
      })}

      {/* Solid colour fade */}
      <div
        className="absolute inset-0"
        style={{
          background:
            side === 'top'
              ? 'linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 60%)'
              : 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 60%)',
        }}
      />

      {/* Distortion + chromatic aberration overlay */}
      <div
        className="absolute inset-0"
        style={{
          filter: `url(#${filterId})`,
          opacity: 0.18,
          background:
            side === 'top'
              ? 'linear-gradient(to bottom, hsl(var(--background) / 0.5) 0%, transparent 80%)'
              : 'linear-gradient(to top, hsl(var(--background) / 0.5) 0%, transparent 80%)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Iridescent sheen — "slay" colour wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            side === 'top'
              ? 'linear-gradient(135deg, rgba(180,120,255,0.07) 0%, rgba(80,200,255,0.05) 40%, rgba(255,100,180,0.06) 80%, transparent 100%)'
              : 'linear-gradient(315deg, rgba(180,120,255,0.07) 0%, rgba(80,200,255,0.05) 40%, rgba(255,100,180,0.06) 80%, transparent 100%)',
          maskImage:
            side === 'top'
              ? 'linear-gradient(to bottom, black 0%, transparent 100%)'
              : 'linear-gradient(to top, black 0%, transparent 100%)',
          WebkitMaskImage:
            side === 'top'
              ? 'linear-gradient(to bottom, black 0%, transparent 100%)'
              : 'linear-gradient(to top, black 0%, transparent 100%)',
        }}
      />
    </div>
  );
}