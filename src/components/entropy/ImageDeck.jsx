import React, { useState, useEffect } from 'react';

const MAX_VISIBLE = 4;

const DECK_STYLES = [
  { offset: 0, blur: 0, scale: 1, opacity: 1 },
  { offset: -80, blur: 4, scale: 0.92, opacity: 0.7 },
  { offset: -160, blur: 8, scale: 0.85, opacity: 0.5 },
  { offset: -240, blur: 12, scale: 0.78, opacity: 0.3 },
];

export default function ImageDeck({ images, onBringToFront, onContextMenu }) {
  const [enteringId, setEnteringId] = useState(null);

  // Animate entrance of newest image
  useEffect(() => {
    if (images.length === 0) return;
    const newest = images[0];
    setEnteringId(newest.id);
    const timer = setTimeout(() => setEnteringId(null), 50);
    return () => clearTimeout(timer);
  }, [images.length]);

  const visible = images.slice(0, MAX_VISIBLE);

  return (
    <div className="relative" style={{ width: 420, height: 560 }}>
      {visible.map((img, index) => {
        const reverseIndex = visible.length - 1 - index;
        const style = DECK_STYLES[index] || DECK_STYLES[DECK_STYLES.length - 1];
        const isEntering = enteringId === img.id && index === 0;
        const isFront = index === 0;

        return (
          <div
            key={img.id}
            className="absolute inset-0 rounded-sm overflow-hidden shadow-2xl"
            style={{
              zIndex: MAX_VISIBLE - index,
              transform: isEntering
                ? `translateX(0px) scale(0.97)`
                : `translateX(${style.offset}px) scale(${style.scale})`,
              opacity: isEntering ? 0 : style.opacity,
              filter: `blur(${style.blur}px)`,
              transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: isFront ? 'default' : 'pointer',
            }}
            onClick={!isFront ? () => onBringToFront(img.id) : undefined}
            onContextMenu={isFront ? onContextMenu : undefined}
          >
            <img
              src={img.url}
              alt=""
              className="w-full h-full object-contain bg-black"
              draggable={false}
            />
          </div>
        );
      })}
    </div>
  );
}