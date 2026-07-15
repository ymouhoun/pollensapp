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

function normalizeStatus(status: string) {
  if (status === 'IN_QUEUE') return 'queued';
  if (status === 'IN_PROGRESS') return 'running';
  if (status === 'COMPLETED') return 'completed';
  if (status === 'CANCELLED') return 'cancelled';
  if (['FAILED', 'TIMED_OUT', 'ERROR'].includes(status)) return 'failed';
  return 'unknown';
}

function readUint32(bytes: Uint8Array, offset: number) {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function writeUint32(value: number) {
  return new Uint8Array([(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]);
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  }
  return btoa(binary);
}

function embedWorkflow(imageData: unknown, workflow: unknown) {
  if (typeof imageData !== 'string' || !workflow) return imageData;
  const prefix = imageData.startsWith('data:') ? imageData.slice(0, imageData.indexOf(',') + 1) : '';
  const rawBase64 = prefix ? imageData.slice(prefix.length) : imageData;
  const bytes = Uint8Array.from(atob(rawBase64), (char) => char.charCodeAt(0));
  if (bytes.length < 12 || readUint32(bytes, 0) !== 0x89504e47) return imageData;

  let iendOffset = -1;
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = readUint32(bytes, offset);
    const type = new TextDecoder().decode(bytes.subarray(offset + 4, offset + 8));
    if (type === 'IEND') {
      iendOffset = offset;
      break;
    }
    offset += 12 + length;
  }
  if (iendOffset < 0) return imageData;

  const encoder = new TextEncoder();
  const type = encoder.encode('iTXt');
  const chunkData = concatBytes([
    encoder.encode('workflow'),
    new Uint8Array([0, 0, 0, 0, 0]),
    encoder.encode(JSON.stringify(workflow)),
  ]);
  const checksum = crc32(concatBytes([type, chunkData]));
  const chunk = concatBytes([writeUint32(chunkData.length), type, chunkData, writeUint32(checksum)]);
  const embedded = concatBytes([bytes.subarray(0, iendOffset), chunk, bytes.subarray(iendOffset)]);
  return prefix + bytesToBase64(embedded);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!RUNPOD_API_KEY) {
      return Response.json({ error: 'RUNPOD_API_KEY is not configured' }, { status: 500 });
    }

    const { jobId, model = 'editorial', workflow } = await req.json();
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
      data: image.type === 's3_url' ? image.data : embedWorkflow(image.data, workflow),
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
