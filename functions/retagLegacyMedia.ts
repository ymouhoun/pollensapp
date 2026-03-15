import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all media items
    const allItems = await base44.asServiceRole.entities.MediaItem.list('-created_date', 1000);
    
    let retagged = 0;
    const results = [];

    for (const item of allItems) {
      // Skip videos and text items
      if (item.content_type !== 'image' || !item.file_url) continue;

      try {
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this image and extract metadata. Be specific and descriptive.

Return a JSON object with:
- colors: array of 2-3 dominant colors (e.g., "deep blue", "warm gold", "muted gray")
- moods: array of 2-3 emotional/atmospheric moods (e.g., "melancholic", "vibrant", "serene", "dramatic")
- objects: array of 3-5 main objects/subjects visible (e.g., "flowers", "architecture", "hands", "water")
- style: array of 2-3 artistic/photographic styles (e.g., "minimalist", "cinematic", "vintage", "macro photography")

Be concise and use lowercase. Focus on what's actually visible.`,
          file_urls: [item.file_url],
          response_json_schema: {
            type: 'object',
            properties: {
              colors: { type: 'array', items: { type: 'string' } },
              moods: { type: 'array', items: { type: 'string' } },
              objects: { type: 'array', items: { type: 'string' } },
              style: { type: 'array', items: { type: 'string' } },
            },
          },
        });

        const allTags = [
          ...(response.colors || []),
          ...(response.moods || []),
          ...(response.objects || []),
          ...(response.style || []),
        ].filter(Boolean);

        await base44.asServiceRole.entities.MediaItem.update(item.id, {
          tags: allTags,
        });

        results.push({ id: item.id, tags: allTags, status: 'success' });
        retagged++;
      } catch (error) {
        results.push({ id: item.id, status: 'error', error: error.message });
      }
    }

    return Response.json({
      success: true,
      retagged,
      total: allItems.length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});