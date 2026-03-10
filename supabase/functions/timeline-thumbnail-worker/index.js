/* global Deno, Response */
import {
  closeWorkerContext,
  createWorkerContext,
  normalizeBatchSize,
  processThumbnailBatch,
  verifyCronRequest,
} from '../_shared/timeline-thumbnail-worker.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

async function readJsonBody(request) {
  if (request.method === 'GET') return {};
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return {};

  try {
    return await request.json();
  } catch {
    return {};
  }
}

Deno.serve(async request => {
  if (request.method === 'GET') {
    return jsonResponse({
      ok: true,
      scope: 'timeline-thumbnail-worker',
      message: 'ready',
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
  const limit = normalizeBatchSize(body.limit ?? url.searchParams.get('limit'));
  const forceRegenerate = Boolean(
    body.forceRegenerate ??
      (url.searchParams.get('forceRegenerate') || '').toLowerCase() === 'true',
  );

  let context;
  try {
    context = createWorkerContext();
    const summary = await processThumbnailBatch({
      ...context,
      limit,
      forceRegenerate,
    });

    return jsonResponse({
      ok: true,
      limit,
      forceRegenerate,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown worker error';
    console.error(
      JSON.stringify({
        scope: 'timeline-thumbnail-worker',
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
  } finally {
    if (context) {
      await closeWorkerContext(context);
    }
  }
});
