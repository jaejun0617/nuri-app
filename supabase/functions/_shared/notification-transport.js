export function jsonReply(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}
export async function boundedJson(request, max = 8192) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_BODY');
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new Error('BODY_TOO_LARGE');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const result = JSON.parse(new TextDecoder().decode(bytes));
  if (!result || typeof result !== 'object' || Array.isArray(result))
    throw new Error('INVALID_BODY');
  return result;
}
function fromBase64(value) {
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}
function base64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}
async function encryptionKey(secret) {
  const bytes = fromBase64(secret);
  if (bytes.length !== 32) throw new Error('PUSH_KEY_INVALID');
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
}
export async function encryptPushToken(token, owner, device, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: new TextEncoder().encode(owner + ':' + device),
    },
    await encryptionKey(secret),
    new TextEncoder().encode(token),
  );
  return JSON.stringify({
    v: 1,
    iv: base64(iv),
    data: base64(new Uint8Array(data)),
  });
}
export async function decryptPushToken(cipher, owner, device, secret) {
  const value = JSON.parse(cipher);
  if (
    value.v !== 1 ||
    typeof value.iv !== 'string' ||
    typeof value.data !== 'string'
  )
    throw new Error('PUSH_CIPHER_INVALID');
  const result = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: fromBase64(value.iv),
      additionalData: new TextEncoder().encode(owner + ':' + device),
    },
    await encryptionKey(secret),
    fromBase64(value.data),
  );
  return new TextDecoder().decode(result);
}
export async function fingerprint(token) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)),
    ),
    v => v.toString(16).padStart(2, '0'),
  ).join('');
}
export function classifyPushResponse(status, value) {
  if (status >= 200 && status < 300 && typeof value?.name === 'string')
    return { result: 'accepted', messageId: value.name };
  const details = Array.isArray(value?.error?.details)
    ? value.error.details
    : [];
  if (
    details.some(
      d =>
        d?.errorCode === 'UNREGISTERED' ||
        d?.errorCode === 'SENDER_ID_MISMATCH',
    )
  )
    return { result: 'permanent_failure', invalidToken: true };
  if (status === 401 || status === 403)
    return { result: 'provider_unavailable' };
  if (status === 429 || status >= 500) return { result: 'transient' };
  return { result: 'permanent_failure', invalidToken: false };
}
export function collapseGroup(category, availableAt, id) {
  if (!['community', 'activity', 'record'].includes(category)) return id;
  const timestamp = Date.parse(availableAt);
  return Number.isFinite(timestamp)
    ? category + ':' + Math.floor(timestamp / 120000)
    : id;
}
