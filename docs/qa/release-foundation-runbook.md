# NURI Release Foundation Runbook

## Scope And Freeze

2026-10-04 PO approved the installed AUTH candidate. Offline bootstrap and Kakao zero-tap return are COMPLETE_FROZEN. Home, login, profile, Weather, KST schedule, four seasons and QA data remain unchanged. Keep the season review control until a new PO decision. Native Kakao cancel/back is NOT_RUN; source tests passed. Do not relabel that native evidence gap as PASS.

Store upload and submission remain HOLD. Completing this runbook is not Store approval. The next product task is PO NEXT DESIGN DIRECTION. Final accessibility, Home rendering/memory, low-end performance, image/cache UI lifecycle and seasonal visual architecture are deferred until after design. POI/PostGIS and external walk/hospital dependency reduction remain V1.1.

## Source Validation CI

`.github/workflows/release-source-validation.yml` validates push/PR/dispatch with Node 24.20.0, Yarn 3.6.4 and immutable installation. Gates cover toolchain, required relative imports, declared ignored client config, secret patterns, package/version and Android source flags, TypeScript, ESLint, critical logical tests, full tests on push/dispatch, and Git diff checks. PR runs omit the full suite but keep critical contracts.

The source-only Supabase fixture has no real project or credential. It exists only in an ephemeral CI checkout, cannot overwrite a real config, and `prepareInputs` rejects its marker before a release can proceed. Source validation is not a signed build or native QA.

GitHub currently has no signing secrets or environments for this repository. SIGNED_BUILD_CI is BLOCKED_BY_SECRET_PROVISIONING. Do not copy local credentials into GitHub. A future approved operator must provision a protected environment, least-privilege access and explicit signing policy before connecting signed CI. No Store upload job exists.

## Official Release Path

Use a separate clean checkout of the intended commit, not the protected dirty working directory. Install the pinned toolchain and immutable dependencies. Supply protected inputs through the existing release-input contract in `docs/qa/release-input-manifest.md`.

Required environment names are `NURI_RELEASE_INPUT_ROOT`, `NURI_RELEASE_INPUT_MANIFEST`, `NURI_RELEASE_PREFLIGHT_DIR` and `NURI_APPROVED_SIGNER_SHA256`. Store intent additionally requires `NURI_UPLOAD_STORE_FILE`, `NURI_UPLOAD_STORE_PASSWORD`, `NURI_UPLOAD_KEY_ALIAS` and `NURI_UPLOAD_KEY_PASSWORD`. Their values must never appear in Git, shell tracing, build logs or reports. SDK, JDK 17, NDK, CMake, wrapper, Maps input and protected signing files remain required toolchain inputs, not disposable caches.

```bash
bash scripts/verify-js-toolchain.sh
node scripts/release-foundation.js source
bash scripts/build-android-release.sh qa
```

The wrapper runs clean-source/input/DEV=false bundle preflight before Gradle, then assembleRelease/bundleRelease, static APK verification and provenance generation. `store` intent is a protected build path, not authorization to upload. It must not be used while Store is HOLD.

Outputs beside the named APK include `.verification.txt` and `.provenance.json`. Preserve the APK, AAB, verifier, deployment-input manifest and provenance as one evidence unit. The provenance contains exact commit/branch, package/versionCode/versionName, input fingerprint, toolchain, signer fingerprint, APK/AAB hashes and build timestamps. It rechecks protected inputs after the build and rejects dirty/mismatched source, unsafe verifier flags or changed APK contents.

AAB hashing is not AAB signature verification. The provenance explicitly records `REQUIRES_SEPARATE_AAB_VERIFICATION`; the official operator must independently verify the AAB signature against the approved certificate and preserve that result before declaring the AAB accepted. Existing canonical AAB signature evidence is retained, not regenerated in this batch.

## Security Baseline

Approved AUTH evidence confirms Google/Kakao enabled, Naver/Apple disabled, exact HTTPS callback plus legacy scheme, single-flight callback and verified App Link. AUTH source and configuration remain frozen; no re-login QA was performed. Android main launcher is intentionally exported; widget/notification receiver and ringing service are not. Backup is disabled, the release verifier confirms debuggable/cleartext false and embedded JS. Existing permission justifications are photo selection, location and user-scheduled alarms; Store declarations are a later PO gate.

Tracked-file secret guard scans common private-key/server-token/privileged-JWT patterns and protected filenames without printing matches. Content scanning is limited to text-sized files up to 2 MiB; this is a guard, not proof of a full-history or binary secret audit. Protected Supabase client config stays ignored and is validated by the shared runtime validator. Firebase client descriptors and the debug test keystore are not server credentials. No server service-role key is introduced into app inputs.

Read-only linked remote audit found RLS enabled on all 101 public tables and `storage.objects`. Pet/record/schedule ownership and private media policies remain in place. `pet-profiles` is public; `memory-images` and `community-images` are private. No RLS, grant, Storage policy, function, migration or QA row was changed.

Existing advisor debt remains: one security-definer view, 24 mutable function search-path warnings, broad security-definer executable-function warnings, three public extensions and disabled leaked-password protection. The view `v_my_pets_with_days` explicitly filters `user_id = auth.uid()`; advisor severity alone does not establish a cross-user leak. Per-function guard/grant review and an approved migration are required before changing these contracts. No new critical vulnerability was proven in this bounded review; this is not a clean-advisor or penetration-test certificate. Raw advisor metadata is retained in the task evidence.

## Crash And Performance Observability

Existing stack: Firebase Crashlytics Android/RN integration. Sentry is disabled and no vendor was added. Release collection is enabled by existing runtime setup; debug collection is disabled. Native version identifies Android 1.0/1. The custom monitoring release remains `nuri@0.0.1`, lacks exact commit attribution, native symbol upload is disabled, minification is disabled and JS source-map receipt is unverified. APK/AAB provenance provides artifact-to-commit attribution, not event-to-commit proof.

No authenticated Firebase console account or safe event receipt proof was available. No deliberate crash, ANR or production test event was created. OBSERVABILITY is PARTIAL. A later approved console operator must verify an existing event's release/environment, mapping/symbol availability and receipt timestamp. Crashlytics supports nonfatal events, but a safe event is meaningful only with verified console receipt. See [Firebase Crashlytics](https://firebase.google.com/docs/crashlytics/get-started?platform=android).

Existing code uses pseudonymous user UUID attribution and accepts exception/tag/extra payloads. No token leakage was found in the bounded source/evidence pattern audit; arbitrary payloads are not a proven PII-safe contract. Before observability runtime changes, define a redaction allowlist: no token, password, OAuth code, URL fragment, email, nickname, pet name, media URL or free-text content. Do not silently claim PII absence from pattern scans.

Performance baseline is reused: 1507 warm-scroll frames, 86 jank, about 5.71%, about 476-478 MiB. This is short sanity evidence, not low-end or long-term leak proof. After design, record exact APK/hash, commit, device/OS, restored 1080x2340/density450/fontScale1.0, app font, populated QA inventory, network state and warm/cold condition. Measure cold start, three equal Home scroll runs, image loading, foreground/background and memory trend with the same route, duration and data. Report per-run frames/jank/PSS and aggregate; do not optimize visuals before design or mutate retained QA to improve a metric.

## Backup And Recovery

Follow `docs/qa/recovery-readiness-runbook.md`. Documentation is complete, but actual isolated restore and current media/auth recovery are not verified. Production restore, data deletion and new paid infrastructure are forbidden in this batch.

## Web Production Provenance

Web instructions live in the sibling repository at `docs/production-provenance-runbook.md`. Build source is a full commit from declared deployment input/Vercel metadata/local Git, never a stale manually expected prefix. Health exposes that compiled commit. A authenticated release operator independently checks the actual READY production alias and records its source/deployment ID in GitHub Deployments. The monitor derives expectations from that record, not its checkout SHA or the response it is checking.

The current project lacks Vercel Git integration; pushing does not deploy. Do not report push as production deployment. Use the documented authenticated deployment and recording sequence. Google-font Turbopack bundling failed during this batch; the unchanged font source builds through official `next build --webpack`. See [Next CLI](https://nextjs.org/docs/app/api-reference/cli/next).

Monitor failure must stay visible. A missing/failed latest deployment record is not allowed to fall back to an older PASS. Rollback must first promote a known READY deployment, validate alias/health against its real source, and record the rollback deployment before monitoring. Do not hardcode a hash to make a monitor green.

## Logical Regression Contracts

`yarn test:foundation` covers local/offline/invalid-session and recovery contracts, HTTPS/legacy callback parsing and idempotency, KST calendar date semantics, effective season/persistence/navigation ownership, deployment-input rejection, Android metadata/secret guards and provenance tamper rejection. No pixel snapshots or screenshot golden tests are introduced while design is open.

Existing 151 suites/1118 tests and physical four-season/Weather/KST/Home/AUTH QA are the baseline. Local work validates changed scripts/tests; the new push workflow can independently execute the full suite as CI activation evidence. This does not authorize repeated physical QA or new app installation. No app runtime source changed in this batch.

## Evidence, Rollback And Cleanup

Canonical artifacts remain under `/tmp/nuri-auth-final-corrective-20261004`: APK `nuri-89ed812-rc-2f9239a1.apk`, AAB `nuri-89ed812-rc-091e23e1.aab`, accepted signatures, AUTH/native evidence and deployment inputs. Current foundation execution evidence and the final report are under `/tmp/nuri-foundation-20261004`. Keep these files and the populated QA data; temporary paths need an approved durable archive before host maintenance.

For script/CI rollback, use a normal reviewed revert of the foundation commit, not reset/force push. Web deployment rollback is separate from app source rollback. Installed app source remains the approved AUTH commit; no foundation APK was built. Preserve baseline unrelated dirty and assets.

Final order: preserve canonical artifacts/evidence, verify hashes and selective Git/origin match, audit exact generated paths, delete only owned reproducible test outputs, measure disk before/after, report and STOP. Preserve modules-2, dependencies, signing, inputs, SDK/NDK/CMake, Codex and personal files. Only the specifically approved global build-cache-1 may be removed when >=10 GiB, no active Gradle and canonical artifacts are preserved. Below 10 GiB it stays intact.
