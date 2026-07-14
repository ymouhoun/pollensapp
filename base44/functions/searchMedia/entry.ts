import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const VOYAGE_API_KEY = Deno.env.get('VOYAGE_API_KEY');
const PINECONE_API_KEY = Deno.env.get('PINECONE_API_KEY');
const PINECONE_HOST = Deno.env.get('PINECONE_HOST');
const STOPWORDS = new Set(['avec','sans','pour','une','des','les','dans','devant','image','images','photo','photos','proche','ambiance','the','and','with','without','near','of','a','an']);
const norm = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const array = (value) => Array.isArray(value) ? value.filter(v => typeof v === 'string') : [];
const clamp = (value) => Math.max(0, Math.min(1, Number(value) || 0));

function fallbackIntent(query) {
  const clean = norm(query);
  const terms = clean.split(/[^a-z0-9#]+/).filter(t => t.length > 2 && !STOPWORDS.has(t));
  return {
    semantic_query: query,
    exact_terms: terms,
    ocr_terms: terms.filter(t => t === t.toUpperCase()),
    negative_terms: clean.includes('sans personne') || clean.includes('without people') ? ['personne', 'person', 'visage', 'face'] : [],
    filters: {
      content_type: ['image'],
      people_presence: clean.includes('sans personne') || clean.includes('without people') ? 'without_people' : (clean.includes('personne') || clean.includes('femme') || clean.includes('homme') || clean.includes('woman') ? 'with_people' : 'any'),
      orientation: '', location_type: clean.includes('interieur') ? 'intérieur' : (clean.includes('exterieur') ? 'extérieur' : ''),
      colors: terms.filter(t => ['rouge','red','bleu','blue','bois','wood','warm','chaud','noir','black','blanc','white'].includes(t)),
      styles: [], materials: clean.includes('bois') || clean.includes('wood') ? ['bois','wood'] : [], moods: [], textures: []
    }
  };
}

async function understandQuery(base44, query) {
  try {
    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Transforme cette recherche visuelle en requête sémantique et filtres structurés pour une photothèque. Ne cherche pas les images et n'invente rien. Recherche: "${query}"`,
      response_json_schema: {
        type: 'object', additionalProperties: false,
        properties: {
          semantic_query: { type: 'string' },
          exact_terms: { type: 'array', items: { type: 'string' } },
          ocr_terms: { type: 'array', items: { type: 'string' } },
          negative_terms: { type: 'array', items: { type: 'string' } },
          filters: { type: 'object', additionalProperties: false, properties: {
            content_type: { type: 'array', items: { type: 'string' } },
            people_presence: { type: 'string', enum: ['any','with_people','without_people'] },
            orientation: { type: 'string' }, location_type: { type: 'string' },
            colors: { type: 'array', items: { type: 'string' } }, styles: { type: 'array', items: { type: 'string' } },
            materials: { type: 'array', items: { type: 'string' } }, moods: { type: 'array', items: { type: 'string' } }, textures: { type: 'array', items: { type: 'string' } }
          }, required: ['content_type','people_presence','orientation','location_type','colors','styles','materials','moods','textures'] }
        },
        required: ['semantic_query','exact_terms','ocr_terms','negative_terms','filters']
      }
    });
    return response?.semantic_query ? response : fallbackIntent(query);
  } catch (_error) {
    return fallbackIntent(query);
  }
}

function corpusFields(item) {
  const objects = (item.objects || []).flatMap(o => [o?.name_fr, o?.name_en]);
  const colors = (item.dominant_colors || []).flatMap(c => [c?.name_fr, c?.name_en, c?.hex]);
  return [
    { name: 'texte indexé', text: item.searchable_text || '', weight: 4 },
    { name: 'OCR', text: array(item.ocr_text).join(' '), weight: 5 },
    { name: 'tags', text: array(item.tags).join(' '), weight: 3 },
    { name: 'caption', text: [item.manual_caption_short_fr, item.manual_caption_detailed_fr, item.manual_caption_en, item.caption_short_fr, item.caption_detailed_fr, item.caption_en, item.caption].filter(Boolean).join(' '), weight: 3 },
    { name: 'objets', text: objects.join(' '), weight: 2.5 },
    { name: 'couleurs', text: [item.color_palette, ...array(item.meta_color_palette), ...colors].join(' '), weight: 2 },
    { name: 'style', text: [...array(item.visual_style), ...array(item.medium), ...array(item.meta_keywords), ...array(item.meta_format)].join(' '), weight: 2 },
    { name: 'matières', text: [...array(item.materials), ...array(item.textures), ...array(item.meta_texture)].join(' '), weight: 2 },
    { name: 'ambiance', text: [...array(item.mood), ...array(item.lighting), ...array(item.meta_mood), ...array(item.meta_lighting)].join(' '), weight: 2 },
    { name: 'titre', text: item.title || '', weight: 1.5 },
  ];
}

function canAccess(user, item) {
  if (user.role === 'admin') return true;
  return item.created_by_id === user.id || item.created_by === user.email;
}

function structuredScore(item, filters) {
  const checks = [];
  const allowedTypes = array(filters.content_type).map(norm).filter(Boolean);
  if (allowedTypes.length && !allowedTypes.includes(norm(item.content_type))) return { hardFail: true, score: 0, labels: [] };
  if (filters.people_presence === 'without_people' && Number(item.people_count || 0) > 0) return { hardFail: true, score: 0, labels: [] };
  if (filters.people_presence === 'with_people' && Number(item.people_count || 0) <= 0) return { hardFail: true, score: 0, labels: [] };
  if (filters.orientation && item.orientation && norm(item.orientation) !== norm(filters.orientation)) return { hardFail: true, score: 0, labels: [] };
  if (filters.location_type && item.location_type && norm(item.location_type) !== norm(filters.location_type)) return { hardFail: true, score: 0, labels: [] };

  const fields = corpusFields(item).map(f => norm(f.text)).join(' ');
  for (const [label, values] of [['couleur', filters.colors], ['style', filters.styles], ['matière', filters.materials], ['ambiance', filters.moods], ['texture', filters.textures]]) {
    for (const value of array(values)) checks.push({ label, matched: fields.includes(norm(value)) });
  }
  if (filters.people_presence === 'without_people') checks.push({ label: 'sans personne', matched: true });
  if (filters.people_presence === 'with_people') checks.push({ label: 'présence humaine', matched: true });
  if (!checks.length) return { hardFail: false, score: 0.6, labels: [] };
  const matched = checks.filter(c => c.matched);
  return { hardFail: false, score: matched.length / checks.length, labels: matched.map(c => c.label) };
}

function exactScore(item, intent, query) {
  const terms = [...new Set([...array(intent.exact_terms), ...array(intent.ocr_terms), ...norm(query).split(/[^a-z0-9#]+/).filter(t => t.length > 2 && !STOPWORDS.has(t))])];
  const negative = array(intent.negative_terms).map(norm);
  const fields = corpusFields(item);
  let points = 0;
  const labels = [];
  const all = norm(fields.map(f => f.text).join(' '));
  if (negative.some(term => all.includes(term))) return { hardFail: true, score: 0, labels: [] };
  for (const term of terms) {
    for (const field of fields) {
      const text = norm(field.text);
      if (!text) continue;
      const exact = new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(text);
      if (exact || text.includes(term)) {
        points += (exact ? 10 : 4) * field.weight;
        labels.push(field.name);
        break;
      }
    }
  }
  return { hardFail: false, score: clamp(points / 120), labels: [...new Set(labels)].slice(0, 3) };
}

function reason(item, vector, exact, structured) {
  const parts = [];
  if (vector > 0.72) parts.push('forte proximité sémantique'); else parts.push('proximité sémantique');
  if (exact.labels.length) parts.push(`mots trouvés dans ${exact.labels.join(', ')}`);
  if (structured.labels.length) parts.push(`filtres: ${[...new Set(structured.labels)].join(', ')}`);
  return parts.join(' · ');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query, page = 1, page_size = 40, topK = 80 } = await req.json();
    if (!query || query.trim().length < 2) return Response.json({ results: [], page, page_size, has_more: false });

    const intent = await understandQuery(base44, query.trim());
    const voyageRes = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${VOYAGE_API_KEY}` },
      body: JSON.stringify({ input: [intent.semantic_query || query], model: 'voyage-3', input_type: 'query' }),
    });
    if (!voyageRes.ok) throw new Error(`Voyage API error: ${voyageRes.status} ${await voyageRes.text()}`);
    const embedding = (await voyageRes.json()).data?.[0]?.embedding;
    if (!embedding) throw new Error('No query embedding returned');

    const pineconeFilter = { is_forgotten: { $ne: true } };
    if (user.role !== 'admin') pineconeFilter.$or = [{ owner_id: { $eq: user.id } }, { created_by_id: { $eq: user.id } }, { access_scope: { $eq: 'public' } }];

    const pineconeRes = await fetch(`${PINECONE_HOST}/query`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Api-Key': PINECONE_API_KEY },
      body: JSON.stringify({ vector: embedding, topK: Math.min(Math.max(topK, page_size * 3), 120), includeMetadata: true, filter: pineconeFilter }),
    });
    if (!pineconeRes.ok) throw new Error(`Pinecone query error: ${pineconeRes.status} ${await pineconeRes.text()}`);
    const matches = (await pineconeRes.json()).matches || [];
    const vectorScores = new Map(matches.map(match => [match.id.replace('media-', ''), Number(match.score || 0)]));
    const ids = [...vectorScores.keys()];
    if (!ids.length) return Response.json({ results: [], intent, page, page_size, has_more: false, total: 0 });

    const items = await base44.asServiceRole.entities.MediaItem.filter({ id: { $in: ids } });
    const scored = [];
    for (const item of items) {
      if (!canAccess(user, item) || item.is_forgotten) continue;
      const structured = structuredScore(item, intent.filters || {});
      if (structured.hardFail) continue;
      const exact = exactScore(item, intent, query);
      if (exact.hardFail) continue;
      const vector = clamp(vectorScores.get(item.id));
      const finalScore = (vector * 0.62) + (exact.score * 0.25) + (structured.score * 0.13);
      scored.push({ id: item.id, score: Math.round(finalScore * 10000) / 10000, vector_score: vector, exact_score: exact.score, filter_score: structured.score, match_reason: reason(item, vector, exact, structured) });
    }

    scored.sort((a, b) => b.score - a.score);
    const size = Math.min(Math.max(Number(page_size) || 40, 1), 100);
    const start = (Math.max(Number(page) || 1, 1) - 1) * size;
    return Response.json({ results: scored.slice(start, start + size), page: Number(page) || 1, page_size: size, has_more: start + size < scored.length, total: scored.length, intent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});