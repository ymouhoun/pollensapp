import { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 min
const WARNING_BEFORE = 2 * 60 * 1000; // 2 min warning
const HEALTH_POLL_INTERVAL = 10000;
const PORT_POLL_INTERVAL = 10000;
const BOOT_TIMEOUT = 12 * 60 * 1000; // 12 min
const HISTORY_POLL_INTERVAL = 3000;

const MODELS = [
  { label: "Editorial", checkpoint: "editorial.safetensors" },
];

const STATUS_MESSAGES = [
  "Finding the best available GPU...",
  "Starting your {GPU} instance...",
  "Pulling Docker environment...",
  "Downloading models from storage... (~50GB)",
  "Loading models into GPU memory...",
  "Almost ready...",
];

export default function useStudioSession() {
  const [status, setStatus] = useState("STOPPED"); // STOPPED | STARTING | READY | STOPPING
  const [gpuName, setGpuName] = useState("");
  const [costPerHour, setCostPerHour] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [bootProgress, setBootProgress] = useState(0);
  const [error, setError] = useState(null);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [generating, setGenerating] = useState(false);

  const instanceIdRef = useRef(null);
  const baseUrlRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const bootStartRef = useRef(null);
  const pollRef = useRef(null);
  const progressRef = useRef(null);
  const abortRef = useRef(false);

  // ── Inactivity management ──
  const resetInactivity = useCallback(() => {
    setInactivityWarning(false);
    clearTimeout(inactivityTimerRef.current);
    clearTimeout(warningTimerRef.current);

    warningTimerRef.current = setTimeout(() => {
      setInactivityWarning(true);
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE);

    inactivityTimerRef.current = setTimeout(() => {
      destroyInstance();
    }, INACTIVITY_TIMEOUT);
  }, []);

  const keepAlive = useCallback(() => {
    resetInactivity();
  }, [resetInactivity]);

  // ── Destroy ──
  const destroyInstance = useCallback(async () => {
    const id = instanceIdRef.current;
    clearTimeout(inactivityTimerRef.current);
    clearTimeout(warningTimerRef.current);
    clearInterval(pollRef.current);
    clearInterval(progressRef.current);
    abortRef.current = true;

    if (id) {
      setStatus("STOPPING");
      await base44.functions.invoke('vastDestroyInstance', { instanceId: id }).catch(() => {});
    }

    instanceIdRef.current = null;
    baseUrlRef.current = null;
    setStatus("STOPPED");
    setGpuName("");
    setCostPerHour(0);
    setBootProgress(0);
    setStatusMessage("");
    setInactivityWarning(false);
    setError(null);
  }, []);

  // ── Start full flow ──
  const startStudio = useCallback(async (model) => {
    abortRef.current = false;
    setError(null);
    setStatus("STARTING");
    setBootProgress(0);
    setGeneratedImages([]);
    const chosen = model || selectedModel;
    setSelectedModel(chosen);

    bootStartRef.current = Date.now();

    // Progress bar ticker (6 min = 360s)
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - bootStartRef.current;
      const p = Math.min(95, (elapsed / 360000) * 100);
      setBootProgress(p);
    }, 1000);

    // Status message rotator
    let msgIdx = 0;
    setStatusMessage(STATUS_MESSAGES[0]);
    const msgInterval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, STATUS_MESSAGES.length - 1);
      setStatusMessage(STATUS_MESSAGES[msgIdx].replace("{GPU}", gpuName || "GPU"));
    }, 45000);

    try {
      // Step 1: Search GPU (Europe first)
      setStatusMessage("Finding the best available GPU...");
      let searchRes = await base44.functions.invoke('vastSearchGpu', { globalFallback: false });
      let gpu = searchRes.data;

      if (gpu.noEuResults) {
        setStatusMessage("No European GPU available — searching globally...");
        searchRes = await base44.functions.invoke('vastSearchGpu', { globalFallback: true });
        gpu = searchRes.data;
      }

      if (gpu.error) {
        throw new Error(gpu.error);
      }

      if (abortRef.current) return;

      setGpuName(gpu.gpuName);
      setCostPerHour(gpu.costPerHour);
      setStatusMessage(`Starting your ${gpu.gpuName} instance...`);

      // Step 2: Create instance
      const createRes = await base44.functions.invoke('vastCreateInstance', {
        offerId: gpu.offerId,
        checkpoint: chosen.checkpoint,
        vae: "qwen_image_vae.safetensors",
        textEncoder: "qwen_2.5_vl_7b_fp8_scaled.safetensors",
      });

      if (createRes.data.error) throw new Error(createRes.data.error);
      if (abortRef.current) return;

      const instanceId = createRes.data.instanceId;
      instanceIdRef.current = instanceId;

      // Step 3: Poll for ports
      setStatusMessage("Pulling Docker environment...");
      let baseUrl = null;
      while (!baseUrl && !abortRef.current) {
        await new Promise(r => setTimeout(r, PORT_POLL_INTERVAL));
        const pollRes = await base44.functions.invoke('vastPollInstance', { instanceId });
        if (pollRes.data.status === "ports_ready") {
          baseUrl = pollRes.data.baseUrl;
        }
      }

      if (abortRef.current) return;
      baseUrlRef.current = baseUrl;

      // Step 4: Poll for ComfyUI health
      setStatusMessage("Downloading models from storage... (~50GB)");
      const healthStart = Date.now();
      let ready = false;

      while (!ready && !abortRef.current) {
        if (Date.now() - healthStart > BOOT_TIMEOUT) {
          throw new Error("Studio failed to start.");
        }
        await new Promise(r => setTimeout(r, HEALTH_POLL_INTERVAL));
        const hRes = await base44.functions.invoke('vastProxyComfy', { baseUrl, action: "health" });
        if (hRes.data.ready) ready = true;
        else {
          const elapsed = Date.now() - bootStartRef.current;
          if (elapsed > 180000) setStatusMessage("Loading models into GPU memory...");
          if (elapsed > 280000) setStatusMessage("Almost ready...");
        }
      }

      if (abortRef.current) return;

      clearInterval(msgInterval);
      clearInterval(progressRef.current);
      setBootProgress(100);
      setStatusMessage("Ready!");
      setStatus("READY");
      resetInactivity();

    } catch (err) {
      clearInterval(msgInterval);
      clearInterval(progressRef.current);
      setError(err.message || "Unknown error");
      setStatus("STOPPED");
    }
  }, [selectedModel, gpuName, resetInactivity]);

  // ── Generate image ──
  const generate = useCallback(async ({ prompt, steps = 40, cfg = 3.0, aspectRatio = "3:4 (Golden Ratio)" }) => {
    if (!baseUrlRef.current || status !== "READY") return;
    setGenerating(true);
    resetInactivity();

    const seed = Math.floor(Math.random() * 2147483647);

    const workflow = {
      "1": {"inputs": {"samples": ["16", 0], "vae": ["3", 0]}, "class_type": "VAEDecode"},
      "3": {"inputs": {"vae_name": "qwen_image_vae.safetensors"}, "class_type": "VAELoader"},
      "6": {"inputs": {"clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors", "type": "qwen_image", "device": "default"}, "class_type": "CLIPLoader"},
      "7": {"inputs": {"megapixel": "1.8", "aspect_ratio": aspectRatio, "divisible_by": "64", "custom_ratio": false, "custom_aspect_ratio": "1:1"}, "class_type": "FluxResolutionNode"},
      "8": {"inputs": {"text": "unrealistic, plastic skin, cgi, low resolution, wrong anatomy, stock photo, flat lighting, logo, text, over-smoothed face", "clip": ["6", 0]}, "class_type": "CLIPTextEncode"},
      "9": {"inputs": {"shift": 1, "model": ["10", 0]}, "class_type": "ModelSamplingAuraFlow"},
      "10": {"inputs": {"unet_name": "editorial.safetensors", "weight_dtype": "default"}, "class_type": "UNETLoader"},
      "13": {"inputs": {"text": prompt, "clip": ["6", 0]}, "class_type": "CLIPTextEncode"},
      "14": {"inputs": {"width": ["7", 0], "height": ["7", 1], "batch_size": 1}, "class_type": "EmptySD3LatentImage"},
      "15": {"inputs": {"filename_prefix": "solweig", "images": ["1", 0]}, "class_type": "SaveImage"},
      "16": {"inputs": {"seed": seed, "steps": steps, "cfg": cfg, "sampler_name": "res_2s", "scheduler": "kl_optimal", "denoise": 1, "model": ["9", 0], "positive": ["13", 0], "negative": ["8", 0], "latent_image": ["14", 0]}, "class_type": "KSampler"},
    };

    const baseUrl = baseUrlRef.current;

    // Submit
    const submitRes = await base44.functions.invoke('vastProxyComfy', {
      baseUrl, action: "prompt", workflow,
    });

    if (submitRes.data.error) {
      setGenerating(false);
      throw new Error(submitRes.data.error);
    }

    const promptId = submitRes.data.promptId;

    // Poll history
    let filename = null;
    while (!filename) {
      await new Promise(r => setTimeout(r, HISTORY_POLL_INTERVAL));
      const histRes = await base44.functions.invoke('vastProxyComfy', {
        baseUrl, action: "history", promptId,
      });
      if (histRes.data.complete) {
        filename = histRes.data.filename;
      }
    }

    const imageUrl = `${baseUrl}/view?filename=${encodeURIComponent(filename)}`;
    setGeneratedImages(prev => [{ url: imageUrl, prompt, seed }, ...prev]);
    setGenerating(false);
    resetInactivity();
    return imageUrl;
  }, [status, resetInactivity]);

  // Retry: destroy and restart
  const retry = useCallback(async () => {
    await destroyInstance();
    startStudio(selectedModel);
  }, [destroyInstance, startStudio, selectedModel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(inactivityTimerRef.current);
      clearTimeout(warningTimerRef.current);
      clearInterval(pollRef.current);
      clearInterval(progressRef.current);
    };
  }, []);

  return {
    status, gpuName, costPerHour, statusMessage, bootProgress, error,
    selectedModel, setSelectedModel, models: MODELS,
    inactivityWarning, generatedImages, generating,
    startStudio, destroyInstance, generate, retry, keepAlive,
  };
}