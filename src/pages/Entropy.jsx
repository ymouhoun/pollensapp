import React, { useState, useRef } from 'react';
import useStudioSession from '@/hooks/useStudioSession';
import StudioStopped from '@/components/entropy/StudioStopped';
import StudioStarting from '@/components/entropy/StudioStarting';
import StudioHeader from '@/components/entropy/StudioHeader';
import InactivityWarning from '@/components/entropy/InactivityWarning';
import GeneratedImage from '@/components/entropy/GeneratedImage';
import EntropyPrompt from '@/components/entropy/EntropyPrompt';

const ASPECT_RATIOS = ["1:1", "3:4 (Golden Ratio)", "4:3", "9:16", "16:9", "21:9"];

export default function Entropy() {
  const studio = useStudioSession();
  const [prompt, setPrompt] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('prompt') || '';
  });
  const inputRef = useRef(null);

  const handleGenerate = async (params) => {
    if (!prompt.trim() || studio.generating) return;
    await studio.generate({
      prompt: prompt.trim(),
      steps: params.steps,
      cfg: params.cfg,
      aspectRatio: params.ratio,
    });
  };

  // STOPPED state
  if (studio.status === "STOPPED") {
    return (
      <StudioStopped
        selectedModel={studio.selectedModel}
        setSelectedModel={studio.setSelectedModel}
        onStart={studio.startStudio}
        error={studio.error}
      />
    );
  }

  // STARTING state
  if (studio.status === "STARTING") {
    return (
      <StudioStarting
        gpuName={studio.gpuName}
        costPerHour={studio.costPerHour}
        statusMessage={studio.statusMessage}
        bootProgress={studio.bootProgress}
        onCancel={studio.destroyInstance}
      />
    );
  }

  // STOPPING state
  if (studio.status === "STOPPING") {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-white/30 text-xs tracking-widest uppercase" style={{ fontFamily: 'var(--font-sans)' }}>
          Session ended
        </p>
      </div>
    );
  }

  // READY state
  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <StudioHeader
        gpuName={studio.gpuName}
        costPerHour={studio.costPerHour}
        onStop={studio.destroyInstance}
      />

      <InactivityWarning
        visible={studio.inactivityWarning}
        onKeepAlive={studio.keepAlive}
      />

      {/* Canvas area for generated images */}
      <div className="w-full h-full flex items-center justify-center overflow-auto pb-36 pt-16 px-4">
        {studio.generatedImages.length === 0 && !studio.generating && (
          <p className="text-white/10 text-xs tracking-widest uppercase select-none" style={{ fontFamily: 'var(--font-sans)' }}>
            entropy
          </p>
        )}

        {studio.generating && studio.generatedImages.length === 0 && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
            <p className="text-white/20 text-[10px] tracking-widest uppercase" style={{ fontFamily: 'var(--font-sans)' }}>
              Generating...
            </p>
          </div>
        )}

        {studio.generatedImages.length > 0 && (
          <div className="flex flex-wrap gap-3 items-center justify-center max-w-4xl">
            {studio.generatedImages.map((img, i) => (
              <div key={i} className="w-72 sm:w-80">
                <GeneratedImage image={img} index={i} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prompt bar */}
      <EntropyPrompt
        prompt={prompt}
        setPrompt={setPrompt}
        onGenerate={handleGenerate}
        generating={studio.generating}
        inputRef={inputRef}
      />
    </div>
  );
}