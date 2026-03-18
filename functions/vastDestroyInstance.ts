import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const VAST_API_KEY = Deno.env.get("VAST_API_KEY");

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { instanceId } = await req.json();
  if (!instanceId) return Response.json({ error: 'Missing instanceId' }, { status: 400 });

  const url = `https://console.vast.ai/api/v0/instances/${instanceId}/?api_key=${VAST_API_KEY}`;

  const res = await fetch(url, { method: "DELETE" });

  if (!res.ok) {
    const text = await res.text();
    return Response.json({ error: `Destroy failed: ${res.status} ${text}` }, { status: 500 });
  }

  return Response.json({ success: true });
});