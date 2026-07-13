import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const VAST_API_KEY = Deno.env.get("VAST_API_KEY");

const GPU_PRIORITY = [
  "H200",
  "H100 SXM",
];

const MAX_COST_PER_HOUR = 6.5;
const BLOCKED_HOSTS = ["213.5.130.43", "84.8.117.11"];

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

    let res;
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${VAST_API_KEY}` },
      });
    } catch (e) {
      console.warn(`Fetch failed for ${gpuName}:`, e.message);
      continue;
    }

    if (!res.ok) {
      console.warn(`Vast API returned ${res.status} for ${gpuName}`);
      continue;
    }

    let data;
    try {
      data = await res.json();
    } catch (e) {
      console.warn(`JSON parse failed for ${gpuName}:`, e.message);
      continue;
    }
    const offers = data.offers || [];

    const affordable = offers
      .filter(o => o.dph_total <= MAX_COST_PER_HOUR && !BLOCKED_HOSTS.includes(o.public_ipaddr))
      .sort((a, b) => (b.inet_down || 0) - (a.inet_down || 0));

    if (affordable.length > 0) {
      const best = affordable[0];
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