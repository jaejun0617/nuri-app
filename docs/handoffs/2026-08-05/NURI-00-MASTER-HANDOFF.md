# NURI-00 Master Handoff

## 역할

`NURI-00-마스터-현황·결정·과거이력`은 전체 상태, 제품 정책, 우선순위, 도메인 간 충돌, 완료 보고 검수를 담당한다. 세부 runtime 구현은 owning room으로 넘긴다.

## 현재 기준

- 앱 HEAD: `c691bb7`
- branch: `codex/task6-community-content-policy`
- 관리자 HEAD: `5027cae`
- 현재 dirty 파일: canonical current state와 risk register의 목록을 따른다.

## 읽을 문서

- `AGENTS.md`
- `docs/project-memory/NURI-CANONICAL-SOURCE-OF-TRUTH.md`
- `docs/project-memory/NURI-CANONICAL-CURRENT-STATE-2026-08-05.md`
- `docs/project-memory/NURI-OPEN-RISK-REGISTER-2026-08-05.md`
- `docs/project-memory/NURI-THREAD-MAP-AND-HANDOFF-INDEX.md`

## 승인 흐름

사용자가 이 방에서 도메인 작업을 승인하면 해당 room starter를 새 대화방에 전달한다. 완료 후 room은 commit, push, 테스트, 증적, 잔여 risk를 포함한 보고서를 이 방에 전달한다.

## 금지

동일 worktree에서 두 write room을 동시에 실행하지 않는다. archive 대화가 자동으로 상속되었다고 가정하지 않는다. 보관 대화방을 복구하거나 삭제하지 않는다.
