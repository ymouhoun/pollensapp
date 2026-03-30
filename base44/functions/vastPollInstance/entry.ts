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
  
  // The API may return the instance directly, or wrapped in an object
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

  // Try to find the public URL for port 3000
  const ports = instance.ports || {};
  const port3000 = ports["3000/tcp"];

  // Method 1: Docker-style port mapping (array of host:port entries)
  if (port3000 && Array.isArray(port3000) && port3000.length > 0) {
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

  // Method 2: Vast direct port mapping (public_ipaddr + port offset)
  if (instance.public_ipaddr && instance.direct_port_start > 0 && instance.direct_port_end > 0) {
    // In direct mode, container port 3000 maps to direct_port_start + offset
    // The offset is typically 0 for the first (and only) exposed port
    const mappedPort = instance.direct_port_start;
    return Response.json({
      status: "ports_ready",
      baseUrl: `http://${instance.public_ipaddr}:${mappedPort}`,
      actualStatus: instance.actual_status || instance.status,
    });
  }

  return Response.json({
    status: "waiting",
    actualStatus: instance.actual_status || instance.status,
  });
});