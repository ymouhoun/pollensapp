import React, { useState, useRef, useCallback, useEffect } from 'react';
import EntropyPrompt from '@/components/entropy/EntropyPrompt';
import EntropyContextMenu from '@/components/entropy/EntropyContextMenu';
import StudioStopped from '@/components/entropy/StudioStopped';
import StudioLoading from '@/components/entropy/StudioLoading';
import StudioError from '@/components/entropy/StudioError';
import InactivityToast from '@/components/entropy/InactivityToast';
import GenerationPreview from '@/components/entropy/GenerationPreview';
import ImageDeck from '@/components/entropy/ImageDeck';
import useStudio, { MODELS } from '@/lib/useStudio';
import { base44 } from '@/api/base44Client';

export default function Entropy() {
  const [prompt, setPrompt] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('prompt') || '';
  });
  const [deck, setDeck] = useState(() => {
    try {
      const saved = localStorage.getItem('entropy_deck');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Persist deck to localStorage
  useEffect(() => {
    try { localStorage.setItem('entropy_deck', JSON.stringify(deck.slice(0, 5))); } catch {}
  }, [deck]);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].checkpoint);
  const [contextMenu, setContextMenu] = useState(null);
  const inputRef = useRef(null);
  const lastSeenUrl = useRef(null);

  const studio = useStudio();

  // When a new generated image appears, push it to front of deck
  useEffect(() => {
    const url = studio.generatedImageUrl;
    if (url && url !== lastSeenUrl.current) {
      lastSeenUrl.current = url;
      setDeck(prev => [{ id: Date.now(), url }, ...prev].slice(0, 5));
    }
  }, [studio.generatedImageUrl]);

  const handleBringToFront = useCallback((id) => {
    setDeck(prev => {
      const idx = prev.findIndex(img => img.id === id);
      if (idx <= 0) return prev;
      const item = prev[idx];
      const rest = prev.filter((_, i) => i !== idx);
      return [item, ...rest];
    });
  }, []);

  const handleImageContextMenu = useCallback((e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const frontImageUrl = deck.length > 0 ? deck[0].url : null;

  const handleSaveToMemory = useCallback(async () => {
    if (!frontImageUrl) return;
    const res = await fetch(frontImageUrl);
    const blob = await res.blob();
    const file = new File([blob], `entropy-${Date.now()}.png`, { type: blob.type });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.MediaItem.create({ content_type: 'image', file_url, title: prompt.slice(0, 80) || 'Entropy generation' });
  }, [frontImageUrl, prompt]);

  const handleDownload = useCallback(() => {
    if (!frontImageUrl) return;
    const a = document.createElement('a');
    a.href = frontImageUrl;
    a.download = `entropy-${Date.now()}.png`;
    a.click();
  }, [frontImageUrl]);

  const handleDeleteGenerated = useCallback(() => {
    setDeck(prev => prev.slice(1));
  }, []);

  const handleGenerate = async (params) => {
    if (!prompt.trim() || studio.generatingPromptId) return;
    studio.generate({
      positivePrompt: prompt,
      steps: params.steps,
      cfg: params.cfg,
      shift: params.shift,
      aspectRatio: params.aspectRatio,
      sampler: params.sampler,
      scheduler: params.scheduler,
      seed: params.seed,
    });
  };

  const handleRetry = async () => {
    await studio.stopStudio();
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <InactivityToast visible={studio.showInactivityWarning} onKeepAlive={studio.keepAlive} />

      {/* Center area — state dependent */}
      <div className="w-full h-full flex items-center justify-center">
        {studio.status === 'STOPPED' && (
          <StudioStopped onStart={() => studio.startStudio(selectedModel)} />
        )}
        {studio.status === 'STARTING' && (
          <StudioLoading
            gpuName={studio.gpuName}
            costPerHour={studio.costPerHour}
            statusMessage={studio.statusMessage}
            bootProgress={studio.bootProgress}
          />
        )}
        {studio.status === 'ERROR' && (
          <StudioError message={studio.errorMessage} onRetry={handleRetry} />
        )}
        {studio.status === 'STOPPING' && (
          <p className="text-xs text-white/30 tracking-widest uppercase">
            Session ended
          </p>
        )}
        {studio.status === 'READY' && !studio.generatingPromptId && deck.length === 0 && (
          <p className="text-white/10 text-xs tracking-widest uppercase select-none">
            entropy
          </p>
        )}
        {studio.status === 'READY' && (studio.generatingPromptId || deck.length > 0) && (
          <div className="relative flex items-center justify-center">
            {/* Deck behind — shifted left when generating to make room */}
            {deck.length > 0 && (
              <div
                className="absolute"
                style={{
                  transform: studio.generatingPromptId ? 'translateX(-320px) scale(0.82)' : 'translateX(0)',
                  filter: studio.generatingPromptId ? 'blur(6px)' : 'none',
                  opacity: studio.generatingPromptId ? 0.7 : 1,
                  transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: 1,
                }}
              >
                <ImageDeck
                  images={deck}
                  onBringToFront={studio.generatingPromptId ? undefined : handleBringToFront}
                  onContextMenu={studio.generatingPromptId ? undefined : handleImageContextMenu}
                />
              </div>
            )}
            {/* Generation preview in center */}
            {studio.generatingPromptId && (
              <div style={{ zIndex: 2 }}>
                <GenerationPreview
                  progress={studio.genProgress}
                  onStop={studio.interruptGeneration}
                  previewImageUrl={studio.previewImageUrl}
                  showFinalImage={false}
                  finalImageUrl={null}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {contextMenu && frontImageUrl && (
        <EntropyContextMenu
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onSaveToMemory={handleSaveToMemory}
          onDownload={handleDownload}
          onDelete={handleDeleteGenerated}
        />
      )}

      {/* Fixed bottom prompt bar — always visible */}
      <EntropyPrompt
        prompt={prompt}
        setPrompt={setPrompt}
        onGenerate={handleGenerate}
        generating={!!studio.generatingPromptId}
        inputRef={inputRef}
        studioStatus={studio.status}
        gpuName={studio.gpuName}
        onStopStudio={studio.stopStudio}
        onCancelGeneration={studio.cancelGeneration}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />
    </div>
  );
}
