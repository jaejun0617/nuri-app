# NURI Room Naming and Ownership Policy

## 이름

`NURI-번호-장기 도메인` 형식을 사용한다. 번호는 확정 후 재배치하지 않는다. 화면 하나나 단일 버그마다 room을 만들지 않는다.

## 소유권

- 한 문제에는 primary room 하나만 둔다.
- 공유 Supabase 계약은 `NURI-09`가 primary다.
- 공통 typography/accessibility token은 `NURI-11`이 검수하지만 feature runtime은 feature room이 수정한다.
- Release room은 build, signing, device, logcat, store gate만 소유한다.
- Master room은 정책과 검수만 소유한다.

## 작업 규칙

- 새 room은 사용자가 Codex UI에서 직접 생성한다.
- 보관된 과거 대화는 자동 상속으로 간주하지 않는다.
- 시작 시 실제 코드, Git, canonical 문서를 다시 읽는다.
- write room은 동시에 하나만 실행한다. read-only audit만 병렬 허용한다.
- 기존 dirty hunk는 먼저 소유자를 판정하고 임의로 stage하지 않는다.

## 완료 보고

수정 파일, 테스트, device/remote evidence, commit/push, 최종 status, 남은 risk를 master room으로 전달한다.
