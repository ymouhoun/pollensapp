import { liquidMetalFragmentShader, ShaderMount } from "@paper-design/shaders";
import { useEffect, useRef } from "react";

export default function LiquidMetalSurface({ children, className = "", style = {}, borderRadius = "16px" }) {
  const shaderRef = useRef(null);
  const mountRef = useRef(null);

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
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
        }
      `;
      document.head.appendChild(el);
    }

    if (shaderRef.current) {
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
    }

    return () => {
      if (mountRef.current?.destroy) {
        mountRef.current.destroy();
        mountRef.current = null;
      }
    };
  }, []);

  return (
    <div
      className={className}
      style={{ position: "relative", overflow: "hidden", borderRadius, ...style }}
    >
      {/* Shader background */}
      <div
        ref={shaderRef}
        className="lm-surface-shader"
        style={{
          position: "absolute",
          inset: 0,
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