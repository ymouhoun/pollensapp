import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const VAST_API_KEY = Deno.env.get("VAST_API_KEY");

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { instanceId } = await req.json();

  const res = await fetch(
    `https://console.vast.ai/api/v0/instances/${instanceId}/?api_key=${VAST_API_KEY}`
  );

  if (!res.ok) {
    const text = await res.text();
    return Response.json({ error: `Poll failed: ${res.status} ${text}` }, { status: 502 });
  }

  const data = await res.json();
  console.log('vastaiPoll raw response keys:', Object.keys(data), 'id:', data.id, 'instances:', !!data.instances);
  
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
    return Response.json({ status: 'not_found' });
  }

  // Extract port mapping for 3000/tcp
  let baseUrl = null;
  const ports = instance.ports;
  if (ports && typeof ports === 'object') {
    // ports can be like {"3000/tcp": [{"HostIp": "x.x.x.x", "HostPort": "12345"}]}
    const mapping = ports['3000/tcp'];
    if (mapping && mapping.length > 0) {
      const host = instance.public_ipaddr || mapping[0].HostIp;
      const port = mapping[0].HostPort;
      if (host && port) {
        baseUrl = `http://${host}:${port}`;
      }
    }
  }

  return Response.json({
    status: instance.actual_status || instance.status_msg || 'loading',
    baseUrl,
    gpuName: instance.gpu_name,
    costPerHour: instance.dph_total,
  });
});