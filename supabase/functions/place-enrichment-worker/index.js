/* global Deno */
import {
  createWorkerContext,
  DEFAULT_BACKGROUND_LIMIT,
  DEFAULT_BACKGROUND_MAX_UNITS,
  jsonResponse,
  normalizeBackgroundLimit,
  normalizeBackgroundMaxUnits,
  processBackgroundBatch,
  readJsonBody,
  verifyCronRequest,
} from '../_shared/place-enrichment.js';

Deno.serve(async request => {
  if (request.method === 'GET') {
    return jsonResponse({
      ok: true,
      scope: 'place-enrichment-worker',
      message: 'ready',
      defaults: {
        limit: DEFAULT_BACKGROUND_LIMIT,
        maxUnits: DEFAULT_BACKGROUND_MAX_UNITS,
      },
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  if (!verifyCronRequest(request, 'PLACE_ENRICHMENT_WORKER_CRON_SECRET')) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const body = await readJsonBody(request);
  const url = new URL(request.url);
  const limit = normalizeBackgroundLimit(
    body.limit ?? url.searchParams.get('limit'),
  );
  const maxUnits = normalizeBackgroundMaxUnits(
    body.maxUnits ?? url.searchParams.get('maxUnits'),
  );

  try {
    const context = createWorkerContext();
    const summary = await processBackgroundBatch(context, {
      limit,
      maxUnits,
    });

    return jsonResponse({
      ok: true,
      limit,
      maxUnits,
      summary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'unknown place enrichment worker error';

    console.error(
      JSON.stringify({
        scope: 'place-enrichment-worker',
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
