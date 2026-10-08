# Community 사진과 댓글 보완 보고서

2026-10-09 KST. 최신 커뮤니티 보완 PO 최종 승인 완료. 아래 검증 대기 표기는 승인 이전 단계의 이력이다.

## PO 최종 승인 및 종료

- PO 직접 메시지: 최신 보완 최종 승인 및 Metro 종료 요청. FINAL_APPROVED.
- NURI cwd의 RN CLI start PID 9416을 확인하고 SIGTERM으로 정상 종료. 이후 PID와 8081 listener 부재 확인. METRO OFF.
- source/build/install/ADB/DB/commit/push/cleanup 추가 없음. 기존 개발 APK 및 evidence 보존. 최신 JS의 Release 내장 또는 새 Codex native 검증은 수행하지 않았다.
- STORE HOLD. MASTER_STATE: STOPPED_WAITING_FOR_NEXT_PO_INSTRUCTION.

## 최종 소규모 보완: 전송 위 화살표

- 댓글/인라인 답글 공통 composer의 전송 문구를 기존 CtaIcon의 arrow-up 22dp로 교체했다. 기존 44dp 버튼·neutral palette·전송 접근성 label·loading/disabled/submit/draft 계약은 변경하지 않았다.
- 타입/lint·대상 3 suites/50 tests PASS. native Feather 위 화살표, 전송 중 상태, 중복 submit 방어, 오류 draft 유지 회귀 검사 포함. 전체 suite는 재실행하지 않았다. 초기 타입 검사가 helper에서 받지 않는 preserveOriginal prop을 검출하여 제거했으며, 기존 arrow-up native 유지 계약으로 같은 glyph를 검증했다.
- 로그는 `/private/tmp/nuri-preview-reply-toggle-LntoNe/send-arrow-*-final.log`. 새 build/install/DB/기기 조작/commit/push 없음. PO native 화면 확인 대기다.

## 후속 정정: 답글 접기와 댓글 총수 진입

- PO가 동작 변경을 명시했으므로 아래 이전 원인 확인의 navigation 유지 결정을 대체한다. 본문 `답글 N`은 해당 답글을 제자리에서 접고 펼친다. 오른쪽 이동 Chevron 대신 펼침 상태에 맞는 위/아래 Chevron과 접근성 expanded 상태를 제공한다.
- 본문의 댓글 총수는 14/22sp로 축소하고 오른쪽 Chevron을 붙였다. 전체 48dp 터치 영역이 댓글 전용 화면으로 이동한다. 댓글 총수 아래 구분선은 위쪽으로 이동했다. 댓글 화면 상단의 댓글(총수)는 변경하지 않았다.
- preview 10개 한도, 서버 조회, count, 인라인 작성, 실패 draft, 삭제/신고 계약은 유지한다. 접기 후 다시 답글쓰기를 눌렀을 때 draft 복원과 화면 이동 0을 로컬 렌더 테스트로 확인했다. preview 밖의 reply를 추가 조회하거나 전체 cache에서 끌어오지 않는다.
- 타입/lint PASS, 대상 6 suites/84 tests PASS. 첫 실행에서는 테스트가 Text의 배열 children을 문자열로 비교한 오류가 있었으며 실제 텍스트 검사로 수정했다. 추가 remote/DB/build/install/device/commit/push 변경 0. Metro running, 실제 화면은 PO 검증 대기다.
- 최종 전체 1회: 200 suites/2,069 tests PASS. 후속 로그: `/private/tmp/nuri-preview-reply-toggle-LntoNe/`, [보존·검증 자료](nuri-community-media-comments-2026-10-09-evidence/reply-toggle-verification.json). 아래 2,068 전체 테스트와 remote 자료는 직전 후보의 이력이다.

## 구현

| 요청 | 확인한 원인 | 이번 변경 |
| --- | --- | --- |
| 사진 전체 보기 | 260dp 고정 높이와 cover crop | PostImageGallery: 디코딩 width/height 비율, parent 폭, contain, 첨부 순서대로 세로 배치. 로딩/오류/재시도 제공 |
| 본문 먼저 | 사진이 본문 앞에 렌더됨 | 제목·작성자 다음 본문, 사진, 행동 영역 순서 |
| 댓글 행동 | 좋아요 label에 count가 붙고 명시적인 답글쓰기 없음 | 답글쓰기 → 좋아요 → 하트 → count → 삭제/신고. 마지막 PO 지시대로 모두 삭제와 같은 12/18sp, 48dp 터치 영역 유지 |
| 댓글 두 개인데 1개 더보기 | v1은 root 3개만, reply 제외 | v2에서 root+reply 합계 최대 10개. total-previewCount로 남은 수 계산, 10개 이하 더보기 비노출 |
| 실제 흰색 + | NuriSemanticIcon의 custom glyph 치환은 color를 넘기지 않음 | 해당 FAB만 preserveOriginal native Feather plus/#FFFFFF 사용, 계절 버튼 배경 보존 |
| 댓글 5와 등록순 정렬 | 서로 다른 lineHeight와 Android font padding | 공통 26sp line box, includeFontPadding false, 48dp 양쪽 중앙 정렬 |
| 후속 헤더·댓글·답글 배치 | 댓글 숫자가 분리되고 목록 위계가 약함 | 댓글 화면 상단 중앙 댓글(총수), 우측 본문 가기, 목록 위 우측 정렬만 유지. 중립 회색 말풍선, root 28dp/reply 20dp avatar, 답글 들여쓰기 56dp, 글쓴이 outlined badge. root/reply 구분선 대신 thread 간격 사용 |

본문/댓글 중립색, 읽은 게시글 보라색, 등록 CTA 계절색, 인라인 답글 composer/키보드 제어/작성·삭제 API/권한은 유지했다. 사진 표시 수정은 업로드 압축이나 원본 파일 해상도 복원이 아니다.

## 서버

- 승인 범위: `community_get_comment_summary_v2(uuid)` 신규 읽기 함수 한 개. `20261008183526_community_ten_comment_preview.sql` local/remote 이력 일치.
- `STABLE SECURITY INVOKER`, 고정 search_path, 기존 parent visibility helper/comments RLS, active/non-deleted parent 및 reply 필터 유지. PUBLIC execute revoke, 기존 API 역할 grant와 동일.
- root 등록순, 해당 root의 reply 등록순으로 총 10개. 부모 없이 잘린 reply가 나오지 않는다. 전체 댓글 화면의 더 큰 reply cache가 preview에 섞이지 않는다.
- 공개 역할 읽기 검증: 댓글 없는 글 30건 및 댓글 보유 글 4건. 후자는 total 2/5/3/6에 preview 2/5/3/6, 기존 summary와 total/revision 동일. root 1+reply 1이 둘 다 반환된다. 본문/개인정보는 저장하지 않았다.
- 없는 post는 42501로 거절. 실제 10개 초과 데이터 생성은 하지 않았으며 경계값은 로컬 0/1/2/10/11/100 응답 테스트와 SQL limit 검사로 검증했다.
- 기존 관련 함수 27개 definition/ACL 및 전체 RLS policy hash 동일. v1/threads/replies/write/moderation 변경 0, 사용자 row mutation 0.
- 새 함수 관련 advisor finding 없음. 기존 RLS 무정책 11, definer view 1, mutable search_path 24, public extensions 3, anon definer 62, authenticated definer 111, leaked-password 1은 이번 작업 밖이다. 프로젝트 전체 보안 PASS로 해석하지 않는다. [Supabase advisor 기준](https://supabase.com/docs/guides/database/database-linter).

## 검증

| 검사 | 결과 |
| --- | --- |
| TypeScript | PASS |
| 수정 TS/TSX 17개 lint | 오류 0, 경고 0 |
| 대상 테스트 | 최신 배치에서 8 suites / 157 tests PASS |
| 전체 테스트 | 최신 배치에서 200 suites / 2,068 tests PASS. 이 작업 누적 2회 실행: 이전 배치 2,065 및 최종 2,068 모두 PASS |
| scoped diff check | PASS |
| global diff check | 기존 다른 작업 EOF 공백 2건 유지 |
| native 화면 QA | PO 직접 검증 대기 |

초기 대상 실행의 실패는 memo component 탐색 방식/테스트 환경 fontScale 예상값 오류였으며 실제 Text/native icon 검사로 교정했다. 초기 타입 검사는 RN에서 제거된 absoluteFillObject를 검출해 현재 absoluteFill API로 수정 후 통과했다. 후속 배치 변경에서는 예전 답글 화살표를 강제하던 source 검사를 avatar와 기존 inline composer/handler 검사로 변경했고, 키보드 회귀 검사는 유지했다.

최종 전체 테스트 이후 production source 변경은 없다. PO의 추가 경로 확인 요청으로 기존 테스트에 본문 reply tap과 답글 개수 tap을 구분하는 assertion을 추가했고, 해당 suite 23 tests와 lint를 재실행해 통과했다.

## 추가 확인: 본문 답글의 화면 이동

- `CommunityDiscussionContent.handleToggleReplies`는 post mode에서 `openComments(commentId)` 후 return한다. 따라서 본문의 `답글 N`은 제자리 펼치기가 아니라 전체 댓글 화면의 해당 thread로 이동한다. 이번 스타일 변경에서 새로 만든 이동은 아니다.
- 답글 내용/`답글쓰기`는 `handlePressComment`로 같은 화면의 인라인 composer를 선택한다. 추가 로컬 테스트에서 화면 이동 0과 답글 입력 존재를 확인했다. 총수/댓글 더보기/작성 중인 답글 이어쓰기는 별도 전체 화면 이동 진입점이다.
- UX 권장: `답글 N`은 제자리 펼치기로 의미를 분리하고, 전체 화면 이동은 총수/댓글 더보기로 한정한다. 이번 추가 요청은 원인 확인이므로 이 navigation 동작은 변경하지 않았다. 실제 PO가 누른 영역은 기기 재조작 없이 단정하지 않는다.

기존 global diff 경고: `docs/qa/nuri-glass-expenses-2026-10-08-evidence/eslint.log:34`, `supabase/migrations/20261007074134_community_search_and_write_error_contract.sql:298`. unrelated dirty를 보존했다.

## 실행 상태

- 이번 BUILD 0, INSTALL 0, tap/swipe/화면 이동 0, COMMIT NO, PUSH NO, cache/artifact cleanup 0. PO 요청으로 현재 열린 외부 앱 화면을 읽기 전용 캡처 1회 관찰했다. 임시 캡처는 즉시 삭제했으며 외부 사용자 내용/이미지를 증거에 보존하지 않았다.
- 이전 debug APK `b131d108d328a0dce1b27ba16ea658be15c7c9756e01cc6ed6974766c7892876`는 그대로다. 이번 JS 변경을 APK 내장 bundle에 새로 포함하지 않았다.
- Metro `127.0.0.1:8081/status` running. 최종 `/json/list`는 `[]`이므로 현재 기기 연결/새 JS 수신은 미확인이다. Fast Refresh 설정은 변경하지 않았다.
- evidence: [보존/검증 자료](nuri-community-media-comments-2026-10-09-evidence/verification.json). 작업 중 원본 로그 `/private/tmp/nuri-community-media-comments-7zzDdg/` 유지.

## PO 확인

앱을 열어 Metro 변경을 받은 뒤 상단 댓글(총수)/본문 가기, 회색 말풍선·답글 들여쓰기, 인라인 입력과 등록순 변경을 확인한다. 본문이 사진보다 먼저 보이는지, 세로/가로 사진의 끝이 잘리지 않는지, 댓글 2개 모두 표시되는지도 확인한다. 이어서 답글쓰기·좋아요·하트·숫자 크기와 흰색 +를 확인한다. 실기기 확인 없이 native 정렬·성능 PASS를 선언하지 않는다.

STORE: HOLD

DEVICE_OWNER: PO

MASTER_STATE: STOPPED_WAITING_FOR_NEXT_PO_INSTRUCTION

PO 최종 승인 완료. 다음 지시를 기다립니다.
