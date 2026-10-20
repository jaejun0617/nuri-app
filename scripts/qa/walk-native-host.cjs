'use strict';
// Host-only Native verification. Cached tools, temporary outputs, no ADB or APK.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const cache = path.join(os.homedir(), '.gradle/caches/modules-2/files-2.1');
function files(directory) {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}
function jar(group, name, version) {
  const matches = files(path.join(cache, group, name, version)).filter(p => p.endsWith('.jar') && !/-(sources|javadoc|all)\.jar$/.test(p));
  if (matches.length !== 1) throw Error('CACHED_HOST_TOOL_REQUIRED:' + name);
  return matches[0];
}
const tools = {
  stdlib: jar('org.jetbrains.kotlin', 'kotlin-stdlib', '2.2.10'),
  junit: jar('junit', 'junit', '4.13.2'),
  hamcrest: jar('org.hamcrest', 'hamcrest-core', '1.3'),
  json: jar('org.json', 'json', '20180813'),
  compiler: jar('org.jetbrains.kotlin', 'kotlin-compiler-embeddable', '2.2.10'),
  script: jar('org.jetbrains.kotlin', 'kotlin-script-runtime', '2.2.10'),
  coroutines: jar('org.jetbrains.kotlinx', 'kotlinx-coroutines-core-jvm', '1.8.0'),
  annotations: jar('org.jetbrains', 'annotations', '13.0'),
};
const java = '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home/bin/java';
const mode = process.argv[2] || 'codec';
const output = process.argv[3];
if (!output || !path.isAbsolute(output) || !['codec', 'product', 'product-counterexamples'].includes(mode)) throw Error('HOST_OUTPUT_AND_MODE_REQUIRED');
if (!path.relative(root, output).startsWith('..' + path.sep)) throw Error('HOST_OUTPUT_MUST_BE_OUTSIDE_CHECKOUT');
const productMode = mode.startsWith('product');
fs.mkdirSync(output, {recursive: true});
const main = name => path.join(root, 'android/app/src/main/java/com/nuri/walk', name + '.kt');
const test = name => path.join(root, 'android/app/src/test/java/com/nuri/walk', name + '.kt');
const classes = path.join(output, 'classes');
fs.mkdirSync(classes, {recursive: true});
const extra = [];
if (productMode) extra.push(jar('org.xerial', 'sqlite-jdbc', '3.41.2.2'));
const runtimeClasspath = [classes, tools.stdlib, tools.junit, tools.hamcrest, tools.json, tools.annotations, ...extra].join(path.delimiter);
const sources = [main('WalkCodec'), main('WalkRuntimePolicy'), test('WalkProductCodecTest')];
const product = main('WalkProductJournal');
if (fs.existsSync(product)) sources.push(product, main('WalkDistanceEngineV1'));
let platform;
const testClasses = ['com.nuri.walk.WalkProductCodecTest'];
if (productMode) {
  platform = require('./walk-host-platform.cjs')(root, output);
  const entities = ['WalkLocalSession', 'WalkPointChunk', 'WalkCommandReceipt', 'WalkQaProtocol', 'WalkDao'].map(n => path.join(root, 'android/app/src/main/java/com/nuri/walk', n + '.java'));
  const javac = cp.spawnSync(java.replace(/java$/, 'javac'), ['-parameters', '-cp', runtimeClasspath, '-d', classes, ...platform.java, ...entities], {encoding: 'utf8', timeout: 120000});
  fs.writeFileSync(path.join(output, 'javac.log'), (javac.stdout || '') + (javac.stderr || ''));
  if (javac.status !== 0) { console.log('NATIVE_HOST_PLATFORM_COMPILE_FAIL'); process.exit(1); }
  sources.push(...platform.kotlin, ...['WalkCipher', 'WalkStorage', 'WalkProductStore', 'WalkDistanceCodec', 'WalkDistanceAndroid', 'WalkRouteProjection', 'WalkRuntime', 'WalkQaContract', 'WalkQaWorkflow'].map(main), test('WalkRuntimePolicyTest'), test('WalkCipherTest'), path.join(root, 'scripts/qa/native-host/WalkProductPersistenceTest.kt'));
  testClasses.push('com.nuri.walk.WalkRuntimePolicyTest', 'com.nuri.walk.WalkCipherTest', 'com.nuri.walk.WalkProductPersistenceTest', 'com.nuri.walk.WalkPersistenceTest');
}
if (mode === 'product-counterexamples') {
  // Deliberate test-only counterexamples of reviewed draft defects. Never write
  // these versions to the checkout or call their expected failure a final PASS.
  const changes = {
    WalkProductStore: text => text.replace('    fence()\n    // Journal', '    fence()\n    row.revision = Math.addExact(row.revision, 1)\n    // Journal')
      .replace('    return storage.transaction {\n      fence()\n      if (operation == "DELETE_ROUTE") eraseRoute(row)', '    if (operation == "DELETE_ROUTE") eraseRoute(row)\n    return storage.transaction {\n      fence()'),
    WalkRuntime: text => text.replace('sealActive(releaseProductSlot = true); owner = null', 'sealActive(releaseProductSlot = false); owner = null')
      .replace('if (meta.product != null && meta.owner != next) sealActive(releaseProductSlot = true)', 'if (meta.product != null && meta.owner != next) sealActive(releaseProductSlot = false)'),
    WalkProductJournal: text => {
      const begin = text.indexOf('        if (end <= start');
      const end = text.indexOf('\n        routeRevision', begin);
      if (begin < 0 || end < 0) throw Error('COUNTEREXAMPLE_ANCHOR_REQUIRED');
      return text.slice(0, begin) + text.slice(end);
    },
  };
  for (const [name, change] of Object.entries(changes)) {
    const input = main(name), before = fs.readFileSync(input, 'utf8'), after = change(before);
    if (before === after) throw Error('COUNTEREXAMPLE_NOT_APPLIED');
    const file = path.join(output, name + '.kt');
    fs.writeFileSync(file, after); sources.splice(sources.indexOf(input), 1, file);
  }
}
const compile = cp.spawnSync(java, ['-cp', Object.values(tools).join(path.delimiter), 'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler', '-no-stdlib', '-no-reflect', '-jvm-target', '17', '-classpath', runtimeClasspath, '-d', classes, ...sources], {encoding: 'utf8', cwd: root, timeout: 120000, maxBuffer: 4000000});
fs.writeFileSync(path.join(output, 'compile.log'), (compile.stdout || '') + (compile.stderr || ''));
if (compile.status !== 0) { console.log('NATIVE_HOST_COMPILE_FAIL'); process.exit(1); }
const hostData = fs.mkdtempSync(path.join(output, 'owned-test-data-'));
const result = cp.spawnSync(java, [...(platform ? ['-Dwalk.host.schema=' + platform.schemaFile, '-Dwalk.host.data=' + hostData] : []), '-cp', runtimeClasspath, 'org.junit.runner.JUnitCore', ...testClasses], {encoding: 'utf8', timeout: 120000, maxBuffer: 4000000});
fs.rmSync(hostData, {recursive: true, force: true});
fs.writeFileSync(path.join(output, 'tests.log'), (result.stdout || '') + (result.stderr || ''));
fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({mode, compiled: true, status: result.status, appDataAccess: false, realKeystoreAccess: false, adb: 0, apk: 0}, null, 2));
console.log((result.stdout || '') + (result.stderr || ''));
process.exitCode = result.status === 0 ? 0 : 1;
