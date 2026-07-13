import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const VAST_API_KEY = Deno.env.get("VAST_API_KEY");

Deno.serve(async (req) => {
  try {
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

    let instance = null;
    if (data.id) {
      instance = data;
    } else if (Array.isArray(data.instances)) {
      instance = data.instances.find(i => String(i.id) === String(instanceId)) || data.instances[0];
    } else if (data.instances && typeof data.instances === 'object') {
      instance = data.instances;
    }

    if (!instance) {
      return Response.json({ status: "not_found" });
    }

    const ip = instance.public_ipaddr;
    const ports = instance.ports || {};
    const port3000 = ports["3000/tcp"];
    const actualStatus = instance.actual_status || instance.status;

    if (ip && port3000 && Array.isArray(port3000) && port3000.length > 0) {
      const mappedPort = port3000[0].HostPort || port3000[0].hostPort || port3000[0].port;
      if (mappedPort) {
        return Response.json({
          status: "ports_ready",
          baseUrl: `http://${ip}.nip.io:${mappedPort}`,
          actualStatus,
        });
      }
    }

    if (ip && instance.direct_port_start > 0) {
      return Response.json({
        status: "ports_ready",
        baseUrl: `http://${ip}.nip.io:${instance.direct_port_start}`,
        actualStatus,
      });
    }

    return Response.json({
      status: "waiting",
      actualStatus,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});