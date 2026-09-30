# NURI Four-Season Selective White-Pocket Corrective

## Subsequent PO Review

- PO는 이 설치본에 네 계절 좌우 흰 번짐이 남고 봄의 emerald와 하단 별빛 균형이 아쉽다고 판단해 승인을 거절했다. 아래는 당시 구현·검증 이력이며 최신 승인 상태를 뜻하지 않는다.
- 후속 수정본과 추가 승인 설치는 `nuri-home-four-season-edge-pink-starlight-corrective-2026-09-30.md`를 따른다. 이전 APK와 로그는 보존했다.

## 1. Decision and Scope

- PO는 직전 하단 색 통일 후보가 밋밋하다고 판단했다. 이번 목표는 색 통일 전의 mesh 흐름을 살리고 유난히 흰 구간만 줄이는 것이다.
- 네 계절 배경 소스 2개와 관련 테스트 1개를 수정했다. UI, glass, 구체 자산 및 배치, 빛, 임시 네 계절 버튼과 자동 계절 판정은 변경하지 않았다.
- 변경 범위는 `seasonalAmbient.ts`, `HomeAmbientBubbleCanvas.tsx`, `homeSeasonalAmbient.test.tsx`다. 직전 후보 전체나 다른 미커밋 변경을 되돌리지 않았다.

## 2. Background Corrective

- 하단을 덮던 계절별 단색 lower base, Hero 마지막 16%의 색 통일 transition과 field-start 덮개를 제거했다.
- 겨울 ice/lilac/pearl, 봄 rose/mint/peach, 여름 aqua/mint/ivory의 세 가지 색 흐름을 복원했다. 기존 field 위치·크기와 66%/58% alpha를 사용한다. 모든 색을 같은 계열로 제한하지 않는다.
- 가장 밝던 하단 중성 field만 겨울 `#FFF9ED`에서 `#F2EEE7`, 봄 `#FFF0DF`에서 `#F8E7D8`, 여름 `#FFFBE4`에서 `#F1F0D7`로 낮췄다. Hero의 원래 중성색과 나머지 색은 그대로다.
- 가을의 승인 base와 12개 전체 mesh field는 보존했다. 하단의 빈 흰 구간에는 peach/lilac/apricot의 약한 22%/18% field를 실제 section layout에 연결한다. 불투명 바탕색으로 기존 mesh를 가리지 않는다.
- 중앙 white wash는 Hero에만 유지한다. 하단을 다시 흰빛으로 덮지 않는다. Weather와 하단 field는 같은 root에서 투명하게 겹쳐 transition 경계의 hard crop을 제거했다.
- 하나의 full-content canvas, pointerEvents none, accessibility hidden, content 뒤 layering과 실제 layout anchor를 유지한다. 스크롤 상태 갱신, 새 native dependency, 애니메이션과 자산 생성은 없다.
- Hero descriptor와 구체는 유지하지만 연결부의 투명한 field overlap은 직전 색 통일본과 달라진다. 모든 Hero 픽셀 동일이나 시각 최종 일치를 주장하지 않는다.

## 3. Preservation and Local Validation

- Node 24.20.0, Yarn 3.6.4, toolchain PASS.
- TypeScript PASS. 대상 ESLint 오류 0, 새 경고 0, 기존 LoggedInHome no-shadow 경고 20개 유지.
- 관련 16개 스위트, 185개 테스트 PASS. Full suite 미실행.
- 360/400/430dp canvas, 60개 구체의 명시적 크기와 재질, 실제 section anchor, 불투명 lower cover 부재, 세 가지 색 흐름, 하단 중성색만의 감소와 Hero 색 보존을 검사했다.
- `ambientMesh.ts`, `LoggedInHome.tsx`, `SeasonalHomeAutumn.tsx`, `HomeSectionGlass.tsx`, `profileEdit.ts` 및 세 계절 구체 자산의 작업 전 hash 동일.
- 바깥 glass 50%, 내부 glass 60%, geometry, 글꼴, 문구, 데이터와 navigation은 변경하지 않았다. Supabase 및 원격 운영 변경 없음.
- git diff --check PASS. 로컬 계약 검증을 실제 합성 화면의 미적 승인으로 취급하지 않는다.

## 4. Source and Device Boundary

- SOURCE: SELECTIVE_CORRECTIVE_COMPLETE. LOCAL_VALIDATION: PASS. PO_VISUAL_APPROVAL: PENDING.
- PO가 이번 수정본의 추가 빌드·설치 1회를 승인했다. Android release 1회, adb install -r 1회 완료했다.
- Build SUCCESSFUL, 2m19s, verifier ACCEPTED, debuggable false, cleartext false, embedded JS bundle. Metro OFF, Fast Refresh OFF.
- 현재 Galaxy S24 SM_S937N / R5CY613NMSY 설치본은 `/tmp/nuri-home-three-seasons-20260930/nuri-a94279b-white-pocket-b5529e8a.apk`다. SHA-256: `b5529e8accbc91b419ced2943cae88adc8cbe0f87052a0cb3a626ce56c257d99`.
- install Success, 앱 데이터 유지. 직전 통일 `55b6784f`와 그 이전 참조 교정 `cc28e0f2` APK 및 로그도 보존했다. 세 계절 작업 누적 release·install은 각 6회다. 이번 corrective는 각 1회만 실행했다.
- 기기 조작 중단 지시를 유지한다. 터치·스크롤·계절 전환·캡처·앱 실행을 하지 않았다. 최신 corrective의 실기기 합성 화면, 전체 runtime QA와 Fatal/ANR/RN Fatal은 미확인이다.
- 로컬 및 설치 로그는 `/tmp/nuri-home-three-seasons-20260930/white-pocket-types.log`, `white-pocket-eslint.json`, `white-pocket-tests.log`, `white-pocket-build.log`, `white-pocket-install.log`다. 스크린샷 증적 없음.

## 5. Documentation and Git

- 현재 상태, 우선순위, 작업 로그와 release-checklist를 갱신했다. 직전 통일 후보가 PO 판단으로 대체됐음을 기록하고 이전 구현·설치 이력은 보존한다.
- HEAD: `a94279bc727aab7600c1257c5e4bbd9320c3f1cf`.
- BRANCH: `codex/task6-community-content-policy`.
- STAGED: NONE. COMMIT: NO. PUSH: NO. PREEXISTING_DIRTY: PRESERVED.
- 다음 한 가지: PO가 네 계절의 기존 색 흐름이 살아났는지와 하단 흰 구간의 감소 정도를 직접 검토한다. 최종 승인 전 버튼 제거·staging·commit·push와 추가 자동 수정은 하지 않는다.

PO 승인을 기다립니다.
