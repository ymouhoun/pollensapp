import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { query } = await req.json();
  if (!query || query.length < 2) return Response.json({ results: [] });

  // Fetch all non-forgotten image items
  const items = await base44.asServiceRole.entities.MediaItem.list('-created_date', 500);
  const searchable = items.filter(i => !i.is_forgotten);

  const q = query.toLowerCase().trim();
  const queryTerms = q.split(/\s+/).filter(Boolean);

  // Score each item
  const scored = [];

  for (const item of searchable) {
    let score = 0;

    // Build searchable text corpus for this item from all metadata fields
    const fields = [
      { text: item.caption || '', weight: 3 },
      { text: item.title || '', weight: 2 },
      { text: item.text_content || '', weight: 2 },
      { text: (item.meta_mood || []).join(' '), weight: 2 },
      { text: (item.meta_directors || []).join(' '), weight: 2 },
      { text: (item.meta_keywords || []).join(' '), weight: 2 },
      { text: (item.tags || []).join(' '), weight: 1.5 },
      { text: (item.meta_format || []).join(' '), weight: 1.5 },
      { text: (item.meta_film_stock || []).join(' '), weight: 1.5 },
      { text: (item.meta_color_type || []).join(' '), weight: 1.5 },
      { text: (item.meta_lighting || []).join(' '), weight: 1.5 },
      { text: (item.meta_composition || []).join(' '), weight: 1 },
      { text: (item.meta_color_palette || []).join(' '), weight: 1 },
      { text: (item.meta_texture || []).join(' '), weight: 1 },
      { text: (item.meta_subject || []).join(' '), weight: 1.5 },
      { text: (item.meta_era || []).join(' '), weight: 1 },
      { text: item.collection || '', weight: 0.5 },
      { text: item.color_palette || '', weight: 0.5 },
    ];

    for (const term of queryTerms) {
      for (const field of fields) {
        const lower = field.text.toLowerCase();
        if (!lower) continue;

        // Exact word match
        if (lower.split(/[\s,;]+/).some(w => w === term)) {
          score += 10 * field.weight;
        }
        // Starts-with match
        else if (lower.split(/[\s,;]+/).some(w => w.startsWith(term))) {
          score += 6 * field.weight;
        }
        // Contains match (substring / fuzzy)
        else if (lower.includes(term)) {
          score += 3 * field.weight;
        }
      }
    }

    // Bonus: if ALL query terms matched somewhere
    const allCorpus = fields.map(f => f.text.toLowerCase()).join(' ');
    const allTermsMatch = queryTerms.every(t => allCorpus.includes(t));
    if (allTermsMatch && queryTerms.length > 1) score *= 1.5;

    if (score > 0) {
      scored.push({ id: item.id, score });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return Response.json({ results: scored.slice(0, 100) });
});