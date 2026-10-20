# Walk Phase 5C — Product Integration / Batch E

F continuation: [Real Product Integration](nuri-walk-phase6-real-product.md) wires the existing first Home Walk widget to the production route, composes these result APIs and supplies confirmed Native/draft cleanup. E's manual-widget-until-F statement below is historical; E's server/Memory/XP contracts are unchanged. Final release/device proof remains separate.

Owner: NURI-04. Implementation base `798e27eb8cf24f587df4da50e5b4d2a5b38cc056`.
This document owns E's JS product integration. The external `PHASE5C-PRODUCT-INTEGRATION-REPORT.md/.json` owns final source identity and exact local validation receipts. Native production orchestration, formal GPS start entry, Android build/device proof and the one final integrated Full Suite belong to F. Store remains HOLD; push is not authorized.

## Canonical boundaries

Use the deployed C/D typed repositories, the singleton `appQueryClient`, and cached auth/pet stores. Queries are keyed by owner, pet, resource and lifecycle generation. `SELECTED` scope is used by Home/profile; `PINNED` scope keeps an owned record/session/history pet fixed across global selection changes. Owner logout/relogin, selected-pet ABA, foreground and relevant pet removal invalidate old continuations. Same-owner token refresh and unrelated pet/theme array replacements do not invalidate identity. Subscriptions start only while hooks are mounted; no Native/GPS/auth reads or network occur at import/construction.

Every added read/mutation continuation uses a bounded Walk-only request (15 seconds, AbortSignal, context checks). Pre-aborted requests never invoke transport. Timeout is an unknown result and retains the durable candidate identity; late responses cannot update another scope. This does not abort/undo an already committed server transaction or replace the global Supabase transport.

## Existing composer GPS mode

`RecordCreate` accepts `{ petId, gpsSession: { clientSessionId }, returnTo }`. No measurement is passed in navigation. It loads the owned accepted source, fixes pet/category/start-derived KST date/source/duration/distance and reuses the existing title/content/emotion/tags/photo form, keyboard controller, date presentation and seasonal material. GPS limits are title100/content5000/tags20/images10. The manual and schedule flows keep their previous save/activity/date/image behavior.

GPS submits only D's atomic `create_walk_memory_from_session_v1`. It never calls `createMemory` or `recordTimelineCreateActivity`. The form upserts the validated returned original Memory, not optimistic current fields. Rewards are consumed only from a new atomic receipt; a replay cannot repeat them.

`drafts.ts` persists owner+pet+session drafts with revision, original candidate/request UUIDs and immutable first-submission snapshot. Failed/unknown writes retain everything. A retry continues that snapshot even after later edits. Replay/other-device claims preserve the current draft/photos and offer explicit original-record viewing/editing. No replay silently queues photos onto another device's original. The edit recovery action asks before applying candidate text and appends photos while preserving existing ones; the total must remain≤10. Draft compare-and-delete runs inside a serialized storage queue and cannot clear a newer revision or other scope. Malformed storage is preserved and reported, never overwritten as an empty success.

Only a new successful commit can automatically enqueue its captured photos against the actual committed ID. Durable queue failure retains the recovery draft. Immediate upload processing is best effort; existing upload-queue recovery remains authoritative.

## Timeline / detail / edit / delete

Batch lean source queries capture Memory ID→expected pet pairs before awaiting, in chunks≤100. Category `walk` only selects lookup candidates; it never establishes GPS trust. `TimelineWalkMemoryCard`, detail and edit display only the matching server projection. Session deletion yields summary null, removes verified measurements and retains Memory/claim/XP. Editable metadata does not create a GPS badge.

Linked edit rechecks the canonical original and changes only permitted body/photos. The existing update helper receives unchanged server-derived category/date because it writes those columns even when omitted; no new RPC or XP call is introduced. While a Walk candidate's source is unresolved, date/category/save fail closed with retry. This also temporarily affects manual Walk edits if that endpoint is unavailable. Non-Walk edits/deletes have no Walk query dependency and retain their existing behavior.

Memory deletion preserves existing best-effort daily-source cleanup/count/streak behavior and invalidates the lean projection/prompt/history; lifetime distance is not invalidated as a consequence of Memory deletion. An interrupted linked deletion unlocks on a fresh foreground/identity scope and reconciles the original through D before applying recovery. It does not infer deletion from failed/empty lookup. Old-scope completions cannot operate on the new scope.

## Home / profile / history

Home adds a small unframed footer inside the existing frequent-record glass: canonical lifetime distance/Walk Level, at most one recent undismissed prompt, explicit record/dismiss, and history entry. It waits for the existing deferred Home readiness/focus. Loading/error never fabricate zero; confirmed zero displays0m/Lv1. Dismiss busy/error state resets by scope so a late A dismissal cannot lock pet B. Existing Memory-derived counts/relative summaries, total-walk Timeline filter, Hero2CTA/theme52dp rhythm and temporary QA entry remain intact. The first walk widget stays on the safe manual callback until F provides the actual GPS route.

The existing profile sheet adds expanded distance/level/exact next-level progress/server historical milestones between `HomePetBasicInfoSection` and `HeroProfileAccordion`. It mounts lazily and shares Home's progression cache. No per-card query or PetManagementCard rearrangement is added. All lifetime/level arithmetic uses bigint/string; only a bounded fractional progress is converted for display.

`WalkHistory` is a real root native-stack detail route with an arrow-left Back action and no bottom toolbar. It paginates the server cursor unchanged, including microsecond precision. Old/dismissed pending sessions open GPS RecordCreate, existing originals open normal detail, and deleted originals cannot be recreated.

## F integration APIs

- `WalkResultIntegration({petId,clientSessionId,state,previousLevel?})`: compose into the approved `WalkLocalResult` via `productContent`; pass the corresponding `productStatus`. Pending/rejected states make no accepted progression/record read and confirm no reward/distance. Accepted source exposes canonical summaries/current level/history milestones and the existing composer CTA. F supplies canonical top metrics for accepted results and clearly provisional local metrics before acceptance. Existing route reveal/reduced-motion behavior is unchanged.
- `invalidateWalkProduct(scope, 'ACCEPTED_FINISH' | 'SESSION_DELETE' | 'MEMORY_COMMIT' | 'MEMORY_DELETE' | 'PROMPT_DISMISS')`: invoke only after the matching confirmed event. Memory events also refresh Home total/title, Timeline entity-derived count/streak/title/Account Level, activity dashboard and ranking/month caches. No reward is awarded by invalidation.
- `fenceWalkDraftFinalDeletion(ownerId,petId|null)`: synchronous terminal JS draft fence.
- `purgeWalkProductAfterFinalDeletion(ownerId,petId|null,'ACCOUNT_FINAL'|'PET_FINAL')`: confirmed final-deletion API. It fences before enumerating, drains owned in-flight storage keys, rejects later saves/prepares, erases only exact-scope drafts and cancels/removes the exact Walk query scope. Ordinary logout must not call it. F coordinates this with confirmed Native/server final purge; it does not delete personal media or infer deletion from a failed lookup.

Current `WalkWeatherChip` already uses validated cached weather and unavailable state, with no synthetic18° default. E preserves it and adds no production QA host/controller, native collection, route upload, SQL/RLS/migration, timer, marker or GPS filter change.

## Validation boundary and handoff

Focused behavior coverage includes manual/GPS separation, immutable fields, original-ID replay/newer edits/photos, persistent draft/final-purge races, pre-abort/deadline/late response, selected/pinned scopes and ABA, Home nonblocking/cache reuse/dismiss switching, history pagination/state/Back, lean source trust/deleted summary, and pending/rejected result behavior. TypeScript and scoped lint are local gates. Physical input/keyboard/Back/safe-area/seasonal pixels, actual Native/Room/FGS/outbox/HTTP product end-to-end and final integration remain pending F; no E device PASS is claimed.

Global project-memory/release-checklist final reconciliation is deferred to F by Master. E updates only this domain handoff and external evidence, then returns WRITE_LOCKED. Master routes the next sole writer. No unrelated roadmap phase starts here.
