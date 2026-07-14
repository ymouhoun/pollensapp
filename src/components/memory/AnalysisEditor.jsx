import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

function buildSearchable(item, edits) {
  const data = { ...item, ...edits };
  const values = [data.title, data.caption, data.caption_universal, data.manual_caption_short_fr, data.manual_caption_detailed_fr, data.manual_caption_en,
    data.caption_short_fr, data.caption_detailed_fr, data.caption_en, ...(data.tags || []), ...(data.objects || []).flatMap(o => [o.name_fr, o.name_en]),
    ...(data.actions || []), ...(data.scene_type || []), data.location_type, ...(data.visual_style || []), ...(data.visual_era || []), ...(data.medium || []),
    ...(data.mood || []), ...(data.lighting || []), ...(data.composition || []), ...(data.dominant_colors || []).flatMap(c => [c.name_fr, c.name_en, c.hex]),
    ...(data.materials || []), ...(data.textures || []), ...(data.ocr_text || []), ...(data.keywords_fr || []), ...(data.keywords_en || [])];
  return [...new Set(values.filter(v => typeof v === 'string').map(v => v.trim().toLowerCase()).filter(Boolean))].join(' · ');
}

export default function AnalysisEditor({ item, onSaved }) {
  const [shortFr, setShortFr] = useState('');
  const [detailedFr, setDetailedFr] = useState('');
  const [captionEn, setCaptionEn] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setShortFr(item.manual_caption_short_fr ?? item.caption_short_fr ?? item.caption ?? '');
    setDetailedFr(item.manual_caption_detailed_fr ?? item.caption_detailed_fr ?? item.caption_universal ?? '');
    setCaptionEn(item.manual_caption_en ?? item.caption_en ?? '');
    setTags((item.tags || []).join(', '));
  }, [item]);

  const save = async () => {
    setSaving(true);
    const edits = { manual_caption_short_fr: shortFr, manual_caption_detailed_fr: detailedFr, manual_caption_en: captionEn, tags: tags.split(',').map(t => t.trim()).filter(Boolean) };
    const update = { ...edits, searchable_text: buildSearchable(item, edits) };
    const saved = await base44.entities.MediaItem.update(item.id, update);
    base44.functions.invoke('embedMedia', { entity_id: item.id }).catch(() => {});
    setSaving(false);
    onSaved?.({ ...item, ...saved, ...update });
  };

  const field = 'w-full rounded-md border border-border/40 bg-background/20 px-2 py-1.5 text-xs font-light outline-none focus:border-foreground/30 resize-none';
  return <div className="space-y-2">
    <label className="block text-[10px] uppercase tracking-wider text-foreground/45">Légende courte FR<textarea className={`${field} mt-1`} rows={2} value={shortFr} onChange={e => setShortFr(e.target.value)} /></label>
    <label className="block text-[10px] uppercase tracking-wider text-foreground/45">Légende détaillée FR<textarea className={`${field} mt-1`} rows={3} value={detailedFr} onChange={e => setDetailedFr(e.target.value)} /></label>
    <label className="block text-[10px] uppercase tracking-wider text-foreground/45">Caption EN<textarea className={`${field} mt-1`} rows={2} value={captionEn} onChange={e => setCaptionEn(e.target.value)} /></label>
    <label className="block text-[10px] uppercase tracking-wider text-foreground/45">Tags<textarea className={`${field} mt-1`} rows={2} value={tags} onChange={e => setTags(e.target.value)} /></label>
    <button onClick={save} disabled={saving} className="text-xs text-foreground/70 hover:text-foreground disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
  </div>;
}