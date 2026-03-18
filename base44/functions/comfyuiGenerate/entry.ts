import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { baseUrl, positivePrompt, seed, steps, cfg, aspectRatio } = await req.json();

  const workflow = {
    "1": { inputs: { samples: ["16", 0], vae: ["3", 0] }, class_type: "VAEDecode" },
    "3": { inputs: { vae_name: "qwen_image_vae.safetensors" }, class_type: "VAELoader" },
    "6": { inputs: { clip_name: "qwen_2.5_vl_7b_fp8_scaled.safetensors", type: "qwen_image", device: "default" }, class_type: "CLIPLoader" },
    "7": { inputs: { megapixel: "1.8", aspect_ratio: aspectRatio || "3:4 (Golden Ratio)", divisible_by: "64", custom_ratio: false, custom_aspect_ratio: "1:1" }, class_type: "FluxResolutionNode" },
    "8": { inputs: { text: "unrealistic, plastic skin, cgi, low resolution, wrong anatomy, stock photo, flat lighting, logo, text, over-smoothed face", clip: ["6", 0] }, class_type: "CLIPTextEncode" },
    "9": { inputs: { shift: 1, model: ["10", 0] }, class_type: "ModelSamplingAuraFlow" },
    "10": { inputs: { unet_name: "editorial.safetensors", weight_dtype: "default" }, class_type: "UNETLoader" },
    "13": { inputs: { text: positivePrompt, clip: ["6", 0] }, class_type: "CLIPTextEncode" },
    "14": { inputs: { width: ["7", 0], height: ["7", 1], batch_size: 1 }, class_type: "EmptySD3LatentImage" },
    "15": { inputs: { filename_prefix: "solweig", images: ["1", 0] }, class_type: "SaveImage" },
    "16": { inputs: { seed: seed, steps: steps || 40, cfg: cfg || 3.0, sampler_name: "res_2s", scheduler: "kl_optimal", denoise: 1, model: ["9", 0], positive: ["13", 0], negative: ["8", 0], latent_image: ["14", 0] }, class_type: "KSampler" },
  };

  // Submit prompt
  const submitRes = await fetch(`${baseUrl}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });

  if (!submitRes.ok) {
    const text = await submitRes.text();
    return Response.json({ error: `Prompt submission failed: ${submitRes.status} ${text}` }, { status: 502 });
  }

  const submitData = await submitRes.json();
  const promptId = submitData.prompt_id;

  return Response.json({ promptId });
});