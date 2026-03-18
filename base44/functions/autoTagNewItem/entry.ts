import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ALL_TAGS = ['EDITORIAL', 'BEAUTY', 'STILL LIFE', 'SET DESIGN', '35MM', 'SUPER16', 'B&W', 'BAROQUE', 'OBJECTS', 'ORGANIC', '8MM', 'STILLS', 'ANAMORPHIC', 'LIGHT', 'GOTHIC', 'PORTRAITS'];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  const item = body.data;
  if (!item) return Response.json({ skipped: 'no data' });
  if (item.content_type !== 'image' || !item.file_url) return Response.json({ skipped: 'not an image' });
  if (item.tags?.length > 0 && item.color_palette) return Response.json({ skipped: 'already tagged' });

  const prompt = `You are a visual curator. Analyze this image and return:
1. Up to 4 tags from this list: ${ALL_TAGS.join(', ')}
2. The dominant color palette from: warm, cool, neutral, dark, light, monochrome

Return JSON only.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    file_urls: [item.file_url],
    response_json_schema: {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
        color_palette: { type: 'string' }
      }
    }
  });

  const tags = (result.tags || []).filter(t => ALL_TAGS.includes(t));
  const color_palette = result.color_palette || null;

  await base44.asServiceRole.entities.MediaItem.update(item.id, { tags, color_palette });

  return Response.json({ success: true, tags, color_palette });
});