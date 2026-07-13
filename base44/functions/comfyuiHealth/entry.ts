import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { baseUrl } = await req.json();

    const endpoints = ['/system_stats', '/queue', '/prompt'];
    
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`${baseUrl}${endpoint}`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          return Response.json({ ready: true, endpoint });
        }
      } catch (e) {
        // Network error / timeout — continue
      }
    }

    return Response.json({ ready: false, detail: 'all endpoints returned non-OK or unreachable' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});