const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const specs = [
  {
    packagePath: [
      'node_modules',
      '@react-native-community',
      'geolocation',
      'android',
      'build',
      'generated',
      'source',
      'codegen',
      'jni',
    ],
    specName: 'RNCGeolocationSpec',
  },
  {
    packagePath: [
      'node_modules',
      '@react-native-kakao',
      'core',
      'android',
      'build',
      'generated',
      'source',
      'codegen',
      'jni',
    ],
    specName: 'RNCKakaoCoreSpec',
  },
  {
    packagePath: [
      'node_modules',
      '@react-native-kakao',
      'map',
      'android',
      'build',
      'generated',
      'source',
      'codegen',
      'jni',
    ],
    specName: 'RNCKakaoMapSpec',
  },
];

const kakaoPackages = [
  {
    name: '@react-native-kakao/core',
    packageDir: path.join(
      projectRoot,
      'node_modules',
      '@react-native-kakao',
      'core',
    ),
  },
  {
    name: '@react-native-kakao/map',
    packageDir: path.join(
      projectRoot,
      'node_modules',
      '@react-native-kakao',
      'map',
    ),
  },
];

function buildCMakeContents(specName) {
  return `cmake_minimum_required(VERSION 3.13)
set(CMAKE_VERBOSE_MAKEFILE on)

add_library(
  react_codegen_${specName}
  OBJECT
  ${specName}-empty.cpp
)

target_link_libraries(
  react_codegen_${specName}
  fbjni
  jsi
  reactnative
)

target_include_directories(react_codegen_${specName} PUBLIC .)
target_compile_reactnative_options(react_codegen_${specName} PRIVATE)
`;
}

function buildKakaoGeneratedCMakeContents(specName) {
  const componentDir =
    specName === 'RNCKakaoMapSpec'
      ? ` react/renderer/components/${specName}/*.cpp`
      : '';

  return `# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

cmake_minimum_required(VERSION 3.13)
set(CMAKE_VERBOSE_MAKEFILE on)

file(GLOB react_codegen_SRCS CONFIGURE_DEPENDS *.cpp${componentDir})

add_library(
  react_codegen_${specName}
  OBJECT
  \${react_codegen_SRCS}
)

target_include_directories(
  react_codegen_${specName}
  PUBLIC
  .
${specName === 'RNCKakaoMapSpec' ? `  react/renderer/components/${specName}` : ''}
)

target_link_libraries(
  react_codegen_${specName}
  fbjni
  jsi
  reactnative
)

target_compile_reactnative_options(react_codegen_${specName} PRIVATE)
`;
}

function buildHeaderContents(specName) {
  return `/**
 * Generated stub for RN 0.84 Android autolinking.
 * This package declares codegenConfig but does not emit Android JNI sources.
 */

#pragma once

#include <ReactCommon/JavaTurboModule.h>
#include <ReactCommon/TurboModule.h>
#include <jsi/jsi.h>

namespace facebook::react {

class JSI_EXPORT Native${specName}JSI : public JavaTurboModule {
public:
  explicit Native${specName}JSI(const JavaTurboModule::InitParams &params);
};

JSI_EXPORT
std::shared_ptr<TurboModule> ${specName}_ModuleProvider(
    const std::string &moduleName,
    const JavaTurboModule::InitParams &params);

} // namespace facebook::react
`;
}

function buildCppContents(specName) {
  return `#include "${specName}.h"

namespace facebook::react {

Native${specName}JSI::Native${specName}JSI(
    const JavaTurboModule::InitParams &params)
    : JavaTurboModule(params) {}

std::shared_ptr<TurboModule> ${specName}_ModuleProvider(
    const std::string &moduleName,
    const JavaTurboModule::InitParams &params) {
  (void)moduleName;
  (void)params;
  return nullptr;
}

} // namespace facebook::react
`;
}

function pathExists(targetPath) {
  return fs.existsSync(targetPath);
}

function copyRecursive(sourcePath, targetPath) {
  const sourceStat = fs.statSync(sourcePath);

  if (sourceStat.isDirectory()) {
    fs.mkdirSync(targetPath, { recursive: true });
    for (const entry of fs.readdirSync(sourcePath)) {
      copyRecursive(
        path.join(sourcePath, entry),
        path.join(targetPath, entry),
      );
    }
    return;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}
function generateKakaoCodegenArtifacts({ name, packageDir }) {
  if (!pathExists(packageDir)) {
    return;
  }

  const reactNativeScript = path.join(
    projectRoot,
    'node_modules',
    'react-native',
    'scripts',
    'generate-codegen-artifacts.js',
  );
  const outputDir = path.join(
    packageDir,
    'android',
    'build',
    'generated',
    'source',
    'codegen',
  );

  execFileSync(
    'node',
    [
      reactNativeScript,
      '-p',
      packageDir,
      '-t',
      'android',
      '-o',
      outputDir,
      '-s',
      'library',
    ],
    {
      cwd: projectRoot,
      stdio: 'pipe',
    },
  );

  const nestedOutputDir = path.join(
    outputDir,
    'android',
    'app',
    'build',
    'generated',
    'source',
    'codegen',
  );

  if (!pathExists(nestedOutputDir)) {
    return;
  }

  const nestedJniDir = path.join(nestedOutputDir, 'jni');
  const nestedJavaDir = path.join(nestedOutputDir, 'java');
  const finalJniDir = path.join(outputDir, 'jni');
  const finalJavaDir = path.join(outputDir, 'java');
  const specName = name.endsWith('/map')
    ? 'RNCKakaoMapSpec'
    : 'RNCKakaoCoreSpec';

  if (pathExists(nestedJniDir)) {
    copyRecursive(nestedJniDir, finalJniDir);
  }

  if (pathExists(nestedJavaDir)) {
    copyRecursive(nestedJavaDir, finalJavaDir);
  }

  fs.writeFileSync(
    path.join(finalJniDir, 'CMakeLists.txt'),
    buildKakaoGeneratedCMakeContents(specName),
  );

  const stubCppPath = path.join(finalJniDir, `${specName}-empty.cpp`);
  if (pathExists(stubCppPath)) {
    fs.rmSync(stubCppPath);
  }

  const unrelatedSpecName =
    specName === 'RNCKakaoMapSpec'
      ? 'RNCKakaoCoreSpec'
      : 'RNCKakaoMapSpec';
  const unrelatedCppPath = path.join(
    finalJniDir,
    `${unrelatedSpecName}-generated.cpp`,
  );
  const unrelatedHeaderPath = path.join(finalJniDir, `${unrelatedSpecName}.h`);
  const unrelatedComponentDir = path.join(
    finalJniDir,
    'react',
    'renderer',
    'components',
    unrelatedSpecName,
  );

  if (pathExists(unrelatedCppPath)) {
    fs.rmSync(unrelatedCppPath);
  }
  if (pathExists(unrelatedHeaderPath)) {
    fs.rmSync(unrelatedHeaderPath);
  }
  if (pathExists(unrelatedComponentDir)) {
    fs.rmSync(unrelatedComponentDir, { recursive: true, force: true });
  }

  console.log(
    '[postinstall] generated Kakao codegen artifacts for',
    name,
    'at',
    path.relative(projectRoot, outputDir),
  );
}

for (const spec of specs) {
  const jniDir = path.join(projectRoot, ...spec.packagePath);
  const cmakeFile = path.join(jniDir, 'CMakeLists.txt');
  const cppFile = path.join(jniDir, `${spec.specName}-empty.cpp`);
  const headerFile = path.join(jniDir, `${spec.specName}.h`);

  fs.mkdirSync(jniDir, { recursive: true });
  fs.writeFileSync(cmakeFile, buildCMakeContents(spec.specName));
  fs.writeFileSync(headerFile, buildHeaderContents(spec.specName));
  fs.writeFileSync(cppFile, buildCppContents(spec.specName));

  console.log(
    '[postinstall] ensured codegen JNI stub at',
    path.relative(projectRoot, cmakeFile),
  );
}

for (const kakaoPackage of kakaoPackages) {
  generateKakaoCodegenArtifacts(kakaoPackage);
}
