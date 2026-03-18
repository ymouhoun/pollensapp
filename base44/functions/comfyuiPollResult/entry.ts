import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { baseUrl, promptId } = await req.json();

  const res = await fetch(`${baseUrl}/history/${promptId}`);
  if (!res.ok) {
    return Response.json({ done: false });
  }

  const data = await res.json();
  const entry = data[promptId];

  if (!entry || !entry.outputs) {
    return Response.json({ done: false });
  }

  const output15 = entry.outputs["15"];
  if (!output15 || !output15.images || output15.images.length === 0) {
    return Response.json({ done: false });
  }

  const filename = output15.images[0].filename;
  const imageUrl = `${baseUrl}/view?filename=${encodeURIComponent(filename)}`;

  return Response.json({ done: true, imageUrl, filename });
});