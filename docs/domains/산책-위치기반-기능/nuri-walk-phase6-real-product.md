# Walk Phase 6 - Real Product Integration / Batch F

Owner: Walk GPS / Native / Presentation. Base `fea006229e61017fbb0377fd541dc908e852af8a`.
This document owns F's implementation and remaining release boundaries. Exact source,
test totals and final commit/tree belong to the external
`~/.codex/nuri-walk-real-product-20261020/PHASE6-REAL-PRODUCT-REPORT.md/.json`.
The latest PO serial activation supersedes older memory saying Phase 4 is forbidden.
No SQL/RPC/RLS/server deployment, build, install, ADB or device operation occurs in F.

## Product entry and ownership

The existing Home first Walk widget opens typed `WalkProduct({petId})`; other quick
categories and the ordinary manual composer remain unchanged. There is no second
Home start CTA. The temporary QA-only Home entry remains pending separate PO removal
approval. `WalkProduct` preserves the existing Walk navigation transition contract.
Production composition does not require QA enabled or use the QA controller/transport.

Opening/discovering/reconciling reads owned product checkpoints only. It never asks
permission, allocates an intent, reserves, starts or resumes GPS. Explicit Start reads
the current permission; an existing precise grant starts in one tap. Only a needed
permission request opens the explanation and waits for its explicit primary, then B2's
production service. Native rechecks permission/foreground/location and the server
reservation before collection. An OS permission-dialog lifecycle change cancels the
old context and presents an explicit retry, not a silent late start. Auth/pet/route
changes fence old continuations. The active session pet stays fixed.

All keyset pages are considered globally: real active/recovery first, unresolved
unstarted intent next, then pending cancellation/requested-pet local finish. Resolved
history does not reopen on every Home entry. Offline FINISH_PENDING remains discoverable
and retries the same durable identity. Finished local data is visible before network
confirmation; server acceptance alone supplies canonical top metrics and progression.
Deleted/final-cancelled results do not fall back to old local measurements.

## Presentation and lifecycle

Reuse the approved pre-start art/copy/5-second fade, signal/recovery/rest/finish/result
leaves, corrected elapsed metric and four-season assets. The production header omits
QA controls. The existing cached weather chip is unchanged; no synthetic default or
second location request is introduced. Without an already available accepted position,
pre-start honestly says location is checked after Start; it does not show fixture geography.

The product map reads Native accepted `routePage.current`, never a camera center or
weather position. Route geometry is decoded only when route revision changes; scalar
events reuse the page. A's geographic Native SDK marker/direct Image lifecycle,
36dp ring/28dp photo, seasonal ring and missing/failed-photo paw fallback are retained.
Safe same-owner background/focus cycles stop JS observer/pulse and fence callbacks but
keep the same map/page and FREE_LOOK camera. True unmount/owner/final-pet boundaries
clear the private projection. Recenter is explicit. Route erasure clears cached geometry.

Automatic actual season uses validated Native startedAt through unchanged
`getSeasonalThemeKey(new Date(startedAt))` in KST, including overnight walks/results.
Existing device-local QA season override has presentation priority only; it never
changes occurred date, payload or XP date. The global provider is unchanged.

Pending network retry policy is screen open, foreground return, or explicit
"연결 후 다시 확인". No connectivity observer or foreground polling is installed.
The copy does not promise an automatic retry just because connectivity returns.
B2 owns deduplicated bounded RPC deadlines and same-ID encrypted outbox retries;
neither reconciliation nor retry can auto-start GPS. Optional RecordCreate uses E/D's
existing atomic Memory/XP path, never a finish-side XP grant. E's result leaf owns
accepted-cache invalidation and status copy; the local result does not repeat it.

The existing 500m/1km/20-minute domain policy now drives a calm shared toast from
Native filtered accepted distance and active duration, once per live screen/session.
Recovered/reopened/background baselines seed already-crossed thresholds without replay.
This feedback persists nothing and grants no XP or milestone. Explicit Start reads an
already validated same-owner/pet C cache for previous level without fetching/waiting;
only that exact session's accepted result receives it. Missing baseline means current
server level only, no invented level-up delta. Canonical historical milestones are named.

## Confirmed final account/pet deletion

Capture an opaque encrypted Native scope capability while the owner is bound, before
the existing account unbind/destructive operation. Only an explicit authoritative final
receipt confirms it. Account confirmation requires final status AND actualStatus AND
canRestore=false. Compatibility completed with actualStatus=pending_grace_period still
uses the original logout/isolation contract but never confirms irreversible purge.
Empty lookup, failed request, absent row or retry zero rows is not final deletion proof.

After validating a captured capability, Native first fences collection in RAM and
quiesces only that owned scope before any fallible confirmation write. It does not
erase data until confirmed state is durably read back. The encrypted AtomicFile journal
uses the existing cipher/key and a separate AAD; no Room schema/migration/key/runtime
revision change. Base/.bak are committed/recoverable; orphan .new is not confirmation.
Exact encrypted-envelope/decoded-state readback checks promotion, and ACK verifies
base/.bak/.new removal. Narrow missing/replayed/capacity/IO cleanup outcomes must not
halt a foreign owner's active FGS; shared real key/database fatal handling stays intact.

Confirmed replay first purges exact owner/pet E drafts/query scope, then bounded Native
pages including owned V1/QA data and QA protocol; ACK occurs only after all cleanup.
Ordinary product APIs still reject QA/foreign data. Logout/grace preserves encrypted
outbox/drafts. No rebinding, GPS restart or foreign data cleanup occurs during replay.
Known server deletion remains known success if local cleanup fails; pending cleanup
is retried on mount/foreground. Late A results cannot clear B auth/navigation/stores.

## Explicit residual authority gap

Remote deletion success followed by process death BEFORE ANY durable local final
confirmation cannot always be authoritatively recovered with existing server contracts.
An unconfirmed captured ticket remains UNKNOWN and encrypted, never promoted by empty
lookups. Disk failure before confirmation provides only a RAM stop/fence while alive,
not cross-process final proof. Confirmed-ticket replay covers death AFTER confirmation.

Master's external `PHASE6-EXISTING-DELETION-RECOVERY-REVIEW.md` is the canonical NURI-09
read-only finding: account request lookup needs preserved same request ID and a usable
owner JWT, with no guaranteed post-auth recovery; pet deletion has no durable receipt.
No new recovery authorization/RPC is implemented in F. A smallest separate server
corrective must be serially routed before claiming that Final RC privacy obligation closed.

## Validation and release handoff

Focused JS behavior covers real composition, permission denial/dialog changes, fixed pet,
all-page discovery, local finish/retry, late checkpoint/owner ABA, map identity across
foreground, canonical/deleted metrics, KST season and confirmed/grace/unknown deletion.
Native host tests use isolated SQLite, injected cipher and platform ports; AtomicFile
promotion/delete failures and orphan .new are explicitly injected. They do NOT prove
Android Room, real AtomicFile crash/fsync behavior, keystore, FGS or device bridge.
The device-keystore test remains ignored, not counted as a new device PASS.

One canonical integrated Full Suite is recorded externally; failures, if any, get only
affected reruns. Final APK/signature/install/SM-S937N Android17 bridge/Room/FGS and product
smoke belong to the subsequent serial release/device owner, not these host tests.
Do not repeat the accepted ten-minute Timer gate or outdoor protocol. A's historical
unproven capture incident/cleanup stays disclosed; F captures no maps/media.

Release smoke must preserve the PO account/pets/data. An explicitly owned product walk
under60 active seconds can check reservation/GPS/pause/screen-off/local finish/sync with
quality-ineligible canonical distance0; never save a test Memory on the real pet, since
even ineligible accepted Memory can grant normal XP. Disclose any owned server row/tombstone
mutation rather than claiming user-data delta0. Missing independent outdoor numeric
evidence remains a Final RC obligation; PO field-usability acceptance is not revoked.

Store HOLD, push NO. Tutorial/global responsive/global rendering/Billing/Family Beta/POI
are not started. Return WRITE_LOCKED after scoped source review/commit for serial handoff.
