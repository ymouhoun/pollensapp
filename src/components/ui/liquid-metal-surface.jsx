import { liquidMetalFragmentShader, ShaderMount } from "@paper-design/shaders";
import { useEffect, useRef, useCallback } from "react";

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

  const cleanupMount = useCallback(() => {
    if (!mountRef.current) return;
    try { mountRef.current.destroy?.(); } catch {}
    try { mountRef.current.dispose?.(); } catch {}
    // Remove any leftover canvas elements
    if (shaderRef.current) {
      shaderRef.current.querySelectorAll('canvas').forEach(c => c.remove());
    }
    mountRef.current = null;
  }, []);

  const createMount = useCallback(() => {
    if (!shaderRef.current || !containerRef.current) return;
    cleanupMount();

    // Set explicit pixel dimensions on the shader container to match the outer container
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    shaderRef.current.style.width = `${rect.width}px`;
    shaderRef.current.style.height = `${rect.height}px`;

    mountRef.current = new ShaderMount(
      shaderRef.current,
      liquidMetalFragmentShader,
      SHADER_PARAMS,
      undefined,
      0.4,
    );
  }, [cleanupMount]);

  useEffect(() => {
    const styleId = "liquid-metal-surface-style";
    if (!document.getElementById(styleId)) {
      const el = document.createElement("style");
      el.id = styleId;
      el.textContent = `
        .lm-surface-shader canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
        }
      `;
      document.head.appendChild(el);
    }
  }, []);

  // Init shader after layout settles + handle resize
  useEffect(() => {
    const timer = setTimeout(createMount, 100);

    let ro;
    if (containerRef.current) {
      let lastW = 0, lastH = 0;
      ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        // Only recreate if size actually changed meaningfully
        if (Math.abs(width - lastW) > 2 || Math.abs(height - lastH) > 2) {
          lastW = width;
          lastH = height;
          createMount();
        }
      });
      ro.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timer);
      ro?.disconnect();
      cleanupMount();
    };
  }, [createMount, cleanupMount]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", overflow: "hidden", borderRadius, ...style }}
    >
      {/* Shader background */}
      <div
        ref={shaderRef}
        className="lm-surface-shader"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          borderRadius,
          overflow: "hidden",
          zIndex: 0,
        }}
      />
      {/* Dark inner layer */}
      <div
        style={{
          position: "absolute",
          inset: "1.5px",
          borderRadius: `calc(${borderRadius} - 1.5px)`,
          background: "linear-gradient(180deg, rgba(15,15,20,0.92) 0%, rgba(0,0,0,0.95) 100%)",
          zIndex: 1,
        }}
      />
      {/* Content */}
      <div style={{ position: "relative", zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
}