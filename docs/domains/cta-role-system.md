# Global CTA Role System

## Source Of Truth

2026-10-06 PO contract: GLOBAL ROLE-BASED CTA SYSTEM. PO subsequently gave final approval and explicitly requested commit, push, freeze and waiting for the next design direction. Current status: APPROVED_FROZEN_WITH_KNOWN_LIMITATIONS, not Store authorization. Candidate validation evidence remains `/private/tmp/nuri-global-cta-role-system-20261006-183103/FINAL_REPORT.md`; approval record is `docs/qa/nuri-global-cta-final-approval-2026-10-06.md`.

## Palette Ownership

`src/app/theme/ctaPalette.ts` owns `CtaRole`, `CtaState`, `resolveCtaPalette` and responsive pair rules. `CtaButton` consumes the existing global `useEffectiveSeason`; schedule dates and pet theme cannot set Primary colors.

| Season | Primary | Pressed |
| --- | --- | --- |
| Autumn | #B95000 | #963F00 |
| Winter | #3B6398 | #315381 |
| Spring | #B84066 | #9E3456 |
| Summer | #247264 | #1D6054 |

Primary foreground is white. Final destructive confirmation is #B93645, pressed #982936, white foreground. Destructive entry uses pale pink glass with a danger border/text. Cleanup is a lighter separate role. Secondary uses white glass 0.62, pressed 0.72, #243042 foreground and a 0.30 border. Neutral is #F1F3F6; disabled is #E8EBEF with #566271 foreground.

## Component Contract

- Explicit opt-in: `CtaButton` requires a typed role. Shared header buttons, ConfirmDialog, notices and reward dialogs retain their old rendering when no role is provided.
- Full-width minHeight 48dp; compact 44dp. Loading blocks repeated taps without dimming the active palette. Disabled uses dedicated tokens and accessibility state. Caller colors cannot override action palette.
- Header duplicate submit uses primarySubtle; bottom submit is the single solid Primary in that group.
- Schedule detail: full-width Edit; secondary Complete/Incomplete and destructiveEntry Delete below. Pair stacks below 380dp or at fontScale 1.3 and above. Labels are not shrunk.
- Final delete and actual unsaved discard use destructiveConfirm. Draft-preserving exit is neutral. Draft restore is primary; discard is destructiveConfirm even in the cancel slot. Logout/app exit/report/block are not content deletion.

## Preserved Boundaries

Auth, onboarding, the entire shared PetCreate screen, Weather, admin/moderation, icons, tabs/chips/statuses, seasonal backgrounds, Home panel geometry/glass and navigation personalization are excluded. PetCreate is deliberately not migrated because first-pet onboarding shares its flow. Profile/pet color swatches and identity accents remain personal.

Native Alert appearance remains OS-owned. Weight record final deletion still uses that native contract; the app does not claim its actual red equals the custom destructive HEX. No DB, RPC, RLS, Storage, API or provider changes.

The app currently fixes light mode. Resolver supports existing dark surface tokens for shared compatibility; this batch does not introduce dark mode.

## Validation And Release Boundary

Current-source type/lint/targeted/full tests, one incremental Release, one reinstall preserving app data and bounded native QA are recorded separately in the evidence report. Mathematical solid contrast does not substitute for native glass inspection. QA never performs final destructive mutations. Temporary density/font and season review selections must be restored.

Current candidate: targeted 13 suites/112 tests and final full 179 suites/1,759 tests PASS; scoped lint 0 errors, 33 existing warnings with no additions. Full tests were executed twice because six legacy test files needed selector/provider/whitespace compatibility updates; the initial failure is preserved. Release/install each ran once. Four-season representative native matrix contains 16 verified views; settings were restored.

The candidate's technical acceptance was not a full native PASS. Timeline's empty-state CTA and floating CTA both use solid Primary. Schedule detail's first-entry compositing intermittently washes out the whole screen and reduces observed Primary contrast to 2.66-3.02:1; re-entry restores the exact palette but is not an implementation fix. Keep first-entry and re-entry captures separately. Root cause is not yet confirmed. PO final approval freezes the reported candidate as-is; it does not turn these limitations into fixed defects or authorize corrective work. No runtime edits, new tests, build, install or device operations are part of this approval closeout.

PO visual approval is complete. Selective Git closeout includes the approved CTA files and the preceding schedule-detail implementation they directly depend on. Unrelated dirty files and shared-document sections are excluded. Retain QA, prior evidence, candidate APK and incremental outputs/cache. Cleanup and Store remain on hold; next action is waiting for PO NEXT DESIGN DIRECTION. Future corrective work requires a new explicit instruction.
