const fs = require('node:fs');
const path = require('node:path');
const { requireSigningEnvironment } = require('../scripts/preflight-release-inputs');

const names = [
  'NURI_UPLOAD_STORE_FILE', 'NURI_UPLOAD_STORE_PASSWORD',
  'NURI_UPLOAD_KEY_ALIAS', 'NURI_UPLOAD_KEY_PASSWORD',
];

describe('release signing fail closed', () => {
  test.each(names)('rejects missing %s without printing values', name => {
    const fixture = Object.fromEntries(names.map(key => [key, 'not-a-real-signing-input']));
    delete fixture[name];
    expect(() => requireSigningEnvironment(fixture)).toThrow(`NURI_SIGNING_ENV_MISSING:${name}`);
  });
  test('accepts all explicit inputs without changing them', () => {
    const fixture = Object.fromEntries(names.map(key => [key, 'not-a-real-signing-input']));
    expect(() => requireSigningEnvironment(fixture)).not.toThrow();
  });
  test('Gradle protects Release tasks while leaving debug signing independent', () => {
    const source = fs.readFileSync(path.join(__dirname, '../android/app/build.gradle'), 'utf8');
    const releaseSigning = source.slice(source.indexOf('    release {'), source.indexOf('  buildTypes {'));
    expect(releaseSigning).not.toMatch(/\?:|storePassword\s+["']|keyPassword\s+["']/);
    expect(source).toContain("it.name.toLowerCase(Locale.ROOT).contains('release')");
    expect(source).toContain('Missing protected Release signing inputs: ');
    expect(source).toContain('storeFile file("debug.keystore")');
    for (const name of names) expect(source).toContain(name);
  });
});
