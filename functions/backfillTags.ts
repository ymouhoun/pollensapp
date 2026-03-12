import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const items = await base44.asServiceRole.entities.MediaItem.list();
  const results = [];

  for (const item of items) {
    let prompt = '';
    if (item.content_type === 'text') {
      prompt = `Analyze this text/quote and return relevant tags.\nText: "${item.text_content}"`;
    } else {
      prompt = `Analyze this image and return relevant tags.\nImage URL: ${item.file_url}`;
    }

    prompt += `

Available tags (pick 1-4 that best apply):
ia, design, photography, eros, 3d, peinture, littérature, art direction, films, portrait, nature, architecture, abstract, urban, fashion, minimal, texture, experimental

Return a JSON object with a "tags" array of strings. Only use tags from the list above.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: item.content_type !== 'text' && item.file_url ? [item.file_url] : undefined,
      response_json_schema: {
        type: 'object',
        properties: { tags: { type: 'array', items: { type: 'string' } } }
      }
    });

    const tags = result?.tags || [];
    await base44.asServiceRole.entities.MediaItem.update(item.id, { tags });
    results.push({ id: item.id, tags });
  }

  return Response.json({ success: true, updated: results.length, results });
});