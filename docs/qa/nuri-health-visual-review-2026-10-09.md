# NURI 건강관리 채워진 목록 실기기 QA

## 결론

PO가 지적한 시안과 실제 화면의 차이를 Galaxy S24에서 확인했다. 빈 데이터 때문만이 아니다. 현재 후보는 큰 상단 고정 영역, 회색 바탕, 높이가 큰 행과 그래프 때문에 승인 시안보다 성긴 구성이다. 시안 일치 판정은 **보완 필요**이며, 탭 전환 스크롤 위치와 체중 소수점 표시 결함 2개도 재현됐다. 이번 변경은 읽기 전용 QA 샘플에 한정하고 디자인 corrective는 실행하지 않았다.

## 실행 조건

- 승인: PO의 직접 실기기 검증 및 목록을 채운 QA 요청. 기존 PO-only 관찰 경계를 이번 QA에 한해 변경한다.
- SM-S937N / R5CY613NMSY, Android 16, 1080×2340, density 450, 384dp, fontScale 1.0, three-button. 설정 변경 없음.
- 동일 개발 APK `58cd2c3bc47fdba0aaee4aea9492b18488d48f6c1cd92b88a4a4d894f915f8a1`, version 1.0/code 1. APK identity는 [직전 설치 결과](nuri-health-redesign-2026-10-09-evidence/candidate.json)를 재사용한다. 이번 재추출·재빌드·재설치는 없다.
- 마지막 업데이트 `2026-10-09 15:48:39`, 최초 설치 `2026-06-02 19:16:57` 유지. 로그인된 기존 QA 계정과 선택 펫 `누리` 유지.
- Metro ON, 최신 JS로 샘플 표시 확인. 개발 화면과 Release 내장 bundle 검증을 구분한다.
- 승인 시안: `/Users/shinjaejun/.codex/generated_images/019e64c4-5ab9-7e72-910a-0c8175b0791c/exec-2c030fe0-ae7e-4a4f-a503-195fa761d5ff.png`.
- 증적 root: `/private/tmp/nuri-health-visual-20261009-flDBVl/`. 아래 파일명은 이 root 기준이다.

## 안전한 샘플 구성

| 화면 | 표시 데이터 | 검증 목적 |
|---|---|---|
| Home 건강관리 최근 활동 | 5개, 5일, 증상·약·접종·검진·병원 | 긴 제목, 메모 축약, 날짜·chevron, 밀도 |
| 건강관리 기록 | 월 18개, 오늘 6개, 이전 4일 각 3개 | 완료·알림 상태, 긴 행, 마지막 행 접근 |
| 체중 | 8개, 5.18~5.30kg | 가로 그래프, 측정 목록, 작은 증감 표시 |
| 인사이트 | 18건·기록한 날 8일·체중 8회 | 파생 집계, 날짜 그래프, 상세 18행 |

- `healthVisualQa.ts`의 DEV-only 메모리 store를 사용한다. 영구 저장·실제 query cache 삽입·pet store 변경은 없다. 앱의 완전 재시작 시 기본 OFF다.
- 실제 조회 hook은 유지하며 화면이 소비하는 data만 일시 대체한다. QA OFF 시 실제 데이터 소유권으로 즉시 복귀한다.
- sample ID는 `health-visual-qa:` prefix, 가상 pet/user ID를 사용한다. 현재 선택 펫의 실제 건강 기록이나 의학적 상태를 뜻하지 않는다.
- 샘플의 기록 상세, 체중 작성·수정, 알림 변경, 작성 route를 차단한다. 모드를 꺼도 stale sample ID는 차단한다. 다른 기능의 실제 데이터/행동을 샘플로 바꾸지 않는다.
- 건강관리 상단 `QA 샘플 · 실제로 전환`으로 해제한다. Home에는 `QA 샘플 · 읽기 전용`을 표시한다. Release에서는 제어가 렌더되지 않고 enable도 거부한다.
- QA 제어 자체가 개발 화면의 펫 문맥 행을 약 24dp 높인다. 이를 production 디자인 차이로 잘못 계산하지 않는다. `01-records-before.png`가 이 제어를 넣기 전 비교 화면이다.

## 실기기 결과

| 검사 | 결과 | 증적 |
|---|---|---|
| Home 5행, 긴 제목·짧은 메모·날짜·화살표 | 겹침 없음, 긴 제목 2줄, 메모 ellipsis | `36-home-diverse-final.png`, `35-home-position.xml` |
| Home 행 → 해당 날짜 건강관리 → Back | 10월 7일의 3개 기록으로 이동, Home 스크롤 문맥 복귀 | `37-home-row-route.xml`, `38-home-handoff.png` |
| 기록 당일 6행, 완료·알림·긴 제목 | 마지막 행까지 스크롤 가능, 긴 제목 wrap | `06-records-filled.png`, `07-records-bottom.png` |
| 체중 8개, 좌우 그래프 | 마지막 10월 9일 5.3kg까지 가로 탐색 가능 | `09-weight-top.png`, `10-weight-chart-end.png` |
| 체중 이력 하단 | 마지막 10월 2일 행이 toolbar 위에서 확인 가능 | `11-weight-history.png`, `12-weight-bottom.png` |
| 인사이트 집계와 18행 상세 | 18건·8일·8회, 상세 마지막 10월 5일 행까지 접근 | `15-insights-summary.png`, `16-insight-detail.png`, `18-insight-detail-bottom.png` |
| QA OFF 후 실제 데이터 복귀 | 실제 6건·2일·체중 1회로 복귀 | `19-real-data-restored.xml` |
| 샘플 알림 스위치 tap | 안내만 표시, 스위치 유지, 실동작 차단 | `30-sample-controls.xml`, `31-reminder-blocked.png` |

이번 결과는 384dp/fontScale 1.0의 채워진 목록 시각 QA다. 저장·삭제·실제 체중 입력, native 확대 글꼴·키보드 전역 QA, 성능 벤치마크를 새 PASS로 확대하지 않는다. 기존 로컬 확대 글꼴 테스트와 기존 키보드 승인 경계는 유지한다.

## 확인된 결함

### HQA-01 탭 전환 시 이전 스크롤 위치 공유

- 재현: 기록 목록을 아래로 이동 → 체중 탭. 최근 체중 요약을 건너뛴 위치에서 시작한다. 체중 목록 하단 → 인사이트 탭에서는 요약 지표 대신 하단 체중 변화가 먼저 보인다.
- 직접 관찰: `08-weight-filled.png`, `13-insights-entry.png`. 수동으로 위로 올린 `09-weight-top.png`, `15-insights-summary.png`와 대비된다.
- source: `HealthReportScreen.tsx:1426`, `:1480`, `:1666`의 조건부 ScrollView에 구분 key나 탭별 offset 소유권이 없다. native 컨테이너 재사용이 원인 후보이며 런타임 node identity 계측은 하지 않았다.
- P1, OPEN_REPRODUCED. 첫 진입 위치와 탭별 복원 정책을 정하고 화면 범위에서 수정할 대상이다.

### HQA-02 체중 소수점 정밀도 불일치

- 샘플 5.28 → 5.30kg의 실제 차이는 +0.02kg인데 `+0.0kg (0.4%) 늘었어요`로 보인다. -0.03kg 변화도 `-0.0kg`로 표시된다.
- 그래프에는 5.28kg, 측정 이력에는 5.3kg가 표시되어 같은 측정값의 표현 정밀도가 다르다. 원본 데이터 변경은 없다.
- source: `HealthReportScreen.tsx:181`, `:209`의 `toFixed(1)`와 `WeightTrendChart.tsx:132`의 두 자리 표현 차이.
- 증적: `09-weight-top.png`, `10-weight-chart-end.png`, `11-weight-history.png`, `12-weight-bottom.png`.
- P1, OPEN_REPRODUCED. 저장 정밀도에 맞춘 표시 계약을 통일하고 0이 아닌 차이를 0으로 표현하지 않는 수정이 필요하다.

## 시안과의 차이

| 영역 | 실제 | 시안 기준 보완 방향 |
|---|---|---|
| 배경 | `surface #F6F7FB`, 인사이트 내부 `surfaceElevated` 흰색과 분리 | 건강 화면 범위의 흰색 표면과 divider 중심으로 정리. 전역 theme 변경 금지 |
| 상단 밀도 | 월 이동만 72dp, 큰 pet·tab·날짜 영역 | 최소 터치 크기는 유지하되 시각적 여백·중복 줄을 줄이기 |
| Home 최근 활동 | 세 줄 구조, 보통 행 약 91dp, 긴 제목 약 114dp; 큰 색상 제목·glass 외곽 | 시안의 compact 분류·제목·메모·날짜 위계에 맞춰 행 밀도 조정. Home 전체 배경은 별도 승인 범위 |
| 기록 행·달력 | semantic icon, 알림 별도 줄, 사각 선택 날짜 | 시안의 작은 분류 문구와 원형 날짜 강조 재현. 알림 기능·48dp hit area 보존 |
| 체중 | 큰 summary·여러 설명 줄·큰 그래프, 첫 화면에서 과거 값만 노출 | summary와 이력 간격 축소, 최신 값 발견성 개선 |
| 인사이트 | 지표 설명 문구와 흰 대형 그래프 영역, 체중 그래프 반복 | compact 2×2 지표와 작은 체중 추이로 정리 |

체중 그래프의 0 기준 축은 이전 구현에서 명시한 정책이며, 시안의 5.0~5.6 축과 다르다. 이를 단순 데이터 오류로 부르지 않는다. 확대 축을 쓸 경우 눈금과 범위를 명확히 드러내고 건강 위험을 과장하지 않는 별도 표현 판단이 필요하다. 시안의 예시 수치·펫 이미지·Home 전체 배경을 실제 데이터나 승인된 전역 변경으로 해석하지 않는다.

샘플의 `정기 검진` subtitle에 이미 30분 전 알림을 넣어 별도 알림 줄과 반복된다. 이 중복은 fixture 구성에도 원인이 있으므로 실제 데이터 전체의 결함으로 확정하지 않는다.

## 변경과 검증

- runtime 4파일: `healthVisualQa.ts`, `HealthVisualQaControl.tsx`, `HealthReportScreen.tsx`, `LoggedInHome.tsx`. QA용 display projection·차단만 추가했다.
- test 2파일: `healthVisualQa.test.tsx`, `healthRedesign.test.tsx`. 영구 데이터와 분리, Release 비노출, stale ID 차단, 실제 service/navigation 미호출, 체중 편집 차단과 OFF 복귀 검증.
- TypeScript PASS. 대상 ESLint 오류 0, 기존 LoggedInHome no-shadow 경고 16개.
- 대상 최종 4 suites / 112 tests PASS. 새 테스트의 알림 제어 탐색 1개가 초기에 실패해 실제 접근성 label/onPress 계약으로 검사 위치를 바로잡았다. 앱 기대 동작을 완화하지 않았다.
- 전체 1회: 202 suites / 2,089 tests PASS. 단위 테스트 성공과 native 시각 판정은 구분한다.
- 범위 내 diff check PASS. 전체 diff check에는 시작 전부터 존재한 `docs/qa/nuri-glass-expenses-2026-10-08-evidence/eslint.log`와 `supabase/migrations/20261007074134_community_search_and_write_error_contract.sql`의 EOF 공백 2건이 남아 있다. 무관한 파일은 수정하지 않았다.
- 기존 dirty/untracked 219개를 baseline hash와 비교한다. 작은 보존·검증 metadata는 [결과 JSON](nuri-health-visual-review-2026-10-09-evidence/result.json)에 남긴다.

## 종료 상태

- QA_POPULATED_LISTS: COMPLETE_WITH_FINDINGS. DESIGN_MATCH: NEEDS_CORRECTIVE.
- 샘플 ON, Home 건강관리 최근 활동에서 기기를 PO에게 반환한다. 키보드·모달 닫힘. 기기 설정·계정·선택 펫 보존.
- Metro ON, Fast Refresh 유지. 추가 BUILD/INSTALL/COMMIT/PUSH/CLEANUP: 0. DB 직접 변경·콘텐츠 저장: 0. STORE HOLD.
- 다음 단일 작업: 위 두 결함과 시안 차이를 건강관리 화면 범위에서 보완. 이번 QA에서 자동 확대 구현하지 않는다.

## 후속 변경: 인사이트 및 체중 글라스

- 최신 PO 요청으로 인사이트의 이번 달 요약·날짜별 기록·체중 변화, 체중 탭의 요약/그래프·측정 이력을 기존 `HomeFrostedGlass`로 묶었다. 이 범위에서는 위 평면 디자인 권장보다 최신 글라스 요청이 우선한다.
- 패널 내부 여백 14dp, 사이 간격 12dp. 기존 홈 소재와 계절 tint를 재사용하며 각 행에 별도 카드를 중첩하지 않는다. 요약의 네 상세 이동 항목에는 장식용 오른쪽 chevron을 넣고 기존 조회/상세 모달 계약을 유지한다.
- runtime 수정은 `HealthReportScreen.tsx` 1개, 테스트는 `healthRedesign.test.tsx` 1개다. 실제 데이터/샘플/편집 guard·체중 계산·DB·native·공용 glass 소스는 변경하지 않았다. 나이/종 추가는 후속 제안이며 아직 구현하지 않았다.
- TypeScript PASS, 대상 ESLint 0 errors/0 warnings, 대상 2 suites/25 tests PASS. 4계절 panel 구성, 1.0/1.3/1.5 글꼴별 네 drill-down, 측정 이력 편집/추가와 샘플 쓰기 차단을 검사했다.
- 전체 테스트 최종 202 suites/2,094 tests PASS. 초기 추가 검사에서 memo 컴포넌트·Pressable 탐색과 RN dimensions mock 방식이 맞지 않아 테스트를 바로잡았다. 전체 첫 실행은 이 중 버튼 탐색 1건 실패, 최종 재실행은 모두 통과했다. 앱 동작 기대값을 완화하지 않았다.
- 원시 검증 로그: `/private/tmp/nuri-health-glass-FkiM7m/`. 작은 최종 metadata: [glass-followup.json](nuri-health-visual-review-2026-10-09-evidence/glass-followup.json).
- Metro RUNNING, Galaxy inspector target 연결 확인. 이번 후속에서는 기기 화면 조작·native 외관 재검증·build/install/DB/commit/push/cleanup을 하지 않았다. 기존 APK와 QA 데이터 유지, PO 시각 확인 대기.
- HQA-01 탭 offset 공유, HQA-02 작은 체중 변화 정밀도는 여전히 OPEN이다. 글라스 적용을 기존 전체 디자인/기능 PASS로 확대하지 않는다. SOURCE_SCOPE_LOCAL_ONLY, STORE HOLD.

## 후속 변경: 계절 배경·중앙 빛·펫 문맥

- PO의 최신 요청으로 건강관리 전용 `HealthAmbientBackground`를 추가했다. Home의 실제 계절 팔레트를 사용하되 Home source·공용 glass opacity/blur는 변경하지 않는다. 구체·이미지 자산·애니메이션·타이머 없이 가장자리 4개의 작은 반짝이만 표시한다. 장식은 터치와 접근성 탐색에서 제외된다.
- 긴 중앙 흰 띠와 전체 흰 막은 폐기했다. 최종 중앙 빛은 left/right 43%, top 38%, height 24%, 최대 white alpha 0.22다. 세로 mask와 가로 gradient로 네 방향 경계를 흐리며 dark theme에는 밝은 base/중앙 빛을 넣지 않는다.
- 봄 우상단에서 분홍 wash가 옅어져 흰 바탕이 넓게 보이는 현상을 PO와 현재 화면에서 확인했다. 봄 light theme에만 기존 봄 wash의 첫 세 색을 우상단에서 중앙 방향으로 흘리는 opacity 0.55 tint를 추가했다. 다른 계절과 중앙 빛·glass는 바꾸지 않았다.
- 이름 옆에 기존 나이 계산과 저장된 세부종을 표시한다. 표시명 우선, legacy breed 보완, 일반 종명 제외, 결측 생략, 좁은 폭/큰 글꼴 줄바꿈이다. 현재 화면의 `누리 7살 · 말티즈`는 기존 펫 정보의 표시이며 agent가 profile을 저장하지 않았다.
- runtime 범위: 새 `src/components/health/HealthAmbientBackground.tsx`와 `src/screens/HealthReport/HealthReportScreen.tsx`. 테스트 `__tests__/healthRedesign.test.tsx`. 서비스/query/DB/native·Home·공용 glass는 변경하지 않았다.
- 최종 TypeScript PASS, 대상 ESLint 0 errors/0 warnings, 대상 2 suites/39 tests PASS, 전체 202 suites/2,108 tests PASS. 4계절 light/dark·중앙 빛 국소 크기·봄 전용 tint·나이/세부종·글꼴/기능/샘플 회귀를 확인했다.
- 중앙 mask 도입 직후 대상 테스트 13개가 React element prop의 순환 JSON 직렬화로 실패했다. native mask를 단순 문자열 host로 대체하던 mock을 mask/children을 실제 렌더하는 mock으로 바로잡았다. 앱 기대 동작을 완화하지 않았다. 이후 최종 대상/전체 테스트가 통과했다.
- 범위 내 diff check PASS. 전체 diff check의 기존 무관한 EOF 공백 두 건은 위 이력과 동일하며 건드리지 않았다. 원시 로그와 관찰: `/private/tmp/nuri-health-ambient-DcI2Xu/`. 작은 metadata: [ambient-followup.json](nuri-health-visual-review-2026-10-09-evidence/ambient-followup.json).
- Metro RUNNING·Galaxy 연결 유지. `spring-before.png`/`spring-after.png`는 PO가 열어 둔 같은 봄 기록 화면의 적용 전후다. Codex tap/swipe/설정 변경 없이 관찰했으며 확대 글꼴·키보드·탭 전체 native QA로 확대하지 않는다. 앞선 체중 화면 관찰도 같은 경계다.
- 추가 build/install/agent DB mutation/commit/push/cleanup 0. 기존 APK·unrelated dirty·증적 보존. HQA-01/02는 OPEN 유지. PO 시각 검토 대기, STORE HOLD.

## 후속 확장: 전체일정·전체메뉴·타임라인

- PO가 건강관리에서 확인한 배경을 세 화면에 적용하도록 요청했다. `HealthAmbientBackground`를 `src/components/common/SeasonalAmbientBackground.tsx`로 이동하고 건강관리와 세 화면에서 재사용한다. 배경 색상/반짝이/중앙 빛/봄 우상단 tint의 시각 값은 유지했다.
- 전체일정의 기존 `HomeAmbientBubbleCanvas`를 교체했다. 실제 전체메뉴 `MoreDrawerContent`의 고정 배경을 추가하고 앞을 덮던 내부 불투명 면만 제거했다. 타임라인은 로그인/guest root에 한 번씩 배치하며 상단 계절 원본 이미지와 흰 카드·통계·칩은 유지한다. 기존 어두운 글자/hero용 밝은 표면을 dark theme에서도 보존하기 위해 Timeline만 light appearance를 지정한다.
- 장식은 absolute/비상호작용/접근성 제외이며 스크롤 컨텐츠 밖에 둔다. SectionList/FlashList/ScrollView·offset·query·navigation·keyboard·모달 동작을 변경하지 않았다. Home/일정 작성·수정 등 폼 배경도 그대로다.
- runtime 7파일(이동한 공통 배경, HealthReport, ScheduleList와 style, MoreDrawerContent, TimelineScreen과 style), 테스트 5파일 범위. 최종 TypeScript PASS, ESLint 0 errors/기존 no-shadow 경고 7개. 대상 11 suites/162 tests, 후속 2 suites/31 tests PASS(서로 중복 포함). 전체 최종 202 suites/2,109 tests PASS.
- 첫 전체 테스트 1개 실패는 ScheduleList의 옛 `showDecorations={false}` 옵션을 검사하던 source guard였다. 새 공통 배경 사용·기존 구체 canvas와 Image 비사용·비상호작용 계약을 검사하도록 수정했다. 폼 배경·지출 계약 검사는 유지했다. 최종 전체 재실행 통과.
- Metro RUNNING·기존 Galaxy 개발 APK 유지. PO가 열어 둔 여름 전체일정 화면 `current-screen.png`만 수동 조작 없이 확인했다. 다른 화면/계절 native 전체 검증을 주장하지 않는다. 새 build/install/DB/commit/push/cleanup 0.
- PO 후속 지적: 전체일정 봄·겨울·여름에서 패널 경계가 잘 안 보인다. source의 일정 카드는 `rgba(255,255,255,0.52)`·white border 0.75인 일반 TouchableOpacity다. 건강관리의 실제 BlurView + 계절 tint 0.10과 다르다. 밝은 계절 base와 wash의 투명 중간 영역 때문에 명도 차이가 작아지는 원인이 확인됐다. 중앙 빛은 화면 폭 14%·높이 24%에 한정되므로 화면 전체의 패널 경계 부족을 그 빛만의 문제로 단정하지 않는다. 이 후속 질문에서는 원인 분석만 수행했으며 패널 소재를 자동 수정하지 않았다.
- 원시 로그/기준선: `/private/tmp/nuri-shared-ambient-6SsTuE/`. 작은 검증 metadata: [shared-ambient-followup.json](nuri-health-visual-review-2026-10-09-evidence/shared-ambient-followup.json). 공통 배경으로의 의도된 파일 이동은 손실이 아니며 그 외 보호 파일은 보존한다. HQA-01/02 OPEN, PO 시각 검토 대기, STORE HOLD.

## 후속 적용: 실제 목록 블러와 타임라인 통계 복구

- PO 추가 승인으로 전체일정 행과 타임라인 계절형 기록 행을 기존 `HomeFrostedGlass` 소재로 변경했다. 행의 터치 동작과 목록 가상화는 유지한다. 타임라인 통계는 요청대로 기존 흰색 65% 일반 패널로 복구했으며 최종 source에서 이전 HEAD와 차이가 없다.
- 타임라인 작성 버튼은 흰색 24dp `+`와 기존 48dp 버튼이다. Android 블러 캡처가 앞쪽 버튼까지 읽던 잔상은 버튼 전용 `NuriBlurCaptureExclusion` View로 배경 촬영에서만 제외했다. 정상 draw/touch는 유지하며 MainActivity, 키보드, 전역 inset은 변경하지 않았다.
- 승인된 개발용 증분 build/install-r 각 1회 완료. APK `d9a921c9e3b25657e9ab3124ed47300abd7567d992b043d90769e994424ed737`, signer·UID·최초 설치 시각·설정 유지. 처음 Metro bundle을 받지 못한 시작 상태는 연결과 동일 앱 재시작으로 해소했다. 데이터 초기화는 없다.
- 타입 PASS, 대상 lint 오류 0, 전체 203 suites/2,117 tests PASS. 원시 증적 `/private/tmp/nuri-list-blur-N9ENP2/`. 네 계절의 잔상 제거를 실기기에서 모두 재검증했다고 주장하지 않는다.

## 후속 적용: 전체 계절색과 흰 번짐의 실제 원인

- PO가 선택한 최종 방향은 Home·건강관리·전체일정·전체메뉴·타임라인의 바탕 전체를 계절색으로 채우고 중앙에만 짧고 옅은 흰 빛을 두는 것이다. 상단/가장자리의 넓은 흰 wash와 봄 전용 우상단 보정은 이 방식으로 대체됐다. 메뉴/목록 순서와 데이터는 유지한다.
- 밝은 배경은 `canvasGradient` 3색, 중앙 빛은 폭 14%·높이 24%·top 38%·최대 alpha 0.12다. Home의 중앙 빛 기준은 긴 스크롤 전체가 아닌 첫 viewport다. 어두운 테마와 폼 reading 모드의 기존 배경 계약은 유지한다.
- Home의 큰/중간 구체는 표시하지 않고 기존 작은 구체만 보조로 남겼다. 넓은 섹션 확산광도 제거했다. 반짝이는 정적이며 서비스 데이터·스크롤 경로와 분리돼 있다.
- Metro 화면을 새로 불러와도 남던 흰 번짐은 glint halo 이미지의 고유 192×192 크기가 원인이었다. absolute 좌표만 지정하고 width/height를 생략해 native Image가 원본 크기를 유지했고 작은 부모 밖으로 번졌다. halo에 실제 glint 크기를 명시하고 부모에서 넘침을 제한했다. 구체·원본 asset·공용 glass opacity를 임의로 낮추지 않았다.
- 회귀 테스트는 원본 이미지의 192dp 기본 크기를 합성해 수정 전 실패를 확인한 뒤, 4계절·360/384/430dp·Home/reading에서 22dp 이하 실제 크기와 clip을 검사했다. 타입/lint PASS, 대상 4 suites/114 tests와 최종 전체 203 suites/2,121 tests PASS. 원시 증적 `/private/tmp/nuri-season-canvas-qDWZoG/`.
- Codex는 PO가 연 화면만 관찰했다. 전체 경로 자동 UI QA·DB·추가 build/install·cleanup은 이 배경 단계에서 실행하지 않았다. 이후 가이드 확장과 Release 설치·커밋·푸시는 아래 최신 보고서로 분리한다.

## 최신 전달

- [가이드 계절 유리패널·Home 프로필 버튼·Release 전달 보고서](nuri-seasonal-guide-release-2026-10-09.md)가 최신 source/설치 상태다. 이 문서 앞부분의 개발 APK·미커밋·미설치 표기는 각 단계의 이력이다.
- HQA-01 탭 스크롤 위치와 HQA-02 작은 체중 증감 정밀도는 OPEN 유지한다. 이번 시각 후속을 기존 결함 수정이나 전역 키보드 재승인으로 확대하지 않는다.

PO 승인을 기다립니다.
