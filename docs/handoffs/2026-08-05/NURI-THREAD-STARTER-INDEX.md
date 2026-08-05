# NURI Thread Starter Index

## 상태 모델

- Physical room: `ROOM_EXISTS`, `ROOM_EXISTENCE_UNCONFIRMED`
- Bootstrap: `BOOTSTRAP_NOT_STARTED`, `BOOTSTRAP_READY`
- Activation class: `ACTIVATE_FIRST`, `ACTIVATE_SCHEDULED`, `ACTIVATE_LATER`, `REFERENCE_ONLY`
- Activation order: `1`~`6`, `마스터 승인 시 결정`, `v1.1 승인 시 결정`
- Write: `WRITE_LOCKED`, `WRITE_ACTIVE`, `WRITE_COMPLETE`

Codex는 UI의 실제 room 존재를 자동 확인하지 않는다. 사용자가 생성했다고 보고하기 전까지 Registry의 NURI-01~NURI-14는 `ROOM_EXISTENCE_UNCONFIRMED`로 기록한다. 사용자가 실제 방에 starter를 붙여 넣으면 starter와 bootstrap report는 `ROOM_EXISTS`로 기록한다. 모든 새 room은 `BOOTSTRAP_ONLY / WRITE_LOCKED`로 시작하고 NURI-00의 별도 활성화 후에만 write한다.

## 전체 starter

모든 영구 room의 starter는 다음 경로에 하나씩 존재한다.

- `NURI-01-STARTER.md` — Auth·Onboarding — `ACTIVATE_SCHEDULED` — order 5
- `NURI-02-STARTER.md` — Pet·Profile·Date — `ACTIVATE_FIRST`
- `NURI-03-STARTER.md` — Main Home·Weather·Summary — `ACTIVATE_SCHEDULED` — order 2
- `NURI-04-STARTER.md` — Records·Timeline — `ACTIVATE_SCHEDULED` — order 3
- `NURI-05-STARTER.md` — Schedules·Health·Activity — `ACTIVATE_LATER`
- `NURI-06-STARTER.md` — Community·Moderation — `ACTIVATE_LATER`
- `NURI-07-STARTER.md` — Notifications·Operations Messages — `ACTIVATE_LATER`
- `NURI-08-STARTER.md` — Hospital·Walk POI·Pet Travel — `ACTIVATE_LATER`
- `NURI-09-STARTER.md` — Supabase·RLS·RPC·운영DB — `ACTIVATE_SCHEDULED` — order 4, shared-backend primary / cross-domain supporting
- `NURI-10-STARTER.md` — Admin Web·Operations — `ACTIVATE_LATER`
- `NURI-11-STARTER.md` — Design System·Accessibility — `ACTIVATE_LATER`
- `NURI-12-STARTER.md` — Android·Release-QA — `ACTIVATE_SCHEDULED` — order 6, release-control primary / feature-regression supporting
- `NURI-13-STARTER.md` — Guides·Rewards·Private Memory — `ACTIVATE_LATER`
- `NURI-14-STARTER.md` — v1.1 Architecture·Expansion — `REFERENCE_ONLY`

각 starter에는 정확한 첫 문장, BOOTSTRAP_ONLY, WRITE_LOCKED, dynamic HEAD 확인 명령, ownership, scope, 금지 범위, bootstrap report 형식이 포함된다.

## Physical Room 생성과 activation 순서

모든 NURI-01~NURI-14 일반 Room은 사용자가 미리 생성할 수 있다. 아래는 물리적 생성 순서가 아니라 첫 write activation 순서다.

1. NURI-02 — DATE-001, 현재 dirty 날짜 입력
2. NURI-03 — HOME-001, 현재 dirty Home
3. NURI-04 — TIMELINE-001, 전체 요약/Timeline parity와 fast re-entry
4. NURI-09 — AUTH-001 remote Provider read-only 및 SUPABASE-001 지원
5. NURI-01 — AUTH-001 app-side Naver 완전 제거
6. NURI-12 — clean RC와 Google/Kakao 회귀

물리적 생성은 사용자가 원하는 시점에 전부 수행할 수 있다. bootstrap은 Room별로 순차 진행하고, 동시에 하나의 write room만 허용한다.

## 별도 Room을 만들지 않는 범위

- Community 조회수 전용 room: NURI-06에 흡수
- Weather 전용 room: NURI-03에 흡수
- DatePicker 단일 버그 room: NURI-02에 흡수
- Home Recent Records 전용 room: NURI-03에 흡수
- DB migration one-off room: NURI-09에 흡수
- Test-only room: owning domain과 NURI-12에 흡수

## Ownership index

상세 범위는 `rooms/` ownership 문서와 `NURI-MASTER-TASK-ROUTING-POLICY.md`를 함께 읽는다.
