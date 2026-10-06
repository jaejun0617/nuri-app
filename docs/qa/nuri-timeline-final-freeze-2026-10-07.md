# NURI Timeline 최종 승인과 동결 보고서

## 승인 범위

PO의 "그래 1sp씩 올리고 최종승인까지 한다."를 최종 승인으로 기록한다. 이전 합의대로 임시 숫자 제거, 실제값 복귀, 검증과 설치, 선별 커밋·푸시, Timeline 동결 순서로 종료한다. Community·Auth·Weather·다른 화면과 데이터는 이번 closeout 대상이 아니다.

## 마지막 수정

| 항목 | 최종값 | 보존 항목 |
| --- | --- | --- |
| 월과 최신순 글자 | 13sp | lineHeight18sp, paddingHorizontal8dp, paddingVertical3dp |
| 카테고리 글자와 숫자 | 12sp | lineHeight17sp, paddingHorizontal8dp, paddingVertical4dp |
| 터치 영역 | 최소44dp | 자연 높이와 폰트 확대 처리 |
| 통계 glass | 흰색 불투명도65%, 투명도35% | 목표 XP #243042, 현재 XP 계절색 |

Header의 세 fontSize만 바뀌었음을 이전 파일과 역검증했다. Screen에서는 preview import·profile guard·파생 snapshot을 제거하고 `levelSummary`와 `totalSummary`를 Header에 직접 전달했다. 임시 preview 모듈과 전용 테스트는 삭제했으며 나머지 이전 Timeline 코드가 보존됐음을 확인했다.

## 실제 통계와 서버

- 실제 QA 누적 XP507, 원장 합계507, Lv4/floor450/next700. Timeline canonical 전체 기록11이며 원본 memories16 중 health5는 기존 제외 계약이다.
- Progress는 `(507−450)/(700−450)`의22.8%, 표시23%다. 임시670/1,111은 제거됐다. DB 값을507/11로 강제 reset한 것이 아니라 최신 실제 요약 연결로 복귀했다.
- Linked project grmekesqoydylqmyvfke에서 읽기 전용으로 확인했다. 이번 DDL/DML/RPC payout·XP backfill·콘텐츠 생성/삭제·QA100 수정은0이다.
- 이전에 반영된 migration20261006220017와 펫별 KST shared walk3·계정 기본 활동150XP 계약은 유지한다. 이 migration·정책·롤백 QA 자료를 승인 소스에 포함하되 재적용하지 않는다.
- Closeout 전후 public18영역·Storage1영역·Auth1영역 count/hash, RLS/policy, public263함수 정의 MATCH. QA 게시글100개 보존. 직전 후보의 Auth hash변동 이력과 이번20영역 MATCH를 혼동하지 않는다.

## 검증

- TypeScript PASS,6.442초.
- Targeted ESLint0 errors, 새issue0, 기존 ControlsBar no-shadow warning1.
- Targeted20 suites/375 tests PASS,8.233초. Full183 suites/1,860 tests PASS,29.072초.
- 네 계절의 실제507/11/23%·글자13/12sp·padding/44dp 계약, preview 제거·직접 props 연결을 추가 검증했다. 기존 월/필터/날짜/펫 이름/Progress 회귀 테스트도 통과했다.
- Git diff check와 승인 파일 등록 후 source guard PASS(relative import·secret guard). 등록 전 검사는 미등록 새 import4개를 지적했으며 실제 index 등록으로 해결했다. 원격 CI 최종 결과는 아래 증적이 소유한다.

## 최종 설치본

- 증분 Release1회 PASS,217.525초.995tasks:61executed,934up-to-date. Clean·Metro·Fast Refresh 없음.
- Galaxy S24 install-r1회 PASS,15.430초. SM-S937N/R5CY613NMSY, UID10402와 최초설치2026-06-02 19:16:57,1080×2340/450dpi/fontScale1.0 유지.
- APK: `/private/tmp/nuri-timeline-final-freeze-20261007-074201/nuri-timeline-seasonal-qa-24b21ea0.apk`,282,006,740bytes.
- SHA256: `24b21ea0dfc47d483d47424d0a37e4049a530d7fa971f274ba0c828c22efeb2c`.
- Source/private-input/signer/installed hash, 네 원본1774×887 decoded pixels MATCH.
- 최신 지시는 PO 직접 화면 확인이다. 이번 agent 앱 실행·터치·캡처·설정변경은0이며 FATAL/ANR/RN_FATAL 새 native 측정은 미실행이다. 설치 확인을 렌더 QA로 확대하지 않는다.

## Git과 보존

- 시작 HEAD bf8a7a578ae16d869afbadd3c1810c521592b260, 기존 codex/task6-community-content-policy 브랜치를 유지한다.
- 승인 대상31파일: Timeline runtime8, 이미지4, 테스트5, SQL2, 기획1, 공유문서6, Timeline 보고서5. 임시 preview는 승인 커밋에 포함하지 않는다.
- 공유문서는 HEAD 본문에 새 Timeline 블록만 선별해 index에 넣는다. Home·Weather·저장공간·과거 unrelated dirty 본문과 파일은 변경하거나 커밋하지 않는다.
- 최종 commit SHA·origin 일치·ahead/behind·CI·staged NONE·파일보존·디스크 전후는 `/private/tmp/nuri-timeline-final-freeze-20261007-074201/FINAL_REPORT.md` 및 git-closeout.json,ci-final.json,preservation.json을 따른다. 자체 commit SHA를 같은 commit의 문서에 예측해 넣지 않는다.
- Android build/.cxx/.gradle·Gradle cache·현재와 이전 APK·QA 증적·QA100 유지. CLEANUP:NO. 이번 설치본은 디자인 검토용이며 기존 무관한 로컬 산출물을 포함한 clean Store RC로 분류하지 않는다.

## 종료 경계

TIMELINE_DESIGN: COMPLETE_FROZEN_BY_PO_APPROVAL.

TEMPORARY_REVIEW_NUMBERS: REMOVED.

ACTUAL_STATISTICS: CONNECTED_WITHOUT_DB_RESET.

STORE: HOLD. AUTO_START_NEXT_WORK: NO.

기존 지정색 일부의 작은 글자 대비, 확대 글꼴과 다른 기기의 native matrix, 앱 저장을 통한 영구 XP 누적, 다중 세션 부하는 미검증 경계로 남긴다. 디자인 동결은 이 운영 검증이나 Store 승인을 대신하지 않는다. 다음 액션은 PO의 다음 디자인 지시 대기 하나다.

다음 디자인 지시를 기다립니다.
