export {};
const fs: typeof import('node:fs') = require('node:fs');
const os: typeof import('node:os') = require('node:os');
const path: typeof import('node:path') = require('node:path');
const cp: typeof import('node:child_process') = require('node:child_process');
const crypto: typeof import('node:crypto') = require('node:crypto');
const { PassThrough }: typeof import('node:stream') = require('node:stream');

jest.mock('../scripts/release-signing-identity', () => ({
  ...jest.requireActual('../scripts/release-signing-identity'),
  requireCleanSource: jest.fn(),
  verifyExternalSigner: jest.fn(),
}));
const identity = require('../scripts/release-signing-identity');
const signing = require('../scripts/secure-release-signing');
const auxiliary = require('../scripts/qa/build-android-auxiliary');

const head = 'b'.repeat(40);
const graph = [
  ':app:compileReleaseJavaWithJavac SKIPPED',
  ':app:bundleReleaseClassesToCompileJar SKIPPED',
  ':app:packageReleaseAndroidTest SKIPPED',
  ':app:assembleReleaseAndroidTest SKIPPED',
  'BUILD SUCCESSFUL in 1s',
].join('\n');
const operationName = 'NURI_INTERNAL_SIGNING_OPERATION';
const operation = 'walk-androidtest-only-v1';

describe('auxiliary-only protected signing, synthetic inputs and mocked children only', () => {
  let root: string;
  let env: Record<string, string>;
  beforeEach(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'nuri-auxiliary-guard-')));
    env = {
      PATH: '/usr/bin:/bin', HOME: root,
      NURI_UPLOAD_STORE_FILE: '/synthetic/protected.fixture',
      NURI_UPLOAD_STORE_PASSWORD: 'synthetic-store-secret',
      NURI_UPLOAD_KEY_ALIAS: 'synthetic-key-alias',
      NURI_UPLOAD_KEY_PASSWORD: 'synthetic-key-secret',
      NURI_APPROVED_SIGNER_SHA256: 'a'.repeat(64),
      [operationName]: operation,
    };
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  function mockGradle(outputs = [{ code: 0, text: graph }, { code: 0, text: 'BUILD SUCCESSFUL in 1s' }]) {
    return jest.spyOn(cp, 'spawn').mockImplementation(() => {
      const item = outputs.shift();
      if (!item) throw new Error('UNEXPECTED_CHILD');
      const child = new cp.ChildProcess();
      Object.assign(child, { stdout: new PassThrough(), stderr: new PassThrough() });
      process.nextTick(() => {
        child.stdout?.push(item.text);
        child.stdout?.push(null);
        child.stderr?.push(null);
        child.emit('close', item.code);
      });
      return child;
    });
  }

  function mockSource(changes = 'A\t__tests__/secureReleaseAuxiliary.test.ts\n') {
    return jest.spyOn(cp, 'execFileSync').mockImplementation((_command, args) => {
      if (!args) throw new Error('UNEXPECTED_GIT');
      if (args[0] === 'diff') return changes;
      if (args[0] === 'rev-parse') return 'c'.repeat(40);
      throw new Error('UNEXPECTED_GIT');
    });
  }

  function mockArtifacts() {
    const output = path.join(root, 'android/app/build/outputs/apk/release');
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'nuri-0133661-qa-release.apk'), 'SYNTHETIC_PRODUCT');
    fs.writeFileSync(path.join(output, 'app-release.apk'), 'SYNTHETIC_PRODUCT');
    fs.writeFileSync(path.join(output, 'output-metadata.json'), 'SYNTHETIC_SIDECAR');
    const realHash = crypto.createHash;
    jest.spyOn(crypto, 'createHash').mockImplementation((algorithm: string) => {
      const hasher = realHash(algorithm);
      const update = hasher.update.bind(hasher);
      jest.spyOn(hasher, 'update').mockImplementation(bytes => {
        if (bytes.toString() === 'SYNTHETIC_PRODUCT') {
          jest.spyOn(hasher, 'digest').mockReturnValue(auxiliary.PRODUCT_APK_SHA256);
        }
        return update(bytes);
      });
      return hasher;
    });
    return output;
  }

  test('only the explicit operation reaches the unchanged helper release/callback protocol', () => {
    const plan = signing.signingInvocation(['auxiliary-release', head, 'qa'], {});
    expect(plan).toEqual({ mode: 'auxiliary-release', helperMode: 'release', operation });
    const native = fs.readFileSync(path.join(__dirname, '../scripts/signing/SecureSigningInput.m'), 'utf8');
    expect(native).toContain('@[args[3], @"verify-injected"]');
    expect(native).toContain('@[args[3], @"run-injected", args[5], @"qa"]');
    expect(native).not.toContain(operationName);
  });

  test.each(['release', 'verify', 'inspect', 'bootstrap', 'rotate'])('normal %s ignores an inherited auxiliary tag', (mode: string) => {
    const args = mode === 'release' ? [mode, head, 'qa'] : [mode];
    expect(signing.signingInvocation(args, env).operation).toBeUndefined();
    expect(signing.filteredEnvironment(env)[operationName]).toBeUndefined();
  });

  test('only valid same-client callback tags are accepted; arbitrary tasks and scripts fail before credentials', () => {
    expect(signing.signingInvocation(['run-injected', head, 'qa'], env).operation).toBe(operation);
    expect(signing.signingInvocation(['verify-injected'], env).operation).toBe(operation);
    expect(() => signing.signingInvocation(['run-injected', head, 'qa'], { [operationName]: 'assembleRelease' })).toThrow('NURI_AUXILIARY_OPERATION_INVALID');
    for (const args of [[], ['auxiliary-release', head], ['auxiliary-release', head, 'store'], ['auxiliary-release', head, 'qa', 'script.js'], ['auxiliary-release', 'bad', 'qa']]) {
      expect(() => signing.signingInvocation(args, env)).toThrow();
    }
    expect(identity.verifyExternalSigner).not.toHaveBeenCalled();
  });

  test('canonical injected release retains its original fixed shell, verification and sanitized environment', async () => {
    const spawn = mockGradle([{ code: 0, text: '' }]);
    await signing.runCanonicalRelease(root, head, { ...env, NODE_OPTIONS: 'unsafe' });
    expect(identity.requireCleanSource).toHaveBeenCalledWith(root, head);
    expect(identity.verifyExternalSigner).toHaveBeenCalled();
    expect(spawn.mock.calls[0][0]).toBe('/bin/bash');
    expect(spawn.mock.calls[0][1]).toEqual([path.join(root, 'scripts/build-android-release.sh'), 'qa']);
    expect(spawn.mock.calls[0][2].env?.[operationName]).toBeUndefined();
    expect(spawn.mock.calls[0][2].env?.NODE_OPTIONS).toBeUndefined();
  });

  test('callback dispatch uses auxiliary only for the exact internal constant', async () => {
    const run = jest.spyOn(auxiliary, 'runAndroidAuxiliary').mockResolvedValue(undefined);
    await signing.runInjected(root, head, env);
    expect(run).toHaveBeenCalledWith(root, head, env);
    expect(() => signing.signingInvocation(['verify-injected'], { [operationName]: 'script.js' })).toThrow();
  });

  test('accepts test packaging and compile jars, not product packaging or malformed/incomplete graphs', () => {
    expect(auxiliary.validateDryRun(graph)).toContain(':app:packageReleaseAndroidTest');
    for (const task of ['assembleRelease', 'packageRelease', 'bundleRelease', 'signReleaseBundle', 'packageDebug', 'createBundleReleaseJsAndAssets', 'installRelease', 'packageFutureArtifact']) {
      expect(() => auxiliary.validateDryRun(`:app:${task} SKIPPED\n${graph}`)).toThrow('NURI_AUXILIARY_PRODUCT_TASK_FORBIDDEN');
    }
    for (const text of ['', graph.replace('BUILD SUCCESSFUL in 1s', ''), graph.replace(':app:assembleReleaseAndroidTest SKIPPED', ''), graph.replace('SKIPPED', 'UP-TO-DATE'), `${graph}\nBUILD FAILED`]) {
      expect(() => auxiliary.validateDryRun(text)).toThrow();
    }
  });

  test.each(['M\tsrc/App.tsx', 'M\tandroid/app/build.gradle', 'M\tscripts/signing/SecureSigningInput.m', 'D\tscripts/secure-release-signing.js'])('rejects unexpected source delta %s before Gradle or signing', async (change: string) => {
    mockSource(change);
    const spawn = jest.spyOn(cp, 'spawn');
    await expect(auxiliary.runAndroidAuxiliary(root, head, env)).rejects.toThrow('NURI_AUXILIARY_SOURCE_DELTA_FORBIDDEN');
    expect(spawn).not.toHaveBeenCalled();
    expect(identity.verifyExternalSigner).not.toHaveBeenCalled();
  });

  test('missing or changed canonical product fails closed without Gradle', async () => {
    mockSource();
    const spawn = jest.spyOn(cp, 'spawn');
    await expect(auxiliary.runAndroidAuxiliary(root, head, env)).rejects.toThrow('NURI_AUXILIARY_PRODUCT_BASELINE_MISSING');
    expect(spawn).not.toHaveBeenCalled();
  });

  test('runs a fixed dry-run then at most one fixed build; secrets remain environment-only', async () => {
    mockSource();
    mockArtifacts();
    const spawn = mockGradle();
    await auxiliary.runAndroidAuxiliary(root, head, { ...env, GRADLE_OPTS: 'unsafe', JAVA_TOOL_OPTIONS: 'unsafe', BASH_ENV: 'unsafe', NODE_OPTIONS: 'unsafe' });
    expect(spawn).toHaveBeenCalledTimes(2);
    expect(spawn.mock.calls[0][1]).toEqual([':app:assembleReleaseAndroidTest', '-PnuriSecurityQa=true', '--no-daemon', '--console=plain', '--dry-run']);
    expect(spawn.mock.calls[1][1]).toEqual([':app:assembleReleaseAndroidTest', '-PnuriSecurityQa=true', '--no-daemon', '--console=plain']);
    for (const [command, args, options] of spawn.mock.calls) {
      expect(command).toBe(path.join(root, 'android/gradlew'));
      expect(args).not.toContain('-x');
      for (const name of identity.SIGNING_NAMES) {
        expect(args.join(' ')).not.toContain(env[name]);
        expect(options.env?.[name]).toBe(env[name]);
      }
      for (const name of ['GRADLE_OPTS', 'JAVA_TOOL_OPTIONS', 'BASH_ENV', 'NODE_OPTIONS', operationName]) expect(options.env?.[name]).toBeUndefined();
    }
  });

  test('raw stdout/stderr including split or multiline secrets never leave the child handling boundary', async () => {
    mockSource(); mockArtifacts();
    const spawn = jest.spyOn(cp, 'spawn').mockImplementation(() => {
      const child = new cp.ChildProcess();
      const streams = [new PassThrough(), new PassThrough()];
      Object.assign(child, { stdout: streams[0], stderr: streams[1] });
      process.nextTick(() => {
        for (const stream of streams) {
          stream.write(env.NURI_UPLOAD_STORE_PASSWORD.slice(0, 8));
          stream.write(env.NURI_UPLOAD_STORE_PASSWORD.slice(8) + '\n');
          stream.write('synthetic-multiline\ncredential\n');
          stream.end();
        }
        child.emit('close', 4);
      });
      return child;
    });
    await expect(auxiliary.runAndroidAuxiliary(root, head, env)).rejects.toThrow('NURI_AUXILIARY_CHILD_FAILED');
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(process.stderr.write).toHaveBeenCalledTimes(1);
    expect(process.stderr.write).toHaveBeenCalledWith('NURI_AUXILIARY_DRY_RUN_STARTED\n');
    const parent = path.join(root, '.codex/nuri-walk-real-product-20261020/auxiliary-builds');
    const receipt = fs.readFileSync(path.join(parent, fs.readdirSync(parent)[0], 'result.json'), 'utf8');
    expect(receipt).not.toContain(env.NURI_UPLOAD_STORE_PASSWORD);
    expect(receipt).not.toContain('synthetic-multiline');
  });

  test('dirty source, absent operation and failed signer cannot reach Gradle', async () => {
    const spawn = jest.spyOn(cp, 'spawn');
    await expect(auxiliary.runAndroidAuxiliary(root, head, {})).rejects.toThrow('NURI_AUXILIARY_OPERATION_INVALID');
    identity.requireCleanSource.mockImplementationOnce(() => { throw new Error('NURI_RC_TRACKED_OR_UNTRACKED_DIRTY'); });
    await expect(auxiliary.runAndroidAuxiliary(root, head, env)).rejects.toThrow('NURI_RC_TRACKED_OR_UNTRACKED_DIRTY');
    mockSource(); mockArtifacts();
    identity.verifyExternalSigner.mockImplementationOnce(() => { throw new Error('NURI_SIGNING_IDENTITY_REJECTED'); });
    await expect(auxiliary.runAndroidAuxiliary(root, head, env)).rejects.toThrow('NURI_SIGNING_IDENTITY_REJECTED');
    expect(spawn).not.toHaveBeenCalled();
  });

  test('changed canonical APK is not accepted as the old product baseline', async () => {
    mockSource();
    const output = mockArtifacts();
    fs.writeFileSync(path.join(output, 'nuri-0133661-qa-release.apk'), 'DIFFERENT_PRODUCT');
    const spawn = jest.spyOn(cp, 'spawn');
    await expect(auxiliary.runAndroidAuxiliary(root, head, env)).rejects.toThrow('NURI_AUXILIARY_PRODUCT_BASELINE_MISMATCH');
    expect(spawn).not.toHaveBeenCalled();
  });

  test('spawn errors are handled without leaking child diagnostics or retrying', async () => {
    mockSource(); mockArtifacts();
    const spawn = jest.spyOn(cp, 'spawn').mockImplementation(() => {
      const child = new cp.ChildProcess();
      Object.assign(child, { stdout: new PassThrough(), stderr: new PassThrough() });
      process.nextTick(() => child.emit('error', new Error(env.NURI_UPLOAD_KEY_PASSWORD)));
      return child;
    });
    await expect(auxiliary.runAndroidAuxiliary(root, head, env)).rejects.toThrow('NURI_AUXILIARY_CHILD_FAILED');
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  test('product tasks in protected dry-run prevent the real build without exclusions or retry', async () => {
    mockSource(); mockArtifacts();
    const spawn = mockGradle([{ code: 0, text: `:app:packageRelease SKIPPED\n${graph}` }]);
    await expect(auxiliary.runAndroidAuxiliary(root, head, env)).rejects.toThrow('NURI_AUXILIARY_PRODUCT_TASK_FORBIDDEN');
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  test('a secret echoed as a task-like line is rejected, not persisted in graph metadata', async () => {
    mockSource(); mockArtifacts();
    const spawn = mockGradle([{ code: 0, text: `:${env.NURI_UPLOAD_STORE_PASSWORD} SKIPPED\n${graph}` }]);
    await expect(auxiliary.runAndroidAuxiliary(root, head, env)).rejects.toThrow('NURI_AUXILIARY_DRY_RUN_MALFORMED');
    expect(spawn).toHaveBeenCalledTimes(1);
    const parent = path.join(root, '.codex/nuri-walk-real-product-20261020/auxiliary-builds');
    const receipt = fs.readFileSync(path.join(parent, fs.readdirSync(parent)[0], 'result.json'), 'utf8');
    expect(receipt).not.toContain(env.NURI_UPLOAD_STORE_PASSWORD);
  });

  test('unexpected secret files are never opened as public product artifacts', async () => {
    mockSource();
    const output = mockArtifacts();
    const secret = path.join(output, 'private.keystore');
    fs.writeFileSync(secret, 'SYNTHETIC_KEY_BYTES');
    const read = jest.spyOn(fs, 'readFileSync');
    await expect(auxiliary.runAndroidAuxiliary(root, head, env)).rejects.toThrow('NURI_AUXILIARY_PRODUCT_FILE_INVALID');
    expect(read.mock.calls.some(([file]) => file === secret)).toBe(false);
  });

  test('Dex Metadata: exact generated 0/1 sidecars are hashed and preserved in the full inventory', () => {
    const output = mockArtifacts();
    for (const index of [0, 1]) {
      const directory = path.join(output, 'baselineProfiles', String(index));
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(path.join(directory, 'app-release.dm'), `SYNTHETIC_DM_${index}`);
    }
    const before = auxiliary.productInventory(root);
    const metadata = before.filter((record: { path: string }) => record.path.endsWith('.dm'));
    expect(metadata).toHaveLength(2);
    for (const [index, record] of metadata.entries()) {
      expect(record.sha256).toBe(crypto.createHash('sha256').update(`SYNTHETIC_DM_${index}`).digest('hex'));
      expect(record.size).toBe(Buffer.byteLength(`SYNTHETIC_DM_${index}`));
    }
    expect(auxiliary.productInventory(root)).toEqual(before);
  });

  test.each(['modified', 'missing'])('Dex Metadata: %s sidecar stops after dry-run before any real build', async (change: string) => {
    mockSource();
    const output = mockArtifacts();
    const directory = path.join(output, 'baselineProfiles', '0');
    fs.mkdirSync(directory, { recursive: true });
    const metadata = path.join(directory, 'app-release.dm');
    fs.writeFileSync(metadata, 'SYNTHETIC_DM');
    const spawn = jest.spyOn(cp, 'spawn').mockImplementation(() => {
      const child = new cp.ChildProcess();
      Object.assign(child, { stdout: new PassThrough(), stderr: new PassThrough() });
      process.nextTick(() => {
        if (change === 'modified') fs.writeFileSync(metadata, 'MODIFIED_DM');
        else fs.unlinkSync(metadata);
        child.stdout?.push(graph); child.stdout?.push(null); child.stderr?.push(null); child.emit('close', 0);
      });
      return child;
    });
    await expect(auxiliary.runAndroidAuxiliary(root, head, env)).rejects.toThrow('NURI_AUXILIARY_PRODUCT_ARTIFACT_CHANGED');
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  test.each(['baselineProfiles/2/app-release.dm', 'baselineProfiles/0/custom.dm', 'app-release.dm', 'private.keystore'])('Dex Metadata: unexpected path or private extension remains unread and denied: %s', (relative: string) => {
    const output = mockArtifacts();
    const file = path.join(output, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'SYNTHETIC_UNEXPECTED_FILE');
    const read = jest.spyOn(fs, 'readFileSync');
    expect(() => auxiliary.productInventory(root)).toThrow('NURI_AUXILIARY_PRODUCT_FILE_INVALID');
    expect(read.mock.calls.some(([entry]) => entry === file)).toBe(false);
  });

  test('Dex Metadata: even an expected sidecar path cannot be a symlink', () => {
    const output = mockArtifacts();
    const directory = path.join(output, 'baselineProfiles', '0');
    fs.mkdirSync(directory, { recursive: true });
    const target = path.join(root, 'synthetic-private.fixture');
    fs.writeFileSync(target, 'SYNTHETIC_PRIVATE_BYTES');
    fs.symlinkSync(target, path.join(directory, 'app-release.dm'));
    const read = jest.spyOn(fs, 'readFileSync');
    expect(() => auxiliary.productInventory(root)).toThrow('NURI_AUXILIARY_PRODUCT_SYMLINK_FORBIDDEN');
    expect(read.mock.calls.some(([entry]) => entry === target)).toBe(false);
  });

  test.each([false, true])('safe rejected task metadata: no raw graph or protected value is retained (sensitive=%s)', async (sensitive: boolean) => {
    mockSource(); mockArtifacts();
    const task = sensitive ? `:app:package${env.NURI_UPLOAD_KEY_ALIAS}Release` : ':app:createBundleReleaseJsAndAssets';
    const spawn = mockGradle([{ code: 0, text: `${task} SKIPPED\n${env.NURI_UPLOAD_STORE_PASSWORD}\n${graph}` }]);
    await expect(auxiliary.runAndroidAuxiliary(root, head, env)).rejects.toThrow(sensitive ? 'NURI_AUXILIARY_DRY_RUN_MALFORMED' : 'NURI_AUXILIARY_PRODUCT_TASK_FORBIDDEN');
    expect(spawn).toHaveBeenCalledTimes(1);
    const parent = path.join(root, '.codex/nuri-walk-real-product-20261020/auxiliary-builds');
    const raw = fs.readFileSync(path.join(parent, fs.readdirSync(parent)[0], 'result.json'), 'utf8');
    const receipt = JSON.parse(raw);
    expect(receipt.rejectedTask).toBe(sensitive ? null : task);
    expect(receipt.tasks).toEqual([]);
    for (const name of identity.SIGNING_NAMES) expect(raw).not.toContain(env[name]);
  });

  test('dry-run format: source-proven RNFB configuration rows are not task rows and emit only structural metadata', () => {
    const diagnostics: unknown[] = [];
    const configuration = [
      ':react-native-firebase_app package.json found at /synthetic/private/project/node_modules/@react-native-firebase/app/package.json',
      ':react-native-firebase_app:firebase.bom using default value: 34.2.0',
      ':react-native-firebase_app:play.play-services-auth using default value: 21.4.0',
      ':react-native-firebase_app:android.compileSdk using custom value: 37',
      ':react-native-firebase_crashlytics:android.minSdk using custom value: 24',
      ':react-native-firebase_crashlytics:version set from package.json: 23.8.6 (23,8,6 - 23008006)',
      ':react-native-firebase_app:reactNativeAndroidDir /synthetic/private/project/node_modules/react-native/android',
      ':react-native-firebase_app no firebase.json found, skipping',
      ':react-native-firebase_app firebase.json found at /synthetic/private/project/firebase.json',
      ':react-native-firebase_app found react-native json root in firebase.json, creating firebase build config',
      ':react-native-firebase_app firebase.json found with no react-native config, skipping',
    ].join('\n');
    expect(auxiliary.validateDryRun(configuration + '\n' + graph, undefined, (value: unknown) => diagnostics.push(value))).toEqual(auxiliary.validateDryRun(graph));
    expect(diagnostics).toHaveLength(11);
    expect(JSON.stringify(diagnostics)).not.toContain('/synthetic');
    expect(JSON.stringify(diagnostics)).not.toContain('34.2.0');
    expect(diagnostics).toContainEqual({ project: 'RNFB_APP', category: 'PACKAGE_JSON_LOCATION' });
  });

  test.each([
    ':app:packageRelease SKIPPED', ':app:assembleRelease SKIPPED', ':app:bundleRelease SKIPPED',
    ':app:packageFutureApk SKIPPED', ':app:createBundleReleaseJsAndAssets SKIPPED',
  ])('dry-run format: configuration diagnostics never excuse a product or unknown producer: %s', (task: string) => {
    const prefix = ':react-native-firebase_app:android.compileSdk using custom value: 37\n';
    expect(() => auxiliary.validateDryRun(prefix + task + '\n' + graph)).toThrow('NURI_AUXILIARY_PRODUCT_TASK_FORBIDDEN');
  });

  test.each([
    ':app:packageRelease UP-TO-DATE',
    ':unreviewed_plugin package.json found at /synthetic/package.json',
    ':react-native-firebase_app:unknown.setting using custom value: 37',
    ':react-native-firebase_app package.json found at :app:packageRelease SKIPPED',
    ':react-native-firebase_app failed to parse firebase.json found at /synthetic/firebase.json.',
    ':react-native-firebase_app:android.compileSdk using custom value: private-value',
  ])('dry-run format: unknown diagnostics and malformed task rows still stop with value-free metadata: %s', (line: string) => {
    const diagnostics: unknown[] = [];
    expect(() => auxiliary.validateDryRun(line + '\n' + graph, undefined, (value: unknown) => diagnostics.push(value))).toThrow('NURI_AUXILIARY_DRY_RUN_MALFORMED');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ category: 'UNRECOGNIZED_COLON_LINE' });
    expect(JSON.stringify(diagnostics)).not.toContain(line);
    expect(JSON.stringify(diagnostics)).not.toContain('private-value');
  });

  test('dry-run format: a redacted configuration value is not accepted or leaked into a receipt', async () => {
    mockSource(); mockArtifacts();
    const spawn = mockGradle([{ code: 0, text: `:react-native-firebase_app:android.compileSdk using custom value: ${env.NURI_UPLOAD_STORE_PASSWORD}\n${graph}` }]);
    await expect(auxiliary.runAndroidAuxiliary(root, head, env)).rejects.toThrow('NURI_AUXILIARY_DRY_RUN_MALFORMED');
    expect(spawn).toHaveBeenCalledTimes(1);
    const parent = path.join(root, '.codex/nuri-walk-real-product-20261020/auxiliary-builds');
    const raw = fs.readFileSync(path.join(parent, fs.readdirSync(parent)[0], 'result.json'), 'utf8');
    expect(JSON.parse(raw).diagnostics).toEqual([{ project: 'RNFB_APP', category: 'UNRECOGNIZED_COLON_LINE', count: 1 }]);
    expect(raw).not.toContain(env.NURI_UPLOAD_STORE_PASSWORD);
    expect(raw).not.toContain('[REDACTED_INPUT]');
  });

  test.each([0, 1])('nonzero child at phase %s stops, keeps real exit metadata and never retries', async (phase: number) => {
    mockSource(); mockArtifacts();
    const outputs = phase === 0 ? [{ code: 23, text: 'failure' }] : [{ code: 0, text: graph }, { code: 19, text: 'failure' }];
    const spawn = mockGradle(outputs);
    await expect(auxiliary.runAndroidAuxiliary(root, head, env)).rejects.toThrow('NURI_AUXILIARY_CHILD_FAILED');
    expect(spawn).toHaveBeenCalledTimes(phase + 1);
    const receipts = fs.readdirSync(path.join(root, '.codex/nuri-walk-real-product-20261020/auxiliary-builds'));
    const receipt = JSON.parse(fs.readFileSync(path.join(root, '.codex/nuri-walk-real-product-20261020/auxiliary-builds', receipts[0], 'result.json'), 'utf8'));
    expect(receipt.children.at(-1).exitCode).toBe(phase === 0 ? 23 : 19);
    expect(receipt.sourceUnchanged).toBe(true);
    expect(receipt.productUnchanged).toBe(true);
    expect(JSON.stringify(receipt)).not.toContain(env.NURI_UPLOAD_STORE_PASSWORD);
  });

  test('product and sidecar changes fail even when the build itself fails', async () => {
    mockSource();
    const output = mockArtifacts();
    const spawn = mockGradle([{ code: 0, text: graph }]);
    spawn.mockImplementationOnce(() => {
      const child = new cp.ChildProcess();
      Object.assign(child, { stdout: new PassThrough(), stderr: new PassThrough() });
      process.nextTick(() => {
        child.stdout?.push(graph); child.stdout?.push(null); child.stderr?.push(null); child.emit('close', 0);
      });
      return child;
    }).mockImplementationOnce(() => {
      const child = new cp.ChildProcess();
      Object.assign(child, { stdout: new PassThrough(), stderr: new PassThrough() });
      process.nextTick(() => {
        fs.writeFileSync(path.join(output, 'output-metadata.json'), 'ALTERED');
        child.stdout?.push(null); child.stderr?.push(null); child.emit('close', 1);
      });
      return child;
    });
    await expect(auxiliary.runAndroidAuxiliary(root, head, env)).rejects.toThrow('NURI_AUXILIARY_PRODUCT_ARTIFACT_CHANGED');
  });

  test('source drift during a failed child is checked in the final preservation gate', async () => {
    mockSource(); mockArtifacts();
    const spawn = jest.spyOn(cp, 'spawn').mockImplementation(() => {
      const child = new cp.ChildProcess();
      Object.assign(child, { stdout: new PassThrough(), stderr: new PassThrough() });
      process.nextTick(() => {
        identity.requireCleanSource.mockImplementation(() => { throw new Error('NURI_RC_TRACKED_OR_UNTRACKED_DIRTY'); });
        child.stdout?.push(null); child.stderr?.push(null); child.emit('close', 1);
      });
      return child;
    });
    try {
      await expect(auxiliary.runAndroidAuxiliary(root, head, env)).rejects.toThrow('NURI_AUXILIARY_SOURCE_CHANGED');
      expect(spawn).toHaveBeenCalledTimes(1);
    } finally { identity.requireCleanSource.mockReset(); }
  });
});
