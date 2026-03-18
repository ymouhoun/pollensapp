import { liquidMetalFragmentShader, ShaderMount } from "@paper-design/shaders";
import { useEffect, useRef, useState, useCallback } from "react";

const SHADER_PARAMS = {
  u_repetition: 6,
  u_softness: 0.4,
  u_shiftRed: 0.2,
  u_shiftBlue: 0.2,
  u_distortion: 0,
  u_contour: 0,
  u_angle: 30,
  u_scale: 12,
  u_shape: 1,
  u_offsetX: 0.05,
  u_offsetY: -0.05,
};

export default function LiquidMetalSurface({ children, className = "", style = {}, borderRadius = "16px" }) {
  const containerRef = useRef(null);
  const shaderRef = useRef(null);
  const mountRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const cleanupMount = useCallback(() => {
    try {
      mountRef.current?.destroy?.();
    } catch {}
    try {
      mountRef.current?.dispose?.();
    } catch {}
    mountRef.current = null;
    shaderRef.current?.replaceChildren();
  }, []);

  useEffect(() => {
    const styleId = "liquid-metal-surface-style";
    if (!document.getElementById(styleId)) {
      const el = document.createElement("style");
      el.id = styleId;
      el.textContent = `
        .lm-surface-shader canvas {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          display: block !important;
        }
      `;
      document.head.appendChild(el);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (width > 0 && height > 0) {
        setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
      }
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!shaderRef.current || !size.width || !size.height) return;

    let cancelled = false;
    let frame1 = 0;
    let frame2 = 0;

    frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        if (cancelled || !shaderRef.current) return;

        cleanupMount();

        mountRef.current = new ShaderMount(
          shaderRef.current,
          liquidMetalFragmentShader,
          SHADER_PARAMS,
          undefined,
          0.4,
        );
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
      cleanupMount();
    };
  }, [size.width, size.height, cleanupMount]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", overflow: "hidden", borderRadius, ...style }}
    >
      <div
        ref={shaderRef}
        className="lm-surface-shader"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${size.width}px`,
          height: `${size.height}px`,
          borderRadius,
          overflow: "hidden",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "1.5px",
          borderRadius: `calc(${borderRadius} - 1.5px)`,
          background: "linear-gradient(180deg, rgba(15,15,20,0.92) 0%, rgba(0,0,0,0.95) 100%)",
          zIndex: 1,
        }}
      />
      <div style={{ position: "relative", zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
}