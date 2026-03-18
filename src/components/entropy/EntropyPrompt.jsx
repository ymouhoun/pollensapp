import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import StudioIndicator from './StudioIndicator';
import { MODELS } from '@/hooks/useStudio';

const ASPECT_RATIOS = ['1:1', '3:4 (Golden Ratio)', '4:3', '9:16', '16:9', '21:9'];
const SAMPLERS = ['res_2s', 'res_5s', 'er_sde', 'rk_beta', 'euler', 'dpmpp_2m'];
const SCHEDULERS = ['kl_optimal', 'beta57', 'ddim_uniform', 'simple', 'bong_tangent'];
const MAX_SEED = 999999999999;

const sanitizeSeedValue = (value) => {
  const digitsOnly = String(value).replace(/\D/g, '').slice(0, 12);
  if (!digitsOnly) return '0';
  return String(Math.min(Number(digitsOnly), MAX_SEED));
};

const getRandomSeed = () => Math.floor(Math.random() * (MAX_SEED + 1));

export default function EntropyPrompt({ prompt, setPrompt, onGenerate, generating, inputRef, studioStatus, gpuName, onStopStudio, selectedModel, onModelChange }) {
  const [cfg, setCfg] = useState(3.0);
  const [ratio, setRatio] = useState('3:4 (Golden Ratio)');
  const [shift, setShift] = useState(1.0);
  const [steps, setSteps] = useState(40);
  const [sampler, setSampler] = useState('res_2s');
  const [scheduler, setScheduler] = useState('kl_optimal');
  const [seedMode, setSeedMode] = useState('random');
  const [seedValue, setSeedValue] = useState(() => String(getRandomSeed()));

  const isReady = studioStatus === 'READY';
  const disabled = generating || !isReady;

  const handleGenerate = () => {
    const nextSeed = seedMode === 'random' ? getRandomSeed() : Number(sanitizeSeedValue(seedValue));
    setSeedValue(String(nextSeed));
    onGenerate({ steps, cfg, shift, aspectRatio: ratio, sampler, scheduler, seed: nextSeed });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed bottom-8 left-0 right-0 mx-auto z-30 w-[680px] max-w-[calc(100vw-2rem)]"
    >
      {/* Model pill + studio indicator above the box */}
      <div className="flex items-start justify-between mb-2.5 px-1 gap-3">
        <div className="flex flex-wrap items-center gap-2">
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
          <SeedControl
            mode={seedMode}
            onModeChange={setSeedMode}
            value={seedValue}
            onValueChange={setSeedValue}
          />
        </div>
        <div className="pt-1">
          <StudioIndicator status={studioStatus} gpuName={gpuName} onStop={onStopStudio} />
        </div>
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
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && isReady) { e.preventDefault(); e.target.style.height = 'auto'; handleGenerate(); } }}
            disabled={disabled}
            rows={1}
            className="w-full bg-transparent text-white/75 text-[15px] outline-none resize-none overflow-hidden disabled:opacity-30"
            style={{ fontFamily: 'var(--font-sans)' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
          />
        </div>

        {/* Metadata bar */}
        <div
          className="flex flex-wrap items-center gap-2 px-4 py-2 text-[10px] tracking-widest"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          <EditableParam label="CFG" value={cfg} onChange={setCfg} min={1} max={20} step={0.1} type="float" defaultValue={3.0} />
          <Divider />
          <EditableParam label="STEPS" value={steps} onChange={setSteps} min={1} max={100} step={1} defaultValue={40} />
          <Divider />
          <SelectParam
            label="RATIO"
            value={ratio}
            options={ASPECT_RATIOS}
            onChange={setRatio}
            defaultValue="3:4 (Golden Ratio)"
          />
          <Divider />
          <EditableParam label="SHIFT" value={shift} onChange={setShift} min={0} max={3} step={0.1} type="float" defaultValue={1.0} />
          <Divider />
          <DragCycleParam label="SAMPLER" value={sampler} options={SAMPLERS} onChange={setSampler} defaultValue="res_2s" />
          <Divider />
          <DragCycleParam label="SCHEDULER" value={scheduler} options={SCHEDULERS} onChange={setScheduler} defaultValue="kl_optimal" />
        </div>
      </div>
    </motion.div>
  );
}

function EditableParam({ label, value, onChange, min, max, step = 1, type = 'number', defaultValue }) {
  const displayValue = type === 'float' ? value.toFixed(1) : value;
  const startX = React.useRef(0);
  const startValue = React.useRef(value);

  const handlePointerDown = (e) => {
    e.preventDefault();
    startX.current = e.clientX;
    startValue.current = value;
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e) => {
    const delta = e.clientX - startX.current;
    const range = max - min;
    const sensitivity = 150; // pixels to drag full range
    let newValue = startValue.current + (delta / sensitivity) * range;
    newValue = Math.round(newValue / step) * step;
    newValue = Math.max(min, Math.min(max, newValue));
    onChange(type === 'float' ? parseFloat(newValue.toFixed(1)) : Math.round(newValue));
  };

  const handlePointerUp = () => {
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
  };

  return (
    <span className="text-white/35 flex items-center gap-1 group">
      {label}{' '}
      <span
        onPointerDown={handlePointerDown}
        onDoubleClick={() => defaultValue !== undefined && onChange(defaultValue)}
        className="text-white/65 font-medium text-[10px] tracking-widest w-6 text-center cursor-ew-resize select-none hover:text-white/90 transition-colors"
      >
        {displayValue}
      </span>
    </span>
  );
}

function Divider() {
  return <span className="text-white/15">|</span>;
}

function SeedControl({ mode, onModeChange, value, onValueChange }) {
  const startX = React.useRef(0);
  const startValue = React.useRef(Number(value));

  const handlePointerDown = (e) => {
    e.preventDefault();
    startX.current = e.clientX;
    startValue.current = Number(value);
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e) => {
    const delta = e.clientX - startX.current;
    const digits = String(Math.max(1, Math.floor(startValue.current))).length;
    const step = Math.max(1, 10 ** Math.max(0, digits - 4));
    const nextValue = Math.max(0, Math.min(MAX_SEED, startValue.current + delta * step));
    onValueChange(String(Math.round(nextValue)));
  };

  const handlePointerUp = () => {
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      className="group flex items-center overflow-hidden rounded-lg border border-white/10 backdrop-blur-2xl transition-all duration-300 hover:w-[25rem] focus-within:w-[25rem]"
      style={{
        width: '10.75rem',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(200,180,220,0.03) 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div className="flex min-w-[10.75rem] items-center gap-2 px-2 py-1">
        <span className="text-[9px] tracking-widest uppercase text-white/35">Seed</span>
        <span
          onPointerDown={handlePointerDown}
          className="w-[7.25rem] cursor-ew-resize select-none text-[9px] font-medium tracking-widest text-white/75 transition-colors hover:text-white/90"
        >
          {value}
        </span>
      </div>
      <div className="flex items-center gap-1 border-l border-white/10 px-1.5 py-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        <SeedModeButton active={mode === 'fixed'} onClick={() => onModeChange('fixed')}>
          Fixed
        </SeedModeButton>
        <SeedModeButton active={mode === 'random'} onClick={() => onModeChange('random')}>
          Randomize
        </SeedModeButton>
      </div>
    </div>
  );
}

function SeedModeButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-[9px] uppercase tracking-widest transition-colors whitespace-nowrap ${active ? 'bg-white/14 text-white/80' : 'text-white/35 hover:text-white/65'}`}

    >
      {children}
    </button>
  );
}

function DragCycleParam({ label, value, options, onChange, defaultValue }) {
  const startX = React.useRef(0);
  const startIndex = React.useRef(0);
  const hasChanged = React.useRef(false);

  const handlePointerDown = (e) => {
    e.preventDefault();
    startX.current = e.clientX;
    startIndex.current = Math.max(0, options.indexOf(value));
    hasChanged.current = false;
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e) => {
    const delta = e.clientX - startX.current;
    const stepWidth = 24;
    const stepDelta = Math.trunc(delta / stepWidth);
    const nextIndex = Math.max(0, Math.min(options.length - 1, startIndex.current + stepDelta));
    if (nextIndex !== options.indexOf(value)) {
      hasChanged.current = true;
      onChange(options[nextIndex]);
    }
  };

  const handlePointerUp = () => {
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
  };

  const raw = typeof value === 'string' && value.includes('(') ? value.split(' ')[0] : value;
  const display = typeof raw === 'string' ? raw.toUpperCase() : raw;

  return (
    <span className="text-white/35 flex items-center gap-1">
      {label}{' '}
      <span
        onPointerDown={handlePointerDown}
        onDoubleClick={() => defaultValue !== undefined && onChange(defaultValue)}
        className="text-white/65 font-medium cursor-ew-resize select-none hover:text-white/90 transition-colors"
      >
        {display}
      </span>
    </span>
  );
}

function SelectParam({ label, value, options, onChange, defaultValue }) {
  // Show short display label
  const raw = typeof value === 'string' && value.includes('(') ? value.split(' ')[0] : value;
  const display = typeof raw === 'string' ? raw.toUpperCase() : raw;
  return (
    <span className="relative text-white/35 flex items-center gap-1">
      <span onDoubleClick={() => defaultValue !== undefined && onChange(defaultValue)}>{label}{' '}
      <span className="text-white/65 font-medium">{display}</span></span>
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