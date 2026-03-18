import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const body = await req.json();
  const item = body?.data;
  const entityId = body?.event?.entity_id;

  // Only process images, skip if already has a color_palette or no file_url
  if (!item || item.content_type !== 'image' || !item.file_url || item.color_palette) {
    return Response.json({ skipped: true });
  }

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Analyze this image and classify its dominant color palette into exactly ONE of these categories:
- warm: dominated by reds, oranges, yellows, browns, golden tones
- cool: dominated by blues, greens, teals, purples, cold grays
- neutral: balanced mix of colors, no strong dominant hue, beiges, taupes
- dark: overall dark, shadowy, low-key image
- light: overall bright, airy, high-key, lots of whites and pastels
- monochrome: black and white or very desaturated, near single-hue

Reply with only the single category word.`,
    file_urls: [item.file_url],
    response_json_schema: {
      type: "object",
      properties: {
        color_palette: {
          type: "string",
          enum: ["warm", "cool", "neutral", "dark", "light", "monochrome"]
        }
      },
      required: ["color_palette"]
    }
  });

  const palette = result?.color_palette;
  if (palette && entityId) {
    await base44.asServiceRole.entities.MediaItem.update(entityId, { color_palette: palette });
  }

  return Response.json({ color_palette: palette });
});