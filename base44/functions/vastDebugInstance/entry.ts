import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const VAST_API_KEY = Deno.env.get("VAST_API_KEY");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { instanceId } = await req.json();
    
    const res = await fetch(
      `https://console.vast.ai/api/v0/instances/${instanceId}/?api_key=${VAST_API_KEY}`
    );
    
    if (!res.ok) {
      return Response.json({ error: `${res.status} ${await res.text()}` }, { status: 502 });
    }

    const raw = await res.json();
    let data = raw;
    if (raw.instances) {
      const arr = Array.isArray(raw.instances) ? raw.instances : [raw.instances];
      data = arr.find(i => String(i.id) === String(instanceId)) || arr[0] || raw;
    }
    
    const keys = Object.keys(data);
    const pick = {};
    for (const k of keys) {
      const val = data[k];
      if (k.includes('env') || k.includes('extra') || k === 'onstart' || k === 'image' || k === 'ports' || k === 'actual_status' || k === 'status_msg' || k === 'gpu_name' || k === 'inet_down' || k === 'start_date' || k === 'docker_flags' || k === 'image_args' || k === 'image_runtype') {
        pick[k] = typeof val === 'object' ? JSON.stringify(val).slice(0, 500) : String(val).slice(0, 500);
      }
    }
    
    return Response.json({ totalKeys: keys.length, pick });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});