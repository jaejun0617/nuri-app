const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('canonical Store release explicitly disables QA and only qa mode enables it', () => {
  expect(read('scripts/build-android-release.sh')).toMatch(/export ORG_GRADLE_PROJECT_nuriSecurityQa=false\nif \[\[ "\$MODE" == "qa" \]\]; then\n {2}export ORG_GRADLE_PROJECT_nuriSecurityQa=true\nfi/);
  expect(read('android/app/build.gradle')).toContain('(project.findProperty("nuriSecurityQa") == "true").toString()');
  expect(read('android/app/src/main/java/com/nuri/qa/SecurityQaPackage.kt')).toContain('if (BuildConfig.NURI_SECURITY_QA)');
  expect(read('src/services/securityQa/config.ts')).toContain('module?.enabled === true');
});

test('native image fixture has no credential, file, arbitrary command or networking API', () => {
  const source = read('android/app/src/main/java/com/nuri/qa/SecurityQaPackage.kt');
  expect(source).not.toMatch(/java\.io\.File|Runtime\.getRuntime|ProcessBuilder|HttpURLConnection|SharedPreferences/);
  expect(source).toContain('Bitmap.createBitmap(16, 16');
});
