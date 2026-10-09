# NURI 계절 글라스·가이드·Home 버튼 Release 전달

2026-10-09 KST. PO의 가이드 배경/유리패널 적용, Home `누리 더 알아보기` 색상/화살표, 빌드·설치·커밋·푸시 요청에 따른 전달이다. 앞서 이어서 작업한 건강관리와 공통 계절 화면 변경도 포함한다. Store 배포나 기존 미해결 건강관리 결함의 수정 승인을 뜻하지 않는다.

## 1. 구현 결과

| 영역 | 최종 변경 | 보존한 계약 |
|---|---|---|
| 집사 꿀팁 가이드 목록 | 공통 계절 배경, 검색/추천/로딩/오류/빈 상태 및 가이드 행의 실제 블러 유리 소재 | 검색의 동기 controlled value, deferred 검색 계산, 필터/정렬/랭킹/페이지 확대/진입 callback |
| Home 프로필 버튼 | 실제 펫 이름의 `더 알아보기`, 현재 effectiveSeason의 색/옅은 바탕/테두리, 오른쪽 chevron | 기존 위치·크기·가운데 문구·프로필 진입 |
| Home·건강관리·전체일정·전체메뉴·타임라인 | 바탕 전체의 계절색, 짧고 옅은 중앙 빛, 정적인 작은 반짝이 | 계절 이미지 원본·데이터·목록 순서·키보드/내비게이션 소유권 |
| Home 배경 | 큰/중간 구체와 넓은 확산광 제거, 작은 구체 보조 유지 | 기존 작은 구체 위치/원본 자산 |
| 전체일정·타임라인 행 | 실제 `HomeFrostedGlass` 블러 소재 | 가상화와 행 터치·목록 데이터 |
| 타임라인 통계·작성 버튼 | 통계는 기존 일반 반투명 패널로 복구, 흰색 `+`, Android 블러 촬영에서 버튼만 제외 | 정상 렌더·터치·작성 동작·전역 native inset |
| 건강관리·Home 전체 보기 | 기록/체중/인사이트 표현 및 선택한 글라스 구역, 나이·세부종, text/chevron 전체 보기 | 실제 건강 데이터·체중 저장·알림·기존 route |

- 가이드의 밝은 표면은 기존 어두운 본문색 계약에 맞춰 light appearance를 명시한다. 새 다크 테마 전체 리디자인은 하지 않았다. 가이드 상세/관리자 화면은 이 목록 소재 확장의 대상이 아니다.
- 기존 반경과 여백을 유지하며 카드 안에 새 장식 카드를 중첩하지 않았다. 바깥 margin을 쓰는 패널은 shared glass의 width 100%를 해제하여 가로 넘침을 막는다.
- Home 다른 foreground는 기존 가을 고정 표현 계약을 유지하지만, 이번 버튼은 `useEffectiveSeason()`을 직접 사용해 선택 계절을 따른다. 긴 이름의 줄바꿈과 오른쪽 화살표 공간을 보존한다.
- 흰 번짐의 직접 원인은 반짝이 halo 이미지에 explicit width/height가 없어 React Native가 asset의 고유 192×192 크기를 유지한 것이다. 작은 부모 밖으로 퍼지던 halo를 실제 glint 크기로 제한하고 clip했다. 전체 glass 투명도나 원본 이미지를 임의로 변경하지 않았다.
- QA 샘플은 DEV-only 메모리 표시이며 Release에서는 활성화/제어가 차단된다. 실제 건강 데이터를 샘플로 저장하지 않는다.

## 2. Source와 검증

- Source commit: `a2b3da4d3d2ff8037b9fda1fc8c96a82759f024b`.
- Branch: `codex/task6-community-content-policy`.
- 명시적으로 선택한 source/test 41개만 source commit에 포함했다. 기존 문서 정리·archive·미사용 디자인 원본·Supabase dirty는 포함하지 않았다.
- Source owner: `GuideListScreen.tsx`, `GuideListScreen.styles.ts`, `GuideListCard.tsx`, `LoggedInHome.tsx`, `SeasonalAmbientBackground.tsx`, `HomeAmbientBubbleCanvas.tsx`, `seasonalAmbient.ts`, `HealthReportScreen.tsx`, 일정/타임라인/More 표면과 관련 테스트. 이전 단계 세부 변경은 [건강관리 최초 구현](nuri-health-redesign-2026-10-09.md)과 [시각 QA 및 후속 이력](nuri-health-visual-review-2026-10-09.md)을 따른다.

| 검사 | 최종 결과 |
|---|---|
| TypeScript | PASS |
| 변경된 TS/TSX 38파일 ESLint | 오류 0, 기존 no-shadow 경고 23 |
| 마지막 테스트 파일 ESLint | 오류/경고 0 |
| 최종 가이드/Home targeted | 2 suites / 80 tests PASS |
| 최종 전체 Jest | 203 suites / 2,127 tests PASS |
| 선택한 source의 diff check | PASS |
| 상대 runtime import/require 검사 | 477파일·2,267참조, 누락 0·의도하지 않은 untracked 의존성 0 |

- 초기 새 가이드 검사는 memo wrapper 탐색과 Jest의 iOS 기본값을 Android로 잘못 예상해 실패했다. 실제 BlurView 렌더와 명시적인 Android test fixture로 수정했다. 앱 기대 동작을 완화하지 않았고, 수정 후 전체 테스트를 다시 완료했다.
- halo 회귀는 수정 전 native 192dp 크기 합성 조건에서 실패를 재현하고 수정 후 통과했다. 앞선 halo 단계 전체 203/2,121 PASS에 이번 가이드/버튼 검사 6개를 더한 최종 결과다.
- 전체 작업 트리 diff check에는 이번 시작 전부터 존재한 무관한 QA log와 migration의 EOF 공백 2건이 남는다. 해당 파일은 수정/커밋하지 않는다.

## 3. Build와 설치

- 증분 `assembleRelease bundleRelease --no-daemon --console plain` 1회, 성공 2분 34초. 1,004 tasks 중 75 executed, 1 from cache, 928 up-to-date. clean 없음.
- 빌드 전후 runtime/config 입력 709개의 hash 동일. 최신 앱 소스는 위 source commit과 일치한다. 이전 문서 dirty는 남아 있지만 빌드 코드에 섞이지 않았다. clean-checkout Store provenance gate를 통과한 Store RC로 선언하지 않는다.
- APK: `/private/tmp/nuri-season-guide-release-hNhSfq/nuri-a2b3da4-seasonal-release.apk`.
- APK SHA-256: `4e09ade58a15c1f6f117d86cd0f6bc7b0ab469ba6e025da3989975e2f4463574`.
- AAB: `/private/tmp/nuri-season-guide-release-hNhSfq/nuri-a2b3da4-seasonal-release.aab`.
- AAB SHA-256: `c7e7ea5fef726f6fd7de25ef241b07fba57cc7fc14e4b881af3c447d577dd4f4`. Store 업로드/별도 AAB 배포 검증 없음.
- `com.nuri.app`, versionName 1.0 / versionCode 1. APK verifier ACCEPTED: debuggable false, cleartext false, JS bundle 내장, 서명 PASS. signer `08efb41ea4729792ce9fc3d242be9704e84a8ea3eadcbbcf1c8426884db689d3`는 기존 설치 앱과 동일하다.
- `adb install -r` 정확히 1회 성공. 설치 APK hash 일치, UID 10402와 최초 설치 `2026-06-02 19:16:57` 유지. 마지막 업데이트 `2026-10-09 18:21:44`.
- 1080×2340/density 450/fontScale 1.0/three-button 설정 동일. 앱 저장 공간을 초기화하지 않았다. 설치 후 로그인/선택 펫은 직접 화면을 열어 재검증하지 않았으므로 UI 상태 확인은 PO에게 남긴다.
- Metro PID 15799는 요청 없이 종료하지 않고 기존 상태로 보존했다. 이번 Release는 내장 bundle을 사용하며 Fast Refresh/Metro에 의존하지 않는다. 자동 재시작/화면 진입을 하지 않았다.
- 기존 Gradle deprecated API 및 React Native featureflags exports 경고는 남지만 빌드는 성공했다.

## 4. 실기기 확인 경계

- Galaxy S24 / SM-S937N / R5CY613NMSY. 기존 1080×2340, density 450, fontScale 1.0, three-button 설정을 변경하지 않는다.
- 이번 가이드/버튼 단계에서 Codex tap/swipe/키보드 입력/저장 QA는 하지 않았다. PO가 연 Home 화면을 수동 조작 없이 관찰했으며, 가이드 전체 native QA 완료로 확대하지 않는다.
- 원시 캡처 `guide-live.png`는 촬영 시점에 PO가 이동한 **Home** 화면이다. 가이드 화면 증적이 아니다. 화면에는 계절색 버튼과 chevron, 작은 반짝이/구체가 보인다. 전후 동일 viewport 픽셀 비교를 주장하지 않는다.
- 네 계절, 확대 글꼴, 가이드 검색/필터, 타임라인 잔상 등의 최종 시각 판정은 PO에게 남긴다. 기존 키보드 전역 승인 범위는 변경하지 않는다.

## 5. 남아 있는 사항

- HQA-01: 건강관리 탭 전환 시 이전 스크롤 위치 공유. OPEN_REPRODUCED.
- HQA-02: 작은 체중 변화 +0.02kg가 +0.0kg로 표시되는 정밀도 불일치. OPEN_REPRODUCED.
- 이 두 항목은 기존 [시각 QA 보고서](nuri-health-visual-review-2026-10-09.md)의 별도 corrective 대상이다. 이번 배경/가이드 변경으로 해결됐다고 보고하지 않는다.
- Android 블러의 스크롤 비용은 이번에 성능 계측하지 않았다. virtualized list는 유지했고 성능 PASS를 새로 선언하지 않는다.

## 6. 증적과 보존

- Raw root: `/private/tmp/nuri-season-guide-release-hNhSfq/`.
- 이전 root: `/private/tmp/nuri-list-blur-N9ENP2/`, `/private/tmp/nuri-season-canvas-qDWZoG/`. 기존 산출물을 삭제하지 않는다.
- 작은 검증/설치/보존 metadata는 [release-result.json](nuri-seasonal-guide-release-2026-10-09-evidence/release-result.json)에 보존한다. APK/AAB/스크린샷·대형 로그·credentials는 Git에 추가하지 않는다.
- DB/RPC/RLS/Storage 변경 0. 콘텐츠 저장/삭제 0. uninstall/clear data/logout 0. 기기 설정 변경 0. cleanup 0.
- 기준선 1,836파일 중 누락 0, 허용 범위 밖 변경 0. 빌드 이후 runtime 입력 변경 0. 보호 대상 dirty·원본 asset·기존 증적을 보존했다.
- 관련 project-memory 및 release-checklist에 이 결과의 진입점을 추가하며, 기존 무관한 문서 정리 내용은 별도 dirty로 보존한다.
- source commit `a2b3da4`의 원격 branch 반영을 확인했다. 이 전달 보고서/작은 증적/project-memory의 새 요약만 별도 documentation commit으로 묶는다. 공통 문서 전체를 stage하지 않고 이번 삽입 블록만 선별하여 기존 canonicalization 변경과 섞지 않는다.

## 7. 전달 상태

SOURCE: COMMITTED_AND_PUSHED. VALIDATION: PASS. RELEASE_BUILD: PASS. INSTALL: PASS. INSTALLED_MATCH: PASS.

PO 시각 검토 경계를 유지한다. STORE: HOLD. 다음 기능/DB/보안 작업을 자동 시작하지 않는다.

PO 승인을 기다립니다.
