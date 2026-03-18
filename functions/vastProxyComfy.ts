import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { baseUrl, action, promptId, workflow, filename } = await req.json();

  if (!baseUrl) return Response.json({ error: 'Missing baseUrl' }, { status: 400 });

  // Check system stats (health check)
  if (action === "health") {
    try {
      const res = await fetch(`${baseUrl}/system_stats`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) return Response.json({ ready: true });
      return Response.json({ ready: false });
    } catch {
      return Response.json({ ready: false });
    }
  }

  // Submit prompt
  if (action === "prompt") {
    const res = await fetch(`${baseUrl}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow }),
    });
    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: `Prompt failed: ${text}` }, { status: 500 });
    }
    const data = await res.json();
    return Response.json({ promptId: data.prompt_id });
  }

  // Poll history
  if (action === "history") {
    if (!promptId) return Response.json({ error: 'Missing promptId' }, { status: 400 });
    const res = await fetch(`${baseUrl}/history/${promptId}`);
    if (!res.ok) return Response.json({ complete: false });
    const data = await res.json();
    const entry = data[promptId];
    if (!entry || !entry.outputs) return Response.json({ complete: false });
    const node15 = entry.outputs["15"];
    if (!node15?.images?.[0]?.filename) return Response.json({ complete: false });
    return Response.json({ complete: true, filename: node15.images[0].filename });
  }

  // Get image URL
  if (action === "imageUrl") {
    if (!filename) return Response.json({ error: 'Missing filename' }, { status: 400 });
    return Response.json({ url: `${baseUrl}/view?filename=${encodeURIComponent(filename)}` });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
});