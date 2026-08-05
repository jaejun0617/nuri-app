상태: Historical / Superseded
현재 source of truth가 아님
보존 목적: 과거 진행률 판단과 작업 이력
최신 기준: docs/project-memory/NURI-CANONICAL-CURRENT-STATE-2026-08-05.md

---

# NURI 앱 전체 진행률 최종보고

## 2026-07-22 날씨 안전 안내·펫 이름 하드코딩 버그 최종 closeout

이번 작업은 기존 closeout criterion을 다시 열어 기능 분모를 늘린 작업이 아니라, 날씨 사용성에 대한 additive 개선과 실제 문구 버그 수정이다. 홈 카드와 상세 화면에서 현재 기온·체감온도를 사용해 27℃/30℃/33℃ 이상 더위와 0℃/-5℃ 이하 추위를 단계 안내하며, 비·눈·천둥 상황도 행동 가이드로 안내한다.

`adminQA` 펫 이름은 `AdminQAPet`인데 비 시나리오 문구가 `누리와`로 나타난 원인은 시나리오 문자열의 브랜드명 하드코딩이었다. 앱은 다른 펫 이름을 자동으로 `누리`로 바꾸는 구조가 아니며, 해당 하드코딩을 일반 문구 `아이와`로 제거하고 회귀 테스트를 추가했다.

최종 release APK SHA-256은 `00fece6b5300524e58142ab6908e486418162954d898c1180de69e0ee7cc4d92`다. 실기기 홈에서 `AdminQAPet`, `오늘은 AdminQAPet와...`, `비 오는 날 주의`, 상세 펫 이름·비·더위 안내와 Android back을 확인했고, Jest `67 suites / 268 tests`, typecheck/lint/build/install이 통과했다. Supabase remote schema/RPC/RLS/seed는 변경하지 않았다.

기능 `78/78`, QA·보안 `59/59`, 문서·release `21/21`의 기존 분모와 100% closeout 판정은 유지한다. 수익화 구독·광고는 구현하지 않았으며, 무료 핵심 기능과 반복 가치 검증 후 별도 PO 승인으로 진행할 의사결정 트랙이다.

## 2026-07-22 대댓글 정렬 수정 및 남은 리스크 재판정

기존 criterion denominator는 변경하지 않았다. 기능 `78/78`, QA·보안 `59/59`, 문서·release `21/21`이며 최신 APK SHA-256은 `6b5e22a3e9dcde258570fd27061222731f2651ce57c389b17fa12f066e2be255`이다. Jest `66 suites / 257 tests`, typecheck/lint/release build/install, Supabase dry-run, Android app-fatal scan 0을 확인했다. Hospital public active `5,427건`, coordinate missing `122건`, `(0,0)` `0건`은 품질 추적 리스크로만 남겼고 actual push는 정책상 비활성 범위에서 제외했다.

## 2026-07-22 답글 target·댓글/알림 visual evidence 보강

이번 작업은 신규 기능 criterion을 늘리는 작업이 아니라 기존 댓글 알림 계약의 답글 target과 최신 UI evidence를 보강한 closeout이다. Home 알림 overlay의 차분한 밀도, 댓글 thread 외곽 border, `답글쓰기` 아래 nested reply 배치를 최신 release APK에서 확인했다. controlled top-level 댓글과 1-depth 답글 알림 모두 `unreadDelta 1`, 작성자·게시글 문구, `postId/commentId` target, 인앱 노출을 통과했다.

| 분류 | 적용 | 완료 | 조건부 | 미완료 | 제외 | 진행률 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 기능 구현 | 78 | 78 | 0 | 0 | 11 | 100% |
| QA·보안 | 59 | 59 | 0 | 0 | 7 | 100% |
| 문서·release | 21 | 21 | 0 | 0 | 3 | 100% |

가중 진행률은 `100*0.55 + 100*0.35 + 100*0.10 = 100%`다. 최신 APK SHA-256은 `c61972c0e1c170f310701894c83dd18cf334cf424603de09eb5f3be13db5623d`, Jest는 `66 suites / 257 tests`다. QA 종료 후 active QA comment row `0건`, Supabase remote up to date, app-fatal scan 0건을 확인했다.

관리자 홈페이지 단계별 본구현은 종료 상태다. 이후 관리자 작업은 운영 장애·보안 패치·실제 회귀 수정으로 제한하며, 앱 본 프로젝트는 운영 반복 release gate와 별도 PO 승인 트랙만 남긴다.

## 2026-07-22 댓글 알림 target deep link 반영

댓글 알림을 누르면 대상 게시글의 본문 시작이 아니라 해당 댓글 또는 답글 위치로 바로 이동하도록 구현·검증했다. `get_user_notifications_v2`가 안전한 target ID를 제공하고, 앱은 부모 thread를 확장한 뒤 대상 row를 강조한다. target이 없거나 숨겨진 경우에는 게시글 상세 fallback을 사용한다.

| 분류 | 적용 | 완료 | 조건부 | 미완료 | 제외 | 진행률 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 기능 구현 | 78 | 78 | 0 | 0 | 11 | 100% |
| QA·보안 | 59 | 59 | 0 | 0 | 7 | 100% |
| 문서·release | 21 | 21 | 0 | 0 | 3 | 100% |

가중 진행률은 `100*0.55 + 100*0.35 + 100*0.10 = 100%`다. 최신 release APK SHA-256은 `11aa59e2f75e792b280437cab052c306c165d1d252fa3fe9abb6762473a64d0f`, Jest는 `66 suites / 257 tests`다. Supabase navigation target migration은 additive로 remote 적용했고 dry-run은 up to date다.

Android `SM_S937N / R5CY613NMSY`에서 실제 댓글 알림을 눌러 대상 댓글이 viewport에 노출·강조되는 것을 확인했다. actual push, broadcast, hard delete는 계속 비활성이다. 관리자 홈페이지 단계별 본구현은 종료 상태이며 앱 본 프로젝트 blocker가 아니다.

## 2026-07-22 커뮤니티 추가 승인 범위 반영

커뮤니티 밀도형 목록, 타인 댓글 인앱 알림, 댓글 수 파생 집계 동기화를 기능 criterion 3건으로 추가해 완료했다. 목록 visual, 타인 조회수 증가/dedupe, 타인 댓글 Home 알림, QA soft cleanup/count 복원을 QA criterion 4건으로 추가해 실기기와 remote에서 완료했다.

| 분류 | 적용 | 완료 | 조건부 | 미완료 | 제외 | 진행률 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 기능 구현 | 77 | 77 | 0 | 0 | 11 | 100% |
| QA·보안 | 58 | 58 | 0 | 0 | 7 | 100% |
| 문서·release | 21 | 21 | 0 | 0 | 3 | 100% |

가중 진행률은 `100*0.55 + 100*0.35 + 100*0.10 = 100%`다. 현재 승인 범위의 P0/P1은 0건이다. 상세 현황과 비차단 리스크는 `docs/reports/NURI-앱-전체-작업현황-및-잔여리스크-2026-07-22.md`를 따른다.

## 2026-07-19 최종 승격

최신 release APK `0d598322d5cd6463582ab3e17d93a9d0bc81e44ce7d7eec5fa45efbcb74fabe4` 기준으로 Google/Kakao clean cancel·성공, 전체 일반 사용자 입력 surface, notification account isolation 및 전체 release regression을 완료했다.

| 분류 | 적용 | 완료 | 조건부 | 미완료 | 제외 | 진행률 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 기능 구현 | 74 | 74 | 0 | 0 | 11 | 100% |
| QA·보안 | 54 | 54 | 0 | 0 | 7 | 100% |
| 문서·release | 21 | 21 | 0 | 0 | 3 | 100% |

가중 진행률은 `100*0.55 + 100*0.35 + 100*0.10 = 100%`다. 아래의 이전 97.4%/98.04% 표는 과거 gate 이력이며 최신 판정이 아니다.

기준일: 2026-07-15

## 2026-07-15 Release Gate 보강 후 진행률

2026-07-15 OAuth 재시도 기준 최신 release APK SHA-256은 `8bbc30195880ba02688b846551654486a695a94b0cdc84f15d01cb95e7d92d1e`이다. Google/Kakao provider 진입과 callback/session/onboarding 분기는 추가 확인했지만, provider/browser session 상태 때문에 순수 취소 후 로그인 화면 복귀가 분리되지 않았다. 따라서 아래 진행률은 계속 100%로 승격하지 않는다.

최신 release APK SHA-256 `bfb9ac5ca79e61e8d91b2e738529f945dd6dcc77f12e7a597afca31b81a57524` 기준으로 조건부 QA 4건 중 token isolation 1건을 closeout했고, 2건은 대표 경로를 보강했다. adminQA 직접 로그인 callback, 전체 대표 keyboard/navigation, notification token isolation/account switch, 핵심 도메인 대표 회귀, 병원 public-safe 상세 주소 차단은 코드/테스트/실기기 증적으로 닫았다.

아직 100%로 승격하지 않는다. 남은 조건부는 controlled Google/Kakao provider identity를 사용한 실제 외부 OAuth 성공·취소·복귀 smoke 1건이다.

| 분류 | 적용 criterion | 완료 | 조건부 | 미완료 | 제외 | 진행률 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 기능 구현 | 74 | 74 | 0 | 0 | 11 | 100% |
| QA·보안 | 54 | 51 | 3 | 0 | 7 | 94.4% |
| 문서·release | 21 | 21 | 0 | 0 | 3 | 100% |

앱 본체 가중 진행률 = `100*0.55 + 94.4*0.35 + 100*0.10 = 98.04%`.

P0/P1 구현 blocker는 없다. Play Store 자산, 앱 디자인/폰트 리뉴얼, actual push provider, 자체 POI runtime 전환은 별도 PO 승인 트랙으로 계속 제외한다.

## 최종 Release Gate 보정

2026-07-14 최신 release APK SHA-256 `57c660393d4de35e1a00c8d19e4b29e85422fcddd60c86cb6048ac621ac6cbeb` 기준으로 조건부 QA 4건을 재검증했다. Google OAuth 성공/취소/복귀와 Kakao OAuth 성공/온보딩은 실기기에서 확인했지만, Kakao 순수 취소 복귀, 전체 TextInput keyboard sweep, `adminQA` 재로그인 이후 notification token isolation/account switch, 전체 핵심 도메인 회귀는 완료 증적이 부족하다.

따라서 이번 문서 기준 진행률은 100%로 승격하지 않는다. 기능 구현은 `74/74`, QA·보안은 `50/54`, 문서·release는 `21/21`로 유지하며, 앱 본체 가중 진행률은 `97.4%`다. 남은 항목은 신규 기능이 아니라 release gate evidence 잔여 항목이다.

## Source of Truth

1. 실제 실행 코드
2. Supabase remote dry-run
3. 최신 Android 실기기 smoke
4. 테스트 결과
5. `docs/project-memory`
6. `docs/qa/release-checklist.md`
7. 최신 기획서

관리자 홈페이지는 단계별 본구현을 종료했다. 남은 custom domain, DNS/SSL, 외부 monitoring, MFA/recovery material, 상시 2인 운영 체계는 앱 본 프로젝트 blocker가 아니다.

## 진행률 산식

| 분류 | 적용 criterion | 완료 | 조건부 | 미완료 | 제외 | 진행률 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 기능 구현 | 74 | 74 | 0 | 0 | 11 | 100% |
| QA·보안 | 54 | 50 | 4 | 0 | 7 | 92.6% |
| 문서·release | 21 | 21 | 0 | 0 | 3 | 100% |

앱 본체 가중 진행률 = 기능 55% + QA·보안 35% + 문서 10%.

`100*0.55 + 92.6*0.35 + 100*0.10 = 97.4%`

관리자 외부 운영 조건을 제외한 구현 로드맵은 98%대로 판정한다. Play Store 자산과 앱 전체 디자인 리뉴얼은 별도 PO 승인 트랙이므로 구현 진행률 분모에서 제외한다.

## Domain별 판정

| Domain | 완료 항목 | 남은 항목 | Evidence | 진행률 |
| --- | --- | --- | --- | ---: |
| Auth/Onboarding | email, Google/Kakao public, Naver public off, NicknameSetup, PetCreate, session restore | 실제 신규 OAuth 성공 반복 smoke는 외부 계정 조건 | tests + 기존 Android evidence | 97% |
| Home | progressive rendering, cache, weather, title badge | 없음 | Home screenshot/logcat | 100% |
| Timeline/Health | records/date input/future date guard/count cache | full manual sweep은 release QA 반복 항목 | tests + prior Android evidence | 96% |
| Community | list/detail/write/comment/report/hidden read-path/undo/count/cache | 없음 | latest Android + tests | 100% |
| Animal Hospital | public-safe list/detail/CTA/fallback | coordinate missing quality는 후속 데이터 보강 | latest Android + hospital tests | 98% |
| Walk | Kakao fallback policy, POI gate, list/search/fallback | 자체 POI runtime 전환은 V1.1 후속 | latest Android + walk tests | 97% |
| Weather | Open-Meteo/weather cache/stale fallback | customer API 계약은 운영 후보 | tests | 96% |
| Growth/Reward | Lv.1~100, XP decay, ranking/activity/reward modal | 없음 | tests | 100% |
| Notification | opt-in/out, token revoke, logout/account deletion revoke, actual push disabled | actual push provider는 PO 승인 대기 | tests + prior Android evidence | 96% |
| Settings/Profile | nickname/pet edit/logout/withdrawal grace/policy | full manual sweep은 release QA 반복 항목 | tests + prior Android evidence | 95% |
| Common Quality | no hard delete policy, logcat blocker 0, nav/keyboard representative smoke | 전체 입력 화면 반복 sweep은 release QA gate | latest Android | 94% |
| Admin integration | soft-hide/unhide app read-path, admin track frozen | external operations only | admin Android evidence | 100% |

## 실제 남은 구현

- P0: 없음
- P1: 없음
- P2: release 직전 전체 입력 화면 sweep 반복, coordinate missing 병원 데이터 품질 보강, full social provider manual smoke 반복
- 정책상 비활성: hard delete, broadcast, segment broadcast, actual push, Naver public surface, Apple login
- PO 승인 대기: 앱 전체 디자인/폰트 리뉴얼, Play Store 자산, actual push provider, 자체 POI runtime 전환

## 이번 closeout 수정

`deleteCommunityComment`의 hard delete fallback을 제거했다. legacy schema error가 발생해도 `comments.delete()`로 내려가지 않고 error를 throw한다. 이로써 커뮤니티 댓글 삭제는 soft update only 정책을 따른다.
