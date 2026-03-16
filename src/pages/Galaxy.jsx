import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { HUE_RANGES } from '@/components/galaxy/HueFilter';
import ItemContextMenu from '@/components/memory/ItemContextMenu';

// Spread items over a large virtual canvas
const CANVAS_SPREAD = 4000;
const ITEM_BASE_SIZE = 160;

function buildLayout(items) {
  // Poisson-disk-ish: just use a seeded pseudo-random with enough spread
  return items.map((item, idx) => {
    // deterministic pseudo-random per item id
    const seed = item.id ? item.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) : idx * 137;
    const angle = (seed * 2.399963) % (Math.PI * 2);
    const radius = 200 + ((seed * 137 + idx * 311) % CANVAS_SPREAD);
    const x = Math.cos(angle) * radius + (((seed * 31) % 600) - 300);
    const y = Math.sin(angle) * radius + (((seed * 53) % 600) - 300);
    const size = ITEM_BASE_SIZE * (0.6 + ((seed % 100) / 100) * 0.8);
    return { ...item, cx: x, cy: y, size };
  });
}

export default function Galaxy({ onSelectItem }) {
  const containerRef = useRef(null);
  const stateRef = useRef({
    // Camera state (kept in ref for performance)
    x: 0, y: 0, zoom: 1,
    // Drag
    dragging: false, lastMX: 0, lastMY: 0,
    // Momentum
    vx: 0, vy: 0,
    // Pinch
    pinching: false, lastPinchDist: 0,
    rafId: null,
  });
  const [renderTick, setRenderTick] = useState(0); // force re-render
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedHueRanges] = useState(['All']);
  const [randomizeCount, setRandomizeCount] = useState(0);
  const layoutRef = useRef([]);

  const { data: mediaItems = [] } = useQuery({
    queryKey: ['galaxy-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 500),
  });

  // Build layout whenever items change or randomize
  useEffect(() => {
    let filtered = mediaItems.filter(
      i => !i.is_forgotten && (i.content_type === 'image' || i.content_type === 'video')
    );
    if (!selectedHueRanges.includes('All')) {
      filtered = filtered.filter(item => {
        const tint = item.tint ?? 0;
        return selectedHueRanges.some(rangeName => {
          const range = HUE_RANGES.find(r => r.name === rangeName);
          if (!range) return false;
          if (range.name === 'Red') return tint >= range.min || tint <= 30;
          return tint >= range.min && tint < range.max;
        });
      });
    }
    layoutRef.current = buildLayout(filtered);
    setRenderTick(t => t + 1);
  }, [mediaItems, selectedHueRanges, randomizeCount]);

  // Animate loop for momentum
  useEffect(() => {
    const s = stateRef.current;
    function tick() {
      if (!s.dragging && (Math.abs(s.vx) > 0.1 || Math.abs(s.vy) > 0.1)) {
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.93;
        s.vy *= 0.93;
        setRenderTick(t => t + 1);
      }
      s.rafId = requestAnimationFrame(tick);
    }
    s.rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(s.rafId);
  }, []);

  // Randomize listener
  useEffect(() => {
    const handler = () => setRandomizeCount(c => c + 1);
    window.addEventListener('randomize-memory', handler);
    return () => window.removeEventListener('randomize-memory', handler);
  }, []);

  // ─── Mouse events ───
  const onMouseDown = useCallback((e) => {
    if (e.target.closest('[data-interactive]')) return;
    const s = stateRef.current;
    s.dragging = true;
    s.lastMX = e.clientX;
    s.lastMY = e.clientY;
    s.vx = 0;
    s.vy = 0;
  }, []);

  const onMouseMove = useCallback((e) => {
    const s = stateRef.current;
    if (!s.dragging) return;
    const dx = e.clientX - s.lastMX;
    const dy = e.clientY - s.lastMY;
    s.x += dx;
    s.y += dy;
    s.vx = dx;
    s.vy = dy;
    s.lastMX = e.clientX;
    s.lastMY = e.clientY;
    setRenderTick(t => t + 1);
  }, []);

  const onMouseUp = useCallback(() => {
    stateRef.current.dragging = false;
  }, []);

  // ─── Wheel zoom toward cursor ───
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const s = stateRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.08 : 0.93;
    const newZoom = Math.max(0.15, Math.min(5, s.zoom * factor));
    // Zoom toward cursor: adjust offset so world point under cursor stays fixed
    s.x = cx - (cx - s.x) * (newZoom / s.zoom);
    s.y = cy - (cy - s.y) * (newZoom / s.zoom);
    s.zoom = newZoom;
    setRenderTick(t => t + 1);
  }, []);

  // ─── Touch events ───
  const onTouchStart = useCallback((e) => {
    if (e.target.closest('[data-interactive]')) return;
    const s = stateRef.current;
    if (e.touches.length === 1) {
      s.dragging = true;
      s.lastMX = e.touches[0].clientX;
      s.lastMY = e.touches[0].clientY;
      s.vx = 0; s.vy = 0;
    } else if (e.touches.length === 2) {
      s.dragging = false;
      s.pinching = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      s.lastPinchDist = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const onTouchMove = useCallback((e) => {
    e.preventDefault();
    const s = stateRef.current;
    if (s.dragging && e.touches.length === 1) {
      const dx = e.touches[0].clientX - s.lastMX;
      const dy = e.touches[0].clientY - s.lastMY;
      s.x += dx; s.y += dy;
      s.vx = dx; s.vy = dy;
      s.lastMX = e.touches[0].clientX;
      s.lastMY = e.touches[0].clientY;
      setRenderTick(t => t + 1);
    } else if (s.pinching && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const factor = dist / s.lastPinchDist;
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const cx = mx - rect.left, cy = my - rect.top;
        const newZoom = Math.max(0.15, Math.min(5, s.zoom * factor));
        s.x = cx - (cx - s.x) * (newZoom / s.zoom);
        s.y = cy - (cy - s.y) * (newZoom / s.zoom);
        s.zoom = newZoom;
      }
      s.lastPinchDist = dist;
      setRenderTick(t => t + 1);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    const s = stateRef.current;
    s.dragging = false;
    s.pinching = false;
  }, []);

  // Attach wheel + touch with non-passive option
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, [onWheel, onTouchMove]);

  const s = stateRef.current;
  const items = layoutRef.current;

  // Viewport culling: only render items in view + margin
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const margin = 300;
  const visible = items.filter(item => {
    const sx = item.cx * s.zoom + s.x + vw / 2;
    const sy = item.cy * s.zoom + s.y + vh / 2;
    const half = (item.size * s.zoom) / 2;
    return sx + half > -margin && sx - half < vw + margin &&
           sy + half > -margin && sy - half < vh + margin;
  });

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-background overflow-hidden select-none"
      style={{ cursor: s.dragging ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Close button */}
      <button
        data-interactive
        onClick={() => window.history.back()}
        className="fixed top-6 right-6 z-30 p-2 rounded-full bg-background/60 backdrop-blur-sm hover:bg-muted/70 transition-colors border border-border/30"
      >
        <X className="w-4 h-4" strokeWidth={1.5} />
      </button>

      {/* Hint */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-10 text-[10px] tracking-widest uppercase text-foreground/30 pointer-events-none">
        drag · scroll to zoom
      </div>

      {/* Zoom indicator */}
      <div className="fixed bottom-24 right-6 z-10 text-[10px] tracking-widest text-foreground/30 pointer-events-none">
        {Math.round(s.zoom * 100)}%
      </div>

      {/* Canvas world */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          transform: `translate(calc(50vw + ${s.x}px), calc(50vh + ${s.y}px))`,
          willChange: 'transform',
        }}
      >
        {visible.map((item) => {
          const w = item.size * s.zoom;
          const h = item.size * s.zoom;
          return (
            <div
              key={item.id}
              data-interactive
              style={{
                position: 'absolute',
                left: item.cx * s.zoom,
                top: item.cy * s.zoom,
                width: w,
                height: h,
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
                transition: 'opacity 0.3s',
              }}
              onClick={() => onSelectItem?.(item)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ item, x: e.clientX, y: e.clientY });
              }}
            >
              <div
                className="w-full h-full overflow-hidden"
                style={{
                  borderRadius: 4,
                  border: '1px solid rgba(128,128,128,0.15)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.04)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.18)';
                  e.currentTarget.style.zIndex = '10';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.zIndex = '';
                }}
              >
                {item.content_type === 'video' ? (
                  <video
                    src={item.file_url}
                    className="w-full h-full object-cover"
                    style={{ mixBlendMode: 'multiply', display: 'block' }}
                    muted
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={item.file_url}
                    alt={item.title || ''}
                    className="w-full h-full object-cover"
                    style={{ mixBlendMode: 'multiply', display: 'block' }}
                    loading="lazy"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {contextMenu && (
        <ItemContextMenu
          item={contextMenu.item}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}