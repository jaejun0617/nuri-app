# NURI Timeline Statistics and Per-Pet Walk XP Report

## 1. Scope and Source

- PO approved: statistics transparency50%, right symbol removal, smaller month/sort faces, pet-level walking XP3/KST day, incremental Release/install-r1 each. Native screens remain PO-direct.
- Actual source: TimelineSeasonalHeader, TimelineScreen, xpProgress, timelineActivity, RecordCreate/Edit write order, progressPolicy, linked project grmekesqoydylqmyvfke SQL catalog.
- Type: bounded UI polish + approved server reward corrective. Runtime3 files, tests3 files, single-function migration1, rollback QA SQL1; related planning/memory/research/release records only.
- Previous Timeline candidate and unrelated dirty were not reverted. Community/Auth/Weather frozen surfaces and API contracts remain protected; only this explicitly approved XP payout function is the server exception.

## 2. Presentation

- STATISTICS_BACKGROUND: rgba(255,255,255,0.50). Opacity50% / transparency50%; only the panel background, not child text opacity.
- RIGHT_STATISTICS_SYMBOL: REMOVED. Walk prompt NURI brand remains. Record counts use natural text height, no line limit/ellipsis/font shrinking, minWidth0/flexShrink1; existing narrow/large-font stack retained.
- MONTH_SORT_VISIBLE_PADDING_VERTICAL:2dp, horizontal8dp, text12sp/18sp. Actual button tap minHeight/minWidth44dp. Compact inner face has no44dp minimum.
- Hero bytes, normalized panel anchors, specified seasonal tokens, other category chips, FAB, list/date/month logic, callbacks and base MemoryCard preserved.
- Local structure tests cover10,000 records/1,000 days at360/384/430dp,fontScale1.5. This is not native pixel/clipping proof.

## 3. Actual XP and Progress

- HARDCODED_STATS: NO. get_user_level_summary_v1 reads account totals; the adapter derives canonical level thresholds, Header uses getProgressWithinLevel and applies the result to gradient width and accessibilityValue.
- Record creation awaits reward processing before the local store update; edit follows the same ordering. Focus-return refetch added so Community/account rewards do not leave the mounted Timeline stale.
- Controlled live RPC results, using the fixed QA author verified by its exact QA100 batch, then passed to the actual component tests:

| Case | Actual XP | Level | Rendered Progress |
| --- | --- | --- | --- |
| One walking award | 525 → 564, +39 | 4 → 4 | 30% → 46% |
| Three walking awards | 525 → 642, +117 | 4 → 4 | 30% → 77% |
| Level boundary via unchanged bonus | 675 → 714, +39 | 4 → 5 | 90% → 5% |

- Progress is `(totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)`, clamped to0..1. A new level starts a new bar; lower percentage after level-up is correct, not lost XP.
- Existing1% rounding remains; very small rewards at high levels may not immediately change the displayed integer percentage/width. No decorative/fake bar or synthetic app statistic was introduced.
- Server summary totals matched ledger sums for both existing summary rows before the change. Missing/error states are not replaced by mock468XP.

## 4. Server Policy

- MIGRATION:20261006220017_timeline_walk_xp_per_pet_daily_three; local/remote version and actual function definition MATCH.
- WALK_LIMIT:3 awards per owned pet per KST day, shared across walk_record and walk_timeline_post. Not3+3. Different pets have independent counts.
- ACCOUNT_BASE_DAILY_XP_CAP:150, unchanged. Pet allowances do not bypass it; the remaining budget can yield a partial final reward or0XP.
- BASE_REWARDS:26/39, level decay, Lv1..100 thresholds, other event limits, bonus exemption and source idempotency preserved. Null-pet walking rejected with existing22023. Existing null-pet ledger history1 row is not backfilled.
- Account transaction advisory lock precedes count/summary reads, protecting the shared150XP budget and summary including the first award. A held Exclusive advisory lock was verified inside payout QA; multi-session load stress was not run.
- Signature/owner/OID/search_path/ACL MATCH. Authenticated execute remains enabled; anon execute remains disabled. Other262 public functions, all RLS states and policy hash MATCH.
- Remote QA PASS: timeline3/fourth0, replay0, alternate-route fourth0, two pets3 each, mixed routes, account150/clamped7, other event limits, bonus, ownership/auth/null-pet guards, KST rollover.
- All test DML, including the temporary second pet, was rolled back. Existing19 data domains (18 public tables + Storage), posts884/QA100, XP61 ledger rows/2 summaries, pets15/profiles56, titles9 match exact pre-task row hashes. No persistent content/XP/Auth/Storage mutation.

## 5. Validation and Installation

- TYPESCRIPT:PASS. TARGETED_ESLINT:0 errors,0 new issues,1 pre-existing ControlsBar no-shadow warning.
- TARGETED:19 suites/365 tests PASS. FINAL_FULL:182 suites/1,850 tests PASS; earlier full182/1,847 also passed before actual-RPC fixtures were added. GIT_DIFF_CHECK:PASS.
- Test-fixture type errors and the first rollback SQL CASE parsing error were corrected before final gates. No failed or repeated native build/install.
- INCREMENTAL_RELEASE:1,206.221 seconds;995 tasks,61 executed/934 up-to-date. INSTALL_R:1,15.759 seconds. No clean/uninstall/clear-data.
- APK_SHA256:ef2b4a03493ab8ccef7151e3e861220bb73c927883c237d9f98a23d51b1502c9;282,006,728 bytes. Source/private-input/signer and decoded four hero bitmap pixels MATCH.
- S24 SM-S937N installed APK hash MATCH; UID/first-install/1080x2340/density450/fontScale1.0 preserved. Launch/touch/screenshot/settings change0. Native visual QA and app-save-to-permanent-XP QA NOT_RUN_PO_DIRECT; runtime fatal/ANR audit NOT_RUN.
- Actual payout+summary SQL QA and component rendering do not claim native permanent accumulation or HTTPS/JWT end-to-end verification.

## 6. Preservation and Next Action

- HEAD:bf8a7a578ae16d869afbadd3c1810c521592b260,unchanged. STAGED:NONE. COMMIT:NO. PUSH:NO. 1,580 protected files and7 historical document bodies MATCH. Supabase CLI automatically refreshed its existing .temp/cli-latest version metadata; the cache delta is recorded separately and retained, not silently reported as source-preserved or reverted.
- BUILD_OUTPUTS/CACHE/APK/EVIDENCE:PRESERVED. CLEANUP:NO. Disk start/end and source-closure checks are recorded in closure.json and baseline.json.
- Evidence:/private/tmp/nuri-timeline-statistics-walk-xp-20261007-065210. Includes server before/after/catalog/migration, rollback results, preservation hashes, tests, build/install, candidate APK and manual-only previous-function rollback SQL. Rollback SQL NOT_EXECUTED; it would not undo previously awarded XP.
- Remaining: PO real-background glass contrast/long-number visual review, native permanent XP save flow, multi-session load stress, other devices and enlarged native font matrix. Frozen Community/Auth/Weather/Store boundaries remain unchanged.
- STATE:IMPLEMENTED_REMOTE_VERIFIED_INSTALLED_PENDING_PO_REVIEW. Store:HOLD. Next1:PO Timeline statistics/Progress review. No auto-start, commit/push/freeze or cleanup.

PO 승인을 기다립니다.
