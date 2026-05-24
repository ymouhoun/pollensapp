import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { encode as base64Encode } from 'https://deno.land/std@0.208.0/encoding/base64.ts';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { baseUrl, clientId } = await req.json();
  const wsUrl = baseUrl.replace(/^http/, 'ws') + `/ws?clientId=${clientId}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (data) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { closed = true; }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try { controller.close(); } catch {}
      };

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        send({ type: 'connected' });
      };

      ws.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          const arrayBuffer = await event.data.arrayBuffer();
          // ComfyUI binary: first 4 bytes (Uint32) = message type (1=image preview),
          // next 4 bytes (Uint32) = format (1=JPEG, 2=PNG). Image data starts at offset 8.
          if (arrayBuffer.byteLength > 8) {
            const view = new DataView(arrayBuffer);
            const messageType = view.getUint32(0);
            if (messageType === 1) {
              const formatType = view.getUint32(4);
              const format = formatType === 2 ? 'image/png' : 'image/jpeg';
              const imageData = new Uint8Array(arrayBuffer, 8);
              const b64 = base64Encode(imageData);
              send({ type: 'preview', image: b64, format });
            }
          }
        } else if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data);
            send(msg);
          } catch {}
        }
      };

      ws.onerror = () => {
        send({ type: 'error', message: 'WebSocket error' });
        close();
      };

      ws.onclose = () => {
        send({ type: 'ws_closed' });
        close();
      };

      req.signal.addEventListener('abort', () => {
        ws.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});