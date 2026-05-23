import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Backfill: enrich all un-enriched image items
// Call with { batchSize: 5 } to control throughput
// Each item is processed sequentially: VLM enrich → Voyage embed → Pinecone upsert

const VOYAGE_API_KEY = Deno.env.get('VOYAGE_API_KEY');
const PINECONE_API_KEY = Deno.env.get('PINECONE_API_KEY');
const PINECONE_HOST = Deno.env.get('PINECONE_HOST');

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

  const { batchSize = 5 } = await req.json();

  // Get all images, find unenriched ones
  const allItems = await base44.asServiceRole.entities.MediaItem.list('-created_date', 500);
  const unenriched = allItems.filter(i =>
    i.content_type === 'image' &&
    i.file_url &&
    i.enrichment_status !== 'done' &&
    i.enrichment_status !== 'processing'
  ).slice(0, batchSize);

  if (unenriched.length === 0) {
    return Response.json({ message: 'All items enriched', processed: 0 });
  }

  const results = [];

  for (const item of unenriched) {
    try {
      // Mark as processing
      await base44.asServiceRole.entities.MediaItem.update(item.id, { enrichment_status: 'processing' });

      // --- STEP 1: VLM enrichment ---
      const prompt = `You are a world-class visual curator specializing in cinema, editorial photography, and fine art. Analyze this image with expert precision.

Return a JSON object with ALL of the following:

1. "caption_universal": 3-5 sentences of rich prose covering subject, action, setting, lighting quality, mood, era/feeling, composition, garments (if any), materials, and textures. Write as if describing the image to a blind cinephile. Be evocative and specific.

2. "palette": array of exactly 5 dominant colors, each an object with "hex" (e.g. "#2B3A42") and "name" (e.g. "slate blue"). Order from most to least dominant.

3. "structural_signals": an object with:
   - "has_face": boolean
   - "face_count": number (0 if no faces)
   - "aspect_ratio": string like "portrait", "landscape", or "square"
   - "grain_level": string "none", "fine", "medium", or "heavy"
   - "has_text": boolean (visible text/typography in the image)
   - "dominant_subject": string (one phrase)

4. "caption": 2-4 sentence description (shorter, for display)

5. Structured tags for each category (arrays of strings, include synonyms):
   - "format", "film_stock", "color_type", "lighting", "composition", "mood", "color_palette_tags", "texture", "subject", "era_feel", "reference_directors", "keywords"

6. "color_classification": exactly one of: warm, cool, neutral, dark, light, monochrome
7. "tint": dominant hue as number 0-360

Return JSON only.`;

      const vlmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [item.file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            caption_universal: { type: 'string' },
            palette: { type: 'array', items: { type: 'object', properties: { hex: { type: 'string' }, name: { type: 'string' } } } },
            structural_signals: { type: 'object', properties: { has_face: { type: 'boolean' }, face_count: { type: 'number' }, aspect_ratio: { type: 'string' }, grain_level: { type: 'string' }, has_text: { type: 'boolean' }, dominant_subject: { type: 'string' } } },
            caption: { type: 'string' },
            format: { type: 'array', items: { type: 'string' } },
            film_stock: { type: 'array', items: { type: 'string' } },
            color_type: { type: 'array', items: { type: 'string' } },
            lighting: { type: 'array', items: { type: 'string' } },
            composition: { type: 'array', items: { type: 'string' } },
            mood: { type: 'array', items: { type: 'string' } },
            color_palette_tags: { type: 'array', items: { type: 'string' } },
            texture: { type: 'array', items: { type: 'string' } },
            subject: { type: 'array', items: { type: 'string' } },
            era_feel: { type: 'array', items: { type: 'string' } },
            reference_directors: { type: 'array', items: { type: 'string' } },
            keywords: { type: 'array', items: { type: 'string' } },
            color_classification: { type: 'string' },
            tint: { type: 'number' },
          },
        },
      });

      const allTags = [
        ...(vlmResult.format || []), ...(vlmResult.film_stock || []),
        ...(vlmResult.color_type || []), ...(vlmResult.lighting || []),
        ...(vlmResult.mood || []), ...(vlmResult.subject || []),
      ].filter(Boolean).slice(0, 20);

      const validPalettes = ['warm', 'cool', 'neutral', 'dark', 'light', 'monochrome'];

      const update = {
        caption_universal: vlmResult.caption_universal || '',
        palette: Array.isArray(vlmResult.palette) ? vlmResult.palette.slice(0, 5) : [],
        structural_signals: vlmResult.structural_signals || {},
        caption: vlmResult.caption || '',
        tags: allTags,
        meta_format: vlmResult.format || [],
        meta_film_stock: vlmResult.film_stock || [],
        meta_color_type: vlmResult.color_type || [],
        meta_lighting: vlmResult.lighting || [],
        meta_composition: vlmResult.composition || [],
        meta_mood: vlmResult.mood || [],
        meta_color_palette: vlmResult.color_palette_tags || [],
        meta_texture: vlmResult.texture || [],
        meta_subject: vlmResult.subject || [],
        meta_era: vlmResult.era_feel || [],
        meta_directors: vlmResult.reference_directors || [],
        meta_keywords: vlmResult.keywords || [],
        color_palette: validPalettes.includes(vlmResult.color_classification) ? vlmResult.color_classification : null,
        tint: typeof vlmResult.tint === 'number' ? vlmResult.tint : null,
        enrichment_status: 'done',
        enriched_at: new Date().toISOString(),
      };

      await base44.asServiceRole.entities.MediaItem.update(item.id, update);

      // --- STEP 2: Embed + Pinecone upsert ---
      const textToEmbed = update.caption_universal || update.caption || '';
      if (textToEmbed && VOYAGE_API_KEY && PINECONE_HOST) {
        const voyageRes = await fetch('https://api.voyageai.com/v1/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${VOYAGE_API_KEY}` },
          body: JSON.stringify({ input: [textToEmbed], model: 'voyage-3' }),
        });

        if (voyageRes.ok) {
          const voyageData = await voyageRes.json();
          const embedding = voyageData.data?.[0]?.embedding;

          if (embedding) {
            const vectorId = `media-${item.id}`;
            const metadata = {
              title: (item.title || '').slice(0, 200),
              content_type: 'image',
              color_palette: update.color_palette || '',
              tint: update.tint || 0,
              has_face: update.structural_signals?.has_face || false,
              dominant_subject: (update.structural_signals?.dominant_subject || '').slice(0, 200),
              format: (update.meta_format || []).slice(0, 5).join(', '),
              mood: (update.meta_mood || []).slice(0, 5).join(', '),
              era: (update.meta_era || []).slice(0, 3).join(', '),
              is_kept: item.is_kept || false,
              is_forgotten: item.is_forgotten || false,
              collection: (item.collection || '').slice(0, 100),
              tenant_id: item.tenant_id || '',
            };

            await fetch(`${PINECONE_HOST}/vectors/upsert`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Api-Key': PINECONE_API_KEY },
              body: JSON.stringify({ vectors: [{ id: vectorId, values: embedding, metadata }] }),
            });

            await base44.asServiceRole.entities.MediaItem.update(item.id, { vector_id: vectorId });
          }
        }
      }

      results.push({ id: item.id, status: 'ok' });
    } catch (e) {
      await base44.asServiceRole.entities.MediaItem.update(item.id, { enrichment_status: 'failed' });
      results.push({ id: item.id, status: 'error', error: e.message });
    }
  }

  return Response.json({ processed: results.length, remaining: unenriched.length - results.length, results });
});