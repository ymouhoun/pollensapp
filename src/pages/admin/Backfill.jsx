import React from 'react';
import { Loader2 } from 'lucide-react';
import useBackfillPilot from '@/hooks/useBackfillPilot';
import BackfillStats from '@/components/admin/BackfillStats';
import BackfillControls from '@/components/admin/BackfillControls';

export default function Backfill() {
  const { data, isLoading, error, run } = useBackfillPilot();
  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  return (
    <div className="mx-auto min-h-screen max-w-4xl bg-background px-6 py-12">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Administration</p>
      <h1 className="mt-2 text-2xl font-light tracking-widest uppercase">Backfill des images</h1>
      <p className="mt-3 text-sm text-muted-foreground">Pilote verrouillé à 10 images maximum. Un nouveau lot restera bloqué jusqu’à validation explicite.</p>
      <div className="mt-8"><BackfillStats data={data} /></div>
      <div className="mt-6 rounded-lg border border-border/40 p-5">
        <p className="text-sm text-foreground">Crédits estimés avant lancement</p>
        <p className="mt-1 text-sm text-muted-foreground">{data?.operation?.estimated_credits_min ?? data?.estimatedCreditsMin} à {data?.operation?.estimated_credits_max ?? data?.estimatedCreditsMax} crédits d’analyse, selon les nouvelles tentatives.</p>
        {data?.operation && <p className="mt-2 text-xs text-muted-foreground">Statut : {data.operation.status} · Appels d’analyse observés : {data.operation.observed_analysis_calls || 0}</p>}
        <div className="mt-5"><BackfillControls data={data} run={run} /></div>
        {error && <p className="mt-3 text-sm text-destructive">{error.message}</p>}
        {data?.operation?.last_error && <p className="mt-3 text-sm text-destructive">{data.operation.last_error}</p>}
      </div>
    </div>
  );
}