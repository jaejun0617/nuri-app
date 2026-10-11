# Release Deployment Input Contract

## 2026-10-12 Security Gate Checkpoint

- STORE HOLD. SEC-019/020 server corrective verified; 13 resolved / 7 open.
- Required signing environment and approved signer fingerprint remain absent.
  Do not run this procedure while the PO prohibition on key read/copy and
  commit/push conflicts with its clean exact-source/input handling requirements.
- Source readiness and 16-suite/106-test exact-path validation are not native
  OAuth/session/upload or signer verification. No new APK was built or installed.
- SEC-011 remains blocked by Vercel access and exact-source provenance; no
  deployment or unsigned-path cutover is authorized in this phase.
- See [remaining security checkpoint](nuri-security-remaining-2026-10-12.md).

## Source Of Truth

A release candidate is identified by the exact Git HEAD, declared deployment
inputs, toolchain versions, signer certificate SHA-256, and artifact SHA-256.
The generated manifest is evidence, not a credential store. Never log input values.

`src/services/supabase/config.ts` remains ignored. Its two fields were classified
as a public mobile URL and an `anon` client key, not a server credential.
Public client keys do not replace RLS. `service_role`, admin, and `sb_secret_`
keys must never enter the client bundle. See the
[official Supabase key contract](https://supabase.com/docs/guides/getting-started/api-keys).

## Declared Inputs

| Input | Required | Git | Classification | Injection |
| --- | --- | --- | --- | --- |
| Supabase URL and client key | Yes | Ignored | Public client input protected by current policy | Literal config from protected input root, or paired CI environment |
| Upload keystore | Yes | Ignored | Secret signing material | Explicit keystore source into Android app directory |
| Signing password and alias | Yes | Protected process environment only | Secret signing properties | QA and Store require all four signing inputs; no static fallback |
| `android/local.properties` | Yes | Ignored | SDK path and restricted Maps client key | Explicit protected source |
| `android/app/google-services.json` | Yes | Tracked | Public client descriptor | Exact commit |
| Node, Yarn, Java, SDK, NDK, CMake | Yes | External toolchain | Installed development tools | Existing pinned installation, recorded in manifest |
| Additional release `.env` | No | Not used | None | Not consumed by this release pipeline |

The preflight does not evaluate config code. Only the two named exported string
literals are accepted. Runtime validation and preflight share the same validator;
missing values, server keys, and legacy JWT project mismatches fail closed.
Public-key validation is a deployment sanity check, not JWT signature verification.

## Clean Checkout Gate

Use a clean exact-commit checkout with its own physical dependency installation.
Do not symlink dependencies outside Metro's project root or copy the dirty source
worktree. The original protected inputs are not modified.

```bash
export NURI_RELEASE_INPUT_ROOT=/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri
export NURI_RELEASE_INPUT_MANIFEST=/tmp/nuri-rc-recovery-20261004/deployment-inputs.json
export NURI_RELEASE_PREFLIGHT_DIR=/tmp/nuri-rc-recovery-20261004/preflight-temp
export NURI_APPROVED_SIGNER_SHA256=08efb41ea4729792ce9fc3d242be9704e84a8ea3eadcbbcf1c8426884db689d3
yarn android:release:qa
```

CI may supply `NURI_SUPABASE_URL` and `NURI_SUPABASE_CLIENT_KEY` together instead
of a config file. `NURI_RELEASE_KEYSTORE_SOURCE` and
`NURI_RELEASE_LOCAL_PROPERTIES_SOURCE` select explicit protected files.
`NURI_UPLOAD_STORE_FILE` must be an app-local filename. Both QA and Store modes
require `NURI_UPLOAD_STORE_FILE`, `NURI_UPLOAD_STORE_PASSWORD`,
`NURI_UPLOAD_KEY_ALIAS` and `NURI_UPLOAD_KEY_PASSWORD` in the protected process
environment. No QA defaults remain. The manifest records environment presence
and source classification, not signing property values or their hashes.

### Current Security Corrective Hold (2026-10-10)

The four signing inputs are absent. Build and install are blocked; do not run
the examples above until the PO prepares the existing protected environment.
The separately required approved signer fingerprint is also absent.
No named local secret-manager integration is documented by this pipeline.

The existing preflight reads the keystore for its fingerprint and copies it
when source and destination differ. Current PO instructions prohibit reading
or copying that keystore, and prohibit commit/push while preserving the dirty
worktree. Therefore secure environment preparation alone does not authorize
this clean-checkout/input procedure. Obtain a scoped source-provenance and
input-handling decision before resuming; do not copy the key, bypass source
checks, fabricate inputs or reuse static signing fallbacks.

The official release wrapper always runs `scripts/preflight-release-inputs.js`
before Gradle. It rejects a dirty checkout, records file/field fingerprints,
checks required relative imports and undeclared ignored dependencies, validates
package/version/signing configuration, checks Node/Yarn and installed Android
toolchain, then produces an Android `DEV=false` bundle without a Metro server.
Gradle is not started unless both preflight gates pass. The application consumes
the prebuilt ReactAndroid AAR; its native toolchain uses installed CMake 3.22.1,
not the separate ReactAndroid source-build default.

The manifest and bundle diagnostics must be preserved with final evidence.
The temporary JS bundle and assets may be removed after artifact verification.
The release wrapper builds signed APK and AAB in the same Gradle invocation.
The APK verifier remains mandatory; inspect the AAB signature, base manifest,
embedded bundle, and correspondence with APK before RC acceptance.

## Review Boundaries

This contract changes deployment preparation, not session storage, auth flow,
Supabase remote schema, RLS, user data, seasonal design, or QA controls.
Native acceptance and PO visual approval are separate from build-input validation.
No artifact is automatically approved for Play Store upload.
