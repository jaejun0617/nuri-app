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
- Navigation implementation commit: `72482ea6ad9c04dd5eea2e80ac748379d4ef4381`, release tree `219e02bf1f44f5f2024d6e9815380d2f2a47c43e`. The final documentation-only delivery HEAD is owned by the external delivery receipt, not embedded recursively in this document.

## Build And Installed Identity

- Actual Gradle QA Release build 1 / install-r 1; corrective build/install 0. Before Gradle, two coordinator invocations failed closed on missing external output paths (first manifest destination, then JS preflight destination). All three coordinator invocations are counted in `execution-counts.json`; neither setup refusal launched Gradle. No blind rebuild or signing/source bypass was used.
- Canonical secure signing and external input/JS-bundle preflight PASS; previous outputs preserved in the run evidence. Metro and Fast Refresh OFF; no uninstall or clear data.
- APK SHA-256 `f8c868b28e21c6cd93defac2f755c408e4f1654bb0c3d0cfacab3a89a626d4aa`.
- Approved and prior-installed certificate SHA-256 `08efb41ea4729792ce9fc3d242be9704e84a8ea3eadcbbcf1c8426884db689d3`; fresh APK signer PASS and installed hash exact match. Debuggable false, cleartext false, backup false, embedded JS YES. AAB was produced by the canonical command; separate AAB signer attestation is not claimed.
- UID 10402, first install `2026-06-02 19:16:57`, runtime permission hash and font/density/system animation settings unchanged. Existing account/pets loaded without login. No profile save, account switch, server write action or Walk start was performed. Database content was not independently queried or checksummed.

## Galaxy S24 Verification

- Root endpoints: Home → Timeline → Community → Guestbook → More overlay → Home PASS. Selected toolbar state and placement remain stable. More retains its pre-existing overlay exception.
- Root → PetManagement → PetProfileEdit PASS. Header Back and Hardware Back return to the same parent; root toolbar absent on both detail screens. Native push/pop direction and previous-header parallax are visible in the redacted frame sequence. A second rapid edit tap followed by one Back returns to PetManagement, not another edit route.
- Eight rapid tab inputs finish on the requested Home tab. Back during a push returns to the immediate parent. No stuck touch state, unexpected route or navigation exception observed.
- Home mid-scroll anchor `자주 쓰는 기록` retained the exact same bounds before and after tab changes. Timeline's selected 산책 filter state hash was identical after switching to Community and back; restored 전체 afterward. Existing cache and route params are preserved by implementation/local tests; no real-server request-count probe was added.
- More monthly expense detail opens without the root toolbar and returns through the existing More contract. No data action or repeat performance benchmark was performed.
- Async loading independence PASS in the unresolved-data local test. Device cache was ready; forced slow-network behavior and an edited form draft were not exercised. Reduce Motion lifecycle is locally verified; OS settings were not changed for device testing.
- Android `config_mediumAnimTime` is 400ms on this S24. This native timing exceeds the approximate 240–320ms target; preserving native-stack/native performance takes priority per PO contract. Exact custom duration, extra dim and custom parallax were not added.

## Evidence, Runtime And Limits

- Four streamed, redacted sequences contain 1,097 coded frames: root tabs 653, native push/pop 59, rapid tabs 336, interrupted push 49. Raw screen content is never written to disk/device. Only the public toolbar or verified generic detail-header band survives masking; scalar luma statistics contain no text, photos or locations.
- `detail-header-all-frames.jpg` is a frame-by-frame 59-frame push/pop strip. `root-tabs-contact.jpg`, redacted videos, event receipts, scalar frame metadata and SHA inventories are external evidence. Input-reference contact sheets created for this task were removed because they contained supplied private reference pixels; the original supplied video remains unchanged.
- The H264 stdout stream has no capture PTS. Encoded playback timestamps are not accurate display timestamps; no exact device duration, dropped-frame count, frame-pacing or absolute zero-jank claim is made. Scalar brightness/selected toolbar evidence and generic header motion are not a full unmasked content inspection. No black/white whole-screen event or navigation jump was observed in this sample; PO visual review remains required.
- Current process Android fatal 0 / JS exception 0 / navigation exception 0. No NURI crash-buffer entry in the checked window; last ANR record unchanged. Raw logs were not persisted. These are bounded QA observations, not production telemetry guarantees.

## Preservation And Exit

- Walk distance/native/FGS/Room/encryption/timer/Wizard/receipt and the accepted performance corrective are outside the Navigation delta.
- Existing timer device exit gate remains NOT_PASS; URBAN reference distance remains undecided. Physical QA has not started; Phase 4 is not ready.
- No push, Store HOLD. Final next step is PO Navigation transition review, not automatic Walk QA.
- Release checklist is not promoted to Store-ready by this task. The bounded device observations and exact artifact identity above do not close the existing Walk gates or grant PO approval.

Final result: implementation and bounded local/S24 verification complete; PO approval pending. Current app is Home, Walk service OFF, device control STOPPED, push NO, Store HOLD. No automatic next task.
