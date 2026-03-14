import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import MediaCard from '@/components/memory/MediaCard';
import TextCard from '@/components/memory/TextCard';
import AddNoteCard from '@/components/memory/AddNoteCard';
import UploadModal from '@/components/memory/UploadModal';
import MediaOverlay from '@/components/memory/MediaOverlay';
import ProgressiveBlur from '@/components/memory/ProgressiveBlur';

const ALL_TAGS = ['EDITORIAL', 'BEAUTY', 'STILL LIFE', 'SET DESIGN', '35MM', 'SUPER16', 'B&W', 'BAROQUE', 'OBJECTS', 'ORGANIC', '8MM', 'STILLS', 'ANAMORPHIC', 'LIGHT', 'GOTHIC', 'PORTRAITS'];

function getNumCols(width) {
  if (width < 640) return 2;
  if (width < 1024) return 3;
  if (width < 1440) return 4;
  return 5;
}

function distributeToColumns(items, numCols) {
  const cols = Array.from({ length: numCols }, () => []);
  items.forEach((item, i) => cols[i % numCols].push(item));
  return cols;
}

export default function Memory() {
  const [activeTag, setActiveTag] = useState(null);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [numCols, setNumCols] = useState(() => getNumCols(window.innerWidth));
  const [columnItems, setColumnItems] = useState(Array.from({ length: getNumCols(window.innerWidth) }, () => []));
  const [headerVisible, setHeaderVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const sentinelRef = useRef(null);
  const queryClient = useQueryClient();

  const PAGE_SIZE = 40;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['media-items'],
    queryFn: ({ pageParam = 0 }) =>
      base44.entities.MediaItem.list('-created_date', PAGE_SIZE, pageParam),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.flat().length : undefined,
    initialPageParam: 0,
  });

  const items = useMemo(() => data?.pages.flat() ?? [], [data]);

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

  useEffect(() => {
    const onResize = () => {
      const cols = getNumCols(window.innerWidth);
      setNumCols(cols);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setColumnItems(distributeToColumns(filtered, numCols));
  }, [filtered, numCols]);

  useEffect(() => {
    const handler = () => {
      const shuffled = [...filtered].sort(() => Math.random() - 0.5);
      setColumnItems(distributeToColumns(shuffled, numCols));
    };
    const keyHandler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        handler();
      }
    };
    window.addEventListener('randomize-memory', handler);
    window.addEventListener('keydown', keyHandler);
    return () => {
      window.removeEventListener('randomize-memory', handler);
      window.removeEventListener('keydown', keyHandler);
    };
  }, [filtered, numCols]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { rootMargin: '300px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      setHeaderVisible(current < lastScrollY.current || current < 60);
      setScrolled(current > 60);
      lastScrollY.current = current;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const usedTags = ALL_TAGS;

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    const srcCol = parseInt(source.droppableId);
    const dstCol = parseInt(destination.droppableId);
    const newCols = columnItems.map(col => [...col]);
    const [moved] = newCols[srcCol].splice(source.index, 1);
    newCols[dstCol].splice(destination.index, 0, moved);
    setColumnItems(newCols);
  };

  return (
    <div className="min-h-screen bg-background relative">
      {scrolled && <ProgressiveBlur side="top" height={160} />}
      <ProgressiveBlur side="bottom" height={160} />

      {/* Sticky header */}
      <div className={`sticky top-0 z-20 pt-5 pb-3 px-8 transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        {/* Nav tabs */}
        <div className="flex items-center justify-center gap-6 mb-4">
          <span className="flex items-center gap-1.5 text-[11px] tracking-widest text-foreground font-medium uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground inline-block" />
            MEMORY
          </span>
          <button
            onClick={() => window.location.href = '/Entropy'}
            className="flex items-center gap-1 text-[11px] tracking-widest text-muted-foreground/50 hover:text-foreground transition-colors uppercase font-light"
          >
            ↗ ENTROPY
          </button>
        </div>

        {/* Search heading */}
        <div className="text-center mb-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="SEARCH MEMORY..."
            className="bg-transparent border-none outline-none text-3xl md:text-4xl text-foreground placeholder:text-foreground/40 text-center w-full tracking-widest uppercase"
            style={{ fontFamily: 'Dhampir, serif' }}
          />
        </div>

        {/* Tag pills row */}
        <div className="flex items-center gap-0 flex-wrap justify-center pt-1" style={{ fontFamily: 'BananaGrotesk, sans-serif' }}>
          <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-light">Filter</span>
          <span className="mx-3 text-muted-foreground/20">|</span>
          {usedTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`px-2 py-0.5 text-[10px] uppercase tracking-widest font-light transition-colors ${
                activeTag === tag
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground/50 hover:text-foreground'
              }`}
            >
              {tag}
            </button>
          ))}
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-widest font-light text-muted-foreground/30 hover:text-foreground transition-colors ml-2"
          >
            <Plus className="w-2.5 h-2.5" strokeWidth={2} />
            add
          </button>
        </div>
      </div>

      {/* Masonry grid */}
      <div className="px-4 pb-24 pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-foreground rounded-full animate-spin" />
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-1.5">
              {/* First column: AddNoteCard + items */}
              <div className="flex-1 min-w-0">
                <AddNoteCard />
                <Droppable droppableId="0">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[40px] ${snapshot.isDraggingOver ? 'bg-primary/5 rounded' : ''}`}
                    >
                      {columnItems[0]?.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              style={{ ...prov.draggableProps.style, opacity: snap.isDragging ? 0.85 : 1 }}
                              className="mb-1.5"
                            >
                              {item.content_type === 'text'
                              ? <TextCard item={item} index={index} />
                              : <MediaCard item={item} index={index} onClick={setSelectedItem} />}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>

              {Array.from({ length: numCols - 1 }, (_, i) => i + 1).map(colIdx => (
                <div key={colIdx} className="flex-1 min-w-0">
                  <Droppable droppableId={String(colIdx)}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[40px] ${snapshot.isDraggingOver ? 'bg-primary/5 rounded' : ''}`}
                      >
                        {columnItems[colIdx]?.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                style={{ ...prov.draggableProps.style, opacity: snap.isDragging ? 0.85 : 1 }}
                                className="mb-1.5"
                              >
                                {item.content_type === 'text'
                                    ? <TextCard item={item} index={index} />
                                    : <MediaCard item={item} index={index} onClick={setSelectedItem} />}
                                </div>
                                )}
                                </Draggable>
                                ))}
                                {provided.placeholder}
                                </div>
                                )}
                                </Droppable>
                                </div>
                                ))}
                                </div>
                                </DragDropContext>
        )}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="flex justify-center pb-8">
          <div className="w-4 h-4 border-2 border-muted-foreground/20 border-t-foreground rounded-full animate-spin" />
        </div>
      )}

      <MediaOverlay
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onPrev={() => {
          const navigable = filtered.filter(i => i.content_type !== 'text');
          const idx = navigable.findIndex(i => i.id === selectedItem?.id);
          if (idx > 0) setSelectedItem(navigable[idx - 1]);
        }}
        onNext={() => {
          const navigable = filtered.filter(i => i.content_type !== 'text');
          const idx = navigable.findIndex(i => i.id === selectedItem?.id);
          if (idx < navigable.length - 1) setSelectedItem(navigable[idx + 1]);
        }}
      />
      <UploadModal
        open={showUpload}
        onOpenChange={setShowUpload}
        onUploaded={() => queryClient.invalidateQueries({ queryKey: ['media-items'] })}
      />
    </div>
  );
}