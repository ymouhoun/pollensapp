const decoder = new TextDecoder();

const readUint32 = (bytes, offset) => (
  ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0
);

const findNull = (bytes, start = 0) => {
  for (let index = start; index < bytes.length; index += 1) if (bytes[index] === 0) return index;
  return -1;
};

async function decodeTextChunk(type, data) {
  const keywordEnd = findNull(data);
  if (keywordEnd < 0) return null;
  const keyword = decoder.decode(data.subarray(0, keywordEnd));

  if (type === 'tEXt') return [keyword, decoder.decode(data.subarray(keywordEnd + 1))];
  if (type !== 'iTXt') return null;

  const compressed = data[keywordEnd + 1] === 1;
  const languageEnd = findNull(data, keywordEnd + 3);
  const translatedEnd = languageEnd < 0 ? -1 : findNull(data, languageEnd + 1);
  if (translatedEnd < 0) return null;
  let textBytes = data.subarray(translatedEnd + 1);
  if (compressed) {
    const stream = new Blob([textBytes]).stream().pipeThrough(new DecompressionStream('deflate'));
    textBytes = new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return [keyword, decoder.decode(textBytes)];
}

const linkedNode = (graph, value) => Array.isArray(value) ? graph[String(value[0])] : null;

const MODEL_BY_CHECKPOINT = {
  'edito04.safetensors': 'editorial',
  'editorial04.safetensors': 'editorial',
  'ambrojo04.safetensors': 'ambrojo',
  'naturemorte04.safetensors': 'still-life',
  '35mm04.safetensors': '35mm',
  'stills_q.safetensors': 'stills',
  'super16_q.safetensors': 'super16',
  'beauty_q.safetensors': 'beauty',
};

function promptFromLink(graph, value, visited = new Set()) {
  const node = linkedNode(graph, value);
  if (!node || visited.has(node)) return '';
  visited.add(node);
  if (node.class_type === 'CLIPTextEncode' && typeof node.inputs?.text === 'string') return node.inputs.text;
  if (node.class_type === 'LLMPromptEnhancer' && typeof node.inputs?.prompt === 'string') return node.inputs.prompt;
  for (const input of Object.values(node.inputs || {})) {
    const prompt = promptFromLink(graph, input, visited);
    if (prompt) return prompt;
  }
  return '';
}

function settingsFromGraph(rawGraph) {
  const graph = rawGraph?.prompt && typeof rawGraph.prompt === 'object' ? rawGraph.prompt : rawGraph;
  if (!graph || Array.isArray(graph)) throw new Error('This PNG does not contain an API workflow');
  const entries = Object.entries(graph).filter(([, node]) => node && typeof node === 'object');
  const findType = (type) => entries.find(([, node]) => node.class_type === type)?.[1];
  const faceDetailer = entries.find(([, node]) => [
    'PollenFaceDetailerAutoRetry',
    'FaceDetailer',
  ].includes(node.class_type))?.[1];
  const expertSampler = findType('SharkSampler_Beta');
  const standardSampler = entries.find(([, node]) => String(node.class_type || '').startsWith('KSampler'))?.[1];
  const sampler = faceDetailer || expertSampler || standardSampler;
  if (!sampler) throw new Error('No supported sampler parameters were found in this PNG');

  const resolution = findType('FluxResolutionNode');
  const latent = entries.find(([, node]) => ['EmptySD3LatentImage', 'EmptyLatentImage'].includes(node.class_type))?.[1];
  const rescale = findType('RescaleCFG');
  const sampling = findType('ModelSamplingAuraFlow');
  const modelNode = linkedNode(graph, sampler.inputs?.model);
  const positiveNode = linkedNode(graph, sampler.inputs?.positive);
  const modelLoader = findType('UNETLoader');
  const implicit = findType('ClownOptions_ImplicitSteps_Beta');
  const loraLoader = findType('Power Lora Loader (rgthree)');
  const lora = loraLoader?.inputs?.lora_1;
  const operationMode = faceDetailer ? 'face-detail' : (expertSampler ? 'expert' : 'generation');

  return {
    operationMode,
    model: MODEL_BY_CHECKPOINT[String(modelLoader?.inputs?.unet_name || '')],
    positivePrompt: promptFromLink(graph, sampler.inputs?.positive),
    complementaryPrompt: positiveNode?.class_type === 'ConditioningCombine'
      ? promptFromLink(graph, positiveNode.inputs?.conditioning_2)
      : undefined,
    seed: sampler.inputs?.seed ?? sampler.inputs?.noise_seed,
    steps: sampler.inputs?.steps,
    cfg: sampler.inputs?.cfg,
    sampler: sampler.inputs?.sampler_name,
    scheduler: sampler.inputs?.scheduler,
    aspectRatio: resolution?.inputs?.aspect_ratio,
    megapixels: resolution?.inputs?.megapixel,
    batchSize: latent?.inputs?.batch_size,
    rescaleCfg: rescale?.inputs?.multiplier,
    rescaleEnabled: modelNode?.class_type === 'RescaleCFG',
    shift: sampling?.inputs?.shift,
    denoise: faceDetailer?.inputs?.denoise,
    faceStrength: lora && typeof lora === 'object' ? lora.strength : undefined,
    faceLora: lora && typeof lora === 'object' ? lora.lora : undefined,
    implicitSteps: implicit?.inputs?.implicit_steps,
    implicitEnabled: Boolean(implicit),
    promptEnhancer: Boolean(findType('LLMPromptEnhancer')),
  };
}

export async function extractComfySettings(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length < 8 || readUint32(bytes, 0) !== 0x89504e47) throw new Error('Drop a PNG generated by Entropy or ComfyUI');

  const metadata = {};
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = readUint32(bytes, offset);
    const type = decoder.decode(bytes.subarray(offset + 4, offset + 8));
    if (type === 'tEXt' || type === 'iTXt') {
      const decoded = await decodeTextChunk(type, bytes.subarray(offset + 8, offset + 8 + length));
      if (decoded) metadata[decoded[0]] = decoded[1];
    }
    offset += length + 12;
  }

  // ComfyUI stores the executable API graph under `prompt`. Older Pollens
  // images stored that same graph under `workflow`, so retain the fallback.
  const workflow = metadata.prompt || metadata.workflow;
  if (!workflow) throw new Error('No ComfyUI workflow metadata was found in this PNG');
  return settingsFromGraph(JSON.parse(workflow));
}
