# NURI Walk Experience Final Architecture Freeze

Status: FINAL_APPROVED architecture; Phase 1 implementation only. V1.0 scope INCLUDED.
Policy versions: progression 1, finish payload 1, quality schema 1, initial algorithm identifier 1.
This is an independent canonical Walk contract. Master/Roadmap/Index reconciliation is deferred;
their original dirty copies are not imported into this branch. STORE HOLD. No automatic next phase.

## 1. Product Decisions

The product is a lifetime record of distance walked together with a pet, not a live tracking network.
Two independent rewards: accepted GPS distance grows the pet's Walk progression; saving that
experience as a normal memory enters the user's existing record XP pipeline. GPS finish and CTA
click alone grant no Account XP, memory count or streak. Manual walks remain unchanged and never
contribute distance to Walk Level. Previous manual history is not retrospectively credited.
One user, one active walk, one fixed pet per session. No family tracking, public route, live
Community location, broadcast, leaderboard, competitive ranking or new RPG/XP engine.

## 2. State Axes and Transitions

| Axis                 | Contract                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Native runtime       | IDLE, STARTING, WALKING, PAUSED, FINISHING, FINISHED_LOCAL, RECOVERY_REQUIRED, CANCELLED_LOCAL |
| Server sync          | SYNC_PENDING, SYNCING, UNKNOWN_RETRYABLE, ACCEPTED_SERVER, REJECTED_SERVER                     |
| Accepted eligibility | PROGRESSION_ELIGIBLE, PROGRESSION_INELIGIBLE_QUALITY                                           |
| Derived record       | RECORD_PENDING, RECORDED, RECORD_DELETED; null before acceptance                               |
| Route backup         | LOCAL_ONLY, BACKUP_PENDING, BACKED_UP, BACKUP_RETRYABLE, ROUTE_DELETED                         |
| UI signals only      | GPS_WEAK, GPS_LOST, MILESTONE, LEVEL_UP                                                        |

Allowed runtime edges: IDLE -> STARTING; STARTING -> WALKING or IDLE (failed start);
WALKING -> PAUSED, FINISHING or RECOVERY_REQUIRED; PAUSED -> WALKING, FINISHING or
RECOVERY_REQUIRED; FINISHING -> FINISHED_LOCAL; RECOVERY_REQUIRED -> PAUSED, FINISHING or
CANCELLED_LOCAL. Every other pair, including a no-op, returns WALK_INVALID_STATE_TRANSITION.
No timer, implicit jump, automatic reset or side effect. Archive a terminal session before creating
a new IDLE identity. The start guard only checks a supplied local runtime state: cross-device
serialization is a Phase 4 server responsibility, not a capability of this pure contract.

## 3. Canonical Sources

Walk distance is SUM(accepted_distance_m) over undeleted ACCEPTED_SERVER and eligible sessions
within the verified owner/pet scope. Memory, route and CTA existence are not aggregation conditions.
Lifetime/season/week distance, level, progress, GPS count and duration are derived; any cache must
be rebuildable. The pure aggregate expects one reconciled contribution per session and rejects
duplicate IDs. It neither authenticates inputs nor queries or writes a database.
Account XP amounts remain exclusively in existing user_xp_ledger and existing server policy.
Record status comes from session acceptance, immutable claim and original memory existence.
Deleted session with an existing claim retains RECORDED or RECORD_DELETED; deleted unclaimed
session yields null, not an actionable RECORD_PENDING. Impossible relations return a stable error.

## 4. Units, Payload and Quality

Canonical distance is nonnegative integer meters; durations are integer milliseconds. Internal
math uses bigint. Every measurement on the JSON wire is a decimal string; never serialize bigint
directly. Explicit number conversion rejects values above Number.MAX_SAFE_INTEGER. Per-session
wire values fit PostgreSQL signed BIGINT (maximum 9223372036854775807). Generic decimal parsing
has a 256-digit input bound; progression itself has no product-level maximum.

WalkFinishPayloadV1 has exactly: payloadVersion, clientSessionId, petId, startedAt, endedAt,
measuredDurationMs, activeDurationMs, measuredDistanceM, algorithmVersion, qualitySchemaVersion,
qualitySummary, routeBackupChoice. IDs are normalized UUIDs. All fields required; none optional
or nullable. No userId claim, acceptedDistanceM, coordinates or extension fields.
Timestamp wire form accepts explicit Z or numeric offset and up to three fractional digits,
normalizes UTC to millisecond ISO, rejects invalid calendar dates and ambiguous local timestamps.
The four-digit supported calendar starts at year 0100. Start must precede end. Measured elapsed
duration must be positive and no greater than the UTC interval; active duration cannot exceed it.
Clock discontinuities require an explicit native recovery/validation path, not silent clamping.

WalkQualitySummaryV1 has exactly schemaVersion, totalFixCount, acceptedFixCount,
rejectedAccuracyCount, rejectedTimestampCount, rejectedDuplicateCount, rejectedJumpCount,
rejectedSpeedCount, stationarySuppressedCount, segmentCount, gpsGapDurationMs, maxGapDurationMs,
mockLocationObserved. Fix/segment counters are integers in 0..2147483647; terminal disposition
counters are mutually exclusive and their sum cannot exceed total fixes. Segment count cannot
exceed accepted fixes. Maximum gap cannot exceed total gap; total gap cannot exceed measured
duration. Gap wire values are decimal strings. Unknown, hidden/accessor, coordinate, overflow,
negative and unbounded fields are rejected. These are structural consistency constraints, not GPS
calibration thresholds or cryptographic proof of real walking. Algorithm 1 must still be implemented
and physically tuned in Phase 3; mock-location status is only a quality signal.

## 5. Canonical Bytes and Idempotency

The parser reconstructs payload and quality keys in the exact order listed above, including false
and zero values. Normalize UUID case, decimal leading zeros and timestamp offsets before JSON
serialization. UTF-8 JSON has no whitespace; no omitted/null variant exists in V1.
SHA-256 uses the existing pure-JS @noble/hashes dependency and existing buffer package. No new
hash dependency, Node crypto, native bridge or WebCrypto is imported by the domain. Test-only
Node crypto independently verifies fixed vectors in walkPhase1Payload.test.ts:

| Vector                       | Expected SHA-256                                                 |
| ---------------------------- | ---------------------------------------------------------------- |
| LOCAL_ONLY, 696 UTF-8 bytes  | dc77b2bc30280200bf5da43babce17b37134a090ec8f87c2e4c64dd72918b6fd |
| Same payload, PRIVATE_BACKUP | a3dffb3d91caffafa61bed56ba761aec48698a67ef3acfd1821971ffdd4b93c1 |

Same owner-scoped client ID and canonical digest returns the original accepted result; different
payload returns WALK_PAYLOAD_CONFLICT. Deleted receipt always rejects revival even with the
same digest. Scope comes from authenticated server context, never client strings. Server recomputes
the digest in Phase 4. Digest is not a signature, authorization or trust proof. Future private-backup
preference edits do not alter the immutable original finish request/digest used for retry.

## 6. Offline and Recovery

FINISHED_LOCAL + SYNC_PENDING preserves the result and outbox. UNKNOWN_RETRYABLE denotes
an unknown server outcome, not rejection. Reconcile using the same identity/payload, never create
a fresh ID to bypass a lost response. Confirmed distance is replaced by the authoritative server
snapshot. Provisional display adds only unresolved local pending measurements; accepted, rejected
or deleted reconciliation receipts remove those IDs. No permanent level-up, milestone receipt or
XP is generated from a provisional snapshot. The server adapter must supply complete resolution
coverage for the pending IDs; the pure projection cannot discover a lost response itself.
Cancellation after an uncertain finish must wait for serialized server resolution. A NOT_FOUND
read is insufficient while finish can be in flight. NOT_ACCEPTED_FINAL means a durable server
cancellation receipt blocking later acceptance; only then may local outbox cancellation complete.

## 7. Progression and Milestones

Policy 1: T(L) = 500 _ L _ (L - 1) meters, L >= 1. Largest threshold not exceeding confirmed
distance is the current level. Integer exponential-bound/binary search avoids floating sqrt errors.
Progress is an exact integer numerator/denominator; percentage is display-only. Thresholds:
L1 0m, L2 1000m, L3 3000m, L4 6000m, L5 10000m, L10 45000m, L20 190000m,
L30 435000m, L40 780000m, L50 1225000m. No hard ceiling. Future policy changes require PO
approval, impact simulation, recalculation policy and user explanation; distance stays canonical.
Permanent candidates: FIRST_GPS_WALK, 10_KM, 100_KM. Ephemeral per-session feedback:
SESSION_500_M, SESSION_1_KM, SESSION_20_MIN. Caller-owned earned/shown keys suppress repeats;
actual durable receipt uniqueness is Phase 4/5A. Quality-ineligible sessions never grant distance
milestones. Earned milestones remain historical memories even if session deletion lowers level.
Existing user_titles is user-scoped and is not reused as a pet-scoped distance ledger.

## 8. Record and XP Contract

Manual memory preserves existing XP/count/streak/title. GPS eligible acceptance adds distance but
creates no memory. Accepted quality-ineligible session may create a linked record for normal XP
but adds no progression distance. Rejected GPS cannot link a memory; explicit user-selected manual
fallback is permitted, without a GPS session link or canonical GPS distance claim.
Future create_walk_memory_from_session_v1 writes memory, immutable claim, existing daily activity
and existing award_user_activity_xp_v1 result in one transaction. Use walk_timeline_post with
timeline_memory/original memory ID, not a new GPS reward event. Existing recordTimelineCreateActivity
is best-effort client post-processing; GPS mode must not call it again after server settlement.
One session -> at most one original memory and one settlement. UNIQUE(session_id),
UNIQUE(original_memory_id), row locking, existing XP source-once and ledger uniqueness together
enforce this in Phase 5B. Pure plans are not concurrency locks or proof of a DB commit.
All settled outcomes consume the claim: XP_AWARDED, ZERO_XP_VALID,
RECORD_CREATED_NO_XP_BY_POLICY. Only XP_AWARDED has a nonempty XP ledger reference; no XP amount
is copied into the claim. Normal zero commits; unexpected reward error rolls back memory/claim
and preserves draft. No next-day automatic re-award. Retry/double-tap/other device returns the
original existing result, regardless of the candidate memory ID; deleted original memory denies
recreation. Claim identity validation and reward-source binding cannot replace the original memory.

## 9. Record Presentation and Date Attribution

Walk Result is followed by optional existing RecordCreateScreen GPS mode, not a duplicate form.
Pass session ID/return target only; load canonical summary from the repository, never navigation
numbers. Pet, session ID, source, timestamps, duration and accepted distance are read-only. Title,
memo, photo and existing permitted tags remain editable; draft scope is user + pet + session.
Default CTA: record the walk, with conditional existing-policy XP explanation; never promise
guaranteed XP. Home shows only the newest undismissed pending session within seven days.
Dismissal is per owner/session; all pending walks remain discoverable in history. No repeated modal,
push spam or mandatory record. Prompt metadata is not progression data.
Reuse unchanged NURI date.ts and seasonal/season.ts with explicit inputs. Walk/occurred date and
actual season use startedAt in KST, including overnight walks; week begins Monday KST. XP/streak
use memory server save date in KST, not backdated occurredAt or presentation-selected season.

## 10. Deletion and Minimal Tombstones

| Delete action           | Frozen effect                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Route only              | Erase local/remote route; retain session distance, level, memory, claim and XP                                                           |
| Memory                  | Retain session distance/level, claim and earned XP; existing count/streak delete policy; recreation denied                               |
| Session                 | Exclude distance, recalculate current level, erase route/measurement/quality; retain memory/XP/claim/milestones and minimal tombstone    |
| Uncertain local pending | Resolve server outcome first; cancel outbox only with final absence/deletion receipt; no unclaimed memory/XP                             |
| Account/pet final       | Erase all Walk data, routes, milestones, claims, prompt metadata, outbox and tombstones; preserve existing account XP deletion semantics |

Tombstone allowlist: clientSessionId, verified owner scope, payloadDigest, deletedAt,
recordClaimExists. It is not an aggregation source and retains no measurements, coordinates,
route or sensitive quality payload. original_memory_id is a retained logical identifier in the claim,
not a cascading memory foreign key that erases the once-only defense. Future route revision and
route_deleted_at prevent stale upload from resurrecting an erased route. The revision guard is
independent of session progression and cannot itself re-enable a deleted route.

## 11. Future Server Schema and Transactions (Not Implemented)

| Relation            | Source/constraints                                                                                                                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| walk_sessions       | Server UUID, owner/pet, unique client_session_id, immutable normalized finish fields/digest, measured/accepted integers, eligibility, accepted_at, nullable deleted_at, separate prompt/backup metadata, route_revision and route_deleted_at; minimal tombstone after deletion |
| walk_routes         | Unique session_id, version/precision, simplified encoded segmented route, point_count, created_at; optional owner-only private backup                                                                                                                                          |
| walk_record_claims  | Unique session_id and original_memory_id, claimed_at/settled_at, three settled outcomes, nullable XP ledger reference; no duplicate amount ledger                                                                                                                              |
| pet_walk_milestones | Unique owner/pet/milestone_key, threshold meters, source session receipt, policy version and earned_at                                                                                                                                                                         |

No table/RPC/migration is created in Phase 1. Future direct DML is denied; owner/pet reads and
narrow server-controlled RPC writes verify authenticated ownership and account-deletion state.
finish_walk_v1 validates versions, bounds, quality, replay and user-level overlapping live accepted
intervals, then returns session/progression receipts. UTC half-open [start,end) allows touching edges.
Quality-ineligible accepted sessions still participate in overlap; deleted sessions do not. User-level
locking must cover all pets/devices. Finish never creates memory or grants Account XP. Private route
upload failure never rolls back session acceptance. Local source declarations are not remote proof.

## 12. Native and Privacy Boundary (Future Phases)

Android-first: existing map foundation; FusedLocationProviderClient, explicitly user-started location
FGS, persistent notification, typed bridge, Room metadata and authenticated encrypted point chunks
with Keystore-protected non-exported key and unique nonce per chunk. No raw GPS server upload,
plaintext coordinates in AsyncStorage, logs, analytics or Crashlytics. Screen-off/background preserves
an already started foreground walk. No automatic tracking after force-stop/reboot; user resumes or
finishes from recovered checkpoint. Logout immediately stops collection and isolates owner outbox.
Simplified route backup is private opt-in, default OFF. Summary/level recover on another device;
local-only routes do not. Public sharing is absent. No new map SDK by default; seasonal accents use
existing tokens for route/marker/progress/CTA, never a seasonal wash over the map.
Permission/FGS declarations, background-location avoidance, Data Safety and privacy-policy claims
require current official policy verification at their implementation gate, not speculation in Phase 1.
No existing security finding is reopened: accepted 20/20 remains frozen; SEC-021 separate LOW.
New surfaces go to the final source-frozen re-audit: native permission/bridge/FGS, persistence,
RLS/routes, replay/overlap/claim, account/pet cleanup, redaction and policy disclosure.

## 13. Failure Contract

| Event                                     | Expected preservation/recovery                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| Permission denied or GPS disabled         | No tracking/credit; existing result untouched; explicit retry after user correction       |
| Weak/lost GPS or gap                      | Signal quality separately, preserve accepted segments, no straight-line gap credit        |
| Network offline/save timeout              | FINISHED_LOCAL outbox; same-ID UNKNOWN_RETRYABLE reconciliation; provisional display only |
| Background/screen off                     | Native foreground session and durable checkpoint continue                                 |
| Process/service kill or reboot            | RECOVERY_REQUIRED from encrypted checkpoint; no automatic location restart                |
| Double start or pet switch                | Block local second start; fixed pet; no replacement of active identity                    |
| Duplicate finish/record or another device | Same identity replay/claim receipt; server serializes overlaps and settlements            |
| Repeated pause/resume                     | Explicit edges only; pause adds no distance; durable checkpoint                           |
| Logout/account deletion                   | Stop collection, isolate owner queue; final delete erases local/remote Walk data          |
| Session/route/memory delete               | Independent frozen effects and replay/route-revision guard                                |
| Quality ineligible                        | Preserve accepted session and optional normal record; zero lifetime credit                |
| Permanent rejection                       | No linked memory/progression; optional explicit manual fallback                           |

## 14. Frozen Phase Boundaries

Six phases; 5A/5B/5C have independent commit/exit gates. No automatic next phase.

| Phase | Goal/scope                                                                                                  | Tests/device/database/security                                                                                                                           | Commit, exit and rollback                                                                                             |
| ----- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1     | Pure domain, types/state/progression/payload/claim/delete/vectors and this document                         | Exact targeted tests, full-project typecheck, scoped lint; no device/DB/native/UI                                                                        | One isolated domain commit, all local gates and PO review; revert isolated commit if approved                         |
| 2     | Native FGS/location client, typed bridge, encrypted Room/checkpoints, pause/finish/recovery and logout stop | Native tests and S24 screen-off/background/process-restart/one-active/stop/encryption; no server                                                         | Separate native-runtime commit; all physical gates and PO approval; disable new runtime without altering old records  |
| 3     | Filters, anti-drift distance, segments, simplification and minimal QA screen                                | S24 repeated open-area 1km error <=5%, urban <=10%, stationary 10min drift <=20m, paused increase 0, gap credit 0; battery/CPU/memory/thermal comparison | Separate measured-engine commit; PO physical approval, no silent threshold relaxation; retain checkpoints on rollback |
| 4     | Session/RLS/finish/replay/overlap/outbox/delete, optional route sync and account/pet cleanup                | Server A/B ownership, direct DML deny, duplicate/unknown recovery/deletion races; migration first approved here; no Memory/XP/Home                       | Separate session-server commit; exact remote/evidence gates; preserve accepted data and disable writes on rollback    |
| 5A    | Canonical progression, milestones and Result/provisional UX                                                 | Pure/server/native acceptance and durable receipt once-only checks                                                                                       | Separate progression/result commit and acceptance gate; server sessions remain canonical                              |
| 5B    | Atomic linked Memory/claim and existing Account XP                                                          | Zero/no-policy-XP, unexpected failure rollback, multi-device/delete/recreate and draft recovery                                                          | Separate reward commit/gate; disable new claim creation without deleting receipts/XP                                  |
| 5C    | Existing form prefill, Home pending/history, Timeline/Profile and week/season                               | Manual compatibility, immutable summary, late save KST and relation-based record status                                                                  | Separate integration commit/gate; disable new surfaces without altering accepted sessions                             |
| 6     | Walk design, all states/copy, four seasons, Handling/responsive/accessibility/privacy materials             | PO visuals, physical and width/fontScale matrix plus current Store policy evidence                                                                       | Separate design/handling commits; full approvals required; preserve data while restoring approved presentation        |

## 15. Source and Phase 1 Evidence

Implementation base: ce53108e771cca34135147593d83ed06561f5ed5.
Base tree: 27f8d22d2a3209e1b5f8c79da1b0e37f448dbd2e.
Includes the accepted security chain ending f98cbc94 and graph integration, not the original dirty
181 paths. Graph integration is not promotion to final visual approval. Domain implementation
touches no existing helper, screen, backend/native code, lockfile or security contract.
Tests: walkPhase1State, walkPhase1Progression, walkPhase1Payload, walkPhase1Lifecycle.
Initial fail-first: exact four selected suites failed because the domain did not exist (zero assertions
executed); not counted as a product failure or passing evidence. Subsequent behavioral fail-first
executed 17 lifecycle tests: 2 assertions failed (malformed claim identity and mismatched reward
source), 15 passed; minimal guards close both. Exact-file selection excludes other suites.
Plain clean-checkout typecheck initially lacks ignored local Supabase config. Full-project verification
uses that existing input read-only through a compiler host, without writing/copying configuration,
printing values, contacting the backend or changing project settings. Dependencies are from the
immutable lockfile, install scripts disabled; no native build or dependency upgrade.
Full suite is not repeated because only isolated new domain/tests/document are added.

Final Phase 1 local evidence: 4 selected suites / 145 tests PASS, unexpected selected files 0;
full-project no-emit TypeScript PASS with the read-only existing configuration input;
targeted ESLint 0 errors / 0 warnings. Domain coverage: statements 96%, branches 94%, functions
100%, lines 95.78%. These are host contract tests, not native/server/device acceptance evidence.

## 16. Next Action and Freeze

Phase 1 is submitted for PO review. Phase 2 readiness means domain foundation only, not permission
to start native implementation. No Phase 2 work, build/install, database mutation, push, Store or
automatic design work is authorized by this document. No exact contradiction remains in the pure
contract; runtime/server concurrency, tuned GPS accuracy and operating-policy acceptance are
explicit future gates, not claimed implemented results. Original project-memory/release-checklist
updates belong to later scoped reconciliation, not this dedicated Phase 1 commit.
