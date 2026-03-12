import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EntropyCard({ item, direction }) {
  if (!item) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={item.id}
        initial={{ opacity: 0, scale: 0.92, x: direction === 'left' ? -60 : direction === 'right' ? 60 : 0 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.92, x: direction === 'left' ? 60 : direction === 'right' ? -60 : 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <div className="relative w-72 sm:w-80 md:w-96 overflow-hidden rounded-2xl shadow-2xl shadow-black/15 border border-white/20">
          <img
            src={item.file_url}
            alt={item.title || ''}
            className="w-full aspect-[3/4] object-cover"
          />
          <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
        </div>

        {item.title && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-center text-sm text-muted-foreground font-light mt-4 tracking-wide"
          >
            {item.title}
          </motion.p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}