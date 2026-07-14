# RunPod integration

The active Entropy studio now uses RunPod Serverless instead of creating and
destroying Vast.ai instances.

## Base44 secrets

Configure these values in the Base44 dashboard before deploying:

- `RUNPOD_API_KEY`: a RunPod API key with access to the Serverless endpoint.
- `RUNPOD_ENDPOINT_ID`: the endpoint ID used by the first `editorial` model.

For multiple models, replace the single endpoint variable with:

- `RUNPOD_ENDPOINTS_JSON`: a JSON object mapping model keys to endpoint IDs.

Example:

```json
{"editorial":"YOUR_ENDPOINT_ID","second-model":"ANOTHER_ENDPOINT_ID"}
```

`RUNPOD_ENDPOINTS_JSON` takes precedence over `RUNPOD_ENDPOINT_ID`.

## Base44 functions

- `runpodHealth`: validates the selected model endpoint.
- `runpodSubmit`: builds the ComfyUI workflow and submits an asynchronous job.
- `runpodStatus`: normalizes queue, progress and final image responses.
- `runpodCancel`: cancels queued or running jobs.

The RunPod key is read only inside these backend functions and is never sent to
the browser.

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
4. Test start, generation, cancellation and persistence in Entropy.
5. Remove the unused Vast.ai functions only after the RunPod path is validated.
