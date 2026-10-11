# NURI Signing Credential Rotation Report

Date: 2026-10-12 (Asia/Seoul)

## Result

```text
PRIVATE_KEY_EXPOSURE: NO_EVIDENCE
KEYSTORE_FILE_EXTERNAL_EXPOSURE: NO_EVIDENCE
SIGNING_IDENTITY: PRESERVED
ALIAS: UNCHANGED
CERTIFICATE_FINGERPRINT: UNCHANGED
OLD_STORE_PASSWORD: REVOKED
OLD_KEY_PASSWORD: REVOKED
NEW_STORE_PASSWORD: SECURELY_STORED
NEW_KEY_PASSWORD: SECURELY_STORED
KEYSTORE_PERMISSION: 600
KEYSTORE_COPY: 0
KEYSTORE_MOVE: 0
PRIVATE_KEY_EXPORT: 0
NEW_KEYPAIR: 0
SECRET_LOGGED: 0
PLAINTEXT_SECRET_FILES: 0
NEW_SECRET_IN_GIT: 0
NEW_KEYSTORE_FILE_SHA256: f8576aa4ab589f118d52f25d8111444854cb27b6e5e1c575c4bcd73346492993
APPROVED_APK_SIGNER_MATCH: PASS
RELEASE_SIGNING_ENV: READY
OLD_CREDENTIAL_REVOKED: YES
SECURE_STORAGE: PASS
STATIC_SIGNING_FALLBACK: ABSENT
SEC_015: RESOLVED_PENDING_RELEASE_ARTIFACT
BUILD: 0
INSTALL: 0
COMMIT: 0
PUSH: 0
STORE: HOLD
MASTER_STATE: STOPPED_WAITING_FOR_PO_RELEASE_BUILD_APPROVAL
```

## Evidence Boundary

- The old file hash matched five bounded release/input records, including the
  approved 2026-10-09 Release bundle, and was rechecked before rotation.
  `file: data` was not treated as corruption evidence.
- Reachable local Git objects contain the public debug keystore only; the exact
  encrypted Release keystore blob is absent even under another path. GitHub Actions
  artifacts and Release assets both returned zero. The two known approved Release
  bundles contained no keystore/archive copy. No signing backup location was found
  in repository documentation.
- `NO_EVIDENCE` is limited to those checks, not proof that no unknown backup,
  deleted artifact, unreachable Git object or external copy exists. Rotation
  revokes access to the current file, not to unknown old copies.
- Old credentials and alias came only from the already verified exact pre-SEC-015
  source revision. No dictionary, guessing, candidate enumeration or production
  fallback was used. Credential values were never emitted.

## Secure Rotation

- Two independent passwords were generated from 32 OS-random bytes each and stored
  in local macOS Keychain: service `com.nuri.release-signing`, account
  `credentials-v1`, non-synchronizing, creator-restricted access. Alias, protected
  path and approved fingerprint share that encrypted record. No prompt was needed.
- Java validated the original identity, prepared re-encryption in memory, verified
  new passwords and old-password denial, then waited. Only after Keychain save and
  readback did the coordinator authorize an in-place, locked, synchronized write.
  The same key, alias and certificate chain were retained without copy/move/export.
- Post-write verification repeated old-password denial, new-password acceptance,
  approved signer match and a memory-only private-key/certificate signing challenge.
  No Release artifact was signed. Independent Keychain retrieval via `verify` PASS.
- Normal write errors restore the same open file from encrypted original bytes in
  memory. With disk backups/replacement files prohibited, this is not power-loss-
  atomic. Failed/interrupted operations must stay blocked for operator review;
  never automatically retry rotation or delete its Keychain entry. No interruption
  occurred in this run.

## Wrapper and Source Gate

- Master uses pinned Node 24.20.0 with `scripts/secure-release-signing.js verify`.
  PO does not enter secrets or environment values. The future separately approved
  `release` mode accepts an exact commit and QA intent, rejects dirty/mismatched
  source before retrieval, and injects Keychain values only into child memory.
- `NURI_UPLOAD_STORE_FILE` is the existing absolute protected path, not a copy in
  the checkout. The manifest records certificate identity instead of key bytes.
  Metro receives no signing credentials. Static Gradle fallbacks remain absent;
  historical credential lookup exists only in explicit one-time rotation mode.
- Preserve the approved reference APK. Its exact hash and signature are checked
  before its signer is trusted; missing/mismatched reference fails closed.
- Wrapper changes are local and uncommitted. Prior security commit
  `7b43234156e372f7a5f9e35a2aef4865790b31cb` does not contain them. A separately
  approved scoped commit and clean exact-source checkout are still needed before
  Release. Existing unrelated dirty is preserved.
- SEC-015 is not finally resolved without a fresh approved Release artifact.
  SEC-011, other native security gates and STORE HOLD are not closed by this task.

## Local Validation

- Pre-list: four exact-path suites, no out-of-scope tests. Jest: 4 suites / 52 tests
  PASS. No full suite or Android build.
- Java in-memory self-test PASS using the public debug fixture only: no new keypair
  or on-disk keystore; old/new password boundaries, signer preservation, wrong signer,
  reused password, source drift, rollback and recovery-failure handling.
- Native syntax PASS after replacing an unavailable zeroing API with volatile
  writes. One legacy `SecAccessCreate` deprecation warning remains; actual Keychain
  add/readback and independent retrieval passed. Targeted ESLint: five files, zero
  errors/warnings.
- New file hash independently matches the receipt. Permission 600, untracked
  keystore, empty index. No device, DB, deploy, commit or push operation.

PO 승인을 기다립니다.
