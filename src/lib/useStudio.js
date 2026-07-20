import { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export const MODELS = [
  { label: 'Editorial', checkpoint: 'editorial' },
  { label: 'Ambrojo', checkpoint: 'ambrojo' },
  { label: 'Still Life', checkpoint: 'still-life' },
  { label: '35mm', checkpoint: '35mm' },
  { label: 'Stills', checkpoint: 'stills' },
  { label: 'Super16', checkpoint: 'super16' },
  { label: 'Beauty', checkpoint: 'beauty' },
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
  const [endpointRef, setEndpointRef] = useState(null);
  const [jobRef, setJobRef] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusDetail, setStatusDetail] = useState('');
  const [bootProgress, setBootProgress] = useState(0);
  const [errorMessageState, setErrorMessage] = useState('');

  const [generatingPromptId, setGeneratingPromptId] = useState(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [generatedImageUrls, setGeneratedImageUrls] = useState([]);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [genProgress, setGenProgress] = useState({ step: 0, total: 0, stage: null });

  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const inactivityTimer = useRef(null);
  const warningTimer = useRef(null);
  const pollTimer = useRef(null);
  const jobIdRef = useRef(null);
  const workflowRef = useRef(null);
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
    setJobRef(null);
    workflowRef.current = null;
    generatingRef.current = false;
    setGeneratingPromptId(null);
    setPreviewImageUrl(null);
    setGenProgress({ step: 0, total: 0, stage: null });
    setStatusDetail('');
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
    setEndpointRef(null);
    setBootProgress(0);
    setStatusMessage('');
    setStatusDetail('');
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
    setStatusDetail('Checking the serverless endpoint');

    try {
      const response = await base44.functions.invoke('runpodHealth', { model });
      if (!response.data?.ready) {
        throw new Error(response.data?.error || 'The RunPod endpoint is unavailable');
      }

      // A serverless endpoint is ready before RunPod assigns a physical GPU.
      // The concrete GPU name is filled in by runpodStatus once a job starts.
      setGpuName(response.data.gpuName || null);
      setEndpointRef(response.data.endpointRef || null);
      setBootProgress(100);
      setStatusMessage('Ready');
      setStatusDetail('');
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
          complementaryPrompt: params.complementaryPrompt,
          steps: params.steps,
          cfg: params.cfg,
          rescaleCfg: params.rescaleCfg,
          rescaleEnabled: params.rescaleEnabled,
          megapixels: params.megapixels,
          batchSize: params.batchSize,
          shift: params.shift,
          implicitSteps: params.implicitSteps,
          implicitEnabled: params.implicitEnabled,
          aspectRatio: params.aspectRatio,
          sampler: params.sampler,
          scheduler: params.scheduler,
          seed: params.seed,
          model: modelRef.current,
          operation: params.operation || 'generation',
          expertMode: params.expertMode === true,
          faceLoraId: params.faceLoraId,
          loraStrength: params.loraStrength,
          denoise: params.denoise,
        },
      });
    } catch (error) {
      console.warn('Failed to persist generated image:', error);
    }
  }, []);

  const runJob = useCallback(async (functionName, params, fallbackSteps) => {
    if (status !== 'READY' || generatingRef.current) return false;

    generatingRef.current = true;
    generationTokenRef.current += 1;
    const generationToken = generationTokenRef.current;
    const totalSteps = params.steps || fallbackSteps;
    const generationStartedAt = Date.now();
    resetInactivity();
    setErrorMessage('');
    setGeneratedImageUrl(null);
    setGeneratedImageUrls([]);
    setPreviewImageUrl(null);
    setGpuName(null);
    setGenProgress({ step: 0, total: totalSteps, stage: 'submitting' });
    setGeneratingPromptId('submitting');
    setStatusMessage('Sending request');
    setStatusDetail('Submitting the workflow to RunPod');

    try {
      const submitResponse = await base44.functions.invoke(functionName, {
        ...params,
        model: modelRef.current,
      });
      const jobId = submitResponse.data?.jobId;
      if (!jobId) throw new Error(submitResponse.data?.error || 'RunPod did not return a job ID');

      if (generationToken !== generationTokenRef.current) return false;
      jobIdRef.current = jobId;
      setJobRef(String(jobId).slice(-8));
      if (submitResponse.data?.endpointRef) setEndpointRef(submitResponse.data.endpointRef);
      workflowRef.current = submitResponse.data?.workflow || null;
      setGeneratingPromptId(jobId);
      setStatusMessage('Searching for GPU');
      setStatusDetail('Waiting for compatible GPU capacity');
      setGenProgress({ step: 0, total: totalSteps, stage: 'searching_gpu' });

      const poll = async () => {
        if (generationToken !== generationTokenRef.current || !generatingRef.current) return;
        if (Date.now() - generationStartedAt > MAX_GENERATION_TIME) {
          await cancelActiveJob();
          resetGenerationState();
          setStatusMessage('Ready');
          setErrorMessage('Generation timed out');
          return;
        }

        try {
          const statusResponse = await base44.functions.invoke('runpodStatus', {
            jobId,
            model: modelRef.current,
            workflow: workflowRef.current,
          });
          const job = statusResponse.data;

          if (job?.endpointRef) setEndpointRef(job.endpointRef);
          if (job?.gpuName) setGpuName(job.gpuName);
          if (job?.status === 'queued') {
            setStatusMessage('Searching for GPU');
            setStatusDetail('Waiting for compatible GPU capacity');
            setGenProgress(current => ({ ...current, stage: 'searching_gpu' }));
          }

          if (job?.progress) {
            const step = Math.max(0, Number(job.progress.step || 0));
            const total = Math.max(0, Number(job.progress.total || totalSteps));
            setGenProgress({ step, total, stage: job.progress.stage || 'running' });
            setStatusMessage(job.progress.stageLabel || 'Running workflow');
            setStatusDetail(job.progress.detail || 'ComfyUI is processing the workflow');
            const previewUrl = previewToDataUrl(job.progress.previewImage);
            if (previewUrl) setPreviewImageUrl(previewUrl);
          } else if (job?.status === 'running') {
            setStatusMessage('Starting worker');
            setStatusDetail(
              job.gpuName
                ? 'Preparing the container and cached models'
                : 'Assigning the worker and preparing its model cache',
            );
            setGenProgress(current => ({ ...current, stage: 'starting_worker' }));
          }

          if (job?.status === 'completed') {
            const images = job.images?.length ? job.images : [job.image];
            const imageUrls = images.map(imageToDataUrl).filter(Boolean);
            if (!imageUrls.length) throw new Error('RunPod completed the job without an image');

            setGenProgress({ step: totalSteps, total: totalSteps, stage: 'completed' });
            setGeneratedImageUrl(imageUrls[0]);
            setGeneratedImageUrls(imageUrls);
            resetGenerationState();
            setStatusMessage('Ready');
            setStatusDetail('');
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
          setStatusMessage('Ready');
          setStatusDetail('');
          setErrorMessage(errorMessage(error, 'Generation failed'));
        }
      };

      void poll();
      return true;
    } catch (error) {
      console.error('RunPod submission failed:', error);
      resetGenerationState();
      setStatusMessage('Ready');
      setStatusDetail('');
      setErrorMessage(errorMessage(error, 'Unable to start generation'));
      return false;
    }
  }, [cancelActiveJob, persistGeneratedImage, resetGenerationState, resetInactivity, status]);

  const generate = useCallback(
    params => runJob(
      'runpodSubmit',
      {
        ...params,
        operation: params.expertMode ? 'expert-generation' : 'generation',
      },
      params.expertMode ? 40 : 45,
    ),
    [runJob],
  );

  const refineFace = useCallback(
    params => runJob('runpodFaceSubmit', { ...params, operation: 'face-detail' }, 25),
    [runJob],
  );

  const cancelGeneration = useCallback(async () => {
    generationTokenRef.current += 1;
    clearTimeout(pollTimer.current);
    await cancelActiveJob();
    resetGenerationState();
    setStatusMessage('Ready');
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
    endpointRef,
    jobRef,
    costPerHour: null,
    statusMessage,
    statusDetail,
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
    refineFace,
    cancelGeneration,
    interruptGeneration,
    clearGeneratedImage,
    keepAlive,
  };
}
