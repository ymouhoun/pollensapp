import React, { useEffect, useRef, useState } from 'react';
import { Pencil, Copy, Tally5, Download, Trash2, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { CircularCommandMenu } from '@/components/ui/circular-command-menu';

export default function ItemCircularMenu({ item, position, onClose, onSameVibe }) {
  const queryClient = useQueryClient();
  const ref = useRef(null);
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(item?.title || '');
  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  if (!item) return null;

  const handleRename = async () => {
    if (!newTitle.trim()) return;
    await base44.entities.MediaItem.update(item.id, { title: newTitle.trim() });
    queryClient.invalidateQueries({ queryKey: ['media-items'] });
    setRenaming(false);
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    const tags = [...(item.tags || []), newTag.trim()];
    await base44.entities.MediaItem.update(item.id, { tags });
    queryClient.invalidateQueries({ queryKey: ['media-items'] });
    setAddingTag(false);
  };

  const handleUseAsPrompt = () => {
    const text = item.title || item.text_content || '';
    window.location.href = `/Entropy?prompt=${encodeURIComponent(text)}`;
    onClose();
  };

  const handleDelete = async () => {
    await base44.entities.MediaItem.update(item.id, { is_forgotten: true });
    queryClient.invalidateQueries({ queryKey: ['media-items'] });
    onClose();
  };

  const isDark = document.documentElement.classList.contains('dark');

  // Modal for rename/tag input
  if (renaming || addingTag) {
    const bgColor = isDark ? 'rgba(15, 15, 20, 0.8)' : 'rgba(255, 255, 255, 0.8)';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
    const inputBg = isDark ? 'bg-white/10' : 'bg-black/10';
    const inputText = isDark ? 'text-white' : 'text-black';
    const inputPlaceholder = isDark ? 'placeholder:text-white/30' : 'placeholder:text-black/30';

    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
        <div
          ref={ref}
          className="fixed z-50 w-64 rounded-xl p-4"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: `linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(200,180,220,0.08) 50%, rgba(180,160,210,0.12) 100%)`,
            border: `1px solid ${borderColor}`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <input
            autoFocus
            value={renaming ? newTitle : newTag}
            onChange={(e) => renaming ? setNewTitle(e.target.value) : setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') renaming ? handleRename() : handleAddTag();
              if (e.key === 'Escape') renaming ? setRenaming(false) : setAddingTag(false);
            }}
            placeholder={renaming ? 'New name...' : 'Tag name...'}
            className={`w-full ${inputBg} ${inputText} text-sm rounded-lg px-3 py-2 outline-none mb-3 ${inputPlaceholder}`}
          />
          <div className="flex gap-2">
            <button
              onClick={renaming ? handleRename : handleAddTag}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              {renaming ? 'Save' : 'Add'}
            </button>
            <button
              onClick={() => renaming ? setRenaming(false) : setAddingTag(false)}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </>
    );
  }

  const commandItems = [
    { id: 'rename', icon: <Pencil className="h-5 w-5" />, label: 'Rename', onClick: () => setRenaming(true) },
    { id: 'vibe', icon: <Zap className="h-5 w-5" />, label: 'Same Vibe', onClick: () => { onSameVibe?.(item); onClose(); } },
    { id: 'prompt', icon: <Copy className="h-5 w-5" />, label: 'Use as prompt', onClick: handleUseAsPrompt },
    { id: 'tag', icon: <Tally5 className="h-5 w-5" />, label: 'Add tag', onClick: () => setAddingTag(true) },
    ...(item.file_url ? [{ id: 'download', icon: <Download className="h-5 w-5" />, label: 'Download', onClick: () => { window.open(item.file_url, '_blank'); onClose(); } }] : []),
    { id: 'delete', icon: <Trash2 className="h-5 w-5" />, label: 'Delete', onClick: handleDelete },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50"
      style={{
        top: position?.y || 0,
        left: position?.x || 0,
      }}
    >
      <CircularCommandMenu items={commandItems} radius={90} />
    </div>
  );
}