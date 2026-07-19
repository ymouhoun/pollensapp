import { createClientFromRequest } from 'npm:@base44/sdk@0.8.39';

// Deployment refresh: 2026-07-19
const RUNPOD_API_KEY = Deno.env.get('RUNPOD_API_KEY');

const MODEL_CHECKPOINTS: Record<string, string> = {
  editorial: 'edito04.safetensors',
  ambrojo: 'ambrojo04.safetensors',
  'still-life': 'naturemorte04.safetensors',
  '35mm': '35mm04.safetensors',
  stills: 'stills_q.safetensors',
  super16: 'super16_q.safetensors',
  beauty: 'beauty_q.safetensors',
};

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

function resolveCheckpoint(model: string) {
  const checkpoint = MODEL_CHECKPOINTS[model];
  if (!checkpoint) throw new Error(`Unknown model "${model}"`);
  return checkpoint;
}

function numberOrDefault(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildWorkflow(input: Record<string, unknown>, checkpoint: string) {
  const positivePrompt = String(input.positivePrompt || '').trim();
  if (!positivePrompt) throw new Error('The prompt is empty');
  const complementaryPrompt = String(input.complementaryPrompt === undefined ? 'shot on Hasselblad X2D, 100MP, natural skin texture, high-fashion editorial, Harper’s Bazaar style, slight asymmetry in facial features, slight wrinkles or dimples' : input.complementaryPrompt).trim();

  const seed = Math.max(0, Math.floor(numberOrDefault(input.seed, Date.now())));
  const steps = Math.max(1, Math.min(100, Math.floor(numberOrDefault(input.steps, 45))));
  const cfg = Math.max(0, Math.min(20, numberOrDefault(input.cfg, 3.5)));
  const rescaleCfg = Math.max(0, Math.min(1, numberOrDefault(input.rescaleCfg, 0.7)));
  const rescaleEnabled = input.rescaleEnabled !== false;
  const megapixels = Math.max(0.1, Math.min(4, numberOrDefault(input.megapixels, 1.7)));
  const batchSize = Math.max(1, Math.min(4, Math.floor(numberOrDefault(input.batchSize, 1))));
  const shift = Math.max(0, Math.min(3, numberOrDefault(input.shift, 1.2)));
  const aspectRatio = String(input.aspectRatio || '3:4 (Golden Ratio)');
  const sampler = String(input.sampler || 'res_2s');
  const scheduler = String(input.scheduler || 'kl_optimal');

  return {
    '808': {
      inputs: { clip_name: 'qwen_2.5_VL_7b_fp8_scaled.safetensors', type: 'qwen_image', device: 'default' },
      class_type: 'CLIPLoader',
      _meta: { title: 'Load CLIP' },
    },
    '809': {
      inputs: {
        text: complementaryPrompt,
        clip: ['808', 0],
      },
      class_type: 'CLIPTextEncode',
      _meta: { title: 'Positive Prompt (Style)' },
    },
    '810': {
      inputs: { conditioning_1: ['818', 0], conditioning_2: ['809', 0] },
      class_type: 'ConditioningCombine',
      _meta: { title: 'Conditioning (Combine)' },
    },
    '811': {
      inputs: {
        text: 'unrealistic, plastic skin, cgi, low resolution, wrong anatomy, stock photo, flat lighting, logo, text, over-smoothed face',
        clip: ['808', 0],
      },
      class_type: 'CLIPTextEncode',
      _meta: { title: 'Negative Prompt' },
    },
    '812': {
      inputs: { vae_name: 'qwen_image_vae.safetensors' },
      class_type: 'VAELoader',
      _meta: { title: 'Load VAE' },
    },
    '814': {
      inputs: { shift, model: ['817', 0] },
      class_type: 'ModelSamplingAuraFlow',
      _meta: { title: 'ModelSamplingAuraFlow' },
    },
    '815': {
      inputs: { samples: ['823', 0], vae: ['812', 0] },
      class_type: 'VAEDecode',
      _meta: { title: 'VAE Decode' },
    },
    '817': {
      inputs: { unet_name: checkpoint, weight_dtype: 'default' },
      class_type: 'UNETLoader',
      _meta: { title: 'Load Diffusion Model' },
    },
    '818': {
      inputs: { text: positivePrompt, clip: ['808', 0] },
      class_type: 'CLIPTextEncode',
      _meta: { title: 'Positive Prompt' },
    },
    '819': {
      inputs: {
        megapixel: String(megapixels),
        aspect_ratio: aspectRatio,
        divisible_by: '64',
        custom_ratio: false,
        custom_aspect_ratio: '1:1',
      },
      class_type: 'FluxResolutionNode',
      _meta: { title: 'Flux Resolution Calc' },
    },
    '820': {
      inputs: { width: ['819', 0], height: ['819', 1], batch_size: batchSize },
      class_type: 'EmptySD3LatentImage',
      _meta: { title: 'EmptySD3LatentImage' },
    },
    '822': {
      inputs: { multiplier: rescaleCfg, model: ['814', 0] },
      class_type: 'RescaleCFG',
      _meta: { title: 'RescaleCFG' },
    },
    '823': {
      inputs: {
        seed,
        steps,
        cfg,
        sampler_name: sampler,
        scheduler,
        denoise: 1,
        model: rescaleEnabled ? ['822', 0] : ['814', 0],
        positive: ['810', 0],
        negative: ['811', 0],
        latent_image: ['820', 0],
      },
      class_type: 'KSampler',
      _meta: { title: 'KSampler' },
    },
    '825': {
      inputs: { filename_prefix: 'pollen', images: ['815', 0] },
      class_type: 'SaveImage',
      _meta: { title: 'Save Image' },
    },
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!RUNPOD_API_KEY) {
      return Response.json({ error: 'RUNPOD_API_KEY is not configured' }, { status: 500 });
    }

    const input = await req.json();
    const model = String(input.model || 'editorial');
    const checkpoint = resolveCheckpoint(model);
    const endpointId = resolveEndpointId(model);
    if (!endpointId) {
      return Response.json({ error: `No RunPod endpoint configured for model "${model}"` }, { status: 500 });
    }

    const workflow = buildWorkflow(input, checkpoint);
    const response = await fetch(`https://api.runpod.ai/v2/${endpointId}/run`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { workflow },
        policy: { executionTimeout: 900000, ttl: 3600000 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.id) {
      return Response.json({ error: data.error || `RunPod submission failed (${response.status})` }, { status: 502 });
    }

    return Response.json({
      jobId: data.id,
      status: data.status || 'IN_QUEUE',
      model,
      endpointRef: endpointId.slice(-6),
      workflow,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});