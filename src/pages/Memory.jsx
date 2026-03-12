import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MediaCard from '@/components/memory/MediaCard';
import UploadModal from '@/components/memory/UploadModal';

const FILTERS = ['All', 'Images', 'Videos', 'Kept'];

export default function Memory() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [showUpload, setShowUpload] = useState(false);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 200),
  });

  const filtered = items.filter(item => {
    if (activeFilter === 'Images' && item.media_type !== 'image') return false;
    if (activeFilter === 'Videos' && item.media_type !== 'video') return false;
    if (activeFilter === 'Kept' && !item.is_kept) return false;
    if (search) {
      const s = search.toLowerCase();
      return (item.title?.toLowerCase().includes(s)) ||
             (item.tags?.some(t => t.toLowerCase().includes(s))) ||
             (item.collection?.toLowerCase().includes(s));
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* macOS toolbar */}
      <div className="flex items-center gap-3 px-4 h-10 border-b border-black/[0.06] vibrancy flex-shrink-0">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/60" strokeWidth={2} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full pl-7 pr-3 py-1 bg-black/[0.06] rounded-macos text-macos-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
          />
        </div>

        {/* Segment control — macOS style */}
        <div className="flex items-center bg-black/[0.06] rounded-macos p-0.5 gap-px">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-2.5 py-0.5 rounded-[7px] text-macos-xs transition-all duration-100 ${
                activeFilter === f
                  ? 'bg-white dark:bg-white/20 text-foreground shadow-macos-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground/80'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Add button */}
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-primary text-primary-foreground rounded-macos text-macos-xs font-medium shadow-macos-sm hover:bg-primary/90 active:scale-95 transition-all duration-100"
        >
          <Plus className="w-3 h-3" strokeWidth={2.5} />
          Add
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-48 text-center"
          >
            <p className="text-macos-sm text-muted-foreground">No items</p>
            <p className="text-macos-xs text-muted-foreground/50 mt-1">Add your first image to get started</p>
          </motion.div>
        ) : (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-2">
            {filtered.map((item, i) => (
              <MediaCard key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
      </div>

      <UploadModal
        open={showUpload}
        onOpenChange={setShowUpload}
        onUploaded={() => queryClient.invalidateQueries({ queryKey: ['media-items'] })}
      />
    </div>
  );
}