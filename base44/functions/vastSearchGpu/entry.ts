import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const VAST_API_KEY = Deno.env.get("VAST_API_KEY");
const GPU_PRIORITY = ["B200", "H200", "RTX Pro 6000 Blackwell server", "RTX Pro 6000 Blackwell workstation"];
const EU_GEOLOCATIONS = ["FR","DE","NL","GB","SE","NO","FI","CH","BE","AT","DK","PL"];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { globalFallback } = await req.json().catch(() => ({}));

  const query = {
    verified: { eq: true },
    rentable: { eq: true },
    num_gpus: { eq: 1 },
  };
  if (!globalFallback) {
    query.geolocation = { in: EU_GEOLOCATIONS };
  }

  const url = `https://console.vast.ai/api/v0/bundles?q=${encodeURIComponent(JSON.stringify(query))}`;

  const res = await fetch(url, {
    headers: { "Authorization": `Bearer ${VAST_API_KEY}` },
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json({ error: `Vast API error: ${res.status} ${text}` }, { status: 500 });
  }

  const data = await res.json();
  const offers = data.offers || data;

  if (!Array.isArray(offers) || offers.length === 0) {
    if (!globalFallback) {
      return Response.json({ noEuResults: true });
    }
    return Response.json({ error: "No compatible GPU available right now." }, { status: 404 });
  }

  // Filter and sort by GPU priority
  for (const gpuName of GPU_PRIORITY) {
    const matching = offers.filter(o => {
      const name = o.gpu_name || "";
      return name.toLowerCase().includes(gpuName.toLowerCase());
    });
    if (matching.length > 0) {
      matching.sort((a, b) => (a.dph_total || a.min_bid || 999) - (b.dph_total || b.min_bid || 999));
      const best = matching[0];
      return Response.json({
        offerId: best.id,
        gpuName: best.gpu_name,
        costPerHour: best.dph_total || best.min_bid,
        vram: best.gpu_ram,
        region: globalFallback ? "global" : "europe",
      });
    }
  }

  if (!globalFallback) {
    return Response.json({ noEuResults: true });
  }
  return Response.json({ error: "No compatible GPU available right now." }, { status: 404 });
});