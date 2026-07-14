import React from 'react';

const Stat = ({ label, value }) => (
  <div className="rounded-lg border border-border/40 p-4">
    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    <p className="mt-2 text-2xl font-light text-foreground">{value ?? 0}</p>
  </div>
);

export default function BackfillStats({ data }) {
  const operation = data?.operation;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <Stat label="Total à traiter" value={operation?.total_candidates_at_start ?? data?.totalToProcess} />
      <Stat label="En attente" value={operation?.pending ?? Math.min(data?.pilotLimit || 10, data?.totalToProcess || 0)} />
      <Stat label="Réussies" value={operation?.succeeded} />
      <Stat label="Échouées" value={operation?.failed} />
      <Stat label="Ignorées" value={operation?.skipped} />
    </div>
  );
}