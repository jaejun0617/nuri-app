# Walk Phase 4 — Server Foundation and Native Product Outbox

This is the implemented B1 server and B2 Native/service contract, subordinate to the [architecture freeze](./nuri-walk-experience-final-architecture-freeze.md). Progression (C), Memory/XP settlement (D), integration (E), and product UI (F) remain separate. Host verification is not device or authenticated HTTP evidence.

## Persistence and authority

`public.walk_sessions` is owner-private. Its user and pet foreign keys cascade on final deletion; `(user_id, client_session_id)` is unique. A partial unique index permits one ACTIVE reservation per user across pets/devices. Every mutation uses the same transaction advisory lock keyed to the authenticated user, then verifies the live Auth account, deletion-request state and owned pet under row locks. No caller-supplied user ID exists.

Authenticated direct INSERT/UPDATE/DELETE is denied. Owner SELECT uses RLS plus a private identity-only eligibility helper, including pending account deletion and ban/deleted state. Public RPCs explicitly grant authenticated EXECUTE only; PUBLIC, anon and service_role execution is revoked. Internal helpers use the unexposed `walk_private` schema with no client schema USAGE. The identity-only RLS helper has the required EXECUTE privilege; it is not an arbitrary-post/user oracle.

The six authenticated SECURITY DEFINER endpoints intentionally require server write privilege while table DML is denied. The Supabase advisor's six authenticated-definer warnings are reviewed endpoint notices, not silently suppressed. Auth checks, scope checks, safe search_path and adversarial tests are required for each.

## RPC signatures

| RPC | Purpose |
| --- | --- |
| `start_walk_v1(p_client_session_id uuid, p_pet_id uuid) returns jsonb` | Reserve one product session before Native collection |
| `finish_walk_v1(p_payload jsonb, p_payload_digest text) returns jsonb` | Parse, validate, recompute digest, serialize and accept/reject |
| `cancel_walk_v1(p_client_session_id uuid, p_pet_id uuid) returns jsonb` | Durable NOT_ACCEPTED_FINAL or an already resolved receipt |
| `get_walk_sessions_v1(p_client_session_ids uuid[]) returns jsonb` | Complete ordered resolution coverage for at most 100 IDs |
| `delete_walk_session_v1(p_client_session_id uuid, p_pet_id uuid) returns jsonb` | Erase measurement/quality, retain minimal revival defense |
| `delete_walk_route_v1(p_client_session_id uuid, p_pet_id uuid) returns jsonb` | Idempotent route deletion revision without distance deletion |

`src/services/walk/server/supabaseWalkRepository.ts` supplies the real Supabase RPC adapter. `fetchActiveWalkReceipt()` performs one RLS-protected ACTIVE lookup (limit 1), then reconciles it; this enables a second device to discover a lost reservation. Discovery never starts collection.

## User start, offline and cancellation

Reservation is online and must precede collection. There is no automatic lease expiry or transfer to another pet/device. Existing QA/legacy Native sessions have no production reservation and cannot be automatically credited. A lost start response retries the same preallocated durable ID. An explicit user action may cancel the reservation or recover the matching local checkpoint; another device cannot reconstruct the local raw route.

Offline finish is allowed after a successful reservation. B2 persists the exact finish request and digest in the existing encrypted Native checkpoint/outbox before sending it. No plaintext AsyncStorage queue, recent-100 scan as a complete outbox, JS timestamp-at-retry or new Native placeholder is supplied by B1.

A NOT_FOUND read is provisional. `cancel_walk_v1` serializes against finish and writes a final receipt if no accepted result exists. If finish wins, cancel returns ACCEPTED_SERVER; an explicit accepted-session deletion is separate. If cancel wins, later finish receives WALK_SESSION_DELETED. Deleted/cancelled identity cannot be revived.

## Canonical V1 and quality

The server independently enforces the existing exact V1 field set, UUID rules, decimal-string bounds through signed BIGINT, explicit-zone timestamp/calendar validation, supported versions, elapsed/active ordering and full quality-summary consistency. It reconstructs ordered whitespace-free UTF-8 JSON rather than hashing jsonb's presentation. Both Phase1 golden SHA-256 vectors are SQL assertions.

Native diagnostic `measuredDistanceM` includes rejected/stationary displacement. B2 must instead export durable Native `acceptedDistanceM`, flooring its accumulated decimal string once through `floorWalkFilteredDistanceM`, under the existing wire field `measuredDistanceM`. No JS Number conversion is used.

Eligibility reuses Algorithm1 candidate policy: non-mock; accepted fixes at least 10; total fixes at most 200,000; filtered integer distance 50..10,000,000m; active time at least 60,000ms; rejection dispositions 1..5 at most half of total (stationary suppression excluded); total gap at most 30% of active time; maximum gap at most 120,000ms; at least one accepted segment.

A conservative feasibility envelope also derives from the existing engine: speed at most 8.5m/s plus accuracy uncertainty at most `(25+25)*0.45 = 22.5m` per credited edge. Seeds add no distance, so `steps=max(0,acceptedFixCount-segmentCount)`. With one sub-millisecond allowance per credited edge and one final integer-meter allowance, exact numeric comparison is:

`proposalM*2000 <= (activeMs+steps)*17 + steps*45000 + 2000`.

This does not change GPS filtering/calibration. Structurally valid but quality-ineligible sessions are accepted with canonical distance `"0"` and PROGRESSION_INELIGIBLE_QUALITY. They still occupy their half-open accepted interval. The server does not attest that client-reported fixes or a coherent summary represent real walking. A digest proves byte agreement, not GPS authenticity.

JSON measurement/duration/revision values remain decimal strings; counters fit signed integer. No lifetime quantity or reward is invented client-side.

## Replay, overlap and receipts

Same owner/client ID + digest returns the existing receipt. A changed pet or digest conflicts. UTC `[start,end)` intervals permit touching edges. The owner lock covers all pets/devices and includes accepted quality-ineligible rows; deleted rows do not exclude future intervals.

The receipt core is `clientSessionId, petId, state, payloadDigest, deletedAt, recordClaimExists, summary, rejectionCode`. An accepted summary contains server session ID, normalized start/end, measurement/accepted decimal strings, eligibility, accepted timestamp and independent route metadata. No raw coordinates, route bytes, private profile or Auth fields are persisted/returned.

The decoder validates state/digest/deletion/summary invariants, positive bounded measured duration, owner-bound request identity and canonical digest. It reconstructs an allowlisted model and tolerates future additive server fields; future progression/claim fields require explicit typed integration rather than being spread blindly.

## Machine error transport

Permanent domain errors carry SQLSTATE 22023 or 42501 plus structured PostgREST `details` JSON:

`{"walkErrorVersion":1,"walkCode":"WALK_PAYLOAD_CONFLICT"}`.

The repository branches on this machine detail and SQLSTATE, never on human `message`. Unknown/network/server/invalid-response outcomes are WALK_SYNC_UNKNOWN_RETRYABLE and preserve the same durable Native identity. Overlap is a durable REJECTED_SERVER receipt with WALK_OVERLAP_CONFLICT.

## Deletion and privacy

Session deletion clears times, measurements, quality, versions, route preference/revision/times and acceptance/rejection detail; only scoped identity, digest, deletion state/time and claim-exists defense remain. Future claim/Memory/XP/milestone relations are not created in B1. Their independent retention rules remain frozen for C/D.

No route table or upload API is implemented in B1. LOCAL_ONLY is the default request choice. PRIVATE_BACKUP is only explicit independent intent in the finish request; no route is uploaded and backup failure cannot undo acceptance. Route deletion increments independent metadata without changing the finish digest or distance. Account/pet final deletion cascades all B1 rows; tests delete only owned synthetic fixtures.

## Validation and deployment

Three forward migrations record actual deployment versions (CLI generated drafts are aligned to the Management API's returned versions before commit):

1. `20261020024833_walk_phase4_server_foundation.sql`
2. `20261020025209_walk_phase4_feasibility_read_guard.sql` — actual impossible-distance counterexample and owner read tightening
3. `20261020025859_walk_phase4_machine_error_contract.sql` — structured transport detail, preserving receipt/transaction semantics

No historical migration or SEC017 timestamp is rewritten. Only these targeted migrations are deployed. Entire new schema + focused tests ran in rollback transactions before application. The scripts in `supabase/tests` are rollback-contained synthetic tests; run them between BEGIN and ROLLBACK. Existing Auth/pet triggers were inspected first. Independent CLI concurrency uses exactly one committed synthetic user/two pets at a time and exact owned cleanup; no real user is a QA identity.

The external PHASE4-SERVER-REPORT.md/JSON in the Master evidence root owns exact final source identity, test counts, catalog hashes, concurrency timings, advisors and preservation receipts. Full Suite, build/install, device/GPS QA and push are not part of B1.

## B2 handoff

1. Allocate and durably bind product intent, Native session ID and owner/pet before calling reservation. Preserve existing encrypted codec/checkpoint semantics and legacy ineligibility.
2. Only explicit Start may reserve and then start the existing Native collection. Recover/cancel uncertain reservation by the same ID; no automatic GPS start or pet switch.
3. Seal finish wall time and filtered summary at the existing Native FINISH boundary; floor filtered distance once and store the full normalized V1 payload/digest encrypted.
4. Use a complete durable owner-isolated outbox, not recent(limit 100), and reconcile in batches of at most 100 IDs. Remove provisional contributions only for authoritative receipts.
5. Unknown finish/cancel outcomes retain the same request until a durable resolution. A cancellation-winning final receipt can clear local pending state; a finish-winning receipt requires accepted-session deletion.
6. No Memory or Account XP call runs on finish. C/D remain separate phases. Optional private route backup remains unimplemented until its separately scoped adapter/security gate.

References: [Supabase functions](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [PostgreSQL advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS).

## B2 Native intent and encrypted journal

The existing `NuriWalk` module exposes `productApiVersion: 1`, `productGetBinding(ownerId)` and `productCommand(ownerId, bindingEpoch, operation, inputJson)`. These work independently of the QA compile flag. The existing authenticated-owner binding is reused; no new Native module, permission or automatic GPS startup is introduced.

`PREPARE` is only called from explicit Start. It rechecks Native foreground/precise-location/location-service gates, allocates a durable random session ID, immutable owner/pet and command receipt, and occupies the existing single slot in runtime IDLE. It performs constant-count indexed lookups, not a history scan. The encrypted PRODUCT phase is separate from frozen runtime state edges. `START` requires a matching ACTIVE receipt, the same owner epoch and another current Native start gate. It then starts the existing Native service/provider. Lost responses retry the durable identity; discovery and outbox scans do not reserve, start or resume GPS.

The PRODUCT phases are PREPARED, RESERVED, START_REQUESTED, START_FAILED, RUNNING, FINISH_PENDING, FINISH_INVALID, CANCEL_PENDING and RESOLVED. These are intent/synchronization states, not replacement runtime states. An unstarted reservation remains recoverable after failure. Process loss of a running session uses existing RECOVERY_REQUIRED behavior. Logout/auth switch seals active time and stops collection. Quiescent product slots are released without erasing their encrypted checkpoints. Cold binding to another owner also releases a foreign dormant slot; explicit owned Start/recovery reacquires the slot and refuses an occupied competing slot. It never transfers the pet/session or auto-resumes a prior owner's data.

Room schema remains version 2. Codec V1 encoding/decoding, strict trailing-byte behavior, key and existing metadata/finish AAD are preserved. Only explicitly created product intents use Codec V2, appending a bounded encrypted journal. V1/QA sessions decode with no product purpose and cannot enter the production settlement API. Legacy QA mutation/start/cleanup paths refuse PRODUCT sessions, including in QA Release. Notification pause/resume dispatches by the actual Native session purpose rather than the QA bridge.

Journal-only receipt/error writes preserve runtime revision and timing anchors. They seal fresh random AEAD nonces under the existing current revision AAD. Actual runtime edges alone advance the command revision. The existing `finishNonce/finishCiphertext` remains the finish metadata envelope; it is not reused as plaintext or an unrelated queue slot.

## B2 finish, replay and deletion

Native stops collection/service, persists the true finished wall checkpoint and constructs an allowlisted scalar V1 request from filtered accepted distance, quality counts and active/paused durations. No route buffers or coordinate fields enter this request. Native floors the accumulated accepted-distance decimal once. JS checks canonical bytes/digest and compares the filtered decimal with B1's exact string-floor utility; it does not convert distance to Number or manufacture a retry time. Invalid duration/clock order yields FINISH_INVALID and a preserved checkpoint, never smoothing/clamping. Existing FINISHED_LOCAL storage seals the payload and digest before any network operation.

`SCAN(after)` keyset-pages ALL rows, decrypting at most 100 per Native call and excluding foreign/V1/resolved entries. An empty filtered page still advances its cursor. There is no recent-100 truncation or arbitrary drop/cap of unsent requests. Server resolution uses complete batches of at most 100 identities. NOT_FOUND, timeout, malformed and unknown responses keep the same request; only authoritative terminal receipts resolve it. Native independently validates the receipt core, digest binding, timestamps, duration/distance bounds and eligibility invariants.

`REQUEST` persists CANCEL/DELETE_ROUTE/DELETE_SESSION intent before RPC. Cancellation is allowed only when quiescent/locally finished. A finish-winning cancellation retains the accepted result; session deletion is a separate explicit request. Route deletion atomically erases chunks/distance and updates encrypted metadata/journal, with rollback on any failed write. It does not delete canonical session distance or the immutable finish identity. An already server-deleted route does not create a stuck pending flag. Session DELETED clears local measurements/payload/route, retaining the encrypted minimal identity/receipt tombstone. `PURGE_RESOLVED` accepts only authoritative DELETED/NOT_ACCEPTED_FINAL; it never interprets a failed read as permission to erase.

`PURGE_FINAL_SCOPE(petId, ACCOUNT_FINAL|PET_FINAL, after)` is a bounded owner/purpose-isolated cleanup handoff. E/F must call it only after confirmed final server deletion with the still-bound owner and no active session, before releasing that auth binding. It does not erase unrelated, other-owner or V1/QA rows. Route-only deletion, Memory deletion and final account/pet deletion remain independent contracts.

## B2 typed orchestration and remaining integration

`createProductionWalkService(contextReader)` binds the actual Native port to B1's Supabase repository without subscriptions, auth lookups, network or GPS work at import/construction. E/F supplies existing cached owner, foreground state and a revision that changes on logout/relogin and foreground boundaries. Native binding epochs fence old callbacks even when the same owner logs back in. Every awaited response is checked before further work; Native validates the epoch again at receipt writes/control commits.

Only `start()` or explicit `startPrepared(id)` can reserve/start. `control(FINISH)` returns the durable local checkpoint without waiting for network. Explicit foreground `flush()` reconciles pending pages, then retries the identical finish/cancellation/deletion request. RPCs have a scoped 15-second deadline, clear their timers and release single-flight entries. A late response may settle on the server but has no Native continuation; the next same-ID reconciliation resolves uncertainty. Discovery never synthesizes a local session from another device's reservation.

Future C receipts may add progression fields. B1's JS decoder reconstructs the exact V1 core before passing it to Native; Native deliberately rejects unparsed extra fields. C/D must introduce explicit typed consumption of additions, not weaken the Native core contract or spread server JSON. B2 supplies no provisional lifetime, Level, milestone, Memory or Account XP writes. Private route upload/opt-in remains absent and product payloads default LOCAL_ONLY.

E/F still owns product entry/UI, explicit permission explanation/prompt, lifecycle invocation, result/cleanup handling and final APK/device/authenticated end-to-end smoke. The scoped Native host runner uses the committed Room v2 schema/DAO SQL on isolated SQLite with injected AES keys and host platform ports. It excludes real Android Keystore/FGS/provider/device assertions. The affected existing lifecycle test bodies run through those ports; an ignored real-keystore test is disclosed. Full Suite, APK build/install, real-device and timer ten-minute gates are not rerun in B2. Exact source/test/limitation receipts are in the external `PHASE4-NATIVE-OUTBOX-REPORT.md` and JSON.
