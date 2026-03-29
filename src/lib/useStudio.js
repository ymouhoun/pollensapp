import { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

export const MODELS = [
  { label: 'Editorial', checkpoint: 'editorial.safetensors' },
];

const INACTIVITY_TIMEOUT = 10 * 60 * 1000;
const INACTIVITY_WARNING = 8 * 60 * 1000;

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
      if (attempts >= 60) {
        setErrorMessage('ComfyUI took too long to start');
        setStatus('ERROR');
        return;
      }
      attempts++;
      try {
        const healthRes = await base44.functions.invoke('comfyuiHealth', { baseUrl: url });
        if (healthRes.data.ready) {
          setBootProgress(100);
          setStatusMessage('Ready');
          setStatus('READY');
          return;
        }
      } catch (e) {
        console.warn('Health check error:', e);
      }
      setBootProgress(Math.min(95, 60 + attempts));
      setStatusMessage('Starting ComfyUI...');
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
    const reconnect = async () => {
      try {
        const result = (await base44.functions.invoke('vastaiListInstances', {})).data;
        if (!result.instances || result.instances.length === 0) return;

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
      const searchRes = await base44.functions.invoke('vastSearchGpu', { europeOnly: false });
      search = searchRes.data;

      if (!search.offerId && search.noEuResults) {
        const globalRes = await base44.functions.invoke('vastSearchGpu', { globalFallback: true });
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
    if (!baseUrl || generatingPromptId) return;
    resetInactivity();
    setGeneratedImageUrl(null);
    setPreviewImageUrl(null);
    setGenProgress({ step: 0, total: params.steps || 40 });

    const clientId = `client-${Date.now()}`;

    try {
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

      const { promptId } = submitRes.data;
      if (!promptId) { console.error('No promptId returned'); return; }

      setGeneratingPromptId(promptId);

      const abort = new AbortController();
      sseAbort.current = abort;

      const fnBase = appParams.appBaseUrl || '';
      const token = appParams.token || '';

      const sseRes = await fetch(`${fnBase}/functions/comfyuiWsProxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ baseUrl, clientId }),
        signal: abort.signal,
      });

      const reader = sseRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processEvents = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            let data;
            try { data = JSON.parse(line.slice(6)); } catch { continue; }

            if (data.type === 'progress') {
              setGenProgress({ step: data.data?.value || 0, total: data.data?.max || params.steps || 40 });
            }
            if (data.type === 'preview' && data.image) {
              setPreviewImageUrl(`data:image/jpeg;base64,${data.image}`);
            }
            if (data.type === 'executed' && data.data?.node === '15') {
              const filename = data.data.output?.images?.[0]?.filename;
              if (filename) {
                try {
                  const blobRes = await fetch(`${fnBase}/functions/comfyuiProxyImage`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({ baseUrl, filename }),
                  });
                  const blob = await blobRes.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  setGeneratedImageUrl(blobUrl);
                  try {
                    const file = new File([blob], `gen-${Date.now()}.png`, { type: 'image/png' });
                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                    await base44.entities.GeneratedImage.create({
                      file_url,
                      prompt: params.positivePrompt || '',
                      params: { steps: params.steps, cfg: params.cfg, shift: params.shift, aspectRatio: params.aspectRatio, sampler: params.sampler, scheduler: params.scheduler, seed: params.seed },
                    });
                  } catch (e) { console.warn('Failed to persist generated image:', e); }
                } catch (e) { console.error('Failed to fetch generated image:', e); }
              }
              setGeneratingPromptId(null);
              abort.abort();
              resetInactivity();
              return;
            }
            if (data.type === 'execution_error') {
              console.error('Generation error:', data);
              setGeneratingPromptId(null);
              abort.abort();
              return;
            }
          }
        }
        if (!abort.signal.aborted) setGeneratingPromptId(null);
      };

      processEvents().catch(e => {
        if (e.name !== 'AbortError') console.error('SSE processing error:', e);
        setGeneratingPromptId(null);
      });
    } catch (e) {
      console.error('Generate error:', e);
      setGeneratingPromptId(null);
    }
  }, [baseUrl, generatingPromptId, resetInactivity]);

  const cancelGeneration = useCallback(() => {
    if (sseAbort.current) { sseAbort.current.abort(); sseAbort.current = null; }
    setGeneratingPromptId(null);
    setPreviewImageUrl(null);
    setGenProgress({ step: 0, total: 0 });
  }, []);

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
    startStudio, stopStudio, generate, cancelGeneration, clearGeneratedImage, keepAlive,
  };
}