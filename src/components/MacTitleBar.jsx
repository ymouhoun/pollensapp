import React from 'react';
import { useLocation } from 'react-router-dom';

const TITLES = {
  '/Memory': 'Memory',
  '/Entropy': 'Entropy',
  '/Iterate': 'Iterate',
};

export default function MacTitleBar() {
  const location = useLocation();
  const title = TITLES[location.pathname] || 'Entropy';

  return (
    <div
      className="flex items-center h-11 px-4 border-b border-black/[0.06] vibrancy flex-shrink-0 relative"
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Traffic lights */}
      <div className="flex items-center gap-2 z-10" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="traffic-light bg-macos-red shadow-inner" style={{ boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.15)' }} />
        <div className="traffic-light bg-macos-yellow shadow-inner" style={{ boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.12)' }} />
        <div className="traffic-light bg-macos-green shadow-inner" style={{ boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.12)' }} />
      </div>

      {/* Centered title */}
      <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none">
        <span className="text-macos-sm font-medium text-foreground/70 tracking-tight">{title}</span>
      </div>
    </div>
  );
}