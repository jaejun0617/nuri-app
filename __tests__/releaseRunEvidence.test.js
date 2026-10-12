const fs = require('fs');
const os = require('os');
const path = require('path');
jest.mock('child_process', () => ({ execFileSync: jest.fn(() => 'fb438180a9dc586a88d4c9b9945f29d774396dd3\n') }));
const { prepare, preserve } = require('../scripts/qa/release-run-evidence');

it('preserves only artifacts and sidecars, fails closed on overwrite, excludes signing inputs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nuri-evidence-test-'));
  try {
    const output = path.join(root, 'android/app/build/outputs/apk/release');
    fs.mkdirSync(output, { recursive: true });
    for (const name of ['nuri-abcdef0-qa-release.apk', 'nuri-abcdef0-qa-release.apk.provenance.json', 'nuri-abcdef0-qa-release.apk.verification.txt', 'private.keystore']) fs.writeFileSync(path.join(output, name), 'PUBLIC_TEST_FIXTURE');
    const destination = path.join(root, 'run', 'previous');
    const records = preserve(root, destination);
    expect(records).toHaveLength(3);
    expect(fs.existsSync(path.join(destination, 'private.keystore'))).toBe(false);
    expect(() => preserve(root, destination)).toThrow();
    expect(records.every(record => record.sha256.length === 64)).toBe(true);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

it('allocates unique timestamp/commit runs without overwriting the requested prior manifest', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nuri-evidence-test-'));
  try {
    const manifest = path.join(root, 'deployment-inputs.json');
    fs.writeFileSync(manifest, 'PREVIOUS_PUBLIC_EVIDENCE');
    const first = prepare(root, manifest);
    const second = prepare(root, manifest);
    expect(first).not.toBe(second);
    expect(path.basename(first)).toContain('-fb43818-');
    expect(fs.readFileSync(manifest, 'utf8')).toBe('PREVIOUS_PUBLIC_EVIDENCE');
    expect(fs.existsSync(path.join(first, 'previous', 'inventory.json'))).toBe(true);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
