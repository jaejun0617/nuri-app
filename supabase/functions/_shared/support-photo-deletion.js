/* global globalThis */
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;

/** A durable Auth deletion receipt, not a caller-supplied path, authorizes removal. */
export async function removeDeletedSupportPhoto(supabase, id) {
  if (!uuid.test(id)) throw new Error('SUPPORT_INVALID_PHOTO_ID');
  const lease = globalThis.crypto.randomUUID();
  const { data: target, error } = await supabase.rpc(
    'support_claim_deleted_photo_v1',
    {
      p_id: id,
      p_lease: lease,
    },
  );
  if (error) throw new Error('SUPPORT_CLEANUP_CLAIM_FAILED');
  if (target === null) return { id, removed: false };
  if (
    target.bucket !== 'support-ticket-photos' ||
    target.path !== id + '.jpg'
  ) {
    throw new Error('SUPPORT_CLEANUP_TARGET_MISMATCH');
  }
  const { error: removeError } = await supabase.storage
    .from(target.bucket)
    .remove([target.path]);
  if (removeError) throw new Error('SUPPORT_CLEANUP_STORAGE_FAILED');
  const { data: finished, error: finishError } = await supabase.rpc(
    'support_finish_deleted_photo_v1',
    {
      p_id: id,
      p_lease: lease,
    },
  );
  if (finishError || finished !== true)
    throw new Error('SUPPORT_CLEANUP_UNCONFIRMED');
  return { id, removed: true };
}

export async function processDeletedSupportPhotos(supabase, limit = 20) {
  const { data: ids, error } = await supabase.rpc(
    'support_deleted_photo_batch_v1',
    { p_limit: limit },
  );
  if (
    error ||
    !Array.isArray(ids) ||
    ids.some(id => typeof id !== 'string' || !uuid.test(id))
  ) {
    throw new Error('SUPPORT_CLEANUP_LIST_FAILED');
  }
  const results = [];
  for (const id of ids) {
    try {
      results.push(await removeDeletedSupportPhoto(supabase, id));
    } catch {
      results.push({ id, removed: false, failed: true });
    }
  }
  return results;
}
