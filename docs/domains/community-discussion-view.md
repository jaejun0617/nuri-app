# Community Discussion View Contract

최신 배포 상태: PO 최종 승인 후 [Release `5d48cb86` 설치](../qa/nuri-community-approved-release-2026-10-09.md) 완료. source `7eafa38` 커밋·푸시, Metro OFF. 아래 Metro 설치와 후보 설명은 구현 당시 이력이며 기능 계약은 유지한다.

2026-10-09 KST. 구현 후보의 상세/댓글 읽기 계약이다. 최신 JS/서버 상태는 [사진·댓글 보완](../qa/nuri-community-media-comments-2026-10-09.md), 설치 APK는 [Metro 개발 corrective](../qa/nuri-community-live-corrective-2026-10-09.md)다. 이전 승인된 키보드 기준선을 새 route의 native PASS로 확대하지 않는다.

## 화면과 소유권

- `CommunityDetailScreen`과 `CommunityCommentsScreen`은 얇은 route shell이며 `CommunityDiscussionContent`가 기존 댓글/답글/신고/차단/삭제 handler를 공유한다.
- 상세는 제목/작성자 다음 본문, 사진 순서다. 댓글 미리보기는 root 등록순, 각 root 바로 아래 reply 등록순으로 최대 10개 엔티티를 표시한다. 댓글 1개+답글 1개면 둘 다 보인다. 각 답글도 같은 10개 한도를 소비한다.
- 댓글 전용 화면은 기존 등록순/최신순/답글순을 제공한다. 최상위 댓글 10개 단위, 첫 답글 5개를 묶어 읽고 답글 추가 페이지는 20개 단위다. 이전/다음 탐색을 제공한다.
- 최상위 목록은 FlatList를 유지한다. 대댓글은 로드한 root 하위 행이며 모든 댓글을 처음부터 가져오지 않는다. 사진은 가로 slider 대신 첨부 순서의 세로 gallery로 보여준다. 실제 디코딩 width/height 비율과 parent 폭을 사용하며 contain으로 자르지 않는다. 업로드 압축/해상도를 바꾸거나 원본 파일 품질을 복원하는 변경은 아니다.
- 각 화면의 composer는 해당 route가 focused일 때만 mount된다. 일반 댓글은 하단, 답글은 대상 댓글/답글 본문 아래의 기존 배치를 유지한다.

## Count와 Visibility

- 읽기 함수는 `STABLE SECURITY INVOKER`, `search_path = pg_catalog, public`이며 기존 comments RLS와 parent visibility helper를 따른다. 구형 summary v1은 3-root 계약 그대로 유지하고 새 앱은 summary v2를 호출한다. threads/replies v1은 변경하지 않는다.
- summary v2는 총수와 최대 10개의 root/reply preview를 같은 응답으로 보낸다. total은 현재 읽을 수 있는 active/non-deleted root와 그 root 아래의 active/non-deleted reply 엔티티 수다. 읽을 수 없는 parent 아래 고립된 답글은 일관되게 제외한다.
- `remaining = max(0, total - previewCount)`다. previewCount는 서버가 미리보기로 제공한 root/reply 엔티티 수이며 reply 수 배지는 세지 않는다. 사용자가 답글을 접어도 이 범위와 남은 수를 바꾸지 않는다. 10개 이하이면 모두 제공하고 더보기를 숨긴다. 11개 이상이면 `댓글 N개 더보기`, 총수 미확인이면 `댓글 모두 보기`다. 오류를 0개로 바꾸지 않는다.
- previewReplyIds는 전체 댓글 화면의 reply cache와 분리한다. 전체 화면에서 더 읽거나 펼친 뒤 돌아와도 본문 preview가 10개를 넘지 않는다. 부모 없는 reply/중복 ID/응답 크기 불일치는 성공으로 표시하지 않는다.
- 기존 댓글 RLS는 parent post와 작성자의 공개/차단/탈퇴/제재 상태를 기준으로 한다. 댓글 작성자 자체를 별도로 차단 제외하는 새 정책을 이번에 만들지 않았다. 기존 정책 보존과 새 정책 구현을 혼동하지 않는다.
- 기존 공개 목록의 저장된 댓글 counter까지 새 visible count로 일괄 교체하지 않는다. 이번 상세/댓글 view의 권한 일치 count만 새 함수가 소유한다.

## 페이지와 세션

- cursor는 버전, post, scope, sort, root 및 boundary ID와 membership revision을 검증한다. 잘못된 cursor는 `22023`, 오래된 cursor는 `PT409`, 열람 불가는 `42501`이다. 클라이언트는 기존 stable error 흐름으로 재시도를 제공한다.
- viewer/post/navigation session별 메모리 세션이 summary, pages, 펼침, 선택 댓글, reply target, draft ref, selection ref, submit lock을 공유한다. DB 읽음 기록이나 영구 draft 저장을 추가하지 않는다.
- 입력마다 부모 전체 state를 갱신하지 않는다. 실제 입력 중 draft는 active composer가 소유하고 세션 ref에 보존한다. target/route 변경 때 복구하고 서버 전송 성공 때만 비운다.
- single-flight 및 request epoch로 중복/오래된 응답을 제한한다. sort/refresh/dispose 이후 이전 응답이 현재 목록을 덮어쓰지 않는다.
- root/reply 전송 성공 또는 삭제 이후 summary와 thread를 재조회한다. 권한 상실 시 이전 읽기 목록과 target을 숨기며 실패 draft를 보존한다.

## Navigation과 선택

- 본문 `답글 N`은 해당 thread의 제자리 접기/펼치기다. 상하 Chevron과 expanded 접근성 상태를 함께 바꾸며 화면 이동/추가 조회는 없다. preview 범위에 답글이 하나도 없는 root에는 빈 toggle을 노출하지 않는다. 본문의 작은 `댓글 N >` 전체 영역과 댓글 더보기는 댓글 전용 화면으로 이동한다.
- 상세에서 댓글 화면으로 push할 때 실제 상세 route key와 session ID를 전달한다. Back은 실제 이전 route로 pop한다.
- `본문 가기`는 같은 post의 원래 상세 route를 재사용하고 본문 상단 이동을 요청한다. 알림에서 직접 댓글 화면으로 온 경우 Detail로 replace하여 알림 목록을 이전 route로 남긴다.
- 상세가 stack에 남은 왕복은 기존 native 목록 위치를 유지한다. 댓글 재진입은 session의 offset과 로드한 목록/펼침을 재사용한다. 목록 변화 중 임의 위치의 완전한 픽셀 복구를 native 검증했다고 주장하지 않는다.
- 알림 commentId는 보호된 server anchor 조회로 root를 찾고 reply면 해당 thread를 펼친다. 사라진 anchor는 안내하며 키보드를 자동으로 열지 않는다. 기존 snapshot 복귀 형식과 구형 detail+commentId를 호환한다. 새 외부 URL 스킴은 추가하지 않는다.
- 선택 상태와 reply target은 별도다. 선택 댓글은 항상 하나이며 명시적 body tap/preview 진입/알림 anchor에서 정한다. 세션 종료/사용자 변경/선택 대상 삭제 또는 열람 불가 때 초기화한다.
- PO의 요구 정정에 따라 댓글 본문의 파란색·선택 배경·leading line을 제거했다. 내부 선택 상태는 알림 anchor와 답글 문맥용으로만 남기고 일반 댓글/답글 본문 색은 동일하다.

## 게시글 읽음 표시

- 본문 상세가 focused이며 보호된 상세 조회가 ready인 경우만 읽음으로 기록한다. 단순 목록 tap, 실패/로딩/삭제/열람 불가 화면, 댓글 전용 화면 단독 진입은 읽음으로 만들지 않는다.
- `communityReadStore`가 계정 ID별 기기 로컬 이력을 소유한다. guest와 각 계정은 분리되며 post별 작은 AsyncStorage entry에 `1`만 저장한다. 본문/제목/입력 내용은 저장하지 않는다. TTL이나 임의 오래된 항목 제거는 없다.
- 계절 강조색과 별개인 `communityReadTitle` (`#7E22CE`)로 목록 제목만 표시하고 접근성 label에 읽은 게시글을 덧붙인다. 현재 light/dark 모두 목록 행 배경이 밝은 구현에 맞춘 색이다.
- 읽음은 목록 membership, 정렬, 필터, 페이지 cursor와 무관하다. 읽었다는 이유로 글을 숨기지 않는다. 기존 서버 삭제/차단/moderation에 따른 비노출은 여전히 적용한다.
- 상세 loading/일시 오류 동안 마지막 eligible 목록 snapshot은 남기고 보호 상세 cache만 지운다. 정상 응답은 같은 목록 위치에서 갱신하며 열람 불가/삭제/moderated 결과는 목록에서도 제거한다. 로컬 읽음 상태 갱신은 저장 완료를 기다리지 않는다.
- 다시 실행해도 로컬 이력을 복원한다. 다른 기기 동기화나 앱 데이터 초기화 후 복구는 제공하지 않는다. 저장 실패는 현재 세션 표시를 유지하고 다음 방문에 저장을 다시 시도한다. 서버 읽음 기록은 추가하지 않는다.

## Keyboard와 글꼴

- 기존 controller KAV의 단일 owner, measured offset, closed-system bottom inset을 유지한다. inactive route는 KAV와 composer focus를 소유하지 않는다.
- `keyboardDismissMode="none"`, `keyboardShouldPersistTaps="always"`, drag 시 pending focus/reveal 취소를 유지한다. 반복 timer reveal과 scroll snap-back을 추가하지 않는다.
- 앱 선택 글꼴은 이번 상세/댓글 및 composer에만 반영한다. Community 목록/작성/수정의 별도 글꼴 정책, 전역 AppTextInput/native/MainActivity는 변경하지 않는다.

## 시각 계약과 검증 경계

| 항목 | 구현 기준 |
| --- | --- |
| 본문 | 좌우 20dp, 제목 20/28sp, 본문 16/25sp |
| 본문·댓글·답글·닉네임·본문 멘션 | 16/25sp로 동일, 제목·시각·동작 label은 별도 위계 유지 |
| 댓글 밀도 | root 위 6dp/아래 2dp, reply 위 4dp/아래 0dp. root avatar 28dp, reply avatar 20dp. 답글 avatar의 왼쪽 56dp는 원댓글 본문 시작점에 맞춤 |
| 댓글 본문 배경 | light #F4F4F5, dark #27272A 중립 말풍선, radius 8dp, 좌우 10dp/상하 6dp, shadow 없음. 전체 행 배경/구분선 대신 작은 thread 간격으로 구분 |
| 분류 칩 | 11/16sp, 시각 패딩 좌우 6dp/상하 2dp |
| 작은 도구 | 작은 시각 패딩과 48dp 터치 영역 분리 |
| 댓글 행동 | 답글쓰기 → 좋아요 → 하트 → 숫자 → 삭제/신고. 최신 PO 지시로 삭제와 동일한 12/18sp, 하트도 같은 nominal size와 최대 2배 사용자 fontScale |
| 댓글 헤더 | 댓글 화면 상단 중앙 댓글(총수), 우측 본문 가기. 목록에는 중복 총수 없이 우측 정렬 도구만 표시. 본문 preview는 위 구분선 아래에 14/22sp 단일 Text 댓글 N과 오른쪽 Chevron, 48dp 전체 터치 영역 |
| 글쓰기 버튼 | 실제 native plus glyph에 #FFFFFF, 누리 semantic glyph 치환은 이 버튼에서만 해제 |
| 읽음 | 게시글 목록 제목 보라색, 댓글 선택 파란 강조 없음 |
| 본문·댓글 색상 | 펫 theme 구독 없음. 분류/본문/댓글/작성자 badge/mention/전송/정렬에 중립 token. 글등록 계절색은 별도 유지 |
| 장식 | 새 blur/중첩 카드/그림자 없음, 계절마다 geometry 변경 없음 |

실제 Galaxy 화면 조작은 PO가 맡는다. 한글 조합/caret/selection/offscreen 왕복, native scroll 복귀, 360/384/430dp 및 1.3/1.5 글꼴, TalkBack과 장시간 성능은 별도 실기기 판정이다. 새 route의 PASS를 이전 키보드 승인으로 대체하지 않는다.

## 운영 경계

- 실행 이력은 기존 두 읽기 migration과 `20261008183526_community_ten_comment_preview.sql`, 사람이 읽는 현재 SQL은 [읽기 계약 최종본](../sql/커뮤니티/커뮤니티-댓글-읽기-계약-최종.sql), 실제 권한/definition 사실은 remote catalog다.
- 반환 페이지 수는 제한하지만 revision과 정렬 계산은 visible rows에 비례할 수 있다. 큰 thread의 실행 계획/지연은 미측정이다.
- 읽기 함수 반영은 승인 범위다. 기존 write RPC/RLS/moderation 변경, 데이터 생성/삭제, role 변경, 새 키보드 라이브러리, Store 반영은 이 계약의 범위가 아니다.
