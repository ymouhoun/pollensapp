import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { baseUrl } = await req.json();

  // Try /system_stats first (confirms ComfyUI is fully loaded)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${baseUrl}/system_stats`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      return Response.json({ ready: true, endpoint: 'system_stats' });
    }
    return Response.json({ ready: false, detail: `system_stats returned ${res.status}` });
  } catch (e) {
    // Fallback: try /queue endpoint (lighter, available earlier)
    try {
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 10000);
      const res2 = await fetch(`${baseUrl}/queue`, { signal: controller2.signal });
      clearTimeout(timeout2);
      if (res2.ok) {
        return Response.json({ ready: true, endpoint: 'queue' });
      }
      return Response.json({ ready: false, detail: `queue returned ${res2.status}` });
    } catch (e2) {
      return Response.json({ ready: false, detail: `both endpoints unreachable: ${e.message}` });
    }
  }
});