import React from 'react';
import { motion } from 'framer-motion';

export default function FloatingImage({ item, style }) {
  const randomDuration = 6 + Math.random() * 6;
  const randomDelay = Math.random() * 3;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={style}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: [0, 0.4, 0.4, 0],
        scale: [0.8, 1, 1, 0.9],
        y: [0, -10, 5, 0],
        rotate: [0, 1, -1, 0]
      }}
      transition={{
        duration: randomDuration,
        delay: randomDelay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <div className="overflow-hidden rounded-lg shadow-lg shadow-black/10">
        <img
          src={item.file_url}
          alt=""
          className="object-cover"
          style={{ width: style.imgWidth || 120, height: style.imgHeight || 90 }}
        />
      </div>
    </motion.div>
  );
}