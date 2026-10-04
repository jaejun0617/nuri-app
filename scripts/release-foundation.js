#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const { Buffer } = require('node:buffer');
const { relativeImports } = require('./preflight-release-inputs');

const DECLARED = ['src/services/supabase/config.ts'];
const fail = code => { throw new Error(code); };
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const git = (root, args) => cp.execFileSync('git', args, {
  cwd: root, encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
}).trim();

// Findings identify only the file and rule, never the matched credential.
function secretFindings(file, source) {
  const findings = new Set();
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source)) findings.add('PRIVATE_KEY');
  if (/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,}|sb_secret_[A-Za-z0-9_-]{20,})\b/.test(source)) findings.add('SERVER_CREDENTIAL');
  for (const token of source.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || []) {
    try {
      const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
      if (['service_role', 'supabase_admin'].includes(claims.role)) findings.add('PRIVILEGED_JWT');
    } catch { /* Malformed non-credentials are handled by runtime config validation. */ }
  }
  if (/\.(?:jks|p12|pfx)$|\.keystore$/.test(file) && file !== 'android/app/debug.keystore') findings.add('SIGNING_FILE_TRACKED');
  if (/(^|\/)\.env(?:\.|$)/.test(file) && !/\.(?:example|sample)$/.test(file)) findings.add('ENV_FILE_TRACKED');
  return [...findings].map(rule => ({ file, rule }));
}

function androidMetadata(source) {
  const result = {
    package: /applicationId\s+"([^"]+)"/.exec(source)?.[1],
    versionName: /versionName\s+"([^"]+)"/.exec(source)?.[1],
    versionCode: Number(/versionCode\s+(\d+)/.exec(source)?.[1]),
  };
  if (result.package !== 'com.nuri.app' || !result.versionName || !Number.isSafeInteger(result.versionCode) || result.versionCode < 1) fail('NURI_PACKAGE_METADATA_INVALID');
  if (!/signingConfig signingConfigs\.release/.test(source)) fail('NURI_RELEASE_SIGNING_INVALID');
  const release = /release\s*\{([\s\S]*?)\n {4}\}/g;
  for (const match of source.matchAll(release)) {
    if (/debuggable\s+(?:true|=\s*true)|usesCleartextTraffic[^\n]*true/.test(match[1])) fail('NURI_UNSAFE_RELEASE_FLAGS');
  }
  return result;
}

function validateSource(root) {
  const files = git(root, ['ls-files', '-z']).split('\0').filter(Boolean);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
  if (process.versions.node !== pkg.engines.node || git(root, ['show', 'HEAD:.node-version']) !== pkg.engines.node) fail('NURI_NODE_VERSION_MISMATCH');
  const yarn = cp.execFileSync('yarn', ['--version'], { cwd: root, encoding: 'utf8' }).trim();
  if (`yarn@${yarn}` !== pkg.packageManager) fail('NURI_YARN_VERSION_MISMATCH');
  relativeImports(root, files, DECLARED);
  const findings = files.flatMap(file => {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) fail('NURI_TRACKED_FILE_MISSING');
    if (fs.statSync(full).size > 2 * 1024 * 1024) return secretFindings(file, '');
    return secretFindings(file, fs.readFileSync(full, 'utf8'));
  });
  if (findings.length) {
    console.error(JSON.stringify({ secretFindings: findings }));
    fail('NURI_TRACKED_SECRET_CANDIDATE');
  }
  const version = androidMetadata(fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8'));
  const manifest = fs.readFileSync(path.join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
  if (!manifest.includes('android:allowBackup="false"') || /android:debuggable="true"|android:usesCleartextTraffic="true"/.test(manifest)) fail('NURI_UNSAFE_MANIFEST');
  cp.execFileSync('git', ['diff', '--check'], { cwd: root, stdio: 'pipe' });
  return { status: 'PASS', sourceHead: git(root, ['rev-parse', 'HEAD']), node: process.versions.node, yarn, version, relativeImports: 'PASS', secretPatternGuard: 'PASS', signedBuild: 'NOT_RUN' };
}

function createProvenance(manifest, verification, apk, aab, root) {
  const fields = Object.fromEntries(verification.split('\n').map(line => {
    const at = line.indexOf(': ');
    return at < 0 ? ['', ''] : [line.slice(0, at), line.slice(at + 2)];
  }));
  const head = git(root, ['rev-parse', 'HEAD']);
  if (git(root, ['status', '--porcelain']) || manifest.sourceHead !== head || fields.SOURCE_HEAD !== head || fields.VERDICT !== 'ACCEPTED' || fields.APK_SIGNATURE_VERIFY !== 'PASS' || fields.SIGNER_MATCH !== 'YES' || fields.DEBUGGABLE !== 'false' || fields.USES_CLEARTEXT_TRAFFIC !== 'false' || fields.JS_BUNDLE_EMBEDDED !== 'YES') fail('NURI_PROVENANCE_VERIFICATION_MISMATCH');
  if (manifest.inputPreflight !== 'PASS' || manifest.jsBundlePreflight !== 'PASS') fail('NURI_PROVENANCE_PREFLIGHT_REQUIRED');
  if (path.resolve(fields.APK_PATH) !== path.resolve(apk) || fields.APK_SHA256 !== sha256(fs.readFileSync(apk)) || fields.SIGNER_SHA256 !== manifest.expectedSignerCertificateSha256) fail('NURI_PROVENANCE_ARTIFACT_MISMATCH');
  const metadata = androidMetadata(fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8'));
  if (fields.APPLICATION_ID !== metadata.package || fields.VERSION_NAME !== metadata.versionName || Number(fields.VERSION_CODE) !== metadata.versionCode) fail('NURI_PROVENANCE_VERSION_MISMATCH');
  // Re-read declared inputs after Gradle; do not attest inputs that changed during build.
  for (const input of manifest.inputs.filter(i => i.destination)) {
    if (sha256(fs.readFileSync(input.destination)) !== input.sha256) fail('NURI_PROVENANCE_INPUT_CHANGED');
  }
  const inputIdentity = manifest.inputs.map(({ role, classification, sha256: digest }) => ({ role, classification, sha256: digest })).sort((a, b) => a.role.localeCompare(b.role));
  const artifacts = [apk, aab].map(file => ({ name: path.basename(file), sha256: sha256(fs.readFileSync(file)), bytes: fs.statSync(file).size }));
  return { schema: 1, commit: head, branch: git(root, ['branch', '--show-current']) || process.env.GITHUB_REF_NAME || 'DETACHED', ...metadata, inputManifestFingerprint: sha256(JSON.stringify(inputIdentity)), signerFingerprint: fields.SIGNER_SHA256, artifacts, toolchain: { node: manifest.node, yarn: manifest.yarn, java: manifest.java }, buildTimestamp: fields.BUILD_TIMESTAMP, attestedAt: new Date().toISOString(), aabSignature: 'REQUIRES_SEPARATE_AAB_VERIFICATION', storeUploadAuthorized: false };
}

function main(args) {
  const root = path.resolve(__dirname, '..');
  if (args[0] === 'source') return console.log(JSON.stringify(validateSource(root), null, 2));
  if (args[0] === 'ci-input') {
    if (process.env.CI !== 'true') fail('NURI_CI_FIXTURE_LOCAL_USE_FORBIDDEN');
    const file = path.join(root, DECLARED[0]);
    if (fs.existsSync(file)) fail('NURI_CI_FIXTURE_OVERWRITE_FORBIDDEN');
    fs.writeFileSync(file, "// SOURCE VALIDATION ONLY: not deployment inputs.\nexport const SUPABASE_URL = 'https://aaaaaaaaaaaaaaaaaaaa.supabase.co';\nexport const SUPABASE_ANON_KEY = 'sb_publishable_SOURCE_VALIDATION_ONLY_NOT_A_CREDENTIAL';\n", { flag: 'wx', mode: 0o600 });
    return;
  }
  if (args[0] === 'provenance' && args.length === 6) {
    const [, input, verification, apk, aab, output] = args;
    const result = createProvenance(JSON.parse(fs.readFileSync(input)), fs.readFileSync(verification, 'utf8'), apk, aab, root);
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    return console.log(`PROVENANCE: ${output}`);
  }
  fail('NURI_FOUNDATION_ARGUMENT_INVALID');
}

module.exports = { secretFindings, androidMetadata, validateSource, createProvenance };
if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
