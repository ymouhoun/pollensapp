import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AnalysisEditor from '@/components/memory/AnalysisEditor';

const labels = { pending: 'En attente', processing: 'Analyse en cours', completed: 'Analysée', failed: 'Échec' };

export default function ImageAnalysisPanel({ item, onUpdated }) {
  const [record, setRecord] = useState(item);
  const [running, setRunning] = useState(false);
  useEffect(() => setRecord(item), [item]);
  if (item.content_type !== 'image') return null;

  const run = async () => {
    setRunning(true);
    setRecord(current => ({ ...current, analysis_status: 'processing' }));
    try { await base44.functions.invoke('analyzeMedia', { entity_id: item.id, force: true }); } catch (_) { /* status is persisted by the function */ }
    const fresh = await base44.entities.MediaItem.get(item.id);
    setRecord(fresh);
    onUpdated?.(fresh);
    setRunning(false);
  };

  const status = running ? 'processing' : (record.analysis_status || 'pending');
  return <div className="mt-2 space-y-3 border-t border-foreground/10 pt-3 max-h-[55vh] overflow-y-auto pr-1">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-foreground/55">{labels[status]}</span>
      <button onClick={run} disabled={running} className="flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground disabled:opacity-50">
        {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}{status === 'failed' ? 'Réessayer' : 'Réanalyser'}
      </button>
    </div>
    {status === 'failed' && record.analysis_error && <p className="rounded-md bg-destructive/10 p-2 text-[10px] text-destructive">{record.analysis_error}</p>}
    {status === 'completed' && <AnalysisEditor item={record} onSaved={fresh => { setRecord(fresh); onUpdated?.(fresh); }} />}
  </div>;
}