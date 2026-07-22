# 커뮤니티 목록·상세·댓글 리디자인 QA 보고

기준일: 2026-07-22

## 2026-07-22 대댓글 세로선 제거·profile 정렬 QA

- 대댓글의 vertical hierarchy line과 lead marker를 제거했다.
- 대댓글 avatar/name을 부모 댓글 `답글쓰기` action 시작선에 정렬했다.
- 댓글별 가로 row divider와 parent border는 유지했다.
- Android에서 일반 댓글, 글쓴이 댓글, 대댓글 2개를 확인했고 세로선 없이 정렬·author accent가 정상이다.
- composer keyboard, CTA, Android back을 확인했다.
- 최신 APK SHA-256 `6b5e22a3e9dcde258570fd27061222731f2651ce57c389b17fa12f066e2be255`, Jest `66 suites / 257 tests`, app-fatal scan 0.
- 증적: `/tmp/nuri-qa/community-final-release-list.png`, `/tmp/nuri-qa/community-final-release-comments.png`, `/tmp/nuri-qa/community-final-release-keyboard.png`, `/tmp/nuri-qa/community-final-release-logcat-final-app-fatal-scan.txt`.

## 2026-07-22 답글 알림·댓글 thread visual closeout

- 댓글 thread를 외곽 border와 `marginBottom` 간격이 있는 그룹으로 바꾸고, 일반 댓글도 border 색을 갖도록 정리했다.
- `답글쓰기` action row 다음에 답글 목록을 배치하고, 답글 목록에는 상단 divider·좌측 guide line·row별 하단 divider를 적용했다.
- Home 알림 panel은 제목 17, 항목 13, 본문 11, 날짜 10 수준의 차분한 밀도와 중립 icon/background로 조정했다.
- controlled QA script가 top-level 댓글과 1-depth 답글을 각각 생성해 별도 인앱 알림을 만들고, 두 target 모두 서버 `postId/commentId`와 일치하는지 확인했다.
- Android에서 답글 알림을 탭한 뒤 부모 댓글 thread가 자동 확장되고 `[QA 답글 알림 E2E] 부모 댓글 아래 좌표 이동을 확인합니다.` 답글이 viewport에 바로 표시됐다.
- QA 종료 후 댓글·답글 5건은 soft-delete되었고 active QA row는 0건이다. actual push와 hard delete는 수행하지 않았다.

검증 결과:

- `viewCount`: first different viewer `delta 1`, repeated viewer `delta 0`.
- `commentNotification`: unread `1`, actor/post copy `true`, app inbox `true`, target `true`, push `false`.
- `replyNotification`: unread `1`, actor/reply copy `true`, app inbox `true`, target `true`, push `false`.
- 최신 APK SHA-256: `c61972c0e1c170f310701894c83dd18cf334cf424603de09eb5f3be13db5623d`.
- Jest `66 suites / 257 tests`, typecheck/lint/build/install 통과, app-fatal scan 0건.

최신 증적:

- `/tmp/nuri-qa/community-reply-notification-home.png`
- `/tmp/nuri-qa/community-reply-notification-sheet.png`
- `/tmp/nuri-qa/community-reply-notification-comment.png`
- `/tmp/nuri-qa/community-reply-notification-comment.xml`
- `/tmp/nuri-qa/community-reply-notification-logcat-full.txt`
- `/tmp/nuri-qa/community-reply-notification-logcat-app-fatal-scan.txt`

## 2026-07-22 댓글 알림 target deep link 추가 검증

- 댓글 알림 row가 서버에서 검증된 `postId/commentId`를 보유하도록 `get_user_notifications_v2`를 additive migration으로 추가했다.
- Home 알림 overlay와 알림함의 댓글 알림을 누르면 게시글 상세로 이동하고, 대상 top-level 댓글 또는 답글의 부모 thread를 자동 확장한다.
- 대상 row는 accent surface와 왼쪽 강조선으로 표시하고, target 위치까지 보정 스크롤한다. target이 유효하지 않으면 게시글 상세만 여는 fallback이다.
- 실제 controlled secondary 댓글 INSERT 후 `adminQA` Home unread badge와 알림 문구를 확인했고, 알림을 눌러 대상 댓글이 게시글 상세 viewport에 바로 노출·강조되는 것을 확인했다.
- QA script 결과: `viewCount firstDifferentUserView counted delta 1`, `repeatedView deduped repeatedDelta 0`, `commentNotification unreadDelta 1 actorCopyMatched true postCopyMatched true appInboxVisible true navigationTargetMatched true pushDispatched false`.
- QA 종료 후 댓글은 soft-delete, 알림은 read 처리, fixture는 active 게시글 100건과 댓글·답글 300건으로 복구했다.
- 최신 APK SHA-256: `11aa59e2f75e792b280437cab052c306c165d1d252fa3fe9abb6762473a64d0f`; Jest `66 suites / 257 tests`; typecheck/lint/build/install 통과.

딥링크 증적:

- `/tmp/nuri-qa/community-notification-deeplink-home.png`
- `/tmp/nuri-qa/community-notification-deeplink-sheet-3.png`
- `/tmp/nuri-qa/community-notification-deeplink-comment.png`
- `/tmp/nuri-qa/community-notification-deeplink-comment.xml`
- `/tmp/nuri-qa/community-notification-deeplink-logcat-full.txt`

판정: 댓글 알림의 게시글·댓글 좌표 이동과 target 강조는 완료했다. actual push는 정책상 비활성이고, 인앱 알림 lifecycle과 navigation contract를 검증했다.

## 2026-07-22 목록 정렬·조회수·댓글 알림 closeout

- 제목 옆 말풍선을 18dp 고정 크기와 20dp title row에 배치해 제목과 수직 중앙 정렬했다.
- row 최소 높이 62dp, 세로 padding 8dp, 1px divider와 우측 rail divider로 게시글 경계를 강화했다.
- metadata는 `카테고리 | 작성자 | 시각/날짜 | 조회 | 추천` 한 줄이며 카테고리는 `질문`, `팁 공유`, `일상`, `정보`를 유지한다.
- 기존 분리 QA 사용자의 첫 조회에서 첫 fixture 조회수가 `0 -> 1`, 즉시 반복 조회는 `deduped`, 추가 증가 0으로 확인됐다.
- 분리 QA 사용자의 실제 댓글 INSERT 후 `adminQA` unread가 1 증가했고 Home badge와 알림 overlay에 `작성자님이 댓글을 남겼어요`, 대상 게시글 제목이 표시됐다.
- 댓글 QA row는 증적 후 soft-delete, 알림은 읽음 처리했다. fixture는 active 게시글 100건, active 댓글/답글 300건으로 복구됐다.
- `posts.comment_count` 파생 집계 drift를 발견해 active 댓글/답글 기준 corrective trigger와 counter repair를 additive migration으로 반영했다.
- actual push, broadcast, hard delete는 사용하지 않았다.

최종 artifact:

- APK: `android/app/build/outputs/apk/release/app-release.apk`
- bytes: `114807572`
- SHA-256: `c5c54e667cbb8def21fb7fa63c45478d7ef1de3978b9edd7e20a97d2dd568a0a`
- build/install: `assembleRelease` / `adb install -r` 성공
- Jest: `66 suites / 256 tests`, 실패 0
- logcat: Fatal/ANR/unhandled/RN fatal/Fatal signal 0

최신 증적:

- `/tmp/nuri-qa/community-list-final-clean.png`
- `/tmp/nuri-qa/community-list-alignment-divider-final.png`
- `/tmp/nuri-qa/community-interaction-home-badge.png`
- `/tmp/nuri-qa/community-comment-notification-inbox.png`
- `/tmp/nuri-qa/community-secondary-comment-visible.png`
- `/tmp/nuri-qa/community-list-notification-logcat.txt`

## 1. 범위

- 구현 위치: React Native 앱 `CommunityList`, `CommunityDetail`, comment/reply presentation.
- 디자인 방향: 첨부 게시판 레퍼런스의 빠른 scan 구조를 NURI color/token에 맞게 재해석.
- 범위 제외: 앱 전체 디자인, 폰트, Play Store, actual push, 관리자 신규 기능.
- DB/RPC/RLS migration: 댓글 인앱 알림 trigger와 댓글 수 파생 집계 corrective trigger 2건, additive only.

## 2. 구현 결과

### 목록

- compact editorial row, 제목과 중앙 정렬한 유형 icon, 한 줄 제목, dense metadata, 우측 댓글 수 rail.
- 가로 스크롤 category tab과 선택 반려동물 accent.
- 추천 수는 목록에서 read-only로 표시하고 실제 좋아요 action은 상세에 유지한다.
- 카테고리 tab과 주요 navigation의 44px touch target.
- row별 최신 댓글 request/subscription 제거. 100건에서 별도 comment N+1 fetch 없음.
- cursor pagination과 scroll 위치 유지.

### 상세·댓글

- post header/body/action과 comment section hierarchy 유지.
- flat comment row와 thin divider.
- reply guide line, indent, 1-depth 계약.
- 게시글 작성자 댓글·답글에 accent surface/border와 `글쓴이` badge.
- 일반 댓글은 중립 surface로 구분.
- comment composer keyboard avoiding, send CTA, Android back 정상.

## 3. Remote QA dataset

- fixture post: 100건, 모두 `adminQA` 소유 및 active.
- top-level comment: 200건.
- reply: 100건, 모두 게시글 작성자의 1-depth 답글.
- 전체 fixture comment/reply: 300건.
- 게시글별 구조 audit: 일반 댓글 1개, 글쓴이 댓글 1개, 글쓴이 답글 1개를 모두 만족한 게시글 `100/100`.
- secondary nickname snapshot: 1건. 일반 댓글 작성자 표시 fallback을 검증하는 controlled 보조 row이며 cleanup에 포함된다.
- 생성 방식: controlled authenticated session으로 기존 RLS, trigger, content policy를 통과.
- cleanup: exact prefix와 owner 확인 후 soft-hide/restore만 허용.
- 기존 과거 QA post: allowlist 6건을 운영자 요청·승인·실행과 audit를 거쳐 soft-hide. active 0건, hard delete 0건.

## 4. Android visual QA

- 기기: `SM_S937N / R5CY613NMSY`.
- 계정: 고정 QA 계정 `adminQA`.
- APK: `android/app/build/outputs/apk/release/app-release.apk`.
- versionName/versionCode: `1.0` / `1`.
- APK bytes: `114810160`.
- APK SHA-256: `19f2aa1e9a3a9d71f343fec952456304d15a24c2aec9fdb6bf524379781a2fd7`.
- build/install: `assembleRelease` 성공, `adb install -r` 성공.

검증 결과:

- cold start 후 기존 `adminQA` Home session 유지.
- Community 첫 page 20건과 `20개 이상` 상태 정상.
- 100번째 fixture까지 cursor pagination 정상.
- 과거 QA post 6건 public 목록 미노출.
- 일반 댓글, 글쓴이 답글, 글쓴이 댓글의 hierarchy와 강조 정상.
- `글쓴이` badge와 accent surface가 일반 댓글과 명확히 구분됨.
- keyboard가 input/send CTA를 가리지 않음.
- Android back 1회 keyboard dismiss, 다음 back 상세에서 목록 복귀.
- bottom navigation, composer, CTA overlap 없음.

증적:

- `/tmp/nuri-qa/community-redesign-final-cold-start.png`
- `/tmp/nuri-qa/community-redesign-final-list.png`
- `/tmp/nuri-qa/community-redesign-final-detail.png`
- `/tmp/nuri-qa/community-redesign-final-comments.png`
- `/tmp/nuri-qa/community-redesign-final-keyboard.png`
- `/tmp/nuri-qa/community-redesign-final-keyboard-back.png`
- `/tmp/nuri-qa/community-redesign-final-pagination-bottom.png`
- `/tmp/nuri-qa/community-redesign-logcat.txt`

## 5. Automated verification

- typecheck: 통과.
- lint: 통과.
- Jest: `65 suites / 252 tests`, 실패 0.
- 신규 focused test: 글쓴이 판별, comment grouping, preview bound 3건.
- `git diff --check`: 통과.
- release build: 통과.
- Supabase dry-run: remote up to date, destructive diff 없음.
- refined logcat: NURI fatal/ANR/unhandled/RN fatal/Fatal signal 0건.
- Android system `com.android.phone` AppOps SecurityException은 NURI process crash가 아님.

## 6. 보안·운영 판정

- hard delete: 없음.
- 일반 사용자 데이터 일괄 삭제: 없음.
- 과거 QA 정리: approval/audit 기반 soft-hide.
- fixture write guard: 명시적 environment flag 필수.
- fixture owner/prefix guard: 적용.
- password/token/service role key 출력·저장: 없음.
- DB/RPC/RLS/seed migration: 없음.

## 7. 최종 판정

커뮤니티 게시글 목록, 상세 댓글, 글쓴이 댓글·답글 리디자인과 100건 dataset 기반 Android QA를 완료했다. 현재 요청 범위의 blocker는 없다. QA dataset은 후속 visual/performance regression에 유지하며, 운영 노출을 종료할 때 exact-prefix soft-hide를 사용한다.
