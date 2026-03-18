import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { baseUrl } = await req.json();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${baseUrl}/system_stats`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      return Response.json({ ready: true });
    }
    return Response.json({ ready: false });
  } catch {
    return Response.json({ ready: false });
  }
});