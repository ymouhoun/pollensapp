import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { encode as base64Encode } from 'https://deno.land/std@0.208.0/encoding/base64.ts';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { baseUrl } = await req.json();
  if (!baseUrl) return Response.json({ error: 'Missing baseUrl' }, { status: 400 });

  const url = `${baseUrl}/view?filename=latent_preview&type=temp&subfolder=&rand=${Date.now()}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return Response.json({ available: false });
    }

    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const b64 = base64Encode(bytes);
    const contentType = res.headers.get('content-type') || 'image/png';

    return Response.json({ available: true, image: b64, contentType });
  } catch {
    return Response.json({ available: false });
  }
});