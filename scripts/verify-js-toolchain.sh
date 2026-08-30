#!/usr/bin/env bash

# Install/build entrypoint에서 프로젝트가 승인한 Node/Yarn 조합만 통과시킨다.
# --test-* 옵션은 실제 런타임을 바꾸지 않는 negative/positive guard 테스트 전용이다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EXPECTED_NODE_VERSION="24.20.0"
EXPECTED_YARN_VERSION="3.6.4"
TEST_NODE_VERSION=""
TEST_YARN_VERSION=""

fail_gate() {
  printf '%s\n' "FAIL: $1" >&2
  exit 2
}

while (($# > 0)); do
  case "$1" in
    --test-node-version)
      (($# >= 2)) || fail_gate "--test-node-version requires a value"
      TEST_NODE_VERSION="$2"
      shift 2
      ;;
    --test-yarn-version)
      (($# >= 2)) || fail_gate "--test-yarn-version requires a value"
      TEST_YARN_VERSION="$2"
      shift 2
      ;;
    --help|-h)
      printf '%s\n' 'Usage: verify-js-toolchain.sh'
      printf '%s\n' 'NURI_TOOLCHAIN_GUARD_TEST=1 verify-js-toolchain.sh --test-node-version 25.0.0 --test-yarn-version 3.6.4'
      exit 0
      ;;
    *)
      fail_gate "unknown option: $1"
      ;;
  esac
done

if [[ -n "$TEST_NODE_VERSION" || -n "$TEST_YARN_VERSION" ]]; then
  [[ "${NURI_TOOLCHAIN_GUARD_TEST:-}" == "1" ]] \
    || fail_gate "test version overrides require NURI_TOOLCHAIN_GUARD_TEST=1"
fi

NODE_BIN="$(command -v node || true)"
YARN_BIN="$(command -v yarn || true)"
[[ -n "$NODE_BIN" ]] || fail_gate "node is unavailable"
[[ -n "$YARN_BIN" ]] || fail_gate "plain yarn is unavailable"

ACTUAL_NODE_VERSION="$(node --version 2>/dev/null || true)"
ACTUAL_YARN_VERSION="$(yarn --version 2>/dev/null || true)"
[[ -n "$ACTUAL_NODE_VERSION" ]] || fail_gate "node --version failed"
[[ -n "$ACTUAL_YARN_VERSION" ]] || fail_gate "yarn --version failed"

NODE_VERSION="${TEST_NODE_VERSION:-$ACTUAL_NODE_VERSION}"
YARN_VERSION="${TEST_YARN_VERSION:-$ACTUAL_YARN_VERSION}"
NODE_VERSION="${NODE_VERSION#v}"

PIN_FILE="$REPO_ROOT/.node-version"
[[ -f "$PIN_FILE" ]] || fail_gate ".node-version is missing"
PINNED_NODE_VERSION="$(tr -d '[:space:]' < "$PIN_FILE")"
[[ "$PINNED_NODE_VERSION" == "$EXPECTED_NODE_VERSION" ]] \
  || fail_gate ".node-version is not $EXPECTED_NODE_VERSION"

PACKAGE_MANAGER="$(node -p "require('$REPO_ROOT/package.json').packageManager || ''" 2>/dev/null || true)"
ENGINE_NODE="$(node -p "require('$REPO_ROOT/package.json').engines && require('$REPO_ROOT/package.json').engines.node || ''" 2>/dev/null || true)"
[[ "$PACKAGE_MANAGER" == "yarn@$EXPECTED_YARN_VERSION" ]] \
  || fail_gate "packageManager must be yarn@$EXPECTED_YARN_VERSION"
[[ "$ENGINE_NODE" == "$EXPECTED_NODE_VERSION" ]] \
  || fail_gate "package.json engines.node must be $EXPECTED_NODE_VERSION"
[[ "$NODE_VERSION" == "$EXPECTED_NODE_VERSION" ]] \
  || fail_gate "Node $NODE_VERSION is not the approved Node $EXPECTED_NODE_VERSION"
[[ "$YARN_VERSION" == "$EXPECTED_YARN_VERSION" ]] \
  || fail_gate "Yarn $YARN_VERSION is not the approved Yarn $EXPECTED_YARN_VERSION"

printf 'NODE_VERSION: v%s\n' "$NODE_VERSION"
printf 'NODE_PATH: %s\n' "$NODE_BIN"
printf 'YARN_VERSION: %s\n' "$YARN_VERSION"
printf 'YARN_PATH: %s\n' "$YARN_BIN"
printf 'PACKAGE_MANAGER: %s\n' "$PACKAGE_MANAGER"
printf 'NODE_PIN: %s\n' "$PINNED_NODE_VERSION"
printf 'NODE_ENGINE: %s\n' "$ENGINE_NODE"
printf '%s\n' 'VERDICT: PASS'
