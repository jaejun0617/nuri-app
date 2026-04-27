/* global Deno */
import {
  createWorkerContext,
  jsonResponse,
  normalizeTargets,
  processDemandTargets,
  readJsonBody,
} from '../_shared/place-enrichment.js';

Deno.serve(async request => {
  if (request.method === 'GET') {
    return jsonResponse({
      ok: true,
      scope: 'place-enrichment-demand',
      message: 'ready',
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  try {
    const body = await readJsonBody(request);
    const targets = normalizeTargets(body.targets);
    const context = createWorkerContext();
    const summary = await processDemandTargets(context, targets);

    return jsonResponse({
      ok: true,
      ...summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown place enrichment error';

    console.error(
      JSON.stringify({
        scope: 'place-enrichment-demand',
        event: 'request_failed',
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
