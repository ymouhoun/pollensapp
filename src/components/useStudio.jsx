import { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export const MODELS = [
  { label: 'Editorial', checkpoint: 'editorial.safetensors' },
  { label: 'Impressionist', checkpoint: 'impressionist.safetensors' },
];

const POLL_INTERVAL = 3000;
const INACTIVITY_TIMEOUT = 10 * 60 * 1000;
const INACTIVITY_WARNING = 8 * 60 * 1000;

export default function useStudio() {
  const [status, setStatus] = useState('STOPPED');
  const [gpuName, setGpuName] = useState('');
  const [costPerHour, setCostPerHour] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [bootProgress, setBootProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);

  const [generatingPromptId, setGeneratingPromptId] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [genProgress, setGenProgress] = useState({ value: 0, max: 0 });
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);

  const instanceRef = useRef(null);
  const pollRef = useRef(null);
  const sseAbortRef = useRef(null);
  const inactivityRef = useRef(null);
  const warningRef = useRef(null);
  const clientIdRef = useRef(crypto.randomUUID());
  const generatingPromptIdRef = useRef(null);

  // Keep ref in sync with state
  useEffect(() => {
    generatingPromptIdRef.current = generatingPromptId;
  }, [generatingPromptId]);

  // --- Inactivity ---
  const stopStudioRef = useRef(null);

  const resetInactivity = useCallback(() => {
    setShowInactivityWarning(false);
    clearTimeout(inactivityRef.current);
    clearTimeout(warningRef.current);
    if (instanceRef.current) {
      warningRef.current = setTimeout(() => setShowInactivityWarning(true), INACTIVITY_WARNING);
      inactivityRef.current = setTimeout(() => {
        if (stopStudioRef.current) stopStudioRef.current();
      }, INACTIVITY_TIMEOUT);
    }
  }, []);

  const keepAlive = useCallback(() => {
    resetInactivity();
  }, [resetInactivity]);

  // --- Finish Generation ---
  const finishGeneration = useCallback(async () => {
    const promptId = generatingPromptIdRef.current;
    if (!instanceRef.current?.baseUrl || !promptId) return;

    await new Promise(r => setTimeout(r, 500));

    let attempts = 0;
    const poll = async () => {
      attempts++;
      const res = await base44.functions.invoke('comfyuiPollResult', {
        baseUrl: instanceRef.current.baseUrl,
        promptId,
      });
      if (res.data?.done) {
        const imgRes = await base44.functions.invoke('comfyuiProxyImage', {
          baseUrl: instanceRef.current.baseUrl,
          filename: res.data.filename,
        });
        if (imgRes.data?.imageDataUrl) {
          setGeneratedImageUrl(imgRes.data.imageDataUrl);
        }
        setGeneratingPromptId(null);
        setPreviewImageUrl(null);
        resetInactivity();
      } else if (attempts < 20) {
        setTimeout(poll, 1000);
      } else {
        setGeneratingPromptId(null);
        console.error('Timed out waiting for generation result');
      }
    };
    poll();
  }, [resetInactivity]);

  // --- SSE Message Handler ---
  const handleSSEMessage = useCallback((msg) => {
    if (!msg || !msg.type) return;

    if (msg.type === 'progress') {
      setGenProgress({ value: msg.data?.value || 0, max: msg.data?.max || 0 });
    } else if (msg.type === 'preview') {
      const mime = msg.mime || 'image/jpeg';
      setPreviewImageUrl(`data:${mime};base64,${msg.image}`);
    } else if (msg.type === 'executing') {
      if (msg.data?.node === null) {
        finishGeneration();
      }
    } else if (msg.type === 'execution_error') {
      console.error('ComfyUI execution error:', msg);
      setGeneratingPromptId(null);
    }
  }, [finishGeneration]);

  // --- SSE Connection ---
  const connectSSE = useCallback(async (baseUrl) => {
    if (sseAbortRef.current) sseAbortRef.current.abort();
    const controller = new AbortController();
    sseAbortRef.current = controller;

    try {
      const response = await base44.functions.fetch('/comfyuiWsProxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, clientId: clientIdRef.current }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('SSE proxy returned', response.status, text);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const msg = JSON.parse(line.slice(6));
            handleSSEMessage(msg);
          } catch {}
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('SSE connection error:', e);
      }
    }
  }, [handleSSEMessage]);

  // --- Start Studio ---
  const startStudio = useCallback(async (checkpoint) => {
    setStatus('STARTING');
    setBootProgress(0);
    setStatusMessage('Searching for GPU...');
    setErrorMessage('');
    setGeneratedImageUrl(null);
    setPreviewImageUrl(null);
    setGeneratingPromptId(null);

    const searchRes = await base44.functions.invoke('vastaiSearch', { europeOnly: false });
    const search = searchRes.data;
    if (!search.found) {
      setStatus('ERROR');
      setErrorMessage('No GPU available right now. Try again in a moment.');
      return;
    }

    setGpuName(search.gpuName);
    setCostPerHour(search.costPerHour);
    setStatusMessage('Creating instance...');
    setBootProgress(10);

    const createRes = await base44.functions.invoke('vastaiCreate', {
      offerId: search.offerId,
      checkpoint: checkpoint || 'editorial.safetensors',
    });
    const create = createRes.data;
    if (!create.instanceId) {
      setStatus('ERROR');
      setErrorMessage('Failed to create GPU instance.');
      return;
    }

    instanceRef.current = { instanceId: create.instanceId, baseUrl: null };
    setStatusMessage('Booting instance...');
    setBootProgress(20);

    let progressAccum = 20;

    pollRef.current = setInterval(async () => {
      const pollRes = await base44.functions.invoke('vastaiPoll', {
        instanceId: instanceRef.current.instanceId,
      });
      const poll = pollRes.data;

      if (poll.status === 'running' && poll.baseUrl) {
        setStatusMessage('Loading models...');
        setBootProgress(70);
        let healthy = false;
        try {
          const healthRes = await base44.functions.invoke('comfyuiHealth', { baseUrl: poll.baseUrl });
          healthy = healthRes.data?.healthy === true;
        } catch {}

        if (healthy) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          instanceRef.current.baseUrl = poll.baseUrl;
          setGpuName(poll.gpuName || search.gpuName);
          setCostPerHour(poll.costPerHour || search.costPerHour);
          setBootProgress(100);
          setStatusMessage('Ready');
          setStatus('READY');
          connectSSE(poll.baseUrl);
        }
      } else if (poll.status === 'loading' || poll.status === 'pulling' || poll.status === 'creating') {
        progressAccum = Math.min(60, progressAccum + 3);
        setBootProgress(progressAccum);
        setStatusMessage(poll.status === 'pulling' ? 'Downloading container...' : 'Booting instance...');
      } else if (poll.status === 'not_found' || poll.status === 'exited') {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setStatus('ERROR');
        setErrorMessage('Instance failed to start.');
      }
    }, POLL_INTERVAL);
  }, [connectSSE]);

  // --- Stop Studio ---
  const stopStudio = useCallback(async () => {
    setStatus('STOPPING');
    clearInterval(pollRef.current);
    pollRef.current = null;
    clearTimeout(inactivityRef.current);
    clearTimeout(warningRef.current);
    setShowInactivityWarning(false);

    if (sseAbortRef.current) {
      sseAbortRef.current.abort();
      sseAbortRef.current = null;
    }

    if (instanceRef.current?.instanceId) {
      try {
        await base44.functions.invoke('vastaiDestroy', {
          instanceId: instanceRef.current.instanceId,
        });
      } catch (e) {
        console.error('Failed to destroy instance:', e);
      }
    }

    instanceRef.current = null;
    setGeneratingPromptId(null);
    setPreviewImageUrl(null);
    setGeneratedImageUrl(null);
    setGenProgress({ value: 0, max: 0 });
    setStatus('STOPPED');
  }, []);

  // Wire up the ref for inactivity
  stopStudioRef.current = stopStudio;

  // --- Generate ---
  const generate = useCallback(async (params) => {
    if (!instanceRef.current?.baseUrl) return;
    resetInactivity();
    setGeneratedImageUrl(null);
    setPreviewImageUrl(null);
    setGenProgress({ value: 0, max: 0 });

    const seed = Math.floor(Math.random() * 2 ** 32);

    const res = await base44.functions.invoke('comfyuiGenerate', {
      baseUrl: instanceRef.current.baseUrl,
      clientId: clientIdRef.current,
      positivePrompt: params.positivePrompt,
      seed,
      steps: params.steps,
      cfg: params.cfg,
      shift: params.shift,
      aspectRatio: params.aspectRatio,
      sampler: params.sampler,
      scheduler: params.scheduler,
    });

    const data = res.data;
    if (data.promptId) {
      setGeneratingPromptId(data.promptId);
    } else {
      console.error('Generation failed:', data.error);
    }
  }, [resetInactivity]);

  useEffect(() => {
    if (status === 'READY') resetInactivity();
    return () => {
      clearTimeout(inactivityRef.current);
      clearTimeout(warningRef.current);
    };
  }, [status, resetInactivity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(pollRef.current);
      clearTimeout(inactivityRef.current);
      clearTimeout(warningRef.current);
      if (sseAbortRef.current) sseAbortRef.current.abort();
    };
  }, []);

  return {
    status,
    gpuName,
    costPerHour,
    statusMessage,
    bootProgress,
    errorMessage,
    showInactivityWarning,
    keepAlive,
    startStudio,
    stopStudio,
    generate,
    generatingPromptId,
    previewImageUrl,
    genProgress,
    generatedImageUrl,
  };
}