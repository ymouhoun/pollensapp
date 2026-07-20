import React, { useState } from 'react';
import { extractComfySettings } from '@/lib/comfyMetadata';
import { motion } from 'framer-motion';
import { ChevronDown, ArrowUp, CircleX, ScanFace, SlidersHorizontal, Sparkles } from 'lucide-react';
import ComplementaryPromptNotch from './ComplementaryPromptNotch';
import { MODELS } from '@/lib/useStudio';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ASPECT_RATIOS = ['1:1', '3:4 (Golden Ratio)', '4:3', '9:16', '16:9', '21:9'];
const SAMPLERS = ['res_3m', 'res_2s', 'res_5s', 'er_sde', 'rk_beta', 'euler', 'dpmpp_2m'];
const SCHEDULERS = ['kl_optimal', 'beta57', 'ddim_uniform', 'simple', 'bong_tangent'];
const MAX_SEED = 999999999999;
const DEFAULT_COMPLEMENTARY_PROMPT = 'shot on Hasselblad X2D, 100MP, natural skin texture, high-fashion editorial, Harper’s Bazaar style, slight asymmetry in facial features, slight wrinkles or dimples';
const DEFAULT_FACE_PROMPT = 'Detailed natural face, expressive eyes, realistic skin texture, visible pores, subtle asymmetry, editorial portrait photography';

const sanitizeSeedValue = (value) => {
  const digitsOnly = String(value).replace(/\D/g, '').slice(0, 12);
  if (!digitsOnly) return '0';
  return String(Math.min(Number(digitsOnly), MAX_SEED));
};

const getRandomSeed = () => Math.floor(Math.random() * (MAX_SEED + 1));

export default function EntropyPrompt({
  prompt,
  setPrompt,
  onGenerate,
  onFaceDetail,
  operationMode,
  onOperationModeChange,
  onImageDrop,
  dropImageUrl,
  generating,
  inputRef,
  studioStatus,
  onCancelGeneration,
  selectedModel,
  onModelChange,
  faceLoras = [],
  faceCatalogError = '',
}) {
  const [complementaryPrompt, setComplementaryPrompt] = useState(DEFAULT_COMPLEMENTARY_PROMPT);
  const [complementaryOpen, setComplementaryOpen] = useState(false);
  const [cfg, setCfg] = useState(3.5);
  const [rescaleCfg, setRescaleCfg] = useState(0.7);
  const [rescaleEnabled, setRescaleEnabled] = useState(true);
  const [megapixels, setMegapixels] = useState(1.7);
  const [batchSize, setBatchSize] = useState(1);
  const [ratio, setRatio] = useState('3:4 (Golden Ratio)');
  const [shift, setShift] = useState(1.2);
  const [steps, setSteps] = useState(45);
  const [sampler, setSampler] = useState('res_2s');
  const [scheduler, setScheduler] = useState('kl_optimal');
  const [seedMode, setSeedMode] = useState('random');
  const [seedValue, setSeedValue] = useState(() => String(getRandomSeed()));
  const [expertCfg, setExpertCfg] = useState(3.2);
  const [expertRescaleCfg, setExpertRescaleCfg] = useState(0.7);
  const [expertRescaleEnabled, setExpertRescaleEnabled] = useState(true);
  const [expertMegapixels, setExpertMegapixels] = useState(1.6);
  const [expertRatio, setExpertRatio] = useState('3:4 (Golden Ratio)');
  const [expertShift, setExpertShift] = useState(1.3);
  const [expertSteps, setExpertSteps] = useState(40);
  const [expertImplicitSteps, setExpertImplicitSteps] = useState(2);
  const [expertImplicitEnabled, setExpertImplicitEnabled] = useState(true);
  const [expertScheduler, setExpertScheduler] = useState('kl_optimal');
  const [expertSeedMode, setExpertSeedMode] = useState('random');
  const [expertSeedValue, setExpertSeedValue] = useState(() => String(getRandomSeed()));
  const [faceId, setFaceId] = useState('');
  const [faceCfg, setFaceCfg] = useState(3.7);
  const [faceStrength, setFaceStrength] = useState(0.7);
  const [faceDenoise, setFaceDenoise] = useState(0.65);
  const [faceSteps, setFaceSteps] = useState(25);
  const [faceSampler, setFaceSampler] = useState('res_2s');
  const [faceScheduler, setFaceScheduler] = useState('kl_optimal');
  const [faceSeedMode, setFaceSeedMode] = useState('random');
  const [faceSeedValue, setFaceSeedValue] = useState(() => String(getRandomSeed()));
  const [faceSubmitting, setFaceSubmitting] = useState(false);
  const [dropError, setDropError] = useState('');
  const [promptEnhancerEnabled, setPromptEnhancerEnabled] = useState(false);

  const isReady = studioStatus === 'READY';
  const disabled = generating || faceSubmitting || !isReady;
  const modelSwitchDisabled = generating || faceSubmitting || ['STARTING', 'STOPPING'].includes(studioStatus);
  const selectedModelLabel = MODELS.find(model => model.checkpoint === selectedModel)?.label || MODELS[0].label;
  const compatibleFaces = React.useMemo(
    () => faceLoras.filter(face => !face.models?.length || face.models.includes(selectedModel)),
    [faceLoras, selectedModel],
  );
  const selectedFace = compatibleFaces.find(face => face.id === faceId) || null;

  React.useEffect(() => {
    const nextFace = compatibleFaces.find(face => face.id === faceId) || compatibleFaces[0];
    if (!nextFace) {
      if (faceId) setFaceId('');
      return;
    }
    if (faceId !== nextFace.id) setFaceId(nextFace.id);
    setFaceStrength(nextFace.strengths?.[selectedModel] ?? nextFace.defaultStrength ?? 0.7);
  }, [compatibleFaces, faceId, selectedModel]);

  const handleGenerate = () => {
    if (inputRef?.current) inputRef.current.style.height = 'auto';
    setComplementaryOpen(false);
    const nextSeed = seedMode === 'random' ? getRandomSeed() : Number(sanitizeSeedValue(seedValue));
    setSeedValue(String(nextSeed));
    onGenerate({ complementaryPrompt, steps, cfg, rescaleCfg, rescaleEnabled, megapixels, batchSize, shift, aspectRatio: ratio, sampler, scheduler, seed: nextSeed, promptEnhancer: promptEnhancerEnabled });
  };

  const handleExpertGenerate = () => {
    if (inputRef?.current) inputRef.current.style.height = 'auto';
    setComplementaryOpen(false);
    const nextSeed = expertSeedMode === 'random'
      ? getRandomSeed()
      : Number(sanitizeSeedValue(expertSeedValue));
    setExpertSeedValue(String(nextSeed));
    onGenerate({
      complementaryPrompt,
      steps: expertSteps,
      cfg: expertCfg,
      rescaleCfg: expertRescaleCfg,
      rescaleEnabled: expertRescaleEnabled,
      megapixels: expertMegapixels,
      aspectRatio: expertRatio,
      shift: expertShift,
      implicitSteps: expertImplicitSteps,
      implicitEnabled: expertImplicitEnabled,
      scheduler: expertScheduler,
      seed: nextSeed,
      expertMode: true,
      promptEnhancer: promptEnhancerEnabled,
    });
  };

  const handleFaceDetail = async () => {
    if (!selectedFace) {
      setDropError(faceCatalogError || 'No compatible Face LoRA is available for this model.');
      return;
    }
    if (!prompt.trim()) {
      setDropError('Describe the face treatment before starting.');
      return;
    }
    const nextSeed = faceSeedMode === 'random'
      ? getRandomSeed()
      : Number(sanitizeSeedValue(faceSeedValue));
    setFaceSeedValue(String(nextSeed));
    setFaceSubmitting(true);
    try {
      await onFaceDetail({
        faceLoraId: selectedFace.id,
        prompt: prompt.trim(),
        loraStrength: faceStrength,
        denoise: faceDenoise,
        steps: faceSteps,
        cfg: faceCfg,
        rescaleCfg: 0.7,
        sampler: faceSampler,
        scheduler: faceScheduler,
        seed: nextSeed,
      });
    } catch (error) {
      setDropError(error.message || 'Unable to start face detailing.');
    } finally {
      setFaceSubmitting(false);
    }
  };

  const handlePrimaryAction = () => {
    if (operationMode === 'face-detail') {
      if (!dropImageUrl) {
        setDropError('Import or generate an image first. The front image will be used as the source.');
        return;
      }
      setDropError('');
      void handleFaceDetail();
      return;
    }
    if (operationMode === 'expert') {
      handleExpertGenerate();
      return;
    }
    handleGenerate();
  };

  const handleOperationModeChange = (nextMode) => {
    if (nextMode === operationMode) return;
    setDropError('');
    setComplementaryOpen(false);
    if (nextMode === 'face-detail' && !prompt.trim()) setPrompt(DEFAULT_FACE_PROMPT);
    onOperationModeChange(nextMode);
  };

  const handleImageDrop = async (event) => {
    event.preventDefault();
    setDropError('');
    try {
      let file = event.dataTransfer.files?.[0];
      let imageUrl = event.dataTransfer.getData('application/x-entropy-image') ? dropImageUrl : '';
      if (!file && !imageUrl) {
        imageUrl = (event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain'))
          .split('\n').find(line => line && !line.startsWith('#')) || '';
      }
      if (!file && imageUrl) {
        const blob = await fetch(imageUrl.trim()).then(response => response.blob());
        file = new File([blob], 'entropy-drop.png', { type: blob.type || 'image/png' });
      }
      if (!file) throw new Error('Drop a PNG generated by Entropy or ComfyUI');

      const settings = await extractComfySettings(file);
      if (settings.positivePrompt) setPrompt(settings.positivePrompt);
      if (settings.complementaryPrompt !== undefined) setComplementaryPrompt(settings.complementaryPrompt);
      if (settings.cfg !== undefined) setCfg(Number(settings.cfg));
      if (settings.rescaleCfg !== undefined) setRescaleCfg(Number(settings.rescaleCfg));
      setRescaleEnabled(settings.rescaleEnabled);
      if (settings.megapixels !== undefined) setMegapixels(Number(settings.megapixels));
      if (settings.batchSize !== undefined) setBatchSize(Number(settings.batchSize));
      if (settings.aspectRatio) setRatio(settings.aspectRatio);
      if (settings.shift !== undefined) setShift(Number(settings.shift));
      if (settings.steps !== undefined) setSteps(Number(settings.steps));
      if (settings.sampler) setSampler(settings.sampler);
      if (settings.scheduler) setScheduler(settings.scheduler);
      setPromptEnhancerEnabled(settings.promptEnhancer === true);
      if (settings.seed !== undefined) {
        setSeedMode('fixed');
        setSeedValue(String(settings.seed));
      }
      onImageDrop(file);
    } catch (error) {
      setDropError(error.message || 'Unable to read this image');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed bottom-8 left-0 right-0 mx-auto z-30 w-[1080px] max-w-[calc(100vw-2rem)]"
    >
      {/* Model and workflow selectors above the box */}
      <div className="flex items-start mb-2.5 px-1 gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={modelSwitchDisabled}>
            <button
              type="button"
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/10 backdrop-blur-2xl transition-all outline-none disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(200,180,220,0.08) 100%)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)',
                fontFamily: 'var(--font-sans)',
              }}
              aria-label={`Selected model: ${selectedModelLabel}`}
            >
              <motion.span
                className="w-1 h-1 rounded-full bg-white"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              />
              <span className="text-[9px] tracking-widest uppercase text-white/80">
                {selectedModelLabel}
              </span>
              <ChevronDown className="w-2.5 h-2.5 text-white/35" strokeWidth={1.5} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="min-w-[150px] rounded-xl border-white/10 p-1.5 text-white shadow-2xl backdrop-blur-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(24,22,27,0.96) 0%, rgba(14,13,16,0.98) 100%)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <DropdownMenuRadioGroup value={selectedModel} onValueChange={onModelChange}>
              {MODELS.map(model => (
                <DropdownMenuRadioItem
                  key={model.checkpoint}
                  value={model.checkpoint}
                  className="rounded-lg py-1.5 pl-7 pr-3 text-[9px] tracking-widest uppercase text-white/50 outline-none focus:bg-white/10 focus:text-white/90 data-[state=checked]:text-white/90"
                >
                  {model.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {operationMode !== 'face-detail' && (
          <button
            type="button"
            disabled={generating || faceSubmitting}
            onClick={() => setPromptEnhancerEnabled(enabled => !enabled)}
            aria-pressed={promptEnhancerEnabled}
            aria-label={promptEnhancerEnabled ? 'Disable Prompt Enhancer' : 'Enable Prompt Enhancer'}
            className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[8px] uppercase tracking-widest outline-none backdrop-blur-2xl transition-all disabled:cursor-not-allowed disabled:opacity-40 ${promptEnhancerEnabled ? 'border-white/20 bg-white/15 text-white/90 shadow-sm' : 'border-white/10 bg-white/[0.06] text-white/35 hover:text-white/60'}`}
            style={{
              boxShadow: promptEnhancerEnabled
                ? '0 4px 22px rgba(210,190,255,0.16), inset 0 1px 0 rgba(255,255,255,0.16)'
                : '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
              fontFamily: 'var(--font-sans)',
            }}
            title="Enhance the subject prompt and negative prompt with Qwen 8B"
          >
            <Sparkles className="h-2.5 w-2.5" strokeWidth={1.5} />
            Enhance
          </button>
        )}
        {operationMode === 'face-detail' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={generating || faceSubmitting || !compatibleFaces.length}>
              <button
                type="button"
                className="flex max-w-[210px] items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 outline-none backdrop-blur-2xl transition-all disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(200,180,220,0.08) 100%)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)',
                  fontFamily: 'var(--font-sans)',
                }}
                aria-label={`Selected Face LoRA: ${selectedFace?.label || 'none'}`}
              >
                <ScanFace className="h-2.5 w-2.5 shrink-0 text-white/50" strokeWidth={1.5} />
                <span className="truncate text-[9px] uppercase tracking-widest text-white/80">
                  {selectedFace?.label || 'Face LoRA'}
                </span>
                <ChevronDown className="h-2.5 w-2.5 shrink-0 text-white/35" strokeWidth={1.5} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              sideOffset={8}
              className="max-h-72 min-w-[210px] overflow-y-auto rounded-xl border-white/10 p-1.5 text-white shadow-2xl backdrop-blur-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(24,22,27,0.96) 0%, rgba(14,13,16,0.98) 100%)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <DropdownMenuRadioGroup value={faceId} onValueChange={setFaceId}>
                {compatibleFaces.map(face => (
                  <DropdownMenuRadioItem
                    key={face.id}
                    value={face.id}
                    className="rounded-lg py-1.5 pl-7 pr-3 text-[9px] uppercase tracking-widest text-white/50 outline-none focus:bg-white/10 focus:text-white/90 data-[state=checked]:text-white/90"
                  >
                    {face.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <div
          className="flex items-center rounded-lg border border-white/10 p-0.5 backdrop-blur-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.09), rgba(200,180,220,0.05))',
            boxShadow: '0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
            fontFamily: 'var(--font-sans)',
          }}
          aria-label="Studio workflow"
        >
          <WorkflowModeButton
            active={operationMode === 'generation'}
            disabled={generating || faceSubmitting}
            icon={Sparkles}
            label="Generate"
            onClick={() => handleOperationModeChange('generation')}
          />
          <WorkflowModeButton
            active={operationMode === 'expert'}
            disabled={generating || faceSubmitting}
            icon={SlidersHorizontal}
            label="Expert"
            onClick={() => handleOperationModeChange('expert')}
          />
          <WorkflowModeButton
            active={operationMode === 'face-detail'}
            disabled={generating || faceSubmitting}
            icon={ScanFace}
            label="Face detail"
            onClick={() => handleOperationModeChange('face-detail')}
          />
        </div>
      </div>

      {operationMode !== 'face-detail' && (
        <ComplementaryPromptNotch
          value={complementaryPrompt}
          onChange={setComplementaryPrompt}
          open={complementaryOpen}
          onOpenChange={setComplementaryOpen}
        />
      )}

      <div
        className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl backdrop-blur-2xl"
        onDragOver={event => event.preventDefault()}
        onDrop={handleImageDrop}
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(200,180,220,0.05) 50%, rgba(180,160,210,0.08) 100%)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.15)',
        }}
      >
        {/* Text input */}
        <div className="px-5 pt-4 pb-2 relative">
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
              {isReady
                ? (operationMode === 'face-detail' ? 'Describe the face treatment...' : 'What do you want to create...')
                : 'Start the studio to generate...'}
            </motion.span>
          )}
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && isReady) { e.preventDefault(); e.target.style.height = 'auto'; handlePrimaryAction(); } }}
            disabled={disabled}
            rows={1}
            className="w-full bg-transparent text-white/75 text-[15px] outline-none resize-none overflow-hidden disabled:opacity-30"
            style={{ fontFamily: 'var(--font-sans)' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
          />
          {(dropError || (operationMode === 'face-detail' && faceCatalogError)) && (
            <p className="mt-1 text-[10px] text-red-300/70">
              {dropError || faceCatalogError}
            </p>
          )}
        </div>

        {/* Generation settings */}
        {operationMode === 'generation' ? (
          <div
          className="flex flex-wrap items-center justify-between gap-y-1 px-4 py-1.5 text-[10px] tracking-wide"
          style={{ fontFamily: 'var(--font-banana)' }}
          >
          {/* Left group */}
          <div className="flex items-center gap-1">
            <EditableParam label="CFG" value={cfg} onChange={setCfg} min={1} max={20} step={0.1} type="float" defaultValue={3.5} />
            <Divider />
            <EditableParam label="RESCALE" value={rescaleCfg} onChange={setRescaleCfg} min={0} max={1} step={0.1} type="float" defaultValue={0.7} enabled={rescaleEnabled} onToggle={() => setRescaleEnabled(enabled => !enabled)} />
            <Divider />
            <EditableParam label="PX" value={megapixels} onChange={setMegapixels} min={0.1} max={4} step={0.1} type="float" defaultValue={1.7} />
            <Divider />
            <EditableParam label="BATCH" value={batchSize} onChange={setBatchSize} min={1} max={4} step={1} defaultValue={1} />
            <Divider />
            <SelectParam
              label="RATIO"
              value={ratio}
              options={ASPECT_RATIOS}
              onChange={setRatio}
              defaultValue="3:4 (Golden Ratio)"
            />
            <Divider />
            <EditableParam label="STEPS" value={steps} onChange={setSteps} min={1} max={100} step={1} defaultValue={45} />
            <Divider />
            <EditableParam label="SHIFT" value={shift} onChange={setShift} min={0} max={3} step={0.1} type="float" defaultValue={1.2} />
          </div>

          {/* Right group */}
          <div className="flex items-center gap-1">
            <SeedParam mode={seedMode} onModeChange={setSeedMode} value={seedValue} onValueChange={setSeedValue} />
            <Divider />
            <SelectParam label="SAMPLER" value={sampler} options={SAMPLERS} onChange={setSampler} defaultValue="res_2s" />
            <Divider />
            <SelectParam label="SCHEDULER" value={scheduler} options={SCHEDULERS} onChange={setScheduler} defaultValue="kl_optimal" />
            <button
              onClick={generating ? onCancelGeneration : handlePrimaryAction}
              disabled={!generating && disabled}
              className="ml-1.5 w-6 h-6 flex items-center justify-center rounded-full transition-all disabled:opacity-20"
              style={{ background: generating ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)' }}
            >
              {generating ? (
                <CircleX className="w-3.5 h-3.5 text-white/60" strokeWidth={1.5} />
              ) : (
                <ArrowUp className="w-3.5 h-3.5 text-white/70" strokeWidth={2} />
              )}
            </button>
          </div>
          </div>
        ) : operationMode === 'expert' ? (
          <div
            className="flex flex-wrap items-center justify-between gap-y-1 px-4 py-1.5 text-[10px] tracking-wide"
            style={{ fontFamily: 'var(--font-banana)' }}
          >
            <div className="flex items-center gap-1">
              <EditableParam label="CFG" value={expertCfg} onChange={setExpertCfg} min={0} max={20} step={0.1} type="float" precision={1} defaultValue={3.2} />
              <Divider />
              <EditableParam label="RESCALE" value={expertRescaleCfg} onChange={setExpertRescaleCfg} min={0} max={1} step={0.1} type="float" defaultValue={0.7} enabled={expertRescaleEnabled} onToggle={() => setExpertRescaleEnabled(enabled => !enabled)} />
              <Divider />
              <EditableParam label="PX" value={expertMegapixels} onChange={setExpertMegapixels} min={0.1} max={4} step={0.1} type="float" defaultValue={1.6} />
              <Divider />
              <SelectParam label="RATIO" value={expertRatio} options={ASPECT_RATIOS} onChange={setExpertRatio} defaultValue="3:4 (Golden Ratio)" />
              <Divider />
              <EditableParam label="SHIFT" value={expertShift} onChange={setExpertShift} min={0} max={3} step={0.1} type="float" defaultValue={1.3} />
              <Divider />
              <EditableParam label="STEPS" value={expertSteps} onChange={setExpertSteps} min={1} max={100} step={1} defaultValue={40} />
              <Divider />
              <EditableParam label="IMPLICIT" value={expertImplicitSteps} onChange={setExpertImplicitSteps} min={1} max={20} step={1} defaultValue={2} enabled={expertImplicitEnabled} onToggle={() => setExpertImplicitEnabled(enabled => !enabled)} />
            </div>
            <div className="flex items-center gap-1">
              <SeedParam mode={expertSeedMode} onModeChange={setExpertSeedMode} value={expertSeedValue} onValueChange={setExpertSeedValue} />
              <Divider />
              <SelectParam label="SCHEDULER" value={expertScheduler} options={SCHEDULERS} onChange={setExpertScheduler} defaultValue="kl_optimal" />
              <button
                onClick={generating ? onCancelGeneration : handlePrimaryAction}
                disabled={!generating && disabled}
                className="ml-1.5 flex h-6 w-6 items-center justify-center rounded-full transition-all disabled:opacity-20"
                style={{ background: generating ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)' }}
                aria-label={generating ? 'Cancel generation' : 'Generate in Expert mode'}
              >
                {generating ? (
                  <CircleX className="h-3.5 w-3.5 text-white/60" strokeWidth={1.5} />
                ) : (
                  <ArrowUp className="h-3.5 w-3.5 text-white/70" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-wrap items-center justify-between gap-y-1 px-4 py-1.5 text-[10px] tracking-wide"
            style={{ fontFamily: 'var(--font-banana)' }}
          >
            <div className="flex items-center gap-1">
              <EditableParam label="CFG" value={faceCfg} onChange={setFaceCfg} min={0} max={20} step={0.1} type="float" precision={1} defaultValue={3.7} />
              <Divider />
              <EditableParam
                label="STRENGTH"
                value={faceStrength}
                onChange={setFaceStrength}
                min={0}
                max={2}
                step={0.01}
                type="float"
                precision={2}
                defaultValue={selectedFace?.strengths?.[selectedModel] ?? selectedFace?.defaultStrength ?? 0.7}
              />
              <Divider />
              <EditableParam label="DENOISER" value={faceDenoise} onChange={setFaceDenoise} min={0.2} max={1} step={0.01} type="float" precision={2} defaultValue={0.65} />
              <Divider />
              <EditableParam label="STEPS" value={faceSteps} onChange={setFaceSteps} min={1} max={60} step={1} defaultValue={25} />
            </div>
            <div className="flex items-center gap-1">
              <SeedParam mode={faceSeedMode} onModeChange={setFaceSeedMode} value={faceSeedValue} onValueChange={setFaceSeedValue} />
              <Divider />
              <SelectParam label="SAMPLER" value={faceSampler} options={SAMPLERS} onChange={setFaceSampler} defaultValue="res_2s" />
              <Divider />
              <SelectParam label="SCHEDULER" value={faceScheduler} options={SCHEDULERS} onChange={setFaceScheduler} defaultValue="kl_optimal" />
              <button
                onClick={generating ? onCancelGeneration : handlePrimaryAction}
                disabled={!generating && (disabled || !selectedFace)}
                className="ml-1.5 flex h-6 w-6 items-center justify-center rounded-full transition-all disabled:opacity-20"
                style={{ background: generating ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)' }}
                aria-label={generating ? 'Cancel generation' : 'Refine face'}
              >
                {generating ? (
                  <CircleX className="h-3.5 w-3.5 text-white/60" strokeWidth={1.5} />
                ) : (
                  <ArrowUp className="h-3.5 w-3.5 text-white/70" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function WorkflowModeButton({ active, disabled, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[8px] uppercase tracking-widest transition disabled:cursor-not-allowed disabled:opacity-40 ${active ? 'bg-white/10 text-white/80 shadow-sm' : 'text-white/30 hover:text-white/55'}`}
    >
      <Icon className="h-2.5 w-2.5" strokeWidth={1.5} />
      {label}
    </button>
  );
}

function EditableParam({ label, value, onChange, min, max, step = 1, type = 'number', precision = 1, defaultValue, enabled = true, onToggle }) {
  const displayValue = type === 'float' ? Number(value).toFixed(precision) : value;
  const startX = React.useRef(0);
  const startValue = React.useRef(value);

  const handlePointerDown = (e) => {
    e.preventDefault();
    if (!enabled) return;
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
    onChange(type === 'float' ? parseFloat(newValue.toFixed(precision)) : Math.round(newValue));
  };

  const handlePointerUp = () => {
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
  };

  return (
    <span className={`text-white/35 flex items-center gap-1 group transition-opacity ${enabled ? 'opacity-100' : 'opacity-30'}`}>
      <span
        onClick={onToggle}
        className={onToggle ? 'cursor-pointer select-none' : ''}
        title={onToggle ? (enabled ? `Disable ${label}` : `Enable ${label}`) : undefined}
      >
        {label}
      </span>{' '}
      <span
        onPointerDown={handlePointerDown}
        onDoubleClick={() => enabled && defaultValue !== undefined && onChange(defaultValue)}
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

function SeedParam({ mode, onModeChange, value, onValueChange }) {
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
    <span className="text-white/35 flex items-center gap-1">
      <span
        className="cursor-pointer select-none hover:text-white/55 transition-colors"
        onClick={() => onModeChange(mode === 'random' ? 'fixed' : 'random')}
        title={mode === 'random' ? 'Randomize (click to fix)' : 'Fixed (click to randomize)'}
      >
        SEED{mode === 'random' ? ' ~' : ''}
      </span>
      <span
        onPointerDown={handlePointerDown}
        className="text-white/65 font-medium cursor-ew-resize select-none hover:text-white/90 transition-colors"
      >
        {value}
      </span>
    </span>
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
