import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import ItemContextMenu from './ItemContextMenu';

export default function MediaCard({ item, index, onClick }) {
  const [loaded, setLoaded] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const videoRef = React.useRef(null);
  const isVideo = item.content_type === 'video';



  const handleContextMenu = (e) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 240);
    const y = Math.min(e.clientY, window.innerHeight - 320);
    setContextMenu({ x, y });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.04 }}
        className="group relative cursor-pointer break-inside-avoid"
        onClick={() => onClick?.(item)}
        onContextMenu={handleContextMenu}
      >
        <div className="relative overflow-hidden rounded-sm bg-muted/20">
          {isVideo ? (
            <video
              ref={videoRef}
              src={item.file_url}
              className={cn(
                "w-full h-full object-cover transition-all duration-700",
                loaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
              )}
              onLoadedMetadata={() => setLoaded(true)}
              muted
              loop
            />
          ) : (
            <img
              src={item.file_url}
              alt={item.title || ''}
              className={cn(
                "w-full object-cover transition-all duration-700",
                loaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
              )}
              onLoad={() => setLoaded(true)}
            />
          )}

          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full glass flex items-center justify-center">
                <Play className="w-4 h-4 fill-foreground text-foreground ml-0.5" />
              </div>
            </div>
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
      </motion.div>

      {contextMenu && (
        <ItemContextMenu
          item={item}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}