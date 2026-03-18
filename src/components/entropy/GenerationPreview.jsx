import React from 'react';
import EdgeGlowFrame from './EdgeGlowFrame';

export default function GenerationPreview({ previewUrl, progress, phase = 'purple' }) {
  const { value, max } = progress;
  const ratio = max > 0 ? value / max : 0;
  const blur = Math.max(0, 8 - ratio * 8);

  return (
    <div className="flex flex-col items-center gap-4 w-[min(34rem,calc(100vw-3rem))]">
      <EdgeGlowFrame phase={phase} innerClassName="p-2">
        <div className="relative max-h-[70vh] overflow-hidden rounded-[23px] bg-black/40">
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
            <div className="w-full min-h-[26rem] flex items-center justify-center">
              <p className="text-[10px] text-white/24 tracking-[0.28em] uppercase" style={{ fontFamily: 'var(--font-sans)' }}>
                Generating preview
              </p>
            </div>
          )}
        </div>
      </EdgeGlowFrame>
      <p
        className="text-[10px] text-white/30 tracking-widest uppercase"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        Step {value} / {max}
      </p>
    </div>
  );
}