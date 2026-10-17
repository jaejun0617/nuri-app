# NURI Navigation Transition Review — 2026-10-18

## Scope And Source

- Master-only, serial execution. Navigation motion only; no screen redesign, route rename, dependency change, server work or outdoor Walk.
- Start HEAD `829a72ecf0b23a2ddfd490e0e5980fc28ce817a2`, tree `719aa7298504744cfe9c54efa2ac85c22d46d182`.
- PO explicitly approved a separate preservation commit for the 33 existing Walk design paths. `3cd1f71` records their exact bytes; captured SHA verification was 33/33. These are not Navigation implementation changes.
- Dedicated branch `codex/navigation-transition-review-20261018`; original repository HEAD `657dd597dbea5fb6b93d79901f0eea05ed745e02` and original dirty 181 remain protected.
- Evidence owner: `~/.codex/nuri-design-evidence/navigation-transitions-20261018-ijYrmw/`. Initial test-harness setup failures are retained separately from the behavioral fail-first result (14 expected failures / 14 passes).

## Actual Architecture

Installed versions: native 7.1.31, bottom-tabs 7.15.3, native-stack 7.14.2, screens 4.27.0, Reanimated 4.6.0, React Native 0.87.1. JS stack is not installed.

```text
NavigationContainer (existing linking and root ref)
  Root native stack
    Splash / Auth / Onboarding
    AppTabs
      HomeTab: MainScreen
      TimelineTab: native stack
        TimelineMain / TimelineEntryGate / RecordDetail / RecordEdit / MonthlyExpenses
      CommunityTab: native stack (CommunityTabList only)
      GuestbookTab: GuestbookScreen
      MoreTab: prevented placeholder; opens MoreDrawer overlay
      MoreDrawer: existing sibling overlay with its own animation
    Global detail routes
    SecurityValidation: QA host, Walk is an existing React Native Modal
```

There is no separate Home/Guestbook/More stack and no MyPage route. PetManagement → PetProfileEdit is the real nested detail flow. Auth/deep-link/boot/back hooks and NavigationContainer callbacks are unchanged. No navigator state persistence, lazy, unmount, freeze, query-cache or fetch policy is introduced.

## Central Policy

- `navigationTransitionPolicy.ts`: explicit typed route classification; root scenes use official bottom-tabs native-driver fade with 220ms easing, no translation or scale. The toolbar remains outside animated scene content.
- Root global details and Timeline RecordDetail/RecordEdit/MonthlyExpenses use native `slide_from_right`. Native pop reverses the same transition. Android does not expose the requested exact duration through this API; no JS replacement, invented parallax or custom dim is added.
- Timeline nested details hide the real root toolbar; TimelineMain/EntryGate restore it. Existing headers retain a single owner. Existing detail content spacing is not redesigned.
- Root toolbar navigation merges existing tab params, retaining filters/month/route keys and local state. Existing Home re-tap emits tabPress. Drawer/detail shared toolbar fallbacks are unchanged.
- MoreDrawer is deliberately NOT converted to a tab scene: its existing slide/dim/open/close contract remains. Auth/boot/AppTabs entry, shared onboarding PetCreate, QA/Walk host and TimelineEntryGate remain unchanged. RN modal/Bottom Sheet implementations are untouched.
- `useNavigationMotion.ts`: OS reduce-motion read and subscription with unmount/race protection. Root tabs use none and eligible native details use fade when reduced. Unknown setting conservatively starts reduced without waiting to navigate.
- Actual installed StackRouter serializes same-focused-detail navigation and route-keyed pop. No timer lock or new navigation queue is added.

## Local Gates

- Focused behavioral/config/state/router/back tests: 6 suites / 50 tests PASS. Actual root tabs and native navigator options are tested, not merely source strings. Includes immediate navigation with unresolved data, local state/params/mount preservation, Home re-tap, More overlay, hidden detail tabbar, reduced-motion events/races/unmount, native config and repeated back.
- Scoped lint: 9 files, 0 errors / 0 warnings. TypeScript PASS.
- Final canonical Full Suite exactly once: 267 suites / 3,303 tests PASS (46.802s); no retry. Source/import/secret guard PASS with pinned Node 24.20.0 / Yarn 3.6.4, shell syntax and diff whitespace PASS. The guard's initial shell-toolchain mismatch and untracked-input refusal were resolved by selecting the pinned PATH and selective staging; no product workaround was added.
- Signed Release and S24 verification are still pending at this source checkpoint. Do not read this document as device acceptance.

## Preservation And Exit

- Walk distance/native/FGS/Room/encryption/timer/Wizard/receipt and the accepted performance corrective are outside the Navigation delta.
- Existing timer device exit gate remains NOT_PASS; URBAN reference distance remains undecided. Physical QA has not started; Phase 4 is not ready.
- No push, Store HOLD. Final next step is PO Navigation transition review, not automatic Walk QA.
- Release checklist is not promoted to Store-ready by this task. Device observations and exact artifact identity will be appended after verification.
