import React, { useState, useEffect, useRef, useMemo } from 'react';

const STAGE_PROGRESS = {
  submitting: 0.03,
  searching_gpu: 0.07,
  starting_worker: 0.12,
  preparing_worker: 0.18,
  preparing_face_assets: 0.24,
  starting_comfy: 0.28,
  comfy_ready: 0.32,
  uploading_source: 0.35,
  queueing_workflow: 0.38,
  workflow_queued: 0.4,
  loading_models: 0.46,
  detecting_face: 0.52,
  refining_face: 0.62,
  sampling: 0.55,
  decoding: 0.88,
  refining_details: 0.92,
  saving: 0.96,
  finalizing: 0.98,
  completed: 1,
};

export default function GenerationPreview({
  progress,
  statusMessage,
  statusDetail,
  onStop,
  previewImageUrl,
  showFinalImage,
  finalImageUrl,
}) {
  const { step, total, stage } = progress;
  const [stopped, setStopped] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const grainRef = useRef(null);
  const startTime = useRef(Date.now());

  // Film grain animation — shift background-position every 100ms
  useEffect(() => {
    if (showFinalImage) return;
    const el = grainRef.current;
    if (!el) return;
    const interval = setInterval(() => {
      const x = Math.random() * 200;
      const y = Math.random() * 200;
      el.style.backgroundPosition = `${x}px ${y}px`;
    }, 100);
    return () => clearInterval(interval);
  }, [showFinalImage]);

  // Use real ComfyUI stages before sampler step data becomes available.
  const progressRatio = useMemo(() => {
    if (stopped) return 0;
    if (total > 0 && step > 0 && ['sampling', 'refining_face'].includes(stage)) {
      const start = stage === 'refining_face' ? 0.62 : 0.52;
      const span = stage === 'refining_face' ? 0.24 : 0.34;
      return Math.min(start + (step / total) * span, 0.9);
    }
    if (stage && STAGE_PROGRESS[stage] !== undefined) return STAGE_PROGRESS[stage];
    const elapsed = (Date.now() - startTime.current) / 1000;
    return Math.min(0.05 + elapsed / 600, 0.25);
  }, [step, total, stage, stopped]);

  const handleStop = () => {
    setStopped(true);
    onStop?.();
  };

  return (
    <div className="relative w-[420px] h-[560px] max-w-[90vw] max-h-[75vh] rounded-sm overflow-hidden select-none">
      {/* Dark background */}
      <div className="absolute inset-0 bg-[#0a0a0a]" />

      {/* Progressive preview supplied by the RunPod worker */}
      {!showFinalImage && previewImageUrl && (
        <img
          src={previewImageUrl}
          alt="Generation preview"
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            opacity: 0.82,
            filter: 'saturate(0.9) contrast(0.96)',
            transition: 'opacity 0.35s ease',
          }}
        />
      )}

      {/* Film grain overlay */}
      <div
        ref={grainRef}
        className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-screen"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px',
        }}
      />

      {/* Pulsing vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)',
          animation: 'vignettePulse 4s ease-in-out infinite',
        }}
      />

      {/* Final image crossfade */}
      {showFinalImage && finalImageUrl && (
        <img
          src={finalImageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.8s ease',
          }}
          onLoad={() => setImageLoaded(true)}
        />
      )}

      {/* Content overlay — hidden once image fades in */}
      <div
        className="absolute inset-0 flex flex-col justify-end p-6"
        style={{
          opacity: showFinalImage && imageLoaded ? 0 : 1,
          transition: 'opacity 0.8s ease',
          pointerEvents: showFinalImage && imageLoaded ? 'none' : 'auto',
        }}
      >
        {/* Real RunPod / ComfyUI status */}
        <p
          aria-live="polite"
          className="text-[11px] text-white/50 mb-3 tracking-wide"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {stopped ? 'Generation stopped.' : (statusMessage || 'Preparing generation')}
          {!stopped && statusDetail && (
            <span className="mt-1 block text-[10px] text-white/30">
              {statusDetail}
            </span>
          )}
        </p>

        {/* Progress bar */}
        <div className="w-full h-[1px] bg-white/10 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-white/60 rounded-full"
            style={{
              width: `${progressRatio * 100}%`,
              transition: 'width 2s ease',
            }}
          />
        </div>

        {/* Step counter */}
        <p
          className="text-[10px] text-white/40 tracking-widest"
          style={{ fontFamily: 'monospace' }}
        >
          {stopped
            ? ""
            : total > 0 && step > 0 && ['sampling', 'refining_face'].includes(stage)
              ? `Generating — step ${step} / ${total}`
              : (stage ? stage.replaceAll('_', ' ') : 'Preparing...')
          }
        </p>
      </div>

      {/* Stop button */}
      {!stopped && !showFinalImage && (
        <button
          onClick={handleStop}
          className="absolute bottom-6 right-6 text-[11px] text-white/40 hover:text-white/90 transition-opacity duration-200 tracking-wide z-10"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          ✕ Stop
        </button>
      )}

      {/* Vignette pulse keyframes */}
      <style>{`
        @keyframes vignettePulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
