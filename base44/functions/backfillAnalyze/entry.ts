import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

  const { limit = 10 } = await req.json();

  // Fetch items that haven't been analyzed yet (no caption)
  const allItems = await base44.asServiceRole.entities.MediaItem.list('-created_date', 500);
  const toProcess = allItems.filter(
    item => item.content_type === 'image' && item.file_url && (!item.caption || item.caption === '')
  ).slice(0, limit);

  let processed = 0;
  const results = [];

  for (const item of toProcess) {
    try {
      const res = await base44.asServiceRole.functions.invoke('analyzeMedia', { entity_id: item.id });
      results.push({ id: item.id, status: 'success' });
      processed++;
    } catch (e) {
      results.push({ id: item.id, status: 'error', error: e.message });
    }
  }

  return Response.json({
    processed,
    remaining: toProcess.length - processed,
    totalUnanalyzed: allItems.filter(i => i.content_type === 'image' && i.file_url && (!i.caption || i.caption === '')).length,
    results,
  });
});