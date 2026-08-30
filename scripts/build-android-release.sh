#!/usr/bin/env bash

# QA와 Store release intent를 명시적으로 분리하고,
# 동일한 assembleRelease 결과를 static verifier로 fail-closed 검증한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VERIFY_SCRIPT="$SCRIPT_DIR/verify-release-apk.sh"
EXPECTED_SIGNER="${NURI_APPROVED_SIGNER_SHA256:-}"
MODE="${1:-}"

[[ "$MODE" == "qa" || "$MODE" == "store" ]] || {
  printf '%s\n' 'Usage: build-android-release.sh <qa|store>' >&2
  exit 2
}

[[ -x "$VERIFY_SCRIPT" ]] || {
  printf '%s\n' "Verifier is not executable: $VERIFY_SCRIPT" >&2
  exit 2
}

if [[ "$MODE" == "store" ]]; then
  # Store path는 protected signing input 없이는 절대 fallback하지 않는다.
  for required_name in \
    NURI_UPLOAD_STORE_FILE \
    NURI_UPLOAD_STORE_PASSWORD \
    NURI_UPLOAD_KEY_ALIAS \
    NURI_UPLOAD_KEY_PASSWORD; do
    if [[ -z "${!required_name:-}" ]]; then
      printf 'FAIL: missing protected signing input: %s\n' "$required_name" >&2
      exit 2
    fi
  done
fi

[[ "${#EXPECTED_SIGNER}" -eq 64 && "$EXPECTED_SIGNER" != *[!0-9a-fA-F]* ]] || {
  printf '%s\n' 'FAIL: NURI_APPROVED_SIGNER_SHA256 is required for artifact verification' >&2
  exit 2
}

SOURCE_HEAD="$(git -C "$REPO_ROOT" rev-parse HEAD)"
SHORT_HEAD="${SOURCE_HEAD:0:7}"
DIRTY_STATUS="$(git -C "$REPO_ROOT" status --short)"

printf 'SOURCE_HEAD: %s\n' "$SOURCE_HEAD"
if [[ -n "$DIRTY_STATUS" ]]; then
  printf '%s\n' 'WORKTREE_DIRTY: YES'
  printf '%s\n' 'DIRTY_PATHS:'
  printf '%s\n' "$DIRTY_STATUS"
else
  printf '%s\n' 'WORKTREE_DIRTY: NO'
  printf '%s\n' 'DIRTY_PATHS: NONE'
fi
printf 'RELEASE_INTENT: %s\n' "$MODE"
printf '%s\n' 'BUILD_COMMAND: ./gradlew assembleRelease --no-daemon --console plain'

cd "$REPO_ROOT/android"
./gradlew assembleRelease --no-daemon --console plain

DEFAULT_APK="$REPO_ROOT/android/app/build/outputs/apk/release/app-release.apk"
[[ -f "$DEFAULT_APK" ]] || {
  printf '%s\n' 'FAIL: assembleRelease did not produce app-release.apk' >&2
  exit 1
}

ARTIFACT_DIR="$(dirname "$DEFAULT_APK")"
ARTIFACT_PATH="$ARTIFACT_DIR/nuri-${SHORT_HEAD}-${MODE}-release.apk"
cp "$DEFAULT_APK" "$ARTIFACT_PATH"

NURI_EXPECTED_SOURCE_HEAD="$SOURCE_HEAD" \
NURI_EXPECTED_BUILD_VARIANT="release" \
NURI_APPROVED_SIGNER_SHA256="$EXPECTED_SIGNER" \
  "$VERIFY_SCRIPT" "$ARTIFACT_PATH"

if [[ "$MODE" == "store" ]]; then
  printf '%s\n' 'QA_STORE_INTENT_SEPARATION: STORE_PROTECTED_INPUT_REQUIRED'
else
  printf '%s\n' 'QA_STORE_INTENT_SEPARATION: QA_EXPLICIT_PATH'
fi
