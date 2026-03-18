import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const ASPECT_RATIOS = ["1:1", "3:4 (Golden Ratio)", "4:3", "9:16", "16:9", "21:9"];

export default function EntropyPrompt({ prompt, setPrompt, onGenerate, generating, inputRef }) {
  const [cfg, setCfg] = useState(3.0);
  const [ratio, setRatio] = useState('3:4 (Golden Ratio)');
  const [steps, setSteps] = useState(40);

  const handleGenerate = () => {
    onGenerate({ steps, cfg, ratio });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed bottom-8 left-0 right-0 mx-auto z-30 w-[680px] max-w-[calc(100vw-2rem)]"
    >
      <div
        className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl backdrop-blur-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(200,180,220,0.05) 50%, rgba(180,160,210,0.08) 100%)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.15)',
        }}
      >
        {/* Text input */}
        <div className="px-5 py-4 relative">
          {!prompt && (
            <motion.span
              className="absolute top-4 left-5 text-[15px] pointer-events-none select-none bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(110deg, #404040, 35%, #888, 50%, #404040, 75%, #404040)',
                backgroundSize: '200% 100%',
                fontFamily: 'var(--font-sans)',
              }}
              animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
            >
              What do you want to create...
            </motion.span>
          )}
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
            disabled={generating}
            rows={1}
            className="w-full bg-transparent text-white/75 text-[15px] outline-none resize-none overflow-hidden"
            style={{ fontFamily: 'var(--font-sans)' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
          />
        </div>

        {/* Metadata bar */}
        <div
          className="flex items-center justify-between px-5 py-2.5"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          <div className="flex items-center gap-3 text-[10px] tracking-widest">
            <MetaParam label="CFG" value={cfg} />
            <Divider />
            <SelectParam
              label="RATIO"
              value={ratio}
              options={ASPECT_RATIOS}
              onChange={setRatio}
            />
            <Divider />
            <MetaParam label="STEPS" value={steps} />
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="px-4 py-1.5 rounded-lg text-[10px] tracking-widest uppercase transition-all disabled:opacity-20"
            style={{
              fontFamily: 'var(--font-sans)',
              background: generating ? 'transparent' : 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {generating ? (
              <div className="w-3 h-3 border border-white/20 border-t-white/50 rounded-full animate-spin" />
            ) : (
              'Generate'
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function MetaParam({ label, value }) {
  return (
    <span className="text-white/35">
      {label} <span className="text-white/65 font-medium">{value}</span>
    </span>
  );
}

function Divider() {
  return <span className="text-white/15">|</span>;
}

function SelectParam({ label, value, options, onChange }) {
  return (
    <span className="relative text-white/35 flex items-center gap-1">
      {label}{' '}
      <span className="text-white/65 font-medium">{value}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="w-2.5 h-2.5 text-white/30" />
    </span>
  );
}