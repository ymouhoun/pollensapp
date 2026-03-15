import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SameVibeModal({ item, onClose, onSelectItem }) {
  const [vibeItems, setVibeItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!item) return;
    const fetch = async () => {
      setLoading(true);
      const all = await base44.entities.MediaItem.list('-created_date', 200);
      const matches = all.filter(i => {
        if (i.id === item.id || i.is_forgotten) return false;
        const paletteMatch = item.color_palette && i.color_palette === item.color_palette;
        const tagMatch = item.tags?.length > 0 && i.tags?.some(t => item.tags.includes(t));
        return paletteMatch || tagMatch;
      });
      // Sort: both palette + tag match first
      matches.sort((a, b) => {
        const scoreA = (a.color_palette === item.color_palette ? 1 : 0) + (a.tags?.some(t => item.tags?.includes(t)) ? 1 : 0);
        const scoreB = (b.color_palette === item.color_palette ? 1 : 0) + (b.tags?.some(t => item.tags?.includes(t)) ? 1 : 0);
        return scoreB - scoreA;
      });
      setVibeItems(matches.slice(0, 20));
      setLoading(false);
    };
    fetch();
  }, [item]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-[300] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            className="relative w-full max-h-[70vh] rounded-t-2xl overflow-hidden"
            style={{
              background: 'rgba(15, 15, 20, 0.92)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-[0.2em] uppercase text-white/40" style={{ fontFamily: 'Dhampir, serif' }}>Same Vibe</span>
                {!loading && (
                  <span className="text-[9px] tracking-widest text-white/20">{vibeItems.length} items</span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-x-auto overflow-y-hidden pb-6 px-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-4 h-4 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
                </div>
              ) : vibeItems.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-[11px] tracking-widest uppercase text-white/20">No matching vibes found</p>
                </div>
              ) : (
                <div className="flex gap-2" style={{ width: 'max-content' }}>
                  {vibeItems.map((vItem, idx) => (
                    <motion.div
                      key={vItem.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="flex-shrink-0 cursor-pointer"
                      style={{ width: 160 }}
                      onClick={() => { onSelectItem(vItem); onClose(); }}
                    >
                      {vItem.content_type === 'image' || vItem.content_type === 'video' ? (
                        <div className="relative overflow-hidden rounded-lg bg-white/5" style={{ height: 200 }}>
                          {vItem.content_type === 'video' ? (
                            <video
                              src={vItem.file_url}
                              className="w-full h-full object-cover"
                              muted loop playsInline preload="metadata"
                              onMouseEnter={e => e.target.play()}
                              onMouseLeave={e => e.target.pause()}
                            />
                          ) : (
                            <img
                              src={vItem.file_url}
                              alt={vItem.title || ''}
                              className="w-full h-full object-cover"
                            />
                          )}
                          {vItem.title && (
                            <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/60 to-transparent">
                              <p className="text-[10px] text-white/80 font-light truncate">{vItem.title}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-lg bg-white/5 border border-white/10 p-3 h-[200px] overflow-hidden">
                          <p className="text-[11px] text-white/60 font-light leading-relaxed line-clamp-6">{vItem.text_content}</p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}