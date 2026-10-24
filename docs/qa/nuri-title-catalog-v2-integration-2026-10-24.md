# NURI Title Catalog V2 Integration - 2026-10-24

## Authority And Current State

Master implements in the existing approved checkout. Latest PO explicitly approved all332 acquisition rules and server awarding, not only artwork. Latest background scope is main Home only; the previous all-screen candidate was withdrawn. Preserve the prior400ms navigation fixes. After exact-source build/install and verification, the approved branch may be committed/pushed; reopen Metro and wait for the next design. This is not a Store release approval.

Current state: SOURCE AND REMOTE VERIFIED; installation is pending. Three v2 migrations are applied to the linked database. No new APK/install/commit/push yet. The external Home-only evidence folder owns detailed receipts and failures. Do not read planned actions as completed evidence.

## Source Of Truth

- Approved332-name/condition design: `docs/planning/nuri-title-catalog-v2-approved.md`, copied from the PO-approved external design. Its original proposal-status sentence is historical; PO approved product application on2026-10-24.
- Structured rules: `src/services/activity/titleCatalogV2.json`. General308 + hidden24; pet267 + account65. IDs are explicit, not inferred from Korean strings.
- Approved artwork: original20 walk +312 other files remain untouched. `approvedTitleArtwork.ts` registers332 unique384px RGBA app copies; `assets/activity/titles-v2/manifest.json` records source/runtime hashes. Total43,661,957 runtime bytes vs401,773,522 original bytes. No recoloring, redraw or shared canonical artwork.
- Applied migrations:20261024044757_activity_title_catalog_v2,20261024044810_activity_title_engine_v2,20261024045035_activity_title_v2_storage_indexes. Local names match actual remote history. Linked project grmekesqoydylqmyvfke uses PostgreSQL17.6. The third migration supplies stable award row identity and FK indexes; it does not update original source tables.

## Contracts And Risks

- Dedicated private catalog/awards preserve user_titles and XP. Awards are unique per user/pet/title with null-safe common ownership. Existing historical awards are bridged once, not continually granted by old thresholds. Unscoped old personal achievements are kept as legacy account history, never cloned to every pet.
- New awards are based on whole-owner live sources, not a loaded page or the last1000 ledger rows. Progress and acquisition remain separate. General record deletion does not revoke earned awards; account/pet deletion cascades remove owned v2 data. The earliest verified server record time remains stable after deleting that original record.
- GPS counts only accepted, progression-eligible, undeleted accepted distance. Linked Memory does not duplicate its walk date. Existing GPS/XP engines and rank exclusions are unchanged.
- Photo counts use server Storage eTag content checksums. Current53 Memory objects all have32hex checksums. Unknown photo proofs are labeled pending rather than normal0. Same checksum across object paths counts once.
- Common posts/comments retain moderation; cloned bodies and self comments do not count. Posts max1 per day; comments max2 per day and1 per post/day. Information-post titles do not elevate public trust or professional status.
- Hidden entries are not shown before acquisition or included in completion denominators. Official lunar dates are seeded for2026/2027 only. Later years require an official calendar update, never guessed dates. Birthday/adoption snapshots prevent later profile edits from manufacturing old anniversary years; older unverifiable participation remains unproven.
- Remembering is explicit per original record through a separate selection table. Viewing the menu sends a null read; only the user's Switch action sends a boolean mutation. Record fields, privacy, death date and the original edit/create payload are unchanged.
- Exact remembrance copies with identical title, normalized body and verified photo-origin tuple count once. This is a conservative duplicate rule, not semantic similarity or an inferred grief state. Routine dates use only the approved five domains; other shopping/play/travel memories still contribute to general memories, but not a five-domain routine day.
- App validates complete ordinary catalogs and scope/version/name contracts. Errors do not become an empty vault or fabricated achievements. Category selection bounds native rendering to20/28 ordinary entries rather than mounting the entire catalog.

## Verification Before Installation

- Isolated in-memory PostgreSQL354checks PASS, including332 threshold boundaries, null-safe ownership, deduplicated days/GPS/photos, calendar clipping, hidden receive grace, explicit remembrance, pending photo proof, preserved legacy ownership and5000-row profiling. These fixtures never enter the linked database. The elapsed profile is WASM/local, not a production latency benchmark. Reusable runner: `scripts/qa/title-v2-sql-contract.cjs`; supply the absolute external `NURI_PGLITE_MODULE` path for pinned PGlite0.5.11 and an existing external `NURI_TITLE_SQL_EVIDENCE_DIRECTORY`. No app dependency is added.
- Final full suite:312suites,4,285PASS /33FAIL. All33 names match the existing verified baseline comparison. Two spacing failures were additionally reproduced against the byte-identical pre-task HEAD snapshot. The old archived-font exception is not a new application failure. TypeScript PASS; scoped lint0errors/19existing no-shadow warnings. Focused Home/navigation122PASS; client/artwork439PASS with one obsolete cache expectation, then corrected badge/category contract54PASS; remembrance controls3PASS. This is not an all-green full-suite claim.
- Remote counts/content digests for15 original tables and existing public function/trigger definitions match before/after exactly. The new private catalog has332rows and50legitimate initial awards across3owners; this is not all332 titles granted to users. Eight private tables have RLS and no authenticated direct table access. An authenticated rollback-only vault call returned308ordinary rows,0foreign-owner rows and0unearned hidden rows. No persistent server fixtures were created.
- Security advisors have0new findings. New FK/no-primary-key information was fixed by the third migration. Its3new FK indexes are reported unused immediately after creation; retain them for deletion and long-lived history. Existing unrelated security/performance findings remain unresolved, not silently marked PASS.
- Current-source Metro on SM-S937N/Android17: ordinary15categories plus earned-hidden category16,332native Image.getSize checks at384px, representative title confirmation/save and Home reflection PASS. The exact original local title preference was restored. Public artwork crop is retained; full private screens are not saved. Native dimension checks are not332individual GPU/alpha screenshots. Home-only season and standalone-install receipts remain separate gates.
- Home4seasons: all3sampled status-bar pixels match each exact top color, Home gradient3stops match, selected pet unchanged, original autumn override restored. RecordDetail remembrance status reads successfully without a toggle/write; Timeline filters/first-row bounds survive return. The first immediate Back was consumed by the closing Android Modal; the corrected observation waits for native dismissal before stack Back. Preserve both receipts instead of calling the first attempt a product regression or a PASS.

## Pending Gates

1. Stop Metro; selective source commit; approved signed bundled-development APK build/install-r once; standalone verification and data preservation. This is not clean Final RC/Store; do not hide unrelated image output or weaken Release guards.
2. Documentation closeout, normal approved-branch push/remote HEAD check, then Metro ON and next-design wait.

## Remaining Operational Boundaries

Future2028+ lunar calendars require official annual updates. Old unverifiable birthday/profile history is not invented. Ordinary deletion retains historical titles, while fraud revocation requires a separate evidence-based operation. All332 small-size/large-font physical layouts, all fault states and multi-year real usage cannot be established by this single device session. Existing Walk Final RC, offline durability and Store HOLD are unchanged.

## Separate Walk Video Note

The96.551356-second PO walking video adds bounded observations only to the existing external Walk report. Start0.08km/03:36 paused; resume and metric updates; last0.21km/05:12 still running. No end/save/server/XP/durability/quantitative-accuracy proof. Exact route-gap cause and video/APK source match remain UNKNOWN. No Walk implementation, auxiliary APK, new Walk QA, source or database changes are authorized by that video note.
