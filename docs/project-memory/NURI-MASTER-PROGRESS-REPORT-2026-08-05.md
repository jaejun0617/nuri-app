# NURI Master Progress Report

기준일: 2026-08-05

- 감사 당시 runtime baseline: `c691bb7`
- 최초 canonical/handoff publication: `8975ba7`
- 현재 작업 기준 HEAD: room 시작 시 실제 Git으로 확인

## 판정 축

| 축 | 현재 판정 | 근거 |
| --- | --- | --- |
| 구현 | `IMPLEMENTED_PARTIALLY_VERIFIED` | 주요 화면과 서비스가 존재하고 앱 전체 테스트가 통과했지만 dirty runtime 변경이 남아 있다. |
| 검증 | `IMPLEMENTED_VERIFIED`와 `UNVERIFIED` 혼재 | 앱/웹 정적 검증은 통과했으나 remote catalog와 일부 실기기 row-level 검증은 미확인이다. |
| 출시 | `IN_PROGRESS` | APK baseline은 있으나 clean RC provenance와 최종 store gate가 남아 있다. |

## 주요 영역 판정

| 영역 | 구현 | 검증 | 출시 |
| --- | --- | --- | --- |
| Auth/Onboarding | 구현 | 자동 테스트 및 과거 Android evidence | Naver 완전 제거 작업 필요 |
| Pet/Profile/Date | 구현 및 dirty 수정 | 날짜 단위 테스트와 과거 device evidence | dirty 변경 closeout 필요 |
| Home/Weather/Summary | 구현 및 dirty Home 변경 | 자동 테스트와 과거 Home evidence | clean APK 회귀 gate 필요 |
| Records/Timeline | 구현 | 71/310 전체 테스트와 과거 re-entry evidence | current fast stress 재확인 필요 |
| Schedules/Health/Activity | 구현 | 관련 단위 테스트 일부 | 운영/실기기 범위 분리 필요 |
| Community/Moderation | 구현 | community 테스트 존재 | 운영자 surface와 abuse gate 별도 |
| Hospital/POI | 구현 | remote table stats·관련 테스트·과거 device evidence | provider/trust 운영 gate 남음 |
| Supabase Security | migration remote 일치 | dry-run과 table stats | policy/RPC direct catalog 미확인 |
| Admin Web | 구현 | TypeScript/lint/14 tests/build 통과 | 실제 운영자 QA 증적 별도 |
| Android/Release | release APK 존재 | cold start와 기존 evidence | clean RC/store gate 미완료 |

## 진행률 사용 규칙

이 문서는 분모 없는 전체 퍼센트를 사용하지 않는다. 도메인별 구현·검증·출시 상태를 따로 기록한다.
