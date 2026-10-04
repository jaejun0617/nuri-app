#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const Module = require('node:module');
const ts = require('typescript');

const CONFIG_PATH = 'src/services/supabase/config.ts';
const FIELD_NAMES = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const fail = code => {
  throw new Error(code);
};
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const exec = (root, command, args) =>
  cp
    .execFileSync(command, args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    .trim();

function readLiteralConfig(source) {
  const ast = ts.createSourceFile(
    CONFIG_PATH,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const values = {};
  for (const statement of ast.statements) {
    if (
      !ts.isVariableStatement(statement) ||
      !statement.modifiers?.some(
        modifier => modifier.kind === ts.SyntaxKind.ExportKeyword,
      )
    ) {
      fail('NURI_INPUT_CONFIG_NOT_LITERAL');
    }
    for (const declaration of statement.declarationList.declarations) {
      if (
        !ts.isIdentifier(declaration.name) ||
        !declaration.initializer ||
        !ts.isStringLiteral(declaration.initializer) ||
        !FIELD_NAMES.includes(declaration.name.text) ||
        Object.hasOwn(values, declaration.name.text)
      ) {
        fail('NURI_INPUT_CONFIG_NOT_LITERAL');
      }
      values[declaration.name.text] = declaration.initializer.text;
    }
  }
  if (FIELD_NAMES.some(name => !values[name])) {
    fail('NURI_INPUT_CONFIG_MISSING');
  }
  return values;
}

function loadValidator(root) {
  const file = path.join(root, 'src/services/supabase/runtimeConfig.ts');
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const runtime = new Module(file, module);
  runtime.filename = file;
  runtime.paths = Module._nodeModulePaths(path.dirname(file));
  runtime._compile(compiled, file);
  return runtime.exports.validateSupabaseRuntimeConfig;
}

function relativeImports(root, files, declared) {
  const extensions = [
    '',
    '.android.ts',
    '.android.tsx',
    '.native.ts',
    '.native.tsx',
    '.ts',
    '.tsx',
    '.android.js',
    '.native.js',
    '.js',
    '.jsx',
    '.json',
  ];
  const undeclared = new Set();
  for (const file of files.filter(
    name =>
      /\.(tsx?|jsx?)$/.test(name) &&
      (name.startsWith('src/') || ['App.tsx', 'index.js'].includes(name)) &&
      !name.endsWith('.d.ts'),
  )) {
    const ast = ts.createSourceFile(
      file,
      fs.readFileSync(path.join(root, file), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    function inspect(node) {
      let specifier;
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        specifier = node.moduleSpecifier;
      } else if (
        ts.isCallExpression(node) &&
        ((ts.isIdentifier(node.expression) &&
          node.expression.text === 'require') ||
          node.expression.kind === ts.SyntaxKind.ImportKeyword)
      ) {
        specifier = node.arguments[0];
      }
      if (
        specifier &&
        ts.isStringLiteral(specifier) &&
        specifier.text.startsWith('.')
      ) {
        const base = path.resolve(root, path.dirname(file), specifier.text);
        const resolved = extensions
          .map(ext => base + ext)
          .concat(
            extensions.slice(1).map(ext => path.join(base, 'index' + ext)),
          )
          .find(
            candidate =>
              fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
          );
        if (!resolved) {
          fail(`NURI_IMPORT_MISSING:${file}:${specifier.text}`);
        }
        const relative = path
          .relative(root, resolved)
          .split(path.sep)
          .join('/');
        if (!files.includes(relative) && !declared.includes(relative)) {
          undeclared.add(relative);
        }
      }
      ts.forEachChild(node, inspect);
    }
    inspect(ast);
  }
  if (undeclared.size) {
    fail(`NURI_INPUT_UNDECLARED:${[...undeclared].join(',')}`);
  }
}

function prepareInputs(root, inputRoot, env) {
  const manifest = [];
  const configSource = path.join(inputRoot, CONFIG_PATH);
  const environmentProvided =
    env.NURI_SUPABASE_URL !== undefined ||
    env.NURI_SUPABASE_CLIENT_KEY !== undefined;
  const config = environmentProvided
    ? {
        SUPABASE_URL: env.NURI_SUPABASE_URL,
        SUPABASE_ANON_KEY: env.NURI_SUPABASE_CLIENT_KEY,
      }
    : readLiteralConfig(
        fs.existsSync(configSource)
          ? fs.readFileSync(configSource, 'utf8')
          : '',
      );
  loadValidator(root)(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  const configDestination = path.join(root, CONFIG_PATH);
  const generated =
    FIELD_NAMES.map(
      name => `export const ${name} = ${JSON.stringify(config[name])};`,
    ).join('\n') + '\n';
  if (environmentProvided || root !== inputRoot) {
    fs.mkdirSync(path.dirname(configDestination), { recursive: true });
    fs.writeFileSync(configDestination, generated, { mode: 0o600 });
  }
  manifest.push({
    role: 'Supabase client config',
    required: true,
    tracked: false,
    classification: 'PUBLIC_CLIENT_RUNTIME_CONFIG_PROTECTED_BY_POLICY',
    source: environmentProvided
      ? 'CI:NURI_SUPABASE_URL+NURI_SUPABASE_CLIENT_KEY'
      : configSource,
    destination: configDestination,
    sha256: sha(fs.readFileSync(configDestination)),
    fields: FIELD_NAMES.map(name => ({
      name,
      length: config[name].length,
      sha256: sha(config[name]),
    })),
  });

  function inject(relative, source, classification) {
    if (!fs.existsSync(source)) {
      fail(`NURI_INPUT_MISSING:${relative}`);
    }
    const destination = path.join(root, relative);
    if (source !== destination) {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
    }
    manifest.push({
      role: relative,
      required: true,
      tracked: false,
      classification,
      source,
      destination,
      sha256: sha(fs.readFileSync(destination)),
    });
  }
  // Explicit inputs only: no recursive copying of ignored files or the source tree.
  const store = env.NURI_UPLOAD_STORE_FILE || 'nuri-upload.keystore';
  if (path.basename(store) !== store) {
    fail('NURI_SIGNING_STORE_MUST_BE_APP_LOCAL');
  }
  inject(
    `android/app/${store}`,
    env.NURI_RELEASE_KEYSTORE_SOURCE ||
      path.join(inputRoot, 'android/app', store),
    'SECRET_SIGNING_MATERIAL',
  );
  inject(
    'android/local.properties',
    env.NURI_RELEASE_LOCAL_PROPERTIES_SOURCE ||
      path.join(inputRoot, 'android/local.properties'),
    'PROTECTED_BUILD_INPUT',
  );
  const properties = fs.readFileSync(
    path.join(root, 'android/local.properties'),
    'utf8',
  );
  const sdk =
    env.ANDROID_SDK_ROOT ||
    env.ANDROID_HOME ||
    /^sdk\.dir=(.+)$/m.exec(properties)?.[1];
  const maps =
    env.NURI_GOOGLE_MAPS_API_KEY ||
    /^NURI_GOOGLE_MAPS_API_KEY=(.+)$/m.exec(properties)?.[1];
  if (!sdk || !maps) {
    fail('NURI_SDK_OR_MAPS_INPUT_MISSING');
  }
  manifest.push({
    role: 'NURI_GOOGLE_MAPS_API_KEY',
    required: true,
    tracked: false,
    classification: 'RESTRICTED_PUBLIC_CLIENT_KEY',
    source: env.NURI_GOOGLE_MAPS_API_KEY
      ? 'CI_ENVIRONMENT'
      : 'android/local.properties',
    sha256: sha(maps),
  });
  const gradle = fs.readFileSync(
    path.join(root, 'android/build.gradle'),
    'utf8',
  );
  const buildTools = /buildToolsVersion\s*=\s*"([^"]+)"/.exec(gradle)?.[1];
  const platform = /compileSdkVersion\s*=\s*(\d+)/.exec(gradle)?.[1];
  const ndk = /ndkVersion\s*=\s*"([^"]+)"/.exec(gradle)?.[1];
  if (!buildTools || !platform || !ndk) {
    fail('NURI_ANDROID_TOOLCHAIN_UNDECLARED');
  }
  // The app uses the prebuilt ReactAndroid AAR, not ReactAndroid's source-build CMake.
  const cmake = '3.22.1';
  for (const item of [
    `build-tools/${buildTools}/aapt2`,
    `platforms/android-${platform}/android.jar`,
    `ndk/${ndk}/source.properties`,
    `cmake/${cmake}/bin/cmake`,
  ]) {
    if (!fs.existsSync(path.join(sdk, item))) {
      fail(`NURI_TOOLCHAIN_MISSING:${item}`);
    }
  }
  for (const name of [
    'NURI_UPLOAD_STORE_PASSWORD',
    'NURI_UPLOAD_KEY_ALIAS',
    'NURI_UPLOAD_KEY_PASSWORD',
  ]) {
    manifest.push({
      role: name,
      required: true,
      tracked: false,
      classification: 'SECRET_SIGNING_PROPERTY',
      source: env[name] ? 'CI_ENVIRONMENT' : 'EXPLICIT_QA_GRADLE_DEFAULT',
      sha256: env[name] ? sha(env[name]) : null,
    });
  }
  const google = 'android/app/google-services.json';
  if (!fs.existsSync(path.join(root, google))) {
    fail('NURI_GOOGLE_SERVICES_MISSING');
  }
  manifest.push({
    role: google,
    required: true,
    tracked: true,
    classification: 'PUBLIC_CLIENT_DESCRIPTOR',
    sha256: sha(fs.readFileSync(path.join(root, google))),
  });
  return {
    manifest,
    android: { sdk, buildTools, platform, ndk, cmake },
    declared: [CONFIG_PATH, `android/app/${store}`, 'android/local.properties'],
  };
}

function main(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    if (
      !['--root', '--input-root', '--manifest', '--bundle-dir'].includes(
        args[index],
      ) ||
      !args[index + 1]
    ) {
      fail('NURI_PREFLIGHT_ARGUMENT_INVALID');
    }
    options[args[index]] = args[index + 1];
  }
  const root = fs.realpathSync(options['--root'] || path.join(__dirname, '..'));
  const inputRoot = fs.realpathSync(
    options['--input-root'] || process.env.NURI_RELEASE_INPUT_ROOT || root,
  );
  const manifestPath =
    options['--manifest'] || process.env.NURI_RELEASE_INPUT_MANIFEST;
  const bundleDir =
    options['--bundle-dir'] || process.env.NURI_RELEASE_PREFLIGHT_DIR;
  if (!manifestPath || !bundleDir) {
    fail('NURI_PREFLIGHT_OUTPUT_PATHS_REQUIRED');
  }
  if (exec(root, 'git', ['status', '--short'])) {
    fail('NURI_RC_TRACKED_OR_UNTRACKED_DIRTY');
  }
  const head = exec(root, 'git', ['rev-parse', 'HEAD']);
  const packageConfig = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
  );
  const node = process.versions.node;
  const yarn = exec(root, 'yarn', ['--version']);
  if (
    node !== packageConfig.engines.node ||
    `yarn@${yarn}` !== packageConfig.packageManager
  ) {
    fail('NURI_JS_TOOLCHAIN_VERSION_MISMATCH');
  }
  const inputs = prepareInputs(root, inputRoot, process.env);
  const java = cp.spawnSync(
    process.env.JAVA_HOME
      ? path.join(process.env.JAVA_HOME, 'bin/java')
      : 'java',
    ['-version'],
    { encoding: 'utf8' },
  );
  const javaVersion = /version "([^"]+)"/.exec(java.stderr || '')?.[1];
  if (java.status !== 0 || !javaVersion?.startsWith('17.')) {
    fail('NURI_JAVA_TOOLCHAIN_VERSION_MISMATCH');
  }
  const signer = process.env.NURI_APPROVED_SIGNER_SHA256;
  if (!signer || !/^[a-fA-F0-9]{64}$/.test(signer)) {
    fail('NURI_SIGNER_FINGERPRINT_REQUIRED');
  }
  const files = exec(root, 'git', ['ls-files', '-z'])
    .split('\0')
    .filter(Boolean);
  relativeImports(root, files, inputs.declared);
  const appGradle = fs.readFileSync(
    path.join(root, 'android/app/build.gradle'),
    'utf8',
  );
  const version = {
    package: /applicationId\s+"([^"]+)"/.exec(appGradle)?.[1],
    code: Number(/versionCode\s+(\d+)/.exec(appGradle)?.[1]),
    name: /versionName\s+"([^"]+)"/.exec(appGradle)?.[1],
  };
  if (
    version.package !== 'com.nuri.app' ||
    !version.code ||
    !version.name ||
    !/signingConfig signingConfigs\.release/.test(appGradle)
  ) {
    fail('NURI_RELEASE_CONFIG_INVALID');
  }
  if (exec(root, 'git', ['status', '--short'])) {
    fail('NURI_INJECTION_POLLUTED_SOURCE');
  }
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.mkdirSync(bundleDir, { recursive: true });
  const result = {
    sourceHead: head,
    node,
    yarn,
    java: javaVersion,
    expectedSignerCertificateSha256: signer.toLowerCase(),
    android: inputs.android,
    version,
    inputs: inputs.manifest,
    undeclaredRequiredInputs: [],
    contentLogged: false,
    releaseEnvFile: 'NOT_USED',
    inputPreflight: 'PASS',
    jsBundlePreflight: 'PENDING',
  };
  fs.writeFileSync(manifestPath, JSON.stringify(result, null, 2) + '\n');
  const bundlePath = path.join(bundleDir, 'index.android.bundle');
  const bundled = cp.spawnSync(
    process.execPath,
    [
      path.join(root, 'node_modules/react-native/cli.js'),
      'bundle',
      '--platform',
      'android',
      '--dev',
      'false',
      '--entry-file',
      'index.js',
      '--bundle-output',
      bundlePath,
      '--assets-dest',
      path.join(bundleDir, 'assets'),
      '--max-workers',
      '2',
    ],
    { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  // Preserve build diagnostics without printing any deployment file content.
  fs.writeFileSync(
    path.join(bundleDir, 'bundle.log'),
    (bundled.stdout || '') + (bundled.stderr || ''),
  );
  result.jsBundlePreflight =
    bundled.status === 0 && fs.existsSync(bundlePath) ? 'PASS' : 'FAIL';
  result.bundleSha256 =
    result.jsBundlePreflight === 'PASS'
      ? sha(fs.readFileSync(bundlePath))
      : null;
  fs.writeFileSync(manifestPath, JSON.stringify(result, null, 2) + '\n');
  if (result.jsBundlePreflight !== 'PASS') {
    fail('NURI_RELEASE_JS_BUNDLE_FAILED');
  }
  console.log(
    `DEPLOYMENT_INPUT_PREFLIGHT: PASS\nJS_BUNDLE_PREFLIGHT: PASS\nSOURCE_HEAD: ${head}\nMANIFEST: ${manifestPath}`,
  );
}

module.exports = {
  readLiteralConfig,
  relativeImports,
  prepareInputs,
  loadValidator,
};
if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(
      error instanceof Error && error.message.startsWith('NURI_')
        ? error.message
        : 'NURI_PREFLIGHT_FAILED',
    );
    process.exitCode = 2;
  }
}
