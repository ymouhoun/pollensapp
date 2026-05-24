import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { encode as base64Encode } from 'https://deno.land/std@0.208.0/encoding/base64.ts';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { baseUrl, filename, subfolder } = await req.json();

  let url = `${baseUrl}/view?filename=${encodeURIComponent(filename)}`;
  if (subfolder) url += `&subfolder=${encodeURIComponent(subfolder)}`;

  const imageRes = await fetch(url);
  
  if (!imageRes.ok) {
    return Response.json({ error: 'Failed to fetch image' }, { status: 502 });
  }

  const arrayBuffer = await imageRes.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const b64 = base64Encode(bytes);

  return Response.json({ image: b64 });
});