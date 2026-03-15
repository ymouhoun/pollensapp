import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Brain, Sparkles, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
{ path: '/Memory', icon: Brain, label: 'my mind' },
{ path: '/Entropy', icon: Shuffle, label: 'entropy' },
{ path: '/Iterate', icon: Sparkles, label: 'iterate' }];


export default function AppSidebar() {
  const location = useLocation();
  return (
    <nav className="fixed left-0 top-0 bottom-0 w-14 flex flex-col items-center justify-between py-6 z-50">
      <div className="flex flex-col items-center gap-1">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return null;




















        })}
      </div>

      <div className="flex flex-col items-center gap-3">
        <a
          href="/Settings"
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" strokeWidth={1.5} />
        </a>
      </div>
    </nav>);

}