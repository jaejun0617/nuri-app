'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const SIGNING_NAMES = [
  'NURI_UPLOAD_STORE_FILE', 'NURI_UPLOAD_STORE_PASSWORD',
  'NURI_UPLOAD_KEY_ALIAS', 'NURI_UPLOAD_KEY_PASSWORD',
];
const fail = code => { throw new Error(code); };

function requireSigningEnvironment(env) {
  for (const name of SIGNING_NAMES) {
    if (typeof env[name] !== 'string' || !env[name]) fail(`NURI_SIGNING_ENV_MISSING:${name}`);
  }
}

function requireCleanSource(root, expectedHead) {
  if (!/^[a-f0-9]{40}$/.test(expectedHead || '')) fail('NURI_EXACT_SOURCE_REQUIRED');
  const git = args => cp.execFileSync('git', args, {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...withoutSigningSecrets(process.env), GIT_OPTIONAL_LOCKS: '0' },
  }).trim();
  if (git(['status', '--porcelain', '--untracked-files=all'])) fail('NURI_RC_TRACKED_OR_UNTRACKED_DIRTY');
  if (git(['rev-parse', 'HEAD']) !== expectedHead) fail('NURI_EXACT_SOURCE_MISMATCH');
}

function withoutSigningSecrets(env) {
  const result = { ...env };
  for (const name of SIGNING_NAMES) delete result[name];
  return result;
}

function externalKeystoreMetadata(env) {
  requireSigningEnvironment(env);
  const store = env.NURI_UPLOAD_STORE_FILE;
  if (!path.isAbsolute(store)) fail('NURI_SIGNING_STORE_ABSOLUTE_REQUIRED');
  let stat;
  try { stat = fs.lstatSync(store); } catch { fail('NURI_SIGNING_STORE_MISSING'); }
  if (!stat.isFile() || stat.isSymbolicLink()) fail('NURI_SIGNING_STORE_REGULAR_REQUIRED');
  // eslint-disable-next-line no-bitwise -- POSIX permission mask, not a content read.
  if (stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o600) fail('NURI_SIGNING_STORE_UNSAFE_OWNER_OR_WRITE');
  if (fs.realpathSync(store) !== store) fail('NURI_SIGNING_STORE_CANONICAL_PATH_REQUIRED');
  return { exists: true, copyRequired: false };
}

// Only the JDK cryptographic provider opens the keystore. Never hash/export its bytes.
function verifyExternalSigner(env) {
  externalKeystoreMetadata(env);
  const expected = env.NURI_APPROVED_SIGNER_SHA256;
  if (!/^[a-fA-F0-9]{64}$/.test(expected || '')) fail('NURI_SIGNER_FINGERPRINT_REQUIRED');
  const java = env.JAVA_HOME && path.join(env.JAVA_HOME, 'bin/java');
  if (!java || !fs.existsSync(java)) fail('NURI_SIGNING_JAVA_REQUIRED');
  const result = cp.spawnSync(java, [
    '-XX:-CreateCoredumpOnCrash', '-XX:ErrorFile=/dev/null',
    '--source', '17', path.join(__dirname, 'signing/VerifySigningIdentity.java'),
  ], {
    env: { PATH: env.PATH, HOME: env.HOME, JAVA_HOME: env.JAVA_HOME,
      ...Object.fromEntries(SIGNING_NAMES.map(name => [name, env[name]])),
      NURI_APPROVED_SIGNER_SHA256: expected },
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000,
  });
  // Child output and exceptions are never propagated, including wrong-password diagnostics.
  if (result.status !== 0 || result.stdout.trim() !== 'NURI_SIGNING_IDENTITY_VERIFIED') {
    fail('NURI_SIGNING_IDENTITY_REJECTED');
  }
  return expected.toLowerCase();
}

module.exports = { SIGNING_NAMES, requireSigningEnvironment, requireCleanSource,
  withoutSigningSecrets, externalKeystoreMetadata, verifyExternalSigner };
