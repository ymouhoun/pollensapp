import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const VAST_API_KEY = Deno.env.get("VAST_API_KEY");

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { debug } = await req.json().catch(() => ({}));

  const res = await fetch(
    `https://console.vast.ai/api/v0/instances/?api_key=${VAST_API_KEY}`
  );

  if (!res.ok) {
    const text = await res.text();
    return Response.json({ error: `List failed: ${res.status} ${text}` }, { status: 502 });
  }

  const data = await res.json();
  const instances = data.instances || (Array.isArray(data) ? data : []);

  // Return running instances with their connection info
  const running = instances
    .filter(i => i.actual_status === 'running')
    .map(i => {
      let baseUrl = null;
      const ip = i.public_ipaddr;
      const ports = i.ports;

      // Always use public_ipaddr (direct IP) — never HostIp (0.0.0.0) or Vast proxy
      if (ip && ports && typeof ports === 'object') {
        const mapping = ports["3000/tcp"];
        if (mapping && Array.isArray(mapping) && mapping.length > 0) {
          const port = mapping[0].HostPort;
          if (port) baseUrl = `http://${ip}:${port}`;
        }
      }

      const result = {
        instanceId: i.id,
        baseUrl,
        gpuName: i.gpu_name,
        costPerHour: i.dph_total,
        status: i.actual_status,
      };

      if (debug) {
        result.ports = i.ports;
        result.public_ipaddr = i.public_ipaddr;
      }

      return result;
    });

  return Response.json({ instances: running });
});