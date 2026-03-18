import React from 'react';

export default function StudioHeader({ gpuName, costPerHour, onStop }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 pointer-events-none">
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="w-2 h-2 rounded-full bg-emerald-400/80 animate-pulse" />
        <span className="text-white/30 text-[10px] tracking-widest uppercase" style={{ fontFamily: 'var(--font-sans)' }}>
          {gpuName} · ${costPerHour?.toFixed(2)}/hr
        </span>
      </div>
      <button
        onClick={onStop}
        className="pointer-events-auto text-white/20 text-[10px] tracking-widest uppercase hover:text-red-400/60 transition-colors"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        Stop Studio
      </button>
    </div>
  );
}