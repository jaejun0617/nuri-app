/* global Deno */
import { createClient } from 'npm:@supabase/supabase-js@2.97.0';

export const DEFAULT_FINALIZER_LIMIT = 10;
export const DEFAULT_CLEANUP_LIMIT = 50;
export const DEFAULT_CLEANUP_BATCH_PER_BUCKET = 20;
const MAX_FINALIZER_LIMIT = 25;
const MAX_CLEANUP_LIMIT = 100;
const MAX_CLEANUP_BATCH_PER_BUCKET = 50;

export function createWorkerContext() {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return { supabase };
}

export function verifyCronRequest(request) {
  const configuredSecret =
    Deno.env.get('ACCOUNT_DELETION_WORKER_CRON_SECRET')?.trim() ?? '';
  if (!configuredSecret) return true;

  const headerSecret =
    request.headers.get('x-cron-secret')?.trim() ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ??
    '';

  return headerSecret === configuredSecret;
}

export async function readJsonBody(request) {
  if (request.method === 'GET') return {};

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return {};

  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function normalizeFinalizerLimit(value) {
  return normalizePositiveInteger(value, DEFAULT_FINALIZER_LIMIT, MAX_FINALIZER_LIMIT);
}

export function normalizeCleanupLimit(value) {
  return normalizePositiveInteger(value, DEFAULT_CLEANUP_LIMIT, MAX_CLEANUP_LIMIT);
}

export function normalizeCleanupBatchPerBucket(value) {
  return normalizePositiveInteger(
    value,
    DEFAULT_CLEANUP_BATCH_PER_BUCKET,
    MAX_CLEANUP_BATCH_PER_BUCKET,
  );
}

export async function processAccountDeletionBatch(input) {
  const startedAt = Date.now();
  const workerId = buildWorkerId();

  const finalizer = await runFinalizerPhase({
    supabase: input.supabase,
    limit: input.finalizerLimit,
    workerId,
  });

  const cleanup = await runCleanupPhase({
    supabase: input.supabase,
    limit: input.cleanupLimit,
    cleanupBatchPerBucket: input.cleanupBatchPerBucket,
  });

  const summary = {
    workerId,
    finalizer,
    cleanup,
    durationMs: Date.now() - startedAt,
  };

  console.log(
    JSON.stringify({
      scope: 'account-deletion-worker',
      event: 'batch_complete',
      summary,
    }),
  );

  return summary;
}

async function runFinalizerPhase(input) {
  const claimedRows = await claimDueRequests(input.supabase, input.limit, input.workerId);
  const summary = {
    requestedLimit: input.limit,
    claimed: claimedRows.length,
    succeeded: 0,
    failed: 0,
    results: [],
  };

  for (const row of claimedRows) {
    try {
      const { data } = await callRpc(
        input.supabase,
        'execute_account_deletion_request',
        { p_request_id: row.request_id },
      );

      const result = {
        requestId: row.request_id,
        userId: row.user_id,
        status: `${data?.status ?? ''}`.trim() || 'unknown',
      };
      summary.results.push(result);
      summary.succeeded += 1;

      console.log(
        JSON.stringify({
          scope: 'account-deletion-worker',
          phase: 'finalizer',
          event: 'request_completed',
          ...result,
        }),
      );
    } catch (error) {
      const normalized = normalizeWorkerError(error);
      summary.results.push({
        requestId: row.request_id,
        userId: row.user_id,
        status: 'failed',
        errorCode: normalized.code,
        errorMessage: normalized.message,
      });
      summary.failed += 1;

      console.error(
        JSON.stringify({
          scope: 'account-deletion-worker',
          phase: 'finalizer',
          event: 'request_failed',
          requestId: row.request_id,
          userId: row.user_id,
          errorCode: normalized.code,
          errorMessage: normalized.message,
        }),
      );
    }
  }

  return summary;
}

async function runCleanupPhase(input) {
  const items = await claimCleanupItems(input.supabase, input.limit);
  const summary = {
    requestedLimit: input.limit,
    claimed: items.length,
    succeeded: 0,
    failed: 0,
    buckets: {},
    results: [],
  };

  for (const [bucketName, bucketItems] of groupItemsByBucket(items)) {
    const bucketSummary = {
      claimed: bucketItems.length,
      succeeded: 0,
      failed: 0,
    };
    summary.buckets[bucketName] = bucketSummary;

    for (const chunk of chunkItems(bucketItems, input.cleanupBatchPerBucket)) {
      const chunkOutcomes = await removeCleanupChunk(input.supabase, bucketName, chunk);

      for (const outcome of chunkOutcomes) {
        await completeCleanupItem(input.supabase, outcome);

        summary.results.push({
          cleanupItemId: outcome.cleanupItemId,
          requestId: outcome.requestId,
          bucketName,
          storagePath: outcome.storagePath,
          status: outcome.success ? 'completed' : 'failed',
          errorCode: outcome.errorCode,
          errorMessage: outcome.errorMessage,
        });

        if (outcome.success) {
          summary.succeeded += 1;
          bucketSummary.succeeded += 1;
        } else {
          summary.failed += 1;
          bucketSummary.failed += 1;
        }
      }
    }
  }

  return summary;
}

async function claimDueRequests(supabase, limit, workerId) {
  const { data } = await callRpc(
    supabase,
    'claim_due_account_deletion_requests',
    {
      p_limit: limit,
      p_worker_id: workerId,
    },
  );

  return Array.isArray(data) ? data : [];
}

async function claimCleanupItems(supabase, limit) {
  const { data } = await callRpc(
    supabase,
    'claim_account_deletion_cleanup_items',
    { p_limit: limit },
  );

  return Array.isArray(data) ? data : [];
}

async function removeCleanupChunk(supabase, bucketName, items) {
  const paths = items.map(item => `${item.storage_path ?? ''}`.trim()).filter(Boolean);
  if (paths.length === 0) {
    return items.map(item => ({
      cleanupItemId: item.cleanup_item_id,
      requestId: item.request_id,
      storagePath: item.storage_path,
      success: true,
      errorCode: null,
      errorMessage: null,
    }));
  }

  const { error } = await supabase.storage.from(bucketName).remove(paths);
  if (!error) {
    return items.map(item => ({
      cleanupItemId: item.cleanup_item_id,
      requestId: item.request_id,
      storagePath: item.storage_path,
      success: true,
      errorCode: null,
      errorMessage: null,
    }));
  }

  if (isMissingObjectError(error)) {
    console.log(
      JSON.stringify({
        scope: 'account-deletion-worker',
        phase: 'cleanup',
        event: 'missing_objects_treated_as_success',
        bucketName,
        paths,
      }),
    );

    return items.map(item => ({
      cleanupItemId: item.cleanup_item_id,
      requestId: item.request_id,
      storagePath: item.storage_path,
      success: true,
      errorCode: null,
      errorMessage: null,
    }));
  }

  const outcomes = [];
  for (const item of items) {
    const storagePath = `${item.storage_path ?? ''}`.trim();

    try {
      const { error: singleError } = await supabase
        .storage
        .from(bucketName)
        .remove([storagePath]);

      if (!singleError || isMissingObjectError(singleError)) {
        outcomes.push({
          cleanupItemId: item.cleanup_item_id,
          requestId: item.request_id,
          storagePath,
          success: true,
          errorCode: null,
          errorMessage: null,
        });
        continue;
      }

      const normalized = normalizeStorageError(singleError);
      outcomes.push({
        cleanupItemId: item.cleanup_item_id,
        requestId: item.request_id,
        storagePath,
        success: false,
        errorCode: normalized.code,
        errorMessage: normalized.message,
      });
    } catch (error) {
      const normalized = normalizeStorageError(error);
      outcomes.push({
        cleanupItemId: item.cleanup_item_id,
        requestId: item.request_id,
        storagePath,
        success: false,
        errorCode: normalized.code,
        errorMessage: normalized.message,
      });
    }
  }

  return outcomes;
}

async function completeCleanupItem(supabase, outcome) {
  try {
    await callRpc(
      supabase,
      'complete_account_deletion_cleanup_item',
      {
        p_cleanup_item_id: outcome.cleanupItemId,
        p_success: outcome.success,
        p_error_code: outcome.success ? null : outcome.errorCode,
        p_error_message: outcome.success ? null : outcome.errorMessage,
      },
    );
  } catch (error) {
    const normalized = normalizeWorkerError(error);
    console.error(
      JSON.stringify({
        scope: 'account-deletion-worker',
        phase: 'cleanup',
        event: 'cleanup_result_persist_failed',
        cleanupItemId: outcome.cleanupItemId,
        requestId: outcome.requestId,
        errorCode: normalized.code,
        errorMessage: normalized.message,
      }),
    );
    throw error;
  }
}

async function callRpc(supabase, fn, params) {
  const { data, error } = await supabase.rpc(fn, params);
  if (error) {
    const wrapped = new Error(error.message);
    wrapped.code = error.code ?? 'rpc_failed';
    wrapped.details = error;
    throw wrapped;
  }

  return { data };
}

function groupItemsByBucket(items) {
  const map = new Map();
  for (const item of items) {
    const bucketName = `${item.bucket_name ?? ''}`.trim();
    if (!bucketName) continue;

    const bucketItems = map.get(bucketName) ?? [];
    bucketItems.push(item);
    map.set(bucketName, bucketItems);
  }
  return map.entries();
}

function* chunkItems(items, size) {
  for (let index = 0; index < items.length; index += size) {
    yield items.slice(index, index + size);
  }
}

function normalizePositiveInteger(value, fallback, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(max, Math.trunc(parsed)));
}

function buildWorkerId() {
  return `account-deletion-worker:${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function isMissingObjectError(error) {
  const normalized = normalizeStorageError(error);
  return normalized.code === 'storage_object_not_found';
}

function normalizeStorageError(error) {
  const message = extractErrorMessage(error);
  const code = `${error?.statusCode ?? error?.status ?? error?.code ?? ''}`.trim();
  const lowered = message.toLowerCase();

  if (
    code === '404' ||
    lowered.includes('not found') ||
    lowered.includes('object not found') ||
    lowered.includes('no such object')
  ) {
    return {
      code: 'storage_object_not_found',
      message,
    };
  }

  if (code === '401' || code === '403') {
    return {
      code: 'storage_permission_denied',
      message,
    };
  }

  return {
    code: 'storage_delete_failed',
    message,
  };
}

function normalizeWorkerError(error) {
  return {
    code: `${error?.code ?? 'worker_error'}`.trim() || 'worker_error',
    message: extractErrorMessage(error),
  };
}

function extractErrorMessage(error) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === 'string' && error.trim()) return error.trim();
  if (error && typeof error === 'object') {
    const message = `${error.message ?? error.msg ?? error.error_description ?? ''}`.trim();
    if (message) return message;
  }
  return 'unknown worker error';
}

function requireEnv(name) {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
