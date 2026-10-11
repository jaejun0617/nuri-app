const EVENTS = [
  'OAUTH_INTENT_STARTED', 'PENDING_FLOW_READY', 'CALLBACK_RECEIVED',
  'PENDING_FLOW_VALIDATED', 'CODE_EXCHANGE_STARTED', 'CODE_EXCHANGE_SUCCESS',
  'AUTH_EVENT_SIGNED_IN', 'SESSION_AVAILABLE', 'EXPLICIT_LOGOUT_STATE_CLEARED',
  'AUTH_BOOTSTRAP_RESOLVED', 'ROUTE_TARGET_AUTHENTICATED', 'ROUTE_TARGET_ANONYMOUS',
  'CALLBACK_REJECTED', 'CALLBACK_RECOVERY_COMPLETE', 'TOKEN_REFRESHED',
  'SECURE_WRITE_CONFIRMED', 'SECURE_READBACK_CONFIRMED', 'LEGACY_REMOVE_CONFIRMED',
] as const;
type AuthTraceEvent = typeof EVENTS[number];
type Receipt = { sequence: number; elapsedMs: number; event: AuthTraceEvent };
const started = performance.now();
let sequence = 0;
const receipts: Receipt[] = [];

// No arbitrary payload, identity, URL or error object can enter this channel.
export function recordAuthEvent(event: AuthTraceEvent): void {
  if (!EVENTS.includes(event)) return;
  const receipt = { sequence: ++sequence, elapsedMs: Math.round(performance.now() - started), event };
  receipts.push(receipt);
  if (receipts.length > 128) receipts.shift();
  console.info('NURI_AUTH_EVENT', JSON.stringify(receipt));
}

export function getAuthTrace(): ReadonlyArray<Receipt> {
  return receipts.map(receipt => ({ ...receipt }));
}
