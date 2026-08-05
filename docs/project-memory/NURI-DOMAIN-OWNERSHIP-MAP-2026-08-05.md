# NURI Domain Ownership Map

기준일: 2026-08-05. 화면 하나가 아니라 장기 코드 소유권 기준으로 나눈다.

| ID | 도메인 | 화면·코드 | service/store·Supabase | tests/docs | 상태 | 주 risk |
| --- | --- | --- | --- | --- | --- | --- |
| 00 | Master | cross-domain decision, project-memory | 없음 | canonical/handoff | EXISTS | 결정 source 정합성 |
| 01 | Auth·Onboarding | `src/screens/Auth`, Splash, nickname, account entry | `src/store/authStore.ts`, `src/services/supabase/auth.ts` | auth/session/oauth tests, `docs/domains/auth` | ACTIVATE_SCHEDULED, order 5 | AUTH-001 Naver 완전 제거 |
| 02 | Pet·Profile·Date | `src/screens/Pets`, profile components, date picker | `src/services/pets`, profile, account | date/pet tests, profile docs | ACTIVATE_FIRST, order 1 | dirty date input |
| 03 | Main Home·Weather·Summary | `src/screens/Main`, `src/screens/Weather`, home services | `src/services/home`, weather, query client | home/weather tests, typography docs | ACTIVATE_SCHEDULED, order 2 | dirty Home and clean RC |
| 04 | Records·Timeline | `src/screens/Records`, Timeline navigation | `src/services/supabase/memories.ts`, `src/services/timeline` | records/timeline/weekly tests | ACTIVATE_SCHEDULED, order 3 | fast re-entry and count parity |
| 05 | Schedules·Health·Activity | `src/screens/Schedules`, `HealthReport`, activity UI | schedules, health-report, activity services; schedule/health tables | schedules/health/activity tests | ACTIVATE_LATER, order master approval | cross-domain record semantics |
| 06 | Community·Moderation | `src/screens/Community`, comments/reports | community services, moderation migrations | community tests, community docs | ACTIVATE_LATER, order master approval | write-path and abuse policy |
| 07 | Notifications·Operations Messages | `src/screens/Notifications`, notification UI | notifications services, push token lifecycle, user_notifications | notification tests, notification migrations | ACTIVATE_LATER, order master approval | actual push is disabled |
| 08 | Hospital·Walk POI·Pet Travel | hospital/location discovery/walk POI screens | animalHospital/locationDiscovery/place/trust; hospital/POI/travel tables/RPC | hospital/POI/trust tests and docs | ACTIVATE_LATER, order master approval | provider/trust boundary |
| 09 | Supabase·RLS·RPC·운영DB | no user-facing ownership; shared backend contract | all migrations, functions, policies, grants, triggers | SQL docs and migration list | ACTIVATE_SCHEDULED, order 4 | SUPABASE-001 primary; AUTH-001 remote Provider support |
| 10 | Admin Web·Operations | `nuri-web` admin routes and scripts | admin APIs, operator policies, audit tables | admin tests/docs | ACTIVATE_LATER, order master approval | production operator QA |
| 11 | Design System·Accessibility | `src/components`, theme, AppText, modal/input common UI | theme tokens only | typography/a11y docs and snapshots | ACTIVATE_LATER, order master approval | avoid feature logic ownership |
| 12 | Android·Release-QA | android build, APK, device evidence, Play gate | build/signing/config; no feature DB ownership | release checklist/QA | ACTIVATE_SCHEDULED, order 6 | ANDROID-001/RELEASE-001 primary; feature regression support |
| 13 | Guides·Rewards·Private Memory | Guides, Ranking, Guestbook, Letters, reward UI | guides/ranking/letters/reward services | related tests/docs | ACTIVATE_LATER, order master approval | low-frequency cross-domain scope |
| 14 | v1.1 Architecture·Expansion | cross-domain architecture decisions only | no direct runtime ownership | roadmap/planning | REFERENCE_ONLY, order v1.1 approval | must not duplicate domain writes |

## Cross-domain ownership

모든 NURI-01~NURI-14 Room은 물리적으로 미리 생성할 수 있다. 이 표의 activation 값은 물리적 생성 여부가 아니라 write 승인 순서다. 현재 Physical 상태는 registry에서 별도로 확인한다.

- Home card → Timeline 이동은 `NURI-04`가 주 소유이며 Home payload의 최소 변경만 `NURI-03`에서 허용한다.
- 날짜 입력은 `NURI-02`가 소유하고, 공통 typography 변경은 `NURI-11`의 검수 후 각 feature 방에서 적용한다.
- migration/RLS/RPC가 공용 경계를 바꾸면 `NURI-09`가 주 소유이고 feature 방은 앱 계약만 제안한다.
- Release 방은 기능 버그를 고치지 않고 담당 domain으로 되돌린다.
- Master 방은 코드 write를 소유하지 않는다.
- 교차 도메인 AUTH-001 순서: NURI-01이 app-side 완전 제거의 주 소유이고 NURI-09가 remote Provider read-only 검증을 지원하며 NURI-12가 release 회귀를 수행한다. 정책은 Google ON, Kakao ON, Naver 완전 제거, Apple OFF로 고정한다.
