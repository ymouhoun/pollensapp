import React, { useEffect, useState } from 'react';
import AnalysisEditor from '@/components/memory/AnalysisEditor';

const labels = { pending: 'Vectorisation locale en attente', processing: 'Vectorisation locale en cours', completed: 'Vecteur local disponible', failed: 'Erreur de vectorisation locale' };

export default function ImageAnalysisPanel({ item, onUpdated }) {
  const [record, setRecord] = useState(item);
  useEffect(() => setRecord(item), [item]);
  if (item.content_type !== 'image') return null;
  const status = record.embedding_status || 'pending';
  const hasMetadata = record.caption || record.caption_short_fr || record.caption_detailed_fr || record.caption_en || record.manual_caption_short_fr;
  return <div className="mt-2 max-h-[55vh] space-y-3 overflow-y-auto border-t border-foreground/10 pt-3 pr-1">
    <div>
      <p className="text-[11px] text-foreground/55">{labels[status]}</p>
      {record.embedding_model && <p className="mt-1 text-[9px] text-foreground/35">{record.embedding_version}</p>}
    </div>
    {status === 'failed' && record.embedding_error && <p className="rounded-md bg-destructive/10 p-2 text-[10px] text-destructive">{record.embedding_error}</p>}
    {hasMetadata && <AnalysisEditor item={record} onSaved={fresh => { setRecord(fresh); onUpdated?.(fresh); }} />}
  </div>;
}