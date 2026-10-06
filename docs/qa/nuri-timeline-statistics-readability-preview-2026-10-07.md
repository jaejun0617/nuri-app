# NURI Timeline Statistics Readability + Temporary Review Report

## 1. Scope And Decision

- 최신 PO 결정: 임의 DB XP 조정 대신 670 XP·1,111개 기록을 현재 QA 계정의 화면 표시로만 검토한다. 실제 게시글·기록·보상 원장을 생성하거나 수정하지 않는다.
- UI corrective: 흰색 glass 불투명도50%→65%(투명도35%), 목표 XP 글자 #748096→#243042, 월/정렬 칩 paddingVertical2→3dp. 현재 XP 계절색·글자 크기·44dp touch·hero 위치·우측 심볼 제거·기존 자연 높이는 보존한다.
- Primary ownership: Timeline. Supabase는 실제값·보존 read-only 확인, Release는 이번 후보 build/install만 순차 진행했다. 다른 write room·background 작업 없음.
- 위험도: 실제 UI 수정은 낮음, 임시 표시가 승인 커밋에 남는 위험은 별도로 관리한다. 이번 후보는 Store RC가 아니며 승인 closeout 전에 preview 파일/연결을 반드시 제거한다.

## 2. Implementation

- `src/screens/Records/TimelineSeasonalHeader.tsx`: 위 세 가지 스타일만 보완했다. 패널을 어두운 tint로 바꾸지 않고 white opacity를 올려 원본 계절 분위기와 현재 XP의 고유 색을 보존했다.
- `src/screens/Records/timelineStatisticsReviewPreview.ts`: 이번 미커밋 후보 전용 derived snapshot이다. enabled·로그인·profile sync ready·고정 QA nickname kakaoQA·실제507/Lv4/floor450/next700·기록11 일치 시에만 표시한다. 로딩/오류·다른 사용자·실제값 변경은 원본을 그대로 통과시킨다. nickname guard는 시각 QA 범위 제한이며 인증·권한 경로가 아니다.
- `src/screens/Records/TimelineScreen.tsx`: header의 level/summary props에만 snapshot을 전달한다. 실제 levelSummary/totalSummary·recordStore·목록·필터·카테고리 카운트·다른 화면은 변경하지 않는다. 이전 dirty 내용은 이번 연결을 제외한 hash 역검증으로 MATCH다.
- tests: seasonal target text/65%/3dp, 507→670 Progress, preview guard·원본 비변경·네 계절 표시·off 복귀·list/store/DB 미연결을 검증한다.

## 3. Actual Data And Preview

| 항목 | 실제 source | PO 후보 표시 |
| --- | ---: | ---: |
| 누적 XP | 507 | 670 |
| 레벨 | 4 | 4 |
| 현재/다음 레벨 기준 | 450 / 700 | 450 / 700 |
| 레벨 내 Progress | 23% 반올림 | 88% |
| Timeline 전체 기록 | 11 | 1,111 |

- Progress는 누적 XP/700이 아니라 `(totalXp−450)/(700−450)`이다. 507은22.8%,670은88%이며 길이를 임의로95.7%까지 늘리지 않았다.
- 실제 remote summary RPC는507/Lv4/450/700, 원장 합계도507이다. SQL transaction-local claim으로 read-only RPC를 확인했으며 실제 앱 JWT 지급 검증으로 확대하지 않는다.
- 현재 QA memories16건 중 health5건을 기존 canonical Timeline universe에서 제외하므로 전체11건이다. 이 계산과 실제 기록·필터 카운트는 유지한다. 통계1,111과 chip11이 다른 것은 이번 overflow 검토용 표시이며 제품 데이터가 아니다.
- QA synthetic display670은 실제 XP 지급·DB670 반영을 증명하지 않는다. 실제 XP→Progress 지급 경로 검증은 직전 보고서의 rollback RPC 증적과 이번 local renderer 검증으로 구분한다.
- DB_MUTATION: NONE. XP reset/backfill·기록 생성/삭제·QA100 변경·RPC/migration/RLS/Storage 변경 없음.

## 4. Contrast And Layout Boundary

- 원본 네 PNG의 패널 overlap 영역을 보수적으로 sRGB 합성해 목표 XP #243042 대비를 계산했다. 가을6.16,겨울7.23,봄7.14,여름5.46 이상이다. white alpha65%+검정 배경 최저 모델도5.456:1이다.
- 이것은 로컬 합성 분석이지 Galaxy S24 실제 glyph·안티앨리어싱·glass 합성 PASS가 아니다. native 가독성과1,111 숫자가 왼쪽 XP를 압박하는 외형은 PO 직접 확인 대상이다.
- 월/정렬 visible face만 상하 각1dp 늘렸고 전체 height 증가는2dp다. 실제 최소44dp 터치와 자연 높이/폰트 확대 stack 구조 유지.
- 고유 current XP·선택 칩 palette는 변경하지 않았다. 기존 겨울 XP 및 일부 선택 칩의 작은 글자 대비 경계를 이번 목표 XP 개선으로 전체 AA PASS라고 보고하지 않는다.

## 5. Validation

- TYPESCRIPT: PASS.
- TARGETED_ESLINT: 0 errors, 기존 ControlsBar no-shadow warning1, 새 issue0.
- TARGETED_TEST: 20 suites /383 tests PASS.
- FULL_SUITE: 183 suites /1,868 tests PASS,29.770초.
- GIT_DIFF_CHECK: PASS.
- 원본 네 hero PNG1774×887 source hash MATCH, APK lossless recompression 후 decoded pixel MATCH.
- 기존 unrelated source/asset/docs dirty는 baseline hash로 보호한다. 통계/header와 Timeline의 이전 dirty도 이번 delta를 역변환했을 때 baseline hash MATCH다.
- remote: public18개+Storage1개 영역 count/hash MATCH,QA batch100 유지,RLS/policies 및 public263함수 정의 MATCH. XP·records·profiles·pets·schedules·원본 커뮤니티 데이터 유지.
- Auth users는56건 그대로지만 전체 행 hash는 변했다. target QA updated_at이 작업 중 갱신된 사실을 확인했다. baseline의 컬럼별 snapshot이 없어 원인 컬럼 전체는 미확인이다. agent의 로그인/로그아웃/계정 수정/Auth DML은0이며 Auth 데이터 전체 불변 PASS로 확대하지 않는다.

## 6. Release And Device

- INCREMENTAL_RELEASE: PASS,1회,212.177초.995 actionable tasks:61 executed,934 up-to-date. clean/Metro/Fast Refresh 없음.
- GALAXY_S24_INSTALL: PASS,adb install-r1회,15.577초. SM-S937N/R5CY613NMSY.
- APK: `/private/tmp/nuri-timeline-statistics-readability-20261007-072147/nuri-timeline-seasonal-qa-f6577720.apk`,282,007,608bytes.
- SHA256: `f6577720a8192612fd0c46c41a0aa082dc641c3e6a33622f04324bec8beb6bb5`.
- source/input/signer·installed APK hash MATCH. UID10402·first install2026-06-02 19:16:57·1080×2340/450dpi/fontScale1.0 유지.
- PO 최신 답변대로 app launch/touch/capture·기기 설정 변경0회. 실제 렌더/잘림/겹침·FATAL/ANR/RN_FATAL은 이번 native 실행 미측정이며 설치 확인과 구분한다.

## 7. Preservation And Documentation

- HEAD: `bf8a7a578ae16d869afbadd3c1810c521592b260`, branch `codex/task6-community-content-policy`, 기존 HEAD 유지.
- STAGED: NONE. COMMIT/PUSH/FREEZE: NO, 승인 대기. Community/Auth/Weather 동결 source·다른 기능/개인화·QA100 보존.
- BUILD_OUTPUTS/CACHE/EVIDENCE: PRESERVED. CLEANUP: NO. disk free 시작24.87GiB,종료 약23.74GiB.
- project-memory 네 문서·리서치·release-checklist에 이번 후보/QA 임시 표시 제거 gate를 추가한다. 이전 문서 body·기획/정책/SQL·과거 QA 보고서는 유지한다.
- Evidence: `/private/tmp/nuri-timeline-statistics-readability-20261007-072147`의 baseline,contrast,review-contract,qa-source-read,remote-before/after/postinstall,auth-boundary,tests,build,install,closure,FINAL_REPORT.

## 8. Approval Closeout

1. 지금 다음1개: PO가 설치 후보의 목표 XP 가독성·칩 여백·88% Progress·1,111개 통계 폭을 직접 검토한다.
2. PO 최종 승인 후에만 preview 파일·screen 연결·임시 테스트를 제거하고 최신 실제 XP/기록을 재조회해 표시한다. 현재 원본은507/11이며 검토 중 실제 활동이 추가됐다면 이를 옛 숫자로 덮어쓰지 않는다.
3. 실제값 후보 재검증·설치 확인 후 승인 Timeline 범위만 selective commit/push하고 동결한다. 현재 승인이나 Store 승인을 선행해 처리하지 않는다.

TIMELINE_STATS_READABILITY: IMPLEMENTED_INSTALLED_PENDING_PO_APPROVAL.
TEMPORARY_REVIEW_NUMBERS: ENABLED_CURRENT_QA_DISPLAY_ONLY.
ACTUAL_XP_AND_RECORDS: PRESERVED.
STORE: HOLD.
AUTO_START_NEXT_WORK: NO.
MASTER_STATE: STOPPED_WAITING_FOR_PO_TIMELINE_REVIEW.

PO 승인을 기다립니다.
