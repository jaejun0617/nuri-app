# Walk Phase 5B — Atomic Memory / Existing Account XP

Batch D only, after [Phase4](./nuri-walk-phase4-server-foundation.md) and [Phase5A](./nuri-walk-phase5a-progression.md), under the [freeze](./nuri-walk-experience-final-architecture-freeze.md). UI integration, Native lifecycle and signed-in HTTP/device proof remain E/F. No GPS finish, entry, getter or prompt automatically creates Memory or awards XP.

## Atomic write contract

`create_walk_memory_from_session_v1(p_client_session_id uuid, p_pet_id uuid, p_memory_id uuid, p_request_id uuid, p_record jsonb) returns jsonb` requires an owned, undeleted ACCEPTED_SERVER session. Eligible and quality-ineligible accepted sessions can create a normal Memory; ineligible distance remains zero. Pending, rejected, cancelled, deleted and legacy QA sessions without canonical acceptance cannot link.

The server derives actor from auth.uid(), fixed pet from the accepted session, category `walk`, occurred_at from startedAt in KST, and created_at from transaction now(). The caller supplies only candidate Memory/request IDs and editable title/content/emotion/tags/photo paths. Title1–100, content≤5000, tags≤20 with each≤100, image paths≤10 with each≤1024, and JSON≤32KiB are validated. Existing image-reference ownership checks remain authoritative. Metadata, source, category, user/pet reassignment, dates, distance, quality and reward are not trusted draft fields.

Lock order: existing Walk-owner advisory lock → owned live Auth/pet guards → session row → new Memory → existing daily summary/possible internal bonus → existing XP account lock. Do not pre-acquire XP before the daily summary. Linked-Memory row triggers perform only nonlocking claim lookups, not inverse Walk/XP lock acquisition.

In one transaction, insert Memory, call existing daily activity with `timeline_walk_post` / original Memory UUID, call existing XP with `walk_timeline_post` / `timeline_memory` / that UUID, validate actual results/ledger binding, persist immutable claim, set record_claim_exists, and clear obsolete dismissal metadata. Unexpected daily/bonus/XP/title/summary failure aborts everything. No best-effort manual helper is transaction truth.

## Existing reward policy, not a new engine

Walking base39, shared walking event limit3 per pet/KST day, account non-bonus cap150, current level decay and internal streak3/7/30 bonuses remain unchanged. The daily RPC owns its existing bonus; D never calls it a second time. XP/streak date is server-save KST day, not backdated occurred date. The old same-created-day source guard remains intact.

Positive/partial awards require one real ledger reference. Normal zero persists ZERO_XP_VALID without a fake zero ledger. RECORD_CREATED_NO_XP_BY_POLICY is a reserved schema/domain value, not a fabricated success: current production policy has no such branch. Any missing function, unsupported source, empty response or unexpected exception remains failure/unknown, never successful zero/no-policy.

The only existing XP-function behavior change is a claim-specific lookup after its existing account XP lock. A settled linked source cannot earn again through the old public RPC, including a zero settlement after its temporary cap later becomes available. Manual unclaimed sources retain their original path. No caller-settable internal bypass flag exists; the first legitimate reward happens before final claim insertion inside the same transaction.

## Claim, edits and deletion

`walk_record_claims` has unique session and original Memory identities, owner/pet final cascades, request/settlement timestamps and outcome, and optional real ledger reference. It has no Memory FK that could erase defense and stores no duplicate XP amount or measurement snapshot. Direct client DML is denied. Existing Memory RLS is not loosened.

Linked Memory ID/user/pet/category/created_at/occurred_at/source metadata stay immutable. Existing title/content/emotion/tags/photo editing is permitted. INSERT with a retained claimed UUID and UPDATE of another Memory ID into that UUID are both denied. Manual record edits remain unaffected.

Memory deletion retains session distance, claim and earned XP, and uses the existing count/streak deletion path; E must keep its normal daily-source removal/invalidation. Retry cannot recreate the original. Session deletion retains Memory content/claim/XP/milestone history but erases measurements: every D read returns summary null, including Timeline batch. No second measurement ledger exists under claim or editable metadata. The retained Memory's ordinary date/content are not a verified GPS time/distance receipt.

A deleted-session CREATE retry is denied, including when claimed, matching the actual pure create plan. Separate read still returns RECORDED/RECORD_DELETED from retained claim and original Memory existence. An unclaimed deleted session has no record action. Route-only deletion changes none of this. Final pet/account deletion cascades D rows; existing XP ledger pet SET NULL and account cascade semantics remain unchanged.

## Read, history and prompt APIs

- `get_walk_record_v1(clientSessionId,petId)`: bound full Memory/claim/record state and live canonical scalar summary. Used for explicit result/create/replay reconciliation.
- `get_walk_memory_summaries_v1(memoryIds uuid[])`: one call for1–100 unique requested Memory IDs. Returns only Memory ID, pet/client session, source/link state, sessionDeleted and scalar summary. No body/photos/claim XP audit/quality/route/credential fields. Only live original Memories with valid owned claims appear; manual/deleted/unavailable IDs may be absent.
- `get_walk_record_history_v1(petId,limit=30,cursor=null)`: owned accepted undeleted history, limit1–100 plus one, lean linked-record references, hasMore/nextCursor. Dismissed/older unrecorded walks remain discoverable. Keyset is accepted_at DESC/client_session_id DESC. Cursor version1 binds pet/pageSize and preserves six microsecond digits; never rebuild it from millisecond presentation timestamps.
- `get_walk_record_prompt_v1(petId)`: newest acceptedAt within7days, unclaimed, undismissed and undeleted, or null. It creates no notification and does not force recording.
- `dismiss_walk_record_prompt_v1(clientSessionId,petId)`: explicit owner-only idempotent dismissal. Claim creation clears obsolete preference; session soft deletion atomically erases its dismissal row. Account/pet final deletion cascades preferences.

All six public RPCs are SECURITY DEFINER with fixed public/pg_catalog search_path, explicit authenticated-only EXECUTE and server owner/account/pet checks. PUBLIC/anon/service_role execution is denied. Private helpers/triggers have no client execution. Claims/dismissals use owner-readable RLS with no client DML.

## Typed E/F handoff

The separate `recordRepository` strictly decodes full receipts, lean batch/reference shapes, exact quantity strings, KST dates, bound IDs, settlement and microsecond cursor. Missing/malformed/unknown replies remain retryable with preserveDraft; no fallback manufactures successful zero. Replay returns original Memory/claim but null reward/activity, preventing repeated celebration.

Batch callers capture an explicit MemoryID→expectedPet mapping before await. E must additionally fence current auth/selected-pet async context; the decoder is not a replacement for that lifecycle guard. Draft scope helper is owner+pet+session. Physical draft persistence/recovery and clearing only the matching scope after validated commit remain E responsibilities. Importing this adapter performs no record request.

GPS mode must bypass client recordTimelineCreateActivity after server settlement. It must consume the committed Memory ID, handle an original-ID replay even when a retry used another candidate, and safely reconcile candidate photo uploads. Use lean server source projection for verified fields, not editable Memory.metadata or category/tag alone; deleted-session summary null means no verified distance/time badge.

E also owns relevant Memory/month/count/streak/title/level/ranking refreshes, original selected-pet isolation, existing record form/image signing and return navigation. No Home/Timeline/Profile/Record UI, Native core, timer/GPS, Activity XP engine or unrelated service is changed in D.

## Deployment and evidence

Forward migration: `20261020050949_walk_phase5b_memory_xp.sql`; the CLI-generated draft was aligned to the remote-assigned version before commit. Existing applied migrations and known older timestamp mappings are preserved, not bulk pushed/repaired.

Real focused SQL tests run in BEGIN/ROLLBACK with owned synthetic identities only. They cover positive39/partial33/zero, internal bonus and actual injected unexpected reward rollback, direct old-RPC zero fence with budget freed, edits/reinsert/ID-update guards, KST midnight/overnight/delayed saves, lean read/privacy, pagination precision/gaps, prompts/dismissal deletion, roles/RLS and final cascades. SQL-role evidence is not mobile Auth/HTTP or GPS attestation. External PHASE5B-MEMORY-XP-REPORT.md/JSON owns actual final counts, concurrency outcomes, deployment hashes, advisor changes, original181 preservation and evidence limitations.

Full Suite/build/install/ADB/Metro and push are not run in D. Store HOLD. Master reviews the objective D gate and separately routes E; D does not activate another Room or start F.
