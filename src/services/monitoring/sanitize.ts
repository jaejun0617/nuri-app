import { sha256 } from '@noble/hashes/sha2.js';
import { Buffer } from 'buffer';

const events = new Set([
  'pet_delete_storage_cleanup_pending',
  'memory_images_read_fallback',
  'memory_images_legacy_read_used',
  'memory_upload_queue_recovered',
  'auth-bound schedule cleanup unsupported',
]);
const values: Readonly<Record<string, ReadonlySet<string>>> = {
  status: new Set(['unsupported', 'failed', 'success', 'pending']),
  mode: new Set(['create', 'update']),
  source: new Set(['fetch_one', 'fetch_list']),
  reason: new Set(['runtime_read_failure', 'schema_fallback', 'recent_create_gap', 'legacy_only_row']),
};
const numericKeys = new Set(['count', 'attempts', 'memoryIdsCount', 'statusCode']);
const buckets = new Set(['pet-profiles', 'memory-images', 'community-images']);
const errorNames = new Set(['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'URIError']);

function stableCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return /^(?:NURI_[A-Z0-9_]{1,80}|PGRST\d{3}|[0-9]{2}[0-9A-Z]{3}|SECURE_SESSION_STORAGE_FAILED|oauth_[a-z_]{1,60}|community_[a-z_]{1,60})$/.test(value)
    ? value : null;
}

export function sanitizeMonitoringMetadata(input?: Record<string, unknown>): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (numericKeys.has(key) && typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      result[key] = Math.min(Math.floor(value), 1_000_000);
    } else if (typeof value === 'string' && values[key]?.has(value)) {
      result[key] = value;
    } else if ((key === 'code' || key === 'app_code') && stableCode(value)) {
      result[key] = stableCode(value)!;
    } else if (key === 'failedBuckets' && Array.isArray(value)) {
      result[key] = value.filter((item): item is string => typeof item === 'string' && buckets.has(item)).slice(0, 3).join(',');
    }
  }
  return result;
}

export function sanitizeMonitoringMessage(message: string): string {
  if (events.has(message)) return message;
  if (message.startsWith('[DEV] sentry test message from DevTestScreen @ ')) return 'dev_monitoring_test';
  return stableCode(message) ?? 'unclassified_event';
}

export function sanitizeMonitoringException(value: unknown): Error {
  const row = typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
  const code = stableCode(row?.code) ?? stableCode(row?.app_code) ?? stableCode(row?.message) ?? stableCode(value);
  const safe = new Error(code ?? 'redacted_exception');
  safe.name = typeof row?.name === 'string' && errorNames.has(row.name) ? row.name : 'Error';
  // Keep bundle coordinates for diagnosis, never raw messages, URLs, paths or causes.
  const frames = typeof row?.stack === 'string' ? row.stack.split('\n').slice(1, 31).flatMap(line => {
    const coordinates = line.match(/:(\d{1,9}):(\d{1,9})\)?\s*$/);
    return coordinates ? [`    at app (index.android.bundle:${coordinates[1]}:${coordinates[2]})`] : [];
  }) : [];
  safe.stack = [`${safe.name}: ${safe.message}`, ...frames].join('\n');
  return safe;
}

export function monitoringUserId(id: string | null): string {
  if (!id) return '';
  return Buffer.from(sha256(Buffer.from(`nuri-monitoring:${id}`, 'utf8'))).toString('hex');
}
