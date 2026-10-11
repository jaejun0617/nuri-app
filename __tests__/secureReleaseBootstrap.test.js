const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const identity = require('../scripts/release-signing-identity');
const bootstrap = require('../scripts/secure-release-signing');

describe('no-copy secure signing bootstrap, synthetic inputs only', () => {
  let root;
  let fixture;
  let env;
  beforeEach(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'nuri-signing-fixture-')));
    fixture = path.join(root, 'not-a-keystore.fixture');
    fs.writeFileSync(fixture, 'synthetic non-key bytes', { mode: 0o600 });
    env = {
      NURI_UPLOAD_STORE_FILE: fixture,
      NURI_UPLOAD_STORE_PASSWORD: 'synthetic-store-value',
      NURI_UPLOAD_KEY_ALIAS: 'synthetic-alias-value',
      NURI_UPLOAD_KEY_PASSWORD: 'synthetic-key-value',
      NURI_APPROVED_SIGNER_SHA256: 'a'.repeat(64),
      JAVA_HOME: root, PATH: '/usr/bin', HOME: root,
    };
    fs.mkdirSync(path.join(root, 'bin'));
    fs.writeFileSync(path.join(root, 'bin/java'), 'synthetic tool');
  });
  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });
  test('accepts an external canonical protected path without reading or copying key bytes', () => {
    const read = jest.spyOn(fs, 'readFileSync');
    const copy = jest.spyOn(fs, 'copyFileSync');
    expect(identity.externalKeystoreMetadata(env)).toEqual({ exists: true, copyRequired: false });
    expect(read).not.toHaveBeenCalled();
    expect(copy).not.toHaveBeenCalled();
  });
  test('rejects relative path', () => {
    expect(() => identity.externalKeystoreMetadata({ ...env, NURI_UPLOAD_STORE_FILE: 'local.fixture' })).toThrow('NURI_SIGNING_STORE_ABSOLUTE_REQUIRED');
  });
  test('rejects missing, symlink and writable-by-others inputs', () => {
    expect(() => identity.externalKeystoreMetadata({ ...env, NURI_UPLOAD_STORE_FILE: path.join(root, 'missing') })).toThrow('NURI_SIGNING_STORE_MISSING');
    const link = path.join(root, 'link');
    fs.symlinkSync(fixture, link);
    expect(() => identity.externalKeystoreMetadata({ ...env, NURI_UPLOAD_STORE_FILE: link })).toThrow('NURI_SIGNING_STORE_REGULAR_REQUIRED');
    fs.chmodSync(fixture, 0o666);
    expect(() => identity.externalKeystoreMetadata(env)).toThrow('NURI_SIGNING_STORE_UNSAFE_OWNER_OR_WRITE');
    fs.chmodSync(fixture, 0o644);
    expect(() => identity.externalKeystoreMetadata(env)).toThrow('NURI_SIGNING_STORE_UNSAFE_OWNER_OR_WRITE');
  });
  test.each(identity.SIGNING_NAMES)('missing %s fails closed', name => {
    const input = { ...env };
    delete input[name];
    expect(() => identity.verifyExternalSigner(input)).toThrow(`NURI_SIGNING_ENV_MISSING:${name}`);
  });
  test('cryptographic verifier gets secrets only as child environment, never arguments', () => {
    const child = jest.spyOn(cp, 'spawnSync').mockReturnValue({ status: 0, stdout: 'NURI_SIGNING_IDENTITY_VERIFIED\n' });
    expect(identity.verifyExternalSigner(env)).toBe('a'.repeat(64));
    const [, args, options] = child.mock.calls[0];
    for (const name of identity.SIGNING_NAMES) {
      expect(args.join(' ')).not.toContain(env[name]);
      expect(options.env[name]).toBe(env[name]);
    }
    expect(options.stdio).toEqual(['ignore', 'pipe', 'pipe']);
  });
  test.each([1, 2, null])('wrong signer/password/process failure %s fails without diagnostics leakage', status => {
    jest.spyOn(cp, 'spawnSync').mockReturnValue({ status, stdout: env.NURI_UPLOAD_STORE_PASSWORD, stderr: env.NURI_UPLOAD_KEY_PASSWORD });
    expect(() => identity.verifyExternalSigner(env)).toThrow('NURI_SIGNING_IDENTITY_REJECTED');
  });
  test('wrong verifier output fails even with zero exit', () => {
    jest.spyOn(cp, 'spawnSync').mockReturnValue({ status: 0, stdout: 'unexpected' });
    expect(() => identity.verifyExternalSigner(env)).toThrow('NURI_SIGNING_IDENTITY_REJECTED');
  });
  test('approved APK must match its fixed hash before certificate inspection', () => {
    const child = jest.spyOn(cp, 'spawnSync');
    expect(() => bootstrap.deriveApprovedSigner(fixture, 'f'.repeat(64), 'apksigner', root)).toThrow('NURI_APPROVED_APK_HASH_MISMATCH');
    expect(child).not.toHaveBeenCalled();
  });
  test('derives exactly one signer only from a successfully verified reference', () => {
    const digest = crypto.createHash('sha256').update(fs.readFileSync(fixture)).digest('hex');
    const child = jest.spyOn(cp, 'spawnSync').mockReturnValue({ status: 0, stdout: `Signer #1 certificate SHA-256 digest: ${'b'.repeat(64)}\n` });
    expect(bootstrap.deriveApprovedSigner(fixture, digest, 'apksigner', root)).toBe('b'.repeat(64));
    child.mockReturnValue({ status: 1, stdout: `Signer #1 certificate SHA-256 digest: ${'b'.repeat(64)}\n` });
    expect(() => bootstrap.deriveApprovedSigner(fixture, digest, 'apksigner', root)).toThrow('NURI_APPROVED_APK_SIGNATURE_REJECTED');
  });
  test('supports the installed Android 37 V2 signer metadata format', () => {
    const digest = crypto.createHash('sha256').update(fs.readFileSync(fixture)).digest('hex');
    const child = jest.spyOn(cp, 'spawnSync').mockReturnValue({ status: 0, stdout: `V2 Signer: certificate SHA-256 digest: ${'b'.repeat(64)}\n` });
    expect(bootstrap.deriveApprovedSigner(fixture, digest, 'apksigner', root)).toBe('b'.repeat(64));
    child.mockReturnValue({ status: 0, stdout: `V2 Signer: certificate SHA-256 digest: ${'b'.repeat(64)}\nV2 Signer: certificate SHA-256 digest: ${'c'.repeat(64)}\n` });
    expect(() => bootstrap.deriveApprovedSigner(fixture, digest, 'apksigner', root)).toThrow('NURI_APPROVED_APK_SIGNATURE_REJECTED');
  });
  test('dirty source and mismatched exact commit fail before build or credentials', () => {
    const git = jest.spyOn(cp, 'execFileSync').mockReturnValue(' M source.js\n');
    expect(() => identity.requireCleanSource(root, 'a'.repeat(40))).toThrow('NURI_RC_TRACKED_OR_UNTRACKED_DIRTY');
    git.mockImplementation((command, args) => args.includes('HEAD') ? 'b'.repeat(40) : '');
    expect(() => identity.requireCleanSource(root, 'a'.repeat(40))).toThrow('NURI_EXACT_SOURCE_MISMATCH');
    expect(() => identity.requireCleanSource(root, 'b'.repeat(40))).not.toThrow();
    expect(() => identity.requireCleanSource(root, '')).toThrow('NURI_EXACT_SOURCE_REQUIRED');
  });
  test('Metro receives no signing secrets; shell and JVM injection hooks are not forwarded', () => {
    const clean = identity.withoutSigningSecrets(env);
    for (const name of identity.SIGNING_NAMES) expect(clean[name]).toBeUndefined();
    const child = bootstrap.filteredEnvironment({ ...env, BASH_ENV: 'injected', NODE_OPTIONS: 'injected', JAVA_TOOL_OPTIONS: 'injected', SECRET_UNRELATED: 'injected' });
    expect(child.BASH_ENV).toBeUndefined();
    expect(child.NODE_OPTIONS).toBeUndefined();
    expect(child.JAVA_TOOL_OPTIONS).toBeUndefined();
    expect(child.SECRET_UNRELATED).toBeUndefined();
  });
  test('log sanitizer removes every signing value', () => {
    const line = identity.SIGNING_NAMES.map(name => env[name]).join(' ');
    const sanitized = bootstrap.redactLine(line, env);
    for (const name of identity.SIGNING_NAMES) expect(sanitized).not.toContain(env[name]);
  });
  test('rotation accepts only one exact literal per historical signing field', () => {
    const source = [
      'storePassword System.getenv("NURI_UPLOAD_STORE_PASSWORD") ?: "synthetic-store"',
      'keyAlias System.getenv("NURI_UPLOAD_KEY_ALIAS") ?: "synthetic-alias"',
      'keyPassword System.getenv("NURI_UPLOAD_KEY_PASSWORD") ?: "synthetic-key"',
    ].join('\n');
    expect(bootstrap.parseHistoricalSigning(source)).toEqual({
      NURI_UPLOAD_STORE_PASSWORD: 'synthetic-store', NURI_UPLOAD_KEY_ALIAS: 'synthetic-alias', NURI_UPLOAD_KEY_PASSWORD: 'synthetic-key',
    });
    expect(() => bootstrap.parseHistoricalSigning(source + '\n' + source)).toThrow('NURI_HISTORICAL_CANDIDATE_AMBIGUOUS');
    expect(() => bootstrap.parseHistoricalSigning(source.replace('synthetic-store', '${untrusted}'))).toThrow('NURI_HISTORICAL_LITERAL_UNSUPPORTED');
    expect(() => bootstrap.parseHistoricalSigning(source.replace('synthetic-store', 'escaped\\value'))).toThrow('NURI_HISTORICAL_LITERAL_UNSUPPORTED');
    expect(() => bootstrap.parseHistoricalSigning('')).toThrow('NURI_HISTORICAL_CANDIDATE_AMBIGUOUS');
  });
  test('rotation protocol persists Keychain readback before a same-file commit', () => {
    const native = fs.readFileSync(path.join(__dirname, '../scripts/signing/SecureSigningInput.m'), 'utf8');
    const rotation = native.slice(native.indexOf('static NSString *RotateExistingFile'), native.indexOf('static void Emit'));
    expect(rotation.indexOf('SaveNew(values)')).toBeLessThan(rotation.indexOf('NURI_ROTATION_COMMIT\\n'));
    expect(native).toContain('Require([ReadStored() isEqual:subset])');
    expect(native).toContain('SecRandomCopyBytes(kSecRandomDefault, sizeof(bytes), bytes)');
    expect(native).toContain('unsigned char bytes[32]');
    expect(rotation).not.toMatch(/Prompt\(|writeToFile|NSLog|printf/);
    const java = fs.readFileSync(path.join(__dirname, '../scripts/signing/RotateSigningCredentials.java'), 'utf8');
    expect(java).not.toMatch(/KeyPairGenerator|Files\.(copy|move|createTempFile)|key\.getEncoded|printStackTrace/);
    expect(java).toContain('channel.force(true)');
    expect(java).toContain('channel.tryLock()');
    expect(java).toContain('NURI_ROTATION_EXPECTED_FILE_SHA256');
    expect(java.indexOf('"NURI_ROTATION_COMMIT".equals(command)')).toBeLessThan(java.indexOf('String hash = commit(io'));
    expect(java).toContain('throw new IOException("RECOVERY_REQUIRED")');
    expect(java).toContain('catch (UnrecoverableKeyException rejected)');
  });
  test('preflight never injects the key; provenance verifies certificate instead of reading key bytes', () => {
    const preflight = fs.readFileSync(path.join(__dirname, '../scripts/preflight-release-inputs.js'), 'utf8');
    expect(preflight).not.toContain('NURI_RELEASE_KEYSTORE_SOURCE');
    expect(preflight).not.toContain('android/app/${store}');
    expect(preflight).toContain('certificateSha256: verifyExternalSigner(env)');
    const provenance = fs.readFileSync(path.join(__dirname, '../scripts/release-foundation.js'), 'utf8');
    expect(provenance).toContain('verifyExternalSigner(process.env) !== input.certificateSha256');
  });
  test('native secure input never emits values, writes plaintext, exports or creates a key', () => {
    const native = fs.readFileSync(path.join(__dirname, '../scripts/signing/SecureSigningInput.m'), 'utf8');
    expect(native).toContain('NSSecureTextField');
    expect(native).toContain('SecItemAdd');
    expect(native).not.toMatch(/SecItemUpdate|SecItemDelete|writeToFile|NSLog|printf/);
    expect(native).toContain('task.environment = values');
    expect(native).toContain('task.standardOutput = NSFileHandle.fileHandleWithNullDevice');
    expect(native.indexOf('RunChild(values, args[2], @[args[3], @"verify-injected"], nil)')).toBeLessThan(native.indexOf('if (!bundle) SaveNew(values)'));
    const java = fs.readFileSync(path.join(__dirname, '../scripts/signing/VerifySigningIdentity.java'), 'utf8');
    expect(java).not.toMatch(/KeyPairGenerator|FileOutputStream|\.store\(|key\.getEncoded|printStackTrace/);
    expect(java).toContain('actual.equalsIgnoreCase(required("NURI_APPROVED_SIGNER_SHA256"))');
  });
});
