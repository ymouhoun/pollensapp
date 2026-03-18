import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function GeneratedImage({ image, index }) {
  const [loaded, setLoaded] = useState(false);

  if (!image) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: loaded ? 1 : 0, scale: loaded ? 1 : 0.95 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="relative rounded-sm overflow-hidden shadow-2xl cursor-pointer group"
    >
      <img
        src={image.url}
        alt={image.prompt || ''}
        className="w-full h-full object-cover"
        onLoad={() => setLoaded(true)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
        <p className="text-white/70 text-[10px] tracking-wide line-clamp-2" style={{ fontFamily: 'var(--font-sans)' }}>
          {image.prompt}
        </p>
      </div>
    </motion.div>
  );
}