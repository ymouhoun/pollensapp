import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const VERSION = 'visual-analysis-v1';
const list = (value) => Array.isArray(value) ? value.filter(v => typeof v === 'string').map(v => v.trim()).filter(Boolean) : [];
const clamp = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const temporary = (error) => /429|rate|timeout|temporar|503|502|network|fetch/i.test(error.message || '');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function validate(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Réponse d’analyse vide ou invalide');
  const requiredText = ['caption_short_fr', 'caption_detailed_fr', 'caption_en'];
  for (const key of requiredText) if (typeof raw[key] !== 'string' || !raw[key].trim()) throw new Error(`Champ invalide: ${key}`);
  const location = ['intérieur', 'extérieur', 'indéterminé'].includes(raw.location_type) ? raw.location_type : 'indéterminé';
  const orientation = ['portrait', 'paysage', 'carré', 'indéterminée'].includes(raw.orientation) ? raw.orientation : 'indéterminée';
  const objects = Array.isArray(raw.objects) ? raw.objects.filter(o => o && typeof o.name_fr === 'string').map(o => ({ name_fr: o.name_fr.trim(), name_en: String(o.name_en || 'unknown').trim(), confidence: clamp(o.confidence) })) : [];
  const colors = Array.isArray(raw.dominant_colors) ? raw.dominant_colors.filter(c => c && /^#[0-9A-Fa-f]{6}$/.test(c.hex || '')).map(c => ({ name_fr: String(c.name_fr || 'inconnu'), name_en: String(c.name_en || 'unknown'), hex: c.hex.toUpperCase() })).slice(0, 8) : [];
  return {
    caption_short_fr: raw.caption_short_fr.trim(), caption_detailed_fr: raw.caption_detailed_fr.trim(), caption_en: raw.caption_en.trim(),
    objects, actions: list(raw.actions), scene_type: list(raw.scene_type), location_type: location,
    visual_style: list(raw.visual_style), visual_era: list(raw.visual_era), medium: list(raw.medium), mood: list(raw.mood),
    lighting: list(raw.lighting), composition: list(raw.composition), dominant_colors: colors, materials: list(raw.materials),
    textures: list(raw.textures), ocr_text: list(raw.ocr_text), keywords_fr: list(raw.keywords_fr), keywords_en: list(raw.keywords_en),
    people_count: Math.max(0, Math.round(Number(raw.people_count) || 0)), orientation,
    observations_certaines: list(raw.observations_certaines), interpretations_esthetiques: list(raw.interpretations_esthetiques),
    analysis_confidence: clamp(raw.analysis_confidence), analysis_warnings: list(raw.analysis_warnings),
  };
}

function searchable(item, data) {
  const values = [item.title, item.caption, item.caption_universal, item.manual_caption_short_fr, item.manual_caption_detailed_fr, item.manual_caption_en,
    data.caption_short_fr, data.caption_detailed_fr, data.caption_en, ...(item.tags || []), ...data.objects.flatMap(o => [o.name_fr, o.name_en]),
    ...data.actions, ...data.scene_type, data.location_type, ...data.visual_style, ...data.visual_era, ...data.medium, ...data.mood,
    ...data.lighting, ...data.composition, ...data.dominant_colors.flatMap(c => [c.name_fr, c.name_en, c.hex]), ...data.materials,
    ...data.textures, ...data.ocr_text, ...data.keywords_fr, ...data.keywords_en, ...data.observations_certaines, ...data.interpretations_esthetiques];
  return [...new Set(values.filter(v => typeof v === 'string').map(v => v.trim().toLowerCase()).filter(Boolean))].join(' · ');
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let entityId = null;
  try {
    const body = await req.json();
    if (!body?.event) {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    entityId = body?.event?.entity_id || body?.entity_id;
    if (!entityId) return Response.json({ skipped: 'no entity_id' });
    let item = await base44.asServiceRole.entities.MediaItem.get(entityId);
    if (!item || item.content_type !== 'image' || !item.file_url) return Response.json({ skipped: 'not an image' });
    if (item.analysis_status === 'completed' && !body.force) return Response.json({ skipped: 'already analyzed' });
    if (item.analysis_status === 'processing') {
      const lockAge = Date.now() - new Date(item.analysis_locked_at || 0).getTime();
      if (lockAge < 15 * 60 * 1000) return Response.json({ skipped: 'analysis already running' });
    }
    if (body.force || item.analysis_status !== 'pending') await base44.asServiceRole.entities.MediaItem.update(entityId, { analysis_status: 'pending', analysis_error: '' });

    const lock = crypto.randomUUID();
    await base44.asServiceRole.entities.MediaItem.updateMany({ id: entityId, analysis_status: 'pending' }, { $set: { analysis_status: 'processing', analysis_lock: lock, analysis_locked_at: new Date().toISOString(), analysis_attempts: 0 } });
    item = await base44.asServiceRole.entities.MediaItem.get(entityId);
    if (item.analysis_lock !== lock) return Response.json({ skipped: 'analysis already claimed' });

    const prompt = `Analyse visuellement cette image pour une photothèque et un moodboard. Décris uniquement ce qui est observable. N’invente jamais un lieu, une marque, une identité ou un contexte. Utilise "inconnu" ou [] si une information ne peut pas être déterminée. N’identifie aucune personne et ne déduis aucun attribut sensible. Sépare strictement observations certaines et interprétations esthétiques. Recopie tout OCR exactement, sans correction ni complément. Donne des mots-clés concrets, synonymes utiles, français et équivalents anglais. Couvre palette, ambiance, lumière, cadrage, matières, textures, époque visuelle et style graphique. Les confiances sont entre 0 et 1. Retourne exclusivement l’objet JSON conforme au schéma.`;
    const schema = {
      type: 'object', additionalProperties: false,
      properties: {
        caption_short_fr: { type: 'string' }, caption_detailed_fr: { type: 'string' }, caption_en: { type: 'string' },
        objects: { type: 'array', items: { type: 'object', properties: { name_fr: { type: 'string' }, name_en: { type: 'string' }, confidence: { type: 'number' } }, required: ['name_fr', 'name_en', 'confidence'] } },
        actions: { type: 'array', items: { type: 'string' } }, scene_type: { type: 'array', items: { type: 'string' } },
        location_type: { type: 'string', enum: ['intérieur', 'extérieur', 'indéterminé'] }, visual_style: { type: 'array', items: { type: 'string' } },
        visual_era: { type: 'array', items: { type: 'string' } }, medium: { type: 'array', items: { type: 'string' } }, mood: { type: 'array', items: { type: 'string' } },
        lighting: { type: 'array', items: { type: 'string' } }, composition: { type: 'array', items: { type: 'string' } },
        dominant_colors: { type: 'array', items: { type: 'object', properties: { name_fr: { type: 'string' }, name_en: { type: 'string' }, hex: { type: 'string' } }, required: ['name_fr', 'name_en', 'hex'] } },
        materials: { type: 'array', items: { type: 'string' } }, textures: { type: 'array', items: { type: 'string' } }, ocr_text: { type: 'array', items: { type: 'string' } },
        keywords_fr: { type: 'array', items: { type: 'string' } }, keywords_en: { type: 'array', items: { type: 'string' } }, people_count: { type: 'number' },
        orientation: { type: 'string', enum: ['portrait', 'paysage', 'carré', 'indéterminée'] }, analysis_confidence: { type: 'number' },
        analysis_warnings: { type: 'array', items: { type: 'string' } }, observations_certaines: { type: 'array', items: { type: 'string' } }, interpretations_esthetiques: { type: 'array', items: { type: 'string' } }
      },
      required: ['caption_short_fr','caption_detailed_fr','caption_en','objects','actions','scene_type','location_type','visual_style','visual_era','medium','mood','lighting','composition','dominant_colors','materials','textures','ocr_text','keywords_fr','keywords_en','people_count','orientation','analysis_confidence','analysis_warnings','observations_certaines','interpretations_esthetiques']
    };

    let data;
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      await base44.asServiceRole.entities.MediaItem.update(entityId, { analysis_attempts: attempt });
      try {
        const raw = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, file_urls: [item.file_url], response_json_schema: schema });
        data = validate(raw);
        break;
      } catch (error) {
        lastError = error;
        if (attempt === 3 || !temporary(error)) break;
        await sleep(attempt * 1500);
      }
    }
    if (!data) throw lastError || new Error('Analyse impossible');

    await base44.asServiceRole.entities.MediaItem.update(entityId, { ...data, searchable_text: searchable(item, data), analysis_status: 'processing', analysis_error: '', analysis_version: VERSION, analyzed_at: new Date().toISOString(), analysis_lock: '' });
    let embedError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await base44.asServiceRole.functions.invoke('embedMedia', { entity_id: entityId });
        embedError = null;
        break;
      } catch (error) {
        embedError = error;
        if (attempt < 3) await sleep(attempt * 1000);
      }
    }
    if (embedError) throw embedError;
    await base44.asServiceRole.entities.MediaItem.update(entityId, { analysis_status: 'completed', analysis_error: '' });
    return Response.json({ success: true, status: 'completed', version: VERSION });
  } catch (error) {
    if (entityId) await base44.asServiceRole.entities.MediaItem.update(entityId, { analysis_status: 'failed', analysis_error: String(error.message || error).slice(0, 500), analysis_lock: '' });
    return Response.json({ error: error.message || 'Analysis failed' }, { status: 500 });
  }
});