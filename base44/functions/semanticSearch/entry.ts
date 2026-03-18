import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, itemIds } = await req.json();

    if (!query || !itemIds || itemIds.length === 0) {
      return Response.json({ matches: [] });
    }

    // Fetch items
    const items = await Promise.all(
      itemIds.map(id => base44.asServiceRole.entities.MediaItem.get(id).catch(() => null))
    ).then(results => results.filter(Boolean));

    if (items.length === 0) {
      return Response.json({ matches: [] });
    }

    // Use LLM to find semantic matches
    const captions = items.map(item => item.text_content || item.title || '').join('\n---\n');

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Given this search query: "${query}"

Analyze which of the following image captions best match the semantic intent of the query. Consider mood, atmosphere, composition, style, and subject matter.

Captions (separated by ---):
${captions}

Return a JSON object with:
- matchingIndices: array of 0-based indices of captions that match the query intent
- scores: object mapping index to relevance score (0-100)

Only include matches with score >= 50. Be strict about semantic relevance.`,
      response_json_schema: {
        type: 'object',
        properties: {
          matchingIndices: { type: 'array', items: { type: 'integer' } },
          scores: { type: 'object' },
        },
      },
    });

    const matches = response.matchingIndices
      .map(idx => ({
        id: items[idx].id,
        score: response.scores?.[idx] || 75,
      }))
      .sort((a, b) => b.score - a.score);

    return Response.json({ matches });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});