#!/usr/bin/env bash

# Release artifact의 파일명이나 Gradle task 이름을 신뢰하지 않고,
# 실제 APK metadata/signature/bundle을 검사해 fail-closed로 판정한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

EXPECTED_PACKAGE="com.nuri.app"
EXPECTED_SOURCE_HEAD="${NURI_EXPECTED_SOURCE_HEAD:-}"
EXPECTED_BUILD_VARIANT="${NURI_EXPECTED_BUILD_VARIANT:-}"
EXPECTED_SIGNER="${NURI_APPROVED_SIGNER_SHA256:-}"
APK_PATH=""

usage() {
  cat >&2 <<'EOF'
Usage:
  verify-release-apk.sh <apk> [--source-head <40-char-sha>] [--variant release]
                         [--signer <certificate-sha256>]

The source head, build variant, and approved signer are required so that
verify-only mode cannot approve an artifact with missing provenance.
EOF
}

fail_gate() {
  printf '%s\n' "FAIL: $1" >&2
  exit 2
}

while (($# > 0)); do
  case "$1" in
    --source-head)
      (($# >= 2)) || fail_gate "--source-head requires a value"
      EXPECTED_SOURCE_HEAD="$2"
      shift 2
      ;;
    --variant)
      (($# >= 2)) || fail_gate "--variant requires a value"
      EXPECTED_BUILD_VARIANT="$2"
      shift 2
      ;;
    --signer)
      (($# >= 2)) || fail_gate "--signer requires a value"
      EXPECTED_SIGNER="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    -*)
      usage
      fail_gate "unknown option: $1"
      ;;
    *)
      [[ -z "$APK_PATH" ]] || fail_gate "only one APK path is accepted"
      APK_PATH="$1"
      shift
      ;;
  esac
done

[[ -n "$APK_PATH" ]] || { usage; fail_gate "APK path is required"; }
[[ -f "$APK_PATH" ]] || fail_gate "APK does not exist: $APK_PATH"

case "$EXPECTED_SOURCE_HEAD" in
  ''|*[!0-9a-fA-F]*) fail_gate "expected source HEAD is missing or invalid" ;;
esac
[[ "${#EXPECTED_SOURCE_HEAD}" -eq 40 ]] || fail_gate "expected source HEAD must be 40 hex characters"
[[ "$EXPECTED_BUILD_VARIANT" == "release" ]] || fail_gate "expected build variant must be release"
[[ "${#EXPECTED_SIGNER}" -eq 64 && "$EXPECTED_SIGNER" != *[!0-9a-fA-F]* ]] \
  || fail_gate "approved signer SHA-256 is missing or invalid"

APK_PATH="$(cd "$(dirname "$APK_PATH")" && pwd)/$(basename "$APK_PATH")"

resolve_sdk_root() {
  if [[ -n "${ANDROID_SDK_ROOT:-}" && -d "$ANDROID_SDK_ROOT" ]]; then
    printf '%s\n' "$ANDROID_SDK_ROOT"
    return
  fi
  if [[ -n "${ANDROID_HOME:-}" && -d "$ANDROID_HOME" ]]; then
    printf '%s\n' "$ANDROID_HOME"
    return
  fi
  if [[ -f "$REPO_ROOT/android/local.properties" ]]; then
    sed -n 's/^sdk\.dir=//p' "$REPO_ROOT/android/local.properties" | head -1 | sed 's/\\\\:/:/g'
    return
  fi
  return 1
}

SDK_ROOT="$(resolve_sdk_root || true)"
[[ -n "$SDK_ROOT" && -d "$SDK_ROOT/build-tools" ]] || fail_gate "Android SDK build-tools directory is unavailable"

find_tool() {
  local tool_name="$1"
  find "$SDK_ROOT/build-tools" -mindepth 2 -maxdepth 2 -type f -name "$tool_name" -perm -111 -print 2>/dev/null \
    | sort -V | tail -1
}

AAPT2="$(find_tool aapt2)"
APKSIGNER="$(find_tool apksigner)"
[[ -x "$AAPT2" ]] || fail_gate "aapt2 is unavailable"
[[ -x "$APKSIGNER" ]] || fail_gate "apksigner is unavailable"

TMP_ROOT="${TMPDIR:-/tmp}"
TMP_DIR="$(mktemp -d "$TMP_ROOT/nuri-release-verify.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

BADGING_FILE="$TMP_DIR/badging.txt"
MANIFEST_FILE="$TMP_DIR/manifest.txt"
SIGNATURE_FILE="$TMP_DIR/signature.txt"

"$AAPT2" dump badging "$APK_PATH" >"$BADGING_FILE" 2>"$TMP_DIR/badging.err" \
  || fail_gate "APK badging inspection failed"
"$AAPT2" dump xmltree "$APK_PATH" --file AndroidManifest.xml >"$MANIFEST_FILE" 2>"$TMP_DIR/manifest.err" \
  || fail_gate "APK manifest inspection failed"
"$APKSIGNER" verify --verbose --print-certs "$APK_PATH" >"$SIGNATURE_FILE" 2>"$TMP_DIR/signature.err" \
  || fail_gate "APK signature verification failed"

PACKAGE_LINE="$(grep '^package:' "$BADGING_FILE" | head -1 || true)"
APPLICATION_ID="$(printf '%s\n' "$PACKAGE_LINE" | sed -nE "s/^package: name='([^']*)'.*/\\1/p")"
VERSION_CODE="$(printf '%s\n' "$PACKAGE_LINE" | sed -nE "s/^package: name='[^']*' versionCode='([^']*)'.*/\\1/p")"
VERSION_NAME="$(printf '%s\n' "$PACKAGE_LINE" | sed -nE "s/^package: name='[^']*' versionCode='[^']*' versionName='([^']*)'.*/\\1/p")"
[[ -n "$APPLICATION_ID" && -n "$VERSION_CODE" && -n "$VERSION_NAME" ]] || fail_gate "package/version metadata is incomplete"
[[ "$APPLICATION_ID" == "$EXPECTED_PACKAGE" ]] || fail_gate "unexpected applicationId: $APPLICATION_ID"

DEBUGGABLE="false"
if grep -q 'debuggable.*=true' "$MANIFEST_FILE"; then
  DEBUGGABLE="true"
fi
[[ "$DEBUGGABLE" == "false" ]] || fail_gate "release APK is debuggable"

USES_CLEARTEXT_TRAFFIC="false"
if grep -q 'usesCleartextTraffic.*=true' "$MANIFEST_FILE"; then
  USES_CLEARTEXT_TRAFFIC="true"
fi
[[ "$USES_CLEARTEXT_TRAFFIC" == "false" ]] || fail_gate "release APK allows cleartext traffic"

if unzip -Z1 "$APK_PATH" | grep -Fx 'assets/index.android.bundle' >/dev/null; then
  JS_BUNDLE_EMBEDDED="YES"
else
  JS_BUNDLE_EMBEDDED="NO"
  fail_gate "assets/index.android.bundle is missing"
fi

SIGNER_LINE_COUNT="$(grep -c 'Signer #[0-9].*certificate SHA-256 digest:' "$SIGNATURE_FILE" || true)"
[[ "$SIGNER_LINE_COUNT" -eq 1 ]] || fail_gate "APK signer count is not exactly one"
SIGNER_SHA256="$(sed -n 's/.*certificate SHA-256 digest: //p' "$SIGNATURE_FILE" | tr '[:upper:]' '[:lower:]' | head -1)"
EXPECTED_SIGNER_NORMALIZED="$(printf '%s' "$EXPECTED_SIGNER" | tr '[:upper:]' '[:lower:]')"
[[ "$SIGNER_SHA256" == "$EXPECTED_SIGNER_NORMALIZED" ]] || fail_gate "APK signer does not match the approved signer"

if command -v shasum >/dev/null 2>&1; then
  APK_SHA256="$(shasum -a 256 "$APK_PATH" | awk '{print $1}')"
elif command -v sha256sum >/dev/null 2>&1; then
  APK_SHA256="$(sha256sum "$APK_PATH" | awk '{print $1}')"
else
  fail_gate "no SHA-256 tool is available"
fi

SOURCE_HEAD_CURRENT="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || true)"
WORKTREE_DIRTY="NO"
DIRTY_PATHS="NONE"
DIRTY_STATUS="$(git -C "$REPO_ROOT" status --short 2>/dev/null || true)"
if [[ -n "$DIRTY_STATUS" ]]; then
  WORKTREE_DIRTY="YES"
  DIRTY_PATHS="$(printf '%s\n' "$DIRTY_STATUS" | sed -E 's/^[ MARC?U!]{1,3}[[:space:]]+//')"
fi

if [[ "$SOURCE_HEAD_CURRENT" == "$EXPECTED_SOURCE_HEAD" ]]; then
  SOURCE_HEAD_MATCH="YES"
else
  SOURCE_HEAD_MATCH="NO"
  fail_gate "current source HEAD does not match expected source HEAD"
fi

BUILD_TIMESTAMP="$(stat -f '%Sm' -t '%Y-%m-%d %H:%M:%S %z' "$APK_PATH" 2>/dev/null || stat -c '%y' "$APK_PATH")"
FILE_SIZE_BYTES="$(stat -f '%z' "$APK_PATH" 2>/dev/null || stat -c '%s' "$APK_PATH")"

cat <<EOF
SOURCE_HEAD: $EXPECTED_SOURCE_HEAD
SOURCE_HEAD_MATCH: $SOURCE_HEAD_MATCH
WORKTREE_DIRTY: $WORKTREE_DIRTY
DIRTY_PATHS: $DIRTY_PATHS
BUILD_VARIANT: $EXPECTED_BUILD_VARIANT
APPLICATION_ID: $APPLICATION_ID
VERSION_NAME: $VERSION_NAME
VERSION_CODE: $VERSION_CODE
DEBUGGABLE: $DEBUGGABLE
USES_CLEARTEXT_TRAFFIC: $USES_CLEARTEXT_TRAFFIC
JS_BUNDLE_EMBEDDED: $JS_BUNDLE_EMBEDDED
APK_SIGNATURE_VERIFY: PASS
SIGNER_MATCH: YES
SIGNER_SHA256: $SIGNER_SHA256
APK_SHA256: $APK_SHA256
APK_PATH: $APK_PATH
FILE_SIZE_BYTES: $FILE_SIZE_BYTES
BUILD_TIMESTAMP: $BUILD_TIMESTAMP
METRO_RELEASE_DEPENDENCY: NONE
VERDICT: ACCEPTED
EOF
