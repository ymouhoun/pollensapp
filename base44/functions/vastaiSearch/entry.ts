import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const VAST_API_KEY = Deno.env.get("VAST_API_KEY");

const GPU_PRIORITY = [
  "B200",
  "H200",
  "RTX Pro 6000 Blackwell",
];

const EU_COUNTRIES = ["FR", "DE", "NL", "GB", "SE", "NO", "FI", "CH", "BE", "AT", "DK", "PL"];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { europeOnly } = await req.json();

  // Search each GPU model individually to keep payloads small
  for (const gpuName of GPU_PRIORITY) {
    const query = {
      verified: { eq: true },
      rentable: { eq: true },
      num_gpus: { eq: 1 },
      gpu_name: { eq: gpuName },
      order: [["dph_total", "asc"]],
      limit: 5,
    };

    if (europeOnly) {
      query.geolocation = { in: EU_COUNTRIES };
    }

    const url = `https://console.vast.ai/api/v0/bundles?q=${encodeURIComponent(JSON.stringify(query))}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${VAST_API_KEY}` },
    });

    if (!res.ok) continue;

    const data = await res.json();
    const offers = data.offers || [];

    if (offers.length > 0) {
      const best = offers[0];
      return Response.json({
        found: true,
        offerId: best.id,
        gpuName: best.gpu_name || gpuName,
        costPerHour: best.dph_total,
        gpuRam: best.gpu_ram,
      });
    }
  }

  return Response.json({ found: false });
});