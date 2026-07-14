import { createClientFromRequest } from 'npm:@base44/sdk@0.8.39';

const RUNPOD_API_KEY = Deno.env.get('RUNPOD_API_KEY');

function resolveEndpointId() {
  return Deno.env.get('RUNPOD_ENDPOINT_ID');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!RUNPOD_API_KEY) {
      return Response.json({ error: 'RUNPOD_API_KEY is not configured' }, { status: 500 });
    }

    const { model = 'editorial' } = await req.json().catch(() => ({}));
    const endpointId = resolveEndpointId(model);
    if (!endpointId) {
      return Response.json({ error: `No RunPod endpoint configured for model "${model}"` }, { status: 500 });
    }

    const response = await fetch(`https://api.runpod.ai/v2/${endpointId}/health`, {
      headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return Response.json({ error: data.error || `RunPod health check failed (${response.status})` }, { status: 502 });
    }

    return Response.json({
      ready: true,
      model,
      gpuName: 'RunPod Serverless',
      workers: data.workers || {},
      jobs: data.jobs || {},
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});