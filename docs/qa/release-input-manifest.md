# Release Deployment Input Contract

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
| Signing password and alias | Yes | Protected environment or existing explicit QA defaults | Secret signing properties | Existing Gradle environment contract; Store mode requires all four inputs |
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
`NURI_UPLOAD_STORE_FILE` must be an app-local filename. Store mode additionally
requires the existing signing environment inputs and must not use QA defaults.

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
