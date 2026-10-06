# NURI Community Autumn Approval Freeze Report

작성일: 2026-10-07 KST. 최신 PO 지시의 마지막 하단 보완을 적용하고 커뮤니티 가을 디자인을 승인 동결한다. 새로운 디자인 작업 또는 Store 출시 승인이 아니다.

## 1. 착수와 범위

- 시작 HEAD: `aab0517e417d6dbc985d4e49af0942d34ae9b224`.
- 이번 새 runtime 수정은 Community 화면/스타일 2파일, 테스트 1파일이다. 누적 커뮤니티 구현과 필요한 navigation/context/이미지/테스트/기존 QA 보고서 26파일을 선별 커밋했다.
- Source of truth: 최신 PO 지시, 실제 화면과 코드, 직전 하단 간격 보고서. engineering 3문서·project-memory 4문서·routing 정책을 확인했다.
- 히어로/게시글 행/필터/조회/페이지 계산/30개 선택/댓글/좋아요/신고/moderation/Auth/Weather/API는 이번 마지막 corrective에서 변경하지 않았다.

## 2. 이전과 변경

| 대상 | 이전 | 최종 |
| --- | --- | --- |
| Pagination 상단 | hairline borderTop | borderTop 제거 |
| 작성 버튼 | footer 높이 + 12 + 12dp 위 | viewport bottom 12dp, pagination과 같은 하단 band |
| 맨 위로 버튼 | 작성 버튼과 함께 높은 위치 | 동일 그룹으로 약64dp 하향, 사이 gap12dp 유지 |
| 작성 디자인 | 48dp 계절 Primary·흰 plus24dp | 동일 유지 |
| Footer | 마지막 게시글 다음, bottom12dp | 동일 유지, 별도 큰 spacer 없음 |

footer 높이 측정 state/handler도 더 이상 사용하지 않아 제거했다. pagination의 위치를 absolute/sticky로 바꾸지 않았다. 기존 마지막 게시글의 구분선은 행 UI이므로 유지한다. 인기글/공지에서는 기존 정책상 작성 FAB가 숨겨지며 이 정책을 확대하지 않았다.

## 3. 검증과 설치

- TypeScript PASS. 커뮤니티 커밋 대상 lint 0 errors/0 warnings. 통합 대상 lint에는 보존된 Timeline no-shadow 경고2개만 있으며 새 issue0.
- 관련13 suites/313 tests PASS. 이번 로컬 전체180 suites/1,810 tests PASS 1회. source/relative-import/secret guard PASS, diff check PASS.
- 증분 Release 1회: 241.522초, 995tasks 중61 executed/934 up-to-date. 원본4장 decoded pixels와 source/input fingerprint MATCH.
- Galaxy S24 SM-S937N install-r 1회: 15.263초. UID/최초 설치/설정과 설치 APK hash MATCH. uninstall/clear-data/clean/Metro/Fast Refresh 없음.
- Native 첫→중간→마지막4페이지/이전 복귀·질문25건·인기글0건 PASS. 360dp/fontScale1.5,384dp/1.0/1.3,약430dp/1.0 대표 조합 PASS. 원래450dpi/fontScale1.0·전체/전체/30개/1페이지로 복구.
- 실측 마지막행→pagination 11.94~12.09dp, pagination→toolbar15.64~16dp, 작성→toolbar11.94~12.09dp. 중앙 숫자·44dp touch·문구 containment·하단 버튼끼리 겹침 없음.
- 두 우측 버튼은 기존 default capture보다 top 좌표181px, 약64.36dp 내려왔다. 작성 size의1px 차이는 native 정수 반올림이다.
- 03:34:08~03:38:38 KST bounded UI 로그 FATAL0/ANR0/RN_FATAL0. raw log/token/정밀 GPS는 증적에 저장하지 않았다.

APK: `/private/tmp/nuri-community-autumn-closeout-20261007-032614/nuri-community-seasonal-qa-4d46d0bb.apk`.

SHA256: `4d46d0bb7cfffe17f12e4ded3eae25a385109c5280456e916a12e6ed56e7deb9`.

## 4. 데이터와 보호

- linked `grmekesqoydylqmyvfke`에는 읽기 전용 감사만 수행했다. SQL write/새 seed/삭제/migration/정책 변경 없음.
- QA batch `community-pagination-qa-20261007-015104`:100건,각 카테고리25건,sequence001~100. batch 및 기존784행 전체 hash 일치, 전체884/공개103 유지.
- 콘텐츠/Storage 등 나머지21보호영역 count/hash 및 RLS4/trigger6/핵심함수4 MATCH. `auth.users`는56건 동일하지만 전체 행 hash 변동이 있었다. 정확한 변경 컬럼은 미확인으로 남긴다. 로그인/로그아웃/계정 변경/명시적 Auth mutation은 하지 않았으며 이를22영역 전체 hash 일치로 보고하지 않는다.
- 기존100개 ID manifest와 cleanup-preview를 보존한다. preview 실행/QA 게시글 삭제 NO.
- 이전 Timeline 후보와 그3개 dirty 파일은 보존·커뮤니티 커밋 제외. 설치 APK는 기존 Timeline 후보까지 포함한 디자인 검토 설치본이지 clean committed Store RC가 아니다.
- Android build/.cxx/.gradle·Gradle cache·과거 APK·증적·원본·그 외 dirty 보존. Cleanup NO. 여유공간 시작27.88GiB, 설치·증적 후 약26.76GiB.

## 5. Git과 승인

- Branch: `codex/task6-community-content-policy`.
- 커뮤니티 소스 closeout: `0c075cc90911a876900fa9a8d05419bb42a6b646`.
- 소스 commit/push 완료, 실제 origin SHA 일치 확인. 승인 문서에는 커뮤니티 블록만 선별해 기존 무관한 문서 변경을 제외한다.
- 최종 문서 commit/origin/CI 결과는 동일 evidence root의 `git-closeout.json`과 `ci-final.json`이 소유한다. 이 보고서의 소스 commit은 위 고정된 구현을 가리킨다.

## 6. 경계와 최종 상태

- COMMON_LAYOUT: 이번 승인 변경 유지. 겨울/봄/여름 원본·분기/effectiveSeason 보존, 이번에 다른 계절 시각 승인이나 전역 가을 강제를 만들지 않는다.
- 확대 글꼴에서 기존 Bottom Navigation 라벨 밀집과 맨 위로 overlay의 행 오른쪽 일부 가림은 보존 범위 관찰이다. 360dp/1.5의 다음 버튼과 작성 touch 영역 간격은 약2.33dp이며 서로 겹치지 않는다. 다른 기기/iOS·전체 폭×글꼴·다자리 페이지와 FAB 동시 native matrix는 미검증이다.
- 원래 계절 hero bitmap 내부 글자도 기존 원본을 보존했다. 등록·게시글 상세 실행은 데이터/조회수 보호로 미실행이다. 권한/callback은 기존 회귀 테스트로 확인했다.
- COMMUNITY_AUTUMN_DESIGN: COMPLETE_FROZEN. AUTH/WEATHER/API: COMPLETE_FROZEN.
- QA_POSTS: PRESERVED. BUILD_OUTPUTS: PRESERVED. CLEANUP: NO. STORE: HOLD.
- AUTO_START_NEXT_WORK: NO. NEXT_STATE: WAITING_FOR_PO_NEXT_DESIGN_DIRECTION.

Evidence root: `/private/tmp/nuri-community-autumn-closeout-20261007-032614`. 대표 캡처: `walk-page-1-end.png`, `walk-page-4-end.png`, `empty-popular.png`, `compact-360-font-15.png`. 이전 승인대기 보고서는 이력으로 보존하며 가을 작업을 자동 재개하지 않는다.

다음 디자인 지시를 기다립니다.
