import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import StudioIndicator from './StudioIndicator';
import { MODELS } from '@/hooks/useStudio';

const ASPECT_RATIOS = ['1:1', '3:4 (Golden Ratio)', '4:3', '9:16', '16:9', '21:9'];
const SAMPLERS = ['res_2s', 'res_5s', 'er_sde', 'rk_beta', 'euler', 'dpmpp_2m'];
const SCHEDULERS = ['kl_optimal', 'beta57', 'ddim_uniform', 'simple', 'bong_tangent'];

export default function EntropyPrompt({ prompt, setPrompt, onGenerate, generating, inputRef, studioStatus, gpuName, onStopStudio, selectedModel, onModelChange }) {
  const [cfg, setCfg] = useState(3.0);
  const [ratio, setRatio] = useState('3:4 (Golden Ratio)');
  const [steps, setSteps] = useState(40);
  const [sampler, setSampler] = useState('res_2s');
  const [scheduler, setScheduler] = useState('kl_optimal');

  const isReady = studioStatus === 'READY';
  const disabled = generating || !isReady;

  const handleGenerate = () => {
    onGenerate({ steps, cfg, aspectRatio: ratio, sampler, scheduler });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed bottom-8 left-0 right-0 mx-auto z-30 w-[680px] max-w-[calc(100vw-2rem)]"
    >
      {/* Model pill above the box */}
      <div className="flex items-center gap-2 mb-2.5 px-1">
        {MODELS.map(m => (
          <button
            key={m.checkpoint}
            onClick={() => onModelChange(m.checkpoint)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/10 backdrop-blur-2xl transition-all"
            style={{
              background: selectedModel === m.checkpoint
                ? 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(200,180,220,0.08) 100%)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(200,180,220,0.03) 100%)',
              boxShadow: selectedModel === m.checkpoint
                ? '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)'
                : 'none',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <motion.span
              className="w-1 h-1 rounded-full bg-white"
              animate={{ opacity: selectedModel === m.checkpoint ? [0.3, 1, 0.3] : 0.15 }}
              transition={selectedModel === m.checkpoint ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : {}}
            />
            <span className={`text-[9px] tracking-widest uppercase ${selectedModel === m.checkpoint ? 'text-white/80' : 'text-white/30'}`}>
              {m.label}
            </span>
          </button>
        ))}
      </div>

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
              {isReady ? 'What do you want to create...' : 'Start the studio to generate...'}
            </motion.span>
          )}
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && isReady) { e.preventDefault(); handleGenerate(); } }}
            disabled={disabled}
            rows={1}
            className="w-full bg-transparent text-white/75 text-[15px] outline-none resize-none overflow-hidden disabled:opacity-30"
            style={{ fontFamily: 'var(--font-sans)' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
          />
        </div>

        {/* Metadata bar */}
        <div
          className="flex items-center justify-between px-5 py-2.5"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {/* Left params */}
          <div className="flex items-center gap-3 text-[10px] tracking-widest">
            <EditableParam label="CFG" value={cfg} onChange={setCfg} min={1} max={20} step={0.5} type="float" />
            <Divider />
            <SelectParam
              label="RATIO"
              value={ratio}
              options={ASPECT_RATIOS}
              onChange={setRatio}
            />
            <Divider />
            <EditableParam label="STEPS" value={steps} onChange={setSteps} min={1} max={100} step={1} />
          </div>

          {/* Right — sampler, scheduler, studio indicator */}
          <div className="flex items-center gap-3 text-[10px] tracking-widest">
            <SelectParam label="SAMPLER" value={sampler} options={SAMPLERS} onChange={setSampler} />
            <Divider />
            <SelectParam label="SCHEDULER" value={scheduler} options={SCHEDULERS} onChange={setScheduler} />
            <span className="ml-1"><StudioIndicator status={studioStatus} gpuName={gpuName} onStop={onStopStudio} /></span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EditableParam({ label, value, onChange, min, max, step = 1, type = 'number' }) {
  return (
    <span className="text-white/35 flex items-center gap-1">
      {label}{' '}
      <input
        type="number"
        value={value}
        onChange={e => onChange(type === 'float' ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className="bg-transparent text-white/65 font-medium w-10 text-center outline-none text-[10px] tracking-widest [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </span>
  );
}

function Divider() {
  return <span className="text-white/15">|</span>;
}

function SelectParam({ label, value, options, onChange }) {
  // Show short display label
  const display = typeof value === 'string' && value.includes('(') ? value.split(' ')[0] : value;
  return (
    <span className="relative text-white/35 flex items-center gap-1">
      {label}{' '}
      <span className="text-white/65 font-medium">{display}</span>
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