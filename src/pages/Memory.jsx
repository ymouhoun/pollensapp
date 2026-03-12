import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import MediaCard from '@/components/memory/MediaCard';
import TextCard from '@/components/memory/TextCard';
import AddNoteCard from '@/components/memory/AddNoteCard';
import UploadModal from '@/components/memory/UploadModal';

const FILTERS = ['everything', 'spaces', 'serendipity'];

const ALL_TAGS = ['ia', 'design', 'photography', 'eros', '3d', 'peinture', 'littérature', 'art direction', 'films'];

export default function Memory() {
  const [activeFilter, setActiveFilter] = useState('everything');
  const [activeTag, setActiveTag] = useState(null);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 200),
  });

  const filtered = useMemo(() => items.filter(item => {
    if (item.is_forgotten) return false;
    if (activeTag && !item.tags?.includes(activeTag)) return false;
    if (search) {
      const s = search.toLowerCase();
      return item.title?.toLowerCase().includes(s) ||
             item.text_content?.toLowerCase().includes(s) ||
             item.tags?.some(t => t.toLowerCase().includes(s));
    }
    return true;
  }), [items, activeTag, search]);

  // Collect all actual tags from items
  const usedTags = useMemo(() => {
    const tags = new Set();
    items.forEach(item => item.tags?.forEach(t => tags.add(t)));
    // Merge with preset tags for display
    return [...ALL_TAGS.filter(t => tags.has(t) || true)];
  }, [items]);

  return (
    <div className="min-h-screen px-6 md:px-8 py-6">
      {/* Top filters */}
      <div className="flex items-center justify-end gap-5 mb-6">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`text-xs tracking-wide transition-colors font-light ${
              activeFilter === f ? 'text-foreground' : 'text-muted-foreground/50 hover:text-muted-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Search heading */}
      <div className="mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="search my mind..."
          className="bg-transparent border-none outline-none font-display italic text-4xl md:text-5xl text-muted-foreground/50 placeholder:text-muted-foreground/30 w-full max-w-xl"
        />
      </div>

      {/* Tag pills */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {usedTags.map(tag => (
          <button
            key={tag}
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-light transition-all duration-200 ${
              activeTag === tag
                ? 'border-foreground bg-foreground text-background'
                : 'border-border/50 text-muted-foreground hover:border-muted-foreground hover:text-foreground'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${activeTag === tag ? 'bg-background' : 'bg-muted-foreground/50'}`} />
            {tag}
          </button>
        ))}
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-dashed border-border/40 text-xs font-light text-muted-foreground/50 hover:text-foreground hover:border-border transition-all duration-200 ml-2"
        >
          <Plus className="w-3 h-3" strokeWidth={1.5} />
          add
        </button>
      </div>

      {/* Masonry grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-foreground rounded-full animate-spin" />
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3">
          {/* Always-visible add note card in first column */}
          <AddNoteCard />

          {filtered.map((item, i) => {
            if (item.content_type === 'text') {
              return <TextCard key={item.id} item={item} index={i} />;
            }
            return <MediaCard key={item.id} item={item} index={i} />;
          })}
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