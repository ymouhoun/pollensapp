import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const SAMPLERS = ['RES_2S', 'EULER', 'DPM++', 'DDIM'];
const SCHEDULERS = ['KL_OPTIMAL', 'KARRAS', 'NORMAL', 'EXPONENTIAL'];

export default function EntropyPrompt({ prompt, setPrompt, onGenerate, generating, inputRef }) {
  const [sampler, setSampler] = useState('RES_2S');
  const [scheduler, setScheduler] = useState('KL_OPTIMAL');
  const [cfg, setCfg] = useState(3.5);
  const [ratio, setRatio] = useState('3:4');
  const [steps, setSteps] = useState(50);
  const [batch, setBatch] = useState(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 w-[680px] max-w-[calc(100vw-2rem)]"
    >
      <div
        className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl backdrop-blur-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(200,180,220,0.05) 50%, rgba(180,160,210,0.08) 100%)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.15)',
        }}
      >
        {/* Text input */}
        <div className="px-5 py-4">
          <input
            ref={inputRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onGenerate()}
            placeholder="What do you want to create..."
            disabled={generating}
            className="w-full bg-transparent text-white/75 placeholder-white/30 text-[15px] outline-none"
            style={{ fontFamily: 'var(--font-sans)' }}
          />
        </div>

        {/* Metadata bar */}
        <div
          className="flex items-center justify-between px-5 py-2.5 border-t border-white/[0.07]"
          style={{ background: 'rgba(0,0,0,0.2)', fontFamily: 'var(--font-sans)' }}
        >
          {/* Left params */}
          <div className="flex items-center gap-3 text-[10px] tracking-widest">
            <MetaParam label="CFG" value={cfg} />
            <Divider />
            <MetaParam label="RATIO" value={ratio} />
            <Divider />
            <MetaParam label="STEPS" value={steps} />
            <Divider />
            <MetaParam label="BATCH" value={batch} />
          </div>

          {/* Right params */}
          <div className="flex items-center gap-3 text-[10px] tracking-widest">
            <SelectParam
              label="SAMPLER"
              value={sampler}
              options={SAMPLERS}
              onChange={setSampler}
            />
            <Divider />
            <SelectParam
              label="SCHEDULER"
              value={scheduler}
              options={SCHEDULERS}
              onChange={setScheduler}
            />
          </div>
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