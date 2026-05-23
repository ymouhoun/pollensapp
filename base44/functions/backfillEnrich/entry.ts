import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Backfill: enrich all un-enriched image items
// Call with { batchSize: 5 } to control throughput
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

  const { batchSize = 5 } = await req.json();

  // Get items that haven't been enriched yet
  const items = await base44.asServiceRole.entities.MediaItem.filter(
    { content_type: 'image', enrichment_status: 'pending' },
    '-created_date',
    batchSize
  );

  if (items.length === 0) {
    // Also check items with no enrichment_status set
    const legacy = await base44.asServiceRole.entities.MediaItem.list('-created_date', 200);
    const unenriched = legacy.filter(i =>
      i.content_type === 'image' &&
      i.file_url &&
      !i.enrichment_status
    ).slice(0, batchSize);

    if (unenriched.length === 0) {
      return Response.json({ message: 'All items enriched', processed: 0 });
    }

    // Mark them as pending first, then process
    const results = [];
    for (const item of unenriched) {
      try {
        await base44.asServiceRole.functions.invoke('enrichMedia', { entity_id: item.id });
        results.push({ id: item.id, status: 'ok' });
      } catch (e) {
        results.push({ id: item.id, status: 'error', error: e.message });
      }
    }

    return Response.json({ processed: results.length, results });
  }

  const results = [];
  for (const item of items) {
    try {
      await base44.asServiceRole.functions.invoke('enrichMedia', { entity_id: item.id });
      results.push({ id: item.id, status: 'ok' });
    } catch (e) {
      results.push({ id: item.id, status: 'error', error: e.message });
    }
  }

  return Response.json({ processed: results.length, results });
});