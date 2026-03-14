import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Camera } from 'lucide-react';

export default function EntropyPrompt({ prompt, setPrompt, onGenerate, generating, inputRef }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="absolute bottom-1/2 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-20"
    >
      <div className="bg-black/60 backdrop-blur-xl border border-white/20 rounded-lg overflow-hidden shadow-2xl min-w-[600px]">
        {/* Input area */}
        <div className="flex items-center gap-3 px-5 py-4">
          <button className="text-white/40 hover:text-white/60 transition-colors flex-shrink-0">
            <Plus className="w-4 h-4" strokeWidth={1.5} />
          </button>
          
          <input
            ref={inputRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onGenerate()}
            placeholder="What do you want to create..."
            className="flex-1 bg-transparent text-white/80 placeholder-white/40 text-sm font-light outline-none"
          />
          
          <button className="text-white/40 hover:text-white/60 transition-colors flex-shrink-0">
            <Camera className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Metadata bar */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-black/30">
          <div className="flex items-center gap-4 text-[10px] text-white/40 tracking-wider">
            <span>CFG 7.5</span>
            <span>RATIO 3:4</span>
            <span>STEPS 50</span>
            <span>BATCH 1</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-white/40 tracking-wider">
            <span>SAMPLER RES_25</span>
            <span>SCHEDULER KL_OPTIMAL</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}