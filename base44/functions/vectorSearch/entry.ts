import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VOYAGE_API_KEY = Deno.env.get('VOYAGE_API_KEY');
const PINECONE_API_KEY = Deno.env.get('PINECONE_API_KEY');
const PINECONE_HOST = Deno.env.get('PINECONE_HOST');

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { query, topK = 20, filter } = await req.json();
  if (!query) return Response.json({ results: [] });

  // 1. Embed the query via Voyage AI
  const voyageRes = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: [query],
      model: 'voyage-3',
    }),
  });

  if (!voyageRes.ok) {
    const errText = await voyageRes.text();
    return Response.json({ error: `Voyage API error: ${voyageRes.status} ${errText}` }, { status: 500 });
  }

  const voyageData = await voyageRes.json();
  const queryEmbedding = voyageData.data?.[0]?.embedding;
  if (!queryEmbedding) return Response.json({ error: 'No embedding returned' }, { status: 500 });

  // 2. Build Pinecone query
  const pineconeBody = {
    vector: queryEmbedding,
    topK: Math.min(topK, 100),
    includeMetadata: true,
  };

  // Optional metadata filter
  if (filter && Object.keys(filter).length > 0) {
    pineconeBody.filter = filter;
  }

  // Always exclude forgotten items
  pineconeBody.filter = {
    ...(pineconeBody.filter || {}),
    is_forgotten: { $ne: true },
  };

  const pineconeRes = await fetch(`${PINECONE_HOST}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': PINECONE_API_KEY,
    },
    body: JSON.stringify(pineconeBody),
  });

  if (!pineconeRes.ok) {
    const errText = await pineconeRes.text();
    return Response.json({ error: `Pinecone query error: ${pineconeRes.status} ${errText}` }, { status: 500 });
  }

  const pineconeData = await pineconeRes.json();

  // 3. Extract entity IDs from vector IDs (format: "media-{entityId}")
  const results = (pineconeData.matches || []).map(match => ({
    id: match.id.replace('media-', ''),
    score: match.score,
    metadata: match.metadata,
  }));

  return Response.json({ results });
});