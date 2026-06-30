# NURI 앱 전체 프로젝트 최종 현황 보고서 - 2026-06-30

## 1. 프로젝트 전체 요약

NURI는 반려동물의 기억을 기록하고 추억하는 디지털 메모리얼 앱이다. 현재 기준 V1.0 기능 개발은 닫혔고, V1.1은 산책/location discovery 자체 POI 전환을 중심으로 외부 API 비용과 public trust 리스크를 줄이는 단계까지 진행됐다.

## 2. 현재 기준일

- 기준일: 2026-06-30
- 기준 브랜치: `codex/task6-community-content-policy`
- 기준 remote POI: approved/public/active 1,145건
- 이번 보고서 성격: 신규 QA 계정 full E2E/navigation audit + Animal Hospital 전국 coverage read-only audit + release blocker 최소 수정. 신규 seed, DB schema 변경, migration 없음

## 3. 진행률

| 구분 | 진행률 | 판단 |
| --- | ---: | --- |
| V1.0 기능 개발 | 100% | P0/P1 0건, 기능 Code Freeze 유지 |
| V1.0 QA/출시 준비 | 약 98% | release APK update install, 신규 QA 계정 full E2E/navigation audit, onboarding blocker 최소 수정/재검증, OAuth 버튼 상태, crash-free logcat 재확인. Play Store 자산은 디자인 조정과 전체 closeout 후 최종 제출 직전 준비 |
| V1.1 산책 POI 트랙 | 약 99% | 1,145건 POI, walk-domain Kakao fallback 제거, public projection safety, Android smoke 통과 |
| V1.1 전체 | 약 52% | 산책 POI closeout 유지와 full E2E/navigation audit 확인. billing/AI/letters/typography 등 V1.1 잔여 존재 |
| 전체 제품 로드맵 | 약 92% | V1.0 closeout 유지, V1.1 핵심 비용/POI 리스크 축소, 신규 계정 E2E/navigation audit 통과 기준 |

## 4. 완료된 주요 도메인

- Auth / Social Login: Google/Kakao V1.0 public provider 완료, Naver soft disable, Apple은 제외
- Profile / Pet: 닉네임, 반려동물 등록/수정, 날짜 직접 입력 UX 완료
- Health Report: Phase 1 baseline, 월간 요약/그래프, 기록 진입 정리 완료
- Animal Hospital: 사용자 서비스 closeout 완료, provider matching 영향 회귀 테스트 유지
- Walk / Location Discovery / POI: 자체 POI RPC 전환, 전국 주요 seed 1,145건, walk-domain Kakao fallback 제거, safe empty UX 완료
- Community / Policy / Moderation: rate limit, blocked-term, 신고/auto-hide, policy link, cleanup contract 완료
- Weather: Open-Meteo cache/cost defense 완료
- Timeline: 건강 신규 작성 진입 정리, 기존 health read path 유지 완료
- Release QA: release APK exact install smoke, OAuth smoke, 일반 사용자 smoke, 서버 권한 corrective closeout 완료
- Docs / Project Memory: project-memory, domain docs, reports, SQL archive index 갱신

## 5. 산책 POI 트랙 closeout 판정

- 판정: `산책 POI 트랙 closeout 가능`
- approved/public/active POI: 1,145건
- public nearby/search/detail RPC: 정상
- pending/rejected/held public active leak: 0건
- raw/source/review/audit internal key public RPC leak: 0건
- anon direct `walk_pois` SELECT: `42501 permission denied`
- broad gate 오적용: 서울 전체/수도권 전체/전국 전체/도시 전체 gate 없음
- Ready 권역 Kakao 차단: 유지
- gate 밖 safe UX: 유지
- empty UX: 정상
- Android smoke/detail tap: `SM_S937N`에서 일산/부산 리스트와 카드 상세, gate 밖 empty UX 통과
- logcat fatal / ANR / unhandled promise / ReactNativeJS fatal pattern: 0건

## 5-1. 2026-06-30 full E2E / navigation / hospital coverage 결과

- 신규 QA 계정 `qa0623145019@example.com` 기준으로 Splash -> Signup/Login -> Nickname -> Pet Create -> Home -> Logout -> Email Login -> Home 복귀를 검증했다. 비밀번호는 문서화하지 않는다.
- release blocker: 로그아웃 후 email/password 재로그인 시 profile/pet이 존재해도 `NicknameSetup`으로 잘못 진입하는 stale onboarding 문제를 발견했고 최소 수정했다.
- 수정: 로그인 세션 반영 시 profile 재동기화 완료 전 boot gate를 닫고, 같은 사용자 `SIGNED_IN`/`INITIAL_SESSION`도 user-scoped state reload 대상으로 포함했다.
- 재검증: focused auth/app boot tests 13/13 통과, release APK rebuild/install, cold start와 logout -> email login home 복귀 통과.
- 전체 E2E: Home, Profile/Pet, Pet Edit/Create guard, Health, Timeline, Animal Hospital, Walk/POI, Community/Policy, Weather, 전체메뉴/설정, Logout/session restore 확인.
- navigation/back audit: 주요 사용자-facing 화면 17개 상단 뒤로가기와 Android system back 통과.
- Animal Hospital 판정: `우리동네 병원 찾기 전국 기반 완료, 일부 권역 품질 점검 필요`. public active 5,427건, 일산/서울/부산/대구/대전/광주/울산/세종/제주 대표 좌표 모두 20건 반환.
- 디자인: 수정하지 않음. 스토어 출시 전 디자인 조정 후보는 별도 트랙으로 유지.

## 6. Kakao Local / 소셜 로그인 상태

- walk-domain Kakao Local fallback: 산책/location discovery runtime에서 제거 완료
- Kakao Local global provider hard delete: 보류
- 보류 사유: pet-friendly 장소 검색, 동물병원 provider matching, coord2region Edge Function 유지 필요
- Kakao Login: 영향 없음
- Google Login: 영향 없음
- 소셜 로그인 provider 설정 변경: 없음

## 7. seed 운영 품질

- 한글 alias 누락: 0건
- 영어 region key public 노출: 0건
- 영어 표시 후보: `APEC`, `MBC` 정식 시설명/기관 약어 3건. blocker 아님
- duplicate name cluster: 5개. 서로 다른 도시/주소의 일반 명칭 중복으로 즉시 hidden 후보 아님
- coordinate over-density cluster: 0건
- source/attribution 누락: 0건
- rollback SQL: coverage/rollback SQL 각 14개 유지
- held/hidden 즉시 후보: 0건

## 8. admin 운영자 QA Parking

- `admin queue/batch drill-down`: 구현 완료
- `admin UI 운영자 QA closeout`: Parking
- Parking 사유: 앱 내부 운영자 도메인은 Play Store 사용자-facing 출시 흐름에서 사용하지 않음
- 앱 출시 blocker 여부: 아님
- 별도 홈페이지/관리 페이지 이동 여부: 이동
- 재개 시점: V1.0/V1.1 앱 작업 완료 후 운영자 관리 페이지 설계/QA 단계

## 9. Play Store 출시 전 남은 작업

- 신규 QA 계정 E2E/navigation audit 결과를 release blocker ledger에 유지
- privacy/policy 링크 최종 확인
- Supabase/Codex 운영비 실제 결제 계정 확인
- Play Store 자산 패키지: V1.0/V1.1 전체 완료 후 최종 제출 직전 진행
- Play Console 실제 입력: 최종 제출 직전 단계에서만 수행

## 10. 리스크 현황

- 출시 전 blocker: 현재 확인된 사용자-facing release blocker 없음
- Kakao Local global hard delete: 보류. 다른 도메인 유지 경로 때문에 release blocker 아님
- admin 운영자 QA: Parking. 앱 출시 blocker 아님
- Play Store 자산: 아직 미진행. V1.0/V1.1 전체 완료와 스토어 출시 전 디자인 조정 후 진행해야 함
- 운영비: Supabase 프로젝트 플랜/사용량과 Codex 실제 플랜은 dashboard/account owner 확인 필요

## 10-1. 2026-06-23 release candidate smoke / 운영비 readiness

- release APK update install: `SM_S937N`에 `versionName=1.0`, `versionCode=1` 업데이트 설치 성공
- Android 사용자-facing smoke: 홈, 로그인 세션 복귀, Profile/Pet 카드, Weather, 전체메뉴, Health read/write entrypoint, Animal Hospital 리스트/상세/전화·길찾기 CTA, Walk 리스트/검색 empty/detail/gate 밖 safe UX, Community/Policy, Timeline, 로그아웃/로그인 홈 복귀 확인
- Google/Kakao 로그인 버튼: 로그아웃 후 로그인 홈에서 `카카오로 시작하기`, `Google로 시작하기` 노출 확인. provider 설정 변경 없음
- Health write smoke: 실기기에서는 기록 유형 선택 화면 진입까지 확인하고 운영 DB에 테스트 기록은 남기지 않음. `recordsForm` focused test로 write form 회귀 보완
- Walk POI regression: approved/public/active 1,145건, public nearby 20건/search 6건/detail 1건, public internal key leak 0건, anon direct table select `42501`, anon admin RPC `WALK_POI_ADMIN_REQUIRED`
- Ready Kakao 차단: 일산 Ready 권역 logcat `kakaoBlocked: true`, `gateLimited: true`, `resultCount: 8`
- gate 밖 safe UX: 좌표 `0,0` deep link에서 `gateLimited: false`, `kakaoBlocked: true`, `현재 위치 주변 산책 장소를 아직 찾지 못했어요` 표시
- crash-free: logcat `FATAL EXCEPTION`, `ANR in`, `Unhandled promise`, `ReactNativeJS fatal` pattern 0건
- Supabase remote 상태: project `NURI` active healthy, DB size 약 177MB, Edge Functions 6개 ACTIVE. CLI에서 실제 plan/청구 사용량은 노출되지 않아 Supabase dashboard 확인 필요
- 비용 판단: POI RPC는 현재 DB 규모가 작고 public RPC 중심이라 급격한 비용 blocker는 없지만, 출시 후 호출량/egress/Edge Function invocations를 월 단위로 추적해야 함
- Kakao Local 비용: 산책 runtime Kakao Local fallback 제거로 산책 도메인 외부 provider 호출 비용 리스크는 낮아짐. pet-friendly, 동물병원 provider matching, coord2region 경로는 유지
- Google Places/Maps 재발 위험: Google Places/Photos provider runtime은 기존 hard cap 0/no-op 기준 유지. 산책 상세 지도 미리보기는 Google Maps API가 아니라 OSM/static map 경로
- Codex 비용: 실제 플랜/워크스페이스 사용량은 OpenAI 계정에서 확인 필요. 개발 지속 예산은 별도 운영 확인 항목으로 유지

## 11. 구현완료 작업 리스트

| 도메인 | 구현 상태 | 검증 상태 | 버전 | 남은 리스크 |
| --- | --- | --- | --- | --- |
| Auth / Social Login | Google/Kakao 완료, Naver soft disable | Android OAuth smoke 완료 | V1.0 | Apple은 후속 |
| Profile / Pet | 등록/수정/날짜 입력 완료 | Android smoke 완료 | V1.0 | 없음 |
| Health Report | Phase 1 완료 | 타입/lint/QA 문서 완료 | V1.0 | 고도화는 후속 |
| Animal Hospital | 사용자 서비스 완료 | admin 서버 계약/일반 smoke 완료 | V1.0 | 운영자 홈페이지 QA로 이동 |
| Walk / Location Discovery / POI | 자체 POI 전환 closeout 가능 | RPC/Android/focused test/RC smoke 통과 | V1.1 | 운영 모니터링 |
| Community / Policy / Moderation | 최소 운영 방어선 완료 | row-level/정책 링크 검증 | V1.0 | 운영 UI 고도화 후속 |
| Weather | 비용 방어 완료 | Android/remote 검증 완료 | V1.0 | 운영비 확인 |
| Timeline | read/write 경계 정리 완료 | QA 완료 | V1.0 | 없음 |
| Release QA | release APK exact smoke와 2026-06-30 신규 계정 E2E/navigation audit 완료 | evidence 문서화 | V1.0/V1.1 공통 | 디자인 조정과 운영비 확정 |
| Docs / Project Memory | 최신 기준 갱신 | 이번 턴 정리 완료 | 공통 | 지속 관리 |

## 12. 구현예정 작업 리스트

| 분류 | 작업 | 기준 |
| --- | --- | --- |
| 디자인 조정 예정 | 스토어 출시 전 앱 내부 디자인 조정 후보 검토 | 다음 1순위 |
| 홈페이지/관리 페이지로 이동 | 운영자 관리 페이지 설계와 admin QA | 앱 내부 admin QA Parking |
| 최종 제출 직전 준비 | Play Store 자산 패키지 | V1.0/V1.1 전체 완료와 디자인 조정 완료 후 |
| 예산/운영 확인 | Supabase/Codex 실제 플랜·월 사용량 확정 | 다음 2순위 |
| 출시 후 고도화 | Apple 로그인, billing, AI reply, private letters, typography | 별도 트랙 |
| Parking / 보류 | Kakao Local global hard delete | 다른 도메인 유지 경로 해소 후 |

## 13. 최종 판단

산책/location discovery POI 트랙은 사용자-facing release blocker 없이 closeout 가능하고, 2026-06-30 신규 QA 계정 full E2E/navigation audit에서도 crash-free 상태를 유지했다. 발견된 stale onboarding blocker는 최소 수정 후 재검증했다. 단, V1.1 전체는 아직 52% 기준이고 PO 지시에 따른 스토어 출시 전 디자인 조정이 남아 있으므로 Play Store 자산 패키지는 다음 액션이 아니다.

## 14. 다음 액션

1. 디자인 조정 예정: 스토어 출시 전 앱 내부 디자인 조정 후보 검토
2. 예산/운영 확인: Supabase/Codex 운영비 확정
