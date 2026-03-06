const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const jniDir = path.join(
  projectRoot,
  'node_modules',
  '@react-native-community',
  'geolocation',
  'android',
  'build',
  'generated',
  'source',
  'codegen',
  'jni',
);
const cmakeFile = path.join(jniDir, 'CMakeLists.txt');
const cppFile = path.join(jniDir, 'RNCGeolocationSpec-empty.cpp');
const headerFile = path.join(jniDir, 'RNCGeolocationSpec.h');

const cmakeContents = `cmake_minimum_required(VERSION 3.13)
set(CMAKE_VERBOSE_MAKEFILE on)

add_library(
  react_codegen_RNCGeolocationSpec
  OBJECT
  RNCGeolocationSpec-empty.cpp
)

target_link_libraries(
  react_codegen_RNCGeolocationSpec
  fbjni
  jsi
  reactnative
)

target_include_directories(react_codegen_RNCGeolocationSpec PUBLIC .)
target_compile_reactnative_options(react_codegen_RNCGeolocationSpec PRIVATE)
`;

const headerContents = `/**
 * Generated stub for RN 0.84 Android autolinking.
 * This package declares codegenConfig but does not emit Android JNI sources.
 */

#pragma once

#include <ReactCommon/JavaTurboModule.h>
#include <ReactCommon/TurboModule.h>
#include <jsi/jsi.h>

namespace facebook::react {

class JSI_EXPORT NativeRNCGeolocationSpecJSI : public JavaTurboModule {
public:
  explicit NativeRNCGeolocationSpecJSI(const JavaTurboModule::InitParams &params);
};

JSI_EXPORT
std::shared_ptr<TurboModule> RNCGeolocationSpec_ModuleProvider(
    const std::string &moduleName,
    const JavaTurboModule::InitParams &params);

} // namespace facebook::react
`;

const cppContents = `#include "RNCGeolocationSpec.h"

namespace facebook::react {

NativeRNCGeolocationSpecJSI::NativeRNCGeolocationSpecJSI(
    const JavaTurboModule::InitParams &params)
    : JavaTurboModule(params) {}

std::shared_ptr<TurboModule> RNCGeolocationSpec_ModuleProvider(
    const std::string &moduleName,
    const JavaTurboModule::InitParams &params) {
  (void)moduleName;
  (void)params;
  return nullptr;
}

} // namespace facebook::react
`;

fs.mkdirSync(jniDir, { recursive: true });
fs.writeFileSync(cmakeFile, cmakeContents);
fs.writeFileSync(headerFile, headerContents);
fs.writeFileSync(cppFile, cppContents);

console.log(
  '[postinstall] ensured geolocation codegen JNI stub at',
  path.relative(projectRoot, cmakeFile),
);
