import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { entity_id } = await req.json();

  const item = await base44.asServiceRole.entities.MediaItem.get(entity_id);
  if (!item) return Response.json({ skipped: true });

  let prompt = '';
  if (item.content_type === 'text') {
    prompt = `Analyze this text/quote and pick 1-4 relevant tags.\nText: "${item.text_content}"`;
  } else {
    prompt = `Analyze this image and pick 1-4 relevant tags based on title and collection.\nTitle: "${item.title || ''}"\nCollection: "${item.collection || ''}"`;
  }

  prompt += `\n\nAvailable tags (only use from this list):
ia, design, photography, eros, 3d, peinture, littérature, art direction, films, portrait, nature, architecture, abstract, urban, fashion, minimal, texture, experimental

Return JSON: {"tags": [...]}`;

  const isUploadedFile = item.content_type !== 'text' && item.file_url && item.file_url.includes('supabase');

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    file_urls: isUploadedFile ? [item.file_url] : undefined,
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