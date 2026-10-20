# Walk Phase 5A — Canonical Pet Progression

This implements Batch C only, under the [architecture freeze](./nuri-walk-experience-final-architecture-freeze.md) and after the [Phase 4 server/Native foundation](./nuri-walk-phase4-server-foundation.md). Memory/Account XP (D), product integration (E), and device/product validation (F) remain separate and inactive until Master routes them. No existing Native finish receipt or GPS/timer contract is changed.

## Canonical distance and Level

`get_pet_walk_progression_v1(p_pet_id uuid)` derives distance directly from `public.walk_sessions`, scoped to the verified `auth.uid()` owner and owned pet. Only undeleted `ACCEPTED_SERVER` rows with `PROGRESSION_ELIGIBLE` contribute `accepted_distance_m`. Memory, manual records, route backup and client provisional state are not contributors or prerequisites. There is no mutable lifetime counter.

Policy 1 is `T(L) = 500 × L × (L − 1)` meters, with no product Level cap. Exact integer exponential/binary search returns the largest threshold not exceeding distance. Zero distance is Level 1. PostgreSQL `SUM(bigint)` stays `numeric`; it is never narrowed back to signed BIGINT. Distance, count, Level, thresholds and progress numerator/denominator are decimal strings on JSON. The existing domain decoder's 256-digit input bound is a wire-validation bound, not a new Level policy.

The separate typed read adapter validates the returned policy/math, selected-pet binding and milestone allowlist against the frozen pure domain. It reconstructs only known fields. It does not fabricate canonical totals or alter the strict B2 finish receipt, outbox, Native codec, key or timer/GPS lifecycle. Machine error handling uses SQLSTATE plus structured `walkErrorVersion/walkCode` detail, never human message matching.

## Historical milestones

`public.pet_walk_milestones` persists `FIRST_GPS_WALK`, `10_KM`, and `100_KM`, unique by owner/pet/key/policy version. The acceptance trigger runs in the same transaction under the same cross-device owner advisory lock as finish/delete/read. Conflict handling never rewrites the first earned timestamp or source receipt. Quality-ineligible and deleted sessions cannot mint history.

Session soft deletion excludes its distance and recalculates the current Level at the next read, but does not revoke earned history. Route-only deletion changes neither distance nor history. Final pet/account deletion cascades the owned milestone rows. A final source-session erasure may null its source FK while leaving the independently retained receipt; this is not an app hard-delete capability. Existing accepted data is not backfilled or repaired.

## Security and deployment

The public read RPC is SECURITY DEFINER with explicit `search_path = public, pg_catalog`, live account/deletion/ban checks and owned-pet verification through the existing private actor guard. Only authenticated EXECUTE is granted; PUBLIC, anon and service_role EXECUTE are denied. Internal arithmetic/trigger functions are in the unexposed `walk_private` schema and have no direct client EXECUTE. The milestone table has owner-only SELECT RLS and no client DML grants.

Forward migration: `20261020042159_walk_phase5a_progression.sql`. The local CLI draft was aligned to the version returned by the targeted remote deployment before commit. No historical migration, B1 RPC body or known SEC017 timestamp mapping is rewritten. No bulk database push or history repair is part of this task.

The partial covering `walk_sessions_progression` index supports the canonical owner/pet aggregate. With zero retained Walk rows, the default plan currently chooses a tiny Seq Scan; disabling Seq Scan locally for an EXPLAIN demonstrates an eligible Index Only Scan, not production index utilization or a scale benchmark. Advisor differences include the intentional authenticated-definer read endpoint and an unused-index INFO. These are disclosed, not claimed as zero warnings.

## Evidence boundaries

Focused SQL tests run inside BEGIN/ROLLBACK with synthetic identities and pets only. They cover exact thresholds and large integer arithmetic, real B1 finish acceptance at 10/100 km, ineligibility, replay, deletion recalculation/history, route independence, owner/pet isolation, grants/RLS, ban state and final deletion cascades. Privileged max-BIGINT storage fixtures test arithmetic overflow only; they are not GPS quality or outdoor proof.

The independent-connection concurrency runner exercises same-finish replay, finish-before-delete historical retention, delete-before-finish rejection, and serialized delete/read recalculation. It owns one synthetic account/two pets, records actual lock waits, cleans only that exact scope, and verifies existing Auth/Pet fingerprints before/after. No real user is a QA identity.

The external `PHASE5A-PROGRESSION-REPORT.md` and JSON in the Master evidence root own exact source identity, test counts, deployment hashes, advisor deltas and preservation receipts. Host/repository/SQL verification is not authenticated HTTP end-to-end, GPS field evidence or Android device proof. Full Suite, build/install/device, push, Memory/XP and Home/Timeline/Profile/UI integration are not performed in C.

## Next handoff

Master reviews C and separately activates D. E/F must explicitly consume the typed progression read result and retain provisional-versus-confirmed presentation boundaries. No other Room is activated by this implementation or its report. Existing dirty project-memory/research files remain untouched; Master owns their later canonical reconciliation.
