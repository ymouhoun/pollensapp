import React, { useState, useRef } from 'react';
import EntropyPrompt from '@/components/entropy/EntropyPrompt';

export default function Entropy() {
  const [prompt, setPrompt] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('prompt') || '';
  });
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState([]);
  const inputRef = useRef(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    const currentPrompt = prompt;
    // ComfyUI backend integration placeholder
    // TODO: connect to ComfyUI backend
    setGenerating(false);
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Canvas area for generated images */}
      <div className="w-full h-full flex items-center justify-center">
        {images.length === 0 && (
          <p className="text-white/10 text-xs tracking-widest uppercase select-none" style={{ fontFamily: 'var(--font-sans)' }}>
            entropy
          </p>
        )}
      </div>

      {/* Fixed bottom prompt bar */}
      <EntropyPrompt
        prompt={prompt}
        setPrompt={setPrompt}
        onGenerate={handleGenerate}
        generating={generating}
        inputRef={inputRef}
      />
    </div>
  );
}