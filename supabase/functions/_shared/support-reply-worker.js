/* global globalThis */
/** Only durable in-app delivery. No push, body copying, scheduler or caller identity overrides. */
export async function processSupportReplies(supabase, limit = 20) {
  const lease = globalThis.crypto.randomUUID();
  const claimed = await supabase.rpc('support_reply_claim_v1', {
    p_lease: lease,
    p_limit: limit,
  });
  if (
    claimed.error ||
    !Array.isArray(claimed.data) ||
    claimed.data.some(
      id =>
        typeof id !== 'string' ||
        !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(id),
    )
  ) {
    throw new Error('SUPPORT_REPLY_CLAIM_FAILED');
  }
  const results = [];
  for (const id of claimed.data) {
    const input = { p_event: id, p_lease: lease };
    try {
      const result = await supabase.rpc('support_reply_deliver_v1', input);
      if (result.error) throw new Error('SUPPORT_REPLY_DELIVERY_FAILED');
      results.push({ id, delivered: result.data === true });
    } catch {
      // A lost successful response may return false here; it never undoes delivery.
      const failure = await supabase.rpc('support_reply_fail_v1', input);
      results.push({
        id,
        delivered: false,
        uncertain: true,
        recoveryRecorded: !failure.error && failure.data === true,
      });
    }
  }
  return results;
}
