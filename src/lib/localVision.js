import { base44 } from '@/api/base44Client';

export const LOCAL_MODEL = 'onnx-community/siglip2-base-patch16-224-ONNX';
export const LOCAL_VERSION = 'siglip2-base-p16-224-q4-v1';
let worker;
let nextId = 1;
const pending = new Map();

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('../workers/localVision.worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    if (!data.id) return;
    const request = pending.get(data.id);
    if (!request) return;
    pending.delete(data.id);
    data.error ? request.reject(new Error(data.error)) : request.resolve({ vector: data.vector, device: data.device });
  };
  return worker;
}

function request(type, payload) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, type, payload });
  });
}

export const quantizeVector = vector => {
  const bytes = new Uint8Array(vector.length);
  for (let i = 0; i < vector.length; i++) bytes[i] = Math.max(-127, Math.min(127, Math.round(vector[i] * 127))) + 128;
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
};

export const dequantizeVector = encoded => {
  const binary = atob(encoded);
  const vector = new Float32Array(binary.length);
  for (let i = 0; i < binary.length; i++) vector[i] = (binary.charCodeAt(i) - 128) / 127;
  return vector;
};

export const embedQueryLocally = text => request('text', { text });

export async function embedMediaLocally(itemId, source) {
  await base44.entities.MediaItem.update(itemId, { embedding_status: 'processing', embedding_error: '' });
  try {
    const { vector, device } = await request('image', source);
    const update = {
      local_embedding_q8: quantizeVector(vector),
      embedding_dimensions: vector.length,
      embedding_model: LOCAL_MODEL,
      embedding_version: LOCAL_VERSION,
      embedding_status: 'completed',
      embedding_error: '',
      embedded_at: new Date().toISOString(),
    };
    await base44.entities.MediaItem.update(itemId, update);
    return { ...update, device };
  } catch (error) {
    await base44.entities.MediaItem.update(itemId, { embedding_status: 'failed', embedding_error: error.message.slice(0, 500) });
    throw error;
  }
}