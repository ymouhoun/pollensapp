import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingBeam({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed top-0 left-0 right-0 z-[999] h-px overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-0 h-px"
            style={{
              width: '18%',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 20%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.15) 80%, transparent 100%)',
              boxShadow: '0 0 8px 2px rgba(255,255,255,0.6), 0 0 20px 4px rgba(255,255,255,0.2)',
            }}
            initial={{ left: '-18%' }}
            animate={{ left: '100%' }}
            exit={{ opacity: 0 }}
            transition={{
              left: {
                duration: 0.55,
                ease: [0.4, 0, 0.2, 1],
                repeat: Infinity,
                repeatDelay: 0.1,
              }
            }}
          />
        </div>
      )}
    </AnimatePresence>
  );
}