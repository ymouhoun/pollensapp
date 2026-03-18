import { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutes
const WARNING_BEFORE = 2 * 60 * 1000; // 2 minutes before shutdown
const BOOT_TIMEOUT = 12 * 60 * 1000; // 12 minutes max
const POLL_INSTANCE_INTERVAL = 10000;
const POLL_HEALTH_INTERVAL = 10000;

const MODELS = [
  { label: 'Editorial', checkpoint: 'editorial.safetensors' },
];

const STATUS_MESSAGES = [
  'Finding the best available GPU...',
  'Starting your instance...',
  'Pulling Docker environment...',
  'Downloading models from storage... (~50GB)',
  'Loading models into GPU memory...',
  'Almost ready...',
];

export { MODELS, STATUS_MESSAGES };

export default function useStudio() {
  const [status, setStatus] = useState('STOPPED'); // STOPPED | STARTING | READY | STOPPING | ERROR
  const [gpuName, setGpuName] = useState('');
  const [costPerHour, setCostPerHour] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [bootProgress, setBootProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [generatingPromptId, setGeneratingPromptId] = useState(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [genProgress, setGenProgress] = useState({ value: 0, max: 1 });

  const instanceIdRef = useRef(null);
  const baseUrlRef = useRef(null);
  const bootStartRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const pollRef = useRef(null);
  const cancelledRef = useRef(false);
  const clientIdRef = useRef(crypto.randomUUID());
  const wsRef = useRef(null);

  const clearTimers = useCallback(() => {
    clearTimeout(inactivityTimerRef.current);
    clearTimeout(warningTimerRef.current);
    clearInterval(pollRef.current);
  }, []);

  const resetInactivity = useCallback(() => {
    setShowInactivityWarning(false);
    clearTimeout(inactivityTimerRef.current);
    clearTimeout(warningTimerRef.current);

    warningTimerRef.current = setTimeout(() => {
      setShowInactivityWarning(true);
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE);

    inactivityTimerRef.current = setTimeout(() => {
      stopStudio();
    }, INACTIVITY_TIMEOUT);
  }, []);

  const keepAlive = useCallback(() => {
    setShowInactivityWarning(false);
    resetInactivity();
  }, [resetInactivity]);

  const stopStudio = useCallback(async () => {
    clearTimers();
    cancelledRef.current = true;
    const id = instanceIdRef.current;
    if (id) {
      setStatus('STOPPING');
      await base44.functions.invoke('vastaiDestroy', { instanceId: id });
    }
    instanceIdRef.current = null;
    baseUrlRef.current = null;
    setStatus('STOPPED');
    setGpuName('');
    setCostPerHour(0);
    setBootProgress(0);
    setGeneratingPromptId(null);
    setGeneratedImageUrl(null);
    setPreviewImageUrl(null);
    setGenProgress({ value: 0, max: 1 });
    setShowInactivityWarning(false);
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
  }, [clearTimers]);

  const startStudio = useCallback(async (selectedCheckpoint) => {
    cancelledRef.current = false;
    setStatus('STARTING');
    setErrorMessage('');
    setBootProgress(0);
    bootStartRef.current = Date.now();

    // Progress ticker
    const progressInterval = setInterval(() => {
      if (cancelledRef.current) { clearInterval(progressInterval); return; }
      const elapsed = Date.now() - bootStartRef.current;
      const total = 6 * 60 * 1000; // 6 min calibration
      const p = Math.min(elapsed / total, 0.95);
      setBootProgress(p);
      const msgIdx = Math.min(Math.floor(p * STATUS_MESSAGES.length), STATUS_MESSAGES.length - 1);
      setStatusMessage(STATUS_MESSAGES[msgIdx]);
    }, 1000);

    // 1. Search Europe first
    setStatusMessage('Finding the best available GPU...');
    let searchResult = (await base44.functions.invoke('vastaiSearch', { europeOnly: true })).data;

    if (!searchResult.found) {
      setStatusMessage('No European GPU available — searching globally...');
      searchResult = (await base44.functions.invoke('vastaiSearch', { europeOnly: false })).data;
    }

    if (!searchResult.found) {
      clearInterval(progressInterval);
      setStatus('ERROR');
      setErrorMessage('No compatible GPU available right now. Please try again in a few minutes.');
      return;
    }

    if (cancelledRef.current) { clearInterval(progressInterval); return; }

    setGpuName(searchResult.gpuName);
    setCostPerHour(searchResult.costPerHour);
    setStatusMessage(`Starting your ${searchResult.gpuName} instance...`);

    // 2. Create instance
    const createResult = (await base44.functions.invoke('vastaiCreate', {
      offerId: searchResult.offerId,
      checkpoint: selectedCheckpoint || 'editorial.safetensors',
      vae: 'qwen_image_vae.safetensors',
      textEncoder: 'qwen_2.5_vl_7b_fp8_scaled.safetensors',
    })).data;

    if (!createResult.instanceId) {
      clearInterval(progressInterval);
      setStatus('ERROR');
      setErrorMessage('Failed to create GPU instance. Please try again.');
      return;
    }

    if (cancelledRef.current) { clearInterval(progressInterval); return; }
    instanceIdRef.current = createResult.instanceId;

    // 3. Poll for port / base URL
    setStatusMessage('Pulling Docker environment...');
    let baseUrl = null;
    const pollStart = Date.now();

    while (!baseUrl && !cancelledRef.current) {
      if (Date.now() - pollStart > BOOT_TIMEOUT) {
        clearInterval(progressInterval);
        setStatus('ERROR');
        setErrorMessage('Studio failed to start — timed out waiting for instance.');
        return;
      }
      await new Promise(r => setTimeout(r, POLL_INSTANCE_INTERVAL));
      try {
        const pollResult = (await base44.functions.invoke('vastaiPoll', { instanceId: createResult.instanceId })).data;
        if (pollResult.baseUrl) {
          baseUrl = pollResult.baseUrl;
        }
      } catch (e) {
        console.warn('Poll instance error, retrying...', e);
      }
    }

    if (cancelledRef.current) { clearInterval(progressInterval); return; }
    baseUrlRef.current = baseUrl;
    setStatusMessage('Loading models into GPU memory...');

    // 4. Poll ComfyUI health
    while (!cancelledRef.current) {
      if (Date.now() - bootStartRef.current > BOOT_TIMEOUT) {
        clearInterval(progressInterval);
        setStatus('ERROR');
        setErrorMessage('Studio failed to start.');
        return;
      }
      await new Promise(r => setTimeout(r, POLL_HEALTH_INTERVAL));
      try {
        const healthResult = (await base44.functions.invoke('comfyuiHealth', { baseUrl })).data;
        if (healthResult.ready) break;
      } catch (e) {
        console.warn('Health check error, retrying...', e);
      }
    }

    if (cancelledRef.current) { clearInterval(progressInterval); return; }

    clearInterval(progressInterval);
    setBootProgress(1);
    setStatus('READY');
    setStatusMessage('');
    resetInactivity();
  }, [resetInactivity]);

  const generate = useCallback(async ({ positivePrompt, steps, cfg, shift, aspectRatio, sampler, scheduler }) => {
    if (status !== 'READY' || !baseUrlRef.current) return;
    resetInactivity();
    setGeneratingPromptId('pending');
    setGeneratedImageUrl(null);
    setPreviewImageUrl(null);
    setGenProgress({ value: 0, max: steps || 40 });

    const baseUrl = baseUrlRef.current;
    const clientId = clientIdRef.current;

    // Build WebSocket URL
    const wsUrl = baseUrl.replace(/^http/, 'ws') + `/ws?clientId=${clientId}`;
    let prevBlobUrl = null;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    const cleanup = () => {
      if (ws.readyState <= 1) ws.close();
      wsRef.current = null;
      if (prevBlobUrl) URL.revokeObjectURL(prevBlobUrl);
    };

    ws.onopen = async () => {
      // Submit prompt once WebSocket is connected
      const seed = Math.floor(Math.random() * 2147483647);
      const result = (await base44.functions.invoke('comfyuiGenerate', {
        baseUrl,
        positivePrompt,
        seed,
        steps: steps || 40,
        cfg: cfg || 3.0,
        shift: shift || 1.0,
        aspectRatio: aspectRatio || '3:4 (Golden Ratio)',
        sampler: sampler || 'res_2s',
        scheduler: scheduler || 'kl_optimal',
        clientId,
      })).data;

      if (!result.promptId) {
        setGeneratingPromptId(null);
        cleanup();
        return;
      }
      setGeneratingPromptId(result.promptId);
    };

    ws.onmessage = async (event) => {
      if (event.data instanceof Blob) {
        // Binary message — step preview image
        const arrayBuffer = await event.data.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        // Check header: first 4 bytes [0,0,0,1] = image preview
        if (bytes.length > 8 && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 0 && bytes[3] === 1) {
          const imageData = bytes.slice(8);
          const blob = new Blob([imageData], { type: 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          if (prevBlobUrl) URL.revokeObjectURL(prevBlobUrl);
          prevBlobUrl = url;
          setPreviewImageUrl(url);
        }
        return;
      }

      // Text message — JSON
      const msg = JSON.parse(event.data);

      if (msg.type === 'progress') {
        setGenProgress({ value: msg.data.value, max: msg.data.max });
      }

      if (msg.type === 'executed' && msg.data?.node === '15') {
        // Generation complete — fetch final image via proxy
        const outputs = msg.data.output;
        const images = outputs?.images;
        const filename = images?.[0]?.filename;

        if (filename) {
          const proxyResult = (await base44.functions.invoke('comfyuiProxyImage', {
            baseUrl,
            filename,
          })).data;
          setGeneratedImageUrl(proxyResult.imageDataUrl);
        }
        setPreviewImageUrl(null);
        setGeneratingPromptId(null);
        setGenProgress({ value: 0, max: 1 });
        resetInactivity();
        cleanup();
      }
    };

    ws.onerror = () => {
      console.warn('WebSocket error during generation');
      cleanup();
      setGeneratingPromptId(null);
    };

    ws.onclose = () => {
      // Only cleanup refs, state is handled by message handlers
      wsRef.current = null;
      if (prevBlobUrl) URL.revokeObjectURL(prevBlobUrl);
    };
  }, [status, resetInactivity]);

  // Check for existing running instance on mount
  useEffect(() => {
    const checkExisting = async () => {
      try {
        const result = (await base44.functions.invoke('vastaiListInstances', {})).data;
        if (result.instances && result.instances.length > 0) {
          const instance = result.instances[0];
          instanceIdRef.current = instance.id;
          setGpuName(instance.gpuName || '');
          setCostPerHour(instance.costPerHour || 0);

          if (instance.baseUrl) {
            baseUrlRef.current = instance.baseUrl;
            // Check if ComfyUI is ready
            try {
              const healthResult = (await base44.functions.invoke('comfyuiHealth', { baseUrl: instance.baseUrl })).data;
              if (healthResult.ready) {
                setStatus('READY');
                resetInactivity();
                return;
              }
            } catch (e) {
              console.warn('Health check failed on existing instance');
            }
          }
          // Instance exists but not ready yet — show as starting
          setStatus('STARTING');
          setStatusMessage('Reconnecting to your instance...');
        }
      } catch (e) {
        console.warn('Failed to check existing instances:', e);
      }
    };
    checkExisting();
  }, [resetInactivity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      cancelledRef.current = true;
    };
  }, [clearTimers]);

  return {
    status,
    gpuName,
    costPerHour,
    statusMessage,
    bootProgress,
    errorMessage,
    showInactivityWarning,
    generatingPromptId,
    generatedImageUrl,
    previewImageUrl,
    genProgress,
    startStudio,
    stopStudio,
    generate,
    keepAlive,
    resetInactivity,
  };
}