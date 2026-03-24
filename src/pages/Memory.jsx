import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FileUp } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import MediaCard from '@/components/memory/MediaCard';
import TextCard from '@/components/memory/TextCard';
import AddNoteCard from '@/components/memory/AddNoteCard';
import UploadModal from '@/components/memory/UploadModal';
import MediaOverlay from '@/components/memory/MediaOverlay';

import MemoryActionBar from '@/components/memory/MemoryActionBar';
import GradientWaveText from '@/components/ui/gradient-wave-text';
import GradualBlur from '@/components/GradualBlur';
import LoadingBeam from '@/components/memory/LoadingBeam';
import SameVibeModal from '@/components/memory/SameVibeModal';
import Galaxy from '@/pages/Galaxy';
import { useQuery } from '@tanstack/react-query';

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
  const [dateFilter, setDateFilter] = useState('all');
  const [colorFilter, setColorFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [numCols, setNumCols] = useState(() => getNumCols(window.innerWidth));
  const [columnItems, setColumnItems] = useState(Array.from({ length: getNumCols(window.innerWidth) }, () => []));
  const [headerVisible, setHeaderVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [vibeItem, setVibeItem] = useState(null);
  const [uploadingDrop, setUploadingDrop] = useState(false);
  const [showGalaxy, setShowGalaxy] = useState(false);
  const lastScrollY = useRef(0);
  const dragCounter = useRef(0);
  const sentinelRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: logos = [] } = useQuery({
    queryKey: ['app-logo'],
    queryFn: () => base44.entities.AppLogo.list('-created_date', 1),
  });
  const appLogo = logos[0] || null;
  const [logoSize, setLogoSize] = useState(() => parseInt(localStorage.getItem('logo-size') || '64'));
  const [introGlow, setIntroGlow] = useState(true);
  const [hoverGlow, setHoverGlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIntroGlow(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = (e) => setLogoSize(e.detail);
    window.addEventListener('logo-size-change', handler);
    return () => window.removeEventListener('logo-size-change', handler);
  }, []);

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

  const [semanticMatches, setSemanticMatches] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!search || search.length < 3) {
      setSemanticMatches([]);
      return;
    }

    const isSemanticQuery = /\b(mood|light|style|vibe|atmosphere|feeling|aesthetic|composition)\b/i.test(search);
    if (!isSemanticQuery) {
      setSemanticMatches([]);
      return;
    }

    const runSemanticSearch = async () => {
      setIsSearching(true);
      try {
        const response = await base44.functions.invoke('semanticSearch', {
          query: search,
          itemIds: items.filter(i => !i.is_forgotten && i.text_content).map(i => i.id),
        });
        setSemanticMatches(response.data.matches?.map(m => m.id) || []);
      } catch (error) {
        console.error('Semantic search error:', error);
      }
      setIsSearching(false);
    };

    const debounce = setTimeout(runSemanticSearch, 500);
    return () => clearTimeout(debounce);
  }, [search, items]);

  const filtered = useMemo(() => items.filter(item => {
    if (item.is_forgotten) return false;
    if (activeTag && !item.tags?.includes(activeTag)) return false;
    if (dateFilter !== 'all') {
      const created = new Date(item.created_date);
      const now = new Date();
      if (dateFilter === 'today') {
        if (created.toDateString() !== now.toDateString()) return false;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
        if (created < weekAgo) return false;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1);
        if (created < monthAgo) return false;
      }
    }
    if (colorFilter && item.color_palette !== colorFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const lexicalMatch = item.title?.toLowerCase().includes(s) ||
                          item.text_content?.toLowerCase().includes(s) ||
                          item.tags?.some(t => t.toLowerCase().includes(s));
      
      const isSemanticQuery = /\b(mood|light|style|vibe|atmosphere|feeling|aesthetic|composition)\b/i.test(search);
      if (isSemanticQuery && semanticMatches.length > 0) {
        return semanticMatches.includes(item.id);
      }
      
      return lexicalMatch;
    }
    return true;
  }), [items, activeTag, dateFilter, colorFilter, search, semanticMatches]);

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

  useEffect(() => {
    const onDragEnter = (e) => {
      if (e.dataTransfer.types.includes('Files')) {
        dragCounter.current += 1;
        setIsDraggingFiles(true);
      }
    };
    const onDragLeave = () => {
      dragCounter.current -= 1;
      if (dragCounter.current === 0) setIsDraggingFiles(false);
    };
    const onDragOver = (e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); };
    const onDrop = async (e) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDraggingFiles(false);
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
      if (files.length === 0) return;
      setUploadingDrop(true);
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.MediaItem.create({
          title: file.name.split('.')[0],
          file_url,
          content_type: file.type.startsWith('video/') ? 'video' : 'image',
        });
      }
      setUploadingDrop(false);
      queryClient.invalidateQueries({ queryKey: ['media-items'] });
    };
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [queryClient]);

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
      <GradualBlur position="top" height="5rem" strength={3} divCount={6} exponential curve="ease-out" target="page" zIndex={50} />
      <GradualBlur position="bottom" height="5rem" strength={3} divCount={6} exponential curve="ease-out" target="page" zIndex={50} />

      {/* File drop overlay */}
      {(isDraggingFiles || uploadingDrop) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 backdrop-blur-[20px] bg-background/30" />
          <div className="relative flex items-center gap-3" style={{ fontFamily: 'ModeratRegular, var(--font-sans)' }}>
            {uploadingDrop ? (
              <>
                <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
                <span className="text-[15px] text-foreground/70 tracking-wide">Uploading...</span>
              </>
            ) : (
              <>
                <FileUp className="w-5 h-5 text-foreground/60" strokeWidth={1.5} />
                <span className="text-[15px] text-foreground/70">Upload to memory</span>
              </>
            )}
          </div>
        </div>
      )}



      {/* Centered logo */}
      {appLogo && (
        <div className="fixed top-[70px] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center justify-center pointer-events-none">
          <div className="relative flex items-center justify-center pointer-events-auto" onMouseEnter={() => setHoverGlow(true)} onMouseLeave={() => setHoverGlow(false)}>
            {(introGlow || hoverGlow) && (
              <div
                className="absolute rounded-full"
                style={{
                  width: logoSize * 2.5,
                  height: logoSize * 2.5,
                  background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 40%, transparent 70%)',
                  animation: 'logo-glow 1.8s ease-in-out infinite',
                }}
              />
            )}
            <style>{`
              @keyframes logo-glow {
                0%, 100% { opacity: 0.3; transform: scale(0.85); }
                50% { opacity: 1; transform: scale(1.1); }
              }
            `}</style>
            <img
              src={appLogo.file_url}
              alt="Logo"
              style={{
                maxHeight: logoSize,
                maxWidth: '80vw',
                filter: (introGlow || hoverGlow) ? 'drop-shadow(0 0 12px rgba(255,255,255,0.7)) drop-shadow(0 0 30px rgba(255,255,255,0.35))' : 'none',
                animation: (introGlow || hoverGlow) ? 'logo-glow 1.8s ease-in-out infinite' : 'none',
                transition: 'filter 0.6s ease',
              }}
              className="object-contain opacity-90 relative"
            />
          </div>
        </div>
      )}

      {/* Fixed search overlay */}
      <div className="fixed top-0 left-0 right-0 z-30 py-6 pointer-events-none">
        <div className="flex flex-col items-center gap-0 pointer-events-auto">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search memory..."
            className="bg-transparent border-none outline-none text-2xl text-center tracking-wide bg-[linear-gradient(110deg,rgba(255,255,255,0.15),35%,#fff,50%,rgba(255,255,255,0.15),75%,rgba(255,255,255,0.15))] bg-[length:200%_100%] bg-clip-text text-transparent placeholder:text-white/40"
            style={{ 
              fontFamily: 'Dhampir, serif', 
              width: 'auto', 
              maxWidth: '90vw',
              animation: 'shine 6s linear infinite'
            }}
          />
          <style>{`
            @keyframes shine {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </div>
      </div>


      <MemoryActionBar
        activeTag={activeTag}
        setActiveTag={setActiveTag}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        colorFilter={colorFilter}
        setColorFilter={setColorFilter}
        allTags={items.flatMap(item => item.tags || []).filter((tag, i, arr) => arr.indexOf(tag) === i)}
        onToggleGalaxy={() => setShowGalaxy(!showGalaxy)}
      />

      {/* Masonry grid */}
      <div className="px-4 pb-24 pt-4 min-h-screen">
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
                              : <MediaCard item={item} index={index} onClick={setSelectedItem} onSameVibe={setVibeItem} />}
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
                                : <MediaCard item={item} index={index} onClick={setSelectedItem} onSameVibe={setVibeItem} />}
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
      <SameVibeModal
        item={vibeItem}
        onClose={() => setVibeItem(null)}
        onSelectItem={setSelectedItem}
      />
      <UploadModal
        open={showUpload}
        onOpenChange={setShowUpload}
        onUploaded={() => queryClient.invalidateQueries({ queryKey: ['media-items'] })}
      />
      
      {showGalaxy && (
        <div className="fixed inset-0 z-[20] bg-black/80">
          <button
            onClick={() => setShowGalaxy(false)}
            className="absolute top-4 right-4 z-50 p-2 text-white/60 hover:text-white transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <Galaxy
            onSelectItem={setSelectedItem}
            filteredMedia={search ? filtered.filter(i => !i.is_forgotten && i.file_url && (i.content_type === 'image' || i.content_type === 'video')) : null}
          />
        </div>
      )}

      {/* MediaOverlay rendered at top level for proper z-index */}
      {showGalaxy && (
        <MediaOverlay
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onPrev={() => {
            const navigable = items.filter(i => i.content_type !== 'text');
            const idx = navigable.findIndex(i => i.id === selectedItem?.id);
            if (idx > 0) setSelectedItem(navigable[idx - 1]);
          }}
          onNext={() => {
            const navigable = items.filter(i => i.content_type !== 'text');
            const idx = navigable.findIndex(i => i.id === selectedItem?.id);
            if (idx < navigable.length - 1) setSelectedItem(navigable[idx + 1]);
          }}
        />
      )}
    </div>
  );
}