# NURI Thread Map and Handoff Index

## 역할과 적용 시점

2026-11-11 안내 보정: 아래는 **2026-08-05 Room 구성·활성화 순서의 역사 기록**이다. '현재 master', 사전 생성, WRITE_LOCKED와 activation 순서는 당시 체계에 한정되며 현재 Master 단독 작업의 선행 의무가 아니다. 새 Room·하위 에이전트 생성이나 후속 제품 작업을 승인하지 않는다.

현재 실행은 [승인 작업 계약](../engineering/advanced-codex-workflow.md#execution-contract)과 [우선순위](다음-작업-우선순위.md#resume-point)를 따른다. 당시 소유권·인계는 [라우팅 원문과 적용 범위](../handoffs/2026-08-05/NURI-MASTER-TASK-ROUTING-POLICY.md#historical-scope)에서 확인한다. 아래 도메인 보호 이유와 원문은 유지하며, 실제 방 존재나 자동 지침 상속을 이번 안내로 확인한 것은 아니다.

<!-- THREAD_HISTORY_20260805_BEGIN -->
현재 master thread는 사용자가 생성한 `NURI-00-마스터-현황·결정·과거이력`이다. Codex는 일반 대화방을 자동 생성하거나 과거 보관 대화를 자동 상속한다고 가정하지 않는다. Codex가 UI의 실제 방 존재를 확인하기 전에는 신규 방을 `ROOM_EXISTENCE_UNCONFIRMED`로 기록한다.

정상 bootstrap 상태는 `BOOTSTRAP_READY / WRITE_LOCKED`다. NURI-00의 별도 활성화 승인으로 한 번에 하나의 방만 `WRITE_ACTIVE`가 될 수 있다. 방 생성 여부, bootstrap 완료 여부, activation 순서, write 상태는 서로 다른 필드다.

## 전체 영구 방

`NURI-00`부터 `NURI-14`까지는 `docs/handoffs/2026-08-05/rooms/`의 ownership 문서에 정의되어 있다. 실제 생성은 사용자가 Codex UI에서 수행하고, 코드는 한 번에 한 방에서만 수정한다.

## 모든 Room 사전 생성

사용자는 NURI-01부터 NURI-14까지 모든 일반 Room을 미리 생성할 수 있다. 아래 순서는 물리적 생성 순서가 아니라 첫 write activation 순서다.

1. `NURI-02-반려동물·프로필·날짜` — ACTIVATE_FIRST — order 1 — `docs/handoffs/2026-08-05/rooms/NURI-02-반려동물·프로필·날짜-ROOM-OWNERSHIP.md`
2. `NURI-03-메인홈·날씨·요약` — ACTIVATE_SCHEDULED — order 2 — `docs/handoffs/2026-08-05/rooms/NURI-03-메인홈·날씨·요약-ROOM-OWNERSHIP.md`
3. `NURI-04-기록·Timeline` — ACTIVATE_SCHEDULED — order 3 — `docs/handoffs/2026-08-05/rooms/NURI-04-기록·Timeline-ROOM-OWNERSHIP.md`
4. `NURI-09-Supabase·RLS·RPC·운영DB` — ACTIVATE_SCHEDULED — order 4 — `docs/handoffs/2026-08-05/rooms/NURI-09-Supabase·RLS·RPC·운영DB-ROOM-OWNERSHIP.md`
5. `NURI-01-인증·온보딩` — ACTIVATE_SCHEDULED — order 5 — `docs/handoffs/2026-08-05/rooms/NURI-01-인증·온보딩-ROOM-OWNERSHIP.md`
6. `NURI-12-Android·Release-QA` — ACTIVATE_SCHEDULED — order 6 — `docs/handoffs/2026-08-05/rooms/NURI-12-Android·Release-QA-ROOM-OWNERSHIP.md`

## Activation later/reference

`NURI-05`, `NURI-06`, `NURI-07`, `NURI-08`, `NURI-10`, `NURI-11`, `NURI-13`은 ACTIVATE_LATER, `NURI-14`는 REFERENCE_ONLY다. 모든 Room은 사전 생성할 수 있으며, 실제 write는 NURI-00 승인 전까지 금지한다.

## DO_NOT_CREATE

- 별도 `NURI-Community-ViewCount`: Community 방에 흡수한다. 조회수 서버 계약과 moderation은 같은 소유 경계를 검수해야 한다.
- 별도 `NURI-Weather`: Home·Weather 방에 흡수한다.
- 별도 `NURI-DatePicker-Bug`: Pet·Profile·Date 방에 흡수한다.
- 별도 `NURI-Home-RecentRecords`: Main Home 방에 흡수한다.
- 별도 `NURI-DB-Migration-OneOff`: 공용 DB 방에 흡수한다.
- 별도 `NURI-Test-Only`: 테스트는 owning domain과 Release 방에 남긴다.
<!-- THREAD_HISTORY_20260805_END -->
