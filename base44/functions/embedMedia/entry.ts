import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VOYAGE_API_KEY = Deno.env.get('VOYAGE_API_KEY');
const PINECONE_API_KEY = Deno.env.get('PINECONE_API_KEY');
const PINECONE_HOST = Deno.env.get('PINECONE_HOST');

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  const entityId = body?.event?.entity_id || body?.entity_id;
  if (!entityId) return Response.json({ skipped: 'no entity_id' });

  const item = await base44.asServiceRole.entities.MediaItem.get(entityId);
  if (!item) return Response.json({ skipped: 'not found' });

  // Need caption_universal to embed
  const textToEmbed = item.caption_universal || item.caption || '';
  if (!textToEmbed) return Response.json({ skipped: 'no caption to embed' });

  // 1. Get embedding from Voyage AI
  const voyageRes = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: [textToEmbed],
      model: 'voyage-3',
    }),
  });

  if (!voyageRes.ok) {
    const errText = await voyageRes.text();
    return Response.json({ error: `Voyage API error: ${voyageRes.status} ${errText}` }, { status: 500 });
  }

  const voyageData = await voyageRes.json();
  const embedding = voyageData.data?.[0]?.embedding;
  if (!embedding) return Response.json({ error: 'No embedding returned' }, { status: 500 });

  // 2. Build metadata for Pinecone (filterable fields)
  const metadata = {
    title: (item.title || '').slice(0, 200),
    content_type: item.content_type || 'image',
    color_palette: item.color_palette || '',
    tint: item.tint || 0,
    has_face: item.structural_signals?.has_face || false,
    dominant_subject: (item.structural_signals?.dominant_subject || '').slice(0, 200),
    format: (item.meta_format || []).slice(0, 5).join(', '),
    mood: (item.meta_mood || []).slice(0, 5).join(', '),
    era: (item.meta_era || []).slice(0, 3).join(', '),
    is_kept: item.is_kept || false,
    is_forgotten: item.is_forgotten || false,
    collection: (item.collection || '').slice(0, 100),
    tenant_id: item.tenant_id || '',
  };

  // 3. Upsert to Pinecone
  const vectorId = `media-${entityId}`;

  const pineconeRes = await fetch(`${PINECONE_HOST}/vectors/upsert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': PINECONE_API_KEY,
    },
    body: JSON.stringify({
      vectors: [{
        id: vectorId,
        values: embedding,
        metadata,
      }],
    }),
  });

  if (!pineconeRes.ok) {
    const errText = await pineconeRes.text();
    return Response.json({ error: `Pinecone upsert error: ${pineconeRes.status} ${errText}` }, { status: 500 });
  }

  // 4. Save vector_id back to entity
  await base44.asServiceRole.entities.MediaItem.update(entityId, { vector_id: vectorId });

  return Response.json({ success: true, vector_id: vectorId });
});