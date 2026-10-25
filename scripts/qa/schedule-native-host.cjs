'use strict';
// Runs the real recurrence policy on the JVM without an APK, ADB or user data.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const output = process.argv[2];
if (!output || !path.isAbsolute(output) || !path.relative(root, output).startsWith('..' + path.sep)) throw Error('EXTERNAL_EVIDENCE_DIRECTORY_REQUIRED');
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}
function jar(group, name, version) {
  const matches = files(path.join(os.homedir(), '.gradle/caches/modules-2/files-2.1', group, name, version)).filter(file => file.endsWith('.jar') && !/-(sources|javadoc|all)\.jar$/.test(file));
  if (matches.length !== 1) throw Error('CACHED_HOST_TOOL_REQUIRED:' + name);
  return matches[0];
}
const tools = {
  compiler: jar('org.jetbrains.kotlin', 'kotlin-compiler-embeddable', '2.2.10'),
  stdlib: jar('org.jetbrains.kotlin', 'kotlin-stdlib', '2.2.10'),
  script: jar('org.jetbrains.kotlin', 'kotlin-script-runtime', '2.2.10'),
  coroutines: jar('org.jetbrains.kotlinx', 'kotlinx-coroutines-core-jvm', '1.8.0'),
  annotations: jar('org.jetbrains', 'annotations', '13.0'),
};
fs.mkdirSync(output, { recursive: true });
const classes = path.join(output, 'classes');
fs.mkdirSync(classes, { recursive: true });
const java = '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home/bin/java';
const main = name => path.join(root, 'android/app/src/main/java/com/nuri/notifications', name + '.kt');
const runtime = [classes, tools.stdlib, tools.annotations].join(path.delimiter);
const compile = cp.spawnSync(java, ['-cp', Object.values(tools).join(path.delimiter), 'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler', '-no-stdlib', '-no-reflect', '-jvm-target', '17', '-classpath', runtime, '-d', classes,
  main('ScheduleOccurrencePolicy'), main('ScheduleAlarmPresentation'), main('ScheduleAlarmState'), path.join(root, 'android/app/src/test/java/com/nuri/notifications/ScheduleOccurrencePolicyVerification.kt')], { cwd: root, encoding: 'utf8', timeout: 120000 });
fs.writeFileSync(path.join(output, 'compile.log'), (compile.stdout || '') + (compile.stderr || ''), { flag: 'wx' });
if (compile.status !== 0) { process.stderr.write(compile.stderr || 'COMPILE_FAILED'); process.exit(1); }
const result = cp.spawnSync(java, ['-cp', runtime, 'com.nuri.notifications.ScheduleOccurrencePolicyVerification'], { encoding: 'utf8', timeout: 120000 });
fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ status: result.status, stdout: result.stdout, stderr: result.stderr, adb: 0, apk: 0, userData: false }, null, 2), { flag: 'wx' });
process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
process.exitCode = result.status === 0 ? 0 : 1;
