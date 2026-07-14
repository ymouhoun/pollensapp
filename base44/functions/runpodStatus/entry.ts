import { createClientFromRequest } from 'npm:@base44/sdk@0.8.39';

const RUNPOD_API_KEY = Deno.env.get('RUNPOD_API_KEY');

function resolveEndpointId() {
  return Deno.env.get('RUNPOD_ENDPOINT_ID');
}

function normalizeStatus(status: string) {
  if (status === 'IN_QUEUE') return 'queued';
  if (status === 'IN_PROGRESS') return 'running';
  if (status === 'COMPLETED') return 'completed';
  if (status === 'CANCELLED') return 'cancelled';
  if (['FAILED', 'TIMED_OUT', 'ERROR'].includes(status)) return 'failed';
  return 'unknown';
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

    const response = await fetch(`https://api.runpod.ai/v2/${endpointId}/status/${encodeURIComponent(jobId)}`, {
      headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return Response.json({ error: data.error || `RunPod status failed (${response.status})` }, { status: 502 });
    }

    const normalizedStatus = normalizeStatus(data.status);
    const output = data.output && typeof data.output === 'object' ? data.output : {};
    const images = Array.isArray(output.images) ? output.images : [];
    const normalizedImages = images.map((image: Record<string, unknown>) => ({
      filename: image.filename || 'generation.png',
      type: image.type || 'base64',
      data: image.data,
    }));
    const firstImage = normalizedImages[0] || null;

    // A customized worker can publish { step, total, previewImage } through
    // runpod.serverless.progress_update(). The stock worker simply leaves this empty.
    const progressCandidate = output.progress || data.progress || (
      normalizedStatus === 'running' && !output.images ? output : null
    );
    const progress = progressCandidate && typeof progressCandidate === 'object'
      ? {
          step: Number(progressCandidate.step || progressCandidate.value || 0),
          total: Number(progressCandidate.total || progressCandidate.max || 0),
          previewImage: progressCandidate.previewImage || progressCandidate.preview_image || null,
        }
      : null;

    return Response.json({
      status: normalizedStatus,
      rawStatus: data.status,
      delayTime: data.delayTime || 0,
      executionTime: data.executionTime || 0,
      progress,
      image: firstImage,
      images: normalizedImages,
      error: normalizedStatus === 'failed'
        ? (output.error || data.error || output.details || 'Generation failed')
        : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});