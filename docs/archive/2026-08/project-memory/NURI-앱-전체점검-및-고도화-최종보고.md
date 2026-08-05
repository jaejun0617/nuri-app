상태: Historical / Superseded
현재 source of truth가 아님
보존 목적: 과거 전체 점검 및 고도화 이력
최신 기준: docs/project-memory/NURI-CANONICAL-CURRENT-STATE-2026-08-05.md

---

# NURI 앱 전체점검 및 고도화 최종보고

기준일: 2026-07-19
기준 HEAD: `388d9c7`
최종 HEAD: 이 문서를 포함하는 closeout commit

## 최종 판정

현재 승인 범위의 기능 74건, QA·보안 54건, 문서·release 21건을 실제 코드, Supabase remote, Android release APK 및 테스트로 재검증했다. 적용 대상 criterion은 모두 완료됐으며 알려진 P0/P1은 0건이다.

| 분류 | 적용 | 완료 | 조건부 | 미완료 | 진행률 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 기능 구현 | 74 | 74 | 0 | 0 | 100% |
| QA·보안 | 54 | 54 | 0 | 0 | 100% |
| 문서·release | 21 | 21 | 0 | 0 | 100% |

가중 진행률은 `100*0.55 + 100*0.35 + 100*0.10 = 100%`다. 앱 전체 디자인·폰트 리뉴얼, Play Store 자산, actual push provider, 자체 POI runtime 전환은 별도 PO 승인 트랙이므로 분모에서 제외한다.

## 이번 점검에서 닫은 문제

1. 앱 전역 React Query cache를 단일 client로 고정하고 logout/session clear에서 메모리 cache까지 비워 사용자 전환 시 stale private data 잔존 가능성을 차단했다.
2. DevTest 기본 credential과 사용자/session/경로 로그를 제거했다. Sentry 사용자 context는 내부 id만 사용하고 email은 전송하지 않는다.
3. 계정 삭제·타임라인 썸네일 Edge Function 로그를 stable code/count 중심으로 축소해 사용자 id, storage path 및 raw error가 로그에 남지 않게 했다. 두 function은 remote에 재배포했다.
4. 병원 `(0,0)` 좌표를 공개 좌표, 거리, 지도 링크, 지도 미리보기에서 좌표 없음으로 처리했다. remote 데이터 1,000건 표본에서 active public 후보 564건 중 `(0,0)` 12건은 추측 보정하지 않고 안전 fallback으로 유지한다.
5. lint 기존 warning 4건을 제거하고 query cache·병원 zero-coordinate 회귀 테스트를 추가했다.

## 전체 시스템 점검

| 도메인 | 코드·테스트 | Android evidence | 판정 |
| --- | --- | --- | --- |
| Auth/Onboarding | Google/Kakao callback, session, onboarding, recovery route | Google/Kakao 성공·clean cancel·복귀, 신규 controlled onboarding, session restore | 완료 |
| Home | progressive rendering, weather/cache, title badge | cold start, pet card, weather, focus/rapid navigation | 완료 |
| Timeline/Health | filter, record/weight/date validation | list, record create/edit, weight, future-date validation | 완료 |
| Community | create/edit/comment/report, soft-hide read path | list/detail/editor/comment/report, count 6, prior hide/unhide evidence 유지 | 완료 |
| Animal Hospital | public-safe projection, `(0,0)` guard | list/detail/전화·길찾기/back, raw address·민감 운영필드 미노출 | 완료 |
| Walk | Kakao Local, fan-out 12, dedupe/fallback | 실제 결과, search, back, 빠른 전환 | 완료 |
| Weather | cache/stale fallback, request guard | 실제 날씨와 활동 기록 입력 | 완료 |
| Growth/Reward | Lv.1~100, XP, ranking/title | Lv.3 home badge, activity/title, ranking | 완료 |
| Notification | opt-in/out, user/device scope, logout revoke | OS permission, two controlled identities 전환, active cross-user binding 0 | 완료 |
| Settings/Profile | nickname/pet/withdrawal grace | nickname, pet edit, notification settings, withdrawal confirm | 완료 |
| Common Quality | cache clear, keyboard/back, redacted logs | 24 visible input surfaces, app-scoped fatal/ANR 0 | 완료 |

## 검증 결과

- TypeScript: 통과.
- ESLint: error 0, warning 0.
- Jest: 64 suites, 249 tests, failure 0.
- release APK: `android/app/build/outputs/apk/release/app-release.apk`, 114,810,904 bytes.
- APK SHA-256: `0d598322d5cd6463582ab3e17d93a9d0bc81e44ce7d7eec5fa45efbcb74fabe4`.
- Android: `SM_S937N / R5CY613NMSY`, install/update 및 cold start 성공.
- logcat: app-scoped Fatal/ANR/unhandled promise/ReactNativeJS fatal/Fatal signal/SecurityException 0건.
- Supabase: remote migration up to date, destructive diff 없음. anon admin dashboard/approval/undo/token write 차단, private token row 미노출, service-role read-only summary 허용.

## 남은 항목

- P0/P1: 없음.
- 비차단 데이터 품질: 병원 좌표 미확인 12건. 검증된 source가 생길 때만 additive correction한다.
- 운영 반복 gate: release APK build, OAuth 대표 smoke, keyboard/back, logcat, Supabase dry-run.
- 정책상 비활성: hard delete, broadcast/segment, actual push, Naver/Apple public login, 앱 내부 admin UI.
- PO 승인 대기: 디자인·폰트 리뉴얼, Play Store 자산/제출, actual push provider, 자체 POI runtime 전환, V1.2 성능 고도화.

관리자 홈페이지 단계별 본구현은 종료 상태다. 향후 관리자 변경은 운영 장애, 보안 패치, 실제 회귀 수정에만 한정한다.
