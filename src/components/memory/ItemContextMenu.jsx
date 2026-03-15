import React, { useEffect, useRef, useState } from 'react';
import { Pencil, Zap, Tag, Download, Trash2, Bolt } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function ItemContextMenu({ item, position, onClose, onSameVibe }) {
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

  if (!item || !position) return null;

  const handleRename = async () => {
    if (!newTitle.trim()) return;
    await base44.entities.MediaItem.update(item.id, { title: newTitle.trim() });
    queryClient.invalidateQueries({ queryKey: ['media-items'] });
    onClose();
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    const tags = [...(item.tags || []), newTag.trim()];
    await base44.entities.MediaItem.update(item.id, { tags });
    queryClient.invalidateQueries({ queryKey: ['media-items'] });
    onClose();
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
  const bgColor = isDark ? 'rgba(20, 20, 25, 0.72)' : 'rgba(255, 255, 255, 0.85)';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const textColor = isDark ? 'text-white/70' : 'text-black/70';
  const inputBg = isDark ? 'bg-white/10' : 'bg-black/10';
  const inputText = isDark ? 'text-white' : 'text-black';
  const inputPlaceholder = isDark ? 'placeholder:text-white/30' : 'placeholder:text-black/30';
  const buttonHover = isDark ? 'hover:bg-white/20' : 'hover:bg-black/10';
  const dividerColor = isDark ? 'bg-white/10' : 'bg-black/10';
  const dangerText = 'text-red-500';
  const dangerHover = isDark ? 'hover:bg-red-500/15' : 'hover:bg-red-100';

  return (
    <div
      ref={ref}
      className="fixed z-[200] w-40 rounded-lg overflow-hidden shadow-lg border"
      style={{
        top: position.y,
        left: position.x,
        background: bgColor,
        borderColor: borderColor,
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
      }}
    >
      {renaming ? (
        <div className="p-1.5">
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
            placeholder="New name..."
            className={`w-full ${inputBg} ${inputText} text-[11px] rounded px-2 py-1 outline-none ${inputPlaceholder}`}
          />
          <div className="flex gap-1 mt-1">
            <button onClick={handleRename} className={`flex-1 text-[10px] py-0.5 rounded ${inputBg} ${textColor} ${buttonHover} transition-colors`}>Save</button>
            <button onClick={() => setRenaming(false)} className={`flex-1 text-[10px] py-0.5 rounded ${textColor} ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'} transition-colors`}>Cancel</button>
          </div>
        </div>
      ) : addingTag ? (
        <div className="p-1.5">
          <input
            autoFocus
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddTag(); if (e.key === 'Escape') setAddingTag(false); }}
            placeholder="Tag name..."
            className={`w-full ${inputBg} ${inputText} text-[11px] rounded px-2 py-1 outline-none ${inputPlaceholder}`}
          />
          <div className="flex gap-1 mt-1">
            <button onClick={handleAddTag} className={`flex-1 text-[10px] py-0.5 rounded ${inputBg} ${textColor} ${buttonHover} transition-colors`}>Add</button>
            <button onClick={() => setAddingTag(false)} className={`flex-1 text-[10px] py-0.5 rounded ${textColor} ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'} transition-colors`}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="py-0.5">
          <MenuItem icon={Pencil} label="Rename" onClick={() => setRenaming(true)} isDark={isDark} />
          <MenuItem icon={Bolt} label="Same Vibe" onClick={() => { onSameVibe?.(item); onClose(); }} isDark={isDark} />
          <MenuItem icon={Zap} label="Use as prompt" onClick={handleUseAsPrompt} isDark={isDark} />
          <MenuItem icon={Tag} label="Add tag" onClick={() => setAddingTag(true)} isDark={isDark} />
          {item.file_url && (
           <a
             href={item.file_url}
             download
             target="_blank"
             rel="noopener noreferrer"
             onClick={onClose}
             className={`flex items-center gap-2 px-3 py-1.5 text-xs ${textColor} ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'} transition-colors cursor-pointer`}
           >
             <Download className="w-3 h-3 opacity-50 flex-shrink-0" strokeWidth={1.5} />
             <span className="font-light tracking-wide">Download</span>
           </a>
          )}
          <div className={`h-px ${dividerColor} my-0.5`} />
          <MenuItem icon={Trash2} label="Delete" onClick={handleDelete} danger isDark={isDark} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger, isDark }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors cursor-pointer ${
        danger
          ? isDark ? 'text-red-400 hover:bg-red-500/15' : 'text-red-500 hover:bg-red-100'
          : isDark ? 'text-white/70 hover:bg-white/10' : 'text-black/70 hover:bg-black/10'
      }`}
    >
      <Icon className="w-3 h-3 opacity-60 flex-shrink-0" strokeWidth={1.5} />
      <span className="font-light tracking-wide">{label}</span>
    </button>
  );
}