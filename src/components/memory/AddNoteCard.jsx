import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

export default function AddNoteCard() {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await base44.entities.MediaItem.create({
      content_type: 'text',
      text_content: text.trim(),
    });
    setText('');
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ['media-items'] });
  };

  return (
    <div className="break-inside-avoid mb-3 p-4 rounded-xl border border-dashed border-border/50 bg-transparent">
      <p className="text-xs text-muted-foreground/60 font-light mb-2">add a new note</p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="start typing here..."
        className="w-full text-sm font-light text-muted-foreground bg-transparent border-none outline-none resize-none min-h-[80px] placeholder:text-muted-foreground/40"
        onKeyDown={e => {
          if (e.key === 'Enter' && e.metaKey) handleSave();
        }}
      />
      {text.trim() && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-2 text-[10px] text-muted-foreground/50 hover:text-foreground transition-colors flex items-center gap-1"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          {saving ? 'saving...' : 'save (⌘↵)'}
        </button>
      )}
    </div>
  );
}