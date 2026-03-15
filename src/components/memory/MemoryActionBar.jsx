import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

const ALL_TAGS = ['EDITORIAL', 'BEAUTY', 'STILL LIFE', 'SET DESIGN', '35MM', 'SUPER16', 'B&W', 'BAROQUE', 'OBJECTS', 'ORGANIC', '8MM', 'STILLS', 'ANAMORPHIC', 'LIGHT', 'GOTHIC', 'PORTRAITS'];

const TAG_CATEGORIES = {
  colors: { label: 'Colors', icon: Palette },
  moods: { label: 'Moods', icon: Tag },
  objects: { label: 'Objects', icon: Tag },
  style: { label: 'Style', icon: Tag },
};

const DATE_OPTIONS = [
  { label: 'All time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This week', value: 'week' },
  { label: 'This month', value: 'month' },
];

const COLOR_OPTIONS = [
  { label: 'Warm', value: 'warm', bg: '#D4937A' },
  { label: 'Cool', value: 'cool', bg: '#7A9ED4' },
  { label: 'Neutral', value: 'neutral', bg: '#C4C0B8' },
  { label: 'Dark', value: 'dark', bg: '#2A2A2A' },
  { label: 'Light', value: 'light', bg: '#F0EDE8' },
  { label: 'B&W', value: 'monochrome', bg: 'linear-gradient(135deg, #111 50%, #f0f0f0 50%)' },
];

function FilterButton({ icon: Icon, label, active, isOpen, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] tracking-widest uppercase transition-all duration-200",
        isOpen || active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <Icon className="w-3 h-3" strokeWidth={1.5} />
      <span>{label}</span>
    </button>
  );
}

export default function MemoryActionBar({ activeTag, setActiveTag, dateFilter, setDateFilter, colorFilter, setColorFilter, allTags = [] }) {
  const [openPanel, setOpenPanel] = useState(null);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [tagCategory, setTagCategory] = useState(null);
  const barRef = useRef(null);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
  };

  const togglePanel = (panel) => setOpenPanel(prev => prev === panel ? null : panel);

  useEffect(() => {
    const handler = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setOpenPanel(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={barRef} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col-reverse items-center gap-2">
      {/* Main pill bar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 rounded-full bg-background/80 backdrop-blur-xl border border-border/40 shadow-lg">


        <button
          onClick={() => window.dispatchEvent(new CustomEvent('randomize-memory'))}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title="Randomize"
        >
          <Shuffle className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
        <button
          onClick={toggleDark}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title={dark ? 'Day mode' : 'Night mode'}
        >
          {dark
            ? <Sun className="w-3.5 h-3.5" strokeWidth={1.5} />
            : <Moon className="w-3.5 h-3.5" strokeWidth={1.5} />}
        </button>
      </div>


    </div>
  );
}