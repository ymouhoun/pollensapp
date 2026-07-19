import React from 'react';

export default function StudioToggle({ status, gpuName, endpointRef, statusMessage, onStart, onStop }) {
  const isOn = ['STARTING', 'READY', 'STOPPING'].includes(status);
  const isBusy = status === 'STARTING' || status === 'STOPPING';
  const label = status === 'STARTING'
    ? 'CONNECTING'
    : status === 'STOPPING'
      ? 'STOPPING'
      : status === 'READY'
        ? (statusMessage && statusMessage !== 'Ready'
          ? statusMessage.toUpperCase()
          : (gpuName ? `${gpuName} CONNECTED` : 'SERVERLESS READY'))
        : 'STUDIO';
  const endpointLabel = isOn && endpointRef ? ` · ${endpointRef}` : '';

  const handleToggle = () => {
    if (isBusy) return;
    if (status === 'READY') onStop();
    else onStart();
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      onClick={handleToggle}
      disabled={isBusy}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[10px] tracking-widest text-white/40 backdrop-blur-xl transition-colors hover:text-white/70 disabled:cursor-wait"
    >
      {status === 'READY' && (
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${gpuName ? 'bg-emerald-300' : 'bg-white/60'}`}
          style={{ boxShadow: gpuName ? '0 0 7px rgba(110,231,183,0.75)' : '0 0 5px rgba(255,255,255,0.45)' }}
        />
      )}
      <span>{label}{endpointLabel}</span>
      <span className={`relative h-4 w-8 rounded-full transition-colors ${isOn ? 'bg-white/25' : 'bg-white/10'}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white/80 transition-transform ${isOn ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}
