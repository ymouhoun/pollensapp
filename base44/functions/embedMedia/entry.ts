import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const VOYAGE_API_KEY = Deno.env.get('VOYAGE_API_KEY');
const PINECONE_API_KEY = Deno.env.get('PINECONE_API_KEY');
const PINECONE_HOST = Deno.env.get('PINECONE_HOST');
const REINDEX_FIELDS = new Set(['searchable_text', 'tags', 'collection', 'is_kept', 'is_forgotten', 'content_type']);
const array = (value) => Array.isArray(value) ? value.filter(v => typeof v === 'string').map(v => v.trim()).filter(Boolean) : [];
const joined = (values, max = 12) => [...new Set(values.filter(Boolean).map(v => String(v).slice(0, 80)))].slice(0, max);

async function deleteVector(vectorId) {
  const res = await fetch(`${PINECONE_HOST}/vectors/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': PINECONE_API_KEY },
    body: JSON.stringify({ ids: [vectorId] }),
  });
  if (!res.ok) throw new Error(`Pinecone delete error: ${res.status} ${await res.text()}`);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const entityId = body?.event?.entity_id || body?.entity_id;
    if (!entityId) return Response.json({ skipped: 'no entity_id' });

    const eventType = body?.event?.type;
    const vectorId = `media-${entityId}`;
    if (eventType === 'delete' || body?.delete === true) {
      await deleteVector(vectorId);
      return Response.json({ success: true, deleted: vectorId });
    }

    if (!body?.event) {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const changed = body?.changed_fields || body?.event?.changed_fields || [];
    if (eventType === 'update' && changed.length && !changed.some(field => REINDEX_FIELDS.has(field))) {
      return Response.json({ skipped: 'no vector field changed' });
    }

    const item = await base44.asServiceRole.entities.MediaItem.get(entityId);
    if (!item) {
      await deleteVector(vectorId);
      return Response.json({ success: true, deleted: vectorId });
    }

    const textToEmbed = item.searchable_text || item.manual_caption_short_fr || item.caption_short_fr || item.caption_universal || item.caption || '';
    if (!textToEmbed) return Response.json({ skipped: 'no searchable text to embed' });

    const voyageRes = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${VOYAGE_API_KEY}` },
      body: JSON.stringify({ input: [textToEmbed], model: 'voyage-3', input_type: 'document' }),
    });
    if (!voyageRes.ok) throw new Error(`Voyage API error: ${voyageRes.status} ${await voyageRes.text()}`);

    const voyageData = await voyageRes.json();
    const embedding = voyageData.data?.[0]?.embedding;
    if (!embedding) throw new Error('No embedding returned');

    const colorNames = (item.dominant_colors || []).flatMap(c => [c?.name_fr, c?.name_en, c?.hex]);
    const objectNames = (item.objects || []).flatMap(o => [o?.name_fr, o?.name_en]);
    const metadata = {
      media_id: entityId,
      owner_id: item.created_by_id || '',
      created_by_id: item.created_by_id || '',
      tenant_id: item.tenant_id || '',
      moodboard: (item.collection || '').slice(0, 100),
      rights: 'owner-only',
      access_scope: 'private',
      content_type: item.content_type || 'image',
      title: (item.title || '').slice(0, 200),
      orientation: item.orientation || '',
      location_type: item.location_type || '',
      people_count: Number(item.people_count || 0),
      has_people: Number(item.people_count || 0) > 0,
      is_kept: item.is_kept || false,
      is_forgotten: item.is_forgotten || false,
      collection: (item.collection || '').slice(0, 100),
      colors: joined([item.color_palette, ...array(item.meta_color_palette), ...colorNames]),
      mood: joined([...array(item.mood), ...array(item.meta_mood)]),
      style: joined([...array(item.visual_style), ...array(item.meta_keywords)]),
      material: joined(item.materials || item.meta_texture || []),
      texture: joined([...array(item.textures), ...array(item.meta_texture)]),
      objects: joined(objectNames),
    };

    const pineconeRes = await fetch(`${PINECONE_HOST}/vectors/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Api-Key': PINECONE_API_KEY },
      body: JSON.stringify({ vectors: [{ id: vectorId, values: embedding, metadata }] }),
    });
    if (!pineconeRes.ok) throw new Error(`Pinecone upsert error: ${pineconeRes.status} ${await pineconeRes.text()}`);

    await base44.asServiceRole.entities.MediaItem.update(entityId, { vector_id: vectorId });
    return Response.json({ success: true, vector_id: vectorId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});