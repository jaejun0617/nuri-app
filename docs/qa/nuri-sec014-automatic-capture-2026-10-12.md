# SEC-014 Automatic Capture Corrective

Date: 2026-10-12. Status: LOCAL_CORRECTIVE_VERIFIED_NATIVE_AND_OPERATIONS_PENDING.
STORE: HOLD. This is a source checkpoint, not a release or received-payload approval.

## Authority and Scope

This checkpoint supersedes the automatic-JS-capture portion of the earlier SEC-014
assessment only. The accepted baseline remains 20 findings, 19 resolved, one open
LOW finding (SEC-014). SEC-011 and frozen mobile findings are unchanged.

Base commit: `5c1a79b91c17417dd5af2bebe4faa74aef9d9768`.
Changes are uncommitted in the isolated security worktree. No commit, push,
Android build, device install, deployment or remote mutation was performed.

## Root Cause and Minimal Correction

RN Firebase Crashlytics 23.8.6 installs automatic global-error and unhandled-promise
handlers independently of `src/services/monitoring/sentry.ts`. Those handlers sent
the original message to native reporting and forwarded the original error into
the chained React Native handler. Sanitizing explicit app calls alone was insufficient.

The existing Yarn patch mechanism now patches only `lib/handlers.ts` and
`dist/module/handlers.js` of the same SDK version. Both source and default export
conditions are covered. No package version or native module implementation changed.

In Release, automatic errors become a new Error with `redacted_exception` and at
most 30 coordinate-only frames from a bounded 32 KiB stack input. Messages, causes,
custom properties, function names, paths and URL queries are not forwarded. A
hostile stack accessor or absent stack produces a report with no frames, not a
raw fallback or an invented call site. The original error is not mutated.

The same sanitized error reaches the existing chained handler. Collection and JS
generation settings, fatal argument, existing fatal/analytics classification,
handler registration and development behavior are preserved. Existing rejection
tracking is sanitized, not expanded to new runtime hooks. Explicit sanitized app
reports retain their stable codes. Collection is not disabled as a workaround.

Automatic reports intentionally lose free-form diagnostics and function names;
bundle line/column coordinates remain. The app wrapper has a richer allowlist for
explicit reports, while the SDK automatic boundary is deliberately stricter.
Future SDK upgrades must rebase this version-bound patch and rerun these tests.

## Local Evidence

- Jest actual binary: 29.7.0. Every run used explicit paths after list verification.
- FAIL-FIRST: one suite, 18 failed / 4 passed; the original SDK leak was reproduced
  using synthetic values and mocked native/network sinks.
- Initial corrected run: one suite / 22 tests PASS.
- Final authoritative targeted run: three suites / 37 tests PASS.
- Unexpected selected test files: 0. Invalid filter runs: 0.
- TypeScript: `tsc --noEmit --incremental false` PASS.
- Targeted ESLint: 0 errors, 0 warnings.
- Yarn immutable lock verification PASS with lifecycle build scripts skipped.
  Existing peer warnings remain; no unrelated dependency update was performed.
- Full suite not repeated: the changed runtime boundary is isolated to SDK
  automatic reporting, and tests execute both actual patched SDK entry files
  alongside the existing app redaction and monitoring-sink regressions.

Tests exercise automatic exceptions, rejections, primitives, throwing accessors,
bounded frames, stackless errors, native sink failure, collection/generation gates,
fatal chaining, no-chaining, development behavior and explicit stable error codes.
The real stack parser is used; Firebase, analytics and native transports are stubs.
These are not Hermes/device or actual Firebase ingestion tests.

## Operations and Release Gate

### Approved Native Verification Preparation

PO subsequently approved an SEC-014-only local commit followed by one exact-source
QA Release build and one replace install. Push and Store remain forbidden.
The existing Chrome session now opens Crashlytics. Two PO-confirmed historical QA
events were read only for non-sensitive stack/environment/release metadata;
their `nuri@0.0.1` tag does not identify an exact security commit.

The existing compile-time-gated SecurityValidation screen now has an automatic
monitoring fixture. It invokes the installed ErrorUtils global handler with a
public synthetic canary and `fatal=false`; it never substitutes a sanitizer or
calls recordError. Native collection, JS generation and chaining must all already
be enabled. No collection/chaining setting is changed to make the test pass.

The fixture temporarily clears the monitoring identity, tags the event with a
public SEC014 run ID, and restores current app monitoring identity in finally.
It does not read or emit tokens, session contents or identifiers. The input error
retains its original stack and public properties; received-message redaction and
coordinate-only frames must be verified independently in Crashlytics. The local
receipt deliberately says PENDING_CONSOLE_VERIFICATION, not sanitizer PASS.
Store and development builds reject the operation; overlapping execution rejects.

Current pre-build validation: exact Jest29.7 path list5/unexpected0, 5 suites and
46 tests PASS, TypeScript PASS, targeted ESLint0 errors/0 warnings. Prior full
suite227/2329 remains authoritative; no full suite repeat for this gated QA
fixture. Runtime result is recorded outside the repository after the candidate
run, without rewriting this committed pre-build source identity.

The older console-failure checkpoint below is retained as history. Fresh source
payload, native fatal/ANR/NDK coverage and export-retention/access are not promoted
by historical QA receipt or this build authorization.

Project IAM Owner roles for the two PO-designated accounts remain confirmed by
the preceding read-only IAM review. This is not a least-privilege or MFA approval.
Both Firebase console sessions still failed to open the project's app view in
this checkpoint; one displayed a project-access error, the other an unknown
processing error after the official Retry action. Root cause is unconfirmed.
Do not infer missing IAM ownership or project deletion from those UI errors.

ACTUAL_RECEIVED_PAYLOAD: NOT_VERIFIED.
EXISTING_QA_EVENT_PAYLOAD: NOT_READ.
NATIVE_FATAL_ANR_NDK_PAYLOAD: NOT_VERIFIED.
EXPORT_RETENTION_AND_ACCESS: NOT_VERIFIED.
GAP-06: PARTIAL.

No real-user events were opened or exported, and no crash/test telemetry was emitted.
The installed candidate does not contain this unbuilt local patch. Existing
received events cannot establish that the correction works after deployment.

Before SEC-014 closure, obtain separate build/install authorization and verify a
scoped synthetic Release event through the actual handler, upload and received
Crashlytics payload, including the chained path. Confirm native/automatic SDK
capture and export-retention/access evidence separately; this patch does not
sanitize arbitrary native exceptions or claim coverage of every Hermes error path.

## Preservation and Documentation

The original worktree's 223 dirty paths are untouched. Same-method pre/post hash:
`d174de5a570f8af6777501125e8f4a35e144f79d129ebf90b08dcec7c1b0daca`.
No staged files. Nuri-web remains clean at
`c15cde597828976b633b817fa27dd38510718773`.

Original project-memory and release checklist were not rewritten because they
belong to the preserved dirty worktree. This isolated checkpoint records the new
local decision and outstanding operational gates without changing historical approvals.

SEC_014: OPEN_LOCAL_CORRECTIVE_NATIVE_AND_OPERATIONS_PENDING.
PRODUCTION_SECURITY_APPROVAL: NO.
AUTO_START_NEXT: NO.
