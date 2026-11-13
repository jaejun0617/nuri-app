# Global CTA Role System

## 현재 적용 범위

2026-11-14 PO 상시 규칙: 새 화면과 수정 화면은 [공통 글라스·누리 CTA 재사용 결정](../project-memory/핵심-결정사항.md#shared-glass-cta-required)을 따른다. 화면별 임의 표면이나 독자적인 등록 버튼을 만들지 않고, 기존 공통 컴포넌트의 역할·상태·접근성 계약을 재사용한다. 아래 역사적 제외 범위는 당시 실행 범위이며, 새 PO가 지정한 문의 글 등록의 공통 재질 적용을 막는 제한이 아니다.

2026-11-11 안내 보정: 이 문서는 CTA 역할 계약과 **2026-10-06 후보의 팔레트·수락·한계**를 함께 보존한다. 아래 'Current'와 최종 승인·NEXT DESIGN DIRECTION은 당시 후보에 한정한다. 이후 일반 CTA 색상은 [11/06 PO 고정 기준과 명시적 예외](../project-memory/핵심-결정사항.md#2026-11-06-po-고정-모든-후속-디자인의-cta와-글자-크기)를 따른다.

- 현재 [resolveCtaPalette](../../src/app/theme/ctaPalette.ts)는 일반 primary·primarySubtle에 [LAVENDER_CTA](../../src/app/theme/tokens/productAccent.ts)를 사용한다. 계절 인자는 유지돼도 팔레트 선택에는 사용하지 않는다. `solidLavender` 글등록 버튼 예외는 위 PO 결정 범위에 한정한다. 아래 계절 표·흰 Primary 문구를 현재 일반 CTA에 다시 적용하지 않는다.
- [11/05 아이 포인트색 종료 결정](../project-memory/핵심-결정사항.md#2026-11-05-후속-결정-아이-포인트색-기능-종료)은 아래 개인색 선택 유지 설명의 후속 대체다. 기존 raw/null 호환·저장값·의미색 보호까지 폐기하지 않는다.
- 역할별 파괴 행동·초안 보호·확대 글꼴과 줄바꿈 등 명시적으로 대체되지 않은 계약은 유지한다. 후속 디자인·글꼴 예외를 이 안내로 전면 변경하지 않으며, 과거 대비·첫 진입 한계의 현재 해결 여부를 새로 판정하지 않는다.

[10/06 승인 기록](../qa/nuri-global-cta-final-approval-2026-10-06.md)은 당시 증거다. 아래 저장소 밖 보고서·캡처는 로컬 전용이며 이번에 존재·내용을 재검증하거나 공개하지 않는다. 현재 수락은 [단일 원장](../qa/nuri-integrated-closeout-2026-10-25.md)에서 확인한다.

<!-- CTA_HISTORY_20261006_BEGIN -->
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
<!-- CTA_HISTORY_20261006_END -->
