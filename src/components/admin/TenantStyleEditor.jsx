import React, { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

export default function TenantStyleEditor({ taxonomy = [], onChange }) {
  const [editIdx, setEditIdx] = useState(null);

  const addStyle = () => {
    const next = [...taxonomy, { slug: '', label: '', description: '', reference_image_ids: [] }];
    onChange(next);
    setEditIdx(next.length - 1);
  };

  const updateStyle = (idx, field, value) => {
    const next = taxonomy.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    // Auto-generate slug from label
    if (field === 'label') {
      next[idx].slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    onChange(next);
  };

  const removeStyle = (idx) => {
    onChange(taxonomy.filter((_, i) => i !== idx));
    if (editIdx === idx) setEditIdx(null);
  };

  return (
    <div className="space-y-3">
      {taxonomy.map((style, idx) => (
        <div
          key={idx}
          className="border border-border/30 rounded-lg p-4 space-y-3 transition-colors hover:border-border/50"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" strokeWidth={1.5} />
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={style.label}
                  onChange={e => updateStyle(idx, 'label', e.target.value)}
                  placeholder="Style label"
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/30 outline-none border-b border-transparent focus:border-foreground/20 transition-colors pb-1"
                />
                {style.slug && (
                  <span className="text-[10px] tracking-widest uppercase text-muted-foreground/40">{style.slug}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => removeStyle(idx)}
              className="text-muted-foreground/20 hover:text-destructive transition-colors p-1"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
          <textarea
            value={style.description}
            onChange={e => updateStyle(idx, 'description', e.target.value)}
            placeholder="Describe this style direction..."
            rows={2}
            className="w-full bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground/20 outline-none resize-none border border-border/20 rounded px-3 py-2 focus:border-foreground/20 transition-colors"
          />
        </div>
      ))}
      <button
        onClick={addStyle}
        className="flex items-center gap-2 text-xs text-muted-foreground/50 hover:text-foreground/70 transition-colors py-2"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
        Add style
      </button>
    </div>
  );
}