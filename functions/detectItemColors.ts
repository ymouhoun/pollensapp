import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch items without color_palette or with missing values
    const allItems = await base44.asServiceRole.entities.MediaItem.list('-created_date', 500);
    const itemsToProcess = allItems.filter(
      item => item.content_type === 'image' && (!item.color_palette || item.color_palette === '')
    );

    let processed = 0;
    let updated = 0;
    const errors = [];

    for (const item of itemsToProcess) {
      processed++;
      try {
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this image and identify its predominant hue as a number between 0-360 degrees. 0=red, 60=yellow, 120=green, 180=cyan, 240=blue, 300=magenta. Return the hue value.`,
          file_urls: [item.file_url],
          response_json_schema: {
            type: 'object',
            properties: {
              tint: {
                type: 'number',
                minimum: 0,
                maximum: 360
              }
            }
          }
        });

        const tint = response.tint;
        if (typeof tint === 'number') {
          await base44.asServiceRole.entities.MediaItem.update(item.id, {
            tint
          });
          updated++;
        }
      } catch (error) {
        errors.push({ itemId: item.id, error: error.message });
      }
    }

    return Response.json({
      processed,
      updated,
      errors,
      message: `Processed ${processed} items, successfully updated ${updated} with color palettes`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});