import React, { useState, useEffect, useRef, useMemo } from 'react';

const STATUS_MESSAGES = [
  "Processing your prompt...",
  "Rendering light and texture...",
  "Building composition...",
  "Refining details...",
  "Almost there...",
];

export default function GenerationPreview({ progress, onStop, showFinalImage, finalImageUrl }) {
  const { step, total } = progress;
  const [messageIndex, setMessageIndex] = useState(0);
  const [messageFade, setMessageFade] = useState(true);
  const [stopped, setStopped] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const grainRef = useRef(null);
  const startTime = useRef(Date.now());

  // Rotating status messages every 8s
  useEffect(() => {
    if (stopped || showFinalImage) return;
    const interval = setInterval(() => {
      setMessageFade(false);
      setTimeout(() => {
        setMessageIndex(i => (i + 1) % STATUS_MESSAGES.length);
        setMessageFade(true);
      }, 400);
    }, 8000);
    return () => clearInterval(interval);
  }, [stopped, showFinalImage]);

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

  // Progress ratio — time-based fallback smoothed with step data
  const progressRatio = useMemo(() => {
    if (stopped) return 0;
    if (total > 0 && step > 0) return Math.min(step / total, 0.99);
    // Time-based estimate: 90s default
    const elapsed = (Date.now() - startTime.current) / 1000;
    return Math.min(elapsed / 90, 0.95);
  }, [step, total, stopped]);

  const handleStop = () => {
    setStopped(true);
    onStop?.();
  };

  return (
    <div className="relative w-[420px] h-[560px] max-w-[90vw] max-h-[75vh] rounded-sm overflow-hidden select-none">
      {/* Dark background */}
      <div className="absolute inset-0 bg-[#0a0a0a]" />

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
        {/* Rotating status message */}
        <p
          className="text-[11px] text-white/50 mb-3 tracking-wide"
          style={{
            fontFamily: 'var(--font-sans)',
            opacity: messageFade ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        >
          {stopped ? "Generation stopped." : STATUS_MESSAGES[messageIndex]}
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
            : total > 0
              ? `Generating — step ${step} / ${total}`
              : "Generating..."
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