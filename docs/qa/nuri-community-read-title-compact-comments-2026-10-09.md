# NURI 읽은 게시글 제목과 댓글 밀도 보완

최신 설치 상태: 후속 [Release 설치 보고서](nuri-community-create-install-2026-10-09.md)의 APK `5c9f9cca`에 이번 읽음 표시·댓글 밀도·16sp 변경이 포함됐다. 화면은 PO 직접 확인 대기이며 아래 미설치 표기는 로컬 구현 당시 이력이다.

2026-10-09 KST. CODE_ONLY_PENDING_PO_REVIEW. PO가 승인한 수정·로컬 검증만 완료한 후보이며 빌드·설치·기기 조작은 하지 않았다. 이전 [상세·댓글 분리 후보](nuri-community-discussion-redesign-2026-10-09.md)의 설치 및 서버 반영 증거는 그대로 보존한다.

## 구현 결과

- 댓글 선택 파란 글씨/배경/leading line을 제거했다. 알림 anchor와 inline reply target은 그대로 유지한다.
- 본문 상세가 ready/focused인 경우만 계정별 기기 로컬 읽음 이력을 남긴다. 목록 제목만 `#7E22CE`로 표시하며 접근성 label도 읽은 게시글을 알린다. 목록 tap만 하거나 조회에 실패한 경우, 댓글 화면 단독 진입은 읽음으로 만들지 않는다.
- 읽음 store는 목록 배열·필터·정렬·페이지 cursor를 수정하지 않는다. 읽은 글은 목록에 그대로 남으며 재실행 후에도 읽음 표시를 복원한다. 기존 서버 삭제/차단/moderation으로 열람 불가능해진 글의 보호 정책은 유지한다.
- AsyncStorage를 계정/guest와 post별로 분리했다. 제목·본문·입력 내용은 저장하지 않는다. TTL·오래된 읽음 제거 없음. 저장 실패 시 세션 표시는 유지하고 다음 방문에 재시도한다. 다른 기기 동기화, 앱 데이터 초기화/재설치 후 복구는 이 로컬 방식의 범위가 아니다.
- 마미톡 기존 관찰의 작은 작성자 영역·중립 댓글 배경·간결한 action 구성을 참고했다. 외부 앱 자산을 복사하지 않았으며 픽셀 단위 복제나 새 실기기 비교를 주장하지 않는다.

## 시각 변경

| 대상 | 변경 |
| --- | --- |
| 본문·댓글·답글·작성자 닉네임·본문 멘션 | 16sp, lineHeight 25sp로 통일 |
| 제목·작성 시각·action label | 기존 위계 유지 |
| root 행 | 좌우 20dp, 위 6dp/아래 2dp |
| reply 행 | 기존 들여쓰기 24dp, 위 4dp/아래 0dp |
| 답글 영역 | 위쪽 margin 10dp와 padding 8dp 제거 |
| 댓글 본문 | theme surface, radius 8dp, 좌우 8dp/상하 3dp |
| 좋아요·삭제·신고 | 큰 테두리 버튼 대신 간결한 text face, 최소 48dp 터치 영역 유지 |
| 선택 강조 | 댓글 파란 강조 없음; 계절색 작성자 배지/멘션은 유지 |

고정 행 높이나 본문 잘라내기를 사용하지 않는다. 실제 행 높이는 내용·사용자 글꼴·fontScale에 따라 증가한다. native 높이 감소율은 측정하지 않았다.

## 수정 소유권

| 파일 | 범위 |
| --- | --- |
| `src/store/communityReadStore.ts` | 로컬 읽음 영속화·계정 격리·동시 호출/저장 실패 처리 |
| `src/screens/Community/components/PostCard.tsx` | 목록 제목과 접근성 읽음 표시 |
| `src/screens/Community/CommunityDiscussionContent.tsx` | 성공한 본문 열람에만 읽음 기록 |
| `src/app/theme/tokens/colors.ts` | 댓글 선택색 대신 게시글 읽음 토큰 |
| `src/screens/Community/CommunityDetailScreen.styles.ts` | 댓글 밀도·동일 본문 크기 |
| `src/screens/Community/components/CommentThreadItem.tsx` | root 중립 배경·파란 강조 제거 |
| `src/screens/Community/components/ReplyCommentItem.tsx` | reply 중립 배경·파란 강조 제거 |
| `src/screens/Community/components/CommentActionRow.tsx` | 간결한 action face·48dp 터치 |

테스트 5개는 `communityReadStore`, `communityReadPresentation`, `communityCommentCorrective`, `communityCommentPresentation`, `communityDetailPresentation`이다. 기존 composer identity/draft/keyboard/scroll/reveal, 서버 query/RPC/RLS/moderation, navigation 구현은 수정하지 않았다.

## 검증

| 검사 | 결과 |
| --- | --- |
| TypeScript | PASS |
| 대상 ESLint | 13파일, 오류 0·경고 0 |
| 대상 검사 | 8 suites / 84 tests PASS |
| 전체 회귀 검사 | 197 suites / 2,016 tests PASS, 전체 실행 1회 |
| 현재 범위 diff/공백 | PASS, [검증 metadata](nuri-community-read-title-compact-comments-2026-10-09-evidence/validation.json) |
| 보존 | [보존 결과](nuri-community-read-title-compact-comments-2026-10-09-evidence/preservation.json) |
| 실기기 화면·키보드·확대 글꼴·TalkBack | NOT_RUN, 미설치 후보 |
| Remote | 이번 연결/수정/새 검증 없음 |

초기 대상 실행에서 새 테스트의 native Pressable 조회 방식 및 이전 스타일 기대값 3개가 실패했다. 테스트를 실제 렌더/새 시각 계약에 맞추고 최종 대상 검사를 통과했다. 초기 TypeScript의 테스트 borderWidth 타입 오류도 함께 해소됐다. 기존 third-party JSX transform 경고는 남아 있으며 앱 결함 PASS로 확대 해석하지 않는다.

전체 `git diff --check`에는 이번 작업 이전의 `docs/qa/nuri-glass-expenses-2026-10-08-evidence/eslint.log` 및 `supabase/migrations/20261007074134_community_search_and_write_error_contract.sql` EOF 공백 경고 2개가 남는다. 무관한 dirty를 정리하지 않았다.

## 설치와 보존 경계

- 이전 설치 APK SHA-256: `82c293b818ddf9413bbf2638d82a0bf991fd83d42b1d8a8bdb39cfa8d8929651`. 이전 설치 증거를 인용하며 이번에 기기를 조회하거나 갱신하지 않았다. 이 APK에는 후속 읽음/밀도/동일 글자 크기 변경이 없다.
- 이번 BUILD 0, INSTALL 0, ADB 0, DEVICE_UI 0, DB_MUTATION 0, COMMIT NO, PUSH NO, CLEANUP NO.
- Branch `codex/task6-community-content-policy`, HEAD `e49356c14f731599d0a428c52fff368aa997ce18`, staged NONE. 기존 source dirty·QA·APK/AAB·자산은 보존한다.
- 실행 로그: `/private/tmp/nuri-community-read-title-20261009-010327/`. 장기 보존은 작은 validation/preservation/source-hash JSON만 같은 이름 evidence 폴더에 저장한다. 대형 산출물이나 외부 앱 자산 복제는 없다.

## 최종 상태

IMPLEMENTATION: LOCAL_COMPLETE_PENDING_PO_REVIEW

PHYSICAL_QA: NOT_RUN_NOT_INSTALLED

DEVICE_OWNER: PO

STORE: HOLD

AUTO_START_NEXT_WORK: NO

다음 한 작업은 PO의 이번 로컬 변경 검토다. 추가 설치·실기기 검증은 별도 지시 전 실행하지 않는다.

PO 승인을 기다립니다.
