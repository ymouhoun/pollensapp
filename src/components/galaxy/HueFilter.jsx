import React from 'react';
import { motion } from 'framer-motion';

const HUE_RANGES = [
  { name: 'Red', min: 0, max: 30, color: '#ff6b6b' },
  { name: 'Orange', min: 30, max: 60, color: '#ffa94d' },
  { name: 'Yellow', min: 60, max: 90, color: '#ffd43b' },
  { name: 'Green', min: 90, max: 150, color: '#69db7c' },
  { name: 'Cyan', min: 150, max: 210, color: '#4ecdc4' },
  { name: 'Blue', min: 210, max: 270, color: '#5b7cfa' },
  { name: 'Magenta', min: 270, max: 330, color: '#ff6ec7' },
  { name: 'All', min: 0, max: 360, color: 'transparent' }
];

export default function HueFilter({ selectedRanges, onToggleRange }) {
  return (
    <div className="fixed top-6 right-6 z-20 flex flex-wrap gap-2 max-w-xs">
      {HUE_RANGES.map((range) => {
        const isSelected = selectedRanges.includes(range.name);
        return (
          <motion.button
            key={range.name}
            onClick={() => onToggleRange(range.name)}
            className={`px-3 py-1.5 text-[10px] tracking-widest uppercase rounded-full transition-all ${
              isSelected
                ? 'text-white'
                : 'bg-border/20 text-foreground/60 hover:text-foreground'
            }`}
            style={isSelected && range.name !== 'All' ? {
              backgroundColor: range.color,
              boxShadow: `0 0 12px ${range.color}80`
            } : {}}
          >
            {range.name}
          </motion.button>
        );
      })}
    </div>
  );
}

export { HUE_RANGES };