import { supabase } from '../../supabase/client';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../supabase/config';
import { validateSupabaseRuntimeConfig } from '../../supabase/runtimeConfig';
import {
  createWalkFinalDeletionRepository,
  type WalkFinalDeletionTransport,
} from './finalDeletionRepository';

const config = validateSupabaseRuntimeConfig(SUPABASE_URL, SUPABASE_ANON_KEY);
// Deliberately NOT supabase.rpc: that client may attach/refresh an expired or
// different owner's JWT. Only the project client key + narrow capability go
// over this path. No session storage, Authorization header, retry or logging.
async function bounded<T>(
  work: (signal: AbortSignal) => PromiseLike<T>,
  upstream?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  const timeout = setTimeout(cancel, 15000);
  upstream?.addEventListener('abort', cancel, { once: true });
  try {
    if (upstream?.aborted) throw new Error('WALK_DELETE_UNKNOWN_RETRYABLE');
    const aborted = new Promise<never>((_, reject) =>
      controller.signal.addEventListener(
        'abort',
        () => reject(new Error('WALK_DELETE_UNKNOWN_RETRYABLE')),
        { once: true },
      ),
    );
    const result = await Promise.race([
      Promise.resolve(work(controller.signal)),
      aborted,
    ]);
    if (upstream?.aborted) throw new Error('WALK_DELETE_UNKNOWN_RETRYABLE');
    return result;
  } finally {
    clearTimeout(timeout);
    upstream?.removeEventListener('abort', cancel);
  }
}
const capabilityOnly: WalkFinalDeletionTransport = async (
  name,
  parameters,
  upstream,
) => {
  if (
    !['recover_walk_final_deletion_v1', 'ack_walk_final_deletion_v1'].includes(
      name,
    )
  )
    return { data: null, error: { code: 'WALK_DELETE_TRANSPORT_DENIED' } };
  try {
    return await bounded(async signal => {
      const response = await fetch(
        `${config.url.replace(/\/$/, '')}/rest/v1/rpc/${name}`,
        {
          method: 'POST',
          credentials: 'omit',
          cache: 'no-store',
          signal,
          headers: {
            apikey: config.clientKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(parameters),
        },
      );
      const body: unknown = await response.json();
      return response.ok
        ? { data: body, error: null }
        : { data: null, error: body };
    }, upstream);
  } catch {
    return { data: null, error: { code: 'WALK_DELETE_UNKNOWN_RETRYABLE' } };
  }
};
export const walkFinalDeletionRepository = createWalkFinalDeletionRepository(
  async (name, parameters, signal) => {
    try {
      return await bounded(
        abort => supabase.rpc(name, parameters).abortSignal(abort),
        signal,
      );
    } catch {
      return { data: null, error: { code: 'WALK_DELETE_UNKNOWN_RETRYABLE' } };
    }
  },
  capabilityOnly,
);
