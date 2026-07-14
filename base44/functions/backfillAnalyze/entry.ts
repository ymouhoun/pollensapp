import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let operation = null;

  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'summary';
    const version = 'visual-analysis-v1';
    const pilotLimit = 10;
    const batchSize = 2;
    const operations = await base44.asServiceRole.entities.BackfillOperation.filter({ kind: 'media_analysis_pilot' }, '-created_date', 1);
    operation = operations[0] || null;

    const items = await base44.asServiceRole.entities.MediaItem.list('-created_date', 500);
    const images = items.filter((item) => item.content_type === 'image' && item.file_url);
    const needsAnalysis = (item) => !item.analysis_status || item.analysis_status === 'failed' || (item.analysis_status === 'completed' && item.analysis_version !== version);
    const candidates = images.filter(needsAnalysis);
    const summary = (op) => ({
      currentVersion: version,
      totalImages: images.length,
      totalToProcess: candidates.length,
      pilotLimit,
      estimatedCreditsMin: Math.min(pilotLimit, candidates.length),
      estimatedCreditsMax: Math.min(pilotLimit, candidates.length) * 3,
      operation: op,
    });

    if (action === 'summary') return Response.json(summary(operation));

    if (action === 'pause') {
      if (operation?.status === 'running') {
        operation = await base44.asServiceRole.entities.BackfillOperation.update(operation.id, { status: 'paused' });
      }
      return Response.json(summary(operation));
    }

    let targets = [];
    let retryOnly = false;

    if (action === 'start') {
      if (operation) return Response.json({ error: 'Le lot pilote existe déjà; validation requise avant un nouveau lot.' }, { status: 409 });
      const selected = candidates.slice(0, pilotLimit);
      if (!selected.length) return Response.json(summary(null));
      operation = await base44.asServiceRole.entities.BackfillOperation.create({
        kind: 'media_analysis_pilot',
        status: 'running',
        pilot_limit: selected.length,
        total_candidates_at_start: candidates.length,
        processed: 0,
        pending: selected.length,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        processed_ids: [],
        failed_ids: [],
        estimated_credits_min: selected.length,
        estimated_credits_max: selected.length * 3,
        observed_analysis_calls: 0,
        started_at: new Date().toISOString(),
        last_error: '',
      });
      targets = selected.slice(0, batchSize);
    } else if (action === 'continue') {
      if (operation?.status !== 'running') return Response.json(summary(operation));
      const doneIds = operation.processed_ids || [];
      const remainingSlots = Math.max(0, operation.pilot_limit - doneIds.length);
      targets = candidates.filter((item) => !doneIds.includes(item.id)).slice(0, Math.min(batchSize, remainingSlots));
    } else if (action === 'resume') {
      if (!operation || !['paused', 'failed'].includes(operation.status)) {
        return Response.json({ error: 'Aucun pilote interrompu à reprendre.' }, { status: 409 });
      }
      const doneIds = operation.processed_ids || [];
      const remainingSlots = Math.max(0, operation.pilot_limit - doneIds.length);
      targets = candidates.filter((item) => !doneIds.includes(item.id)).slice(0, Math.min(batchSize, remainingSlots));
      operation = await base44.asServiceRole.entities.BackfillOperation.update(operation.id, { status: 'running', last_error: '' });
    } else if (action === 'retry_failed') {
      if (!operation?.failed_ids?.length) return Response.json({ error: 'Aucun échec à relancer.' }, { status: 409 });
      retryOnly = true;
      targets = operation.failed_ids.map((id) => images.find((item) => item.id === id)).filter(Boolean);
      operation = await base44.asServiceRole.entities.BackfillOperation.update(operation.id, { status: 'running', last_error: '' });
    } else {
      return Response.json({ error: 'Action inconnue' }, { status: 400 });
    }

    let processedIds = [...(operation.processed_ids || [])];
    let failedIds = [...(operation.failed_ids || [])];
    let processed = operation.processed || 0;
    let succeeded = operation.succeeded || 0;
    let failed = operation.failed || 0;
    let skipped = operation.skipped || 0;
    let observedCalls = operation.observed_analysis_calls || 0;

    for (const target of targets) {
      const liveOperation = await base44.asServiceRole.entities.BackfillOperation.get(operation.id);
      if (liveOperation.status !== 'running') {
        operation = liveOperation;
        break;
      }

      const item = await base44.asServiceRole.entities.MediaItem.get(target.id);
      const alreadyProcessed = processedIds.includes(item.id);

      if (!retryOnly && !needsAnalysis(item)) {
        if (!alreadyProcessed) {
          processedIds.push(item.id);
          processed += 1;
        }
        skipped += 1;
      } else {
        try {
          let response = { data: { status: 'completed' } };
          let refreshed = item;
          const metadataReady = refreshed.analysis_version === version && refreshed.searchable_text;
          if (!(retryOnly && metadataReady)) {
            response = await base44.asServiceRole.functions.invoke('analyzeMedia', { entity_id: item.id, force: true });
            refreshed = await base44.asServiceRole.entities.MediaItem.get(item.id);
            observedCalls += refreshed.analysis_attempts || 0;
          }
          if (refreshed.analysis_version === version && refreshed.searchable_text && !refreshed.vector_id) {
            let vectorError = null;
            for (let vectorAttempt = 1; vectorAttempt <= 3; vectorAttempt++) {
              try {
                await base44.asServiceRole.functions.invoke('embedMedia', { entity_id: item.id });
                refreshed = await base44.asServiceRole.entities.MediaItem.get(item.id);
                if (refreshed.vector_id) break;
              } catch (error) {
                vectorError = error;
                if (vectorAttempt < 3) await new Promise((resolve) => setTimeout(resolve, vectorAttempt * 1000));
              }
            }
            if (!refreshed.vector_id && vectorError) throw vectorError;
          }
          const complete = response.data?.status === 'completed' && refreshed.analysis_version === version && refreshed.searchable_text && refreshed.vector_id;
          if (!complete) throw new Error(response.data?.error || refreshed.analysis_error || 'Analyse ou indexation incomplète');
          if (refreshed.analysis_status !== 'completed') await base44.asServiceRole.entities.MediaItem.update(item.id, { analysis_status: 'completed', analysis_error: '' });

          if (!alreadyProcessed) {
            processedIds.push(item.id);
            processed += 1;
            succeeded += 1;
          } else if (failedIds.includes(item.id)) {
            failed = Math.max(0, failed - 1);
            succeeded += 1;
          }
          failedIds = failedIds.filter((id) => id !== item.id);
        } catch (error) {
          if (!alreadyProcessed) {
            processedIds.push(item.id);
            processed += 1;
            failed += 1;
          }
          if (!failedIds.includes(item.id)) failedIds.push(item.id);
          await base44.asServiceRole.entities.MediaItem.update(item.id, {
            analysis_status: 'failed',
            analysis_error: String(error.message || error).slice(0, 500),
          });
        }
      }

      operation = await base44.asServiceRole.entities.BackfillOperation.update(operation.id, {
        processed,
        pending: Math.max(0, operation.pilot_limit - processed),
        succeeded,
        failed,
        skipped,
        processed_ids: processedIds,
        failed_ids: failedIds,
        observed_analysis_calls: observedCalls,
      });
    }

    const currentOperation = await base44.asServiceRole.entities.BackfillOperation.get(operation.id);
    const shouldFinish = retryOnly || currentOperation.processed >= currentOperation.pilot_limit || targets.length === 0;
    if (currentOperation.status === 'running' && shouldFinish) {
      operation = await base44.asServiceRole.entities.BackfillOperation.update(operation.id, {
        status: 'completed', pending: 0, finished_at: new Date().toISOString(),
      });
    } else {
      operation = currentOperation;
    }

    return Response.json(summary(operation));
  } catch (error) {
    if (operation?.id) {
      await base44.asServiceRole.entities.BackfillOperation.update(operation.id, {
        status: 'failed',
        last_error: String(error.message || error).slice(0, 500),
      });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});