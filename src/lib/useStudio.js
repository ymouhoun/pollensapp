import { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export const MODELS = [
  { label: 'Editorial', checkpoint: 'editorial' },
];

const INACTIVITY_TIMEOUT = 10 * 60 * 1000;
const INACTIVITY_WARNING = 8 * 60 * 1000;
const STATUS_POLL_INTERVAL = 1000;
const MAX_GENERATION_TIME = 15 * 60 * 1000;

function errorMessage(error, fallback) {
  return error?.response?.data?.error || error?.message || fallback;
}

function imageToDataUrl(image) {
  if (!image?.data) return null;
  if (image.type === 's3_url' || image.data.startsWith('http')) return image.data;
  if (image.data.startsWith('data:')) return image.data;
  return `data:image/png;base64,${image.data}`;
}

function previewToDataUrl(preview) {
  if (!preview) return null;
  if (preview.startsWith('data:') || preview.startsWith('http')) return preview;
  return `data:image/jpeg;base64,${preview}`;
}

export default function useStudio() {
  const [status, setStatus] = useState('STOPPED');
  const [gpuName, setGpuName] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [bootProgress, setBootProgress] = useState(0);
  const [errorMessageState, setErrorMessage] = useState('');

  const [generatingPromptId, setGeneratingPromptId] = useState(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [generatedImageUrls, setGeneratedImageUrls] = useState([]);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [genProgress, setGenProgress] = useState({ step: 0, total: 0 });

  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const inactivityTimer = useRef(null);
  const warningTimer = useRef(null);
  const pollTimer = useRef(null);
  const jobIdRef = useRef(null);
  const modelRef = useRef(MODELS[0].checkpoint);
  const generationTokenRef = useRef(0);
  const generatingRef = useRef(false);

  const clearTimers = useCallback(() => {
    clearTimeout(pollTimer.current);
    clearTimeout(inactivityTimer.current);
    clearTimeout(warningTimer.current);
  }, []);

  const resetGenerationState = useCallback(() => {
    clearTimeout(pollTimer.current);
    jobIdRef.current = null;
    generatingRef.current = false;
    setGeneratingPromptId(null);
    setPreviewImageUrl(null);
    setGenProgress({ step: 0, total: 0 });
  }, []);

  const cancelActiveJob = useCallback(async () => {
    const jobId = jobIdRef.current;
    if (!jobId) return;
    try {
      await base44.functions.invoke('runpodCancel', {
        jobId,
        model: modelRef.current,
      });
    } catch (error) {
      console.warn('RunPod cancellation failed:', error);
    }
  }, []);

  const stopStudioInternal = useCallback(async () => {
    setStatus('STOPPING');
    generationTokenRef.current += 1;
    clearTimers();
    setShowInactivityWarning(false);
    await cancelActiveJob();
    resetGenerationState();
    setGpuName(null);
    setBootProgress(0);
    setStatusMessage('');
    setStatus('STOPPED');
  }, [cancelActiveJob, clearTimers, resetGenerationState]);

  const resetInactivity = useCallback(() => {
    setShowInactivityWarning(false);
    clearTimeout(inactivityTimer.current);
    clearTimeout(warningTimer.current);
    warningTimer.current = setTimeout(() => setShowInactivityWarning(true), INACTIVITY_WARNING);
    inactivityTimer.current = setTimeout(() => stopStudioInternal(), INACTIVITY_TIMEOUT);
  }, [stopStudioInternal]);

  const startStudio = useCallback(async (model = MODELS[0].checkpoint) => {
    modelRef.current = model;
    setStatus('STARTING');
    setBootProgress(20);
    setErrorMessage('');
    setStatusMessage('Connecting to RunPod...');

    try {
      const response = await base44.functions.invoke('runpodHealth', { model });
      if (!response.data?.ready) {
        throw new Error(response.data?.error || 'The RunPod endpoint is unavailable');
      }

      setGpuName(response.data.gpuName || 'RunPod Serverless');
      setBootProgress(100);
      setStatusMessage('Ready');
      setStatus('READY');
      resetInactivity();
    } catch (error) {
      setErrorMessage(errorMessage(error, 'Unable to connect to RunPod'));
      setStatus('ERROR');
    }
  }, [resetInactivity]);

  const stopStudio = useCallback(() => stopStudioInternal(), [stopStudioInternal]);

  const persistGeneratedImage = useCallback(async (imageUrl, params) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `gen-${Date.now()}.png`, { type: blob.type || 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.GeneratedImage.create({
        file_url,
        prompt: params.positivePrompt || '',
        params: {
          steps: params.steps,
          cfg: params.cfg,
          rescaleCfg: params.rescaleCfg,
          rescaleEnabled: params.rescaleEnabled,
          megapixels: params.megapixels,
          batchSize: params.batchSize,
          shift: params.shift,
          aspectRatio: params.aspectRatio,
          sampler: params.sampler,
          scheduler: params.scheduler,
          seed: params.seed,
          model: modelRef.current,
        },
      });
    } catch (error) {
      console.warn('Failed to persist generated image:', error);
    }
  }, []);

  const generate = useCallback(async (params) => {
    if (status !== 'READY' || generatingRef.current) return;

    generatingRef.current = true;
    generationTokenRef.current += 1;
    const generationToken = generationTokenRef.current;
    const totalSteps = params.steps || 45;
    const generationStartedAt = Date.now();
    let runningPolls = 0;

    resetInactivity();
    setErrorMessage('');
    setGeneratedImageUrl(null);
    setGeneratedImageUrls([]);
    setPreviewImageUrl(null);
    setGenProgress({ step: 0, total: totalSteps });
    setGeneratingPromptId('submitting');

    try {
      const submitResponse = await base44.functions.invoke('runpodSubmit', {
        ...params,
        model: modelRef.current,
      });
      const jobId = submitResponse.data?.jobId;
      if (!jobId) throw new Error(submitResponse.data?.error || 'RunPod did not return a job ID');

      if (generationToken !== generationTokenRef.current) return;
      jobIdRef.current = jobId;
      setGeneratingPromptId(jobId);

      const poll = async () => {
        if (generationToken !== generationTokenRef.current || !generatingRef.current) return;
        if (Date.now() - generationStartedAt > MAX_GENERATION_TIME) {
          await cancelActiveJob();
          resetGenerationState();
          setErrorMessage('Generation timed out');
          return;
        }

        try {
          const statusResponse = await base44.functions.invoke('runpodStatus', {
            jobId,
            model: modelRef.current,
          });
          const job = statusResponse.data;

          if (job?.progress) {
            const step = Math.max(0, Number(job.progress.step || 0));
            const total = Math.max(0, Number(job.progress.total || totalSteps));
            setGenProgress({ step, total });
            const previewUrl = previewToDataUrl(job.progress.previewImage);
            if (previewUrl) setPreviewImageUrl(previewUrl);
          } else if (job?.status === 'running') {
            runningPolls += 1;
            const estimatedStep = Math.min(totalSteps - 1, Math.floor(runningPolls / 3));
            setGenProgress({ step: estimatedStep, total: totalSteps });
          }

          if (job?.status === 'completed') {
            const images = job.images?.length ? job.images : [job.image];
            const imageUrls = images.map(imageToDataUrl).filter(Boolean);
            if (!imageUrls.length) throw new Error('RunPod completed the job without an image');

            setGenProgress({ step: totalSteps, total: totalSteps });
            setGeneratedImageUrl(imageUrls[0]);
            setGeneratedImageUrls(imageUrls);
            resetGenerationState();
            resetInactivity();
            imageUrls.forEach(imageUrl => void persistGeneratedImage(imageUrl, params));
            return;
          }

          if (['failed', 'cancelled'].includes(job?.status)) {
            throw new Error(typeof job.error === 'string' ? job.error : 'Generation failed');
          }

          pollTimer.current = setTimeout(poll, STATUS_POLL_INTERVAL);
        } catch (error) {
          console.error('RunPod generation failed:', error);
          resetGenerationState();
          setErrorMessage(errorMessage(error, 'Generation failed'));
        }
      };

      poll();
    } catch (error) {
      console.error('RunPod submission failed:', error);
      resetGenerationState();
      setErrorMessage(errorMessage(error, 'Unable to start generation'));
    }
  }, [cancelActiveJob, persistGeneratedImage, resetGenerationState, resetInactivity, status]);

  const cancelGeneration = useCallback(async () => {
    generationTokenRef.current += 1;
    clearTimeout(pollTimer.current);
    await cancelActiveJob();
    resetGenerationState();
  }, [cancelActiveJob, resetGenerationState]);

  const interruptGeneration = cancelGeneration;

  const clearGeneratedImage = useCallback(() => {
    if (generatedImageUrl?.startsWith('blob:')) URL.revokeObjectURL(generatedImageUrl);
    setGeneratedImageUrl(null);
    setGeneratedImageUrls([]);
  }, [generatedImageUrl]);

  const keepAlive = useCallback(() => resetInactivity(), [resetInactivity]);

  useEffect(() => {
    return () => {
      generationTokenRef.current += 1;
      clearTimers();
    };
  }, [clearTimers]);

  return {
    status,
    instanceId: null,
    baseUrl: null,
    gpuName,
    costPerHour: null,
    statusMessage,
    bootProgress,
    errorMessage: errorMessageState,
    generatingPromptId,
    generatedImageUrl,
    generatedImageUrls,
    previewImageUrl,
    genProgress,
    showInactivityWarning,
    startStudio,
    stopStudio,
    generate,
    cancelGeneration,
    interruptGeneration,
    clearGeneratedImage,
    keepAlive,
  };
}