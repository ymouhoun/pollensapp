import React, { useState, useRef, useEffect } from 'react';
import { Shuffle, Moon, Sun, Blend, MousePointerClick, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GlassButton } from '@/components/ui/apple-tahoe-liquid-glass-button';
import { motion, AnimatePresence } from 'framer-motion';

const MENU_ITEMS = [
  { key: 'randomize', icon: Shuffle, label: 'Randomize' },
  { key: 'galaxy', icon: Blend, label: 'Galaxy' },
  { key: 'entropy', icon: MousePointerClick, label: 'Entropy' },
  { key: 'theme', icon: null, label: null }, // dynamic
];

export default function MemoryActionBar({ onToggleGalaxy }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  const handleAction = (key) => {
    setOpen(false);
    switch (key) {
      case 'randomize':
        window.dispatchEvent(new CustomEvent('randomize-memory'));
        break;
      case 'galaxy':
        onToggleGalaxy?.();
        break;
      case 'entropy':
        navigate('/Entropy');
        break;
      case 'theme':
        toggleDark();
        break;
    }
  };

  const items = [
    { key: 'randomize', icon: Shuffle, label: 'Randomize' },
    { key: 'galaxy', icon: Blend, label: 'Galaxy' },
    { key: 'entropy', icon: MousePointerClick, label: 'Entropy' },
    { key: 'theme', icon: dark ? Sun : Moon, label: dark ? 'Day' : 'Night' },
  ];

  return (
    <div ref={containerRef} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="mb-3 flex items-center gap-2"
          >
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ delay: i * 0.04, type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <GlassButton
                    size="icon"
                    onClick={() => handleAction(item.key)}
                    title={item.label}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                  </GlassButton>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <GlassButton
        size="icon"
        onClick={() => setOpen(v => !v)}
        title="Menu"
      >
        <Sparkles
          className="w-4 h-4 transition-transform duration-300"
          strokeWidth={1.5}
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
      </GlassButton>
    </div>
  );
}