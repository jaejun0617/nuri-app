# NURI COMMUNITY PAGINATION + QA 100 POSTS REPORT

작성일: 2026-10-07 KST. PO 확인용 설치 후보이며 Store RC가 아니다.

Evidence root: `/private/tmp/nuri-community-pagination-qa-20261007-015104`.

## 1. Pagination UI

PREVIOUS_NEXT_COMPACT: PASS

FONT_SIZE: 13sp, lineHeight 18sp, fontWeight 600

HORIZONTAL_PADDING: 14dp

FIXED_WIDTH: NO

TOUCH_TARGET: minHeight 44dp, minWidth 44dp; 실제 S24 측정 높이 44.09dp, 360dp 화면 44dp

SHORT_LIST_BOTTOM_PLACEMENT: PASS

FIRST_PAGE_DISABLED: PASS

LAST_PAGE_DISABLED: PASS

변경 전 실제 source는 문구 없는 Chevron 18dp와 고정 너비 44dp였다. 변경 후 `‹ 이전   현재 페이지   다음 ›`를 Chevron 14dp·내용 너비·반경 6dp·얇은 테두리로 표시한다. 큰 그림자/elevation·강한 면색을 추가하지 않았다. 페이지 숫자는 기존 무배경·중앙 정렬·계절 accent를 유지한다.

disabled는 기존 공통 CTA의 전용 바탕 `#E8EBEF`·글자/아이콘 `#566271`·opacity 1·accessibilityState.disabled를 사용한다. 일반 상태는 neutral 바탕 `#F1F3F6`·글자 `#243042`이며 기존 button role/loading/콜백을 보존한다. 이전 스타일의 미사용 opacity 0.42 항목은 제거했다.

하단 footer 위치는 옮기지 않았다. 짧은/0건 목록은 남은 flex 공간 아래에 footer가 유지되고, 긴 목록은 기존 viewport 안에서 마지막 행까지 스크롤할 수 있다. footer는 측정된 Bottom Navigation 위에 고정된다. 게시글 카드·히어로·계절·하단 메뉴의 외형은 변경하지 않았다.

## 2. QA Batch

BATCH_ID: `community-pagination-qa-20261007-015104`

AUTHOR: SAFE_QA_ACCOUNT, 기존 고정 작성자 `adminQA`, 일반 사용자 role

INSERT_REQUESTED: 100

INSERTED: 100

PARTIAL_INSERT: NO

CATEGORY_DISTRIBUTION: question 25, info 25, daily 25, free 25

STORAGE_UPLOAD: 0

LIKES_CREATED: 0

COMMENTS_CREATED: 0

REPORTS_CREATED: 0

linked project `grmekesqoydylqmyvfke`만 사용했다. 기존 프로젝트-memory와 고정 QA 사용자 계약, remote profile/Auth 상태를 대조해 작성자를 유일하게 식별했다. 사용자 email/전화번호/전체 user UUID/비밀번호/토큰은 보고서에 노출하지 않는다. 신규 사용자·개인 사용자 계정·공지·인기 강제 지정·추천/조회 조작은 없다.

정상 schema/FK/check/default/RLS/guard/trigger를 직접 확인했다. 별도 QA marker column이 없어 제목 `[QA-PAGINATION-001]`~`[QA-PAGINATION-100]`, 본문 `QA_BATCH`·`QA_SEQUENCE`를 사용한다. 제목 100개·sequence 100개·created_at 100개가 고유하다. 한글 중심 짧은/중간/긴 제목, 1~4개 문단, 합성 QA 안전 문구가 있으며 실제 의료/반려동물 주장·개인정보·링크·외부 연락처·이미지는 없다.

승인된 admin SQL 연결의 단일 repeatable-read transaction에서 insert만 기존 QA actor의 transaction-local authenticated/RLS 문맥으로 실행했다. auth.uid 일치, 실제 insert 권한, content guard·rate guard·notice guard·image sync를 그대로 통과했다. RLS·trigger·moderation 비활성화나 우회용 함수/정책 변경은 없다. 삽입 건수 또는 보존 검사 실패 시 전체 rollback하도록 구성했다.

생성 시각은 요청된 정렬 검증 계약에 따라 transaction 시각 2시간 전부터 5분 간격으로 과거에 분산했다. sequence 001이 최신, 100이 가장 이전이다. 미래 시각과 기존 게시글 timestamp 변경은 없다. status/visibility/counter/image/pet 필드는 실제 정상 기본값을 사용했다. 모든 QA 행은 public/active/삭제 없음/공지 false/카운터 0/이미지 없음이다.

## 3. Count Verification

BASELINE_PUBLIC_POSTS: 3

FINAL_PUBLIC_POSTS: 103

DELTA: +100

BATCH_ROW_COUNT: 100

DUPLICATE_SEQUENCE: 0

MISSING_SEQUENCE: 0

EXISTING_POST_MUTATION: NONE

전체 posts는 784→884다. insert 전 marker 중복 0, author 최근 1시간 작성 0을 확인했다. 기존 784행의 title/body/status/count/updated_at을 포함한 전체 row hash가 삽입 직후와 최종 native QA 후에도 동일하다. 최종 batch의 invalidDefaults 0, uniqueTitles/uniqueTimestamps 100이다.

`baseline-count.json`, `post-insert-count.json`, `seed-preservation.json`, `remote-final-validation.json`이 증적이다. count 증가만으로 보존 완료라고 판정하지 않고 원본 row 전체 hash와 보호 테이블 전체 count/hash를 대조했다.

## 4. Pagination Validation

PAGE_SIZE: 30, QA 후 30으로 복구

EXPECTED_TOTAL_PAGES: 4 = ceil((3 + 100) / 30)

FIRST_PAGE: PASS

MIDDLE_PAGE: PASS

LAST_PAGE: PASS

NO_DUPLICATES: PASS

NO_MISSING_IDS: PASS

FILTER_REPAGINATION: PASS

실제 앱의 계산/이동은 기존 `community_list_posts_v3` cursor v4·hasMore·page history 계약이다. 전체 count 기반 pagination으로 새로 바꾸지 않았다. 4페이지 계산은 QA 기대값이다.

authenticated QA viewer의 실제 RPC를 모든 페이지에 걸쳐 읽기 전용으로 호출했다. all 30개 기준 30/30/30/13행, 103개 ID 고유, 누락 0, 첫 페이지 반복 동일·최신순 안정·마지막 hasMore false다. question/info/daily 각 25건, free 28건은 모두 1페이지이며 인기/공지 0건이다. 30/50/100/150/200개 옵션의 기존 조회 계약도 확인했다.

Galaxy S24 실제 검증:

| 흐름 | 확인 결과 | 증적 |
| --- | --- | --- |
| 1페이지 | 이전 disabled, 다음 활성, QA 001 시작 | `app-landing.png` |
| 2페이지 | 페이지 2, 양쪽 활성, QA 031 시작 | `page-2.png` |
| 3페이지 | 페이지 3, 양쪽 활성, QA 061 시작 | `page-3.png` |
| 4페이지 | 페이지 4, 다음 disabled, QA 091 시작 | `page-4.png` |
| 마지막 행 | QA 100과 기존 3건까지 도달, footer/toolbar 침범 없음 | `page-4-end.png` |
| 이전 복귀 | 4→3, QA 061부터 정상 재표시 | `return-page-3.png` |
| 질문 필터 | 3→1 보정, 질문 sequence만 표시, 양쪽 disabled | `question-page-1.png` |
| 0건 인기글 | 빈 상태 유지, 하단 footer 위치 동일, 양쪽 disabled | `empty-popular.png` |
| 개수 변경 | 50개 선택, 2페이지 QA 051 시작, 다시 30개 선택 시 1페이지 | `size-50-page-2.png`, `final-restored.png` |
| 좁은 폭·확대 글꼴 | 360dp/fontScale 1.3, 이전/숫자/다음 잘림/겹침 없음 | `compact-360-font-13.png` |

기본 384dp/fontScale 1.0과 360dp/fontScale 1.3의 footer 접근성 트리·실제 pixels를 함께 확인했다. 페이지 숫자 중앙·글자 parent 안 수용·44dp 터치·toolbar 간격이 모든 캡처에서 일치했다. 확대 상태에서도 글자 축소를 사용하지 않는다.

전체 ID 중복/누락 0은 remote RPC 전 페이지 walk 증적이다. native 캡처의 화면에 보이는 일부 행만으로 전체 ID 보존을 추정하지 않았다. nonzero 소수 행은 기존 local layout 테스트, 실제 native 0건은 하단 고정 캡처로 확인했다. 모든 4계절 native를 이번 compact 배치에서 반복하지 않았으며 자산/계절 resolver/히어로 source는 변경하지 않았다.

최종 화면은 전체 filter·전체 category·30개·1페이지, 화면 설정은 원래 450dpi/fontScale 1.0으로 복구했다. 삭제/저장/글쓰기/상세/댓글/좋아요/신고/로그아웃 조작은 하지 않았다.

## 5. Preservation

EXISTING_COMMUNITY_POSTS: PRESERVED

AUTH: PRESERVED

PROFILE: PRESERVED

PET: PRESERVED

RECORDS: PRESERVED

SCHEDULE: PRESERVED

STORAGE: PRESERVED

RLS: PRESERVED

MODERATION: PRESERVED

보호 22개 테이블의 insert 전/직후/최종 count와 전체 row hash가 일치한다. Auth users/identities, profile, pet, memory/images, schedule, weight, comments/likes/reports/blocks, moderation queue/actions, image assets, view events, XP, notification, Storage objects/buckets를 포함한다. posts RLS ON, 실제 정책 4개·trigger 6개 정의와 핵심 guard 함수 정의도 baseline과 동일하다.

UI runtime 변경은 `CommunityListScreen.tsx`와 `.styles.ts` 두 파일, 테스트는 `communitySeasonalList.test.tsx` 한 파일이다. 커뮤니티 원본 그림 4장의 APK decoded pixels가 동일하며 PostCard·query·store·계절 색·Bottom Navigation·AUTH/WEATHER/API를 이번 배치에서 수정하지 않았다. 기존 다른 dirty와 과거 문서 body는 유지한다.

## 6. Cleanup Readiness

INSERTED_ID_MANIFEST: CREATED

CLEANUP_PREVIEW: CREATED_NOT_EXECUTED

QA_POSTS_CURRENT_STATE: PRESERVED_FOR_PO_REVIEW

DELETE_NOW: NO

증적 루트에 `batch.json`, `inserted-post-ids.json`(이번 100개 row ID만), `inserted-post-manifest.json`, `baseline-count.json`, `post-insert-count.json`, `pagination-validation.json`, `cleanup-preview.sql`을 보존했다. seed는 일회성 SQL이며 repository에 production migration을 추가하지 않았다.

cleanup preview는 exact 100 IDs와 exact batch marker를 동시에 대조하고 예상 건수 100이 아니면 exception/rollback하도록 구성했다. READ-ONLY PREVIEW이며 DELETE 문이 없고 이번 작업에서는 preview 자체도 실행하지 않았다. 실제 정리는 별도 PO 승인과 그때의 관계 데이터 계약 확인 후 진행한다. broad delete·기존 게시글 초기화·QA 사용자 제거는 금지다.

## 7. Validation

TYPESCRIPT: PASS

ESLINT: 0 errors / 0 warnings, 대상 12파일

TARGETED_TEST: 9 suites / 289 tests PASS

FULL_SUITE: 180 suites / 1,801 tests PASS, 1회

GIT_DIFF_CHECK: PASS

DB_INSERT_VALIDATION: PASS

INSERTED_BATCH_COUNT_100: PASS

GALAXY_S24: PASS, SM-S937N, 이번 pagination 범위

INCREMENTAL_RELEASE: PASS, 1회, 236.016초

GRADLE_REUSE: 995 tasks, 61 executed / 934 up-to-date

GALAXY_S24_INSTALL_R: PASS, 1회, 15.309초

FATAL: 0

ANR: 0

RN_FATAL: 0

최종 접근성 assertion 추가 전후 대상 검증 2회는 모두 통과했고 전체 테스트는 1회 통과했다. 커뮤니티 store·category/query·write/read policy·필터·계절·공통 버튼·아이콘 테스트를 포함한다. 과거 광범위 CTA 문제의 재구현이나 frozen 도메인 수정은 하지 않았다.

APK: `nuri-community-seasonal-qa-9bc70167.apk`

SHA-256: `9bc70167ad23f12a6fcac3ef392e0205da3cc7f8f394618af7761ae5b3a8b42a`

Source fingerprint: `7a987469471912b5cebe13b9f9d504cf4acad7c3573cde5dc993b89ce987c711`

Input fingerprint: `514fb51d1a2b17594cc4d29342a9bced453e3371d96b57aea602a7cf82584821`

source/input/서명/bundle/font 검증과 설치 hash·UID·최초 설치 시각 보존은 PASS다. uninstall/clear data/reset을 수행하지 않았다. Metro/Fast Refresh OFF, build/cache/기존 APK·증적 보존, CLEANUP NO.

로그 0은 2026-10-07 01:57:57~02:15:19 KST 이번 QA 시간대의 앱 FATAL/ANR 및 React Native fatal marker 기준이다. 전체 과거 안정성·장기간 성능·iOS 검증으로 확대하지 않는다. 민감정보 보호를 위해 전체 기기 로그는 저장하지 않고 집계 증적 `native-log-summary.json`만 남겼다.

최초 guessed launcher 호출과 로그 date 인자 오류는 각각 실제 런처 resolve·단일 date 인자로 보완했다. 앱/DB 콘텐츠 변경은 없었고 추가 build/install은 하지 않았다. build의 기존 Gradle/Android deprecation과 NO_COLOR/FORCE_COLOR warning은 보존하며 실패로 숨기지 않았다.

## 8. Git

HEAD: `aab0517e417d6dbc985d4e49af0942d34ae9b224`

BRANCH: `codex/task6-community-content-policy`

STAGED: NONE

COMMIT: NO

PUSH: NO

UNRELATED_DIRTY: PRESERVED

project-memory 4파일·release-checklist·리서치에는 이번 후보 상태/이유/QA 보존 경계만 독립적인 상단 block으로 추가했다. 이전 body와 기존 후보 자료를 덮어쓰지 않는다. 실제 최종 보존 결과는 `final-preservation.json`에서 source/body/자산/산출물/Git 동일성으로 별도 기록한다.

## 9. Final State

PAGINATION_COMPACT_UI: IMPLEMENTED_PENDING_PO_APPROVAL

COMMUNITY_QA_POSTS: 100_INSERTED_AND_PRESERVED

QA_POST_CLEANUP: DEFERRED_UNTIL_PO_APPROVAL

PO_VISUAL_APPROVAL: PENDING

FUNCTIONAL_BLOCKERS: NONE, 이번 지정 범위

AUTH: COMPLETE_FROZEN

WEATHER: COMPLETE_FROZEN

API: COMPLETE_FROZEN

STORE: HOLD

AUTO_START_NEXT_WORK: NO

MASTER_STATE: STOPPED_WAITING_FOR_PO_COMMUNITY_REVIEW

다음 즉시 액션은 PO COMMUNITY REVIEW 하나다. 전체 커뮤니티 디자인 최종 승인·다른 기기/iOS·native nonzero 소수 목록·글꼴 1.5·장기간 동작은 이번 검증 범위 밖이며 이번 결과로 자동 승인하지 않는다. QA 삭제·커밋·푸시·cleanup·새 build/install·다음 디자인은 별도 PO 지시 전 시작하지 않는다.

PO 승인을 기다립니다.
