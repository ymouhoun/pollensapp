import React, { useState, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import EntropyPrompt from '@/components/entropy/EntropyPrompt';
import EntropyContextMenu from '@/components/entropy/EntropyContextMenu';
import StudioStopped from '@/components/entropy/StudioStopped';
import StudioLoading from '@/components/entropy/StudioLoading';
import StudioError from '@/components/entropy/StudioError';
import InactivityToast from '@/components/entropy/InactivityToast';
import GenerationPreview from '@/components/entropy/GenerationPreview';
import useStudio from '@/hooks/useStudio';
import { base44 } from '@/api/base44Client';
import { useTheme, ThemeProvider } from '@/lib/ThemeContext';
import { Sun, Moon } from 'lucide-react';

function EntropyContent() {
  const [prompt, setPrompt] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('prompt') || '';
  });
  const [images, setImages] = useState([]);
  const [selectedModel, setSelectedModel] = useState('editorial.safetensors');
  const [contextMenu, setContextMenu] = useState(null);
  const inputRef = useRef(null);
  const { isDark, toggleTheme } = useTheme();

  const studio = useStudio();

  const handleImageContextMenu = useCallback((e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleSaveToMemory = useCallback(async () => {
    const url = studio.generatedImageUrl;
    if (!url) return;
    const res = await fetch(url);
    const blob = await res.blob();
    const file = new File([blob], `entropy-${Date.now()}.png`, { type: blob.type });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.MediaItem.create({ content_type: 'image', file_url, title: prompt.slice(0, 80) || 'Entropy generation' });
  }, [studio.generatedImageUrl, prompt]);

  const handleDownload = useCallback(() => {
    const url = studio.generatedImageUrl;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `entropy-${Date.now()}.png`;
    a.click();
  }, [studio.generatedImageUrl]);

  const handleDeleteGenerated = useCallback(() => {
    studio.clearGeneratedImage();
  }, [studio]);

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
    <div className={`fixed inset-0 overflow-hidden transition-colors duration-300 ${isDark ? 'bg-black' : 'bg-white'}`}>
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className={`fixed top-8 right-8 z-40 p-2 rounded-lg transition-all ${
          isDark 
            ? 'bg-white/10 hover:bg-white/20 text-white/60 hover:text-white/80' 
            : 'bg-black/10 hover:bg-black/20 text-black/60 hover:text-black/80'
        }`}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <InactivityToast visible={studio.showInactivityWarning} onKeepAlive={studio.keepAlive} isDark={isDark} />

      {/* Center area — state dependent */}
      <div className="w-full h-full flex items-center justify-center">
        {studio.status === 'STOPPED' && (
          <StudioStopped onStart={() => studio.startStudio(selectedModel)} isDark={isDark} />
        )}
        {studio.status === 'STARTING' && (
          <StudioLoading
            gpuName={studio.gpuName}
            costPerHour={studio.costPerHour}
            statusMessage={studio.statusMessage}
            bootProgress={studio.bootProgress}
            isDark={isDark}
          />
        )}
        {studio.status === 'ERROR' && (
          <StudioError message={studio.errorMessage} onRetry={handleRetry} isDark={isDark} />
        )}
        {studio.status === 'STOPPING' && (
          <p className={`text-xs tracking-widest uppercase ${isDark ? 'text-white/30' : 'text-black/30'}`} style={{ fontFamily: 'var(--font-sans)' }}>
            Session ended
          </p>
        )}
        {studio.status === 'READY' && !studio.generatedImageUrl && !studio.generatingPromptId && images.length === 0 && (
          <p className={`text-xs tracking-widest uppercase select-none ${isDark ? 'text-white/10' : 'text-black/10'}`} style={{ fontFamily: 'var(--font-sans)' }}>
            entropy
          </p>
        )}
        {studio.status === 'READY' && studio.generatingPromptId && !studio.generatedImageUrl && (
          <GenerationPreview
            previewUrl={studio.previewImageUrl}
            progress={studio.genProgress}
          />
        )}
        {studio.status === 'READY' && studio.generatedImageUrl && (
          <div
            className="max-w-lg max-h-[70vh] rounded-sm overflow-hidden shadow-2xl"
            onContextMenu={handleImageContextMenu}
          >
            <img src={studio.generatedImageUrl} alt="" className="w-full h-full object-contain" />
          </div>
        )}
      </div>

      {contextMenu && studio.generatedImageUrl && (
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
        isDark={isDark}
      />
    </div>
  );
}

export default function Entropy() {
  return (
    <ThemeProvider>
      <EntropyContent />
    </ThemeProvider>
  );
}