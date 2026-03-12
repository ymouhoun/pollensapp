import React, { useState, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import EntropyCard from '@/components/entropy/EntropyCard';
import EntropyActions from '@/components/entropy/EntropyActions';
import FloatingImage from '@/components/entropy/FloatingImage';

const CATEGORIES = ['everything', 'spaces', 'serendipity'];

export default function Entropy() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(null);
  const [activeCategory, setActiveCategory] = useState('everything');
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 200),
  });

  const shuffled = useMemo(() => {
    const filtered = items.filter(i => !i.is_forgotten);
    const arr = [...filtered];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [items]);

  const currentItem = shuffled[currentIndex % Math.max(shuffled.length, 1)];

  const floatingItems = useMemo(() => {
    const others = shuffled.filter((_, i) => i !== currentIndex % Math.max(shuffled.length, 1));
    const positions = [
      { top: '4%',    left: '2%',    imgWidth: 130, imgHeight: 95  },
      { top: '6%',    left: '22%',   imgWidth: 95,  imgHeight: 70  },
      { top: '2%',    right: '30%',  imgWidth: 105, imgHeight: 78  },
      { top: '12%',   right: '2%',   imgWidth: 125, imgHeight: 92  },
      { top: '40%',   left: '0.5%',  imgWidth: 115, imgHeight: 155 },
      { top: '52%',   right: '1%',   imgWidth: 110, imgHeight: 82  },
      { bottom: '18%',left: '4%',    imgWidth: 128, imgHeight: 96  },
      { bottom: '4%', left: '22%',   imgWidth: 95,  imgHeight: 125 },
      { bottom: '6%', right: '18%',  imgWidth: 105, imgHeight: 76  },
      { bottom: '2%', right: '4%',   imgWidth: 88,  imgHeight: 66  },
    ];
    return positions.map((pos, i) => ({
      item: others[i % Math.max(others.length, 1)],
      style: pos,
    })).filter(p => p.item);
  }, [shuffled, currentIndex]);

  const handleForget = useCallback(async () => {
    if (!currentItem) return;
    setDirection('left');
    await base44.entities.MediaItem.update(currentItem.id, { is_forgotten: true });
    setCurrentIndex(prev => prev + 1);
    queryClient.invalidateQueries({ queryKey: ['media-items'] });
  }, [currentItem, queryClient]);

  const handleKeep = useCallback(async () => {
    if (!currentItem) return;
    setDirection('right');
    await base44.entities.MediaItem.update(currentItem.id, { is_kept: true });
    setCurrentIndex(prev => prev + 1);
  }, [currentItem]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (shuffled.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-macos-sm text-muted-foreground">No memories to explore</p>
        <p className="text-macos-xs text-muted-foreground/50 mt-1">Add images in Memory first</p>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[calc(100vh-88px)] overflow-hidden">
      {/* Floating background images */}
      {floatingItems.map((fi, i) => (
        <FloatingImage key={`${fi.item.id}-${i}`} item={fi.item} style={fi.style} />
      ))}

      {/* Radial gradient to focus center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 70% at center, hsl(var(--background)/0.82) 30%, transparent 80%)',
        }}
      />

      {/* Category pill bar — top right, like in mockup */}
      <div className="absolute top-4 right-5 flex items-center gap-1 z-20">
        <div className="flex items-center bg-background/60 backdrop-blur-md rounded-full px-1.5 py-1 gap-0.5 shadow-macos-sm border border-white/20">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] transition-all duration-150 ${
                activeCategory === cat
                  ? 'bg-foreground/90 text-background font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main centered content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center gap-0">
        <EntropyCard item={currentItem} direction={direction} />
        <EntropyActions onForget={handleForget} onKeep={handleKeep} />
      </div>

      {/* Counter — bottom right */}
      <div className="absolute bottom-5 right-5 z-20">
        <span className="text-[10px] text-muted-foreground/40 font-light tabular-nums">
          {(currentIndex % shuffled.length) + 1} / {shuffled.length}
        </span>
      </div>
    </div>
  );
}