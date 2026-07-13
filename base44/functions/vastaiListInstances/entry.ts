import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const VAST_API_KEY = Deno.env.get("VAST_API_KEY");

Deno.serve(async (req) => {
  try {
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

    const running = [];

    for (const i of instances) {
      if (!['running', 'loading', 'creating', 'pulling'].includes(i.actual_status)) continue;

      let baseUrl = null;
      const ip = i.public_ipaddr;
      const ports = i.ports;

      if (ip && ports && typeof ports === 'object') {
        const mapping = ports["3000/tcp"];
        if (mapping && Array.isArray(mapping) && mapping.length > 0) {
          const port = mapping[0].HostPort;
          if (port) {
            baseUrl = `http://${ip}.nip.io:${port}`;
          }
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

      running.push(result);
    }

    return Response.json({ instances: running });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});