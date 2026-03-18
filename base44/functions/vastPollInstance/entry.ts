import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const VAST_API_KEY = Deno.env.get("VAST_API_KEY");

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { instanceId } = await req.json();
  if (!instanceId) return Response.json({ error: 'Missing instanceId' }, { status: 400 });

  const url = `https://console.vast.ai/api/v0/instances/${instanceId}/?api_key=${VAST_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    return Response.json({ error: `Poll failed: ${res.status} ${text}` }, { status: 500 });
  }

  const data = await res.json();
  const instances = data.instances || [data];
  const instance = instances.find(i => String(i.id) === String(instanceId)) || instances[0];

  if (!instance) {
    return Response.json({ status: "not_found" });
  }

  // Check for port 3000 mapping
  const ports = instance.ports || {};
  const port3000 = ports["3000/tcp"];

  if (port3000 && port3000.length > 0) {
    const entry = port3000[0];
    const host = entry.HostIp || entry.hostIp || entry.host;
    const port = entry.HostPort || entry.hostPort || entry.port;
    if (host && port) {
      return Response.json({
        status: "ports_ready",
        baseUrl: `http://${host}:${port}`,
        actualStatus: instance.actual_status || instance.status,
      });
    }
  }

  return Response.json({
    status: "waiting",
    actualStatus: instance.actual_status || instance.status,
  });
});