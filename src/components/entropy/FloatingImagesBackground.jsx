import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function FloatingImagesBackground({ items = [] }) {
  const floatingItems = useMemo(() => {
    return items.slice(0, 8).map((item, i) => {
      // Create multiple orbital paths
      const orbitIndex = i % 3;
      const orbitRadius = [280, 380, 480][orbitIndex];
      const duration = [25, 35, 45][orbitIndex];
      const startAngle = (i / 3) * 120;
      
      return {
        id: item.url + i,
        ...item,
        orbitRadius,
        duration,
        startAngle,
        size: [200, 240, 280][i % 3],
        zIndex: Math.floor(Math.random() * 10),
      };
    });
  }, [items]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Center point for orbits */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0 }}
      >
        <defs>
          {floatingItems.map((item) => (
            <path
              key={`path-${item.id}`}
              id={`orbit-${item.id}`}
              d={describeArc(
                window.innerWidth / 2,
                window.innerHeight / 2,
                item.orbitRadius,
                0,
                360
              )}
              fill="none"
            />
          ))}
        </defs>
      </svg>

      {/* Floating images */}
      {floatingItems.map((item) => (
        <motion.div
          key={item.id}
          className="absolute"
          animate={{
            offsetDistance: '100%',
          }}
          transition={{
            duration: item.duration,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            offsetPath: `circle(${item.orbitRadius}px)`,
            offsetRotate: '0deg',
            left: '50%',
            top: '50%',
            marginLeft: -item.size / 2,
            marginTop: -item.size / 2,
            zIndex: item.zIndex,
          }}
        >
          <div
            className="rounded-lg overflow-hidden shadow-2xl cursor-pointer hover:shadow-2xl transition-shadow"
            style={{
              width: item.size,
              height: item.size * 0.625,
              perspective: '1000px',
            }}
          >
            {item.content_type === 'video' ? (
              <video
                src={item.file_url}
                className="w-full h-full object-cover"
                muted
                autoPlay
                loop
              />
            ) : (
              <img
                src={item.file_url}
                alt={item.title}
                className="w-full h-full object-cover blur-sm hover:blur-none transition-all duration-300"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    largeArc,
    0,
    end.x,
    end.y,
  ].join(' ');
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}