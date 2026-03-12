import React from 'react';
import { motion } from 'framer-motion';

export default function TextCard({ item, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.04 }}
      className="break-inside-avoid mb-3 p-6 rounded-xl bg-card border border-border/30 cursor-default"
    >
      <div className="text-2xl text-muted-foreground/40 font-display leading-none mb-3">"</div>
      <p className="text-sm font-light text-foreground/70 leading-relaxed text-center font-display italic">
        {item.text_content}
      </p>
      <div className="text-2xl text-muted-foreground/40 font-display leading-none mt-3 text-right">"</div>
      {item.title && (
        <p className="text-xs text-muted-foreground/50 text-center mt-2 font-light">— {item.title}</p>
      )}
    </motion.div>
  );
}