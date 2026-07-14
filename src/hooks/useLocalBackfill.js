import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { embedMediaLocally, LOCAL_VERSION } from '@/lib/localVision';

const KEY = 'izar-local-embedding-pilot-v1';
const initial = { status: 'idle', targetIds: [], processedIds: [], failedIds: [] };

export default function useLocalBackfill() {
  const [operation, setOperation] = useState(() => JSON.parse(localStorage.getItem(KEY) || 'null') || initial);
  const [cycle, setCycle] = useState(0);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const working = useRef(false);
  const paused = useRef(false);
  const persist = useCallback(next => { setOperation(next); localStorage.setItem(KEY, JSON.stringify(next)); }, []);
  const refresh = useCallback(async () => {
    setLoading(true);
    setImages(await base44.entities.MediaItem.filter({ content_type: 'image' }, '-created_date', 500));
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const candidates = useMemo(() => images.filter(item => item.embedding_version !== LOCAL_VERSION || item.embedding_status !== 'completed'), [images]);
  const start = () => { paused.current = false; persist({ status: 'running', targetIds: candidates.slice(0, 10).map(item => item.id), processedIds: [], failedIds: [] }); };
  const pause = () => { paused.current = true; persist({ ...operation, status: 'paused' }); };
  const resume = () => { paused.current = false; persist({ ...operation, status: 'running' }); };

  useEffect(() => {
    if (operation.status !== 'running' || working.current) return;
    const remaining = operation.targetIds.filter(id => !operation.processedIds.includes(id));
    if (!remaining.length) { persist({ ...operation, status: 'completed' }); refresh(); return; }
    working.current = true;
    (async () => {
      let next = operation;
      for (const id of remaining.slice(0, 2)) {
        if (paused.current) break;
        const item = images.find(image => image.id === id);
        try {
          if (!item) throw new Error('Image inaccessible');
          await embedMediaLocally(id, { url: item.file_url });
          next = { ...next, processedIds: [...next.processedIds, id] };
        } catch (_) {
          next = { ...next, processedIds: [...next.processedIds, id], failedIds: [...new Set([...next.failedIds, id])] };
        }
        persist({ ...next, status: paused.current ? 'paused' : next.status });
      }
    })().finally(() => { working.current = false; setCycle(value => value + 1); });
  }, [operation, images, persist, refresh, cycle]);

  return { operation, images, candidates, loading, start, pause, resume };
}