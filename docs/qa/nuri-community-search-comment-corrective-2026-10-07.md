# NURI Community Search And Comment Corrective

기준일: 2026-10-07 KST. STATUS: IMPLEMENTED_PENDING_PO_APPROVAL. STORE: HOLD.

## 범위와 승인

- Community 제목·본문 검색, 상세 더보기, 댓글·답글 입력 및 키보드 대응이 primary scope다. Home 작은 하트·펫 이름 CTA와 추억 상세 분류 아이콘 제거는 명시된 supporting scope다.
- 마지막 추가 지시로 관련 추억의 분류 칩 아이콘도 제거하고 제목을 `함께 쌓아온 추억`으로 변경했다. 사진 없는 기록의 대체 썸네일 아이콘은 유지했다.
- 별도 질문 응답으로 읽기 전용 검색 RPC와 서버 오류 전달의 NULL 처리만 승인받아 반영했다. 댓글 중복·횟수 제한, moderation, RLS, 기존 목록과 댓글 쓰기 함수는 변경하지 않았다.
- 최초 후보와 각각 승인된 추가 corrective를 합쳐 incremental Release build 4회, `adb install -r` 4회다. clean build, uninstall, clear data, logout, settings 변경, cleanup, commit, push, staging은 하지 않았다.

## 원인과 최소 수정

### 댓글 서버 오류

`raise_community_write_error`가 HINT에 NULL을 전달하면 PostgreSQL 오류 `22004`가 원래 제한 오류를 덮었다. 실제 재현 후 `hint = coalesce(p_hint, '')` 한 곳만 수정했다. 이후 `P0001`과 `app_code`가 정상 전달된다. 중복 제한과 moderation을 완화한 것이 아니다.

앱은 동기 submit 잠금으로 연속 전송을 차단한다. 실패해도 draft를 유지하고 입력·재시도를 다시 허용한다. 실제 동일 댓글 제한 후 draft 유지와 내용 수정 후 정상 등록을 확인했다.

### 키보드와 첫 답글

최초 후보에서 root composer가 키보드에 가려졌다. Community root의 predicted keyboard-height 의존을 제거하고 실제 viewport 차이를 계산하는 단일 KeyboardAvoidingView 소유권으로 보완했다. 중복 하단 여백을 제거했다.

추가 후보에서는 처음 펼친 inline reply가 보이지 않았고 다른 대상을 연 뒤에는 나타났다. 댓글 FlatList의 화면 밖 clipping을 초기 mount부터 끄고 실제 입력 영역을 측정해 최소 scroll reveal만 수행했다. 기존 window/batch virtualization 값은 유지한다. native clipping 내부 전체 원인을 단정하지 않으며, 해당 경로의 보완과 실제 회귀 결과를 구분한다.

입력창은 최소 44dp, `textAlignVertical: center`, font padding 제외, 작은 세로 padding이다. 댓글 삭제는 실제 44dp 터치를 유지하면서 작은 글자·시각적 padding으로 줄였다. 메뉴·신고·정렬·삭제 확인 진입 시 키보드를 정리한다.

### 검색과 화면

- 검색어는 trim, 최대 100자, 제목 OR 본문 literal substring이다. `%`와 `_`를 SQL wildcard로 해석하지 않는다. 서버 bind parameter를 사용한다.
- 검색어가 없으면 기존 `community_list_posts_v3`를 그대로 사용한다. 검색은 query-bound cursor와 별도 cache key를 사용해 다른 검색어의 페이지가 섞이지 않게 했다. 필터·정렬·페이지 크기·복귀 snapshot을 유지한다.
- `community_search_posts_v1`은 기존 공개 목록의 삭제·차단·탈퇴·banned 작성자 제외 조건과 공개 projection을 재사용한다. STABLE, SECURITY DEFINER, fixed search_path의 읽기 전용 함수다.
- Community 더보기는 추억 상세와 같은 compact 44dp 점 메뉴, Timeline-specific 계절색을 사용한다. 수정하기·삭제하기 아이콘은 없으며 삭제하기는 빨강/흰색이다. 별도 최종 삭제 확인은 유지한다.
- Home 브랜드 옆 작은 하트는 기존 12 크기·위치 그대로다. CTA는 실제 펫 이름의 `더 알아보기`와 화살표·계절색이다.
- 추억 상세의 상단과 관련 목록 분류 칩은 text-only다. 사진 원본 비율, 5개씩 추가 조회, 기존 layout 및 썸네일 대체 아이콘은 유지한다.

## Local 검증

| 항목 | 결과 |
| --- | --- |
| TypeScript | PASS |
| 변경 source/test ESLint | 19파일, 오류 0, 기존 Home no-shadow 경고 16 |
| 전체 Jest | 188 suites, 1,917 tests PASS |
| 최종 상세·댓글 targeted | 2 suites, 15 tests PASS |
| 검색·cache·filter·cursor 회귀 | 최종 전체 suite에 포함, PASS |
| git diff --check | PASS |
| 마지막 build input | 682 inputs, build 전후 변경 0 |

추억 상세의 새 테스트는 memo component 타입 조회 대신 실제 prop 경계를 검증하도록 정정한 뒤 targeted와 전체 suite를 재실행했다. 최초 실패 로그도 temp evidence에 보존한다. 앱 동작 우회는 추가하지 않았다.

## Remote 검증

Linked project: `grmekesqoydylqmyvfke`. 다른 프로젝트 쓰기 없음.

Migration: `20261007074134_community_search_and_write_error_contract.sql`. repo migration과 canonical SQL mirror를 함께 반영했고 remote 적용을 확인했다.

기존 함수 definition hash는 유지됐다:

| 함수 | definition hash |
| --- | --- |
| community_list_posts_v3 | eb14246e0b2ad3896d772598c5a12e67 |
| community_create_comment_v1 | d8dac41517bf23365069e03ac05bfbc0 |
| guard_community_comment_insert | d292ef27488b78e43afca5396d13c4ad |

NULL HINT 오류 전달 PASS, 다른 query의 cursor 거절 PASS. QA title marker 및 본문 QA_BATCH 검색 PASS. 30개 기준 4페이지·100 rows·100 distinct·expected 100으로 누락·중복 없음. 현재 `강아지` 검색은 해당 substring을 가진 공개 행이 없어 0건이며, 없는 결과를 합성하지 않았다.

Security advisor는 기존 211개에서 213개로 2 WARN 증가했다. 새 public read RPC의 anon/authenticated SECURITY DEFINER 실행 권한 경고다. 기존 public feed와 같은 의도적 권한·visibility·projection·fixed search_path를 적용했다. 경고가 해소됐다고 주장하지 않으며 production-volume 성능 검증과 출시 보안 재검토는 별도다.

## Native 검증과 설치본

사용자가 Galaxy S24로 부르는 연결 기기의 실제 model은 `SM-S937N`이다. 기본 384dp·fontScale 1.0에서만 검증했고 설정을 바꾸지 않았다.

| 시나리오 | 실제 결과 |
| --- | --- |
| 제목·본문 검색, 검색 2페이지, empty 결과 | PASS |
| 검색 카테고리·표시 개수 변경 후 30개 복귀 | PASS |
| 실제 root 댓글 2개·reply 1개 등록 | PASS, 검토용 보존 |
| 중복 제한 시 draft 유지·수정 후 재시도 | PASS |
| root·reply-to-reply 키보드 | v3 PASS |
| fresh mount 첫 inline reply | v3 2회 PASS, 최종 v4 PASS |
| own-post 더보기, 신고 입력 키보드 | v3 PASS, 수정·삭제·신고 실행하지 않음 |
| compact 댓글 삭제 확인 | v3 PASS, 취소·데이터 삭제 없음 |
| Home 하트·펫 이름 CTA | PASS |
| `함께 쌓아온 추억`, main/related text-only 칩 | 최종 v4 PASS |
| 사진 없는 기록 대체 썸네일 | 최종 v4 PASS |
| 따뜻한 footer 중앙 문구·오른쪽 화살표·흰색 X | v3 및 최종 v4 PASS |

최종 inline 입력창 bounds: `[65,1168][882,1293]`, keyboard top 1395px. 하단 간격 36.27dp, 실제 입력 높이 44.44dp로 가림 없음. 화면은 가을·전체·전체 카테고리·page 1·30개·검색 닫힘·draft 없음으로 복귀했다.

최종 APK: `/private/tmp/nuri-community-search-comment-20261007-162703/nuri-community-search-comment-v4-e30a433d.apk`.

SHA-256: `e30a433dbb445b02b37fd89f74cf580ff786073f7967229b278a0d7ce5a00f1d`.

실기기 base.apk SHA 일치. 승인 signer 일치, embedded JS bundle YES, debuggable false, cleartext false, Metro 의존 없음. 마지막 incremental build 2분 17초, 932 tasks 중 61 executed·871 up-to-date.

초기 `9783f894`, 두 번째 `2289d176`, 세 번째 `a3a030d9` 및 기존 rollback APK는 모두 보존했다. 전체 working tree는 기존 dirty이므로 clean-RC preflight의 dirty 거절을 우회하지 않았다. 명시 승인된 **DIRTY_QA_NOT_STORE_RC** 후보이며 Store RC가 아니다.

## 데이터와 Git 보호

- QA 100건 유지. 새 댓글 2개·답글 1개만 정상 QA 계정으로 생성했고 ID manifest는 private temp root에 저장했다. 기존 게시글·댓글 삭제, Storage upload, QA 기록 생성, 좋아요·신고·차단 생성은 이번에 없다.
- profiles 56, pets 15, memories 66, pet_schedules 13, storage.objects 79 및 게시글 content 884의 before/after digest가 같다. 게시글 비교는 정상 서버 동작인 `view_count`, `comment_count`, `updated_at`을 제외한다. 이 세 필드까지 불변이라고 주장하지 않는다.
- 댓글 수는 351에서 354로 정확히 승인된 3개 증가했다.
- Auth 계정 수 56, 신규 계정 0, Auth admin mutation 0. whole-row digest는 QA 계정 1행에서 달라졌다. 정확한 변경 column은 baseline row snapshot이 없어 미확인이다. 따라서 Auth 전체 row 불변으로 보고하지 않는다.
- HEAD `26891aaed1fbee37141ecbd89e4d4c18970b4a1d`, branch `codex/task6-community-content-policy`, staged NONE. commit/push 없음. 기존 documentation/storage dirty·CLI temp dirty·untracked assets·cache·서명·이전 증적은 보존했다.

## 증적과 남은 경계

큰 media/APK는 repo에 복제하지 않았다. [작은 metadata manifest](nuri-community-search-comment-2026-10-07-evidence/manifest.json), [remote audit](nuri-community-search-comment-2026-10-07-evidence/remote-audit-summary.json), [최종 preservation](nuri-community-search-comment-2026-10-07-evidence/preservation-final.json)이 장기 경계를 소유한다.

원본 영상 contact sheet, screenshots/XML, build/test logs, QA ID manifest와 네 APK는 `/private/tmp/nuri-community-search-comment-20261007-162703`에 보존한다. bounded runtime log tail에 fatal이 없지만 장기 crash 해소로 확대하지 않는다. iOS, 확대 글꼴·폭 matrix, production 대용량 검색 benchmark와 최종 Store E2E는 미실행이다. 기존 GLOBAL_CTA 두 OPEN 시각 한계와 이전 frozen 승인 범위는 변경하지 않는다.

NEXT_ACTION: PO 후보 화면 검토. AUTO_START_NEXT_WORK: NO. MASTER_STATE: STOPPED_WAITING_FOR_PO_COMMUNITY_REVIEW.

PO 승인을 기다립니다.
