import { createClientFromRequest } from 'npm:@base44/sdk@0.8.39';

type FaceLora = {
  id: string;
  label: string;
  source: string;
  defaultStrength: number;
  strengths: Record<string, number>;
  models: string[];
  thumbnailUrl: string | null;
};

const VALID_MODELS = new Set([
  'editorial',
  'ambrojo',
  'still-life',
  '35mm',
  'stills',
  'super16',
  'beauty',
]);

function safeSource(value: unknown) {
  const source = String(value || '').trim();
  if (
    !source.startsWith('loras/')
    || !source.endsWith('.safetensors')
    || source.includes('..')
    || !/^loras\/[a-zA-Z0-9._\-/]+\.safetensors$/.test(source)
  ) {
    throw new Error(`Invalid LoRA source: ${source || '(empty)'}`);
  }
  return source;
}

function boundedStrength(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(2, parsed)) : fallback;
}

export function readFaceLoras(): FaceLora[] {
  const raw = Deno.env.get('FACE_LORAS_JSON');
  if (!raw) throw new Error('FACE_LORAS_JSON is not configured');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('FACE_LORAS_JSON is not valid JSON');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('FACE_LORAS_JSON must be an array');
  }

  const seen = new Set<string>();
  return parsed.map((entry: Record<string, unknown>) => {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid Face LoRA entry');
    const id = String(entry.id || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(id)) throw new Error(`Invalid Face LoRA id: ${id}`);
    if (seen.has(id)) throw new Error(`Duplicate Face LoRA id: ${id}`);
    seen.add(id);

    const source = safeSource(entry.source || `loras/${String(entry.filename || '')}`);
    const defaultStrength = boundedStrength(entry.defaultStrength, 0.7);
    const rawModels = Array.isArray(entry.models) ? entry.models.map(String) : [...VALID_MODELS];
    const models = rawModels.filter(model => VALID_MODELS.has(model));
    if (!models.length) throw new Error(`Face LoRA ${id} has no valid models`);

    const strengths: Record<string, number> = {};
    if (entry.strengths && typeof entry.strengths === 'object') {
      Object.entries(entry.strengths as Record<string, unknown>).forEach(([model, value]) => {
        if (VALID_MODELS.has(model)) strengths[model] = boundedStrength(value, defaultStrength);
      });
    }

    return {
      id,
      label: String(entry.label || id).trim().slice(0, 80),
      source,
      defaultStrength,
      strengths,
      models,
      thumbnailUrl: entry.thumbnailUrl ? String(entry.thumbnailUrl) : null,
    };
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const faces = readFaceLoras().map(face => ({
      id: face.id,
      label: face.label,
      defaultStrength: face.defaultStrength,
      strengths: face.strengths,
      models: face.models,
      thumbnailUrl: face.thumbnailUrl,
    }));
    return Response.json({ faces });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
