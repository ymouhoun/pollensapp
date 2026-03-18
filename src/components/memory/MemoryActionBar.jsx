import React, { useState, useRef } from 'react';
import { Shuffle, Moon, Sun, Blend, MousePointerClick } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MemoryActionBar({ onToggleGalaxy }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const barRef = useRef(null);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <div ref={barRef} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
      {/* Hidden liquid glass SVG filter */}
      <svg style={{ display: 'none', position: 'absolute' }}>
        <defs>
          <filter id="liquid-glass-bar" primitiveUnits="objectBoundingBox" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.02" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -7" result="glass" />
            <feBlend in="SourceGraphic" in2="glass" mode="normal" />
          </filter>
        </defs>
      </svg>

      {/* Pill-shaped action bar with liquid glass effect */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-full shadow-2xl border border-white/20 backdrop-blur-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(200,180,220,0.08) 50%, rgba(180,160,210,0.12) 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('randomize-memory'))}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-300 group"
          title="Randomize"
          style={{ animation: 'none' }}
        >
          <Shuffle
            className="w-4 h-4 transition-all duration-300 group-hover:scale-110"
            style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' }}
            strokeWidth={1.5}
          />
        </button>

        <button
          onClick={() => onToggleGalaxy?.()}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-300 group"
          title="Galaxy View"
        >
          <Blend
            className="w-4 h-4 transition-all duration-300 group-hover:scale-110"
            style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' }}
            strokeWidth={1.5}
          />
        </button>

        <Link
          to="/Entropy"
          className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-300 group"
          title="Entropy Studio"
        >
          <MousePointerClick
            className="w-4 h-4 transition-all duration-300 group-hover:scale-110"
            style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' }}
            strokeWidth={1.5}
          />
        </Link>

        <button
          onClick={toggleDark}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-300 group"
          title={dark ? 'Day mode' : 'Night mode'}
        >
          {dark
            ? <Sun className="w-4 h-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-45" style={{ filter: 'drop-shadow(0 0 4px rgba(255,220,100,0.4))' }} strokeWidth={1.5} />
            : <Moon className="w-4 h-4 transition-all duration-300 group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 4px rgba(180,180,255,0.4))' }} strokeWidth={1.5} />
          }
        </button>
      </div>
    </div>
  );
}