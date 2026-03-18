import React, { useState, useEffect, useRef, useCallback } from 'react';

const PALETTE = [
  '#BC82F3',
  '#F5B9EA',
  '#8D9FFF',
  '#AA6EEE',
  '#FF6778',
  '#FFBA71',
  '#C686FF',
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateStops(palette) {
  const colors = shuffle(palette);
  const positions = colors.map(() => Math.random()).sort((a, b) => a - b);
  return colors.map((color, i) => ({ color, pos: positions[i] }));
}

function stopsToCSS(stops) {
  return stops.map((s) => `${s.color} ${(s.pos * 100).toFixed(1)}%`).join(', ');
}

function hexToRGB(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

function interpolateColor(c1, c2, t) {
  const [r1, g1, b1] = hexToRGB(c1);
  const [r2, g2, b2] = hexToRGB(c2);
  return rgbToHex(lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t));
}

function interpolateStops(from, to, t) {
  return from.map((s, i) => ({
    color: interpolateColor(s.color, to[i].color, t),
    pos: lerp(s.pos, to[i].pos, t),
  }));
}

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function GrainFilter() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        <filter id="glow-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.75"
            numOctaves="4"
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix type="saturate" values="0" in="noise" result="mono" />
          <feBlend in="SourceGraphic" in2="mono" mode="overlay" />
        </filter>
      </defs>
    </svg>
  );
}

function GlowLayer({ stops, blur, strokeWidth, opacity, angle }) {
  const gradient = `conic-gradient(from ${angle}deg, ${stopsToCSS(stops)})`;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity,
        filter: blur > 0 ? `blur(${blur}px)` : 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: gradient,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: strokeWidth,
          background: '#000',
        }}
      />
    </div>
  );
}

export default function AppleGlowBorder({ children, active = true }) {
  const [fromStops, setFromStops] = useState(() => generateStops(PALETTE));
  const [toStops, setToStops] = useState(() => generateStops(PALETTE));
  const [progress, setProgress] = useState(0);
  const [angle, setAngle] = useState(0);

  const rafRef = useRef(null);
  const lastRef = useRef(performance.now());
  const cycleMs = useRef(randomBetween(1800, 2800));

  const tick = useCallback((now) => {
    setProgress((prev) => {
      const dt = now - lastRef.current;
      const next = prev + dt / cycleMs.current;

      if (next >= 1) {
        setFromStops((currentTo) => currentTo);
        setToStops((currentTo) => {
          const nextStops = generateStops(PALETTE);
          setFromStops(currentTo);
          return nextStops;
        });
        cycleMs.current = randomBetween(1800, 2800);
        return 0;
      }

      setAngle((currentAngle) => (currentAngle + dt * 0.012) % 360);
      lastRef.current = now;
      return next;
    });

    lastRef.current = now;
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, tick]);

  const t = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

  const currentStops = interpolateStops(fromStops, toStops, t);
  const angle2 = (angle + 137) % 360;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <GrainFilter />

      {active && (
        <>
          <GlowLayer stops={currentStops} blur={38} strokeWidth={32} opacity={0.45} angle={angle2} />
          <GlowLayer stops={currentStops} blur={18} strokeWidth={18} opacity={0.6} angle={angle} />
          <GlowLayer stops={currentStops} blur={7} strokeWidth={10} opacity={0.75} angle={angle2} />
          <GlowLayer stops={currentStops} blur={0} strokeWidth={4} opacity={0.9} angle={angle} />

          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              filter: 'url(#glow-grain)',
              mixBlendMode: 'overlay',
              opacity: 0.35,
              zIndex: 2,
            }}
          />
        </>
      )}

      <div className="relative z-[1] w-full h-full">{children}</div>
    </div>
  );
}