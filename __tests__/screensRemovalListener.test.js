const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// Compile the installed upstream listener, not a JS reimplementation. The
// small RN value-type stubs isolate callback ownership from Fabric/JNI, which
// remain Android build and device gates.
it('preserves removals, callback ownership and concurrent teardown', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuri-screen-listener-'));
  const pkg = path.dirname(require.resolve('react-native-screens/package.json'));
  const include = path.join(dir, 'include');
  const headers = {
    'react/renderer/componentregistry/ComponentDescriptorFactory.h': '#pragma once\n',
    'react/renderer/mounting/ShadowView.h': `
#pragma once
#include <cstring>
#include <optional>
#include <vector>
namespace facebook::react {
using SurfaceId = int;
struct ShadowView { int tag; const char* componentName; };
struct ShadowViewMutation {
  enum class Type { Remove, Update };
  Type type;
  ShadowView oldChildShadowView;
};
using ShadowViewMutationList = std::vector<ShadowViewMutation>;
struct TransactionTelemetry {};
struct MountingTransaction {
  using Number = long;
  SurfaceId surface;
  Number number;
  ShadowViewMutationList mutations;
  TransactionTelemetry telemetry;
};
struct MountingOverrideDelegate {
  virtual bool shouldOverridePullTransaction() const = 0;
  virtual std::optional<MountingTransaction> pullTransaction(
      SurfaceId, MountingTransaction::Number, const TransactionTelemetry&,
      ShadowViewMutationList) const = 0;
  virtual ~MountingOverrideDelegate() = default;
};
}
`,
    'react/renderer/mounting/MountingOverrideDelegate.h': '#pragma once\n#include "ShadowView.h"\n',
    'react/renderer/mounting/ShadowViewMutation.h': '#pragma once\n#include "ShadowView.h"\n',
  };
  const source = `
#include "RNSScreenRemovalListener.h"
#include <atomic>
#include <cassert>
#include <memory>
#include <thread>

int main() {
  RNSScreenRemovalListener listener;
  const ShadowViewMutationList mutations{
    {ShadowViewMutation::Type::Remove, {42, "RNSScreen"}},
    {ShadowViewMutation::Type::Remove, {43, "View"}},
    {ShadowViewMutation::Type::Update, {44, "RNSScreen"}},
    {ShadowViewMutation::Type::Remove, {45, nullptr}},
  };
  const TransactionTelemetry telemetry;
  const auto pull = [&] {
    auto result = listener.pullTransaction(7, 11, telemetry, mutations);
    assert(result && result->surface == 7 && result->number == 11);
    assert(result->mutations.size() == mutations.size());
    for (size_t i = 0; i < mutations.size(); ++i) {
      assert(result->mutations[i].type == mutations[i].type);
      assert(result->mutations[i].oldChildShadowView.tag == mutations[i].oldChildShadowView.tag);
    }
  };
  pull(); // A disarmed delegate must not drop the transaction.
  int first = 0;
  auto firstToken = listener.setListener([&](int tag) { assert(tag == 42); ++first; });
  pull();
  assert(first == 1);
  int second = 0;
  auto secondToken = listener.setListener([&](int tag) { assert(tag == 42); ++second; });
  assert(secondToken > firstToken);
  listener.clearListener(firstToken);
  pull();
  assert(first == 1 && second == 1); // Old proxy cannot clear the new callback.
  listener.clearListener(secondToken);
  pull();
  assert(second == 1);

  auto resource = std::make_shared<int>(1);
  std::weak_ptr<int> weakResource = resource;
  auto resourceToken = listener.setListener([resource](int) {});
  resource.reset();
  assert(!weakResource.expired());
  listener.clearListener(resourceToken);
  assert(weakResource.expired()); // Teardown releases the captured reference.

  int reentered = 0;
  listener.setListener([&](int) {
    ++reentered;
    listener.setListener([](int) {}); // Must run outside listenerMutex_.
  });
  pull();
  assert(reentered == 1);

  std::atomic<int> callbacks{0};
  auto installAndClear = [&] {
    for (int i = 0; i < 2000; ++i) {
      auto token = listener.setListener([&](int tag) { assert(tag == 42); ++callbacks; });
      listener.clearListener(token);
    }
  };
  std::thread a(installAndClear), b(installAndClear);
  std::thread c([&] { for (int i = 0; i < 4000; ++i) pull(); });
  a.join(); b.join(); c.join();
  auto last = listener.setListener([&](int) { ++callbacks; });
  auto before = callbacks.load();
  pull();
  assert(callbacks.load() == before + 1);
  listener.clearListener(last);
}
`;
  try {
    for (const [name, contents] of Object.entries(headers)) {
      const file = path.join(include, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, contents);
    }
    const file = path.join(dir, 'listener-test.cpp');
    const binary = path.join(dir, 'listener-test');
    fs.writeFileSync(file, source);
    const platformIncludes = [];
    if (process.platform === 'darwin') {
      const sdk = execFileSync('xcrun', ['--show-sdk-path'], { encoding: 'utf8' }).trim();
      const standardLibrary = path.join(sdk, 'usr/include/c++/v1');
      if (fs.existsSync(standardLibrary)) platformIncludes.push('-isystem', standardLibrary);
    }
    execFileSync(process.env.CXX || 'c++', [
      '-std=c++20', '-pthread', '-O1', '-Wall', '-Wextra',
      ...platformIncludes,
      '-I', include, '-I', path.join(pkg, 'cpp'),
      file, path.join(pkg, 'cpp/RNSScreenRemovalListener.cpp'), '-o', binary,
    ], { timeout: 30000, stdio: 'pipe' });
    execFileSync(binary, [], { timeout: 5000, stdio: 'pipe' });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}, 40000);
