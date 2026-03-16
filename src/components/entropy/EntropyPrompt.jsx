import React from 'react';
import { motion } from 'framer-motion';

export default function EntropyPrompt({ prompt, setPrompt, onGenerate, generating, inputRef }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="absolute bottom-1/2 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-20 w-[620px] max-w-[90vw]"
    >
      <div
        className="rounded-2xl overflow-hidden border border-white/15 shadow-2xl backdrop-blur-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(200,180,220,0.06) 50%, rgba(180,160,210,0.10) 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.1)',
        }}
      >
        {/* Input area */}
        <div className="flex items-center gap-3 px-5 py-4">
          <input
            ref={inputRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onGenerate()}
            placeholder="What do you want to create..."
            className="flex-1 bg-transparent text-white/80 placeholder-white/35 text-sm font-light outline-none"
            style={{ fontFamily: "var(--font-gerstner)" }}
          />
        </div>

        {/* Metadata bar */}
        <div
          className="flex items-center justify-between px-5 py-2.5 border-t border-white/10"
          style={{ background: 'rgba(0,0,0,0.15)' }}
        >
          <div className="flex items-center gap-4 text-[10px] text-white/40 tracking-wider" style={{ fontFamily: "var(--font-gerstner)" }}>
            <span>CFG <span className="text-white/60">3.5</span></span>
            <span className="text-white/20">|</span>
            <span>RATIO <span className="text-white/60">3:4</span></span>
            <span className="text-white/20">|</span>
            <span>STEPS <span className="text-white/60">50</span></span>
            <span className="text-white/20">|</span>
            <span>BATCH <span className="text-white/60">1</span></span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-white/40 tracking-wider" style={{ fontFamily: "var(--font-gerstner)" }}>
            <span>SAMPLER <span className="text-white/60">RES_2S</span></span>
            <span className="text-white/20">|</span>
            <span>SCHEDULER <span className="text-white/60">KL_OPTIMAL</span></span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}