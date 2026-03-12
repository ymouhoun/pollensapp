import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import MediaCard from '@/components/memory/MediaCard';
import TextCard from '@/components/memory/TextCard';
import AddNoteCard from '@/components/memory/AddNoteCard';
import UploadModal from '@/components/memory/UploadModal';

const FILTERS = ['everything', 'spaces', 'serendipity'];
const ALL_TAGS = ['ia', 'design', 'photography', 'eros', '3d', 'peinture', 'littérature', 'art direction', 'films'];
const NUM_COLS = 5;

function distributeToColumns(items, numCols) {
  const cols = Array.from({ length: numCols }, () => []);
  items.forEach((item, i) => cols[i % numCols].push(item));
  return cols;
}

export default function Memory() {
  const [activeFilter, setActiveFilter] = useState('everything');
  const [activeTag, setActiveTag] = useState(null);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [columnItems, setColumnItems] = useState(Array.from({ length: NUM_COLS }, () => []));
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

  // Re-distribute when filtered changes
  useEffect(() => {
    setColumnItems(distributeToColumns(filtered, NUM_COLS));
  }, [filtered]);

  const usedTags = useMemo(() => {
    const freq = {};
    items.forEach(item => item.tags?.forEach(t => { freq[t] = (freq[t] || 0) + 1; }));
    const fromItems = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
    return [...new Set([...ALL_TAGS, ...fromItems])];
  }, [items]);

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
    <div className="min-h-screen px-6 md:px-8 py-6 relative">
      {/* Progressive blur — top */}
      <div
        className="pointer-events-none fixed top-0 left-14 right-0 h-28 z-30"
        style={{ background: 'linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--background) / 0.8) 50%, transparent 100%)' }}
      />
      {/* Progressive blur — bottom */}
      <div
        className="pointer-events-none fixed bottom-0 left-14 right-0 h-28 z-30"
        style={{ background: 'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.8) 50%, transparent 100%)' }}
      />

      {/* Top filters */}
      <div className="flex items-center justify-end gap-5 mb-6 relative z-10">
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
      <div className="mb-6 relative z-10">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="search my mind..."
          className="bg-transparent border-none outline-none font-display italic text-4xl md:text-5xl text-muted-foreground/50 placeholder:text-muted-foreground/30 w-full max-w-xl"
        />
      </div>

      {/* Tag pills */}
      <div className="flex items-center gap-2 flex-wrap mb-6 relative z-10">
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

      {/* Drag-and-drop masonry grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-foreground rounded-full animate-spin" />
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3">
            {/* First column: AddNoteCard + items */}
            <div className="flex-1 min-w-0">
              <AddNoteCard />
              <Droppable droppableId="0">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[40px] transition-colors rounded-xl ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}`}
                  >
                    {columnItems[0]?.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            style={{
                              ...prov.draggableProps.style,
                              opacity: snap.isDragging ? 0.85 : 1,
                            }}
                          >
                            {item.content_type === 'text'
                              ? <TextCard item={item} index={index} />
                              : <MediaCard item={item} index={index} />}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Remaining columns */}
            {[1, 2, 3, 4].map(colIdx => (
              <div key={colIdx} className="flex-1 min-w-0">
                <Droppable droppableId={String(colIdx)}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[40px] transition-colors rounded-xl ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}`}
                    >
                      {columnItems[colIdx]?.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              style={{
                                ...prov.draggableProps.style,
                                opacity: snap.isDragging ? 0.85 : 1,
                              }}
                            >
                              {item.content_type === 'text'
                                ? <TextCard item={item} index={index} />
                                : <MediaCard item={item} index={index} />}
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

      <div className="h-16" /> {/* bottom padding for blur */}

      <UploadModal
        open={showUpload}
        onOpenChange={setShowUpload}
        onUploaded={() => queryClient.invalidateQueries({ queryKey: ['media-items'] })}
      />
    </div>
  );
}