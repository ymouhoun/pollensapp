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
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        send({ type: 'connected' });
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          const bytes = new Uint8Array(event.data);
          if (bytes.length > 8 && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 0 && bytes[3] === 1) {
            const imageData = bytes.slice(8);
            const b64 = base64Encode(imageData);
            send({ type: 'preview', image: b64 });
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