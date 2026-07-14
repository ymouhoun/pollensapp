import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_VISIBLE = 4;

const DECK_STYLES = [
  { offset: 0, blur: 0, scale: 1, opacity: 1 },
  { offset: -320, blur: 6, scale: 0.82, opacity: 0.7 },
  { offset: -520, blur: 10, scale: 0.72, opacity: 0.45 },
  { offset: -680, blur: 14, scale: 0.64, opacity: 0.25 },
];

export default function ImageDeck({ images, onBringToFront, onContextMenu }) {
  const visible = images.slice(0, MAX_VISIBLE);
  const swipeDistance = useRef(0);
  const lastSwipe = useRef(0);

  const handleWheel = (event) => {
    if (!onBringToFront || images.length < 2 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    const now = Date.now();
    if (now - lastSwipe.current < 450) {
      swipeDistance.current = 0;
      return;
    }

    swipeDistance.current += event.deltaX;
    if (Math.abs(swipeDistance.current) < 45) return;

    const nextImage = swipeDistance.current > 0 ? images[1] : images[images.length - 1];
    swipeDistance.current = 0;
    lastSwipe.current = now;
    onBringToFront(nextImage.id);
  };

  return (
    <div className="relative" style={{ width: 420, height: 560 }} onWheel={handleWheel}>
      <AnimatePresence>
        {visible.map((img, index) => {
          const style = DECK_STYLES[index] || DECK_STYLES[DECK_STYLES.length - 1];
          const isFront = index === 0;

          return (
            <motion.div
              key={img.id}
              className="absolute inset-0 rounded-sm overflow-hidden shadow-2xl"
              initial={{ opacity: 0, scale: 0.95, x: 0 }}
              animate={{
                x: style.offset,
                scale: style.scale,
                opacity: style.opacity,
                filter: `blur(${style.blur}px)`,
                zIndex: MAX_VISIBLE - index,
              }}
              exit={{ opacity: 0, scale: 0.9, x: style.offset - 100 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 28,
                mass: 1,
              }}
              style={{ cursor: isFront ? 'default' : 'pointer' }}
              onClick={!isFront && onBringToFront ? () => onBringToFront(img.id) : undefined}
              onContextMenu={isFront && onContextMenu ? onContextMenu : undefined}
            >
              <img
                src={img.url}
                alt=""
                className="w-full h-full object-contain bg-black"
                draggable={false}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}