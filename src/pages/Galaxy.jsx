import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Galaxy() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const { data: mediaItems = [] } = useQuery({
    queryKey: ['galaxy-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 500),
  });

  useEffect(() => {
    const filtered = mediaItems.filter(i => !i.is_forgotten && (i.content_type === 'image' || i.content_type === 'video'));
    
    // Distribute items in a galaxy-like pattern
    const galaxyItems = filtered.map((item, idx) => {
      const angle = (idx / filtered.length) * Math.PI * 2;
      const distance = 100 + (idx % 10) * 80;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      const sizeVariation = 0.6 + (Math.sin(idx * 0.7) * 0.4); // Varies from 0.6 to 1.0
      return {
        ...item,
        galaxyX: x,
        galaxyY: y,
        sizeMultiplier: sizeVariation,
      };
    });
    
    setItems(galaxyItems);
    setIsLoading(false);
  }, [mediaItems]);

  const handleMouseDown = (e) => {
    if (e.target.closest('[data-interactive]')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setCamera({
        ...camera,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(4, camera.zoom * zoomFactor));
    setCamera({ ...camera, zoom: newZoom });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [isDragging, dragStart, camera]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-background overflow-hidden select-none"
      onMouseDown={handleMouseDown}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Instructions */}
      <div className="fixed top-6 left-6 z-10 text-[10px] tracking-widest uppercase text-foreground/40 pointer-events-none">
        <div>Drag to move</div>
        <div>Scroll to zoom</div>
      </div>

      {/* Close button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => window.history.back()}
        className="fixed top-6 right-6 z-20 p-2 rounded-full hover:bg-muted/50 transition-colors"
        data-interactive
      >
        <X className="w-5 h-5" strokeWidth={1.5} />
      </motion.button>

      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-muted-foreground/20 border-t-foreground rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          No images found
        </div>
      ) : (
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none' }}
        >
          {/* Render connecting lines */}
          {items.map((item, idx) => {
            if (idx === items.length - 1) return null;
            const next = items[idx + 1];
            const x1 = window.innerWidth / 2 + (item.galaxyX * camera.zoom + camera.x);
            const y1 = window.innerHeight / 2 + (item.galaxyY * camera.zoom + camera.y);
            const x2 = window.innerWidth / 2 + (next.galaxyX * camera.zoom + camera.x);
            const y2 = window.innerHeight / 2 + (next.galaxyY * camera.zoom + camera.y);
            return (
              <line
                key={`line-${idx}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
            );
          })}
        </svg>
      )}

      {/* Items */}
      <div
        style={{
          transform: `translate(calc(50% + ${camera.x}px), calc(50% + ${camera.y}px))`,
          pointerEvents: 'auto',
        }}
        className="absolute left-0 top-0"
      >
        {items.map((item) => (
          <motion.div
            key={item.id}
            className="absolute flex items-center justify-center"
            style={{
              left: item.galaxyX * camera.zoom,
              top: item.galaxyY * camera.zoom,
              width: 120 * camera.zoom * item.sizeMultiplier,
              height: 120 * camera.zoom * item.sizeMultiplier,
              transform: 'translate(-50%, -50%)',
            }}
            whileHover={{ scale: 1.1 }}
            onClick={() => setSelectedItem(item)}
            data-interactive
          >
            <div className="relative w-full h-full overflow-hidden cursor-pointer border border-border/20 hover:border-border/60 transition-colors">
              {item.content_type === 'video' ? (
                <video
                  src={item.file_url}
                  className="w-full h-full object-contain"
                  muted
                  preload="metadata"
                />
              ) : (
                <img
                  src={item.file_url}
                  alt={item.title || ''}
                  className="w-full h-full object-contain"
                />
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs text-center px-2">
                  {item.title || 'Untitled'}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detail view */}
      {selectedItem && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedItem(null)}
          data-interactive
        >
          <motion.div
            className="relative max-w-3xl w-full mx-4"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute -top-10 right-0 p-2 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {selectedItem.content_type === 'video' ? (
              <video
                src={selectedItem.file_url}
                className="w-full"
                controls
                autoPlay
              />
            ) : (
              <img
                src={selectedItem.file_url}
                alt={selectedItem.title || ''}
                className="w-full"
              />
            )}

            {selectedItem.title && (
              <div className="mt-4 text-white text-center">
                <h3 className="text-lg font-display">{selectedItem.title}</h3>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}