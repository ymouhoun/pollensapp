import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { batchSize = 3 } = await req.json();
    const size = Math.max(1, Math.min(10, Number(batchSize) || 3));
    const items = await base44.asServiceRole.entities.MediaItem.list('-created_date', 500);
    const images = items.filter(i => i.content_type === 'image' && i.file_url);
    const queue = images.filter(i => i.analysis_status !== 'completed' && (i.analysis_status !== 'processing' || Date.now() - new Date(i.analysis_locked_at || 0).getTime() >= 15 * 60 * 1000)).slice(0, size);
    const results = [];
    for (const item of queue) {
      try {
        await base44.asServiceRole.entities.MediaItem.update(item.id, { analysis_status: 'pending', analysis_error: '' });
        const response = await base44.functions.invoke('analyzeMedia', { entity_id: item.id });
        results.push({ id: item.id, status: response.data?.status || response.data?.skipped || 'completed' });
      } catch (error) {
        results.push({ id: item.id, status: 'failed', error: error.message });
      }
    }
    const refreshed = await base44.asServiceRole.entities.MediaItem.list('-created_date', 500);
    const current = refreshed.filter(i => i.content_type === 'image' && i.file_url);
    const completed = current.filter(i => i.analysis_status === 'completed').length;
    const failed = current.filter(i => i.analysis_status === 'failed').length;
    return Response.json({ processedThisBatch: results.length, total: current.length, completed, failed, remaining: current.length - completed, progress: current.length ? Math.round(completed / current.length * 100) : 100, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});