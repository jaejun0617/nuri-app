/* eslint-env es2020, node */
'use strict';

const { execFileSync } = require('node:child_process');
const { randomBytes, timingSafeEqual } = require('node:crypto');
const { homedir } = require('node:os');
const { join } = require('node:path');
const http = require('node:http');
const { once } = require('node:events');

const PORT = 56324;
const APP = 'com.nuri.app';
const TOKEN_FILE = 'files/.nuri-device-layout-qa';
const WIDTHS = new Set(['default', '320', '360', '384', '412']);

function densityFor(widthPx, preset) {
  if (preset === 'default') return 'reset';
  if (!Number.isSafeInteger(widthPx) || widthPx < 320 || !WIDTHS.has(preset)) {
    throw new Error('Unsupported display dimensions or preset');
  }
  return String(Math.round((widthPx * 160) / Number(preset)));
}

function parseDisplay(output, label, toValue) {
  const lines = output.trim().split(/\r?\n/);
  const physical = lines.find(line => line.startsWith(`Physical ${label}: `));
  const override = lines.find(line => line.startsWith(`Override ${label}: `));
  const read = line => toValue(line ? line.split(': ')[1] : '');
  return {
    physical: read(physical),
    active: read(override || physical),
    overridden: Boolean(override),
  };
}

async function main() {
  const serial = process.argv[2];
  if (
    !serial ||
    !/^[A-Za-z0-9_-]+$/.test(serial) ||
    process.argv.length !== 3
  ) {
    throw new Error('Usage: node scripts/qa/device-layout-usb.cjs USB_SERIAL');
  }
  const adbPath = process.env.ANDROID_HOME
    ? join(process.env.ANDROID_HOME, 'platform-tools', 'adb')
    : join(homedir(), 'Library', 'Android', 'sdk', 'platform-tools', 'adb');
  const run = (...args) =>
    execFileSync(adbPath, args, {
      encoding: 'utf8',
      timeout: 4000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  const adb = (...args) => run('-s', serial, ...args);
  const requireUsb = () => {
    const attached = run('devices', '-l')
      .split('\n')
      .slice(1)
      .some(line => {
        const [id, state, ...info] = line.trim().split(/\s+/);
        return (
          id === serial &&
          state === 'device' &&
          info.some(value => value.startsWith('usb:'))
        );
      });
    if (!attached) throw new Error('Authorized USB device not connected');
  };
  const density = () =>
    parseDisplay(adb('shell', 'wm', 'density'), 'density', Number);
  const width = () =>
    parseDisplay(adb('shell', 'wm', 'size'), 'size', value => {
      if (!/^\d+x\d+$/.test(value)) return 0;
      return Number(value.split('x')[0]);
    }).active;
  const token = randomBytes(32).toString('hex');
  let lastRequested = 'default';
  const selected = () => {
    const current = density();
    if (!current.active) throw new Error('Display density unavailable');
    if (!current.overridden) {
      // Android removes an override equal to the device's physical density.
      return lastRequested !== 'default' &&
        densityFor(width(), lastRequested) === String(current.active)
        ? lastRequested
        : 'default';
    }
    const widthPx = width();
    return (
      [...WIDTHS].find(
        option => densityFor(widthPx, option) === String(current.active),
      ) || null
    );
  };
  // The USB reverse accepts other local clients too; only the enrolled Debug app has the token.
  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');
    const respond = (status, body) =>
      res.writeHead(status).end(JSON.stringify(body));
    const header = req.headers.authorization || '';
    const expected = `Bearer ${token}`;
    if (
      header.length !== expected.length ||
      !timingSafeEqual(Buffer.from(header, 'latin1'), Buffer.from(expected))
    ) {
      return respond(403, {});
    }
    const match = /^\/preset\/(default|320|360|384|412)$/.exec(req.url || '');
    const isStatus = req.method === 'GET' && req.url === '/status';
    if (
      !isStatus &&
      (req.method !== 'POST' ||
        !match ||
        req.headers['transfer-encoding'] !== undefined ||
        (req.headers['content-length'] || '0') !== '0')
    ) {
      return respond(404, {});
    }
    try {
      requireUsb();
      if (!isStatus && match) {
        const preset = match[1];
        const target = densityFor(width(), preset);
        adb('shell', 'wm', 'density', target);
        const result = density();
        if (
          target === 'reset'
            ? result.overridden
            : String(result.active) !== target
        ) {
          throw new Error('Display density did not apply');
        }
        lastRequested = preset;
      }
      return respond(200, { preset: selected() });
    } catch {
      return respond(503, {});
    }
  });

  requireUsb();
  adb('shell', 'run-as', APP, 'ls', '-d', 'files'); // Refuses non-debuggable installs.
  const port = `tcp:${PORT}`;
  let reversed = false;
  const clean = () => {
    if (!reversed) return;
    try {
      requireUsb();
      adb('shell', 'run-as', APP, 'rm', '-f', TOKEN_FILE);
      adb('reverse', '--remove', port);
    } catch {
      // Cable removal already prevents access to this host. A new run replaces the token.
    }
    reversed = false;
  };
  await once(server.listen(PORT, '127.0.0.1'), 'listening');
  try {
    adb('reverse', '--no-rebind', port, port);
    reversed = true;
    execFileSync(
      adbPath,
      [
        '-s',
        serial,
        'shell',
        `run-as ${APP} sh -c 'umask 077; cat > ${TOKEN_FILE}'`,
      ],
      { input: token, timeout: 4000, stdio: ['pipe', 'ignore', 'pipe'] },
    );
  } catch (error) {
    clean();
    server.close();
    throw error;
  }
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      clean();
      server.closeAllConnections();
      server.close();
    });
  }
  console.log(
    'NURI USB device layout ready. Keep this process running while using the presets.',
  );
}

module.exports = { densityFor, parseDisplay };
if (require.main === module) {
  main().catch(() => {
    console.error(
      'NURI USB device layout could not start. Check USB debugging, the Debug install and port 56324.',
    );
    process.exitCode = 1;
  });
}
