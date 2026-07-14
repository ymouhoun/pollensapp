import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function useBackfillPilot() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['backfill-pilot'],
    queryFn: async () => (await base44.functions.invoke('backfillAnalyze', { action: 'summary' })).data,
    refetchInterval: 2500,
  });
  const continuing = useRef(false);
  const run = async action => {
    const response = await base44.functions.invoke('backfillAnalyze', { action });
    await queryClient.invalidateQueries({ queryKey: ['backfill-pilot'] });
    return response.data;
  };
  useEffect(() => {
    if (query.data?.operation?.status !== 'running' || continuing.current) return;
    continuing.current = true;
    run('continue').finally(() => { continuing.current = false; });
  }, [query.data?.operation?.status, query.data?.operation?.processed]);
  return { ...query, run };
}