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
      text_content: text.trim()
    });
    setText('');
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ['media-items'] });
  };

  return null;























}