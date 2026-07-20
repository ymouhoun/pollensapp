import { createClientFromRequest } from 'npm:@base44/sdk@0.8.39';

// Deployment refresh: 2026-07-20T01:35+02:00 — tolerate queue-health propagation delays.
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
  if (!value) return null;
  const name = String(value);
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
    const endpoint = await endpointResponse.json().catch(() => ({}));

    // A Serverless endpoint can legitimately have zero active workers. The
    // management API is therefore the authoritative existence check. The
    // queue /health route is useful for metrics, but a transient 404 during a
    // release must not prevent the studio from opening.
    if (!endpointResponse.ok && !response.ok) {
      const endpointRef = endpointId.slice(-6);
      return Response.json({
        error: endpoint.error || data.error ||
          `RunPod endpoint ${endpointRef} was not found (REST ${endpointResponse.status}, health ${response.status})`,
        endpointRef,
      }, { status: 502 });
    }
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
      endpointRef: endpointId.slice(-6),
      gpuName,
      workerConnected: Boolean(activeWorker),
      workers: data.workers || {},
      jobs: data.jobs || {},
      healthAvailable: response.ok,
      healthWarning: response.ok ? null : `RunPod health returned ${response.status}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
