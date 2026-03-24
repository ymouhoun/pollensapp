import React, { useState, useEffect, useRef } from 'react';

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';

export default function LogoRevealLoader({
  brandName = 'SOLWEIG',
  iconSrc = 'https://i.postimg.cc/fRsZkHHD/mini.png',
  statusMessages = ['HOLD TIGHT', 'HI THERE!'],
  onComplete,
}) {
  const [phase, setPhase] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [litCount, setLitCount] = useState(0);
  const [done, setDone] = useState(false);
  const scrambleRef = useRef(null);

  // Phase sequencing
  useEffect(() => {
    const timers = [];
    const t = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); };

    // Phase 1: initial pause
    t(() => setPhase(1), 500);

    // Phase 2: spinner + status + progress bar
    t(() => {
      setPhase(2);
      setStatusText(statusMessages[0] || 'HOLD TIGHT');
    }, 500);

    // Phase 3: letter reveal starts at 1.2s
    t(() => setPhase(3), 1200);

    // Phase 4: icon animation + scramble at 2.2s
    t(() => setPhase(4), 2200);

    // Phase 5: full logo displayed at 2.8s
    t(() => setPhase(5), 2800);

    // Phase 6: exit transition at 3.3s
    t(() => setPhase(6), 3300);

    // Done at ~4.2s
    t(() => {
      setDone(true);
      onComplete?.();
    }, 4200);

    return () => timers.forEach(clearTimeout);
  }, []);

  // Letter-by-letter illumination during phase 3
  useEffect(() => {
    if (phase < 3) return;
    if (litCount >= brandName.length) return;
    const id = setTimeout(() => setLitCount(c => c + 1), 80);
    return () => clearTimeout(id);
  }, [phase, litCount, brandName.length]);

  // Text scramble during phase 4
  useEffect(() => {
    if (phase !== 4) return;
    const target = statusMessages[1] || 'HI THERE!';
    const maxLen = Math.max((statusMessages[0] || '').length, target.length);
    let iteration = 0;
    const totalIterations = Math.ceil(400 / 30);

    scrambleRef.current = setInterval(() => {
      iteration++;
      const progress = iteration / totalIterations;
      let result = '';
      for (let i = 0; i < maxLen; i++) {
        if (i < target.length && progress > (i / maxLen) * 0.7 + 0.3) {
          result += target[i];
        } else if (i < target.length) {
          result += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        } else {
          result += progress > 0.8 ? '' : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      }
      setStatusText(result);

      if (iteration >= totalIterations) {
        clearInterval(scrambleRef.current);
        setStatusText(target);
      }
    }, 30);

    return () => clearInterval(scrambleRef.current);
  }, [phase, statusMessages]);

  if (done) return null;

  const showSpinner = phase >= 2 && phase < 4;
  const showStatus = phase >= 2 && phase < 6;
  const showProgress = phase >= 2 && phase < 6;
  const textScale = phase >= 3 ? 2 : 1;
  const iconSize = phase >= 6 ? 40 : phase >= 3 ? 40 : 24;
  const overlaySlide = phase >= 6;
  const textFadeOut = phase >= 6;
  const statusFadeOut = phase >= 6;

  // Icon filter logic (source is black on transparent)
  let iconFilter = 'brightness(0.3)';
  let iconOpacity = 0.2;
  let iconTransform = 'rotate(0deg) scale(1)';

  if (phase === 3) {
    iconFilter = 'brightness(0.4)';
    iconOpacity = 0.3;
  } else if (phase === 4) {
    iconFilter = 'brightness(0) invert(1)';
    iconOpacity = 1;
    iconTransform = 'rotate(360deg) scale(1.2)';
  } else if (phase === 5) {
    iconFilter = 'brightness(0) invert(1)';
    iconOpacity = 1;
    iconTransform = 'rotate(360deg) scale(1)';
  } else if (phase >= 6) {
    iconFilter = 'none';
    iconOpacity = 1;
    iconTransform = 'rotate(360deg) scale(3)';
  }

  return (
    <>
      <style>{`
        @keyframes lr-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes lr-progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes lr-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lr-icon-final-fade {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#0a0a0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: overlaySlide ? 'translateY(-100%)' : 'translateY(0)',
          transition: overlaySlide ? 'transform 600ms cubic-bezier(0.76, 0, 0.24, 1)' : 'none',
          willChange: 'transform',
        }}
      >
        {/* Center content */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${textScale})`,
            transition: 'transform 1s ease-out',
            willChange: 'transform',
          }}
        >
          {/* Spinner */}
          {showSpinner && (
            <div
              style={{
                width: 20,
                height: 20,
                marginRight: 12,
                borderRadius: '50%',
                border: '2px solid transparent',
                borderTop: '2px solid #ffffff',
                borderRight: '2px solid #ffffff',
                borderBottom: '2px solid #ffffff',
                animation: 'lr-spin 0.8s linear infinite',
                opacity: phase >= 3 ? 0 : 1,
                transition: 'opacity 300ms ease',
                willChange: 'transform, opacity',
                flexShrink: 0,
              }}
            />
          )}

          {/* Brand letters */}
          <span
            style={{
              fontFamily: "Inter, system-ui, -apple-system, sans-serif",
              fontWeight: 400,
              fontSize: 24,
              letterSpacing: '2px',
              whiteSpace: 'nowrap',
              opacity: textFadeOut ? 0 : 1,
              transition: 'opacity 300ms ease',
              willChange: 'opacity',
            }}
          >
            {brandName.split('').map((char, i) => (
              <span
                key={i}
                style={{
                  color: phase >= 3 && i < litCount ? '#ffffff' : '#333333',
                  transition: 'color 120ms ease',
                  willChange: 'color',
                }}
              >
                {char}
              </span>
            ))}
          </span>

          {/* Icon PNG */}
          <img
            src={iconSrc}
            alt=""
            style={{
              width: iconSize,
              height: iconSize,
              marginLeft: 8,
              verticalAlign: 'middle',
              filter: iconFilter,
              opacity: iconOpacity,
              transform: iconTransform,
              transition: 'all 0.5s ease-in-out',
              willChange: 'transform, opacity, filter',
              pointerEvents: 'none',
              userSelect: 'none',
              flexShrink: 0,
            }}
          />
        </div>

        {/* Status text */}
        {showStatus && (
          <div
            style={{
              position: 'fixed',
              bottom: 60,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontFamily: "'Courier New', monospace",
              fontSize: 11,
              textTransform: 'uppercase',
              color: '#666666',
              letterSpacing: 3,
              animation: 'lr-fade-in 300ms ease forwards',
              opacity: statusFadeOut ? 0 : undefined,
              transition: statusFadeOut ? 'opacity 300ms ease' : undefined,
              willChange: 'opacity',
            }}
          >
            {statusText}
          </div>
        )}

        {/* Progress bar */}
        {showProgress && (
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              width: '100%',
              height: 2,
              background: '#1a1a1a',
            }}
          >
            <div
              style={{
                height: '100%',
                background: '#ffffff',
                animation: 'lr-progress 3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                willChange: 'width',
              }}
            />
          </div>
        )}
      </div>

      {/* Floating icon that remains after overlay slides away */}
      {phase >= 6 && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            animation: 'lr-icon-final-fade 300ms ease forwards',
            animationDelay: '400ms',
            opacity: 1,
          }}
        >
          <img
            src={iconSrc}
            alt=""
            style={{
              width: 120,
              height: 120,
              filter: 'none',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        </div>
      )}
    </>
  );
}