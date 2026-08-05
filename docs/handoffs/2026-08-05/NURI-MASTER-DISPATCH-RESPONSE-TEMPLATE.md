# NURI Master Dispatch Response Template

## Dispatch decision

- 요청:
- primary room:
- supporting room:
- activation sequence:
- physical room state:
- bootstrap state:
- write state:
- issue IDs:
- 선행 조건:
- 이번 작업에서 수정하지 않을 범위:

## User handoff

새 room이 없거나 물리적 존재가 확인되지 않으면 다음과 같이 안내한다.

1. 정확한 room 이름을 사용자가 Codex UI에서 생성한다.
2. `docs/handoffs/2026-08-05/[NURI-XX-STARTER.md]`의 단일 code block을 첫 메시지로 전달한다.
3. bootstrap report가 `BOOTSTRAP_READY / WRITE_LOCKED`가 되면 NURI-00에서 activation을 승인한다.
4. 승인된 room만 `WRITE_ACTIVE`로 전환한다.

## Completion return

완료 후 `NURI-ROOM-COMPLETION-RETURN-TEMPLATE.md`를 채워 이 master room으로 반환한다. Master는 증적과 ownership을 검수하고 다음 room을 순차 승인한다.
