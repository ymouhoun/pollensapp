import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Brain, Sparkles, Shuffle, Settings, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/Memory', icon: Brain, label: 'my mind' },
  { path: '/Entropy', icon: Shuffle, label: 'entropy' },
  { path: '/Iterate', icon: Sparkles, label: 'iterate' },
];

export default function AppSidebar() {
  const location = useLocation();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-14 flex flex-col items-center justify-between py-6 z-50">
      <div className="flex flex-col items-center gap-1">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "group relative flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all duration-300",
                isActive 
                  ? "text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[9px] tracking-wider font-light writing-vertical"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                {label}
              </span>
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-foreground rounded-full" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-3">
        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
          <Moon className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </nav>
  );
}