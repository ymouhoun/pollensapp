import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { baseUrl } = await req.json();
  if (!baseUrl) return Response.json({ error: 'Missing baseUrl' }, { status: 400 });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${baseUrl}/interrupt`, {
      method: 'POST',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    return Response.json({ success: res.ok });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});