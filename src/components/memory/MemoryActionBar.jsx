import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Calendar, Palette, Shuffle, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

const ALL_TAGS = ['EDITORIAL', 'BEAUTY', 'STILL LIFE', 'SET DESIGN', '35MM', 'SUPER16', 'B&W', 'BAROQUE', 'OBJECTS', 'ORGANIC', '8MM', 'STILLS', 'ANAMORPHIC', 'LIGHT', 'GOTHIC', 'PORTRAITS'];

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

export default function MemoryActionBar({ activeTag, setActiveTag, dateFilter, setDateFilter, colorFilter, setColorFilter }) {
  const [openPanel, setOpenPanel] = useState(null);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
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
    <div ref={barRef} className="fixed top-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
      {/* Main pill bar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 rounded-full bg-background/80 backdrop-blur-xl border border-border/40 shadow-lg">
        <FilterButton icon={Tag} label="Tags" active={!!activeTag} isOpen={openPanel === 'tags'} onClick={() => togglePanel('tags')} />
        <FilterButton icon={Calendar} label="Date" active={dateFilter !== 'all'} isOpen={openPanel === 'date'} onClick={() => togglePanel('date')} />
        <FilterButton icon={Palette} label="Color" active={!!colorFilter} isOpen={openPanel === 'color'} onClick={() => togglePanel('color')} />

        <div className="w-px h-4 bg-border/60 mx-1" />

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

      {/* Panels */}
      <AnimatePresence>
        {openPanel === 'tags' && (
          <motion.div
            key="tags"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="bg-background/90 backdrop-blur-xl border border-border/40 rounded-2xl shadow-xl p-3 max-w-xs"
          >
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveTag(null)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[9px] tracking-widest uppercase transition-colors",
                  !activeTag ? "bg-foreground text-background" : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                All
              </button>
              {ALL_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[9px] tracking-widest uppercase transition-colors",
                    activeTag === tag ? "bg-foreground text-background" : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {openPanel === 'date' && (
          <motion.div
            key="date"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="bg-background/90 backdrop-blur-xl border border-border/40 rounded-2xl shadow-xl p-2 min-w-[140px]"
          >
            <div className="flex flex-col gap-0.5">
              {DATE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setDateFilter(opt.value); setOpenPanel(null); }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[11px] tracking-widest uppercase text-left transition-colors",
                    dateFilter === opt.value ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {openPanel === 'color' && (
          <motion.div
            key="color"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="bg-background/90 backdrop-blur-xl border border-border/40 rounded-2xl shadow-xl p-3"
          >
            <div className="flex items-center gap-2">
              {/* All / clear */}
              <button
                onClick={() => { setColorFilter(null); setOpenPanel(null); }}
                className={cn(
                  "w-7 h-7 rounded-full border-2 flex items-center justify-center text-[8px] tracking-wider text-muted-foreground bg-muted transition-colors",
                  !colorFilter ? "border-foreground" : "border-transparent hover:border-muted-foreground/40"
                )}
              >
                ALL
              </button>
              {COLOR_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setColorFilter(colorFilter === opt.value ? null : opt.value); setOpenPanel(null); }}
                  title={opt.label}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all",
                    colorFilter === opt.value ? "border-foreground scale-110" : "border-transparent hover:border-muted-foreground/40"
                  )}
                  style={{ background: opt.bg }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}