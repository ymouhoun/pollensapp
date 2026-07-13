import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const VAST_API_KEY = Deno.env.get("VAST_API_KEY");
const R2_ENDPOINT = Deno.env.get("R2_ENDPOINT");
const R2_ACCESS_KEY = Deno.env.get("R2_ACCESS_KEY");
const R2_SECRET_KEY = Deno.env.get("R2_SECRET_KEY");
const R2_BUCKET = Deno.env.get("R2_BUCKET");

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { offerId, checkpoint, vae, textEncoder } = await req.json();

  const body = {
    client_id: "me",
    image: Deno.env.get("DOCKER_IMAGE") || "ymouhoun/comfyui-studio:latest",
    disk: 100,
    runtype: "ssh_direct",
    onstart: "bash /workspace/boot.sh",
    env: {
      R2_ENDPOINT,
      R2_ACCESS_KEY,
      R2_SECRET_KEY,
      R2_BUCKET,
      SELECTED_CHECKPOINT: checkpoint || "editorial.safetensors",
      SELECTED_VAE: vae || "qwen_image_vae.safetensors",
      SELECTED_TEXT_ENCODER: textEncoder || "qwen_2.5_vl_7b_fp8_scaled.safetensors",
      "-p 3000:3000": "1",
    },
  };

  const res = await fetch(
    `https://console.vast.ai/api/v0/asks/${offerId}/?api_key=${VAST_API_KEY}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return Response.json({ error: `Instance creation failed: ${res.status} ${text}` }, { status: 502 });
  }

  const data = await res.json();
  return Response.json({ instanceId: data.new_contract });
});