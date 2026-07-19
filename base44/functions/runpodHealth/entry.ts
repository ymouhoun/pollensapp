import { createClientFromRequest } from 'npm:@base44/sdk@0.8.39';

const RUNPOD_API_KEY = Deno.env.get('RUNPOD_API_KEY');

function resolveEndpointId(model: string) {
  const endpointOverride = Deno.env.get(
    `RUNPOD_ENDPOINT_ID_${model.toUpperCase().replace(/-/g, '_')}`,
  )?.trim();
  if (endpointOverride) return endpointOverride;

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

function formatGpuName(value: unknown) {
  const name = String(value || 'GPU');
  if (/B200/i.test(name)) return 'B200';
  if (/H200/i.test(name)) return 'H200';
  if (/RTX.*6000|6000.*RTX/i.test(name)) return 'RTX 6000 PRO';
  return name.replace(/^NVIDIA\s+/i, '');
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

    const headers = { Authorization: `Bearer ${RUNPOD_API_KEY}` };
    const [response, endpointResponse] = await Promise.all([
      fetch(`https://api.runpod.ai/v2/${endpointId}/health`, {
        headers,
        signal: AbortSignal.timeout(15000),
      }),
      fetch(`https://rest.runpod.io/v1/endpoints/${endpointId}?includeWorkers=true`, {
        headers,
        signal: AbortSignal.timeout(15000),
      }),
    ]);

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return Response.json({ error: data.error || `RunPod health check failed (${response.status})` }, { status: 502 });
    }

    const endpoint = endpointResponse.ok
      ? await endpointResponse.json().catch(() => ({}))
      : {};
    const activeWorkers = Array.isArray(endpoint.workers) ? endpoint.workers : [];
    const activeWorker = activeWorkers.sort((a, b) =>
      new Date(b.lastStartedAt || 0).getTime() - new Date(a.lastStartedAt || 0).getTime()
    )[0];
    const gpuName = formatGpuName(
      activeWorker?.gpu?.displayName ||
      activeWorker?.machine?.gpuDisplayName ||
      activeWorker?.machine?.gpuType?.displayName ||
      endpoint.gpuTypeIds?.[0]
    );

    return Response.json({
      ready: true,
      model,
      gpuName,
      workers: data.workers || {},
      jobs: data.jobs || {},
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
