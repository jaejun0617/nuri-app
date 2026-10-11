#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const { SIGNING_NAMES, externalKeystoreMetadata, requireCleanSource, verifyExternalSigner } = require('./release-signing-identity');

const APPROVED_APK = '/private/tmp/nuri-ui-approved-release-IIRKj1/nuri-f6d284d-approved-release.apk';
const APPROVED_APK_HASH = 'ccf759ca28c51aa7b034b49b2511037840203c22da37c6fd42937c28b674f98b';
const HISTORICAL_SOURCE = '45d028a2ee11c1d27cede056ecd2d76072ce68aa';
const APPROVED_OLD_KEYSTORE_HASH = 'dc7f9d5612246320a7ec1c5c84af70aedd377269fe55a1ac75f7d6ebffa297f0';
const fail = code => { throw new Error(code); };
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function deriveApprovedSigner(apk, expectedHash, apksigner, javaHome) {
  if (!fs.existsSync(apk) || hash(fs.readFileSync(apk)) !== expectedHash) fail('NURI_APPROVED_APK_HASH_MISMATCH');
  const result = cp.spawnSync(apksigner, ['verify', '--print-certs', apk], {
    env: { PATH: process.env.PATH, JAVA_HOME: javaHome, HOME: os.homedir() },
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000,
  });
  const matches = [...(result.stdout || '').matchAll(/^(?:Signer #\d+|V2 Signer:) certificate SHA-256 digest: ([a-fA-F0-9]{64})$/gm)];
  if (result.status !== 0 || matches.length !== 1) fail('NURI_APPROVED_APK_SIGNATURE_REJECTED');
  return matches[0][1].toLowerCase();
}

function filteredEnvironment(env) {
  const allowed = ['PATH', 'HOME', 'USER', 'LOGNAME', 'TMPDIR', 'LANG', 'LC_ALL',
    'JAVA_HOME', 'ANDROID_HOME', 'ANDROID_SDK_ROOT', 'NURI_RELEASE_INPUT_ROOT',
    'NURI_RELEASE_INPUT_MANIFEST', 'NURI_RELEASE_PREFLIGHT_DIR', 'NURI_RELEASE_LOCAL_PROPERTIES_SOURCE',
    'NURI_GOOGLE_MAPS_API_KEY', 'NURI_SUPABASE_URL', 'NURI_SUPABASE_CLIENT_KEY',
    'NURI_APPROVED_SIGNER_SHA256', ...SIGNING_NAMES];
  return Object.fromEntries(allowed.filter(name => typeof env[name] === 'string').map(name => [name, env[name]]));
}

function redactLine(line, env) {
  let result = line;
  for (const name of SIGNING_NAMES) {
    if (env[name]) result = result.split(env[name]).join('[REDACTED_SIGNING_INPUT]');
  }
  return result;
}

// Only the explicitly invoked one-time rotation reads this fixed historical source.
// Normal verification/build paths never recover or fall back to historical credentials.
function parseHistoricalSigning(source) {
  const result = {};
  for (const [field, name] of [
    ['storePassword', 'NURI_UPLOAD_STORE_PASSWORD'],
    ['keyAlias', 'NURI_UPLOAD_KEY_ALIAS'],
    ['keyPassword', 'NURI_UPLOAD_KEY_PASSWORD'],
  ]) {
    const pattern = new RegExp(`^\\s*${field}\\s+System\\.getenv\\(["']${name}["']\\)\\s*\\?:\\s*(.+?)\\s*$`, 'gm');
    const matches = [...source.matchAll(pattern)];
    if (matches.length !== 1) fail('NURI_HISTORICAL_CANDIDATE_AMBIGUOUS');
    const literal = matches[0][1];
    const quote = literal[0];
    if (!["'", '"'].includes(quote) || literal.at(-1) !== quote) fail('NURI_HISTORICAL_LITERAL_UNSUPPORTED');
    const value = literal.slice(1, -1);
    if (!value || value.includes('\\') || value.includes(quote) || /[\r\n]/.test(value) || (quote === '"' && value.includes('$'))) {
      fail('NURI_HISTORICAL_LITERAL_UNSUPPORTED');
    }
    result[name] = value;
  }
  return result;
}

function runCanonicalRelease(root, expectedHead, env) {
  requireCleanSource(root, expectedHead);
  verifyExternalSigner(env);
  return new Promise((resolve, reject) => {
    const child = cp.spawn('/bin/bash', [path.join(root, 'scripts/build-android-release.sh'), 'qa'], {
      cwd: root, env: filteredEnvironment(env), stdio: ['ignore', 'pipe', 'pipe'],
    });
    // Buffer complete lines so a secret split across process chunks is still redacted.
    for (const stream of [child.stdout, child.stderr]) {
      let pending = '';
      stream.setEncoding('utf8');
      stream.on('data', chunk => {
        pending += chunk;
        let newline;
        while ((newline = pending.indexOf('\n')) >= 0) {
          process.stderr.write(redactLine(pending.slice(0, newline), env) + '\n');
          pending = pending.slice(newline + 1);
        }
        if (pending.length > 1024 * 1024) pending = '[OVERSIZED_OUTPUT_OMITTED]';
      });
      stream.on('end', () => { if (pending) process.stderr.write(redactLine(pending, env) + '\n'); });
    }
    child.on('error', () => reject(new Error('NURI_RELEASE_CHILD_FAILED')));
    child.on('close', code => code === 0 ? resolve() : reject(new Error('NURI_RELEASE_CHILD_FAILED')));
  });
}

function toolContext() {
  const javaHome = cp.execFileSync('/usr/libexec/java_home', ['-v', '17'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const sdk = process.env.ANDROID_SDK_ROOT || path.join(os.homedir(), 'Library/Android/sdk');
  const apksigner = path.join(sdk, 'build-tools/37.0.0/apksigner');
  if (!fs.existsSync(apksigner)) fail('NURI_APPROVED_APKSIGNER_UNAVAILABLE');
  return { javaHome, signer: deriveApprovedSigner(APPROVED_APK, APPROVED_APK_HASH, apksigner, javaHome) };
}

function ensureHelper() {
  const directory = path.join(os.homedir(), 'Library/Application Support/NURI/ReleaseSigning');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(directory);
  // eslint-disable-next-line no-bitwise -- The executable directory must be owner-only.
  if (stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o077)) fail('NURI_SECURE_HELPER_DIRECTORY_UNSAFE');
  const binary = path.join(directory, 'secure-input');
  const stamp = path.join(directory, 'helper-source.sha256');
  const source = path.join(__dirname, 'signing/SecureSigningInput.m');
  const digest = hash(fs.readFileSync(source));
  if (!fs.existsSync(binary) || !fs.existsSync(stamp) || fs.readFileSync(stamp, 'utf8').trim() !== digest) {
    const result = cp.spawnSync('/usr/bin/clang', ['-fobjc-arc', source, '-o', binary, '-framework', 'AppKit', '-framework', 'Security', '-framework', 'LocalAuthentication'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000,
    });
    if (result.status !== 0) fail('NURI_SECURE_HELPER_COMPILE_FAILED');
    fs.chmodSync(binary, 0o700);
    fs.writeFileSync(stamp, digest + '\n', { mode: 0o600 });
  }
  return binary;
}

async function main(args) {
  const root = path.resolve(__dirname, '..');
  const mode = args[0];
  if (!['inspect', 'bootstrap', 'verify', 'rotate', 'verify-injected', 'release', 'run-injected'].includes(mode)) fail('NURI_SIGNING_MODE_REQUIRED');
  if (mode === 'release' || mode === 'run-injected') {
    if (args.length !== 3 || args[2] !== 'qa') fail('NURI_SIGNING_RELEASE_ARGUMENT_INVALID');
    requireCleanSource(root, args[1]);
  } else if (args.length !== 1) fail('NURI_SIGNING_ARGUMENT_INVALID');
  const context = toolContext();
  const env = filteredEnvironment(process.env);
  env.PATH = `${path.dirname(process.execPath)}:${env.PATH || '/usr/bin:/bin'}`;
  env.JAVA_HOME = context.javaHome;
  env.NURI_APPROVED_SIGNER_SHA256 = context.signer;
  const inputRoot = env.NURI_RELEASE_INPUT_ROOT || root;
  if (mode === 'bootstrap' || mode === 'inspect' || mode === 'rotate') {
    env.NURI_RELEASE_INPUT_ROOT = inputRoot;
    env.NURI_UPLOAD_STORE_FILE = path.join(inputRoot, 'android/app/nuri-upload.keystore');
  }
  if (mode === 'rotate') {
    const history = cp.spawnSync('git', ['show', `${HISTORICAL_SOURCE}:android/app/build.gradle`], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000,
    });
    if (history.status !== 0) fail('NURI_HISTORICAL_SOURCE_UNAVAILABLE');
    Object.assign(env, parseHistoricalSigning(history.stdout));
    externalKeystoreMetadata(env);
    env.NURI_ROTATION_EXPECTED_FILE_SHA256 = APPROVED_OLD_KEYSTORE_HASH;
  }
  if (mode === 'verify-injected') {
    verifyExternalSigner(env);
    console.log('NURI_SECURE_INPUT_VERIFIED');
    return;
  }
  if (mode === 'run-injected') {
    await runCanonicalRelease(root, args[1], env);
    console.log('NURI_SECURE_RELEASE_COMPLETED');
    return;
  }
  if (!['release', 'verify'].includes(mode)) {
    const store = fs.lstatSync(env.NURI_UPLOAD_STORE_FILE);
    if (!store.isFile() || store.isSymbolicLink()) fail('NURI_SIGNING_STORE_MISSING');
  }
  const helper = ensureHelper();
  // Keychain values remain in the helper. Only its direct child receives them.
  const result = cp.spawnSync(helper, [mode, process.execPath, path.join(__dirname, 'secure-release-signing.js'), root, args[1] || ''], {
    env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    // Never terminate the coordinator during an in-place credential change.
    timeout: mode === 'rotate' ? 0 : (mode === 'release' ? 3600000 : (mode === 'bootstrap' ? 600000 : 60000)),
  });
  if (result.status !== 0) fail('NURI_SECURE_INPUT_UNAVAILABLE');
  const response = JSON.parse(result.stdout);
  const allowed = ['KEYSTORE', 'SIGNER_REFERENCE', 'STORE_PASSWORD', 'KEY_ALIAS', 'KEY_PASSWORD',
    'SECURE_STORE', 'PO_MANUAL_ACTION_REQUIRED', 'RELEASE_SIGNING_ENV', 'UNKNOWN_MATCHING_ITEMS',
    'NEW_KEYSTORE_FILE_SHA256', 'OLD_STORE_PASSWORD', 'OLD_KEY_PASSWORD'];
  console.log(JSON.stringify(Object.fromEntries(allowed.filter(key => Object.hasOwn(response, key)).map(key => [key, response[key]])), null, 2));
}

module.exports = { deriveApprovedSigner, filteredEnvironment, redactLine, externalKeystoreMetadata, runCanonicalRelease, parseHistoricalSigning };
if (require.main === module) main(process.argv.slice(2)).catch(() => {
  console.error('NURI_SIGNING_BOOTSTRAP_BLOCKED');
  process.exitCode = 2;
});
