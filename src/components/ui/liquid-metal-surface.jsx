import { useEffect } from "react";

export default function LiquidMetalSurface({ children, className = "", style = {}, borderRadius = "16px" }) {
  useEffect(() => {
    const styleId = "liquid-metal-surface-style";
    if (!document.getElementById(styleId)) {
      const el = document.createElement("style");
      el.id = styleId;
      el.textContent = `
        @keyframes lmSurfaceShiftA {
          0% { transform: translate3d(-8%, -6%, 0) scale(1); }
          50% { transform: translate3d(6%, 4%, 0) scale(1.08); }
          100% { transform: translate3d(-8%, -6%, 0) scale(1); }
        }

        @keyframes lmSurfaceShiftB {
          0% { transform: translate3d(10%, 8%, 0) scale(1.04); }
          50% { transform: translate3d(-7%, -5%, 0) scale(1.12); }
          100% { transform: translate3d(10%, 8%, 0) scale(1.04); }
        }

        @keyframes lmSurfaceSheen {
          0% { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
          20% { opacity: 0.22; }
          50% { opacity: 0.08; }
          100% { transform: translateX(140%) skewX(-18deg); opacity: 0; }
        }
      `;
      document.head.appendChild(el);
    }
  }, []);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius,
        background: "linear-gradient(180deg, rgba(120,120,135,0.28) 0%, rgba(48,48,58,0.18) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(255,255,255,0.04)",
        ...style,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius,
          background:
            "radial-gradient(120% 140% at 12% 18%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 24%, rgba(255,255,255,0) 52%), radial-gradient(90% 120% at 88% 22%, rgba(168,156,198,0.24) 0%, rgba(168,156,198,0.08) 34%, rgba(168,156,198,0) 60%), linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 28%, rgba(0,0,0,0.16) 100%)",
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "-18%",
          borderRadius: "inherit",
          background:
            "radial-gradient(42% 58% at 24% 28%, rgba(255,255,255,0.22) 0%, rgba(180,180,200,0.12) 38%, rgba(255,255,255,0) 72%), radial-gradient(38% 54% at 76% 72%, rgba(164,152,190,0.18) 0%, rgba(120,120,150,0.08) 42%, rgba(255,255,255,0) 76%), radial-gradient(36% 52% at 56% 42%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 42%, rgba(255,255,255,0) 72%)",
          filter: "blur(24px)",
          animation: "lmSurfaceShiftA 12s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "-22%",
          borderRadius: "inherit",
          background:
            "radial-gradient(40% 62% at 76% 30%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 38%, rgba(255,255,255,0) 72%), radial-gradient(34% 48% at 28% 78%, rgba(146,134,170,0.2) 0%, rgba(146,134,170,0.08) 40%, rgba(255,255,255,0) 78%)",
          filter: "blur(28px)",
          animation: "lmSurfaceShiftB 16s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: "34%",
          background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 100%)",
          filter: "blur(10px)",
          animation: "lmSurfaceSheen 8s linear infinite",
          pointerEvents: "none",
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