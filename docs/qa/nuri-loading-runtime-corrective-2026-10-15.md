# Loading runtime corrective: encrypted-session read queue

## Scope and status

- Base: `fd1c35f11196c50280f6bcb05c27b3ae3803ae2f`.
- Branch: `codex/loading-runtime-corrective`.
- Product delta: only `src/services/auth/secureSessionStorage.ts`.
- Local corrective validation and approved S24 installation/comparison PASS.
  Runtime commit: `eb7283fe9a080e747302be8b6558bc4668cc66cd`.
  One canonical QA Release build was invoked before the PO pause. On explicit
  resume, its completed artifacts were recovered and independently reverified;
  no second build was performed. One install-r completed with the existing
  package, signer, account and data. Push and server changes remain prohibited.
  STORE HOLD; broader performance and full security re-audit are not claimed.
- Original dirty181, accepted source ancestry, existing design, Walk/native,
  queries, RPC/RLS and remote schema are outside the change.

## Evidence and diagnosis

The supplied recording shows approximately 34.9 seconds in Splash and 83.9
seconds between Community shell and first rows. The expense card is still
loading when the user leaves More after approximately four seconds; the recording
does not establish its eventual completion time.

Recording-window read-only edge logs show the Community list RPC at 109ms origin
time, then profile lookup 21.252 seconds later and likes lookup another 15.385
seconds later. Each of these latter requests takes approximately 110ms at origin.
These time-window correlations are not per-device request tracing and do not
measure device network round-trip time.

Existing S24 auth events reproduce consecutive verified-read completion gaps of
approximately 2.6 seconds. Source inspection identifies the repeated operation:
every protected request obtains an SDK session, which reads the configured
storage; each NURI read serializes Keychain decryption plus plaintext-key removal
and absence verification. Concurrent bootstrap, Home and screen queries therefore
queue expensive native reads before their HTTP requests can begin. SDK auth-lock
draining can amplify the delay. No encryption/provider downgrade is proposed.

An automated pre-corrective run observes Home after 37.453 seconds, including a
restored Community route and explicit Home navigation. The expense card is not
ready during its 4.773-second visit. These are UI-automation observation upper
bounds including hierarchy-dump overhead, not frame-profiler measurements.
In the same run, Community first rows take 78.089 seconds; after returning to
More, the expense amount takes a further 15.767 seconds to become visible.
The latter is revisit latency, not total duration of the earlier abandoned query.
The auth-event sample has 29 read-completion events and a 2.671-second median gap
among consecutive gaps shorter than ten seconds; this is not an isolated native
call-duration measurement.

The attachment's N+1 and Splash-data-gating suggestions are hypotheses, not
confirmed defects: Community already batches profile/pet/like queries and uses
cursor pagination; Splash does not directly await weather or Hero image loading.
No speculative pagination, retry, global-store or database redesign is included.

## Corrective contract

- Keychain AES-GCM remains the sole durable credential store, with unchanged
  accessibility and native encryption settings.
- At most eight verified values are held in process memory. Nothing new is
  persisted to disk. A new process must read encrypted storage again.
- Cache lookup occurs inside the existing serialized queue. Concurrent readers
  reuse the first verified result without passing an earlier refresh/logout.
- Values become reusable only after native retrieval and legacy removal, or
  after a successful encrypted write, exact readback and legacy removal.
- Refresh/write and logout/delete evict the previous value before operating.
  Failures leave no reusable old value; sanitized error behavior remains intact.
- Successful deletion remembers absence, and a later account write replaces it.
  PKCE keys remain isolated. Bounded eviction falls back to encrypted storage.
- SDK expiry checks, token refresh, server identity validation and RLS remain in
  place. This is storage-read reuse, not an alternative authorization decision.

The installed SDK source agrees with the official
[getSession storage contract](https://supabase.com/docs/reference/javascript/auth-getsession).
The current changelog was checked; no dependency upgrade or API change is needed.

## Validation

- Fail-first: repeated reads invoke native decryption 21 times instead of one;
  a verified refresh also performs an unnecessary additional read. Both tests
  fail on the original adapter, with 16 other tests passing.
- Corrected secure-storage suite: 18 tests PASS, including migration failure,
  exact readback, failed legacy removal, failed refresh, failed native deletion,
  concurrent reads, ordered refresh/logout/account switch, PKCE isolation and
  bounded eviction.
- Auth/bootstrap/recovery and Community/expense regression: 11 suites, 111 tests
  PASS in two targeted runs.
- Full suite: exactly one run, 252 suites and 2,982 tests PASS, zero failed or
  skipped tests.
- TypeScript PASS; modified source/test lint zero errors and zero warnings;
  diff whitespace check PASS.
- Release source/import/secret guard PASS after selecting the configured Node
  24.20.0 and Yarn 3.6.4. An initial PATH-related Yarn version rejection is
  preserved separately from application test results.
- No raw screen text, post contents, account identifiers, credentials, coordinates
  or full device logs are persisted. Evidence contains fixed events, numeric
  durations/counts and booleans only.

## Device and preservation boundary

- Pre-corrective installed APK SHA-256:
  `381495b8054b2de738ba492edf82382124a2185cad2817e7426c094f70d3e569`.
- First install: `2026-06-02 19:16:57`; no active Walk service before cold-start
  measurements. No GPS, logout, uninstall, clear-data or display-setting changes.
- A first observation helper expected Home content, but the app restored the
  previous Community route. Its timeout is retained as a probe-predicate failure,
  not classified as an application crash. The corrected helper recognizes the
  existing navigation restoration contract.
- Original HEAD/dirty181/status/content hashes verified unchanged. Staged paths
  zero. No server schema, policies, records or user content are changed by this
  task. Ordinary authenticated reads may perform the SDK's existing token refresh.
- External evidence:
  `~/.codex/nuri-design-evidence/loading-corrective-20261015-sQWlkS/`.

## Approved release closeout: 2026-10-17

The PO pause stopped the outer release coordinator with exit 130. Its empty
outer log is not a successful command-exit receipt. Inspection on resume found
the completed APK/AAB, static ACCEPTED verifier, exact-source provenance and
captured artifact inventory, all timestamped before the pause. Their SHA-256
values match the inventory and provenance. The existing APK was independently
reverified, and the AAB signature was verified separately. No blind rebuild or
additional Gradle invocation was needed.

- APK SHA-256:
  `87e433f1fee246c2a0fff129e87d335742a110734c881b4ab93b324e1467b5e6`.
- AAB SHA-256:
  `3aed8e205b11facef16feeec5ea47e812c33809b4927615110de56118eda865f`.
- Signer SHA-256:
  `08efb41ea4729792ce9fc3d242be9704e84a8ea3eadcbbcf1c8426884db689d3`.
- Package `com.nuri.app`, embedded JS, debuggable false, cleartext false and
  backup false PASS. Installed APK hash matches exactly.
- Build invocations total: 1; new builds on resume: 0; install-r total: 1.
- UID 10402, first install `2026-06-02 19:16:57`, 1080x2340, density450 and
  fontScale1.0 unchanged. No re-login, uninstall, clear-data or GPS was required.
- Home and the selected pet's existing profile-edit action are visible; no Walk
  service runs. The app is left on Home and device control is stopped.

### Measured comparison

| Observation | Before | After |
| --- | ---: | ---: |
| Main navigation ready after cold launch | 35.172s | 6.593s |
| Home ready including restored-route navigation | 37.453s | 6.593s |
| Community first rows after tab selection | 78.089s | 2.707s |
| Expense amount after More revisit | 15.767s | 2.610s |
| Expense ready during first short More visit | No at 4.773s | Yes at 2.723s |

First post-install launch was separately observed ready at 7.343s. These are
UIAutomator upper-bound observations with hierarchy-dump overhead. Before cold
launch restored Community and then navigated Home; after cold launch went
directly Home. Use the main-navigation row for the cleaner startup comparison.
Runs occurred on different dates, so identical network/server/cache conditions
are not established. Both Community runs display seven visible rows.

The before process sample contains 29 verified-read completion events; the
post-corrective process contains one across startup and the measured screen
visits, consistent with removal of repeated native-read queuing. Observed
process-scoped fatal and React Native JS error counts are zero. Only allowlisted
event names, relative times and counts were retained; no raw logs/screens were
saved. This proves a substantial improvement for the reported wait, not instant
startup, a frame-jank result, or completion of the broader performance roadmap.

The tested product/test hashes are unchanged. The previous final full suite
(252 suites / 2,982 tests), typecheck and lint remain applicable; no full-suite
repeat was needed for this artifact-only resume. Follow-up documentation does
not change the installed runtime and does not require another build.

Evidence under the external root:
`approved-release/resumed-20261017-rDIKHe/`, plus
`before-device-loading.json` and `after-device-loading.json`.
Original dirty181 and its content/status hashes remain protected. No push,
server schema/policy/product-data change, Store action or automatic Walk work.
Next: PO reviews the installed loading behavior; stop pending direction.
