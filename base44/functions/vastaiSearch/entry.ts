import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const VAST_API_KEY = Deno.env.get("VAST_API_KEY");

const GPU_PRIORITY = [
  "B200",
  "H200",
  "RTX Pro 6000 Blackwell",
];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { europeOnly } = await req.json();

  const query = {
    verified: { eq: true },
    rentable: { eq: true },
    num_gpus: { eq: 1 },
  };

  if (europeOnly) {
    query.geolocation = { in: ["FR", "DE", "NL", "GB", "SE", "NO", "FI", "CH", "BE", "AT", "DK", "PL"] };
  }

  const url = `https://console.vast.ai/api/v0/bundles?q=${encodeURIComponent(JSON.stringify(query))}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${VAST_API_KEY}` },
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json({ error: `Vast.ai search failed: ${res.status} ${text}` }, { status: 502 });
  }

  const data = await res.json();
  const offers = data.offers || [];

  // Filter and sort by GPU priority
  let bestOffer = null;
  let bestGpuName = null;

  for (const gpuName of GPU_PRIORITY) {
    const matching = offers.filter(o => {
      const name = o.gpu_name || '';
      return name.includes(gpuName);
    });
    if (matching.length > 0) {
      matching.sort((a, b) => (a.dph_total || Infinity) - (b.dph_total || Infinity));
      bestOffer = matching[0];
      bestGpuName = bestOffer.gpu_name;
      break;
    }
  }

  if (!bestOffer) {
    return Response.json({ found: false });
  }

  return Response.json({
    found: true,
    offerId: bestOffer.id,
    gpuName: bestGpuName,
    costPerHour: bestOffer.dph_total,
    gpuRam: bestOffer.gpu_ram,
  });
});