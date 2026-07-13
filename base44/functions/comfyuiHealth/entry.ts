import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { baseUrl: requestedBaseUrl } = await req.json();
    if (!requestedBaseUrl) return Response.json({ error: 'Missing baseUrl' }, { status: 400 });

    const baseUrl = requestedBaseUrl.replace(
      /^http:\/\/(\d+\.\d+\.\d+\.\d+)(:\d+)/,
      'http://$1.nip.io$2'
    );
    const endpoints = ['/system_stats', '/queue', '/prompt'];
    const checks = [];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(`${baseUrl}${endpoint}`, {
          signal: AbortSignal.timeout(10000),
        });
        checks.push({ endpoint, status: res.status });
        if (res.ok) {
          return Response.json({ ready: true, endpoint, baseUrl });
        }
      } catch (error) {
        checks.push({ endpoint, error: error.message });
      }
    }

    return Response.json({ ready: false, detail: 'ComfyUI is unreachable', checks });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});