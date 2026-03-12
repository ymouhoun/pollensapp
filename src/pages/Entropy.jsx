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

  // Shuffle items deterministically based on a seed
  const shuffled = useMemo(() => {
    const filtered = items.filter(i => !i.is_forgotten);
    const arr = [...filtered];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [items]);

  const currentItem = shuffled[currentIndex % shuffled.length];

  // Floating background images (exclude current)
  const floatingItems = useMemo(() => {
    const others = shuffled.filter((_, i) => i !== currentIndex % shuffled.length);
    const positions = [
      { top: '5%', left: '2%', imgWidth: 140, imgHeight: 100 },
      { top: '8%', left: '25%', imgWidth: 100, imgHeight: 75 },
      { top: '3%', right: '35%', imgWidth: 110, imgHeight: 80 },
      { top: '15%', right: '3%', imgWidth: 130, imgHeight: 95 },
      { top: '45%', left: '1%', imgWidth: 120, imgHeight: 160 },
      { top: '55%', right: '2%', imgWidth: 115, imgHeight: 85 },
      { bottom: '20%', left: '5%', imgWidth: 135, imgHeight: 100 },
      { bottom: '5%', left: '25%', imgWidth: 100, imgHeight: 130 },
      { bottom: '8%', right: '20%', imgWidth: 110, imgHeight: 80 },
      { bottom: '3%', right: '5%', imgWidth: 90, imgHeight: 70 },
    ];
    return positions.map((pos, i) => ({
      item: others[i % others.length],
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-muted-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (shuffled.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-muted-foreground font-light">No memories to explore</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Add images in the Memory tab first</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Floating background images */}
      {floatingItems.map((fi, i) => (
        <FloatingImage key={`${fi.item.id}-${i}`} item={fi.item} style={fi.style} />
      ))}

      {/* Soft gradient overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-background/70 via-background/50 to-transparent pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, hsl(var(--background) / 0.75) 30%, transparent 70%)' }}
      />

      {/* Category filters - top right */}
      <div className="absolute top-6 right-6 flex gap-4 z-10">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-xs font-light tracking-wider transition-all duration-200 ${
              activeCategory === cat
                ? 'text-foreground'
                : 'text-muted-foreground/50 hover:text-muted-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main content - centered */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center">
        <EntropyCard item={currentItem} direction={direction} />
        <EntropyActions onForget={handleForget} onKeep={handleKeep} />
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-6 right-6 flex items-center gap-3 z-10">
        <span className="text-[10px] text-muted-foreground/40 font-light tracking-wider">
          {currentIndex + 1} / {shuffled.length}
        </span>
      </div>
    </div>
  );
}