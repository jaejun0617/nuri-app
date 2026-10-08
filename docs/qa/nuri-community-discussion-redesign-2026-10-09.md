# NURI 커뮤니티 상세·댓글 리디자인 후보 보고서

2026-10-09 KST. 승인된 댓글 전용 화면 기본안, 읽기 전용 함수 추가·반영, 상세/댓글 선택 글꼴 적용을 구현했다. Release 빌드·설치 각 1회 완료. **화면 검증은 PO 직접 확인 대기**이며 Codex가 새 화면의 native QA를 완료한 상태가 아니다.

## 1. 승인 범위와 기준

- 기준: [승인 전 벤치마크 제안](/private/tmp/nuri-community-detail-benchmark-20261008T135724/FINAL_REPORT.md)과 PO 구현 승인, 읽기 함수 3개 반영 승인, `빌드·설치만, 화면은 PO가 직접 확인`, `상세·댓글에 선택 글꼴 반영` 답변.
- 외부 앱 자산·브랜드·카피 복제 없음. 새 댓글 정책이나 전역 키보드 구조를 만들지 않았다.
- branch `codex/task6-community-content-policy`, base HEAD `e49356c14f731599d0a428c52fff368aa997ce18`. 이번 source는 미커밋 QA 후보이며 base HEAD만으로 설치 source를 설명하지 않는다.
- 전체메뉴의 기존 승인 미커밋 변경을 포함한 현재 workspace에서 증분 빌드했다. unrelated dirty를 되돌리거나 임의로 커밋하지 않았다.
- 실행 root: `/private/tmp/nuri-community-comments-20261009-002026/`. 작은 검증 metadata는 [repository evidence](nuri-community-discussion-redesign-2026-10-09-evidence/validation.json)에 보존한다. APK/AAB·로그는 원래 root에 유지한다.

## 2. 구현 결과

| 영역 | 실제 구현 |
| --- | --- |
| 상세 | 본문 중심 위계, 등록순 최상위 댓글 3개, 총 댓글 수 진입점, 남은 수에 따른 더보기 |
| 댓글 화면 | 별도 `CommunityComments` route, Back·총수·본문 가기, 기존 3종 정렬, root/reply 제한 페이지 |
| 답글 | 대상 댓글 또는 답글 바로 아래의 인라인 composer 유지. 미리보기의 답글 수를 누르면 해당 thread를 펼친 댓글 화면으로 이동 |
| 일반 댓글 | 기존 하단 composer 배치 유지, focused route만 입력/focus/keyboard 공간 소유 |
| 선택 | 현재 선택한 본문 하나만 semantic blue + 옅은 tint + leading line. 과거 읽음 전체 기록/DB 저장 없음 |
| 왕복 | viewer/post/session 단위 draft·reply target·선택·펼침·정렬 보존. Back은 이전 위치, 본문 가기는 같은 글 상단 |
| 알림 | 기존 commentId를 댓글 화면의 보호된 anchor 조회로 연결. 구형 snapshot도 호환, 새 public URL scheme 없음 |
| 글꼴 | 상세·댓글 및 해당 입력창에 선택 글꼴 반영. 목록/작성/수정의 별도 정책은 유지 |
| 키보드 | 기존 persistent drag/fling, 단일 local KAV, closed-system bottom inset, 사용자 drag 시 pending reveal 취소 유지 |
| 오류 | count 실패를 0개로 표시하지 않고 재시도 제공. 삭제/열람 불가 anchor 안내, 전송 실패·rate-limit draft 보존 |
| 서버 | summary/threads/replies 읽기 함수 3개 반영. 기존 쓰기·삭제·moderation RPC와 RLS 보존 |

새 화면 설계와 운영 계약은 [Community Discussion View](../domains/community-discussion-view.md)를 따른다. source 17개, 테스트 8개, 실행 SQL 2개와 관련 문서만 이번 변경 범위다. 새로운 native 의존성·MainActivity·global inset·전역 input 수정은 없다.

## 3. Source Map

| 책임 | 파일 |
| --- | --- |
| route shell | [상세](../../src/screens/Community/CommunityDetailScreen.tsx), [댓글](../../src/screens/Community/CommunityCommentsScreen.tsx) |
| 공유 화면과 기존 동작 | [CommunityDiscussionContent](../../src/screens/Community/CommunityDiscussionContent.tsx) |
| session/cache/draft refs | [discussionSession](../../src/screens/Community/discussionSession.ts) |
| 읽기 adapter | [discussionRead](../../src/services/community/discussionRead.ts), [기존 hydration 재사용](../../src/services/supabase/community.ts) |
| 댓글/답글/입력 | [CommentThreadItem](../../src/screens/Community/components/CommentThreadItem.tsx), [ReplyCommentItem](../../src/screens/Community/components/ReplyCommentItem.tsx), [CommunityCommentComposer](../../src/screens/Community/components/CommunityCommentComposer.tsx), [ReplyPageControls](../../src/screens/Community/components/ReplyPageControls.tsx) |
| 시각/선택색 | [화면 styles](../../src/screens/Community/CommunityDetailScreen.styles.ts), [semantic colors](../../src/app/theme/tokens/colors.ts) |
| route/글꼴 | [RootNavigator](../../src/navigation/RootNavigator.tsx), [App](../../App.tsx) |
| 알림·snapshot 복귀 | [communityRouteState](../../src/navigation/communityRouteState.ts), [Home](../../src/screens/Home/HomeScreen.tsx), [Notifications](../../src/screens/Notifications/UserNotificationsScreen.tsx) |

기존 댓글 서버 payload, duplicate-submit lock, 실패 draft, 신고/차단/삭제 권한과 callback을 공유 화면에서 유지했다. 화면 분리로 인한 상태 공유를 위해 새 session만 추가했으며 전역 댓글 상태 아키텍처를 교체하지 않았다.

## 4. Count와 데이터 계약

- preview 3개는 최상위 댓글만이며 자동 답글 본문은 없다. root page 10개, 각 root 초기 reply 최대 5개 일괄 조회, 추가 reply page 20개다.
- total은 기존 권한으로 볼 수 있는 active/non-deleted root + 해당 visible root 아래 reply의 수다. 삭제되거나 열람 불가한 root 아래 고립된 reply는 탐색 가능한 projection에서 제외한다.
- `댓글 N개 더보기`의 N은 total에서 현재 preview의 root 엔티티 수를 뺀 나머지다. 답글 수 배지는 표시된 엔티티가 아니다. 미확인 총수를 0으로 추정하지 않는다.
- session은 viewer/post/route session으로 격리한다. server cursor는 scope/sort/post/root/revision/boundary를 검사한다. 오래된 응답은 request epoch로 무시한다.
- 글 화면 왕복은 메모리에 보관된 목록·offset·선택·draft를 재사용한다. DB 읽음 기록과 영구 draft 저장은 없다. 앱 종료 후 임의 입력 내용 복구를 약속하지 않는다.
- 기존 comments RLS는 parent post visibility에 종속된다. 댓글 작성자 자체의 별도 차단 정책을 새로 추가하지 않았다. 기존 글 목록의 stored counter까지 바꾸지 않았다.
- 조회수 함수는 기존 정상 열람 계약을 유지하되 하나의 post session에서 중복 호출하지 않는다. 이번 설치 검증에서는 앱 화면을 열지 않아 Codex가 유발한 정상 열람 조회수 호출은 0이다.

## 5. Remote 반영과 검증

실제 linked project `grmekesqoydylqmyvfke`에 승인된 3개 함수를 반영했다. [작은 catalog/검증 metadata](nuri-community-discussion-redesign-2026-10-09-evidence/remote-validation.json), [사람이 읽는 최종 SQL](../sql/커뮤니티/커뮤니티-댓글-읽기-계약-최종.sql).

| Local 실행 이력 | Remote 기록 | 내용 |
| --- | --- | --- |
| `20261008145458_community_discussion_read_contract.sql` | `20261008145802` | 읽기 함수 3개 생성·권한 |
| `20261008151447_community_discussion_anchor_metadata.sql` | `20261008151513` | threads의 anchor root metadata 보완 |

Remote 적용 도구가 부여한 version과 local 파일 timestamp는 다르다. 이름/적용 내용의 대응을 명시하며 임의 migration repair는 하지 않았다. 운영 정의는 remote catalog가 source of truth다.

- 3개 함수 모두 STABLE/SECURITY INVOKER, anon·authenticated 실행 권한 확인. 공개 테이블의 기존 RLS를 우회하지 않는다.
- posts/comments RLS 8개 before/after 동일. 댓글 생성·soft delete·moderation queue·moderation action 4개 정의 hash 동일.
- 기존 데이터에 대한 anon 읽기: 정렬 15사례의 반환 상한 확인, boundary cursor 2사례에서 경계 제외 확인, reply anchor 5사례에서 올바른 parent 연결 확인.
- stale cursor·다른 scope cursor·없는 글 접근의 거절 확인. 사용자 콘텐츠 insert/update/delete 0, fixture 생성·role/프로필 변경 0.
- 현재 공개 fixture 중 root 10개 초과의 자연 발생 next page 사례는 0이다. 따라서 대형 multi-page runtime 검증으로 보고하지 않는다. authenticated blocked-viewer 별도 fixture E2E는 미실행이며 catalog 정책 보존과 구분한다.
- 반환량은 제한하지만 membership revision/정렬은 visible rows에 비례할 수 있다. 대량 댓글 query 지연·실행 계획과 장시간 native 성능은 미측정이다.

## 6. 로컬 검증

| 항목 | 결과 |
| --- | --- |
| TypeScript | PASS, 최종 noEmit exit 0 |
| Targeted ESLint | 25파일 오류 0, 기존 Notifications no-shadow 경고 1 |
| 대상 테스트 | 8 suites / 80 tests PASS |
| 최종 full suite | **195 suites / 1,996 tests PASS**, 실패 0 |
| Full suite 실행 수 | 2회, 둘 다 PASS. 마지막 route/표현 보완 후 재실행 |
| 이번 scope diff check | PASS |
| 전체 dirty diff check | 기존 unrelated EOF 공백 2곳 유지, 전역 PASS로 주장하지 않음 |

최초 대상 테스트에서 분리된 파일의 이전 source 검사 경로와 mock/표현 기대값 오류가 확인돼 실제 새 소유권에 맞게 고쳤다. 최초 실패 로그와 후속 통과 로그는 보존했다. 실패 expectation만 무력화하지 않았으며 전송 실패·rate-limit draft, duplicate lock, payload, shared session, late response, parser·SQL 상한 계약을 검사했다.

기존 공백 경고는 `docs/qa/nuri-glass-expenses-2026-10-08-evidence/eslint.log`와 `supabase/migrations/20261007074134_community_search_and_write_error_contract.sql`이다. 이번 범위 밖이므로 수정하지 않았다.

## 7. 빌드·설치 후보

| 항목 | 실제 결과 |
| --- | --- |
| Build | 증분 Release 1회, assembleRelease + bundleRelease, SUCCESS 3분 41초 |
| Install | install-r 1회, Success |
| APK | [nuri-community-comments-release.apk](/private/tmp/nuri-community-comments-20261009-002026/nuri-community-comments-release.apk) |
| APK SHA-256 | `82c293b818ddf9413bbf2638d82a0bf991fd83d42b1d8a8bdb39cfa8d8929651` |
| AAB | [nuri-community-comments-release.aab](/private/tmp/nuri-community-comments-20261009-002026/nuri-community-comments-release.aab), Store 제출 안 함 |
| AAB SHA-256 | `42a064fdae85a143c998c484e6a1250b4461bbf74ddaa6ff99f7f6f2de12728a` |
| 앱 | com.nuri.app, versionName 1.0 / versionCode 1, debuggable false |
| 검사 | APK signer 일치, JS bundle 내장, Metro 의존 없음, 설치 hash 일치 |
| 기기 | SM-S937N / R5CY613NMSY, Android 16 |
| 설정 | 1080x2340, density 450, 384dp, fontScale 1.0, THREE_BUTTON 유지 |
| 설치 식별 | UID 10402, 최초 설치 2026-06-02 19:16:57 유지 |
| 업데이트 | 2026-10-09 00:46:33 KST |

[빌드 결과](nuri-community-discussion-redesign-2026-10-09-evidence/build-result.json), [설치 결과](nuri-community-discussion-redesign-2026-10-09-evidence/install-result.json), [candidate runtime hashes](nuri-community-discussion-redesign-2026-10-09-evidence/candidate-source.json)로 source/산출물 관계를 남겼다. 빌드 중 runtime source 변화 0. clean Store RC가 아닌 미커밋 디자인 QA 후보다.

## 8. 보존과 미확인 경계

- [보존 결과](nuri-community-discussion-redesign-2026-10-09-evidence/preservation.json)에 HEAD/branch/index, 기존 tracked hashes, baseline untracked 존재, 이전 APK/AAB·config·signing, 빌드 후 runtime hashes를 기록한다.
- 기기 tap/swipe/앱 화면 실행/로그아웃/설정 변경 0. 로그인·선택 펫을 바꾸는 동작은 하지 않았다. 설치 후 화면상의 로그인·펫 상태는 **미확인**이며 직접 DB 전체 불변 감사로 확대하지 않는다.
- 이전 keyboard baseline의 정확한 gate와 승인 증거는 보존한다. 새 detail/comments route의 keyboard/open-close/Hangul/caret/selection/scroll 복귀는 PO 확인 대기다. 이전 K22/K23 PASS를 새 화면의 native PASS로 복사하지 않는다.
- 확대 글꼴 native 배치, TalkBack, iOS, 대량 댓글 네트워크 지연, 실제 post/댓글 삭제·차단·moderation E2E는 이번 실행에서 하지 않았다. 함수 catalog와 로컬 회귀 검사만 각각의 범위로 보고한다.
- cleanup/uninstall/clear data/계정 생성/테스트 댓글 저장/좋아요/신고/차단/콘텐츠 삭제/commit/push 없음. 기존 QA·이미지·current/rollback 산출물 보존, Store HOLD.

## 9. PO 확인 항목

1. **본문과 댓글 분리:** 댓글이 있는 글에서 본문 아래 preview 3개와 더보기 수, 댓글 전용 화면의 총수·정렬·답글 펼침을 확인한다. 댓글이 적은 글은 있는 만큼만 표시돼야 한다.
2. **왕복과 선택:** 댓글을 눌렀을 때 파란 강조와 인라인 답글 위치를 확인한다. 댓글 화면 Back은 이전 위치로, 본문 가기는 글 상단으로 돌아와야 한다. 작성 중인 내용은 전송하지 않고 왕복해도 유지돼야 한다.
3. **입력과 하단:** 일반 댓글과 인라인 답글에서 키보드를 연 채 스크롤하고 다시 돌아와 계속 입력한다. 한글·커서·선택 유지, 의도 없는 닫힘/자동 점프/하단 시스템 버튼 겹침이 없어야 한다. 실제 전송은 이 확인에 필요 없다.
4. **표현:** 현재 선택 글꼴, 본문·댓글 글자, 작은 칩/도구 여백, 계절 강조색을 확인한다. 알림에 기존 댓글 알림이 있다면 해당 댓글로 열리는지도 확인한다. 새 알림이나 QA 데이터를 만들 필요는 없다.

## 10. 최종 상태

IMPLEMENTATION: IMPLEMENTED_PENDING_PO_APPROVAL

REMOTE_READ_FUNCTIONS: APPLIED_AND_CATALOG_VERIFIED

LOCAL_VALIDATION: PASS_WITH_EXISTING_LINT_WARNING

BUILD_COUNT: 1

INSTALL_COUNT: 1

NATIVE_SCREEN_QA: PO_DIRECT_PENDING

DIRECT_CONTENT_MUTATION: 0

COMMIT: NO

PUSH: NO

CLEANUP: NO

STORE: HOLD

DEVICE_OWNER: PO

AUTO_START_NEXT_WORK: NO

MASTER_STATE: STOPPED_WAITING_FOR_PO_COMMUNITY_DETAIL_REDESIGN_REVIEW

PO 승인을 기다립니다.
