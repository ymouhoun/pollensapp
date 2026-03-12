import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Brain, Shuffle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/Memory',  icon: Brain,    label: 'Memory'  },
  { path: '/Entropy', icon: Shuffle,  label: 'Entropy' },
  { path: '/Iterate', icon: Sparkles, label: 'Iterate' },
];

export default function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="w-[200px] flex-shrink-0 border-r border-black/[0.06] vibrancy-sidebar flex flex-col py-2">
      {navItems.map(({ path, icon: Icon, label }) => {
        const isActive = location.pathname === path;
        return (
          <Link
            key={path}
            to={path}
            className={cn(
              "flex items-center gap-2.5 mx-2 px-3 py-1.5 rounded-macos text-macos-sm transition-all duration-150 select-none",
              isActive
                ? "bg-primary text-primary-foreground shadow-macos-sm font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
            <span>{label}</span>
          </Link>
        );
      })}
    </aside>
  );
}