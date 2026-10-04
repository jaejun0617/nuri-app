const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const { Buffer } = require('node:buffer');
const crypto = require('node:crypto');
const { secretFindings, androidMetadata, createProvenance } = require('../scripts/release-foundation');

describe('nonvisual release foundation', () => {
  const gradle = 'applicationId "com.nuri.app"\nversionCode 1\nversionName "1.0"\nrelease {\n signingConfig signingConfigs.release\n    }';
  test('records Android package metadata', () => {
    expect(androidMetadata(gradle)).toEqual({ package: 'com.nuri.app', versionCode: 1, versionName: '1.0' });
  });
  test.each([
    gradle.replace('com.nuri.app', 'com.other.app'),
    gradle.replace('versionCode 1', 'versionCode 0'),
    gradle.replace('signingConfigs.release', 'signingConfigs.debug'),
    gradle.replace('signingConfig', 'debuggable true\n signingConfig'),
  ])('rejects unsafe release configuration', source => {
    expect(() => androidMetadata(source)).toThrow(/NURI_/);
  });
  test('credential output never contains the credential', () => {
    const credential = 'gh' + 'p_' + 'a'.repeat(36);
    const found = secretFindings('script.js', credential);
    expect(found).toEqual([{ file: 'script.js', rule: 'SERVER_CREDENTIAL' }]);
    expect(JSON.stringify(found)).not.toContain(credential);
  });
  test.each(['service_role', 'supabase_admin'])('rejects privileged JWT role %s', role => {
    const token = 'eyJ0eXAiOiJKV1QifQ.' + Buffer.from(JSON.stringify({ role })).toString('base64url') + '.synthetic';
    expect(secretFindings('client.ts', token)[0].rule).toBe('PRIVILEGED_JWT');
  });
  test('keeps public client descriptor and explicit debug key separate', () => {
    expect(secretFindings('android/app/debug.keystore', '')).toEqual([]);
    expect(secretFindings('android/app/google-services.json', '{"api_key":"public-client"}')).toEqual([]);
    expect(secretFindings('android/app/upload.keystore', '')[0].rule).toBe('SIGNING_FILE_TRACKED');
    expect(secretFindings('.env.production', '')[0].rule).toBe('ENV_FILE_TRACKED');
    expect(secretFindings('.env.example', '')).toEqual([]);
  });
  describe('artifact provenance', () => {
    let root;
    let manifest;
    let proof;
    let apk;
    let aab;
    const head = 'a'.repeat(40);
    const signer = 'b'.repeat(64);
    beforeEach(() => {
      root = fs.mkdtempSync(path.join(os.tmpdir(), 'nuri-provenance-test-'));
      fs.mkdirSync(path.join(root, 'android/app'), { recursive: true });
      fs.writeFileSync(path.join(root, 'android/app/build.gradle'), gradle);
      apk = path.join(root, 'candidate.apk');
      aab = path.join(root, 'candidate.aab');
      fs.writeFileSync(apk, 'synthetic APK bytes');
      fs.writeFileSync(aab, 'synthetic AAB bytes');
      const hash = crypto.createHash('sha256').update(fs.readFileSync(apk)).digest('hex');
      manifest = { sourceHead: head, inputPreflight: 'PASS', jsBundlePreflight: 'PASS', expectedSignerCertificateSha256: signer, inputs: [], node: '24.20.0', yarn: '3.6.4', java: '17.0.1' };
      proof = `SOURCE_HEAD: ${head}\nVERDICT: ACCEPTED\nAPK_SIGNATURE_VERIFY: PASS\nSIGNER_MATCH: YES\nDEBUGGABLE: false\nUSES_CLEARTEXT_TRAFFIC: false\nJS_BUNDLE_EMBEDDED: YES\nAPK_PATH: ${apk}\nAPK_SHA256: ${hash}\nSIGNER_SHA256: ${signer}\nAPPLICATION_ID: com.nuri.app\nVERSION_NAME: 1.0\nVERSION_CODE: 1\nBUILD_TIMESTAMP: test-only`;
      jest.spyOn(cp, 'execFileSync').mockImplementation((command, args) => {
        if (args.includes('--porcelain')) return '';
        if (args.includes('--show-current')) return 'codex/foundation';
        return head;
      });
    });
    afterEach(() => {
      jest.restoreAllMocks();
      fs.rmSync(root, { recursive: true, force: true });
    });
    test('emits hashes, metadata and explicit Store/AAB boundaries', () => {
      const result = createProvenance(manifest, proof, apk, aab, root);
      expect(result.commit).toBe(head);
      expect(result.artifacts).toHaveLength(2);
      expect(result.inputManifestFingerprint).toMatch(/^[a-f0-9]{64}$/);
      expect(result.storeUploadAuthorized).toBe(false);
      expect(result.aabSignature).toBe('REQUIRES_SEPARATE_AAB_VERIFICATION');
    });
    test.each(['VERDICT: ACCEPTED', 'JS_BUNDLE_EMBEDDED: YES', 'DEBUGGABLE: false'])('rejects missing verifier gate %s', field => {
      expect(() => createProvenance(manifest, proof.replace(field, ''), apk, aab, root)).toThrow(/NURI_PROVENANCE/);
    });
    test('rejects post-verification artifact changes', () => {
      fs.writeFileSync(apk, 'changed artifact');
      expect(() => createProvenance(manifest, proof, apk, aab, root)).toThrow('NURI_PROVENANCE_ARTIFACT_MISMATCH');
    });
    test('rejects source or preflight mismatch', () => {
      expect(() => createProvenance({ ...manifest, sourceHead: 'c'.repeat(40) }, proof, apk, aab, root)).toThrow(/NURI_PROVENANCE/);
      expect(() => createProvenance({ ...manifest, jsBundlePreflight: 'FAIL' }, proof, apk, aab, root)).toThrow(/NURI_PROVENANCE/);
    });
  });
});
