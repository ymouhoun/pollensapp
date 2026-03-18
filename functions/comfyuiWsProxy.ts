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
        const data = event.data;
        if (data instanceof ArrayBuffer) {
          const bytes = new Uint8Array(data);
          console.log(`[WS] Binary message: ${bytes.length} bytes, header: [${bytes[0]},${bytes[1]},${bytes[2]},${bytes[3]},${bytes[4]},${bytes[5]},${bytes[6]},${bytes[7]}]`);
          // ComfyUI preview: first 4 bytes = event type (1=preview), next 4 = format (1=JPEG,2=PNG)
          if (bytes.length > 8) {
            const imageData = bytes.slice(8);
            const b64 = base64Encode(imageData);
            const format = bytes[7]; // last byte of format uint32 BE
            const mime = format === 2 ? 'image/png' : 'image/jpeg';
            send({ type: 'preview', image: b64, mime });
          }
        } else if (typeof data === 'string') {
          console.log(`[WS] Text message: ${data.substring(0, 200)}`);
          try {
            const msg = JSON.parse(data);
            send(msg);
          } catch {}
        } else {
          console.log(`[WS] Unknown data type: ${typeof data}, constructor: ${data?.constructor?.name}`);
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