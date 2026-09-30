# NURI Four-Season Lower Decoration Balance and Disk Cleanup

## Final Approval Follow-Up

- PO가 이 마지막 후보를 최종 승인했다. 아래 `PENDING`은 후보 제출 당시 상태다. 합의한 임시 버튼 제거·자동 계절 복귀·검증·추가 승인된 release/install·선별 commit/push 종료 결과는 `docs/qa/nuri-home-four-season-final-approval-2026-09-30.md`를 따른다.

## 1. Decision and Scope

- PO는 직전 색감 후보가 거의 승인에 가까우며 Hero 아래의 장식 비율·가시성만 추가 보정하도록 지시했다. 전체 요약 오른쪽의 반쯤 보이는 구체, 자주 쓰는 기록 왼쪽 상단 크기의 온전한 구체, 별빛을 비슷한 비중으로 배치한다.
- 개수 기준 1:1:1을 적용한다. 실제 합성 화면의 체감 비중은 PO가 판단한다. Hero, 네 계절 palette, mesh, 유리 재질, UI와 기능은 변경하지 않는다.
- 배경 소스 3개와 관련 테스트 2개를 수정했다. `ambientMesh.ts`, `seasonalAmbient.ts`, `HomeAmbientBubbleCanvas.tsx`, `homeAmbientBubbleCanvas.test.ts`, `homeSeasonalAmbient.test.tsx`다.
- 위험도는 Medium이다. 장식 밀도와 위치가 달라지므로 실기기 시각 검토가 필요하다. 원격 운영·Supabase·데이터·navigation 변경은 없다.

## 2. Decoration Result

- 기존 하단 구체 52개·별빛 28개 대신 cropped 구체 12개·complete 구체 12개·별빛 12개, 총 36개로 정리했다. 작고 가려진 장식을 계속 추가하지 않고 두 구체 크기의 대비와 여백 배치를 사용한다.
- cropped 구체는 전체 요약의 기존 크기 범위를 사용한다. 360/400/430dp에서 지름 96~150dp clamp, 가로 지름의 약 42~50% 노출이다. 전체 요약 우상단·사진 아래·일기 아래의 기존 세 descriptor는 보존하고 다른 구간에 비대칭 위치로 분산했다.
- complete 구체는 44~64dp clamp 안에서 화면 좌우 모두 8dp 이상 여유를 갖는다. 자주 쓰는 기록의 왼쪽 상단 구체 등 8개는 기존 52dp 패널 간격 안에 44~48dp로 배치해 타일이나 유리 경계 뒤에 걸치지 않도록 했다.
- 추천 팁은 제목 강조 줄의 오른쪽 빈 공간에 complete 구체를 둔다. section 시작점에서 98dp의 안정된 offset을 사용해 카드 수나 section 높이가 늘어나도 CTA 아래·제목 오른쪽에 남는다. 오늘의 팁도 제목 오른쪽 공간을 사용한다.
- Weather 구체는 전체 scroll 비율 대신 실제 Hero 끝부터 lower section 시작점까지의 측정 구간을 따른다. 측정 전에는 렌더하지 않고 complete 구체가 구간 위아래를 벗어나지 않도록 한다.
- 별빛 12개는 actual section anchor를 유지하며 좌우 및 section 사이 여백에 분산한다. 같은 크기나 좌표를 반복하지 않는다. Hero 구체 8개·별빛 9개는 보존했다.
- full-content canvas, pointerEvents none, accessibility hidden, content 뒤 layering, no animation, no new native dependency와 no scroll-state update 계약은 유지한다.

## 3. Preservation and Validation

- `LoggedInHome.tsx`, `SeasonalHomeAutumn.tsx`, `HomeSectionGlass.tsx`, `profileEdit.ts`와 계절별 구체 3개 자산 hash가 작업 전후 동일하다. 기존 source UI geometry, 섹션 간격, font, copy, 데이터와 기능은 변경하지 않았다.
- Hero descriptor·기존 ambient fields와 네 계절 palette는 보존한다. 바깥 glass 50%, 내부 glass 60%, no-shadow, elevation 0, Bottom Navigation과 임시 계절 버튼도 유지한다.
- Node 24.20.0, Yarn 3.6.4. TypeScript PASS. 대상 ESLint 오류 0, 새 경고 0, 기존 LoggedInHome no-shadow 경고 20개 유지.
- 관련 16개 스위트, 189개 테스트 PASS. Full suite 미실행. 360/400/430dp에서 12:12:12 비율·cropped 비율·complete 좌우 가시성·패널 gap 안의 위치·one-canvas 계약을 검사했다.
- 추천 팁과 자주 쓰는 기록은 section 높이 240/620/1100dp에서 위치가 본문 성장에 따라 밀리지 않는지 검사했다. Weather의 측정 전 렌더 금지도 확인했다.
- git diff --check PASS. 실기기 글꼴 크기 변경·Memorial 상태의 합성 가시성·최신 전체 runtime QA는 미확인이다. 코드 계약 검증을 시각 최종 승인으로 취급하지 않는다.

## 4. Release and Installation

- PO의 `수정 후 빌드·설치 진행` 승인으로 Android release 1회와 adb install -r 1회를 완료했다. 계절 작업 누적은 각 8회다.
- Build SUCCESSFUL in 1m53s, 2026-09-30 21:01:17 KST. Verifier ACCEPTED, signature PASS, debuggable false, cleartext false, JS bundle embedded. Metro OFF, Fast Refresh OFF.
- Galaxy S24 SM_S937N, serial R5CY613NMSY install Success. 기존 앱 데이터 유지.
- 최신 APK: `/tmp/nuri-home-three-seasons-20260930/nuri-a94279b-three-family-cfe40e21.apk`.
- SHA-256: `cfe40e218e4ff324783f35ab1fbb1188f3e7c69c54fd256ab17223753ba93c96`.
- 기기 조작 중단을 유지해 설치 외 앱 실행·터치·스크롤·계절 전환·캡처를 하지 않았다. 최신 실기기 화면, Fatal·ANR·RN Fatal 및 Red Screen은 미확인이다.
- 검증·빌드·설치 로그는 `/tmp/nuri-home-three-seasons-20260930/three-family-types.log`, `three-family-eslint.json`, `three-family-tests.log`, `three-family-build.log`, `three-family-install.log`다.

## 5. Disk Cleanup

- 사용자 정리 지시에 따라 최신 설치와 보존 APK 확인 후 삭제했다. 모두 실제 위치·일반 파일 여부를 확인했으며 generated directory는 Git ignored와 symlink 아님을 확인했다. source, preexisting dirty와 untracked 자산은 삭제하지 않았다.
- 이전 후보 APK 6개를 삭제했다: `2b643f8a`, `67fb5c1a`, `fce4aac7`, `cc28e0f2`, `55b6784f`, `b5529e8a`. 합계 logical size는 1,013,649,426 bytes다. 이전 보고서의 해당 APK 경로는 역사적 설치 기록이며 현재 파일은 없다. 해당 checksum, 로그·PNG·XML은 보존했다.
- 재생성 가능한 `android/app/build`, `android/app/.cxx`, `android/build`, `android/.gradle`, `node_modules/react-native-reanimated/android/build`, 같은 package의 `android/.cxx`를 삭제했다. 다음 release build는 native cache 재생성 시간이 추가된다.
- 최신 `cfe40e21`, 직전 PO 검토본 `1e3291e6`, 승인 가을 기준 `3db17925` APK를 보존하고 cleanup 후 SHA-256 동일을 확인했다. source assets, 시안, 증적, 로그, project-memory와 output은 유지한다.
- 다른 프로젝트가 공유하는 전역 Gradle cache와 개인·시스템·다른 앱 cache는 변경하지 않았다. 이번 정리는 NURI 작업 산출물과 해당 프로젝트의 재생성 가능한 native cache에 한정한다.
- Data volume available이 38,681,636KiB에서 43,912,332KiB로 증가했다. 관측상 약 4.99GiB 확보, 약 36.9GiB에서 41.9GiB다. APFS 공유 block 때문에 logical 삭제량과 실제 여유 증가량은 같지 않다.
- 삭제·보존 목록과 before/after 측정 로그: `/tmp/nuri-home-three-seasons-20260930/three-family-cleanup.log`.

## 6. Final State

- 현재 상태, 핵심 결정사항, 우선순위, 작업 로그, release-checklist와 직전 후보의 후속 검토 연결을 갱신했다. 기존 이력과 dirty는 보존했다.
- HEAD: `a94279bc727aab7600c1257c5e4bbd9320c3f1cf`. BRANCH: `codex/task6-community-content-policy`.
- IMPLEMENTATION: COMPLETE. LOCAL_VALIDATION: PASS. RELEASE_INSTALL: COMPLETE. SCOPED_DISK_CLEANUP: COMPLETE. PO_VISUAL_APPROVAL: PENDING.
- STAGED: NONE. COMMIT: NO. PUSH: NO. AUTO_START_NEXT_WORK: NO.
- 다음 한 가지는 PO 직접 검토다. 세 장식 그룹의 체감 비중, 작은 구체의 전체 노출과 제목 옆 여백 활용을 확인한다. 최종 승인 전 임시 버튼 제거·Git closeout·추가 자동 튜닝은 하지 않는다.

PO 승인을 기다립니다.
