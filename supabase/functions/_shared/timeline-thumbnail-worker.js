/* global Deno */
import { createClient } from 'npm:@supabase/supabase-js@2.97.0';
import postgres from 'npm:postgres@3.4.4';

const BUCKET = 'memory-images';
const THUMBNAIL_WIDTH = 144;
const THUMBNAIL_HEIGHT = 144;
const THUMBNAIL_QUALITY = 72;
const DEFAULT_BATCH_SIZE = 20;
const MAX_BATCH_SIZE = 100;
const STUCK_JOB_MINUTES = 15;
const MAX_RETRY_COUNT = 8;

export function createWorkerContext() {
  const supabaseUrl = requireEnv('THUMBNAIL_WORKER_SUPABASE_URL');
  const serviceRoleKey = requireEnv('THUMBNAIL_WORKER_SERVICE_ROLE_KEY');
  const databaseUrl = requireEnv('THUMBNAIL_WORKER_DB_URL');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    prepare: false,
  });

  return { sql, supabase };
}

export function normalizeBatchSize(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_BATCH_SIZE;
  return Math.max(1, Math.min(MAX_BATCH_SIZE, Math.trunc(parsed)));
}

export function verifyCronRequest(request) {
  const configuredSecret = Deno.env.get('THUMBNAIL_WORKER_CRON_SECRET')?.trim() ?? '';
  if (!configuredSecret) return true;

  const headerSecret =
    request.headers.get('x-cron-secret')?.trim() ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ??
    '';

  return headerSecret === configuredSecret;
}

export async function lockCandidateRows(sql, limit) {
  return sql.begin(async tx => {
    const rows = await tx.unsafe(
      `
        with candidate as (
          select mi.id
          from public.memory_images mi
          where
            (
              mi.status = 'pending'
              or (
                mi.status = 'failed'
                and coalesce(mi.retry_count, 0) < $1
                and (
                  mi.last_processed_at is null
                  or mi.last_processed_at <= now() - (
                    case
                      when coalesce(mi.retry_count, 0) = 0 then interval '0 minute'
                      when mi.retry_count = 1 then interval '5 minute'
                      when mi.retry_count = 2 then interval '30 minute'
                      when mi.retry_count = 3 then interval '2 hour'
                      when mi.retry_count = 4 then interval '6 hour'
                      else interval '24 hour'
                    end
                  )
                )
              )
            )
            and (
              mi.processing_started_at is null
              or mi.processing_started_at <= now() - ($2::text || ' minutes')::interval
            )
          order by mi.created_at asc
          for update skip locked
          limit $3
        )
        update public.memory_images mi
        set
          processing_started_at = now(),
          last_processed_at = now(),
          updated_at = now()
        from candidate c
        where mi.id = c.id
        returning
          mi.id,
          mi.memory_id,
          mi.user_id,
          mi.pet_id,
          mi.sort_order,
          mi.original_path,
          mi.timeline_thumb_path,
          mi.status,
          coalesce(mi.retry_count, 0) as retry_count,
          mi.last_error_code,
          mi.last_error_message,
          mi.last_processed_at,
          mi.processing_started_at,
          mi.created_at,
          mi.updated_at
      `,
      [MAX_RETRY_COUNT, String(STUCK_JOB_MINUTES), limit],
    );

    return rows;
  });
}

export async function lockSpecificRows(sql, ids) {
  const normalizedIds = Array.from(
    new Set((ids ?? []).map(value => `${value ?? ''}`.trim()).filter(Boolean)),
  );
  if (normalizedIds.length === 0) return [];

  return sql.begin(async tx => {
    const rows = await tx.unsafe(
      `
        with candidate as (
          select mi.id
          from public.memory_images mi
          where mi.id = any($1::uuid[])
          order by mi.created_at asc
          for update skip locked
        )
        update public.memory_images mi
        set
          processing_started_at = now(),
          last_processed_at = now(),
          updated_at = now()
        from candidate c
        where mi.id = c.id
        returning
          mi.id,
          mi.memory_id,
          mi.user_id,
          mi.pet_id,
          mi.sort_order,
          mi.original_path,
          mi.timeline_thumb_path,
          mi.status,
          coalesce(mi.retry_count, 0) as retry_count,
          mi.last_error_code,
          mi.last_error_message,
          mi.last_processed_at,
          mi.processing_started_at,
          mi.created_at,
          mi.updated_at
      `,
      [normalizedIds],
    );

    return rows;
  });
}

export async function processThumbnailBatch(input) {
  const { sql, supabase } = input;
  const startedAt = Date.now();
  const targetedIds = Array.from(
    new Set((input.memoryImageIds ?? []).map(value => `${value ?? ''}`.trim()).filter(Boolean)),
  );
  const rows =
    targetedIds.length > 0
      ? await lockSpecificRows(sql, targetedIds)
      : await lockCandidateRows(sql, input.limit);
  const lockedIds = rows.map(row => row.id);
  const summary = {
    requested: input.limit,
    targeted: targetedIds.length,
    locked: rows.length,
    lockedIds,
    notLockedIds:
      targetedIds.length > 0
        ? targetedIds.filter(id => !lockedIds.includes(id))
        : [],
    success: 0,
    failed: 0,
    recovered: 0,
    skipped: 0,
    durationMs: 0,
    results: [],
  };

  for (const row of rows) {
    const result = await processSingleRow({
      sql,
      supabase,
      row,
      forceRegenerate: input.forceRegenerate,
    });
    summary.results.push(result);

    if (result.status === 'ready') summary.success += 1;
    else if (result.status === 'recovered') summary.recovered += 1;
    else if (result.status === 'skipped') summary.skipped += 1;
    else summary.failed += 1;
  }

  summary.durationMs = Date.now() - startedAt;
  console.log(
    JSON.stringify({
      scope: 'timeline-thumbnail-worker',
      event: 'batch_complete',
      ...summary,
    }),
  );

  return summary;
}

async function processSingleRow(input) {
  const { sql, supabase, row, forceRegenerate } = input;
  const thumbnailPath = buildTimelineThumbnailPath(row);

  try {
    if (!forceRegenerate && row.status === 'ready' && `${row.timeline_thumb_path ?? ''}`.trim()) {
      console.log(
        JSON.stringify({
          scope: 'timeline-thumbnail-worker',
          event: 'row_skipped',
          id: row.id,
          reason: 'already_ready',
          thumbnailPath: row.timeline_thumb_path,
        }),
      );

      return {
        id: row.id,
        status: 'skipped',
        reason: 'already_ready',
        thumbnailPath: row.timeline_thumb_path,
      };
    }

    const transformedBlob = await downloadTransformedThumbnail(supabase, row.original_path);
    await uploadTimelineThumbnail(supabase, thumbnailPath, transformedBlob);
    await markRowReady(sql, row.id, thumbnailPath);

    console.log(
      JSON.stringify({
        scope: 'timeline-thumbnail-worker',
        event: 'row_ready',
        id: row.id,
        thumbnailPath,
      }),
    );

    return {
      id: row.id,
      status: 'ready',
      thumbnailPath,
    };
  } catch (error) {
    const normalized = normalizeWorkerError(error);
    await markRowFailed(sql, row.id, normalized);

    console.error(
      JSON.stringify({
        scope: 'timeline-thumbnail-worker',
        event: 'row_failed',
        id: row.id,
        code: normalized.code,
        message: normalized.message,
      }),
    );

    return {
      id: row.id,
      status: 'failed',
      code: normalized.code,
      message: normalized.message,
    };
  }
}

async function downloadTransformedThumbnail(supabase, originalPath) {
  const normalizedPath = `${originalPath ?? ''}`.trim();
  if (!normalizedPath) {
    throw new PermanentWorkerError('original_not_found', 'original_path is empty');
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(normalizedPath, {
      transform: {
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
        resize: 'cover',
        quality: THUMBNAIL_QUALITY,
      },
    });

  if (error) {
    const code = `${error.statusCode ?? ''}` === '404'
      ? 'original_not_found'
      : 'storage_download_failed';
    if (code === 'original_not_found') {
      throw new PermanentWorkerError(code, error.message);
    }
    throw new TransientWorkerError(code, error.message);
  }

  if (!data) {
    throw new TransientWorkerError('storage_download_failed', 'download returned empty data');
  }

  return data;
}

async function uploadTimelineThumbnail(supabase, thumbnailPath, blob) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(thumbnailPath, blob, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: true,
    });

  if (error) {
    throw new TransientWorkerError('storage_upload_failed', error.message);
  }
}

async function markRowReady(sql, id, thumbnailPath) {
  await sql.unsafe(
    `
      update public.memory_images
      set
        timeline_thumb_path = $1,
        status = 'ready',
        retry_count = 0,
        last_error_code = null,
        last_error_message = null,
        last_processed_at = now(),
        processing_started_at = null,
        updated_at = now()
      where id = $2
    `,
    [thumbnailPath, id],
  );
}

async function markRowFailed(sql, id, error) {
  await sql.unsafe(
    `
      update public.memory_images
      set
        status = 'failed',
        retry_count = coalesce(retry_count, 0) + 1,
        last_error_code = $1,
        last_error_message = $2,
        last_processed_at = now(),
        processing_started_at = null,
        updated_at = now()
      where id = $3
    `,
    [error.code, truncateErrorMessage(error.message), id],
  );
}

function truncateErrorMessage(message) {
  return `${message ?? ''}`.trim().slice(0, 500) || 'unknown thumbnail worker error';
}

function normalizeWorkerError(error) {
  if (error instanceof PermanentWorkerError) {
    return { code: error.code, message: error.message, permanent: true };
  }
  if (error instanceof TransientWorkerError) {
    return { code: error.code, message: error.message, permanent: false };
  }
  if (error instanceof Error) {
    return { code: 'unknown', message: error.message, permanent: false };
  }
  return { code: 'unknown', message: 'unknown thumbnail worker error', permanent: false };
}

function buildTimelineThumbnailPath(row) {
  return `timeline-thumb/${row.user_id}/${row.pet_id}/${row.memory_id}/${row.id}.jpg`;
}

function requireEnv(name) {
  const value = Deno.env.get(name)?.trim() ?? '';
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

class PermanentWorkerError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

class TransientWorkerError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export async function closeWorkerContext(context) {
  await context.sql.end({ timeout: 1 });
}
