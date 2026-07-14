import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { dequantizeVector, embedQueryLocally, LOCAL_VERSION } from '@/lib/localVision';

const textOf = item => [item.title, item.caption, item.caption_universal, item.caption_short_fr, item.caption_detailed_fr, item.caption_en, item.manual_caption_short_fr, item.manual_caption_detailed_fr, item.manual_caption_en, item.searchable_text, ...(item.tags || []), ...(item.ocr_text || [])].filter(Boolean).join(' ').toLowerCase();
const tokens = text => [...new Set(text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[\p{L}\p{N}]+/gu) || [])];
const cosine = (a, b) => { let score = 0; const size = Math.min(a.length, b.length); for (let i = 0; i < size; i++) score += a[i] * b[i]; return score; };

export default function useLocalMediaSearch(query) {
  const [state, setState] = useState({ resultIds: null, resultItems: [], reasons: {}, isSearching: false, error: '' });
  useEffect(() => {
    let active = true;
    if (query.trim().length < 2) {
      setState({ resultIds: null, resultItems: [], reasons: {}, isSearching: false, error: '' });
      return () => { active = false; };
    }
    const timer = setTimeout(async () => {
      setState(current => ({ ...current, isSearching: true, error: '' }));
      try {
        const [items, embedding] = await Promise.all([
          base44.entities.MediaItem.filter({ content_type: 'image' }, '-created_date', 500),
          embedQueryLocally(query.trim()),
        ]);
        const queryTokens = tokens(query);
        const ranked = items.map(item => {
          const corpus = textOf(item);
          const exact = queryTokens.length ? queryTokens.filter(token => tokens(corpus).includes(token)).length / queryTokens.length : 0;
          const visual = item.embedding_status === 'completed' && item.embedding_version === LOCAL_VERSION && item.local_embedding_q8 ? (cosine(embedding.vector, dequantizeVector(item.local_embedding_q8)) + 1) / 2 : 0;
          return { item, score: visual * 0.78 + exact * 0.22, visual, exact };
        }).filter(match => match.score > 0.08).sort((a, b) => b.score - a.score).slice(0, 100);
        if (!active) return;
        setState({
          resultIds: ranked.map(match => match.item.id),
          resultItems: ranked.map(match => match.item),
          reasons: Object.fromEntries(ranked.map(match => [match.item.id, match.visual > 0 && match.exact > 0 ? 'similarité visuelle · métadonnées existantes' : match.visual > 0 ? 'similarité visuelle locale' : 'caption, tag ou OCR existant'])),
          isSearching: false,
          error: '',
        });
      } catch (error) {
        if (active) setState({ resultIds: [], resultItems: [], reasons: {}, isSearching: false, error: error.message });
      }
    }, 450);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);
  return state;
}