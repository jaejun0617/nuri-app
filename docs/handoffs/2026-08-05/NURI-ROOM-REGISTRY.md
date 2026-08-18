# NURI Room Registry

기준일: 2026-08-05

이 registry는 대화방의 물리적 존재와 bootstrap/activation/write 상태를 분리한다. Codex가 UI에서 실제 room 존재를 확인하지 못한 방은 `ROOM_EXISTENCE_UNCONFIRMED`다. `8975ba7`은 최초 canonical/handoff publication lineage이며 current work HEAD가 아니다.

| 번호 | 정확한 이름 | Physical | Bootstrap | Activation order | Activation class | Write | Primary issue/role | Ownership | Starter | Last report HEAD | Completion commit | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 00 | `NURI-00-마스터-현황·결정·과거이력` | ROOM_EXISTS | BOOTSTRAP_READY | master | MASTER_CONTROL | WRITE_LOCKED | master routing/review | `NURI-00-MASTER-HANDOFF.md` | N/A | actual current thread | N/A | dispatch/review only |
| 01 | `NURI-01-인증·온보딩` | ROOM_EXISTS | BOOTSTRAP_READY | 5 | ACTIVATE_SCHEDULED | WRITE_LOCKED | AUTH-001 primary | `rooms/NURI-01-인증·온보딩-ROOM-OWNERSHIP.md` | `NURI-01-STARTER.md` | `9f49bfb` closeout | `fc96bfd`, `9f49bfb` | app-surface closed; remote provider read-only follow-up only |
| 02 | `NURI-02-반려동물·프로필·날짜` | ROOM_EXISTS | BOOTSTRAP_READY | 1 | ACTIVATE_FIRST | WRITE_LOCKED | DATE-001 | `rooms/NURI-02-반려동물·프로필·날짜-ROOM-OWNERSHIP.md` | `NURI-02-STARTER.md` | `babe785` closeout | `babe785` | complete; sign-compatible cursor/PetCreate evidence remains with NURI-12 if required |
| 03 | `NURI-03-메인홈·날씨·요약` | ROOM_EXISTS | BOOTSTRAP_READY | 2 | ACTIVATE_SCHEDULED | WRITE_LOCKED | HOME-001 | `rooms/NURI-03-메인홈·날씨·요약-ROOM-OWNERSHIP.md` | `NURI-03-STARTER.md` | `4a0bf1f` reconciliation | `9ffe4ee` feature implementation | CommunitySection `FEATURE_COMPLETE/FROZEN`; unrelated dirty Home work remains separate |
| 04 | `NURI-04-기록·Timeline` | ROOM_EXISTS | BOOTSTRAP_READY | 3 | ACTIVATE_SCHEDULED | WRITE_COMPLETE | TIMELINE-001 | `rooms/NURI-04-기록·Timeline-ROOM-OWNERSHIP.md` | `NURI-04-STARTER.md` | `58bc5a8` closeout | N/A (no code change) | implementation closed; clean signed RC physical QA remains NURI-12 |
| 05 | `NURI-05-일정·건강·활동` | ROOM_EXISTS | BOOTSTRAP_READY | 마스터 승인 시 결정 | ACTIVATE_LATER | WRITE_COMPLETE | DATE-001 / SCHEDULE-001 / HEALTH-001 | `rooms/NURI-05-일정·건강·활동-ROOM-OWNERSHIP.md` | `NURI-05-STARTER.md` | `a2685d4` release closeout | `a2685d4` | Schedule/Health closeout; Activity deferred v1.1; current-source Android QA remains NURI-12 |
| 06 | `NURI-06-커뮤니티·모더레이션` | ROOM_EXISTS | BOOTSTRAP_READY | 마스터 승인 시 결정 | ACTIVATE_LATER | WRITE_COMPLETE | community policy | `rooms/NURI-06-커뮤니티·모더레이션-ROOM-OWNERSHIP.md` | `NURI-06-STARTER.md` | `3a40091` controlled visibility QA | `fcf4cdd` app integration; `3a40091` QA closeout | backend/app integration과 authenticated block/unblock visibility QA 완료; Android UI는 NURI-12, detail policy는 별도 검토 |
| 07 | `NURI-07-알림·운영메시지` | ROOM_EXISTS | BOOTSTRAP_READY | 마스터 승인 시 결정 | ACTIVATE_LATER | WRITE_COMPLETE | NOTIFICATION-001 | `rooms/NURI-07-알림·운영메시지-ROOM-OWNERSHIP.md` | `NURI-07-STARTER.md` | `e56cd1c` release closeout | `e56cd1c` | Notification Center closeout; Push disabled by policy; Android/local reminder QA NURI-12; next triage NURI-08 |
| 08 | `NURI-08-동물병원·산책POI·펫여행` | ROOM_EXISTS | BOOTSTRAP_READY | 마스터 승인 시 결정 | ACTIVATE_LATER | WRITE_COMPLETE | PLACE-001 | `rooms/NURI-08-동물병원·산책POI·펫여행-ROOM-OWNERSHIP.md` | `NURI-08-STARTER.md` | `ebad0df` release triage | N/A (no code change) | Hospital/Walk v1 closeout; Pet Travel deferred v1.1; current-source Android QA remains NURI-12 |
| 09 | `NURI-09-Supabase·RLS·RPC·운영DB` | ROOM_EXISTS | BOOTSTRAP_READY | 4 | ACTIVATE_SCHEDULED | WRITE_COMPLETE | SUPABASE-001 primary, AUTH-001 support | `rooms/NURI-09-Supabase·RLS·RPC·운영DB-ROOM-OWNERSHIP.md` | `NURI-09-STARTER.md` | `bb05c09` targeted backend closeout | `bb05c09` | backend and visibility predicate complete; no broad Community backend audit required |
| 10 | `NURI-10-관리자웹·운영도구` | ROOM_EXISTS | BOOTSTRAP_READY | 마스터 승인 시 결정 | ACTIVATE_LATER | WRITE_COMPLETE | ADMIN-001 | `rooms/NURI-10-관리자웹·운영도구-ROOM-OWNERSHIP.md` | `NURI-10-STARTER.md` | `5027cae` operator closeout | N/A (no code change) | ADMIN-001 closed with non-blocking residual; no required follow-up |
| 11 | `NURI-11-디자인시스템·접근성` | ROOM_EXISTS | BOOTSTRAP_READY | 마스터 승인 시 결정 | ACTIVATE_LATER | WRITE_LOCKED | DESIGN-001 review | `rooms/NURI-11-디자인시스템·접근성-ROOM-OWNERSHIP.md` | `NURI-11-STARTER.md` | user bootstrap report | none | review only if global tokens change |
| 12 | `NURI-12-Android·Release-QA` | ROOM_EXISTS | BOOTSTRAP_READY | 6 | ACTIVATE_SCHEDULED | WRITE_LOCKED | ANDROID-001/RELEASE-001 primary, feature regression support | `rooms/NURI-12-Android·Release-QA-ROOM-OWNERSHIP.md` | `NURI-12-STARTER.md` | `4a0bf1f` signing preflight | none | `RELEASE_SIGNING_BLOCKED_EXTERNAL_INPUT`; resume only after approved credential supply |
| 13 | `NURI-13-가이드·리워드·프라이빗기억` | ROOM_EXISTS | BOOTSTRAP_READY | 마스터 승인 시 결정 | ACTIVATE_LATER | WRITE_LOCKED | future domain | `rooms/NURI-13-가이드·리워드·프라이빗기억-ROOM-OWNERSHIP.md` | `NURI-13-STARTER.md` | user bootstrap report | none | activate on approved change |
| 14 | `NURI-14-v1.1-아키텍처·확장` | ROOM_EXISTS | BOOTSTRAP_READY | v1.1 승인 시 결정 | REFERENCE_ONLY | WRITE_LOCKED | v1.1 architecture reference | `rooms/NURI-14-v1.1-아키텍처·확장-ROOM-OWNERSHIP.md` | `NURI-14-STARTER.md` | user bootstrap report | none | NURI-00 approval |

## Registry update rules

- 사용자가 실제 room 생성과 이름을 확인하면 해당 Physical 상태만 `ROOM_EXISTS`로 갱신한다.
- starter를 첫 메시지로 처리한 뒤 bootstrap report가 제출되면 Bootstrap만 `BOOTSTRAP_READY`로 갱신한다.
- NURI-00의 활성화 승인 전에는 Write를 `WRITE_LOCKED`로 유지한다.
- 실제 commit/push가 있어도 room의 Physical 또는 Activation 상태를 자동으로 바꾸지 않는다.
- 완료 report의 HEAD, status, files, tests, remote/device evidence, commit/push를 검수한 뒤에만 `WRITE_COMPLETE`를 기록한다.
