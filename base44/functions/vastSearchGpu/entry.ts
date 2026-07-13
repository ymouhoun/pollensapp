import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const VAST_API_KEY = Deno.env.get("VAST_API_KEY");
const GPU_PRIORITY = ["H200", "H100 SXM"];
const EU_GEOLOCATIONS = ["FR","DE","NL","GB","SE","NO","FI","CH","BE","AT","DK","PL"];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { globalFallback, excludeHosts } = await req.json().catch(() => ({}));
    const blockedHosts = excludeHosts || [];

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

    const MAX_COST_PER_HOUR = 6.5;

    // Filter by GPU priority, excluding blocked hosts, then sort by download speed (fastest first)
    for (const gpuName of GPU_PRIORITY) {
      const matching = offers.filter(o => {
        const name = o.gpu_name || "";
        const cost = o.dph_total || o.min_bid || 999;
        const hostIp = o.public_ipaddr || "";
        return name.toLowerCase().includes(gpuName.toLowerCase()) 
          && cost <= MAX_COST_PER_HOUR
          && !blockedHosts.includes(hostIp);
      });
      if (matching.length > 0) {
        // Sort by download speed descending (fastest first), then cost ascending as tiebreaker
        matching.sort((a, b) => {
          const dlA = a.inet_down || 0;
          const dlB = b.inet_down || 0;
          if (dlB !== dlA) return dlB - dlA; // fastest download first
          return (a.dph_total || a.min_bid || 999) - (b.dph_total || b.min_bid || 999);
        });
        const best = matching[0];
        return Response.json({
          offerId: best.id,
          gpuName: best.gpu_name,
          costPerHour: best.dph_total || best.min_bid,
          vram: best.gpu_ram,
          inetDown: best.inet_down,
          region: globalFallback ? "global" : "europe",
          hostIp: best.public_ipaddr,
        });
      }
    }

    if (!globalFallback) {
      return Response.json({ noEuResults: true });
    }
    return Response.json({ error: "No compatible GPU available right now." }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});