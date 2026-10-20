import { supabase } from '../../supabase/client';
import { createWalkServerRepository, WalkServerError } from './repository';
import { normalizeWalkUuid } from '../domain';

// Uses the existing authenticated Supabase client; no service key or local queue.
// Native B2 owns durable intent/checkpoint/outbox and user-start-only collection.
export const walkServerRepository = createWalkServerRepository(
  (name, parameters) => supabase.rpc(name, parameters),
);

// RLS protects this bounded discovery on a second device that has no local ID.
// Discovery never starts/resumes collection. Reconcile after the read because
// finish/cancel may have changed the receipt in the meantime.
export async function fetchActiveWalkReceipt() {
  const { data, error } = await supabase.from('walk_sessions')
    .select('client_session_id').eq('state', 'ACTIVE').limit(1).maybeSingle();
  if (error) throw new WalkServerError('WALK_SYNC_UNKNOWN_RETRYABLE', true);
  const candidate: unknown = data;
  if (candidate === null) return null;
  if (!candidate || typeof candidate !== 'object'
    || !('client_session_id' in candidate)) throw new WalkServerError('WALK_INVALID_SERVER_RESPONSE', true);
  const id = normalizeWalkUuid(candidate.client_session_id);
  const [receipt] = await walkServerRepository.reconcile([id]);
  return receipt.state === 'NOT_FOUND' ? null : receipt;
}
