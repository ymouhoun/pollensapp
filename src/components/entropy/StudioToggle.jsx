import React from 'react';
import { LocationTag } from '@/components/ui/location-tag';

export default function StudioToggle({ status, gpuName, workerState, endpointRef, jobRef, statusMessage, onStart, onStop }) {
  const isOn = ['STARTING', 'READY', 'STOPPING'].includes(status);
  const isBusy = ['STARTING', 'STOPPING'].includes(status);
  const isInitializing = status === 'STARTING' || workerState === 'initializing';

  let label = 'Studio offline';
  if (status === 'STARTING') label = 'Studio connecting';
  if (status === 'STOPPING') label = 'Studio stopping';
  if (status === 'READY') {
    label = workerState === 'ready'
      ? `${gpuName || 'GPU'} connected`
      : `${gpuName || 'GPU'} initializing`;
  }
  if (status === 'ERROR') label = 'Studio unavailable';

  const details = [
    statusMessage && !['Ready', 'Initializing'].includes(statusMessage) ? statusMessage : null,
    endpointRef ? `Endpoint ${endpointRef}` : null,
    jobRef ? `Job ${jobRef}` : null,
  ].filter(Boolean);
  const detail = details.join(' · ') || (isOn ? 'Click to disconnect' : 'Click to connect');

  const handleToggle = () => {
    if (isBusy) return;
    if (status === 'READY') onStop();
    else onStart();
  };

  return (
    <div className="fixed left-1/2 top-6 z-40 -translate-x-1/2">
      <LocationTag
        label={label}
        detail={detail}
        active={status === 'READY' && workerState === 'ready'}
        pending={isInitializing || status === 'STOPPING'}
        disabled={isBusy}
        onClick={handleToggle}
      />
    </div>
  );
}