import { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export const MODELS = [
  { label: 'Editorial', checkpoint: 'editorial.safetensors' },
];

const INACTIVITY_TIMEOUT = 10 * 60 * 1000;
const INACTIVITY_WARNING = 8 * 60 * 1000;
const BLOCKED_HOSTS = ['213.5.130.43'];

export default function useStudio() {
  const [status, setStatus] = useState('STOPPED');
  const [instanceId, setInstanceId] = useState(null);
  const [baseUrl, setBaseUrl] = useState(null);
  const [gpuName, setGpuName] = useState(null);
  const [costPerHour, setCostPerHour] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [bootProgress, setBootProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const [generatingPromptId, setGeneratingPromptId] = useState(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [genProgress, setGenProgress] = useState({ step: 0, total: 0 });

  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const inactivityTimer = useRef(null);
  const warningTimer = useRef(null);
  const sseAbort = useRef(null);
  const pollTimer = useRef(null);
  const instanceIdRef = useRef(null);
  const generatingRef = useRef(false);

  // Keep ref in sync
  useEffect(() => { instanceIdRef.current = instanceId; }, [instanceId]);

  const stopStudioInternal = useCallback(async () => {
    const id = instanceIdRef.current;
    setStatus('STOPPING');
    clearTimeout(pollTimer.current);
    clearTimeout(inactivityTimer.current);
    clearTimeout(warningTimer.current);
    setShowInactivityWarning(false);
    if (sseAbort.current) { sseAbort.current.abort(); sseAbort.current = null; }

    if (id) {
      try {
        await base44.functions.invoke('vastDestroyInstance', { instanceId: id });
      } catch (e) {
        console.error('Failed to destroy instance:', e);
      }
    }

    setInstanceId(null);
    instanceIdRef.current = null;
    setBaseUrl(null);
    setGpuName(null);
    setCostPerHour(null);
    setGeneratingPromptId(null);
    generatingRef.current = false;
    setGeneratedImageUrl(null);
    setPreviewImageUrl(null);
    setGenProgress({ step: 0, total: 0 });
    setBootProgress(0);
    setStatusMessage('');
    setStatus('STOPPED');
  }, []);

  const resetInactivity = useCallback(() => {
    setShowInactivityWarning(false);
    clearTimeout(inactivityTimer.current);
    clearTimeout(warningTimer.current);
    warningTimer.current = setTimeout(() => setShowInactivityWarning(true), INACTIVITY_WARNING);
    inactivityTimer.current = setTimeout(() => stopStudioInternal(), INACTIVITY_TIMEOUT);
  }, [stopStudioInternal]);

  const stopStudio = useCallback(() => {
    stopStudioInternal();
  }, [stopStudioInternal]);

  // --- Polling helpers (used by both startStudio and reconnect) ---

  const pollForComfy = useCallback((url) => {
    let attempts = 0;
    const poll = async () => {
      if (attempts >= 120) {
        setErrorMessage('ComfyUI took too long to start. Try stopping and restarting.');
        setStatus('ERROR');
        return;
      }
      attempts++;
      try {
        const healthRes = await base44.functions.invoke('comfyuiHealth', { baseUrl: url });
        console.log('[pollForComfy] attempt', attempts, 'result:', JSON.stringify(healthRes.data));
        if (healthRes.data.ready) {
          setBootProgress(100);
          setStatusMessage('Ready');
          setStatus('READY');
          return;
        }
        setStatusMessage(healthRes.data.detail ? `Waiting for ComfyUI... (${healthRes.data.detail})` : 'Starting ComfyUI...');
      } catch (e) {
        console.warn('Health check error:', e);
        setStatusMessage('Checking ComfyUI...');
      }
      // Smooth progress from 60 to 98 over 120 attempts
      setBootProgress(Math.min(98, 60 + Math.floor(attempts * 38 / 120)));
      pollTimer.current = setTimeout(poll, 5000);
    };
    poll();
  }, []);

  const pollForReady = useCallback((instId) => {
    let attempts = 0;
    const poll = async () => {
      if (attempts >= 120) {
        setErrorMessage('Instance took too long to start');
        setStatus('ERROR');
        return;
      }
      attempts++;
      try {
        const pollRes = await base44.functions.invoke('vastPollInstance', { instanceId: instId });
        const pollData = pollRes.data;

        if (pollData.status === 'ports_ready' && pollData.baseUrl) {
          setBootProgress(60);
          setStatusMessage('Ports ready, waiting for ComfyUI...');
          setBaseUrl(pollData.baseUrl);
          pollForComfy(pollData.baseUrl);
          return;
        }
        if (pollData.status === 'not_found') {
          setErrorMessage('Instance not found');
          setStatus('ERROR');
          return;
        }
        setBootProgress(Math.min(55, 20 + attempts * 0.5));
        setStatusMessage(`Waiting for instance... (${pollData.actualStatus || 'loading'})`);
      } catch (e) {
        console.warn('Poll error:', e);
      }
      pollTimer.current = setTimeout(poll, 5000);
    };
    poll();
  }, [pollForComfy]);

  // --- Reconnect on mount ---

  useEffect(() => {
    console.log('[useStudio] mount effect running');
    const reconnect = async () => {
      try {
        console.log('[useStudio] calling vastaiListInstances...');
        const result = (await base44.functions.invoke('vastaiListInstances', {})).data;
        console.log('[useStudio] instances:', JSON.stringify(result));
        if (!result.instances || result.instances.length === 0) { console.log('[useStudio] no instances found'); return; }

        // Pick the first instance with a baseUrl, or fall back to first instance
        const readyInstance = result.instances.find(i => i.baseUrl) || result.instances[0];

        setInstanceId(readyInstance.instanceId);
        instanceIdRef.current = readyInstance.instanceId;
        setGpuName(readyInstance.gpuName || '');
        setCostPerHour(readyInstance.costPerHour || 0);

        if (readyInstance.baseUrl) {
          setBaseUrl(readyInstance.baseUrl);
          setStatus('STARTING');
          setBootProgress(70);
          setStatusMessage('Reconnecting...');
          // Check ComfyUI health directly
          try {
            const healthRes = (await base44.functions.invoke('comfyuiHealth', { baseUrl: readyInstance.baseUrl })).data;
            if (healthRes.ready) {
              console.log('[useStudio] READY! baseUrl=', readyInstance.baseUrl);
              setBootProgress(100);
              setStatus('READY');
              setStatusMessage('');
              return;
            }
          } catch (e) {
            console.warn('Health check failed on reconnect:', e);
          }
          // Not ready yet — poll for ComfyUI
          pollForComfy(readyInstance.baseUrl);
        } else {
          // No baseUrl yet — poll for ports
          setStatus('STARTING');
          setBootProgress(20);
          setStatusMessage('Reconnecting to instance...');
          pollForReady(readyInstance.instanceId);
        }
      } catch (e) {
        console.warn('Failed to check existing instances:', e);
      }
    };
    reconnect();
  }, [pollForComfy, pollForReady]);

  // --- Start inactivity timer when READY ---

  useEffect(() => {
    if (status === 'READY') resetInactivity();
    return () => {
      clearTimeout(inactivityTimer.current);
      clearTimeout(warningTimer.current);
    };
  }, [status, resetInactivity]);

  // --- Start studio ---

  const startStudio = useCallback(async (checkpoint) => {
    // Check for existing running instances first to avoid duplicates
    try {
      const listRes = (await base44.functions.invoke('vastaiListInstances', {})).data;
      if (listRes.instances && listRes.instances.length > 0) {
        const existing = listRes.instances.find(i => i.baseUrl) || listRes.instances[0];
        setInstanceId(existing.instanceId);
        instanceIdRef.current = existing.instanceId;
        setGpuName(existing.gpuName || '');
        setCostPerHour(existing.costPerHour || 0);
        setStatus('STARTING');

        if (existing.baseUrl) {
          setBaseUrl(existing.baseUrl);
          setBootProgress(70);
          setStatusMessage('Found existing instance, checking health...');
          pollForComfy(existing.baseUrl);
        } else {
          setBootProgress(20);
          setStatusMessage('Found existing instance, waiting for ports...');
          pollForReady(existing.instanceId);
        }
        return;
      }
    } catch (e) {
      console.warn('Failed to check existing instances:', e);
    }

    setStatus('STARTING');
    setBootProgress(0);
    setErrorMessage('');
    setStatusMessage('Searching for GPU...');

    try {
      let search;
      const searchRes = await base44.functions.invoke('vastSearchGpu', { europeOnly: false, excludeHosts: BLOCKED_HOSTS });
      search = searchRes.data;

      if (!search.offerId && search.noEuResults) {
        const globalRes = await base44.functions.invoke('vastSearchGpu', { globalFallback: true, excludeHosts: BLOCKED_HOSTS });
        search = globalRes.data;
      }

      if (!search.offerId) {
        setErrorMessage(search.error || 'No GPU available');
        setStatus('ERROR');
        return;
      }

      setGpuName(search.gpuName);
      setCostPerHour(search.costPerHour);
      setBootProgress(10);
      setStatusMessage('Creating instance...');

      const createRes = await base44.functions.invoke('vastCreateInstance', {
        offerId: search.offerId,
        checkpoint: checkpoint || 'editorial.safetensors',
      });
      const create = createRes.data;

      if (!create.instanceId) {
        setErrorMessage(create.error || 'Failed to create instance');
        setStatus('ERROR');
        return;
      }

      setInstanceId(create.instanceId);
      instanceIdRef.current = create.instanceId;
      setBootProgress(20);
      setStatusMessage('Instance created, waiting for ports...');
      pollForReady(create.instanceId);
    } catch (e) {
      setErrorMessage(e.message || 'Failed to start studio');
      setStatus('ERROR');
    }
  }, [pollForReady, pollForComfy]);

  const keepAlive = useCallback(() => {
    resetInactivity();
  }, [resetInactivity]);

  const generate = useCallback(async (params) => {
    console.log('[generate] called. baseUrl=', baseUrl, 'generatingRef=', generatingRef.current);
    if (!baseUrl || generatingRef.current) { console.log('[generate] bailing: no baseUrl or already generating'); return; }
    generatingRef.current = true;
    resetInactivity();
    setPreviewImageUrl(null);
    setGenProgress({ step: 0, total: params.steps || 40 });

    const clientId = `client-${Date.now()}`;

    try {
      console.log('[generate] submitting to comfyuiGenerate...');
      const submitRes = await base44.functions.invoke('comfyuiGenerate', {
        baseUrl,
        positivePrompt: params.positivePrompt,
        seed: params.seed,
        steps: params.steps,
        cfg: params.cfg,
        shift: params.shift,
        aspectRatio: params.aspectRatio,
        sampler: params.sampler,
        scheduler: params.scheduler,
        clientId,
      });
      console.log('[generate] comfyuiGenerate response:', JSON.stringify(submitRes.data));

      const { promptId } = submitRes.data;
      if (!promptId) { console.error('No promptId returned'); generatingRef.current = false; return; }

      setGeneratingPromptId(promptId);

      // Poll for completion instead of SSE
      let attempts = 0;
      const maxAttempts = 300; // 5 min at 1s intervals
      const totalSteps = params.steps || 40;

      const poll = async () => {
        if (!generatingRef.current) return; // cancelled
        if (attempts >= maxAttempts) {
          console.error('[generate] Polling timed out');
          setGeneratingPromptId(null);
          generatingRef.current = false;
          return;
        }
        attempts++;

        try {
          const pollRes = await base44.functions.invoke('comfyuiPollProgress', { baseUrl, promptId });
          const pollData = pollRes.data;
          console.log('[generate] poll:', pollData.status, 'attempt:', attempts);

          if (pollData.status === 'completed' && pollData.filename) {
            // Simulate progress complete
            setGenProgress({ step: totalSteps, total: totalSteps });

            // Fetch the final image via proxy
            try {
              const imgRes = await base44.functions.invoke('comfyuiProxyImage', {
                baseUrl,
                filename: pollData.filename,
                subfolder: pollData.subfolder || '',
              });
              
              // The proxy returns base64 image data
              if (imgRes.data?.image) {
                const blobUrl = `data:image/png;base64,${imgRes.data.image}`;
                setGeneratedImageUrl(blobUrl);

                // Persist to storage
                try {
                  const byteString = atob(imgRes.data.image);
                  const bytes = new Uint8Array(byteString.length);
                  for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
                  const file = new File([bytes], `gen-${Date.now()}.png`, { type: 'image/png' });
                  const { file_url } = await base44.integrations.Core.UploadFile({ file });
                  await base44.entities.GeneratedImage.create({
                    file_url,
                    prompt: params.positivePrompt || '',
                    params: { steps: params.steps, cfg: params.cfg, shift: params.shift, aspectRatio: params.aspectRatio, sampler: params.sampler, scheduler: params.scheduler, seed: params.seed },
                  });
                } catch (e) { console.warn('Failed to persist generated image:', e); }
              }
            } catch (e) { console.error('Failed to fetch generated image:', e); }

            setGeneratingPromptId(null);
            generatingRef.current = false;
            resetInactivity();
            return;
          }

          if (pollData.status === 'error') {
            console.error('Generation error:', pollData.error);
            setGeneratingPromptId(null);
            generatingRef.current = false;
            return;
          }

          // Update progress estimate based on elapsed time
          if (pollData.status === 'running') {
            const estimatedStep = Math.min(totalSteps - 1, Math.floor(attempts * totalSteps / (totalSteps * 2)));
            setGenProgress({ step: estimatedStep, total: totalSteps });
          }

          // Continue polling
          pollTimer.current = setTimeout(poll, 1000);
        } catch (e) {
          console.warn('[generate] poll error:', e);
          pollTimer.current = setTimeout(poll, 2000);
        }
      };

      poll();
    } catch (e) {
      console.error('[generate] ERROR:', e?.message || e, e?.response?.data || '');
      setGeneratingPromptId(null);
      generatingRef.current = false;
    }
  }, [baseUrl, resetInactivity]);

  const cancelGeneration = useCallback(() => {
    if (sseAbort.current) { sseAbort.current.abort(); sseAbort.current = null; }
    clearTimeout(pollTimer.current);
    setGeneratingPromptId(null);
    generatingRef.current = false;
    setPreviewImageUrl(null);
    setGenProgress({ step: 0, total: 0 });
  }, []);

  const interruptGeneration = useCallback(async () => {
    if (!baseUrl) return;
    clearTimeout(pollTimer.current);
    try {
      await base44.functions.invoke('comfyuiInterrupt', { baseUrl });
    } catch (e) {
      console.warn('Interrupt failed:', e);
    }
    setGeneratingPromptId(null);
    generatingRef.current = false;
    setPreviewImageUrl(null);
    setGenProgress({ step: 0, total: 0 });
  }, [baseUrl]);

  const clearGeneratedImage = useCallback(() => {
    if (generatedImageUrl?.startsWith('blob:')) URL.revokeObjectURL(generatedImageUrl);
    setGeneratedImageUrl(null);
  }, [generatedImageUrl]);

  useEffect(() => {
    return () => {
      clearTimeout(pollTimer.current);
      clearTimeout(inactivityTimer.current);
      clearTimeout(warningTimer.current);
      if (sseAbort.current) sseAbort.current.abort();
    };
  }, []);

  return {
    status, instanceId, baseUrl, gpuName, costPerHour, statusMessage,
    bootProgress, errorMessage, generatingPromptId, generatedImageUrl,
    previewImageUrl, genProgress, showInactivityWarning,
    startStudio, stopStudio, generate, cancelGeneration, interruptGeneration, clearGeneratedImage, keepAlive,
  };
}