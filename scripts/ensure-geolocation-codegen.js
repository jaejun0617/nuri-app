const fs = require('fs');
const path = require('path');

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
