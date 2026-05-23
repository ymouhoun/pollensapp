import React, { useEffect, useRef, useCallback, useState } from 'react';

const COLORS = ['#BC82F3', '#F5B9EA', '#8D9FFF', '#AA6EEE', '#FF6778', '#FFBA71', '#C686FF'];

const LAYERS = [
  { blur: 42, stroke: 36, opacity: 0.40 },
  { blur: 20, stroke: 20, opacity: 0.55 },
  { blur: 8,  stroke: 11, opacity: 0.72 },
  { blur: 2,  stroke: 5,  opacity: 0.88 },
];

function randomStops() {
  const positions = Array.from({ length: 7 }, () => Math.random() * 360);
  positions.sort((a, b) => a - b);
  return COLORS.map((color, i) => ({ color, pos: positions[i] }));
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function lerpColor(a, b, t) {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

function interpolateStops(from, to, t) {
  const e = easeInOut(t);
  return from.map((s, i) => ({
    color: lerpColor(s.color, to[i].color, e),
    pos: s.pos + (to[i].pos - s.pos) * e,
  }));
}

function buildConicGradient(stops, angleDeg) {
  const parts = stops.map(s => `${s.color} ${s.pos.toFixed(1)}deg`).join(', ');
  return `conic-gradient(from ${angleDeg.toFixed(2)}deg, ${parts})`;
}

export default function GlowBorder({ children, fullScreen = false }) {
  const containerRef = useRef(null);
  const layerRefs = useRef([]);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const stateRef = useRef({
    currentStops: randomStops(),
    targetStops: randomStops(),
    transitionStart: performance.now(),
    transitionDuration: 2000 + Math.random() * 1000,
    angle: 0,
    lastTime: performance.now(),
  });

  const tick = useCallback(() => {
    const now = performance.now();
    const st = stateRef.current;
    const dt = now - st.lastTime;
    st.lastTime = now;

    // Advance angle with sine wobble
    st.angle += 0.014 * dt;
    const wobble = Math.sin(now * 0.0005) * 3;

    // Interpolation progress
    let t = (now - st.transitionStart) / st.transitionDuration;
    if (t >= 1) {
      t = 1;
      st.currentStops = interpolateStops(st.currentStops, st.targetStops, 1);
      st.targetStops = randomStops();
      st.transitionStart = now;
      st.transitionDuration = 2000 + Math.random() * 1000;
    }

    const stops = interpolateStops(st.currentStops, st.targetStops, t);

    // Update each layer
    LAYERS.forEach((layer, i) => {
      const el = layerRefs.current[i];
      if (!el) return;
      const rotOffset = i % 2 === 0 ? 0 : 137;
      const gradient = buildConicGradient(stops, st.angle + wobble + rotOffset);
      el.style.background = gradient;
      el.style.filter = `blur(${layer.blur}px)`;
      el.style.opacity = layer.opacity;
    });

    // Grain canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      const imageData = ctx.createImageData(w, h);
      const data = imageData.data;
      for (let j = 0; j < data.length; j += 4) {
        const v = (Math.random() * 255) | 0;
        data[j] = v;
        data[j + 1] = v;
        data[j + 2] = v;
        data[j + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
    }

    animRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    // Set canvas to 1/3 resolution
    const canvas = canvasRef.current;
    if (canvas) {
      const resize = () => {
        canvas.width = Math.ceil(window.innerWidth / 3);
        canvas.height = Math.ceil(window.innerHeight / 3);
      };
      resize();
      window.addEventListener('resize', resize);
      return () => window.removeEventListener('resize', resize);
    }
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [tick]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        overflow: 'hidden',
      }}
    >
      {/* Glow layers */}
      {LAYERS.map((layer, i) => (
        <div key={i} style={{ position: 'absolute', inset: 0 }}>
          <div
            ref={el => { layerRefs.current[i] = el; }}
            style={{
              position: 'absolute',
              inset: 0,
            }}
          />
          {!fullScreen && (
            <div
              style={{
                position: 'absolute',
                inset: `${layer.stroke}px`,
                background: '#000',
                borderRadius: '0px',
              }}
            />
          )}
        </div>
      ))}

      {/* Grain overlay */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          mixBlendMode: 'overlay',
          opacity: 0.32,
          pointerEvents: 'none',
        }}
      />

      {/* Children content */}
      {children && (
        <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </div>
      )}
    </div>
  );
}