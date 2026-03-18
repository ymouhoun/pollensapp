import React, { useState, useRef, useEffect, useCallback } from 'react';

const SIZE = 64;
const STROKE = 2;
const CENTER = SIZE / 2;
const RADIUS = (SIZE - STROKE * 2) / 2 - 4;

// SVG arc arrow path
function arcArrowPath(r) {
  const startAngle = -30;
  const endAngle = 260;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const x1 = CENTER + r * Math.cos(toRad(startAngle));
  const y1 = CENTER + r * Math.sin(toRad(startAngle));
  const x2 = CENTER + r * Math.cos(toRad(endAngle));
  const y2 = CENTER + r * Math.sin(toRad(endAngle));
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  // Arrowhead at the start
  const ah = 6;
  const aAngle = toRad(startAngle);
  const tangentAngle = aAngle - Math.PI / 2; // perpendicular inward
  const ax1 = x1 + ah * Math.cos(aAngle + 0.5);
  const ay1 = y1 + ah * Math.sin(aAngle + 0.5);
  const ax2 = x1 + ah * Math.cos(aAngle - 0.5);
  const ay2 = y1 + ah * Math.sin(aAngle - 0.5);
  return {
    arc: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
    arrow: `M ${ax1} ${ay1} L ${x1} ${y1} L ${ax2} ${ay2}`,
  };
}

const paths = arcArrowPath(RADIUS);

export default function GenerateButton({ generating, onStart, onStop }) {
  const [stopping, setStopping] = useState(false);
  const rotation = useRef(0);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const svgRef = useRef(null);

  // Spin with requestAnimationFrame
  const spin = useCallback((timestamp) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const delta = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    rotation.current = (rotation.current + (delta / 1000) * 360) % 360;
    if (svgRef.current) {
      svgRef.current.style.transform = `rotate(${rotation.current}deg)`;
    }
    rafRef.current = requestAnimationFrame(spin);
  }, []);

  useEffect(() => {
    if (generating && !stopping) {
      lastTimeRef.current = null;
      rafRef.current = requestAnimationFrame(spin);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (svgRef.current) svgRef.current.style.transform = 'rotate(0deg)';
      rotation.current = 0;
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [generating, stopping, spin]);

  // Reset stopping when generation actually stops
  useEffect(() => {
    if (!generating) setStopping(false);
  }, [generating]);

  const handleClick = () => {
    if (stopping) return;
    if (generating) {
      setStopping(true);
      onStop();
      // Disable for 600ms handled by stopping state
      setTimeout(() => setStopping(false), 600);
    } else {
      onStart();
    }
  };

  const isIdle = !generating && !stopping;
  const isActive = generating && !stopping;
  const isStopping = stopping;

  const borderColor = isStopping ? '#8b949e' : isActive ? '#f85149' : '#58a6ff';
  const bgColor = isStopping ? 'rgba(139,148,158,0.06)' : isActive ? 'rgba(248,81,73,0.08)' : 'rgba(88,166,255,0.06)';
  const iconColor = isStopping ? '#8b949e' : isActive ? '#f85149' : '#58a6ff';
  const glowColor = isStopping ? 'none' : isActive ? '0 0 20px rgba(248,81,73,0.3)' : 'none';
  const hoverGlow = isIdle ? '0 0 24px rgba(88,166,255,0.25)' : glowColor;

  const label = isStopping ? 'Stopping...' : isActive ? 'Click to stop' : null;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleClick}
        disabled={isStopping}
        className="relative flex items-center justify-center transition-all duration-300 ease-out rounded-full group disabled:cursor-not-allowed"
        style={{
          width: SIZE,
          height: SIZE,
          border: `${STROKE}px solid ${borderColor}`,
          background: bgColor,
          boxShadow: glowColor,
          transition: 'border-color 0.3s, background 0.3s, box-shadow 0.3s, transform 0.15s',
        }}
        onMouseEnter={e => {
          if (isIdle) {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.boxShadow = hoverGlow;
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = glowColor;
        }}
      >
        {isStopping ? (
          /* Stop square */
          <div
            className="rounded-sm transition-all duration-300"
            style={{ width: 14, height: 14, background: '#8b949e' }}
          />
        ) : (
          /* Arc arrow */
          <svg
            ref={svgRef}
            width={SIZE - STROKE * 4}
            height={SIZE - STROKE * 4}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="transition-transform duration-300"
          >
            <path
              d={paths.arc}
              fill="none"
              stroke={iconColor}
              strokeWidth={2.5}
              strokeLinecap="round"
              style={{ transition: 'stroke 0.3s' }}
            />
            <path
              d={paths.arrow}
              fill="none"
              stroke={iconColor}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: 'stroke 0.3s' }}
            />
          </svg>
        )}
      </button>
      {label && (
        <span
          className="text-[10px] tracking-widest uppercase select-none transition-colors duration-300"
          style={{ color: isStopping ? '#8b949e' : '#f85149', fontFamily: 'var(--font-sans)' }}
        >
          {label}
        </span>
      )}
    </div>
  );
}