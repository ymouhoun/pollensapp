import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { batchSize = 10 } = await req.json();

  // Get enriched images that still have generic titles (e.g. "campaigns 524", "anamorphic 245")
  const items = await base44.asServiceRole.entities.MediaItem.filter(
    { content_type: 'image', enrichment_status: 'done' },
    '-created_date',
    200
  );

  // Filter to items that likely have auto-generated/generic titles
  const needsRename = items.filter(item => {
    if (!item.title) return true;
    if (!item.caption_universal) return false; // need caption to generate title
    // Generic pattern: word + numbers, or empty
    return /^[a-zA-Z\s]+\d+$/.test(item.title.trim());
  }).slice(0, batchSize);

  if (needsRename.length === 0) {
    return Response.json({ message: 'All items already have meaningful titles', processed: 0 });
  }

  const results = [];

  for (const item of needsRename) {
    try {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are an art director naming images for a lookbook. Given this image description, generate a short, evocative title (2-5 words). Lowercase, poetic but descriptive. Examples: "amber light on linen", "solitude in concrete", "hands through tall grass", "the red chair".

Description: ${item.caption_universal}`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' }
          }
        }
      });

      const newTitle = result.title || '';
      if (newTitle) {
        await base44.asServiceRole.entities.MediaItem.update(item.id, { title: newTitle });
        results.push({ id: item.id, oldTitle: item.title, newTitle, status: 'ok' });
      } else {
        results.push({ id: item.id, status: 'skipped', reason: 'no title generated' });
      }
    } catch (e) {
      results.push({ id: item.id, status: 'error', error: e.message });
    }
  }

  return Response.json({ processed: results.length, remaining: needsRename.length - results.length, results });
});