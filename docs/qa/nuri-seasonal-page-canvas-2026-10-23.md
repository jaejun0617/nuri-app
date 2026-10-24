# NURI Seasonal Page Canvas - 2026-10-23

## 2026-10-24 Superseding Scope

The all-screen candidate below was WITHDRAWN by PO. Its64 common/non-Home source files were restored exactly to pre-task HEAD. Only main Home retains the approved four-season3-stop palette, matching Home status-bar inset and Home toolbar; other screens keep their existing colors/status-bar contracts. Prior navigation fixes remain. Current delivery and the additionally approved332-title integration are owned by [the2026-10-24 integration record](nuri-title-catalog-v2-integration-2026-10-24.md). Final Metro state is ON after installation. Everything below describes the earlier unshipped candidate and its historical checks, not the current implementation or a completed installation.

## Scope And Authority

Master directly implements the latest PO four-season page-background request in the approved existing checkout. This supersedes earlier fixed lavender and white status-bar paint, including Ranking. It does not change XP, titles, records, permissions, moderation, server contracts, fonts, card materials, CTA colors, maps or photographs. The preceding 400ms tab/More fade and bounded-menu rendering changes are included in the same delivery.

| Season | Top | Center | Bottom |
| --- | --- | --- | --- |
| Autumn | #FEF2E9 | #FEF6EF | #FEF2E8 |
| Winter | #EBF5FD | #F1F8FE | #EAF4FD |
| Spring | #FDEFF3 | #FDF3F6 | #FDEFF3 |
| Summer | #EAFBFD | #F0FBFD | #E9FAFC |

PO hex values are authoritative. The four supplied 853x1844 PNGs have small pixel variations, so they are compositional references, not bitmap page overlays. Stops are vertical at 0/0.5/1. Status-bar paint uses the exact top stop; the shared app toolbar uses the bottom stop. Actual OS icons and navigation controls remain native.

## Implementation

- `theme/seasonal/pageCanvas.ts` owns stable pure palettes; `SeasonalScreenBackground` paints without layout, touches, scrolling or animation. The old Lavender name is a compatibility export, not another palette.
- The existing season preference feeds the light styled-components theme. Boot/auth lifecycle and persisted preference behavior are preserved. Legacy dark ambient surfaces retain their existing dark guard; this is not a dark-mode redesign.
- Shared Screen, form and hub backgrounds cover registered routes. An actual navigator-import enumeration checks that each component owns or delegates to a canvas. Explicit native-root branches cover loading/error/auth/admin/Walk presentation as well as ordinary detail pages.
- Home's ellipse and selection sheet, Timeline, Create/Edit/Detail, Community, Guestbook, More, activity/titles, Ranking, health, schedules, guides, policies, notifications and onboarding share the palette. Existing photos, weather artwork, map layers and framed/glass surfaces remain intact.
- Fixed Guestbook scroll and weather-record keyboard fills no longer cover the gradient. Weather detail retains artwork and sheet geometry but exposes the shared canvas. Policy page chrome is transparent; cards keep their material.
- No new server write, schema change, fixture mode, production data injection or user-visible debug entry is introduced.

## Local Verification

- Changed test set: 19 suites / 390 tests PASS. TypeScript PASS. Scoped lint: 0 errors / 21 existing no-shadow warnings; the newly introduced shadow warning was removed.
- Full suite was run three times while test harness/palette expectations were corrected. Final result: 308 suites, 3,891 PASS / 33 FAIL. All 33 failures have matching failures in a read-only snapshot of pre-task HEAD `46f7c3e`; there are no newly unmatched failures. This is not an all-green Full Suite claim.
- The 33 existing failures concern older Home source/typography checks, RecordDetail presentation, icon provider/toolbar expectations, pet content spacing and legacy CTA/edit source assertions. They are not fixed by unrelated product changes. Detailed names and snapshot limitations are in `baseline-comparison.json`.
- Official safe-area test doubles and missing Reanimated easing mocks were completed. The App composition smoke stubs the navigator because the existing global NavigationContainer double has no navigator context; real route/state behavior remains covered by dedicated navigation suites and native checks.

## Evidence And Delivery Boundary

External evidence owner: `/Users/shinjaejun/.codex/nuri-seasonal-canvas-20261023-VDyXkt/`. It contains reference hashes, source inventory, exact local results, native status-bar crops, scalar pixel/state checks, failures and final build/install/push receipts. Full private UI dumps, input values, photos and whole private screenshots are not saved.

Metro QA observes all four exact status-bar colors on SM-S937N / Android 17, plus representative page bodies, Create/Edit/Detail, Ranking tabs, activity, settings and policy/toolbar return flows. This is not every account/admin/error state on every physical viewport. Existing data are read only; no record save/delete is used to validate a paint change. A visible-input-only keyboard comparison is invalid because IME scrolling changes visible nodes; corrected validation hashes actual controlled input props instead.

The final installation uses the existing approved-signer bundled-development APK path, with embedded JavaScript and Metro stopped. It is not a clean Final RC or Store Release: unrelated image-room output remains untracked and preserved, and the canonical clean-source Release guard is not weakened or bypassed. Exact source/build/install hashes and final native checks are owned by the external receipts, then recorded in the closeout below. No Store/deploy approval or existing Walk quantitative gate is promoted.

## Closeout

Source candidate is locally verified. Final source commit, standalone APK build/install, preservation check and authorized branch push are the remaining delivery steps at this source checkpoint. Only documentation may be updated after the installation receipt; the APK source identity must remain distinct from that documentation-only HEAD.
