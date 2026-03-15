import React, { useState, useRef, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import ItemContextMenu from './ItemContextMenu';

export default function MediaCard({ item, index, onClick, onSameVibe }) {
  const [loaded, setLoaded] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(false);
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const isVideo = item.content_type === 'video';

  // Intersection observer: load & show when in viewport, pause video when out
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          setVisible(true);
          if (videoRef.current) videoRef.current.play().catch(() => {});
        } else {
          setVisible(false);
          if (videoRef.current) videoRef.current.pause();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleContextMenu = (e) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 240);
    const y = Math.min(e.clientY, window.innerHeight - 320);
    setContextMenu({ x, y });
  };

  // Cap animation delay so it never gets ridiculous
  const delay = Math.min(index * 0.04, 0.6);

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          "group relative cursor-pointer break-inside-avoid transition-all duration-500",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
        style={{ transitionDelay: visible ? `${delay}s` : '0s' }}
        onClick={() => onClick?.(item)}
        onContextMenu={handleContextMenu}
      >
        <div className="relative overflow-hidden rounded-sm bg-muted/20">
          {isVideo ? (
            // Only set src once in viewport to avoid loading thousands of videos
            <video
              ref={videoRef}
              src={inView ? item.file_url : undefined}
              className={cn(
                "w-full h-full object-cover transition-all duration-700",
                loaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
              )}
              onLoadedMetadata={() => setLoaded(true)}
              muted
              loop
              playsInline
            />
          ) : (
            // Only set src once in viewport
            <img
              src={inView ? item.file_url : undefined}
              alt={item.title || ''}
              loading="lazy"
              decoding="async"
              className={cn(
                "w-full object-cover transition-all duration-700",
                loaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
              )}
              onLoad={() => setLoaded(true)}
            />
          )}

          {/* Skeleton placeholder while not loaded */}
          {!loaded && inView && (
            <div className="absolute inset-0 bg-muted/30 animate-pulse min-h-[120px]" />
          )}
          {!inView && (
            <div className="min-h-[120px] bg-muted/10" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            {item.title && (
              <p className="text-white text-xs font-light tracking-wide">{item.title}</p>
            )}
            {item.tags?.length > 0 && (
              <div className="flex gap-0.5 mt-1.5 flex-wrap">
                {item.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-[10px] text-white/70 bg-white/15 px-1 py-0.5 rounded-full backdrop-blur-sm">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {item.is_kept && (
            <div className="absolute top-2 right-2">
              <Heart className="w-3 h-3 fill-accent text-accent" />
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <ItemContextMenu
          item={item}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onSameVibe={onSameVibe}
        />
      )}
    </>
  );
}