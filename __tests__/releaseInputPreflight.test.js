const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  readLiteralConfig,
  relativeImports,
  resolveAndroidPlatform,
} = require('../scripts/preflight-release-inputs.js');

describe('release input preflight', () => {
  test('resolves stable SDK API metadata, including decimal installation directory names', () => {
    const sdk = fs.mkdtempSync(
      path.join(os.tmpdir(), 'nuri-sdk-preflight-test-'),
    );
    try {
      const platform = path.join(sdk, 'platforms/android-37.0');
      fs.mkdirSync(platform, { recursive: true });
      fs.writeFileSync(
        path.join(platform, 'source.properties'),
        'AndroidVersion.ApiLevel=37.0\nAndroidVersion.CodeName=\n',
      );
      fs.writeFileSync(path.join(platform, 'android.jar'), 'test-only');
      expect(resolveAndroidPlatform(sdk, '37')).toBe('android-37.0');
      expect(() => resolveAndroidPlatform(sdk, '36')).toThrow(
        'NURI_ANDROID_PLATFORM_MISSING',
      );
    } finally {
      fs.rmSync(sdk, { recursive: true, force: true });
    }
  });
  test('reads only declared string literals, without executing the config', () => {
    expect(
      readLiteralConfig(
        "export const SUPABASE_URL = 'url'; export const SUPABASE_ANON_KEY = 'key';",
      ),
    ).toEqual({ SUPABASE_URL: 'url', SUPABASE_ANON_KEY: 'key' });
  });
  test.each([
    '',
    "export const SUPABASE_URL = 'url';",
    'export const SUPABASE_URL = process.env.SECRET;',
    'throw new Error("executed")',
    "export const ADMIN_KEY = 'not-allowed';",
  ])('fails closed on missing or executable config', source => {
    expect(() => readLiteralConfig(source)).toThrow(/NURI_INPUT_CONFIG_/);
  });
  test('rejects a required ignored import until declared', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nuri-preflight-test-'));
    try {
      fs.mkdirSync(path.join(root, 'src'));
      fs.writeFileSync(path.join(root, 'src/client.ts'), "import './config';");
      expect(() => relativeImports(root, ['src/client.ts'], [])).toThrow(
        'NURI_IMPORT_MISSING',
      );
      fs.writeFileSync(
        path.join(root, 'src/config.ts'),
        'export const config = 1;',
      );
      expect(() => relativeImports(root, ['src/client.ts'], [])).toThrow(
        'NURI_INPUT_UNDECLARED',
      );
      expect(() =>
        relativeImports(root, ['src/client.ts'], ['src/config.ts']),
      ).not.toThrow();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
