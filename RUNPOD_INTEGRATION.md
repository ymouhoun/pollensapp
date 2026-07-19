# RunPod integration

The active Entropy studio now uses RunPod Serverless instead of creating and
destroying Vast.ai instances.

## Base44 secrets

Configure these values in the Base44 dashboard before deploying:

- `RUNPOD_API_KEY`: a RunPod API key with access to the Serverless endpoint.
- `RUNPOD_ENDPOINT_ID`: the endpoint ID used by the first `editorial` model.

For multiple models, replace the single endpoint variable with:

- `RUNPOD_ENDPOINTS_JSON`: a JSON object mapping model keys to endpoint IDs.
- `FACE_LORAS_JSON`: the private allowlist used by the Face Detail UI. The
  browser receives labels and strengths, but never Hugging Face paths.

Example:

```json
{
  "editorial": "EDITORIAL_ENDPOINT_ID",
  "ambrojo": "AMBROJO_ENDPOINT_ID",
  "still-life": "STILL_LIFE_ENDPOINT_ID",
  "35mm": "35MM_ENDPOINT_ID",
  "stills": "STILLS_ENDPOINT_ID",
  "super16": "SUPER16_ENDPOINT_ID",
  "beauty": "BEAUTY_ENDPOINT_ID"
}
```

`RUNPOD_ENDPOINTS_JSON` takes precedence over `RUNPOD_ENDPOINT_ID`.
Keep the model keys exactly as shown: the frontend, endpoint routing and ComfyUI
checkpoint allowlist all use these stable identifiers.

If the JSON secret is already masked in Base44, a single model can be redirected
without replacing it. Add a per-model override secret; it takes precedence over
both variables above:

- `RUNPOD_ENDPOINT_ID_EDITORIAL`
- `RUNPOD_ENDPOINT_ID_AMBROJO`
- `RUNPOD_ENDPOINT_ID_STILL_LIFE`
- `RUNPOD_ENDPOINT_ID_35MM`
- `RUNPOD_ENDPOINT_ID_STILLS`
- `RUNPOD_ENDPOINT_ID_SUPER16`
- `RUNPOD_ENDPOINT_ID_BEAUTY`

Example Face LoRA entry:

```json
[
  {
    "id": "carlotta",
    "label": "Carlotta",
    "source": "loras/q_carlotta_ludemann.safetensors",
    "defaultStrength": 0.68,
    "strengths": {
      "editorial": 0.68,
      "beauty": 0.62
    },
    "models": [
      "editorial",
      "ambrojo",
      "still-life",
      "35mm",
      "stills",
      "super16",
      "beauty"
    ]
  }
]
```

Repeat the object for each identity. `id` is the stable identifier stored with
the generated image. `source` stays server-side and must point to a file inside
`loras/` in the private Hugging Face repository.

## Model routing

| Model key | ComfyUI checkpoint |
| --- | --- |
| `editorial` | `editorial04.safetensors` |
| `ambrojo` | `ambrojo04.safetensors` |
| `still-life` | `naturemorte04.safetensors` |
| `35mm` | `35mm04.safetensors` |
| `stills` | `stills_q.safetensors` |
| `super16` | `super16_q.safetensors` |
| `beauty` | `beauty_q.safetensors` |

## Base44 functions

- `runpodHealth`: validates the selected model endpoint.
- `runpodSubmit`: builds the ComfyUI workflow and submits an asynchronous job.
- `runpodStatus`: normalizes queue, progress and final image responses.
- `runpodCancel`: cancels queued or running jobs.
- `faceLoraCatalog`: returns the sanitized, model-compatible identity list.
- `runpodFaceSubmit`: uploads the front image and submits the ControlNet-free
  FaceDetailer workflow to the endpoint matching the active checkpoint.

The RunPod key is read only inside these backend functions and is never sent to
the browser.

## Face Detail worker configuration

Use one private Hugging Face repository for all identities and the shared
FaceDetailer assets:

```text
loras/
  q_carlotta_ludemann.safetensors
  ...
assets/
  ultralytics/bbox/yolov11m-face.pt
  ultralytics/segm/yolo11m-seg.pt
  sams/sam_vit_b_01ec64.pth
  upscale_models/x1_ITF_SkinDiffDetail_Lite_v1.pth
```

Add these environment variables to **every RunPod endpoint** that can receive a
Face Detail job:

- `HF_LORA_REPO_ID`: the private repository, for example
  `ymouhoun/pollens-face-loras`.
- `HF_TOKEN`: a read token allowed to access that repository.
- `HF_LORA_REVISION`: preferably a commit SHA rather than `main`.
- `POLLEN_LORA_CACHE_MAX_ITEMS`: `5` by default.

The worker downloads the selected LoRA only when it is first requested on that
worker. The detector, segmentation, SAM and skin-detail upscaler files are also
downloaded once and pinned for the worker lifetime. No Network Volume is
required, so GPU availability is not restricted to one data center.

To publish updated LoRAs reliably, upload the files, copy the new Hugging Face
commit SHA into `HF_LORA_REVISION` on the endpoints, then save/redeploy them.
Changing the revision invalidates the worker cache without rebuilding Docker.

## Progressive previews

The frontend and `runpodStatus` already accept progress payloads shaped like:

```json
{
  "step": 12,
  "total": 45,
  "previewImage": "BASE64_JPEG"
}
```

The stock `worker-comfyui` handler does not publish ComfyUI binary previews.
A custom worker handler must capture the binary WebSocket preview frames and
send the payload through `runpod.serverless.progress_update()` before previews
appear in the studio.

## Rollout

1. Deploy the corrected RunPod worker and verify one job in the RunPod console.
2. Add the Base44 secrets.
3. Deploy this app version.
4. Test start, classic generation, Face Detail, cancellation and persistence in
   Entropy.
5. Remove the unused Vast.ai functions only after the RunPod path is validated.
