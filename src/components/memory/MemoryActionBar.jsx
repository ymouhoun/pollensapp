import React, { useState } from 'react';
import { Shuffle, Moon, Sun, Blend, MousePointerClick } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GlassMenuBar } from '@/components/ui/glass-menu-bar';

export default function MemoryActionBar({ onToggleGalaxy }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const navigate = useNavigate();

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
      <GlassMenuBar>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('randomize-memory'))}
          title="Randomize"
        >
          <Shuffle className="w-4 h-4" strokeWidth={1.5} />
        </button>

        <button
          onClick={() => onToggleGalaxy?.()}
          title="Galaxy View"
        >
          <Blend className="w-4 h-4" strokeWidth={1.5} />
        </button>

        <button
          title="Entropy Studio"
          onClick={() => navigate('/Entropy')}
        >
          <MousePointerClick className="w-4 h-4" strokeWidth={1.5} />
        </button>

        <button
          onClick={toggleDark}
          title={dark ? 'Day mode' : 'Night mode'}
        >
          {dark
            ? <Sun className="w-4 h-4" strokeWidth={1.5} />
            : <Moon className="w-4 h-4" strokeWidth={1.5} />
          }
        </button>
      </GlassMenuBar>
    </div>
  );
}