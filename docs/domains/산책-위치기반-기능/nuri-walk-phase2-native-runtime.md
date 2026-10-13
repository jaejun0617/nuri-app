# NURI Walk Phase 2 Native Runtime

Base: `e59360d9ce0b685868850dbd2a1fb3bbfbda78a3`. Phase 1 remains frozen.
The native implementation and scoped S24 acceptance are complete; PO review remains pending.
Exact runtime source: `929f0320cc0ab5c82f303740ffa471bf6f0d97eb`.
See the [native acceptance report](../../qa/nuri-walk-phase2-native-2026-10-13.md).
STORE HOLD. Push is not authorized. Phase 3 does not start automatically.

## Native Ownership and Android

WalkRuntime owns the active session, revision, owner, pet, time, subscription and checkpoint.
The existing ReactPackage/legacy interop pattern is reused with RN New Architecture enabled.
AppProviders binds the authenticated owner; recovery sandbox and deletion guard revoke that binding.
React receives validated snapshots with no coordinates. One nullable unique Room active-slot index
and serial transactions enforce one active/recoverable session per installation.

Visible explicit start requires precise location and enabled location services. The private location
FGS enters foreground before Room/JS work, uses START_NOT_STICKY and stopWithTask=false.
No background-location permission, Walk boot receiver, automatic restart, exported component or new
deep link is added. Notification denial is projected separately. Explicit immutable notification
actions bind session/revision and cannot operate on a replacement session.

## Capture, Time and Persistence

FusedLocationProviderClient uses a testable WalkLocationSource. The initial 5-second/2-second capture
intervals are Phase 3 experiment inputs, not distance thresholds. Stale pre-start fixes, out-of-order
timestamps and duplicate callbacks are not checkpointed. Each encrypted chunk currently contains one
59-byte binary sample with its segment index. Pause stops the subscription and persists encrypted
pause intervals; resume creates a new segment only after successful registration.
Monotonic time owns duration. Clock discontinuity returns a stable error without silent correction.
Distance, map, route simplification, progression, server finish payload, Memory and XP remain absent.

Room version 1 exports its schema for future non-destructive migration and stores the DB under
noBackupFilesDir; application backup remains disabled. AES-256-GCM uses a non-exportable Keystore key,
fresh random 96-bit nonce and domain/schema/session/entity/revision/index AAD. Owner, pet, pause data,
raw samples, finished checkpoint and receipt results are encrypted. Buffers are wiped after use where
possible; coordinates never become text or logs. Metadata encryption revision is independent from
runtime revision so key failure can durably mark RECOVERY_REQUIRED without changing ciphertext.
No plaintext fallback or automatic deletion exists.

## Commands, Recovery and Logout

Persistent receipts bind UUID command identity, type, owner, pet/session and expected revision.
Same identity/input returns the original outcome; reuse with another input rejects. Late start
callbacks cannot activate after logout, and stale activation failure cannot stop a newer walk.
Finish removes subscriptions, acknowledges foreground notification removal and commits FINISHED_LOCAL
with NOT_AVAILABLE_PHASE_2 rather than fabricated distance. JS event loss is recovered through snapshots.

After process loss, STARTING/WALKING/PAUSED/FINISHING becomes RECOVERY_REQUIRED on the next native read.
The same session and last durable duration are retained; unobserved downtime receives no credit.
Visible user action resumes a new segment or finishes. Logout stops collection before persistence and
network work; bounded acknowledgement cannot indefinitely block logout. Other owners cannot read or
mutate the preserved session. Account deletion and password-recovery disposal also invoke the stop first.

There is a 4,096-command/session cap. Active/recoverable receipts are never pruned. FINISHED_LOCAL is an
unsynchronized checkpoint, not an archive: deletion/retention follows acknowledged archive policy in
Phase 4. Phase 2 checkpoints lack a valid distance payload and must not be retroactively accepted.

## QA, Validation and Rollback

The minimal panel reuses compile-time NURI_SECURITY_QA and the existing gated SecurityValidation route.
Store mode has no entry to it. No production coordinate injector or debug receiver exists.
Only state/counts/revision/permission/duration/stable errors are displayed. Fake sources and public
synthetic coordinates belong only to unit/instrumentation tests. Test DBs use unique names and finally cleanup.

Behavioral fail-first executed two failing auth-stop ordering assertions and one clock-overflow assertion;
these are separated from final PASS evidence. Local checks include exact Phase 1 paths, native reducer/AEAD,
instrumentation compilation, read-only-config TypeScript, scoped lint and one final full Jest run.
Initial candidate local results: Phase 1 4 suites/145 tests; exact targeted selection 9 suites/185 tests;
native JVM 2 suites/10 tests; TypeScript zero diagnostics; scoped ESLint zero errors/warnings;
final Android instrumentation compilation passed. Full Jest ran exactly once: 235 suites passed
and the new logout suite had five test-only resolver failures caused by virtual mocking of an
existing module. Removing that virtual mock flag was the only subsequent JS change. The repaired
exact targeted selection passed all 185 tests, including those five. Consolidated coverage is
236 suites/2,547 tests, not a claim that the original full invocation passed without repair.
No second full-suite invocation was performed. Behavioral fail-first and this test-only repair
remain separately preserved in the per-run evidence.
S24 gates separately cover permissions, actual fixes/chunks, three-minute background and screen-off windows,
pause/resume, task swipe, process recovery, finish/replay, logout and owner isolation.

Existing accepted security 20/20 stays frozen. New location/bridge/Keystore/Room surfaces enter the final
source-frozen re-audit. No Supabase schema/RPC/RLS/Storage or old record/XP contract changes exist.
Original dirty 181 paths stay in the original worktree. Rollback disables the new entry, stops collection
and retains encrypted checkpoints without deleting old records or rewriting the security chain.

Next gate: PO review of the final Phase 2 native report.

## Reboot Boundary Corrective and Acceptance

Candidate `3836d20a963406b7d0455d4fd5bbdf5bb5658cca` passed the required same-boot S24
lifecycle, encryption, permission and logout gates. An additionally approved full reboot
preserved its checkpoint and required explicit resume, but new chunks remained at 13 through
a 60-second observation. The prior-boot ordering cursor survived a new segment. Android
[elapsedRealtimeNanos](https://developer.android.com/reference/android/os/SystemClock#elapsedRealtimeNanos())
uses time since boot, so that cursor rejected post-reboot samples.

The minimal corrective scopes last-fix ordering to a newly started segment. Identity,
encrypted historical chunks, cumulative counts and duration remain unchanged. Stale
pre-segment and duplicate rejection stay in place. A behavior-preserving extraction first
exposed the failure in a JVM regression; only then was the cursor reset added. An isolated
Android test also verifies fresh sampling after a simulated epoch reset and rejects stale
pre-segment input. Room schema, Phase 1, auth, signing and server contracts are unchanged.

Corrective `929f0320cc0ab5c82f303740ffa471bf6f0d97eb` passed 3 JVM suites/13 tests,
the exact JS selection of 9 suites/185 tests including Phase 1's unchanged 4/145,
TypeScript and scoped lint. The second signed Release installed with exact APK hash match;
all 11 S24 instrumentation tests passed, including the reset-epoch regression.

The second physical reboot stopped collection without automatic FGS restart. App opening
returned RECOVERY_REQUIRED with 5 preserved encrypted chunks, revision 2 to 3 and the
same protected owner/pet context. Explicit resume kept the same hashed session identity,
created segment 2 and advanced revision to 5. In 60,084 ms, new fixes/chunks increased
from 6 to 16. Finish persisted FINISHED_LOCAL at revision 7 with 20 chunks and stopped
the service/subscription. Direct finish from recovery was physically proven in the
earlier logout/relogin branch and in final instrumentation; the final reboot branch
used explicit resume and then finish, not a second reboot for duplicate evidence.

No boot receiver, sticky restart or automatic collection is introduced. Main Release
build/install counts are 2/2; auxiliary instrumentation APK installs are separately 2.
No third candidate, repeated full Jest run or automatic Phase 3 occurred.
