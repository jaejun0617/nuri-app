// Workers must never become public when a deployment secret is absent.
export function verifyWorkerCredential(request, configuredValue) {
  const expected = configuredValue?.trim() ?? '';
  if (!expected) return false;
  const explicit = request.headers.get('x-cron-secret');
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supplied = (explicit ?? bearer ?? '').trim();
  if (!supplied || supplied.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference += Math.abs(expected.charCodeAt(index) - supplied.charCodeAt(index));
  }
  return difference === 0;
}
