import React from 'react';
import { Moon, Sun } from 'lucide-react';

export default function EntropyThemeToggle({ isDark, onToggle }) {
  const Icon = isDark ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Use light mode' : 'Use dark mode'}
      title={isDark ? 'Use light mode' : 'Use dark mode'}
      className="flex h-6 w-6 items-center justify-center rounded-full border border-entropy-border bg-entropy-panel text-entropy-muted transition-colors hover:text-entropy-foreground"
    >
      <Icon className="h-3 w-3" strokeWidth={1.5} />
    </button>
  );
}