import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { baseUrl } = await req.json();
  if (!baseUrl) return Response.json({ error: 'Missing baseUrl' }, { status: 400 });

  const res = await fetch(`${baseUrl}/interrupt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json({ error: `Interrupt failed: ${res.status} ${text}` }, { status: 502 });
  }

  return Response.json({ interrupted: true });
});