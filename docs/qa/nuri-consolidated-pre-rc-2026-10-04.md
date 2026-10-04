# NURI Consolidated Corrective / Pre-Store RC - 2026-10-04

## Scope And Authority

PO approved one integrated batch: eight corrective tracks, linked migration,
global seasonal QA preference, full suite, bounded physical QA, selective Git
closeout, committed-source signed APK/AAB, and safe cleanup. This is not Store
approval. Home review buttons remain visible until a new PO decision.

## Source Contracts

- `SeasonPreferenceProvider` owns a device-local AsyncStorage override. It is
  independent of account/session and hydrates before seasonal navigation mounts.
  Missing/invalid values use the unchanged KST automatic season resolver.
  Writes are serialized; navigation, logout and restart must not reset it.
- Splash, SignIn, SignUp, NicknameSetup, WelcomeTransition, PetCreate steps and
  success modal, FirstPetWelcomeModal, PetProfileEdit and its done screen share
  the provider. Home atmosphere/artwork and ProfileInfoBottomSheet use the same
  season. Approved Home foreground geometry/material/typography stay frozen.
- No separate PetDetail route exists. Home ProfileInfoBottomSheet owns that
  surface. Password reset/OAuth callback and remaining functional routes retain
  their existing neutral design. External OAuth pages are not app-owned visuals.
- Missing onboarding variants reuse approved seasonal profile/Splash assets;
  no new forms, account fields or remote preference columns are introduced.
- Weather keeps type sizes, units and card hierarchy. Compact metric padding
  becomes 2dp and gap 2dp; value copy cannot shrink. Enlarged fonts remain 2x2;
  an unusually long complete value also deterministically selects 2x2.
- Community categories retain selected fill but have no transient pressed fill
  layer or Android ripple. Recommendation glyphs change 28dp to 22dp (21.4%);
  60dp container, padding, text, material and navigation remain unchanged.

## Schedule Migration

Source: `supabase/migrations/20261004051105_pet_schedules_kst_all_day_contract.sql`.
Linked project: `grmekesqoydylqmyvfke`; remote migration applied and catalog read
back. Existing 12 rows and CRUD-own RLS were identical immediately before/after.
Database timezone remains UTC. Only the all-day check interprets midnight with
`Asia/Seoul`. Client all-day writes use explicit `+09:00`; timed writes retain
the existing local-time path. Notification engine is unchanged.

Rollback is not a destructive UTC rewrite. After KST rows exist, restoring the
old UTC constraint would reject them. Preserve the forward-compatible KST
constraint on an app rollback; any constraint rollback needs a row compatibility
preflight and separate approval. No migration rewrites rows or relaxes RLS.

## Validation And Evidence Ownership

Node 24.20.0 / Yarn 3.6.4. Typecheck PASS; full Jest 144 suites / 1056 tests PASS.
Target lint has 0 errors, 25 existing warnings, 0 new diagnostics. The expanded
scope includes six preexisting SignIn no-shadow warnings beyond prior Home QA.
Masked-view ESM is admitted to Jest transform; the stale More expectation now
includes the implemented app-font entry. No tests are disabled.

The previous alarm Home-stop and bounded performance results are reusable;
notification scheduling and Home render architecture are not redesigned.
They do not prove low-end performance or long-term memory stability.

Canonical batch evidence and final report:
`/tmp/nuri-final-batch-20261004/FINAL_REPORT.md`.
Physical QA, artifact hashes, committed source HEAD, push, preservation and
cleanup results are recorded there after execution. This source document does
not predeclare pending native checks as PASS. Previous QA rows/evidence and
`9e6a110c` stable APK remain protected.

## Permanent Cleanup Contract

After every substantial task: copy required artifacts, verify evidence/Git,
remove only task-created reproducible outputs, measure disk space, report, STOP.
Protected source/assets/migrations/dirty, required APK/AAB, credentials, SDK,
NDK/CMake, wrapper, modules-2, node_modules, Codex and personal/system data remain.
This batch specifically permits build-cache-1 removal if at least 10GiB only
after all Gradle work has finished and final artifact hashes are protected.
