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

      const detectMime = (bytes) => {
        if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
        if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
        if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
        return null;
      };

      const extractPreviewImage = (bytes) => {
        const offsets = [8, 4, 0];
        for (const offset of offsets) {
          if (bytes.length <= offset) continue;
          const candidate = bytes.slice(offset);
          const mime = detectMime(candidate);
          if (mime) return { imageData: candidate, mime, offset };
        }
        return null;
      };

      ws.onopen = () => {
        send({ type: 'connected' });
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data);
            send(msg);
          } catch {}
          return;
        }

        let bytes = null;
        if (event.data instanceof Blob) {
          bytes = new Uint8Array(await event.data.arrayBuffer());
        } else if (event.data instanceof ArrayBuffer) {
          bytes = new Uint8Array(event.data);
        } else if (ArrayBuffer.isView(event.data)) {
          bytes = new Uint8Array(event.data.buffer);
        }

        if (bytes && bytes.length > 8 && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 0 && bytes[3] === 1) {
          const imageData = bytes.slice(8);
          const b64 = base64Encode(imageData);
          send({ type: 'preview', image: b64, mime: detectMime(imageData) });
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