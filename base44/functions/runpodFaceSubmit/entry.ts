import { createClientFromRequest } from 'npm:@base44/sdk@0.8.39';

// Deployment refresh: 2026-07-19T21:40+02:00
const RUNPOD_API_KEY = Deno.env.get('RUNPOD_API_KEY');
const INPUT_IMAGE_NAME = 'pollen-face-input.jpg';

const MODEL_CHECKPOINTS: Record<string, string> = {
  editorial: 'edito04.safetensors',
  ambrojo: 'ambrojo04.safetensors',
  'still-life': 'naturemorte04.safetensors',
  '35mm': '35mm04.safetensors',
  stills: 'stills_q.safetensors',
  super16: 'super16_q.safetensors',
  beauty: 'beauty_q.safetensors',
};

type FaceLora = {
  id: string;
  source: string;
  defaultStrength: number;
  strengths: Record<string, number>;
  models: string[];
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

function safeSource(value: unknown) {
  const source = String(value || '').trim();
  if (
    !source.startsWith('loras/')
    || !source.endsWith('.safetensors')
    || source.includes('..')
    || !/^loras\/[a-zA-Z0-9._\-/]+\.safetensors$/.test(source)
  ) throw new Error('Invalid Face LoRA source');
  return source;
}

function readFaceLoras(): FaceLora[] {
  const raw = Deno.env.get('FACE_LORAS_JSON');
  if (!raw) throw new Error('FACE_LORAS_JSON is not configured');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('FACE_LORAS_JSON is not valid JSON');
  }
  if (!Array.isArray(parsed)) throw new Error('FACE_LORAS_JSON must be an array');
  return parsed.map((entry: Record<string, unknown>) => ({
    id: String(entry.id || '').trim().toLowerCase(),
    source: safeSource(entry.source || `loras/${String(entry.filename || '')}`),
    defaultStrength: Number.isFinite(Number(entry.defaultStrength)) ? Number(entry.defaultStrength) : 0.7,
    strengths: entry.strengths && typeof entry.strengths === 'object'
      ? entry.strengths as Record<string, number>
      : {},
    models: Array.isArray(entry.models) ? entry.models.map(String) : Object.keys(MODEL_CHECKPOINTS),
  }));
}

function numberOrDefault(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildFaceWorkflow(input: Record<string, unknown>, checkpoint: string, face: FaceLora) {
  const prompt = String(input.prompt || '').trim();
  if (!prompt) throw new Error('The face prompt is empty');
  const model = String(input.model || 'editorial');
  const sourceWithoutPrefix = face.source.slice('loras/'.length);
  const defaultStrength = numberOrDefault(face.strengths[model], face.defaultStrength);
  const strength = Math.max(0, Math.min(2, numberOrDefault(input.loraStrength, defaultStrength)));
  const seed = Math.max(0, Math.floor(numberOrDefault(input.seed, Date.now())));
  const steps = Math.max(1, Math.min(60, Math.floor(numberOrDefault(input.steps, 25))));
  const cfg = Math.max(0, Math.min(20, numberOrDefault(input.cfg, 3.7)));
  const denoise = Math.max(0, Math.min(1, numberOrDefault(input.denoise, 0.65)));
  const rescaleCfg = Math.max(0, Math.min(1, numberOrDefault(input.rescaleCfg, 0.7)));

  return {
    '795': {
      inputs: {
        PowerLoraLoaderHeaderWidget: { type: 'PowerLoraLoaderHeaderWidget' },
        lora_1: { on: true, lora: sourceWithoutPrefix, strength },
        '➕ Add Lora': '',
        model: ['804', 0],
        clip: ['803', 0],
      },
      class_type: 'Power Lora Loader (rgthree)',
      _meta: { title: 'Face LoRA' },
    },
    '796': {
      inputs: { strength: 1, model: ['795', 0] },
      class_type: 'DifferentialDiffusion',
      _meta: { title: 'Differential Diffusion' },
    },
    '797': {
      inputs: { text: prompt, clip: ['795', 1] },
      class_type: 'CLIPTextEncode',
      _meta: { title: 'Face Prompt (Positive)' },
    },
    '798': {
      inputs: {},
      class_type: 'ImpactNegativeConditioningPlaceholder',
      _meta: { title: 'Negative Cond Placeholder' },
    },
    '799': {
      inputs: { model_name: 'bbox/yolov11m-face.pt' },
      class_type: 'UltralyticsDetectorProvider',
      _meta: { title: 'Face Detector (YOLO11m)' },
    },
    '800': {
      inputs: { model_name: 'segm/yolo11m-seg.pt' },
      class_type: 'UltralyticsDetectorProvider',
      _meta: { title: 'Person Segm (YOLO11m)' },
    },
    '802': {
      inputs: {
        guide_size: 512,
        guide_size_for: true,
        max_size: 1600,
        seed,
        steps,
        cfg,
        sampler_name: String(input.sampler || 'res_2s'),
        scheduler: String(input.scheduler || 'kl_optimal'),
        denoise,
        feather: 8,
        noise_mask: true,
        force_inpaint: true,
        bbox_threshold: 0.39,
        bbox_dilation: 10,
        bbox_crop_factor: 3,
        sam_detection_hint: 'center-1',
        sam_dilation: 10,
        sam_threshold: 0.93,
        sam_bbox_expansion: 0,
        sam_mask_hint_threshold: 0.7,
        sam_mask_hint_use_negative: 'False',
        drop_size: 10,
        wildcard: '',
        cycle: 1,
        inpaint_model: false,
        noise_mask_feather: 100,
        tiled_encode: false,
        tiled_decode: false,
        image: ['806', 0],
        model: ['940', 0],
        clip: ['795', 1],
        vae: ['807', 0],
        positive: ['797', 0],
        negative: ['798', 0],
        bbox_detector: ['799', 0],
        sam_model_opt: ['946', 0],
        segm_detector_opt: ['800', 1],
      },
      class_type: 'FaceDetailer',
      _meta: { title: 'FaceDetailer' },
    },
    '803': {
      inputs: {
        clip_name: 'qwen_2.5_VL_7b_fp8_scaled.safetensors',
        type: 'qwen_image',
        device: 'default',
      },
      class_type: 'CLIPLoader',
      _meta: { title: 'Load CLIP' },
    },
    '804': {
      inputs: { unet_name: checkpoint, weight_dtype: 'default' },
      class_type: 'UNETLoader',
      _meta: { title: 'Load Diffusion Model' },
    },
    '805': {
      inputs: { filename_prefix: 'pollen-face', images: ['948', 0] },
      class_type: 'SaveImage',
      _meta: { title: 'Output' },
    },
    '806': {
      inputs: { image: INPUT_IMAGE_NAME },
      class_type: 'LoadImage',
      _meta: { title: 'Load Image' },
    },
    '807': {
      inputs: { vae_name: 'qwen_image_vae.safetensors' },
      class_type: 'VAELoader',
      _meta: { title: 'Load VAE' },
    },
    '940': {
      inputs: { multiplier: rescaleCfg, model: ['796', 0] },
      class_type: 'RescaleCFG',
      _meta: { title: 'RescaleCFG' },
    },
    '946': {
      inputs: { model_name: 'sam_vit_b_01ec64.pth', device_mode: 'AUTO' },
      class_type: 'SAMLoader',
      _meta: { title: 'SAMLoader (Impact)' },
    },
    '947': {
      inputs: { model_name: 'x1_ITF_SkinDiffDetail_Lite_v1.pth' },
      class_type: 'UpscaleModelLoader',
      _meta: { title: 'Load Upscale Model' },
    },
    '948': {
      inputs: { upscale_model: ['947', 0], image: ['802', 0] },
      class_type: 'ImageUpscaleWithModel',
      _meta: { title: 'Upscale Image (using Model)' },
    },
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!RUNPOD_API_KEY) return Response.json({ error: 'RUNPOD_API_KEY is not configured' }, { status: 500 });

    const input = await req.json();
    const model = String(input.model || 'editorial');
    const checkpoint = MODEL_CHECKPOINTS[model];
    if (!checkpoint) return Response.json({ error: `Unknown model "${model}"` }, { status: 400 });

    const endpointId = resolveEndpointId(model);
    if (!endpointId) return Response.json({ error: `No RunPod endpoint configured for model "${model}"` }, { status: 500 });

    const faceId = String(input.faceLoraId || '').trim().toLowerCase();
    const face = readFaceLoras().find(item => item.id === faceId);
    if (!face) return Response.json({ error: `Unknown Face LoRA "${faceId}"` }, { status: 400 });
    if (!face.models.includes(model)) {
      return Response.json({ error: `Face LoRA "${faceId}" is not enabled for ${model}` }, { status: 400 });
    }

    const sourceImage = String(input.sourceImage || '');
    if (!/^data:image\/(png|jpeg|webp);base64,/i.test(sourceImage)) {
      return Response.json({ error: 'sourceImage must be a PNG, JPEG or WebP data URL' }, { status: 400 });
    }
    if (sourceImage.length > 8_000_000) {
      return Response.json({ error: 'The source image is too large after compression' }, { status: 413 });
    }

    const workflow = buildFaceWorkflow(input, checkpoint, face);
    const response = await fetch(`https://api.runpod.ai/v2/${endpointId}/run`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          workflow,
          images: [{ name: INPUT_IMAGE_NAME, image: sourceImage }],
          faceLora: face.source,
        },
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
