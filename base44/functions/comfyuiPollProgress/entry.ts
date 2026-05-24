import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { baseUrl, promptId } = await req.json();
  if (!baseUrl || !promptId) return Response.json({ error: 'Missing baseUrl or promptId' }, { status: 400 });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${baseUrl}/history/${promptId}`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      // History not available yet — check queue status
      const queueRes = await fetch(`${baseUrl}/queue`);
      if (queueRes.ok) {
        const queue = await queueRes.json();
        const running = queue.queue_running || [];
        const pending = queue.queue_pending || [];
        const isRunning = running.some(item => item[1] === promptId);
        const isPending = pending.some(item => item[1] === promptId);
        return Response.json({ status: isRunning ? 'running' : isPending ? 'pending' : 'unknown' });
      }
      return Response.json({ status: 'waiting' });
    }

    const history = await res.json();
    const entry = history[promptId];

    if (!entry) {
      return Response.json({ status: 'waiting' });
    }

    if (entry.status?.status_str === 'error') {
      return Response.json({ status: 'error', error: 'Execution failed' });
    }

    // Check if completed — look for SaveImage output on node 15
    const outputs = entry.outputs || {};
    const saveOutput = outputs['15'];
    if (saveOutput && saveOutput.images && saveOutput.images.length > 0) {
      return Response.json({
        status: 'completed',
        filename: saveOutput.images[0].filename,
        subfolder: saveOutput.images[0].subfolder || '',
      });
    }

    return Response.json({ status: 'running' });
  } catch (error) {
    return Response.json({ status: 'error', error: error.message });
  }
});