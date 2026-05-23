import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  // Support both automation payload and direct invocation
  const entityId = body?.event?.entity_id || body?.entity_id;
  if (!entityId) return Response.json({ skipped: 'no entity_id' });

  const item = await base44.asServiceRole.entities.MediaItem.get(entityId);
  if (!item) return Response.json({ skipped: 'not found' });
  if (item.content_type !== 'image' || !item.file_url) return Response.json({ skipped: 'not an image' });

  // Skip if already enriched
  if (item.enrichment_status === 'done') return Response.json({ skipped: 'already enriched' });

  // Mark as processing
  await base44.asServiceRole.entities.MediaItem.update(entityId, { enrichment_status: 'processing' });

  try {
    // Single consolidated VLM call for caption, palette, structural signals, AND meta tags
    const prompt = `You are a world-class visual curator specializing in cinema, editorial photography, and fine art. Analyze this image with expert precision.

Return a JSON object with ALL of the following:

1. "suggested_title": A short, evocative title for this image (2-5 words). Think like an art director naming a shot for a lookbook or exhibition. Lowercase, poetic but descriptive. Examples: "amber light on linen", "solitude in concrete", "hands through tall grass", "the red chair".

2. "caption_universal": 3-5 sentences of rich prose covering subject, action, setting, lighting quality, mood, era/feeling, composition, garments (if any), materials, and textures. Write as if describing the image to a blind cinephile. Be evocative and specific.

2. "palette": array of exactly 5 dominant colors, each an object with "hex" (e.g. "#2B3A42") and "name" (e.g. "slate blue"). Order from most to least dominant.

3. "structural_signals": an object with:
   - "has_face": boolean
   - "face_count": number (0 if no faces)
   - "aspect_ratio": string like "portrait", "landscape", or "square"
   - "grain_level": string "none", "fine", "medium", or "heavy"
   - "has_text": boolean (visible text/typography in the image)
   - "dominant_subject": string (one phrase, e.g. "woman in red dress", "empty corridor", "bowl of fruit")

4. "caption": 2-4 sentence description (shorter, for display)

6. Structured tags for each category (arrays of strings, include synonyms):
   - "format": (movie still, editorial, still life, portrait, landscape, street, fashion, documentary, abstract, etc.)
   - "film_stock": (35mm, 16mm, digital, large format, medium format, etc.)
   - "color_type": (color, black and white, sepia, desaturated, etc.)
   - "lighting": (natural light, studio, backlit, side lit, low key, high key, golden hour, chiaroscuro, etc.)
   - "composition": (close-up, medium shot, wide shot, symmetrical, rule of thirds, shallow depth of field, etc.)
   - "mood": (include 2-3 synonyms per mood, e.g. "melancholic", "somber", "wistful")
   - "color_palette_tags": (warm tones, cool tones, earth tones, pastel, vivid, muted, etc.)
   - "texture": (heavy grain, fine grain, smooth, soft focus, sharp, gritty, hazy, crisp, etc.)
   - "subject": (person, group, object, architecture, nature, silhouette, shadow, etc.)
   - "era_feel": (1950s, 1970s, 1990s, contemporary, timeless, retro, vintage, etc.)
   - "reference_directors": (only if genuinely relevant: Wong Kar-wai, Kubrick, Tarkovsky, Eggleston, Nan Goldin, etc.)
   - "keywords": (additional terms and synonyms for discoverability)

6. "color_classification": exactly one of: warm, cool, neutral, dark, light, monochrome
7. "tint": dominant hue as number 0-360

Return JSON only.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [item.file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          suggested_title: { type: 'string' },
          caption_universal: { type: 'string' },
          palette: { type: 'array', items: { type: 'object', properties: { hex: { type: 'string' }, name: { type: 'string' } } } },
          structural_signals: {
            type: 'object',
            properties: {
              has_face: { type: 'boolean' },
              face_count: { type: 'number' },
              aspect_ratio: { type: 'string' },
              grain_level: { type: 'string' },
              has_text: { type: 'boolean' },
              dominant_subject: { type: 'string' },
            },
          },
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

    // Build flat tags for backward compatibility
    const allTags = [
      ...(result.format || []),
      ...(result.film_stock || []),
      ...(result.color_type || []),
      ...(result.lighting || []),
      ...(result.mood || []),
      ...(result.subject || []),
    ].filter(Boolean).slice(0, 20);

    const validPalettes = ['warm', 'cool', 'neutral', 'dark', 'light', 'monochrome'];

    const update = {
      title: result.suggested_title || item.title || '',
      caption_universal: result.caption_universal || '',
      palette: Array.isArray(result.palette) ? result.palette.slice(0, 5) : [],
      structural_signals: result.structural_signals || {},
      caption: result.caption || '',
      tags: allTags,
      meta_format: result.format || [],
      meta_film_stock: result.film_stock || [],
      meta_color_type: result.color_type || [],
      meta_lighting: result.lighting || [],
      meta_composition: result.composition || [],
      meta_mood: result.mood || [],
      meta_color_palette: result.color_palette_tags || [],
      meta_texture: result.texture || [],
      meta_subject: result.subject || [],
      meta_era: result.era_feel || [],
      meta_directors: result.reference_directors || [],
      meta_keywords: result.keywords || [],
      color_palette: validPalettes.includes(result.color_classification) ? result.color_classification : null,
      tint: typeof result.tint === 'number' ? result.tint : null,
      enrichment_status: 'done',
      enriched_at: new Date().toISOString(),
    };

    await base44.asServiceRole.entities.MediaItem.update(entityId, update);

    // Now trigger embedding
    try {
      await base44.asServiceRole.functions.invoke('embedMedia', { entity_id: entityId });
    } catch (e) {
      console.error('Embedding failed (non-blocking):', e.message);
    }

    return Response.json({ success: true, caption: update.caption?.slice(0, 80) });
  } catch (error) {
    await base44.asServiceRole.entities.MediaItem.update(entityId, { enrichment_status: 'failed' });
    return Response.json({ error: error.message }, { status: 500 });
  }
});