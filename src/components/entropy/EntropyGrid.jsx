import React from 'react';
import { motion } from 'framer-motion';

export default function EntropyGrid({ images = [] }) {
  // Left column (1-2 images)
  const leftImages = images.slice(0, 2);
  // Center image (1 large)
  const centerImage = images[2];
  // Right column (1-2 images)
  const rightImages = images.slice(3, 5);

  return (
    <div className="absolute inset-0 flex items-center justify-center px-8">
      {/* Left column */}
      <div className="flex flex-col gap-6 flex-shrink-0 max-w-[18%]">
        {leftImages.map((img, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-sm overflow-hidden shadow-xl"
            style={{
              aspectRatio: '3/4',
              width: '140px',
            }}
          >
            <img
              src={img.url}
              alt=""
              className="w-full h-full object-cover"
            />
          </motion.div>
        ))}
      </div>

      {/* Center large image */}
      {centerImage && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mx-8 flex-shrink-0 rounded-sm overflow-hidden shadow-2xl"
          style={{
            aspectRatio: '9/14',
            width: '280px',
          }}
        >
          <img
            src={centerImage.url}
            alt=""
            className="w-full h-full object-cover"
          />
        </motion.div>
      )}

      {/* Right column */}
      <div className="flex flex-col gap-6 flex-shrink-0 max-w-[18%]">
        {rightImages.map((img, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (i + 2) * 0.1 }}
            className="rounded-sm overflow-hidden shadow-xl"
            style={{
              aspectRatio: '3/4',
              width: '140px',
            }}
          >
            <img
              src={img.url}
              alt=""
              className="w-full h-full object-cover"
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}