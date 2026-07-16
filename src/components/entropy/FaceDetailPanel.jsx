import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanFace, Sparkles, X } from 'lucide-react';
import { MODELS } from '@/lib/useStudio';

const PRESETS = [
  { label: 'Natural', denoise: 0.45 },
  { label: 'Detail', denoise: 0.65 },
  { label: 'Recompose', denoise: 0.84 },
];

const DEFAULT_PROMPT = 'Detailed natural face, expressive eyes, realistic skin texture, visible pores, subtle asymmetry, editorial portrait photography';

export default function FaceDetailPanel({
  open,
  imageUrl,
  faces = [],
  selectedModel,
  studioReady,
  generating,
  initialPrompt,
  catalogError,
  onClose,
  onSubmit,
}) {
  const compatibleFaces = useMemo(
    () => faces.filter(face => !face.models?.length || face.models.includes(selectedModel)),
    [faces, selectedModel],
  );
  const [faceId, setFaceId] = useState('');
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [strength, setStrength] = useState(0.7);
  const [denoise, setDenoise] = useState(0.65);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!open) return;
    const first = compatibleFaces[0];
    setFaceId(first?.id || '');
    setStrength(first?.strengths?.[selectedModel] ?? first?.defaultStrength ?? 0.7);
    setPrompt(initialPrompt?.trim() || DEFAULT_PROMPT);
    setDenoise(0.65);
    setLocalError('');
  }, [open, imageUrl, initialPrompt, selectedModel, compatibleFaces]);

  const selectedFace = compatibleFaces.find(face => face.id === faceId);
  const modelLabel = MODELS.find(model => model.checkpoint === selectedModel)?.label || selectedModel;

  const handleFaceChange = (event) => {
    const nextId = event.target.value;
    const nextFace = compatibleFaces.find(face => face.id === nextId);
    setFaceId(nextId);
    setStrength(nextFace?.strengths?.[selectedModel] ?? nextFace?.defaultStrength ?? 0.7);
  };

  const handleSubmit = async () => {
    if (!faceId || !studioReady || generating || submitting) return;
    setSubmitting(true);
    setLocalError('');
    try {
      const started = await onSubmit({
        faceLoraId: faceId,
        prompt: prompt.trim() || DEFAULT_PROMPT,
        loraStrength: strength,
        denoise,
        steps: 25,
        cfg: 3.7,
        rescaleCfg: 0.7,
        sampler: 'res_2s',
        scheduler: 'kl_optimal',
        seed: Math.floor(Math.random() * 1_000_000_000_000),
      });
      if (started) onClose();
    } catch (error) {
      setLocalError(error.message || 'Unable to start face detailing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 px-4 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}
        >
          <motion.div
            className="grid w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 md:grid-cols-[0.82fr_1.18fr]"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            style={{
              background: 'linear-gradient(135deg, rgba(25,23,28,0.98), rgba(10,9,12,0.99))',
              boxShadow: '0 30px 100px rgba(0,0,0,0.65)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <div className="relative min-h-64 bg-black">
              <img src={imageUrl} alt="Source" className="absolute inset-0 h-full w-full object-contain" />
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[9px] uppercase tracking-widest text-white/55 backdrop-blur-xl">
                <ScanFace className="h-3 w-3" strokeWidth={1.4} />
                {modelLabel}
              </div>
            </div>

            <div className="relative p-6">
              <button type="button" onClick={onClose} className="absolute right-4 top-4 text-white/35 transition hover:text-white/80">
                <X className="h-4 w-4" strokeWidth={1.4} />
              </button>
              <div className="mb-5 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-white/55" strokeWidth={1.4} />
                <div>
                  <h2 className="text-sm font-light tracking-wide text-white/90">Face detail</h2>
                  <p className="text-[9px] uppercase tracking-widest text-white/30">Automatic detection · LoRA identity</p>
                </div>
              </div>

              <label className="mb-1.5 block text-[9px] uppercase tracking-widest text-white/35">Face</label>
              <select
                value={faceId}
                onChange={handleFaceChange}
                className="mb-4 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-xs text-white/80 outline-none"
              >
                {compatibleFaces.map(face => <option key={face.id} value={face.id}>{face.label}</option>)}
              </select>

              <label className="mb-1.5 block text-[9px] uppercase tracking-widest text-white/35">Face prompt</label>
              <textarea
                value={prompt}
                onChange={event => setPrompt(event.target.value)}
                rows={4}
                className="mb-4 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-light leading-relaxed text-white/75 outline-none placeholder:text-white/20"
              />

              <div className="mb-4 flex gap-1.5">
                {PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setDenoise(preset.denoise)}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-[9px] uppercase tracking-widest transition ${Math.abs(denoise - preset.denoise) < 0.01 ? 'border-white/20 bg-white/10 text-white/80' : 'border-white/5 bg-white/[0.03] text-white/30 hover:text-white/55'}`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <RangeControl label="LoRA strength" value={strength} min={0} max={1.5} step={0.01} onChange={setStrength} />
              <RangeControl label="Denoise" value={denoise} min={0.2} max={1} step={0.01} onChange={setDenoise} />

              {(catalogError || localError) && <p className="mt-3 text-[10px] text-red-300/75">{localError || catalogError}</p>}
              {!studioReady && <p className="mt-3 text-[10px] text-amber-200/60">Start the studio before launching face detail.</p>}
              {!compatibleFaces.length && !catalogError && <p className="mt-3 text-[10px] text-amber-200/60">No compatible face LoRA is configured for this model.</p>}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedFace || !studioReady || generating || submitting}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 py-2.5 text-[10px] uppercase tracking-[0.18em] text-white/75 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.4} />
                {submitting ? 'Preparing image…' : 'Refine face'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RangeControl({ label, value, min, max, step, onChange }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1.5 flex justify-between text-[9px] uppercase tracking-widest text-white/30">
        <span>{label}</span>
        <span>{Number(value).toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={event => onChange(Number(event.target.value))}
        className="w-full accent-white/70"
      />
    </label>
  );
}
