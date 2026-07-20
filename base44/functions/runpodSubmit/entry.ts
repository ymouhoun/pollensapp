import { createClientFromRequest } from 'npm:@base44/sdk@0.8.39';

// Deployment refresh: 2026-07-19T21:40+02:00
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

const MODEL_ENHANCER_PRESETS: Record<string, string> = {
  editorial: 'editorial',
  ambrojo: 'ambrojo_bw',
  'still-life': 'still_life',
  '35mm': '35mm_colour',
  stills: 'stills',
  super16: 'super16',
  beauty: 'beauty',
};

const PROMPT_ENHANCER_MODEL = 'Qwen3-8B-Q8_0.gguf';
const DEFAULT_NEGATIVE_PROMPT = 'unrealistic, plastic skin, cgi, low resolution, wrong anatomy, stock photo, flat lighting, logo, text, over-smoothed face';

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

function buildPromptEnhancerNode(
  input: Record<string, unknown>,
  model: string,
  positivePrompt: string,
) {
  if (input.promptEnhancer !== true) return {};

  const stylePreset = MODEL_ENHANCER_PRESETS[model];
  if (!stylePreset) throw new Error(`No Prompt Enhancer preset configured for model "${model}"`);

  return {
    '807': {
      inputs: {
        model: PROMPT_ENHANCER_MODEL,
        style_preset: stylePreset,
        prompt: positivePrompt,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 512,
        repeat_penalty: 1.1,
        n_ctx: 8192,
        n_gpu_layers: 99,
        seed: 0,
      },
      class_type: 'LLMPromptEnhancer',
      _meta: { title: 'LLM Prompt Enhancer (GPU)' },
    },
  };
}

function buildWorkflow(input: Record<string, unknown>, checkpoint: string, model: string) {
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
  const promptEnhancer = input.promptEnhancer === true;

  return {
    ...buildPromptEnhancerNode(input, model, positivePrompt),
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
        text: promptEnhancer ? ['807', 1] : DEFAULT_NEGATIVE_PROMPT,
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
      inputs: { text: promptEnhancer ? ['807', 0] : positivePrompt, clip: ['808', 0] },
      class_type: 'CLIPTextEncode',
      _meta: { title: promptEnhancer ? 'Positive Prompt (Enhanced by LLM)' : 'Positive Prompt' },
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

function buildExpertWorkflow(input: Record<string, unknown>, checkpoint: string, model: string) {
  const positivePrompt = String(input.positivePrompt || '').trim();
  if (!positivePrompt) throw new Error('The prompt is empty');
  const complementaryPrompt = String(
    input.complementaryPrompt === undefined
      ? 'shot on Hasselblad X2D, 100MP, natural skin texture, high-fashion editorial, Harper’s Bazaar style, slight asymmetry in facial features, slight wrinkles or dimples'
      : input.complementaryPrompt,
  ).trim();

  // The Expert graph preserves the validated low-level Clown/Shark defaults.
  // Only the creative controls exposed by the Expert prompt bar are variable.
  const seed = Math.max(0, Math.floor(numberOrDefault(input.seed, Date.now())));
  const steps = Math.max(1, Math.min(100, Math.floor(numberOrDefault(input.steps, 40))));
  const cfg = Math.max(0, Math.min(20, numberOrDefault(input.cfg, 3.2)));
  const rescaleCfg = Math.max(0, Math.min(1, numberOrDefault(input.rescaleCfg, 0.7)));
  const rescaleEnabled = input.rescaleEnabled !== false;
  const megapixels = Math.max(0.1, Math.min(4, numberOrDefault(input.megapixels, 1.6)));
  const aspectRatio = String(input.aspectRatio || '3:4 (Golden Ratio)');
  const shift = Math.max(0, Math.min(3, numberOrDefault(input.shift, 1.3)));
  const implicitSteps = Math.max(1, Math.min(20, Math.floor(numberOrDefault(input.implicitSteps, 2))));
  const implicitEnabled = input.implicitEnabled !== false;
  const scheduler = String(input.scheduler || 'kl_optimal');
  const promptEnhancer = input.promptEnhancer === true;

  return {
    ...buildPromptEnhancerNode(input, model, positivePrompt),
    '808': {
      inputs: { clip_name: 'qwen_2.5_VL_7b_fp8_scaled.safetensors', type: 'qwen_image', device: 'default' },
      class_type: 'CLIPLoader',
      _meta: { title: 'Load CLIP' },
    },
    '809': {
      inputs: { text: complementaryPrompt, clip: ['808', 0] },
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
        text: promptEnhancer ? ['807', 1] : DEFAULT_NEGATIVE_PROMPT,
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
      inputs: { samples: ['952', 0], vae: ['812', 0] },
      class_type: 'VAEDecode',
      _meta: { title: 'VAE Decode' },
    },
    '817': {
      inputs: { unet_name: checkpoint, weight_dtype: 'default' },
      class_type: 'UNETLoader',
      _meta: { title: 'Load Diffusion Model' },
    },
    '818': {
      inputs: { text: promptEnhancer ? ['807', 0] : positivePrompt, clip: ['808', 0] },
      class_type: 'CLIPTextEncode',
      _meta: { title: promptEnhancer ? 'Positive Prompt (Enhanced by LLM)' : 'Positive Prompt (Subject)' },
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
      inputs: { width: ['819', 0], height: ['819', 1], batch_size: 1 },
      class_type: 'EmptySD3LatentImage',
      _meta: { title: 'EmptySD3LatentImage' },
    },
    '822': {
      inputs: { multiplier: rescaleCfg, model: ['814', 0] },
      class_type: 'RescaleCFG',
      _meta: { title: 'RescaleCFG' },
    },
    '825': {
      inputs: { filename_prefix: 'pollen-expert', images: ['815', 0] },
      class_type: 'SaveImage',
      _meta: { title: 'Save Image' },
    },
    '951': {
      inputs: {
        eta: 0,
        sampler_name: 'exponential/res_2s',
        seed: 555053740861102,
        control_after_generate: 'fixed',
        bongmath: true,
        ...(implicitEnabled ? { options: ['965', 0] } : {}),
        'options 2': ['964', 0],
      },
      class_type: 'ClownSampler_Beta',
      _meta: { title: 'ClownSampler' },
    },
    '952': {
      inputs: {
        scheduler,
        steps,
        steps_to_run: -1,
        denoise: 1,
        cfg,
        seed,
        control_after_generate: 'fixed',
        sampler_mode: 'standard',
        model: rescaleEnabled ? ['822', 0] : ['814', 0],
        positive: ['810', 0],
        negative: ['811', 0],
        sampler: ['951', 0],
        latent_image: ['820', 0],
        options: ['960', 0],
      },
      class_type: 'SharkSampler_Beta',
      _meta: { title: 'SharkSampler' },
    },
    '960': {
      inputs: {
        s_noise: 1.04,
        s_noise_substep: 1,
        noise_anchor_sde: 1,
        lying: 0.97,
        lying_inv: 1.02,
        lying_start_step: 0,
        lying_inv_start_step: 1,
        options: ['964', 0],
      },
      class_type: 'ClownOptions_SigmaScaling_Beta',
      _meta: { title: 'ClownOptions Sigma Scaling' },
    },
    '964': {
      inputs: {
        noise_type_sde: 'brownian',
        noise_type_sde_substep: 'gaussian',
        noise_mode_sde: 'lorentzian',
        noise_mode_sde_substep: 'hard',
        eta: 0.3,
        eta_substep: 0.5,
        seed: 187439852784042,
        control_after_generate: 'fixed',
      },
      class_type: 'ClownOptions_SDE_Beta',
      _meta: { title: 'ClownOptions SDE' },
    },
    ...(implicitEnabled ? {
      '965': {
        inputs: {
          implicit_type: 'bongmath',
          implicit_type_substeps: 'bongmath',
          implicit_steps: implicitSteps,
          implicit_substeps: 0,
        },
        class_type: 'ClownOptions_ImplicitSteps_Beta',
        _meta: { title: 'ClownOptions Implicit Steps' },
      },
    } : {}),
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

    const expertMode = input.expertMode === true || input.operation === 'expert-generation';
    const workflow = expertMode
      ? buildExpertWorkflow(input, checkpoint, model)
      : buildWorkflow(input, checkpoint, model);
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
      operation: expertMode ? 'expert-generation' : 'generation',
      promptEnhancer: input.promptEnhancer === true,
      endpointRef: endpointId.slice(-6),
      workflow,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
