import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const items = await base44.asServiceRole.entities.MediaItem.list();
    const results = [];

    for (const item of items.slice(0, 12)) {
      try {
        let prompt = '';
        if (item.content_type === 'text') {
          prompt = `Analyze this text and pick 1-4 tags.\nText: "${item.text_content}"`;
        } else {
          prompt = `Analyze this image and pick 1-4 tags based on its title/description.\nTitle: "${item.title || ''}"\nCollection: "${item.collection || ''}"`;
        }
        prompt += `\nAvailable tags: ia, design, photography, eros, 3d, peinture, littérature, art direction, films, portrait, nature, architecture, abstract, urban, fashion, minimal, texture, experimental\nReturn JSON: {"tags": [...]}`;

        // Only pass file_urls for properly uploaded files (not external CDN links)
        const isUploadedFile = item.file_url && item.file_url.includes('supabase');
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
          file_urls: isUploadedFile ? [item.file_url] : undefined,
          response_json_schema: {
            type: 'object',
            properties: { tags: { type: 'array', items: { type: 'string' } } }
          }
        });

        const tags = result?.tags || [];
        await base44.asServiceRole.entities.MediaItem.update(item.id, { tags });
        results.push({ id: item.id, tags });
      } catch (e) {
        results.push({ id: item.id, error: e.message });
      }
    }

    return Response.json({ success: true, updated: results.length, results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});