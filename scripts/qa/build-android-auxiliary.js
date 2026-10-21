'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const { requireCleanSource, verifyExternalSigner } = require('../release-signing-identity');

const PRODUCT_SOURCE_HEAD = '01336613d6417605660679ba16a8961d6d075d94';
const PRODUCT_APK_SHA256 = '0c1d1b3834c919c47b2763061a04b2353a99b4ccb119cc8a96a1f017ddee4b46';
const PRODUCT_APK = 'android/app/build/outputs/apk/release/nuri-0133661-qa-release.apk';
const PRODUCT_DIRECTORIES = ['android/app/build/outputs/apk/release', 'android/app/build/outputs/bundle/release'];
const TASK = ':app:assembleReleaseAndroidTest';
const GRADLE_ARGUMENTS = Object.freeze([TASK, '-PnuriSecurityQa=true', '--no-daemon', '--console=plain']);
const ALLOWED_SOURCE_PATHS = new Set([
  ...['WalkSupplementalGuard.kt', 'WalkSupplementalGuardTest.kt', 'WalkReadOnlyJournalAudit.kt', 'WalkPetDeleteResponseFilter.kt', 'WalkProductResponseLossTest.kt']
    .map(name => `android/app/src/androidTest/java/com/nuri/walk/${name}`),
  'scripts/secure-release-signing.js', 'scripts/qa/build-android-auxiliary.js', '__tests__/secureReleaseAuxiliary.test.ts',
  'scripts/qa/run-walk-supplemental.js', '__tests__/walkSupplementalCloseout.test.js',
]);
const fail = code => { throw new Error(code); };
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function requireAuxiliarySource(root, expectedHead) {
  requireCleanSource(root, expectedHead);
  const git = args => cp.execFileSync('git', args, {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOME: process.env.HOME, LANG: 'C', GIT_OPTIONAL_LOCKS: '0' },
  }).trim();
  const changes = git(['diff', '--name-status', '--no-renames', PRODUCT_SOURCE_HEAD, expectedHead, '--']);
  if (!changes || changes.split('\n').some(line => {
    const fields = line.split('\t');
    return fields.length !== 2 || !['A', 'M'].includes(fields[0]) || !ALLOWED_SOURCE_PATHS.has(fields[1]);
  })) fail('NURI_AUXILIARY_SOURCE_DELTA_FORBIDDEN');
  const tree = git(['rev-parse', 'HEAD^{tree}']);
  if (!/^[a-f0-9]{40}$/.test(tree)) fail('NURI_AUXILIARY_SOURCE_TREE_INVALID');
  return { harnessHead: expectedHead, harnessTree: tree, productSourceHead: PRODUCT_SOURCE_HEAD };
}

// Preserve the named canonical APK, default APK, bundle and all product sidecars.
// AndroidTest outputs live elsewhere and are deliberately excluded from this invariant.
function productInventory(root) {
  const records = [];
  const visit = relative => {
    const absolute = path.join(root, relative);
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) fail('NURI_AUXILIARY_PRODUCT_SYMLINK_FORBIDDEN');
    if (stat.isDirectory()) {
      records.push({ path: relative, directory: true });
      for (const name of fs.readdirSync(absolute).sort()) visit(`${relative}/${name}`);
    } else if (stat.isFile() && (/\.(?:apk|aab|json|txt|prof|profm)$/.test(relative)
      // Only the two observed AGP baseline-profile Dex Metadata paths, not arbitrary .dm files.
      || /^android\/app\/build\/outputs\/apk\/release\/baselineProfiles\/[01]\/app-release\.dm$/.test(relative))) {
      records.push({ path: relative, size: stat.size, sha256: digest(absolute) });
    }
    else fail('NURI_AUXILIARY_PRODUCT_FILE_INVALID');
  };
  for (const directory of PRODUCT_DIRECTORIES) {
    if (fs.existsSync(path.join(root, directory))) visit(directory);
  }
  const canonical = records.find(record => record.path === PRODUCT_APK);
  if (!canonical) fail('NURI_AUXILIARY_PRODUCT_BASELINE_MISSING');
  if (canonical.sha256 !== PRODUCT_APK_SHA256) fail('NURI_AUXILIARY_PRODUCT_BASELINE_MISMATCH');
  const defaultApk = records.find(record => record.path === 'android/app/build/outputs/apk/release/app-release.apk');
  if (defaultApk && defaultApk.sha256 !== PRODUCT_APK_SHA256) fail('NURI_AUXILIARY_PRODUCT_BASELINE_MISMATCH');
  return records;
}

// Installed RNFB 23.8.6 / Invertase Gradle 1.5 emit these configuration
// diagnostics before Gradle's task graph. Values/paths never leave this parser.
function colonDiagnostic(line) {
  const cxx = /^:(?:[A-Za-z0-9_.-]+:)+((?:configure|build)CMake)(RelWithDebInfo|Release|Debug)\[([^\]\r\n]{1,160})\](\[[^\]\r\n]{1,160}\])? SKIPPED$/.exec(line);
  if (cxx) return {
    project: line.startsWith(':app:') ? 'APP' : 'OTHER', category: 'UNRECOGNIZED_COLON_LINE',
    structuralPrefix: cxx[1] === 'configureCMake' ? 'CMAKE_CONFIGURE' : 'CMAKE_BUILD', variant: cxx[2],
    abi: ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'].includes(cxx[3]) ? cxx[3] : 'UNKNOWN',
    additionalBracket: !!cxx[4],
  };
  const match = /^:(@?react-native-firebase_(app|crashlytics))(.*)$/.exec(line);
  const project = match ? (match[2] === 'app' ? 'RNFB_APP' : 'RNFB_CRASHLYTICS')
    : /^:app(?=[:\s]|$)/.test(line) ? 'APP' : 'OTHER';
  if (match) {
    const body = match[3];
    let category;
    if (/^ package\.json found at (?:\/|\[REDACTED_INPUT\]\/)[^\r\n]*\/package\.json$/.test(body)) category = 'PACKAGE_JSON_LOCATION';
    else if (/^:(?:firebase\.bom|play\.play-services-auth) using (?:default|custom) value: \d+\.\d+\.\d+$/.test(body)) category = 'SDK_VERSION';
    else if (/^:android\.(?:compileSdk|targetSdk|minSdk) using (?:default|custom) value: \d{1,3}$/.test(body)) category = 'ANDROID_SDK';
    else if (/^:version set from package\.json: \d+\.\d+\.\d+ \(\d+,\d+,\d+ - \d+\)$/.test(body)) category = 'PACKAGE_VERSION';
    else if (/^:reactNativeAndroidDir (?:\/|\[REDACTED_INPUT\]\/)[^\r\n]*\/node_modules\/react-native(?:\/android)?$/.test(body)) {
      // Invertase 1.5 searches both the RN package root and its Android subdirectory.
      return { project, category: 'RN_SOURCE_LOCATION', locationShape: body.endsWith('/android') ? 'RN_ANDROID' : 'RN_ROOT' };
    }
    else if (project === 'RNFB_APP' && (/^ (?:no firebase\.json found, skipping|firebase\.json found with no react-native config, skipping|found react-native json root in firebase\.json, creating firebase build config)$/.test(body)
      || /^ firebase\.json found at (?:\/|\[REDACTED_INPUT\]\/)[^\r\n]*\/firebase\.json$/.test(body))) category = 'FIREBASE_JSON_CONFIGURATION';
    if (category) return { project, category };
    if (body.startsWith(':reactNativeAndroidDir ')) return { project, category: 'UNRECOGNIZED_COLON_LINE', structuralPrefix: 'RN_SOURCE_LOCATION' };
  }
  return { project, category: 'UNRECOGNIZED_COLON_LINE' };
}

// AGP 9.2.1 CxxConfigurationFolding generates ABI/target brackets. These
// configure/compile native libraries, not APKs. Keep target names in memory only.
function nativeTaskRow(line) {
  const match = /^(:[A-Za-z0-9_.-]+:)((configure|build)CMakeRelWithDebInfo\[(arm64-v8a|armeabi-v7a|x86|x86_64)\])(?:\[([A-Za-z_][A-Za-z0-9_.-]{0,79}(?:,[A-Za-z_][A-Za-z0-9_.-]{0,79})?(?:,etc)?)\])? SKIPPED$/.exec(line);
  if (!match || line.length > 220 || (match[3] === 'configure' && match[5])) return null;
  const task = line.slice(0, -' SKIPPED'.length);
  const targetCount = match[5] ? match[5].split(',').length : 0;
  const targetDigest = match[5] ? crypto.createHash('sha256').update(match[5]).digest('hex').slice(0, 16) : null;
  return { task, publicTask: match[1] + match[2] + (targetDigest ? `[TARGETS_${targetCount}_${targetDigest}]` : ''),
    diagnostic: { project: match[1] === ':app:' ? 'APP' : 'OTHER', category: 'CMAKE_NATIVE_COMPILE',
      structuralPrefix: match[3] === 'configure' ? 'CMAKE_CONFIGURE' : 'CMAKE_BUILD',
      variant: 'RelWithDebInfo', abi: match[4], targetCount } };
}

// includeBuild(@react-native/gradle-plugin) executes its JVM plugin compilation
// during configuration, even under --dry-run. Admit only those plugin modules
// and JVM compile/JAR tasks; an arbitrary '> Task' row is never an exemption.
function isIncludedPluginCompile(task) {
  const match = /^:(?:gradle-plugin|gradle-plugin-root):(shared|settings-plugin|react-native-gradle-plugin):(checkKotlinGradlePluginConfigurationErrors|compileKotlin|compileJava|pluginDescriptors|processResources|classes|jar)$/.exec(task);
  return !!match && !(match[1] === 'shared' && match[2] === 'pluginDescriptors');
}

function validateDryRun(output, onRejectedTask, onDiagnostic, onTask) {
  const tasks = [];
  const identities = [];
  const forbidden = [];
  let malformed = false;
  if (!/^BUILD SUCCESSFUL in .+$/m.test(output) || /BUILD FAILED/.test(output)) fail('NURI_AUXILIARY_DRY_RUN_INCOMPLETE');
  for (const line of output.split(/\r?\n/)) {
    const rendered = /^> Task ((?::[A-Za-z0-9_.-]+)+)(?: (?:UP-TO-DATE|NO-SOURCE|SKIPPED|FROM-CACHE))?$/.exec(line);
    if (!line.startsWith(':') && !rendered) {
      // Do not silently discard task-shaped output from a different/partial renderer.
      if (/^\s+:|^\s*> Task\b|^(?:[A-Za-z0-9_.-]+:)+[A-Za-z0-9_.-]+\s+(?:SKIPPED|UP-TO-DATE)$/.test(line)) {
        malformed = true;
        if (typeof onDiagnostic === 'function') onDiagnostic({ project: 'OTHER', category: 'UNRECOGNIZED_TASK_ROW' });
      }
      continue;
    }
    const match = /^((?::[A-Za-z0-9_.-]+)+) SKIPPED$/.exec(line);
    const native = nativeTaskRow(line);
    const task = match?.[1] || rendered?.[1] || native?.task;
    if (!task || task.length > 200) {
      const diagnostic = colonDiagnostic(line);
      if (typeof onDiagnostic === 'function') onDiagnostic(diagnostic);
      if (diagnostic.category !== 'UNRECOGNIZED_COLON_LINE') continue;
      malformed = true;
      continue;
    }
    const publicTask = native?.publicTask || task;
    identities.push(task);
    tasks.push(publicTask);
    if (typeof onTask === 'function') onTask(publicTask);
    if (native && typeof onDiagnostic === 'function') onDiagnostic(native.diagnostic);
    if (rendered && !isIncludedPluginCompile(task)) {
      malformed = true;
      if (typeof onDiagnostic === 'function') onDiagnostic({ project: 'OTHER', category: 'UNRECOGNIZED_TASK_ROW' });
    }
    if (task.startsWith(':app:')) {
      const name = task.slice(':app:'.length);
      const leaf = name.split(':').at(-1);
      const allowedProducer = ['assembleReleaseAndroidTest', 'packageReleaseAndroidTest',
        'bundleReleaseClassesToCompileJar', 'bundleReleaseClassesToRuntimeJar',
        // Installed RN 0.87.1 BundleHermesCTask: generated JS/assets/maps only, no APK/AAB.
        'createBundleReleaseJsAndAssets',
        // AGP MergeResources -> PACKAGED_RES (Directory), not PackageApplication.
        'packageReleaseResources', 'packageReleaseAndroidTestResources',
        // AGP ListingFileRedirectTask writes only the AndroidTest IDE redirect.
        'createReleaseAndroidTestApkListingFileRedirect'].includes(name) || !!native;
      // Exact allowlist avoids confusing packageReleaseAndroidTest with packageRelease.
      if (!allowedProducer && (/^(?:assemble|package|bundle|sign|install|publish|upload)/i.test(leaf) || /(?:apk|aab|bundle)/i.test(name))) {
        if (typeof onRejectedTask === 'function' && task.length <= 200) onRejectedTask(task);
        forbidden.push(task);
      }
    }
  }
  // Inspect the entire protected plan once, so an early diagnostic cannot hide
  // a later product packaging task. No partial plan is allowed to reach a build.
  if (forbidden.length) fail('NURI_AUXILIARY_PRODUCT_TASK_FORBIDDEN');
  if (malformed) fail('NURI_AUXILIARY_DRY_RUN_MALFORMED');
  if (!identities.includes(TASK) || !identities.includes(':app:packageReleaseAndroidTest') || new Set(identities).size !== identities.length) {
    fail('NURI_AUXILIARY_DRY_RUN_INCOMPLETE');
  }
  return tasks;
}

function runGradle(root, env, dryRun, children) {
  const { filteredEnvironment } = require('../secure-release-signing');
  const args = dryRun ? [...GRADLE_ARGUMENTS, '--dry-run'] : [...GRADLE_ARGUMENTS];
  return new Promise((resolve, reject) => {
    const record = { phase: dryRun ? 'dry-run' : 'build', exitCode: null, signal: null };
    children.push(record);
    const child = cp.spawn(path.join(root, 'android/gradlew'), args, {
      cwd: path.join(root, 'android'), env: filteredEnvironment(env), stdio: ['ignore', 'pipe', 'pipe'],
      timeout: dryRun ? 600000 : 3600000,
    });
    // Gradle/plugin diagnostics are untrusted and may echo more than signing inputs.
    // Keep only the dry-run graph in process memory; never print or persist raw streams.
    process.stderr.write(dryRun ? 'NURI_AUXILIARY_DRY_RUN_STARTED\n' : 'NURI_AUXILIARY_BUILD_STARTED\n');
    let output = '';
    let overflow = false;
    for (const [index, stream] of [child.stdout, child.stderr].entries()) {
      stream.setEncoding('utf8');
      stream.on('data', chunk => {
        if (dryRun && index === 0) {
          if (output.length + chunk.length > 4 * 1024 * 1024) overflow = true;
          else output += chunk;
        }
      });
    }
    child.on('error', () => reject(new Error('NURI_AUXILIARY_CHILD_FAILED')));
    child.on('close', (code, signal) => {
      record.exitCode = code;
      record.signal = signal || null;
      if (code !== 0 || signal || overflow) reject(new Error('NURI_AUXILIARY_CHILD_FAILED'));
      else resolve(output);
    });
  });
}

async function runAndroidAuxiliary(root, expectedHead, env) {
  if (env.NURI_INTERNAL_SIGNING_OPERATION !== 'walk-androidtest-only-v1') fail('NURI_AUXILIARY_OPERATION_INVALID');
  const source = requireAuxiliarySource(root, expectedHead);
  const before = productInventory(root);
  verifyExternalSigner(env);
  const parent = path.join(env.HOME, '.codex/nuri-walk-real-product-20261020/auxiliary-builds');
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(parent);
  // eslint-disable-next-line no-bitwise -- Evidence must stay owner-only, with no symlink redirect.
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o077) || fs.realpathSync(parent) !== parent) fail('NURI_AUXILIARY_EVIDENCE_UNSAFE');
  const directory = fs.mkdtempSync(path.join(parent, `${expectedHead.slice(0, 7)}-`));
  const receipt = { ...source, productApkSha256: PRODUCT_APK_SHA256, productBefore: before,
    children: [], tasks: [], rejectedTask: null, rejectedTasks: [], diagnostics: [], sourceUnchanged: false, productUnchanged: false, status: 'NOT_STARTED' };
  let failure;
  try {
    let graph = await runGradle(root, env, true, receipt.children);
    // Even task-like text must not persist a protected value echoed by a plugin.
    for (const [name, value] of Object.entries(env)) {
      if (name.startsWith('NURI_') && typeof value === 'string' && value) graph = graph.split(value).join('[REDACTED_INPUT]');
    }
    receipt.tasks = validateDryRun(graph, task => {
      if (receipt.rejectedTask === null) receipt.rejectedTask = task;
      receipt.rejectedTasks.push(task);
    }, diagnostic => {
      const previous = receipt.diagnostics.find(item => Object.keys(item).length === Object.keys(diagnostic).length + 1
        && Object.entries(diagnostic).every(([key, value]) => item[key] === value));
      if (previous) previous.count++;
      else receipt.diagnostics.push({ ...diagnostic, count: 1 });
    }, task => { receipt.tasks.push(task); });
    // Check again BEFORE the sole build: dry-run/configuration is not trusted to be inert.
    if (JSON.stringify(productInventory(root)) !== JSON.stringify(before)) fail('NURI_AUXILIARY_PRODUCT_ARTIFACT_CHANGED');
    requireAuxiliarySource(root, expectedHead);
    await runGradle(root, env, false, receipt.children);
    requireAuxiliarySource(root, expectedHead);
    receipt.status = 'BUILD_EXIT_ZERO';
  } catch (error) {
    failure = error instanceof Error && /^NURI_AUXILIARY_[A-Z_]+$/.test(error.message)
      ? error : new Error('NURI_AUXILIARY_FAILED');
    receipt.status = failure.message;
  } finally {
    try {
      receipt.sourceUnchanged = JSON.stringify(requireAuxiliarySource(root, expectedHead)) === JSON.stringify(source);
    } catch { receipt.sourceUnchanged = false; }
    if (!receipt.sourceUnchanged) {
      failure = new Error('NURI_AUXILIARY_SOURCE_CHANGED');
      receipt.status = failure.message;
    }
    try {
      receipt.productUnchanged = JSON.stringify(productInventory(root)) === JSON.stringify(before);
    } catch { receipt.productUnchanged = false; }
    if (!receipt.productUnchanged) {
      failure = new Error('NURI_AUXILIARY_PRODUCT_ARTIFACT_CHANGED');
      receipt.status = failure.message;
    }
    fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  }
  if (failure) throw failure;
}

// No standalone CLI or command/task parameter: only the protected same-client callback invokes this.
module.exports = { PRODUCT_APK_SHA256, requireAuxiliarySource, productInventory, validateDryRun, runAndroidAuxiliary };
if (require.main === module) {
  process.stderr.write('NURI_AUXILIARY_PROTECTED_CALLBACK_REQUIRED\n');
  process.exitCode = 2;
}
