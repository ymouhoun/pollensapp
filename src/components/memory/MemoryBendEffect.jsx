import React, { useEffect, useRef } from 'react';

export default function MemoryBendEffect({ children }) {
  const surfaceRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const surface = surfaceRef.current;
    let previousY = window.scrollY;
    let current = 0;
    let target = 0;
    let frame = null;

    const render = () => {
      current += (target - current) * 0.12;
      target *= 0.88;
      surface.style.transformOrigin = current < 0 ? 'center top' : 'center bottom';
      surface.style.transform = `perspective(900px) rotateX(${current}deg) scaleX(${1 - Math.abs(current) * 0.0015})`;
      if (Math.abs(current) + Math.abs(target) > 0.01) frame = requestAnimationFrame(render);
      else frame = null;
    };
    const onScroll = () => {
      const nextY = window.scrollY;
      target = Math.max(-5, Math.min(5, (previousY - nextY) * 0.08));
      previousY = nextY;
      if (!frame) frame = requestAnimationFrame(render);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={surfaceRef} className="will-change-transform">{children}</div>;
}