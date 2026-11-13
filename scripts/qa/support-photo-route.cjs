'use strict';

// Loopback QA adapter. Only Storage/validation uses the server key;
// all ownership decisions use the caller's actual Auth session.
const { createHash } = require('node:crypto');
const { spawn } = require('node:child_process');

const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const bucket = '/storage/v1/object/support-ticket-photos/';
const maxBytes = 5 * 1024 * 1024;
const limit = Math.ceil(maxBytes / 3) * 4;
const sha = data => createHash('sha256').update(data).digest('hex');
const error = (status, message) => ({ status, body: { message } });
const invalid = () => error(400, 'SUPPORT_PHOTO_INVALID');

function decode(source) {
  const format = source.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    ? 'jpeg_pipe'
    : source
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? 'png_pipe'
    : source.toString('ascii', 0, 4) === 'RIFF' &&
      source.toString('ascii', 8, 12) === 'WEBP'
    ? 'webp_pipe'
    : null;
  if (!format) return Promise.resolve(null);
  return new Promise(resolve => {
    const child = spawn(
      'ffmpeg',
      [
        '-v',
        'error',
        '-xerror',
        '-threads',
        '1',
        '-filter_threads',
        '1',
        '-max_pixels',
        '24000000',
        '-f',
        format,
        '-i',
        'pipe:0',
        '-map',
        '0:v:0',
        '-map_metadata',
        '-1',
        '-frames:v',
        '1',
        '-vf',
        "scale='min(2048,iw)':'min(2048,ih)':force_original_aspect_ratio=decrease",
        '-c:v',
        'mjpeg',
        '-threads',
        '1',
        '-q:v',
        '3',
        '-f',
        'image2pipe',
        'pipe:1',
      ],
      { stdio: ['pipe', 'pipe', 'ignore'] },
    );
    const chunks = [];
    let size = 0;
    const timer = setTimeout(() => child.kill('SIGKILL'), 7000);
    child.stdout.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) child.kill('SIGKILL');
      else chunks.push(chunk);
    });
    child.stdin.on('error', () => {});
    child.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
    child.on('close', code => {
      clearTimeout(timer);
      resolve(
        code === 0 && size > 0 && size <= maxBytes
          ? Buffer.concat(chunks)
          : null,
      );
    });
    child.stdin.end(source);
  });
}

function dimensions(jpeg) {
  for (let offset = 2; offset + 9 < jpeg.length; ) {
    if (jpeg[offset] !== 255) break;
    const marker = jpeg[offset + 1];
    if (marker === 192 || marker === 193 || marker === 194) {
      return {
        height: jpeg.readUInt16BE(offset + 5),
        width: jpeg.readUInt16BE(offset + 7),
      };
    }
    const length = jpeg.readUInt16BE(offset + 2);
    if (length < 2) break;
    offset += 2 + length;
  }
  return null;
}

function createSupportPhotoRoute({ API_URL, ANON_KEY, SERVICE_ROLE_KEY }) {
  if (API_URL !== 'http://127.0.0.1:56321' || !ANON_KEY || !SERVICE_ROLE_KEY)
    throw new Error('Expected the NURI-15 loopback environment');
  const admin = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  };
  const rpc = (name, input, headers) =>
    fetch(`${API_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(5000),
    });
  async function pass(response) {
    const body = await response.json();
    return { status: response.status, body };
  }
  let encoding = 0;
  return async (path, input, bearer) => {
    if (!input || typeof input !== 'object' || !uuid.test(input.id))
      return invalid();
    const id = input.id.toLowerCase();
    const user = { apikey: ANON_KEY, Authorization: `Bearer ${bearer}` };
    const object = API_URL + bucket + id + '.jpg';
    if (path === '/support/photos/read') {
      const access = await rpc(
        'support_ticket_photo_access_v1',
        { p_id: id },
        user,
      );
      if (!access.ok) return pass(access);
      const metadata = await access.json();
      const result = await fetch(object, {
        headers: admin,
        signal: AbortSignal.timeout(5000),
      });
      if (!result.ok) return error(503, 'SUPPORT_PHOTO_UNAVAILABLE');
      const bytes = Buffer.from(await result.arrayBuffer());
      if (bytes.length !== metadata.byteSize || sha(bytes) !== metadata.sha256)
        return error(503, 'SUPPORT_PHOTO_UNAVAILABLE');
      return { status: 200, body: { base64: bytes.toString('base64') } };
    }
    if (path !== '/support/photos/upload')
      return error(404, 'SUPPORT_NOT_FOUND');
    if (
      !uuid.test(input.draft) ||
      (input.ticket != null && !uuid.test(input.ticket)) ||
      typeof input.base64 !== 'string' ||
      !input.base64.length ||
      input.base64.length > limit ||
      input.base64.length % 4 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(input.base64)
    )
      return invalid();
    const authenticated = await fetch(API_URL + '/auth/v1/user', {
      headers: user,
      signal: AbortSignal.timeout(5000),
    });
    if (!authenticated.ok) return error(401, 'SUPPORT_AUTH_REQUIRED');
    const source = Buffer.from(input.base64, 'base64');
    if (!source.length || source.length > maxBytes) return invalid();
    if (encoding >= 2) return error(429, 'SUPPORT_PHOTO_BUSY');
    encoding++;
    let jpeg;
    try {
      jpeg = await decode(source);
    } finally {
      encoding--;
    }
    const size = jpeg && dimensions(jpeg);
    if (!size?.width || !size.height) return invalid();
    const digest = sha(jpeg);
    const prepare = await rpc(
      'support_ticket_photo_prepare_v1',
      {
        p_id: id,
        p_draft: input.draft,
        p_ticket: input.ticket ?? null,
        p_sha: digest,
        p_bytes: jpeg.length,
        p_width: size.width,
        p_height: size.height,
      },
      user,
    );
    if (!prepare.ok) return pass(prepare);
    if ((await prepare.json()) !== true) {
      const stored = await fetch(object, {
        method: 'POST',
        headers: {
          ...admin,
          'Content-Type': 'image/jpeg',
          'x-upsert': 'false',
        },
        body: jpeg,
        signal: AbortSignal.timeout(5000),
      });
      if (!stored.ok) {
        // Recover when an earlier upload succeeded but the response or ready commit was lost.
        const prior = await fetch(object, {
          headers: admin,
          signal: AbortSignal.timeout(5000),
        });
        if (!prior.ok || sha(Buffer.from(await prior.arrayBuffer())) !== digest)
          return error(503, 'SUPPORT_PHOTO_UNAVAILABLE');
      }
      const ready = await rpc(
        'support_ticket_photo_ready_v1',
        { p_id: id, p_sha: digest },
        admin,
      );
      if (!ready.ok || (await ready.json()) !== true)
        return error(503, 'SUPPORT_PHOTO_UNAVAILABLE');
    }
    return { status: 200, body: { id } };
  };
}

module.exports = { createSupportPhotoRoute };
