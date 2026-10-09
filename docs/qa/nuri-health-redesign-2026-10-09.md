# NURI 건강관리 리디자인 개발 후보

> 최신 전달 상태는 [가이드·계절 배경 Release 보고서](nuri-seasonal-guide-release-2026-10-09.md)를 따른다. 이 문서의 Metro 개발 후보·미커밋 상태는 최초 구현 이력이며, 후속 글라스·배경·프로필 버튼과 Release 전달을 대신하지 않는다.

<!-- NURI_HEALTH_VISUAL_REVIEW_20261009_BEGIN -->
> 최신 후속: PO 요청으로 [채워진 목록 실기기 QA](nuri-health-visual-review-2026-10-09.md)를 수행했다. 시안 차이와 탭 스크롤·체중 정밀도 결함 2개가 확인되어 보완 필요다. 아래 Codex native QA 미실행은 최초 설치 시점의 이력이며, 시안 일치 승인이나 이번 후속 QA 완료를 의미하지 않는다.
<!-- NURI_HEALTH_VISUAL_REVIEW_20261009_END -->

## 범위와 승인

- PO 승인: Home 건강관리 최근 활동, 건강관리의 기록·체중·인사이트 리디자인, Home 전체 보기의 borderless text/chevron 통일.
- 전달 방식: 기존 Release를 같은 앱 ID·서명의 개발 APK로 덮어 설치하고 Metro/Fast Refresh 연결. 실제 화면 검증은 PO가 수행한다.
- 저장·등록·삭제는 이동 링크와 구별되는 기존 CTA 역할을 유지한다. 전역 CTA 교체, DB, native keyboard, navigation 구조 변경은 범위 밖이다.
- 위험도: MEDIUM. 건강관리의 여러 상태와 shared weight sheet/Home action이 대상이므로 데이터·키보드 소유권은 보존하고 화면 표현만 교체한다.

## 구현

| 영역 | 변경 | 보존 |
|---|---|---|
| Home 전체 보기 | chip border/background 제거, 14sp 문구와 chevron, 최소 48dp touch target | 기존 진입 callback·확대 글꼴 배치·빈 상태 CTA 역할 |
| Home 건강관리 최근 활동 | 사진 없이 작은 semantic icon·텍스트·divider로 밀도 정리 | 외부 glass·계절 empty art·최대 5개·날짜별 진입·실제 데이터 |
| 건강관리 | 흰색 중심의 평면 header·펫 문맥·underline tab·월 이동·날짜별 목록 | 기존 날짜·기록·일정·알림 상태와 이동 |
| 체중 | 실제 최근 측정값·이전 대비·line chart·수정 가능한 이력 | 측정일·메모·저장/삭제·캐시 갱신 |
| 인사이트 | 실제 집계값 4개·날짜별 기록·체중 추이·상세 drilldown | 기존 집계 공식·상세 목록·빈/오류/로딩 상태 |
| 체중 입력 sheet | compact header·평면 field·기록하기/수정하기·48dp 닫기 | keyboard owner·reveal·date picker·validation·submit lock |

- 계절은 작은 accent에만 적용하고 사용자 글꼴을 유지한다. 체중 증감 자체를 건강상 좋음/나쁨으로 색상 판정하지 않는다.
- 체중 그래프는 실제 조회 기록만 사용한다. 0 기준 축, 실측값·날짜 접근성 label, 많은 측정값에서 가로 탐색을 제공한다. 표시용 mock은 테스트 안에만 있다.
- 인사이트는 fontScale 1.3 이상에서 한 열로 표시한다. 고정 너비 칩 대신 늘어날 수 있는 텍스트와 충분한 터치 영역을 사용한다.

## Source Owner

| 파일 | 역할 |
|---|---|
| `src/app/ui/SectionHeaderAction.tsx` | Home text/chevron action |
| `src/app/ui/SectionHeaderAction.styles.ts` | 동일 action의 여백·touch target |
| `src/components/home/HomeSectionHeader.tsx` | 제목/action 정렬 |
| `src/screens/Main/components/LoggedInHome/HomePopulatedLists.tsx` | Home 건강관리 최근 활동 |
| `src/screens/HealthReport/HealthReportScreen.tsx` | 기록·체중·인사이트 표현 |
| `src/components/health/WeightTrendChart.tsx` | 실제 체중의 추이 렌더링 |
| `src/components/health/weightChartModel.ts` | 그래프 좌표·축 계산 |
| `src/components/health/WeightLogEntrySheet.tsx` | 건강관리·펫 프로필에서 재사용하는 체중 sheet |

서비스·hook·Android/iOS source delta는 0이다. `useHealthReportMonth`, 기존 체중 service, notification lifecycle, 기록 상세의 중첩 route는 유지한다.

## Local Validation

| 검사 | 결과 |
|---|---|
| TypeScript | PASS |
| Targeted ESLint | 오류 0·경고 0 |
| Targeted Jest | 5 suites / 113 tests PASS |
| Full Jest | 1회, 201 suites / 2,083 tests PASS |
| Scoped git diff check | PASS |

- 테스트: `healthRedesign`, `homeSectionPresentation`, `homePopulatedLists`, `healthReportViewModel`, `keyboardModalOwnership`.
- 실제 데이터로 drilldown/체중 수정 route, 4계절, fontScale 1.0/1.3/1.5, empty/error/loading, chart scale, Home callback, 키보드 단일 owner 구조를 검사했다.
- 최초 targeted 실행의 새 route 테스트 1개는 기존 중첩 navigation을 잘못 예상해 실패했다. 실제 `AppTabs → TimelineTab → RecordDetail` 계약을 확인해 기대값을 정정했고 최종 실행은 전부 통과했다. 앱 navigation은 변경하지 않았다.
- React test renderer 의존성의 JSX transform 경고는 기존 full-suite 출력에 포함된다. 로컬 테스트는 native pixel/IME 검증을 대신하지 않는다.
- 검증 source 11개(runtime 8개·test 3개)의 SHA-256은 evidence의 `validated-source.json`에 고정했다.

## Build / Metro 전달

- Node 24.20.0 / Yarn 3.6.4 / Java 17, 기존 산출물을 재사용하는 Debug 빌드다. clean은 실행하지 않았다.
- 최초 Gradle invocation은 임시 서명 init script가 included plugin build까지 대상으로 삼아 configuration 단계에서 실패했다. NURI Android root로 제한한 두 번째 invocation은 성공했다. 앱/native source를 우회 변경하지 않았다.
- 성공 빌드는 7분 17초, 537 tasks 중 66 executed / 471 up-to-date. invocation 2회 중 configuration 실패 1회·성공 Debug build 1회다.
- 완료 APK가 개발 기본 서명인 것을 설치 전에 발견했다. 임시 init script의 사후 설정만으로 최종 서명이 바뀌지 않았으므로, 재빌드 없이 완성 APK에 기존 release key로 서명한 후 signer를 검증했다. credentials는 로그·문서에 남기지 않았다.
- 최종 APK: `/private/tmp/nuri-health-redesign-20261009-wuUODJ/nuri-health-metro.apk`.
- APK SHA-256: `58cd2c3bc47fdba0aaee4aea9492b18488d48f6c1cd92b88a4a4d894f915f8a1`.
- Signer SHA-256: `08efb41ea4729792ce9fc3d242be9704e84a8ea3eadcbbcf1c8426884db689d3`, 기존 설치 Release와 동일하다.
- `com.nuri.app`, versionName 1.0 / versionCode 1, DEBUGGABLE. install-r 1회 성공, 설치된 APK hash 일치.
- UID 10402, 최초 설치 `2026-06-02 19:16:57` 유지. 마지막 업데이트 `2026-10-09 15:48:39`.
- Galaxy S24 `SM-S937N / R5CY613NMSY`: 1080×2340, density 450, fontScale 1.0, navigation_mode 0(three-button) 유지.
- Metro `127.0.0.1:8081` status 정상, USB reverse 8081 연결. 앱 실행은 연결 설정을 위한 1회뿐이며 tap/swipe/입력/저장 QA는 하지 않았다.
- Inspector에 `com.nuri.app (samsung SM-S937N)` / React Native Bridgeless target 확인, `index.js` bundle 전달 완료. Fast Refresh는 RN `DevInternalSettings`의 기본 true이며 기기에 override preference 파일이 없다. 소스 변경을 일부러 삽입하는 HMR probe는 하지 않았다.
- Metro는 PO live 검토를 위해 유지한다. 화면 이동·기기 설정 변경·uninstall·clear data·logout은 0이다. 로그인/선택 펫의 UI 확인은 PO 대기이며 저장 공간 보존 검사와 혼동하지 않는다.

## PO 확인 범위

1. Home: 전체 보기 버튼의 border 제거·문구/화살표 정렬, 건강관리 최근 활동의 작은 icon·텍스트·divider와 기존 glass.
2. 건강관리: 날짜 선택·기록/일정 표시·기록 상세 왕복·기록하기 메뉴. 실제 저장 없이 확인할 수 있다.
3. 체중: 최근 값·이전 대비·그래프·측정 이력. 입력 sheet의 키보드/날짜 모달 왕복은 저장하지 않고 확인한다.
4. 인사이트: 실제 월별 지표·상세 목록·날짜별 기록·체중 추이, 빈 달과 월 이동.
5. 긴 이름/메모 및 확대 글꼴의 overflow 여부. 로컬 렌더 검사는 통과했으나 이번 기기 설정 변경·native 확대 글꼴 QA는 하지 않는다.

## Evidence / 경계

- Root: `/private/tmp/nuri-health-redesign-20261009-wuUODJ/`.
- baseline, device-before, validated-source, 타입/lint/targeted/full-suite 로그, build 로그, Metro 로그를 분리한다.
- 시작 전 dirty/untracked 파일 203개 누락 0·예상 밖 변경 0. 문서 5개의 이번 추가 블록을 제외한 원문 hash도 모두 같고 검증 이후 runtime/test source 변경 0이다. [보존 결과](nuri-health-redesign-2026-10-09-evidence/preservation.json).
- APK와 Metro가 전달하는 JS는 별도다. 이번 개발 후보를 최신 JS가 내장된 Release 완료로 부르지 않는다.
- Codex native 시각·키보드 QA: NOT_RUN. PO 화면 검토: PENDING.
- DB/RPC/RLS/Storage 변경·cleanup·commit·push: 0. STORE: HOLD.

## Final State

- IMPLEMENTATION: IMPLEMENTED_PENDING_PO_APPROVAL.
- DELIVERY: DEBUG_INSTALLED_METRO_CONNECTED.
- METRO: ON. FAST_REFRESH: DEFAULT_ON, live patch 자체 검증은 미실행.
- DEVICE_OWNER: PO. 자동 UI QA·추가 build/install·후속 corrective 시작 없음.
- BRANCH: `codex/task6-community-content-policy`.
- HEAD: `ff6e4de1a8fec90410e8570ae3de4889efdb8d2b`. STAGED: NONE.
- 작은 metadata는 [검증](nuri-health-redesign-2026-10-09-evidence/validation.json), [설치](nuri-health-redesign-2026-10-09-evidence/candidate.json), [Metro](nuri-health-redesign-2026-10-09-evidence/metro.json)에 보존하며 APK·대형 로그는 repository에 복제하지 않는다.

PO 승인을 기다립니다.
