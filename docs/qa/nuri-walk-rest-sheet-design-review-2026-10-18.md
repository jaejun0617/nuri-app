# Walk Rest Sheet Design Review — 2026-10-18

## Scope

- Base HEAD `829a72ecf0b23a2ddfd490e0e5980fc28ce817a2`, dedicated `codex/walk-phase3-final-physical-20261017` worktree. Preserve the earlier uncommitted four-season PRE_WALK changes. This task changes only the presentation owner, adds `WalkRestSheet` and focused tests, and updates this handoff/memory. No native/runtime, distance/filter, Room, Wizard protocol, weather, server, progression or XP implementation change.
- PO approved a bottom sheet after pause, exactly three normal-size copy rows, and a consistently gentle entrance. Copy is `잠깐 쉬어가도 괜찮아요.` / `언제든 다시 함께 걸어요.` / `시간과 거리는 잠시 멈춰둘게요.` Sizes16/13/12sp, line heights24/20/18, existing AppText/user font, centered with6dp row gaps. Large accessibility text may wrap rather than being clipped or shrunk.
- Reuse the Home reflective surface layer, theme surfaces/text and seasonal primary palette. The two actions have48dp minimum targets and bottom-safe-area padding. No new library or global design change. The existing PRE_WALK/walking layout and four-season illustrations remain intact.

## State and Motion Contract

- Actual mode opens the notice only after the existing `pauseWalk` returns a committed `PAUSED` snapshot, not on optimistic button press. The optional QA protocol read does not become a new pause source of truth. Public preview explicitly changes only gallery state and can show the same notice with no native mutation.
- `조금 더 쉬기`, backdrop, handle, swipe down, hardware Back and accessibility escape dismiss presentation only. They never call resume/finish. The underlying paused controls remain available afterward. Foregrounding does not reopen a dismissed notice or resume the walk.
- `산책 계속하기` uses the existing resume path. While pending, repeat actions and dismissal are disabled. Failure leaves PAUSED plus a retryable notice; success follows the returned runtime state. External notification-side resume also hides the notice and retains the normal minimize/back contract.
- A measured-height Animated View slides up with380ms ease-out; scrim opacity shares the native progress. Exit is260ms; there is no competing system Modal animation. Native driver/`isInteraction:false` means no per-frame route copy or React timer loop. Small canceled drags settle; a deliberate downward swipe dismisses. Reduced-motion/query failure settles content without an entrance, and unmount/transition tokens reject stale completions.
- Backgrounding during dismissal completes dismissal rather than leaving an invisible modal intercepting touches. This affects UI only, not native timing or GPS state. Closing/reopening the screen or changing owner/mode does not transfer the notice across accounts.

## Validation and Exact Correctives

- Before implementation, five new presentation assertions failed, while the failed-native-pause negative case already passed. Motion tests subsequently isolated a background-during-exit completion defect and it was corrected. Initial test authoring also corrected the Pressable-vs-host lookup and void-returning `act` callbacks; no production assertion was removed.
- S24 exposed an immediate hardware Back race before the nested native modal received focus: the parent closed the full public walk view. Preserve that failure and its fail-first assertion. The parent now checks the actual derived rest-sheet visibility before normal back/minimize. A separate failing notification-side-resume test prevented a stale notice flag from consuming Back after the sheet was no longer visible.
- Final focused run:8 suites /277 tests PASS, covering rest motion, native pause acceptance/failure, dismissal/foreground retention, single resume command under double tap, failure retry, external resume, preview/privacy, existing active UI, PRE_WALK/weather and timer/Phase1/Phase2 adapter regression. TypeScript PASS; changed-code ESLint0 errors/0 warnings; Metro bundle200; whitespace PASS.
- No Full Suite was run this task. Earlier pre-walk full runs are historical and are not a final-source full gate for this new UI. No build/install/commit/push. The installed development APK remains unchanged and loads the current uncommitted JS through Metro; this is not a frozen Release artifact.

## Galaxy S24 Evidence

- All interactions use the anonymous public WALKING/PAUSED gallery. Runtime foreground service was OFF throughout. No actual GPS walk, force-stop, reboot, logout, permissions/settings change or private KakaoTalk content access. Background validation uses Home then returns to the existing NURI activity, not opening KakaoTalk. An initial launch attempt used the app-ID-qualified activity; it failed without starting anything. Resolve-activity identified the existing `com.nuri.MainActivity`, and returning the existing task succeeded. This is a QA invocation correction, not an app defect.
- Device checks: three single-line copy rows, safe navigation-area spacing, pause-to-notice, `조금 더 쉬기` retaining PAUSED, underlying resume, sheet resume, immediate hardware Back, swipe down, backdrop dismissal and background/foreground PAUSED retention PASS. Actual native acceptance/failure/duplicate-command paths are local mocked-bridge tests, not a new real-GPS device test.
- External evidence root: `~/.codex/nuri-design-evidence/walk-rest-sheet-20261018-iI2pmp/`. `walking-before.png`, `paused-dismissed.png` and `paused-sheet-final-source.png` preserve public-only views and safe-state/hash receipts. Final image1080x2340, SHA-256 `40a231d947a6b7d829ab9eb701d2c919ccdc5a156cdba1df61bb1ac980f9ad21`. `rest-sheet-entry.mp4` and two extracted contact sheets show the progressive upward entrance. This is visual review, not a quantified all-frame smoothness guarantee.
- The final normal-size screenshot has exactly three copy rows; measured native row bounds were single line. FontScale1.3 is covered locally without altering device font settings; full native large-text/TalkBack handling remains a later gate.
- Actual-location screenshot/raw-coordinate evidence0. Public map fixture origin is checked before recording/capture; nested-modal captures reference the preceding public-origin receipt. No private pet image is captured. Existing earlier screenshots/videos remain intact.

## Remaining Design Work

1. GPS_ACQUIRING: dedicated waiting-state hierarchy/transition, instead of only the shared map/HUD.
2. GPS_WEAK/GPS_LOST: distinct non-alarming guidance and lost/restored transition; respect PO's existing decision to hide the technical GPS chip.
3. RECOVERY_REQUIRED: coherent continue/end choice and explanation matching the new presentation tone; never auto-resume collection.
4. FINISH_CONFIRM: compact summary and clear continue-versus-finish semantics, consistent with the rest sheet rather than a large generic center panel.
5. FINISHED_LOCAL: result/route/quality hierarchy and device-local wording; no server/lifetime/XP claim.
6. FUTURE_RECORD_CTA_PREVIEW: fixture-only visual arrangement, still disabled with no record navigation or rewards. Actual integration belongs to a later approved phase.
7. Common handling: permission/location-off/error states, minimize/back presentation, font scaling/TalkBack, outdoor contrast and responsive finalization. The intermittent two-second timer display jump and unconfirmed URBAN reference remain separate unresolved physical-QA gates.

Recommended next design review is FINISH_CONFIRM, then FINISHED_LOCAL. Do not automatically implement either.

## Preservation and Handoff

- Original repository181 dirty paths, HEAD/status/content hashes unchanged. Dedicated worktree remains intentionally dirty with approved presentation changes; staged0. Native/walk-service diff0, original asset bytes preserved, no new coordinate/network/identity logging. Security20/20 source baseline preserved, not re-audited.
- Existing user/account/pet data, signing inputs, UID/install identity and device settings are not changed by this Metro-only task. No server/database mutation, build output replacement or evidence deletion. Release checklist unchanged because this is not a release gate.
- Metro remains active for PO review. End with public rest sheet open and native service OFF, then stop device control. STORE HOLD; physical walk/Phase4/commit/push are not authorized. Wait for PO review.
