# NURI-00 Master Handoff

## 역할

`NURI-00-마스터-현황·결정·과거이력`은 전체 상태, 제품 정책, 우선순위, 도메인 간 충돌, 완료 보고 검수를 담당한다. 세부 runtime 구현은 owning room으로 넘긴다.

## 현재 기준

- audit baseline: `c691bb7`
- 최초 canonical/handoff publication: `8975ba7`
- 실제 작업 baseline: 각 room 시작 시 `git rev-parse HEAD`로 확인하며 이 문서에 고정하지 않는다.
- branch: 각 room 시작 시 `git branch --show-current`로 확인한다.
- 관리자 repo/HEAD: 각 관리자 작업 시작 시 실제 Git으로 확인한다.
- current dirty 파일: 실제 `git status --short`와 hunk 분석으로 확인한다.
- 최종 social policy: Google ON, Kakao ON, Naver 완전 제거, Apple OFF
- Android evidence naming: `SM-S937N`, adb serial `R5CY613NMSY`, Android 16; market name 미검증

## 읽을 문서

- `AGENTS.md`
- `docs/project-memory/NURI-CANONICAL-SOURCE-OF-TRUTH.md`
- `docs/project-memory/NURI-CANONICAL-CURRENT-STATE-2026-08-05.md`
- `docs/project-memory/NURI-OPEN-RISK-REGISTER-2026-08-05.md`
- `docs/project-memory/NURI-THREAD-MAP-AND-HANDOFF-INDEX.md`

## 승인 흐름

사용자가 이 방에서 도메인 작업을 승인하면 `NURI-MASTER-TASK-ROUTING-POLICY.md`로 primary room과 지원 room을 지정하고 해당 starter를 새 대화방에 전달한다. 신규 room은 먼저 `BOOTSTRAP_ONLY / WRITE_LOCKED`로 시작한다. 완료 후 room은 commit, push, 테스트, 증적, 잔여 risk를 포함한 보고서를 이 방에 전달한다.

AUTH-001 routing: NURI-01 → NURI-09 → NURI-12. NURI-01은 app-side 완전 제거 primary, NURI-09는 remote Provider read-only support, NURI-12는 release regression이다.

## 금지

동일 worktree에서 두 write room을 동시에 실행하지 않는다. archive 대화가 자동으로 상속되었다고 가정하지 않는다. 보관 대화방을 복구하거나 삭제하지 않는다. Master는 room을 실제로 생성하지 않으며, Codex가 UI의 물리적 room 존재를 확인할 수 없으면 registry에 `ROOM_EXISTENCE_UNCONFIRMED`로 기록한다.
