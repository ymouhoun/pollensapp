import React from 'react';

export default function GenerationPreview({ previewUrl, progress }) {
  const { value, max } = progress;
  const ratio = max > 0 ? value / max : 0;
  const blur = Math.max(0, 8 - ratio * 8);

  return (
    <div className="flex flex-col items-center gap-4 w-[min(34rem,calc(100vw-3rem))]">
      <div className="relative max-h-[70vh] overflow-hidden rounded-sm shadow-2xl">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="w-full h-full object-contain"
            style={{
              filter: `blur(${blur}px)`,
              transition: 'filter 0.3s ease',
            }}
          />
        ) : (
          <div className="w-64 h-80 flex items-center justify-center">
            <p className="text-[10px] text-white/24 tracking-[0.28em] uppercase" style={{ fontFamily: 'var(--font-sans)' }}>
              Generating preview
            </p>
          </div>
        )}
      </div>
      <p
        className="text-[10px] text-white/30 tracking-widest uppercase"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        Step {value} / {max}
      </p>
    </div>
  );
}