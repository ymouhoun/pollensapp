import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  // Support both automation payload and direct invocation
  const entityId = body?.event?.entity_id || body?.entity_id;
  if (!entityId) return Response.json({ skipped: 'no entity_id' });

  const item = await base44.asServiceRole.entities.MediaItem.get(entityId);
  if (!item) return Response.json({ skipped: 'not found' });
  if (item.content_type !== 'image' || !item.file_url) return Response.json({ skipped: 'not an image' });

  // Skip if already fully analyzed
  if (item.caption && item.meta_keywords?.length > 0) return Response.json({ skipped: 'already analyzed' });

  const prompt = `You are a visual curator specializing in cinema, editorial photography, still life, and fine art photography. Analyze this image with expert precision.

Generate the following:

1. CAPTION: Write 2-4 sentences describing the image in precise visual language. Include subject and composition, lighting, color palette/tonal range, texture/grain, mood/atmosphere. If it appears to be a movie still, describe the scene, characters, and implied narrative.

2. STRUCTURED TAGS — for each category, provide relevant tags. Include synonyms and related terms to maximize search recall.

Categories:
- format: (movie still, editorial, still life, portrait, landscape, street, interior, fashion, documentary, abstract, etc.)
- film_stock: (35mm, 16mm, 8mm, digital, instant film, large format, medium format, etc.)
- color_type: (color, black and white, sepia, desaturated, cross-processed, color negative, hand-tinted, etc.)
- lighting: (natural light, studio, backlit, side lit, top lit, low key, high key, neon, candlelight, golden hour, blue hour, overcast, hard light, soft light, chiaroscuro, rim light, etc.)
- composition: (close-up, medium shot, wide shot, extreme close-up, over the shoulder, bird's eye, worm's eye, symmetrical, rule of thirds, centered, dutch angle, shallow depth of field, deep focus, etc.)
- mood: (for each mood tag, also include 2-3 synonyms. e.g. if "melancholic" then also include "sad", "somber", "wistful")
- color_palette: (warm tones, cool tones, earth tones, pastel, vivid, muted, monochromatic, complementary, analogous, etc.)
- texture: (heavy grain, fine grain, smooth, soft focus, sharp, gritty, hazy, dreamy, crisp, etc.)
- subject: (person, group, object, food, architecture, nature, vehicle, hands, silhouette, shadow, reflection, empty space, etc.)
- era_feel: (1950s, 1960s, 1970s, 1980s, 1990s, 2000s, contemporary, timeless, retro, vintage, etc.)
- reference_directors: (if the image resembles the visual style of known directors or photographers, list their names. e.g. Wong Kar-wai, Kubrick, Tarkovsky, Wes Anderson, Eggleston, Nan Goldin, Gregory Crewdson, etc. Only include if genuinely relevant.)
- keywords: (additional descriptive terms and synonyms for maximum discoverability — include alternate phrasings, related concepts, visual descriptors)

3. COLOR CLASSIFICATION: Classify the overall palette as exactly one of: warm, cool, neutral, dark, light, monochrome
4. TINT: The dominant hue as a number 0-360 (0=red, 60=yellow, 120=green, 180=cyan, 240=blue, 300=magenta)

Return JSON only.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    file_urls: [item.file_url],
    response_json_schema: {
      type: 'object',
      properties: {
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
        color_palette: { type: 'string' },
        tint: { type: 'number' },
      },
    },
  });

  // Build flat tags array from all categories for backward compatibility
  const allTags = [
    ...(result.format || []),
    ...(result.film_stock || []),
    ...(result.color_type || []),
    ...(result.lighting || []),
    ...(result.mood || []),
    ...(result.subject || []),
  ].filter(Boolean).slice(0, 20);

  const update = {
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
    color_palette: ['warm', 'cool', 'neutral', 'dark', 'light', 'monochrome'].includes(result.color_palette) ? result.color_palette : null,
    tint: typeof result.tint === 'number' ? result.tint : null,
  };

  await base44.asServiceRole.entities.MediaItem.update(entityId, update);

  return Response.json({ success: true, caption: update.caption, tagCount: allTags.length });
});