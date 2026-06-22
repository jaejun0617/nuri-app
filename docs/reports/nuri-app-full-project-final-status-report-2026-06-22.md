# NURI 앱 전체 프로젝트 최종 현황 보고서 - 2026-06-22

## 1. 프로젝트 전체 요약

NURI는 반려동물의 기억을 기록하고 추억하는 디지털 메모리얼 앱이다. 현재 기준 V1.0 기능 개발은 닫혔고, V1.1은 산책/location discovery 자체 POI 전환을 중심으로 외부 API 비용과 public trust 리스크를 줄이는 단계까지 진행됐다.

## 2. 현재 기준일

- 기준일: 2026-06-22
- 기준 브랜치: `codex/task6-community-content-policy`
- 기준 remote POI: approved/public/active 1,145건
- 이번 보고서 성격: 문서 정리 + 검증 결과 정리. 신규 seed, DB write, migration 없음

## 3. 진행률

| 구분 | 진행률 | 판단 |
| --- | ---: | --- |
| V1.0 기능 개발 | 100% | P0/P1 0건, 기능 Code Freeze 유지 |
| V1.0 QA/출시 준비 | 약 96% | release smoke, OAuth smoke, 주요 서버 gate 완료. Play Store 자산은 최종 제출 직전 준비 |
| V1.1 산책 POI 트랙 | 약 99% | 1,145건 POI, walk-domain Kakao fallback 제거, public projection safety, Android smoke 통과 |
| V1.1 전체 | 약 50% | 산책 POI는 closeout 가능. billing/AI/letters/typography 등 V1.1 잔여 존재 |
| 전체 제품 로드맵 | 약 90% | V1.0 closeout 유지와 V1.1 핵심 비용/POI 리스크 축소 기준 |

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

- V1.1 release candidate smoke
- 전체 사용자-facing smoke와 crash-free logcat 재확인
- privacy/policy 링크 최종 확인
- Supabase/Codex 운영비 확인
- Play Store 자산 패키지: V1.0/V1.1 전체 완료 후 최종 제출 직전 진행
- Play Console 실제 입력: 최종 제출 직전 단계에서만 수행

## 10. 리스크 현황

- 출시 전 blocker: 현재 확인된 산책 POI blocker 없음
- Kakao Local global hard delete: 보류. 다른 도메인 유지 경로 때문에 release blocker 아님
- admin 운영자 QA: Parking. 앱 출시 blocker 아님
- Play Store 자산: 아직 미진행. V1.0/V1.1 전체 완료 후 진행해야 함
- 운영비: Supabase/Codex 비용 확인 필요

## 11. 구현완료 작업 리스트

| 도메인 | 구현 상태 | 검증 상태 | 버전 | 남은 리스크 |
| --- | --- | --- | --- | --- |
| Auth / Social Login | Google/Kakao 완료, Naver soft disable | Android OAuth smoke 완료 | V1.0 | Apple은 후속 |
| Profile / Pet | 등록/수정/날짜 입력 완료 | Android smoke 완료 | V1.0 | 없음 |
| Health Report | Phase 1 완료 | 타입/lint/QA 문서 완료 | V1.0 | 고도화는 후속 |
| Animal Hospital | 사용자 서비스 완료 | admin 서버 계약/일반 smoke 완료 | V1.0 | 운영자 홈페이지 QA로 이동 |
| Walk / Location Discovery / POI | 자체 POI 전환 closeout 가능 | RPC/Android/focused test 통과 | V1.1 | release candidate smoke |
| Community / Policy / Moderation | 최소 운영 방어선 완료 | row-level/정책 링크 검증 | V1.0 | 운영 UI 고도화 후속 |
| Weather | 비용 방어 완료 | Android/remote 검증 완료 | V1.0 | 운영비 확인 |
| Timeline | read/write 경계 정리 완료 | QA 완료 | V1.0 | 없음 |
| Release QA | release APK exact smoke 완료 | evidence 문서화 | V1.0 | 최종 RC smoke |
| Docs / Project Memory | 최신 기준 갱신 | 이번 턴 정리 완료 | 공통 | 지속 관리 |

## 12. 구현예정 작업 리스트

| 분류 | 작업 | 기준 |
| --- | --- | --- |
| V1.1 잔여 | release candidate smoke | 다음 1순위 |
| 홈페이지/관리 페이지로 이동 | 운영자 관리 페이지 설계와 admin QA | 앱 내부 admin QA Parking |
| 최종 제출 직전 준비 | Play Store 자산 패키지 | V1.0/V1.1 전체 완료 후 |
| 예산/운영 확인 | Supabase/Codex 운영비 점검 | 다음 2순위 |
| 출시 후 고도화 | Apple 로그인, billing, AI reply, private letters, typography | 별도 트랙 |
| Parking / 보류 | Kakao Local global hard delete | 다른 도메인 유지 경로 해소 후 |

## 13. 최종 판단

산책/location discovery POI 트랙은 사용자-facing release blocker 없이 closeout 가능하다. 단, V1.1 전체는 아직 50% 기준이므로 Play Store 자산 패키지는 다음 액션이 아니다. 다음 단계는 release candidate smoke와 운영비 점검이다.

## 14. 다음 액션

1. V1.1 잔여: release candidate smoke
2. 예산/운영 확인: Supabase/Codex 운영비 점검
