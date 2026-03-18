import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { baseUrl } = await req.json();
    if (!baseUrl) return Response.json({ error: 'Missing baseUrl' }, { status: 400 });

    const clientId = crypto.randomUUID();
    const wsUrl = baseUrl.replace(/^http/, 'ws') + `/ws?clientId=${clientId}`;

    const detectMime = (bytes) => {
      if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
      if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
      if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
      return null;
    };

    const packetSummary = [];
    const textTypes = [];
    let opened = false;

    await new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        try { ws.close(); } catch {}
        resolve();
      }, 12000);

      ws.onopen = async () => {
        opened = true;
        const workflow = {
          "1": { inputs: { samples: ["16", 0], vae: ["3", 0] }, class_type: "VAEDecode" },
          "3": { inputs: { vae_name: "qwen_image_vae.safetensors" }, class_type: "VAELoader" },
          "6": { inputs: { clip_name: "qwen_2.5_vl_7b_fp8_scaled.safetensors", type: "qwen_image", device: "default" }, class_type: "CLIPLoader" },
          "7": { inputs: { megapixel: "1.0", aspect_ratio: "1:1", divisible_by: "64", custom_ratio: false, custom_aspect_ratio: "1:1" }, class_type: "FluxResolutionNode" },
          "8": { inputs: { text: "blurry, low quality", clip: ["6", 0] }, class_type: "CLIPTextEncode" },
          "9": { inputs: { shift: 1.0, model: ["10", 0] }, class_type: "ModelSamplingAuraFlow" },
          "10": { inputs: { unet_name: "editorial.safetensors", weight_dtype: "default" }, class_type: "UNETLoader" },
          "13": { inputs: { text: "portrait photo of a woman in a forest", clip: ["6", 0] }, class_type: "CLIPTextEncode" },
          "14": { inputs: { width: ["7", 0], height: ["7", 1], batch_size: 1 }, class_type: "EmptySD3LatentImage" },
          "15": { inputs: { filename_prefix: "debug-preview", images: ["1", 0] }, class_type: "SaveImage" },
          "16": { inputs: { seed: 12345, steps: 8, cfg: 3.0, sampler_name: "res_2s", scheduler: "kl_optimal", denoise: 1, model: ["9", 0], positive: ["13", 0], negative: ["8", 0], latent_image: ["14", 0] }, class_type: "KSampler" }
        };

        const submitRes = await fetch(`${baseUrl}/prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: workflow, client_id: clientId }),
        });
        console.log('debugComfyPreview submit status', submitRes.status);
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data);
            textTypes.push(msg.type || 'unknown');
            console.log('debugComfyPreview text', msg.type || 'unknown');
          } catch {
            textTypes.push('non_json_text');
          }
          return;
        }

        let bytes = null;
        if (event.data instanceof Blob) {
          bytes = new Uint8Array(await event.data.arrayBuffer());
        } else if (event.data instanceof ArrayBuffer) {
          bytes = new Uint8Array(event.data);
        } else if (ArrayBuffer.isView(event.data)) {
          bytes = new Uint8Array(event.data.buffer);
        }

        if (bytes) {
          const offsets = [0, 4, 8, 12, 16];
          const detection = {};
          for (const offset of offsets) {
            detection[offset] = detectMime(bytes.slice(offset));
          }
          const summary = {
            length: bytes.length,
            head: Array.from(bytes.slice(0, 16)),
            detection,
          };
          packetSummary.push(summary);
          console.log('debugComfyPreview binary', JSON.stringify(summary));
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };

      ws.onclose = () => {
        clearTimeout(timeout);
        resolve();
      };
    });

    return Response.json({ opened, textTypes, packetSummaryCount: packetSummary.length, packetSummary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});