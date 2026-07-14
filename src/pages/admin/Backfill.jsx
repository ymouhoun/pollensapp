import React from 'react';
import { Loader2, Pause, Play } from 'lucide-react';
import useLocalBackfill from '@/hooks/useLocalBackfill';

const Stat = ({ label, value }) => <div className="rounded-lg border border-border/40 p-4"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-light">{value}</p></div>;

export default function Backfill() {
  const { operation, candidates, loading, start, pause, resume } = useLocalBackfill();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  const processed = operation.processedIds.length;
  const errors = operation.failedIds.length;
  const remaining = Math.max(0, operation.targetIds.length - processed);
  return <div className="mx-auto min-h-screen max-w-4xl bg-background px-6 py-12">
    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Administration · Local AI</p>
    <h1 className="mt-2 text-2xl font-light uppercase tracking-widest">Vectorisation locale</h1>
    <p className="mt-3 text-sm text-muted-foreground">Pilote de 10 images, calculé dans ce navigateur avec WebGPU ou WASM. Le modèle est mis en cache localement.</p>
    <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Appels Base44 AI" value={0} />
      <Stat label="Images vectorisées" value={processed - errors} />
      <Stat label="Erreurs locales" value={errors} />
      <Stat label="Restant à traiter" value={operation.status === 'idle' ? Math.min(10, candidates.length) : remaining} />
    </div>
    <div className="mt-6 rounded-lg border border-border/40 p-5">
      <p className="text-sm">Statut : {operation.status}</p>
      <p className="mt-1 text-xs text-muted-foreground">Aucun caption, LLM ou service d’embedding distant n’est appelé.</p>
      <div className="mt-5 flex gap-2">
        {['idle', 'completed'].includes(operation.status) && <button onClick={start} disabled={!candidates.length} className="flex items-center gap-2 rounded bg-foreground px-4 py-2 text-sm text-background disabled:opacity-30"><Play className="h-3.5 w-3.5" />Lancer le pilote</button>}
        {operation.status === 'running' && <button onClick={pause} className="flex items-center gap-2 rounded bg-foreground px-4 py-2 text-sm text-background"><Pause className="h-3.5 w-3.5" />Pause</button>}
        {operation.status === 'paused' && <button onClick={resume} className="flex items-center gap-2 rounded bg-foreground px-4 py-2 text-sm text-background"><Play className="h-3.5 w-3.5" />Reprendre</button>}
      </div>
    </div>
  </div>;
}