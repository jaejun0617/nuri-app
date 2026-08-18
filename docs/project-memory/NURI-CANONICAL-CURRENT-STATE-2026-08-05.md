# NURI Canonical Current State

기준일: 2026-08-05 KST

## 저장소 기준선

감사 당시 runtime baseline: `c691bb7`

최초 canonical/handoff publication: `8975ba7`

현재 실제 작업 시작 HEAD는 이 문서에 영구 고정하지 않는다. 각 room이 시작할 때 `git rev-parse HEAD`로 확인한다.

### 앱

- actual HEAD: room 시작 시 Git으로 확인
- branch: `codex/task6-community-content-policy`
- origin과 ahead/behind: `0 / 0`
- 현재 dirty 변경: 날짜 입력 5개 runtime/test 파일, Home 1개, project-memory 3개, 리서치 1개
- 이번 audit은 위 변경을 수정·stage·삭제하지 않았다.

### 관리자 웹

- repo: `/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri-web`
- HEAD: `5027caee2212ceca54dfe02270cc3ccdf76e32a3`
- branch: `main`
- origin과 ahead/behind: `0 / 0`
- worktree: clean

## 구현 상태

- Auth, Pet/Profile, Home, Records/Timeline, Weather, Animal Hospital, Community, Notifications, Guides, Schedules, Location/POI, More와 관리자 웹의 주요 runtime surface가 존재한다.
- Home은 전체 누적 요약, 최근 기록, 자주 쓰는 기록, 날씨, 프로필 영역을 사용한다. 최근 Home/프로필 수정은 현재 dirty 상태이므로 clean release 기준선으로 보지 않는다.
- Timeline은 `TimelineEntryGate`, entry generation, FlashList generation, 전체 필터 조회 경로를 HEAD에 포함한다. 최근 빠른 재진입 수정은 코드상 반영되어 있다.
- 날짜 직접 입력은 `DatePickerModal` 공통 경로와 펫 등록·프로필 수정에서 dirty 변경으로 존재한다. 아직 이 audit commit에 포함하지 않았다.
- Supabase migration 53개가 repo에 있으며 linked remote migration list와 dry-run이 일치한다.
- 관리자 웹은 인증·운영·콘텐츠·병원·가이드·알림 관련 route가 존재한다.

## 검증 상태

- 앱 TypeScript: 통과
- 앱 ESLint: 통과
- 앱 Jest: 71 suites / 310 tests 통과
- 관리자 TypeScript: 통과
- 관리자 ESLint: 통과
- 관리자 테스트: 14 tests 통과
- 관리자 production build: 통과
- `git diff --check`: 통과
- Supabase `db push --dry-run`: remote up to date
- Supabase remote table stats: read-only 확인
- full remote policy/RPC catalog dump: Docker daemon 부재로 미확인
- Android cold start: `com.nuri.app` launch 확인, app-scoped fatal marker 없음
- Android baseline APK: versionName `1.0`, versionCode `1`, SHA-256 `34d9f90006926688274f41a62c3e5fcdf019b3b3571626713c2ffbdffff9754b`

## 출시 상태

현재 상태는 기능 개발과 일부 QA가 진행된 release-candidate 전 단계다.

- dirty runtime 변경 때문에 현재 APK는 clean source provenance가 아니다.
- Play Store 제출 자산과 clean RC provenance는 아직 별도 release gate다.
- Android QA 기준은 model code `SM-S937N`, adb serial `R5CY613NMSY`, Android 16이다. market name은 검증되지 않았으므로 병기하지 않는다.
- Android 전체 smoke와 이전 작업별 증적은 존재하지만, 이번 audit에서는 destructive CRUD를 재수행하지 않았다.

## 정책 기준

- 최종 social login 정책은 Google ON, Kakao ON, Naver 완전 제거, Apple OFF다.
- Naver 관련 app-side/config/helper/provider 잔존은 정책 재결정 대상이 아니라 AUTH-001 제거 작업의 미완료 증적이다.
- Apple은 Android-first v1.0 public surface에서 제외한다.
- Candidate/Trust/User 경계와 Community moderation 경계를 유지한다.
- 산책 POI는 자체 POI/PostGIS 및 운영 검수 경로를 우선하며, 공용 Kakao 경로가 모든 장소 도메인에서 제거됐다고 단정하지 않는다.

## 다음 기준

1. dirty 날짜 입력·Home 변경을 각 소유 방에서 분리 검증하고 commit한다.
2. Home 전체 요약과 Timeline의 장기 누적·필터·고속 re-entry를 clean APK에서 다시 닫는다.
3. Naver 잔존물을 NURI-01 → NURI-09 → NURI-12 순서로 제거·검증한다.
4. Supabase remote policy/RPC/grant catalog의 직접 read-only 증적을 확보한다.
5. clean release artifact와 실제 운영 gate를 분리해 판정한다.

## 2026-08-18 Home CommunitySection reconciliation

이번 섹션 상태는 과거 디자인 dispatch보다 실제 repository와 QA evidence를 우선한다.

- current local HEAD: `4a0bf1f2ef845204e12c38801fef6acc8dca262e`
- branch: `codex/task6-community-content-policy`
- origin branch는 dependency corrective commit 이전의 `0b22f8af1a0d04cd9cd53517332c33cf5ea74aa2`이며, dependency commit push 여부와 feature 완료 여부를 섞지 않는다.
- `CommunitySection`은 `LoggedInHome.tsx`에서 TodayPhoto 다음, RecommendationTips 이전에 실제 렌더된다.
- Home tabs는 `인기·질문·정보·일상·자유`이며 `community_home_highlights_v1()`에 `all/question/info/daily/free`를 전달하고 `p_limit=3`을 사용한다.
- Home highlights는 서버의 `like_count DESC, created_at DESC, id DESC` 및 threshold-free 계약을 사용한다. client full-table fetch와 client ranking은 없다.
- Home CommunitySection 구현, navigation, controlled ranking, Home Android feature visual QA는 완료로 동결한다.
- feature visual QA는 dirty worktree APK evidence이며 clean signed release validation이 아니다.
- NURI-12 release signing은 `RELEASE_SIGNING_BLOCKED_EXTERNAL_INPUT`으로 격리한다. signing credential 공급 전까지 dependency/source validation과 Home CommunitySection을 반복하지 않는다.
- 좁은 residual risk는 CommunitySection의 중복 `items.slice(0, 3)`와 blocked-user 관계의 별도 정책 증적 미확인이다. 이는 전체 feature 재오픈 사유가 아니다.

## 2026-08-18 Release closeout reconciliation

- current local/origin HEAD: `9f49bfb707cc078bfc135facc1b1d8debf1e23a4`
- NURI-02 DatePicker/Pets closeout: `babe785`, `DATE-001 CLOSED`
- NURI-01 Auth app-surface closeout: `fc96bfd` 및 `9f49bfb`, `AUTH-001_APP_SURFACE CLOSED`
- 현재 Auth 정책은 Google/Kakao ON, Naver OFF, Apple OFF다. Current runtime/config/dependency/route/helper 문서에서 Naver 노출은 제거됐다.
- Remote Auth provider 상태는 `UNVERIFIED_NON_BLOCKING`이며 NURI-09 supporting read-only 확인 대상이다. 이를 Auth app-surface blocker로 다시 열지 않는다.
- NURI-04 Timeline이 다음 단일 write closeout 대상이다.
- NURI-12 signing 및 signed RC Auth regression은 별도 release gate로 유지한다.

## 2026-08-18 Timeline closeout reconciliation

- Timeline current implementation과 과거 generation/entry gate 수정이 일치하며 `TIMELINE-001_IMPLEMENTATION CLOSED`로 판정했다.
- entry identity, entry/list generation, latest-wins stale guard, filter/category state, loading/empty/error gate, count source, scroll reset, navigation/back/detail return이 focused tests와 기존 Android evidence로 확인됐다.
- Home totalRecords와 Timeline all count는 일기·명시적 미분류 데이터의 포함 범위가 달라질 수 있다. 이는 Timeline 구현 결함이 아니라 별도 Home count contract risk다.
- Timeline의 current-source physical QA와 clean signed RC QA는 NURI-12 책임으로 남긴다.
- 다음 단일 write closeout 대상은 NURI-06의 `COMMUNITY-POLICY-001`이다.

## 2026-08-18 Community visibility policy decision

- v1.0 authenticated feed policy: 사용자가 다른 사용자를 차단하면 두 사용자 사이의 public Community post row는 Home highlights와 Community list에서 서로 노출하지 않는다.
- block relation은 방향을 저장하되 feed visibility는 상호 적용한다. 자기 자신 차단은 금지하고 동일 관계 중복은 금지한다.
- block/unblock은 본인 계정의 authenticated RLS 경로만 허용한다. service-role을 앱 세션으로 사용하지 않는다.
- anonymous public feed 요청은 현재 public feed 계약을 유지하며 개인별 block filter를 적용하지 않는다. authenticated 앱 feed는 `auth.uid()` 기준 visibility helper를 적용한다.
- `COMMUNITY-POLICY-001`은 정책 결정 완료 후 NURI-09 targeted SQL/RLS/RPC implementation 및 negative contract test 대기 상태다.

## 2026-08-18 Community block backend closeout

- NURI-09 additive migration `20260818100000`과 SQL contract test는 remote/local lineage, RLS, grants, function security, Home/List mutual feed predicate까지 완료했다.
- `COMMUNITY-POLICY-001_BACKEND`는 완료했지만 authenticated block row가 0건이다.
- Community detail read path는 Home/List predicate를 재사용하지 않으므로 detail block visibility는 별도 정책·계약으로 남긴다.
- NURI-06 block action integration은 `fcf4cdd`에서 완료됐고, 사용자 차단·차단 해제·차단 사용자 관리·feed cache invalidation 경로를 구현했다.

## 2026-08-18 Community block controlled visibility closeout

- current local/origin HEAD: `3a400919e32f0392b650e3d39aa9246ecbb19943`; QA 실행 자체는 code change 없이 진행됐다.
- QA-A/B/C의 authenticated identity/profile/role/read 계약과 block path read가 통과했다.
- A→B 및 B→A 각각의 단방향 relation에서 Home/List의 상호 비노출, unblock 후 양방향 재노출, unrelated C의 지속 노출을 controlled QA로 확인했다.
- block relation은 최종 0/0으로 정리됐고, 새 marker 3개는 soft-hide되어 active/public 잔류가 없다. 기존 fixture와 이전 marker는 변경하지 않았다.
- `COMMUNITY-POLICY-001_BACKEND`, `COMMUNITY-POLICY-001_HOME_LIST`, `COMMUNITY-BLOCK-ACTION-001_IMPLEMENTATION`, `CONTROLLED_BLOCK_VISIBILITY_QA`는 완료다.
- Home 대상 게시글은 `p_limit=3` ranking에서 관찰되지 않았으므로 Home target runtime의 직접 관찰은 미확인이다. 이는 ranking 변경이나 실패 증거가 아닌 비차단 관찰 공백이다.
- Android block action UI QA와 clean signed RC QA는 NURI-12 책임으로 남긴다. Detail direct-read block 정책은 `COMMUNITY-DETAIL-001` 별도 정책 검토로 유지한다.
- Home CommunitySection은 계속 `FEATURE_COMPLETE/FROZEN`이다.

## 2026-08-18 Admin production operator closeout

- Admin repo `nuri-web`는 `5027cae`에서 clean이며 runtime source 기준은 `bb840f857574`다. 이번 closeout은 코드 변경 없이 기존 운영 surface와 evidence를 검수했다.
- `ADMIN-001`은 `CLOSED_WITH_NON_BLOCKING_RESIDUAL`이다. operator access, non-admin denial, protected route, user/reports/moderation, notification-safe path, hospital contract, audit/undo, secret exclusion을 확인했다.
- production mutation, bulk mutation, hard delete, broadcast, actual push는 실행하지 않았다.
- MFA enrollment/recovery, external monitoring/custom domain, Guides CMS production write smoke, hospital operator fixture QA, protected-route 원래 target 보존은 비차단 residual이다. 필요 시 별도 후속 작업으로 분리하며 v1.0 blocker로 승격하지 않는다.
- NURI-12 signing blocker는 계속 독립적으로 격리한다.

## 2026-08-18 Schedule, Health, Activity release closeout

- current app local/origin HEAD: `a2685d42297e0c6fb84d539c801fa787ffbdad10`; NURI-05 commit `a2685d4`가 push됐다.
- Schedule v1 범위는 목록·상세·생성·수정·삭제·완료·날짜/시간·반복·local reminder이며 implementation은 통과했다.
- Health v1 범위는 HealthReport records/weight/report와 건강 기록, 체중, 병원·약 일정이며 implementation 및 data integrity는 통과했다.
- 건강 일정 편집에서 `medicine/hospital/vaccine` subtype이 `checkup`으로 덮어써지던 데이터 의미 손실을 최소 수정과 회귀 테스트로 닫았다.
- focused tests 5 suites/31 tests, TypeScript, 변경 범위 ESLint가 통과했다. full Jest와 controlled mutation은 실행하지 않았다.
- NURI-05 current-source Android QA는 protected signing input 부족으로 NURI-12에 위임한다. 기존 Android evidence는 feature evidence로만 재사용하며 final signed RC QA와 섞지 않는다.
- Activity·칭호 화면은 현재 도달 가능하지만 v1.0 필수 범위가 아니며 `DEFER_TO_V1_1`로 분리한다. Timeline, Weather Activity Record, Walk POI는 각 소유 Room 범위를 유지한다.
- NURI-05는 `RELEASE_CLOSEOUT_COMPLETE`이며 다음 독립 release triage 대상은 NURI-07 알림·운영메시지다.

## 2026-08-19 Notifications and operational messages release closeout

- current app local/origin HEAD: `e56cd1cf61a7dcc2eb89b5a66578d21a91798357`; NURI-07 stale response guard와 회귀 테스트가 push됐다.
- Notification Center의 user notification/announcement 목록, 읽음·dismiss, loading/empty/error/retry/refresh, 재진입과 comment target fallback을 확인했다.
- 최신 요청 우선, mutation revision, unmount/session 전환 후 늦은 응답 폐기 결함을 최소 수정과 focused tests로 닫았다. focused tests 5 suites/20 tests, TypeScript, 변경 범위 ESLint가 통과했다.
- Schedule local reminder는 구현되어 있으나 current-source Android QA는 NURI-12 signing 이후 수행한다. Notification Center와 local reminder Android evidence는 final signed RC와 구분한다.
- Remote Push provider, token 발급, broadcast/segment/send는 v1 정책상 비활성이다. 실제 Push enablement은 v1.1 이후 별도 승인 범위이며 이번 closeout에서 변경하지 않았다.
- 50건 window를 넘는 unread count 표시 차이와 Community block 이후 in-app notification suppression 정책은 비차단 residual/policy review로 유지한다.
- NURI-07은 `CLOSED_WITH_NON_BLOCKING_RESIDUAL`이며 다음 독립 release triage 대상은 NURI-08 장소·산책·펫여행이다.
