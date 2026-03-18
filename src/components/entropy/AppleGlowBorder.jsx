import { useState, useEffect, useRef } from "react";

const PALETTE = [
  "#BC82F3", "#F5B9EA", "#8D9FFF", "#AA6EEE",
  "#FF6778", "#FFBA71", "#C686FF",
];

function lerp(a, b, t) { return a + (b - a) * t; }

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
  return stops.map((s) => `${s.color} ${(s.pos * 100).toFixed(1)}%`).join(", ");
}

function interpolateStops(from, to, t) {
  return from.map((s, i) => ({
    color: interpolateColor(s.color, to[i].color, t),
    pos: lerp(s.pos, to[i].pos, t),
  }));
}

function hexToRGB(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function interpolateColor(c1, c2, t) {
  const [r1, g1, b1] = hexToRGB(c1);
  const [r2, g2, b2] = hexToRGB(c2);
  return rgbToHex(lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t));
}

function GrainFilter() {
  return (
    <svg style={{ position: "absolute", width: 0, height: 0 }}>
      <defs>
        <filter id="glow-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" result="noise" />
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
    <div style={{ position: "absolute", inset: `-${blur}px`, overflow: "hidden", pointerEvents: "none", opacity, filter: blur > 0 ? `blur(${blur}px)` : "none" }}>
      <div style={{ position: "absolute", inset: 0, background: gradient }} />
      <div style={{ position: "absolute", inset: strokeWidth + blur, background: "#000", borderRadius: 12 }} />
    </div>
  );
}

function randomBetween(a, b) { return a + Math.random() * (b - a); }

export default function AppleGlowBorder({ children }) {
  const [, forceRender] = useState(0);

  const stateRef = useRef({
    fromStops: generateStops(PALETTE),
    toStops: generateStops(PALETTE),
    progress: 0,
    angle: 0,
    cycleMs: randomBetween(1800, 2800),
    lastTime: performance.now(),
  });

  useEffect(() => {
    let raf;
    const tick = (now) => {
      const s = stateRef.current;
      const dt = now - s.lastTime;
      s.lastTime = now;

      s.progress += dt / s.cycleMs;
      if (s.progress >= 1) {
        s.fromStops = s.toStops;
        s.toStops = generateStops(PALETTE);
        s.progress = 0;
        s.cycleMs = randomBetween(1800, 2800);
      }

      s.angle = (s.angle + dt * 0.012) % 360;

      forceRender((n) => n + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const s = stateRef.current;
  const t = s.progress < 0.5
    ? 2 * s.progress * s.progress
    : 1 - Math.pow(-2 * s.progress + 2, 2) / 2;

  const currentStops = interpolateStops(s.fromStops, s.toStops, t);
  const angle2 = (s.angle + 137) % 360;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#000", overflow: "hidden" }}>
      <GrainFilter />
      <GlowLayer stops={currentStops} blur={60} strokeWidth={6} opacity={0.35} angle={angle2} />
      <GlowLayer stops={currentStops} blur={30} strokeWidth={4} opacity={0.5} angle={s.angle} />
      <GlowLayer stops={currentStops} blur={12} strokeWidth={3} opacity={0.7} angle={angle2} />
      <GlowLayer stops={currentStops} blur={0} strokeWidth={2} opacity={0.9} angle={s.angle} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", filter: "url(#glow-grain)", mixBlendMode: "overlay", opacity: 0.35, zIndex: 2 }} />
      <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
        {children}
      </div>
    </div>
  );
}