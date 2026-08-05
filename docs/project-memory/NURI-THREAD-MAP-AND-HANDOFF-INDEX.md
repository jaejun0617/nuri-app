# NURI Thread Map and Handoff Index

현재 master thread는 사용자가 생성한 `NURI-00-마스터-현황·결정·과거이력`이다. Codex는 일반 대화방을 자동 생성하거나 과거 보관 대화를 자동 상속한다고 가정하지 않는다.

## 전체 영구 방

`NURI-00`부터 `NURI-14`까지는 `docs/handoffs/2026-08-05/rooms/`의 ownership 문서에 정의되어 있다. 실제 생성은 사용자가 Codex UI에서 수행하고, 코드는 한 번에 한 방에서만 수정한다.

## CREATE_NOW

1. `NURI-02-반려동물·프로필·날짜` — Priority 1 — `docs/handoffs/2026-08-05/rooms/NURI-02-반려동물·프로필·날짜-ROOM-OWNERSHIP.md`
2. `NURI-03-메인홈·날씨·요약` — Priority 1 — `docs/handoffs/2026-08-05/rooms/NURI-03-메인홈·날씨·요약-ROOM-OWNERSHIP.md`
3. `NURI-04-기록·Timeline` — Priority 1 — `docs/handoffs/2026-08-05/rooms/NURI-04-기록·Timeline-ROOM-OWNERSHIP.md`
4. `NURI-09-Supabase·RLS·RPC·운영DB` — Priority 1 — `docs/handoffs/2026-08-05/rooms/NURI-09-Supabase·RLS·RPC·운영DB-ROOM-OWNERSHIP.md`
5. `NURI-12-Android·Release-QA` — Priority 2 — `docs/handoffs/2026-08-05/rooms/NURI-12-Android·Release-QA-ROOM-OWNERSHIP.md`

## CREATE_LATER

`NURI-01`, `NURI-05`, `NURI-06`, `NURI-07`, `NURI-08`, `NURI-10`, `NURI-11`, `NURI-13`, `NURI-14`. 생성 조건과 starter template은 `docs/handoffs/2026-08-05/NURI-THREAD-STARTER-INDEX.md`에 기록한다.

## DO_NOT_CREATE

- 별도 `NURI-Community-ViewCount`: Community 방에 흡수한다. 조회수 서버 계약과 moderation은 같은 소유 경계를 검수해야 한다.
- 별도 `NURI-Weather`: Home·Weather 방에 흡수한다.
- 별도 `NURI-DatePicker-Bug`: Pet·Profile·Date 방에 흡수한다.
- 별도 `NURI-Home-RecentRecords`: Main Home 방에 흡수한다.
- 별도 `NURI-DB-Migration-OneOff`: 공용 DB 방에 흡수한다.
- 별도 `NURI-Test-Only`: 테스트는 owning domain과 Release 방에 남긴다.
