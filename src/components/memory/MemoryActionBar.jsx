import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shuffle, Blend } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeSwitcher } from '@/components/ui/apple-liquid-glass-switcher';



export default function MemoryActionBar({ onToggleGalaxy }) {
  const [theme, setTheme] = useState(() => {
    if (document.documentElement.classList.contains('dark')) return 'dark';
    return 'light';
  });
  const barRef = useRef(null);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };



  return (
    <div ref={barRef} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
      {/* Pill-shaped action bar */}
      <div 
        className="flex items-center gap-4 px-6 py-3 rounded-full shadow-2xl border border-white/10 backdrop-blur-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(30,30,35,0.25) 0%, rgba(60,30,50,0.15) 100%)',
        }}
      >
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('randomize-memory'))}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-200 group"
          title="Randomize"
        >
          <Shuffle className="w-4 h-4 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
          <span className="text-xs font-light tracking-wide opacity-0 group-hover:opacity-100 transition-opacity w-0 group-hover:w-16">Randomize</span>
        </button>
        <button
          onClick={() => onToggleGalaxy?.()}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-200 group"
          title="Galaxy View"
        >
          <Blend className="w-4 h-4 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
          <span className="text-xs font-light tracking-wide opacity-0 group-hover:opacity-100 transition-opacity w-0 group-hover:w-16">Galaxy</span>
        </button>
        <div className="w-px h-5 bg-white/10" />
        <button
          onClick={toggleDark}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-200 group"
          title={dark ? 'Day mode' : 'Night mode'}
        >
          {dark
            ? <Sun className="w-4 h-4 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
            : <Moon className="w-4 h-4 group-hover:scale-110 transition-transform" strokeWidth={1.5} />}
          <span className="text-xs font-light tracking-wide opacity-0 group-hover:opacity-100 transition-opacity w-0 group-hover:w-12">{dark ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </div>
  );
}