import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function AppLayout() {
  const { data: fonts = [] } = useQuery({
    queryKey: ['custom-fonts'],
    queryFn: () => base44.entities.CustomFont.list('-created_date'),
  });

  useEffect(() => {
    if (!fonts.length) return;
    const fontFaceStyle = fonts.map(f =>
      `@font-face { font-family: '${f.name}'; src: url('${f.file_url}') format('${f.format || 'woff2'}'); }`
    ).join('\n');
    let el = document.getElementById('custom-fonts-style');
    if (!el) {
      el = document.createElement('style');
      el.id = 'custom-fonts-style';
      document.head.appendChild(el);
    }
    el.textContent = fontFaceStyle;

    // Apply first font as body font if GerstnerProgrammRegular is present
    const gerstner = fonts.find(f => f.name.toLowerCase().includes('gerstner'));
    if (gerstner) {
      document.documentElement.style.setProperty('--font-sans', `'${gerstner.name}', sans-serif`);
    }
  }, [fonts]);

  return (
    <div className="min-h-screen bg-background">
      <main className="min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}