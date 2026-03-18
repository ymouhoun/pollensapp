import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { baseUrl, filename } = await req.json();

  const imageRes = await fetch(`${baseUrl}/view?filename=${encodeURIComponent(filename)}`);
  
  if (!imageRes.ok) {
    return Response.json({ error: 'Failed to fetch image' }, { status: 502 });
  }

  const imageBlob = await imageRes.blob();
  const arrayBuffer = await imageBlob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  const contentType = imageRes.headers.get('content-type') || 'image/png';

  return Response.json({ 
    imageDataUrl: `data:${contentType};base64,${base64}` 
  });
});