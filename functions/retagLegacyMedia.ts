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
          prompt: `Create a rich, searchable caption for this image. Write 1-2 sentences that describe:
- What you see (subjects, objects, composition)
- The mood/atmosphere (colors, lighting, tone)
- The style/technique (photographic style, artistic approach)

Make it poetic but grounded. Example: "A serene minimalist composition with soft golden light illuminating delicate botanical forms against a neutral backdrop. The mood is ethereal and contemplative."`,
          file_urls: [item.file_url],
          response_json_schema: {
            type: 'object',
            properties: {
              caption: { type: 'string' },
            },
          },
        });

        const caption = response.caption?.trim() || '';

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