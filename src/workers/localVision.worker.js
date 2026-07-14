import { AutoModel, AutoProcessor, AutoTokenizer, RawImage, env } from '@huggingface/transformers';

const MODEL = 'onnx-community/siglip2-base-patch16-224-ONNX';
env.useBrowserCache = true;
let runtime;

const normalize = tensor => {
  const values = Array.from(tensor.data || tensor);
  const length = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
  return new Float32Array(values.map(value => value / length));
};

async function loadRuntime() {
  if (runtime) return runtime;
  const load = async device => {
    const options = { device, dtype: 'q4', progress_callback: progress => self.postMessage({ type: 'progress', progress }) };
    const [visionModel, textModel, processor, tokenizer] = await Promise.all([
      AutoModel.from_pretrained(MODEL, { ...options, model_file_name: 'vision_model' }),
      AutoModel.from_pretrained(MODEL, { ...options, model_file_name: 'text_model' }),
      AutoProcessor.from_pretrained(MODEL),
      AutoTokenizer.from_pretrained(MODEL),
    ]);
    return { visionModel, textModel, processor, tokenizer, device };
  };
  if (self.navigator?.gpu) {
    try { runtime = await load('webgpu'); return runtime; } catch (_) { runtime = null; }
  }
  runtime = await load('wasm');
  return runtime;
}

async function embedImage(payload) {
  const { visionModel, processor } = await loadRuntime();
  const image = payload.file ? await RawImage.fromBlob(payload.file) : await RawImage.read(payload.url);
  const inputs = await processor(image);
  const output = await visionModel(inputs);
  const tensor = output.image_embeds || output.pooler_output;
  if (!tensor) throw new Error('Le modèle local n’a retourné aucun embedding image.');
  return normalize(tensor);
}

async function embedText(text) {
  const { textModel, tokenizer } = await loadRuntime();
  const inputs = tokenizer([text], { padding: 'max_length', truncation: true });
  const output = await textModel(inputs);
  const tensor = output.text_embeds || output.pooler_output;
  if (!tensor) throw new Error('Le modèle local n’a retourné aucun embedding texte.');
  return normalize(tensor);
}

self.onmessage = async event => {
  const { id, type, payload } = event.data;
  try {
    const vector = type === 'image' ? await embedImage(payload) : await embedText(payload.text);
    self.postMessage({ id, vector, device: runtime.device }, [vector.buffer]);
  } catch (error) {
    self.postMessage({ id, error: error.message || String(error) });
  }
};