import { liquidMetalFragmentShader, ShaderMount } from "@paper-design/shaders";
import { useEffect, useRef, useState } from "react";

export default function LiquidMetalSurface({ children, className = "", style = {}, borderRadius = "16px" }) {
  const containerRef = useRef(null);
  const shaderRef = useRef(null);
  const mountRef = useRef(null);
  const [ready, setReady] = useState(false);

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

  // Initialize shader after first render so the container has its final size
  useEffect(() => {
    if (!shaderRef.current) return;

    // Small delay to ensure layout is settled
    const timer = setTimeout(() => {
      if (mountRef.current?.destroy) mountRef.current.destroy();
      else if (mountRef.current?.dispose) mountRef.current.dispose();
      mountRef.current = new ShaderMount(
        shaderRef.current,
        liquidMetalFragmentShader,
        {
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
        },
        undefined,
        0.4,
      );
      setReady(true);
    }, 50);

    return () => {
      clearTimeout(timer);
      if (mountRef.current?.destroy) mountRef.current.destroy();
      else if (mountRef.current?.dispose) mountRef.current.dispose();
      mountRef.current = null;
    };
  }, []);

  // Handle resize — destroy and recreate shader
  useEffect(() => {
    if (!containerRef.current || !ready) return;
    const ro = new ResizeObserver(() => {
      if (!shaderRef.current || !mountRef.current) return;
      // Force canvas resize by destroying and recreating
      if (mountRef.current?.destroy) mountRef.current.destroy();
      else if (mountRef.current?.dispose) mountRef.current.dispose();
      mountRef.current = new ShaderMount(
        shaderRef.current,
        liquidMetalFragmentShader,
        {
          u_repetition: 6, u_softness: 0.4, u_shiftRed: 0.2, u_shiftBlue: 0.2,
          u_distortion: 0, u_contour: 0, u_angle: 30, u_scale: 12, u_shape: 1,
          u_offsetX: 0.05, u_offsetY: -0.05,
        },
        undefined, 0.4,
      );
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [ready]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", overflow: "hidden", borderRadius, ...style }}
    >
      {/* Shader background — takes full size of container */}
      <div
        ref={shaderRef}
        className="lm-surface-shader"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          borderRadius,
          overflow: "hidden",
          zIndex: 0,
        }}
      />
      {/* Dark inner layer for contrast */}
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