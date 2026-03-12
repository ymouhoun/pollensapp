import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { entity_id, entity_name } = await req.json();

  const item = await base44.asServiceRole.entities.MediaItem.get(entity_id);
  if (!item || (item.tags && item.tags.length > 0)) {
    return Response.json({ skipped: true });
  }

  let prompt = '';
  if (item.content_type === 'text') {
    prompt = `Analyze this text/quote and return relevant tags from the following list only. Return only the tags that genuinely apply.
Text: "${item.text_content}"`;
  } else {
    prompt = `Analyze this image and return relevant tags from the following list only. Return only the tags that genuinely apply.
Image URL: ${item.file_url}`;
  }

  prompt += `

Available tags (pick 1-4 that best apply):
ia, design, photography, eros, 3d, peinture, littérature, art direction, films, portrait, nature, architecture, abstract, urban, fashion, minimal, texture, experimental

Return a JSON object with a "tags" array of strings. Only use tags from the list above.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    file_urls: item.content_type !== 'text' && item.file_url && item.file_url.includes('supabase') ? [item.file_url] : undefined,
    response_json_schema: {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } }
      }
    }
  });

  const tags = result?.tags || [];
  await base44.asServiceRole.entities.MediaItem.update(entity_id, { tags });

  return Response.json({ success: true, tags });
});