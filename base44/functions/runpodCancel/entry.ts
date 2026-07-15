import { createClientFromRequest } from 'npm:@base44/sdk@0.8.39';

const RUNPOD_API_KEY = Deno.env.get('RUNPOD_API_KEY');

function resolveEndpointId(model: string) {
  const configuredEndpoints = Deno.env.get('RUNPOD_ENDPOINTS_JSON');
  if (configuredEndpoints) {
    try {
      const endpoints = JSON.parse(configuredEndpoints);
      return endpoints[model] || null;
    } catch {
      throw new Error('RUNPOD_ENDPOINTS_JSON is not valid JSON');
    }
  }
  return model === 'editorial' ? Deno.env.get('RUNPOD_ENDPOINT_ID') : null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!RUNPOD_API_KEY) {
      return Response.json({ error: 'RUNPOD_API_KEY is not configured' }, { status: 500 });
    }

    const { jobId, model = 'editorial' } = await req.json();
    if (!jobId) return Response.json({ error: 'Missing jobId' }, { status: 400 });

    const endpointId = resolveEndpointId(model);
    if (!endpointId) {
      return Response.json({ error: `No RunPod endpoint configured for model "${model}"` }, { status: 500 });
    }

    const response = await fetch(`https://api.runpod.ai/v2/${endpointId}/cancel/${encodeURIComponent(jobId)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return Response.json({ error: data.error || `RunPod cancellation failed (${response.status})` }, { status: 502 });
    }

    return Response.json({ cancelled: true, jobId, status: data.status || 'CANCELLED' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
