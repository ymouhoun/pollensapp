import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Grid3X3, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import MediaCard from '@/components/memory/MediaCard';
import UploadModal from '@/components/memory/UploadModal';

const FILTERS = ['everything', 'images', 'videos', 'kept'];

export default function Memory() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('everything');
  const [showUpload, setShowUpload] = useState(false);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 100),
  });

  const filtered = items.filter(item => {
    if (activeFilter === 'images' && item.media_type !== 'image') return false;
    if (activeFilter === 'videos' && item.media_type !== 'video') return false;
    if (activeFilter === 'kept' && !item.is_kept) return false;
    if (search) {
      const s = search.toLowerCase();
      return (item.title?.toLowerCase().includes(s)) || 
             (item.tags?.some(t => t.toLowerCase().includes(s))) ||
             (item.collection?.toLowerCase().includes(s));
    }
    return true;
  });

  return (
    <div className="min-h-screen p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl font-normal tracking-tight">Memory</h1>
        <Button
          onClick={() => setShowUpload(true)}
          variant="outline"
          className="rounded-full border-border/50 font-light text-sm gap-2 hover:bg-foreground hover:text-background transition-all duration-300"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          Add
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search memories..."
            className="pl-10 bg-transparent border-border/40 font-light text-sm"
          />
        </div>
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-light transition-all duration-200 ${
                activeFilter === f
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-muted-foreground/20 border-t-foreground rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-64 text-center"
        >
          <p className="text-muted-foreground font-light text-sm">No memories yet</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Upload your first image to begin</p>
        </motion.div>
      ) : (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3">
          {filtered.map((item, i) => (
            <MediaCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}

      <UploadModal
        open={showUpload}
        onOpenChange={setShowUpload}
        onUploaded={() => queryClient.invalidateQueries({ queryKey: ['media-items'] })}
      />
    </div>
  );
}