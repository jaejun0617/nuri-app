# 커뮤니티 목록·상세·댓글 UI 명세

기준일: 2026-07-19

## 1. 목적

- 목록은 이미지 피드가 아니라 게시판형 정보 탐색 화면으로 운영한다.
- 제목, 작성 맥락, 조회·좋아요·댓글 수를 짧은 시간에 비교할 수 있어야 한다.
- 상세는 게시글 본문과 댓글 흐름을 분리하고, 댓글과 1-depth 답글의 관계를 명확하게 보여준다.
- 디자인 변경으로 moderation, soft delete, cursor pagination, cache invalidation 계약을 약화하지 않는다.

## 2. 목록 구조

- 헤더: 뒤로가기, `커뮤니티` 제목. 글 작성은 기존 우하단 FAB를 유지한다.
- 상단: 운영정책 안내, 최근 글 수, 가로 스크롤 카테고리 탭.
- 카테고리: `전체`, `질문`, `팁 공유`, `일상`, `정보`.
- 게시글 row:
  - 텍스트·이미지 유형 아이콘
  - 최대 2줄 제목
  - 카테고리, 작성자, 반려동물, 상대 시간, 조회 수
  - 좋아요 버튼
  - 우측 고정 폭 댓글 수 rail
- 실제 이미지는 목록에서 렌더링하지 않고 상세에서만 표시한다.
- row, 카테고리 탭, 좋아요 버튼은 최소 44px 터치 영역을 보장한다.

## 3. 목록 성능 계약

- `FlatList`와 memoized row를 사용한다.
- 목록 row마다 최신 댓글을 별도 조회하지 않는다. 100건 기준 N+1 요청을 만들지 않는다.
- cursor pagination을 유지하며 다음 페이지 로드 시 현재 스크롤 위치를 보존한다.
- 카테고리 변경과 명시적 refresh만 목록을 처음부터 다시 조회한다.
- `hasMore=true` 상태에서는 현재 로드 수를 `N개 이상`으로 표시한다.

## 4. 상세 구조

- 작성자/반려동물, 작성 시각, 조회 수, 카테고리, 제목, 본문, 이미지, 좋아요·신고 순서다.
- 게시글 소유자에게만 기존 수정·soft delete 메뉴를 노출한다.
- 다른 사용자에게는 신고 진입을 제공한다.
- hidden/private/deleted 게시글은 direct detail에서도 노출하지 않는다.
- hard delete는 사용하지 않는다.

## 5. 댓글·답글 구조

- 댓글 header는 `댓글 N`과 등록순 상태를 표시한다.
- top-level 댓글은 flat row와 얇은 divider로 구분한다.
- 답글은 왼쪽 guide line과 들여쓰기로 부모 댓글 아래에 표시한다.
- 답글 depth는 현재 서버 계약대로 1-depth만 허용한다.
- 게시글 작성자가 남긴 댓글과 답글은 다음을 모두 적용한다.
  - `글쓴이` badge
  - 선택 반려동물의 NURI accent color
  - 옅은 accent surface와 border
- 일반 댓글은 중립 surface를 사용해 글쓴이 댓글과 즉시 구분한다.
- 댓글·답글 삭제는 status/deleted_at 기반 soft update만 허용한다.

## 6. 입력·내비게이션

- 댓글 composer는 safe area와 Android keyboard 위에 유지한다.
- 입력창과 등록 CTA는 키보드에 가려지지 않아야 한다.
- Android back 1회는 keyboard를 닫고, 다음 back은 상세에서 목록으로 복귀한다.
- 답글 작성 상태는 banner로 대상을 표시하고 취소할 수 있어야 한다.
- 제출 중 중복 submit을 차단한다.

## 7. 상태 UI

- 초기 로딩: 중앙 또는 section 로딩 indicator.
- 페이지 로딩: list footer indicator.
- 빈 상태: 작성 진입이 가능한 안내와 CTA.
- 오류: 사용자용 안정 메시지와 재시도.
- 숨김 콘텐츠: feed, 검색, direct detail에서 제외한다.

## 8. Controlled QA fixture

- script: `scripts/qa/community-design-fixtures.js`
- package command: `corepack yarn qa:community-design -- <audit|seed|soft-hide|restore>`
- 쓰기 작업은 `NURI_ENABLE_COMMUNITY_DESIGN_QA=true`와 server-only Supabase 환경이 모두 있어야 실행된다.
- fixture 제목 prefix는 `[QA 커뮤니티 리디자인 #NNN]`이다.
- 기본 dataset:
  - 게시글 100건
  - top-level 댓글 200건
  - 1-depth 글쓴이 답글 100건
- 게시글은 고정 QA 계정 `adminQA`, 일반 댓글은 분리된 controlled QA 계정으로 작성한다.
- fixture 생성은 실제 authenticated session과 기존 RLS/content policy를 통과한다.
- cleanup은 정확한 prefix와 허용된 owner를 확인한 뒤 soft-hide/restore만 수행한다.
- password, access token, service role key, provider identity는 출력하거나 저장하지 않는다.

## 9. 실서비스 데이터 보호

- 일반 사용자 게시글을 fixture cleanup 대상으로 포함하지 않는다.
- 기존 QA 게시글 정리가 필요하면 운영자 approval, audit, conflict-safe soft-hide 경로를 사용한다.
- 사용자·게시글·댓글 hard delete와 production 일괄 수정은 금지한다.
- DB/RPC/RLS 변경 없이 UI만 변경할 때 remote schema 계약을 그대로 유지한다.

## 10. 완료 기준

- 100건 cursor pagination에서 scroll jump와 반복 fetch가 없다.
- 글쓴이 댓글과 답글이 일반 댓글과 시각적으로 구분된다.
- 댓글 keyboard, Android back, 목록 복귀가 정상이다.
- hidden content read-path와 moderation 계약이 유지된다.
- typecheck, lint, 전체 tests, release build, Android visual smoke, refined logcat을 통과한다.
