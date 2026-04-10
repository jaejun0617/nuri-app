/* global Deno, Response */
import {
  createWorkerContext,
  DEFAULT_CLEANUP_BATCH_PER_BUCKET,
  DEFAULT_CLEANUP_LIMIT,
  DEFAULT_FINALIZER_LIMIT,
  normalizeCleanupBatchPerBucket,
  normalizeCleanupLimit,
  normalizeFinalizerLimit,
  processAccountDeletionBatch,
  readJsonBody,
  verifyCronRequest,
} from '../_shared/account-deletion-worker.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

Deno.serve(async request => {
  if (request.method === 'GET') {
    return jsonResponse({
      ok: true,
      scope: 'account-deletion-worker',
      message: 'ready',
      defaults: {
        finalizerLimit: DEFAULT_FINALIZER_LIMIT,
        cleanupLimit: DEFAULT_CLEANUP_LIMIT,
        cleanupBatchPerBucket: DEFAULT_CLEANUP_BATCH_PER_BUCKET,
      },
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  if (!verifyCronRequest(request)) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const body = await readJsonBody(request);
  const url = new URL(request.url);
  const finalizerLimit = normalizeFinalizerLimit(
    body.finalizerLimit ?? url.searchParams.get('finalizerLimit'),
  );
  const cleanupLimit = normalizeCleanupLimit(
    body.cleanupLimit ?? url.searchParams.get('cleanupLimit'),
  );
  const cleanupBatchPerBucket = normalizeCleanupBatchPerBucket(
    body.cleanupBatchPerBucket ?? url.searchParams.get('cleanupBatchPerBucket'),
  );

  let context;
  try {
    context = createWorkerContext();
    const summary = await processAccountDeletionBatch({
      ...context,
      finalizerLimit,
      cleanupLimit,
      cleanupBatchPerBucket,
    });

    return jsonResponse({
      ok: true,
      finalizerLimit,
      cleanupLimit,
      cleanupBatchPerBucket,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown worker error';
    console.error(
      JSON.stringify({
        scope: 'account-deletion-worker',
        event: 'batch_crash',
        message,
      }),
    );

    return jsonResponse(
      {
        ok: false,
        error: message,
      },
      500,
    );
  }
});
