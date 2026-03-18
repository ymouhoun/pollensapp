import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { entity_id } = await req.json();

    if (!entity_id) {
      return Response.json({ error: 'Missing entity_id' }, { status: 400 });
    }

    const item = await base44.asServiceRole.entities.MediaItem.get(entity_id);
    
    // Skip if not an image or already has comprehensive tags
    if (item.content_type !== 'image' || !item.file_url || (item.tags && item.tags.length > 5)) {
      return Response.json({ skipped: true }, { status: 200 });
    }

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

    // Combine all tags
    const allTags = [
      ...(response.colors || []),
      ...(response.moods || []),
      ...(response.objects || []),
      ...(response.style || []),
    ].filter(Boolean);

    await base44.asServiceRole.entities.MediaItem.update(entity_id, {
      tags: allTags,
    });

    return Response.json({
      success: true,
      tags: allTags,
      categories: {
        colors: response.colors,
        moods: response.moods,
        objects: response.objects,
        style: response.style,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});