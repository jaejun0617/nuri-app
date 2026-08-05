# NURI Room Naming and Ownership Policy

## 고정 상태

- Physical: `ROOM_EXISTS`, `ROOM_EXISTENCE_UNCONFIRMED`
- Bootstrap: `BOOTSTRAP_NOT_STARTED`, `BOOTSTRAP_READY`
- Activation class: `ACTIVATE_FIRST`, `ACTIVATE_SCHEDULED`, `ACTIVATE_LATER`, `REFERENCE_ONLY`
- Activation order: `1`~`6`, `마스터 승인 시 결정`, `v1.1 승인 시 결정`
- Write: `WRITE_LOCKED`, `WRITE_ACTIVE`, `WRITE_COMPLETE`

물리적 room 존재, bootstrap 완료, activation 승인, 실제 write 완료는 서로 다른 상태다. Codex는 Codex UI 밖의 room 존재를 자동 확인하지 않는다.

## 이름

`NURI-번호-장기 도메인` 형식을 사용한다. 번호는 확정 후 재배치하지 않는다. 화면 하나나 단일 버그마다 room을 만들지 않는다. 이름만 보고 소유 범위를 알 수 있어야 한다.

## 소유권

- 한 문제에는 primary room 하나만 둔다.
- Home 전체 요약 → Timeline 이동은 NURI-04가 primary이며 NURI-03은 navigation payload의 최소 변경만 지원한다.
- 날짜 입력은 NURI-02가 소유한다.
- 공통 Supabase migration/RLS/RPC/grant는 NURI-09가 소유한다.
- 공통 typography/accessibility token은 NURI-11이 read-only 검수하고 feature room이 실제 feature 적용을 소유한다.
- Release room은 build, signing, device, logcat, store gate만 소유한다.
- Master room은 정책, 우선순위, routing, completion review만 소유하고 runtime write를 하지 않는다.

## AUTH-001 경계

최종 정책은 Google ON, Kakao ON, Naver 완전 제거, Apple OFF다. 정책 재결정 room은 만들지 않는다.

1. NURI-01: app-side code, navigation, OAuth helper, config, env, dependency, current docs의 Naver 잔존 제거
2. NURI-09: remote Supabase Provider read-only 확인 및 공용 catalog 증거
3. NURI-12: clean release에서 Google/Kakao 회귀와 APK evidence

## Bootstrap 규칙

모든 새 room starter의 첫 두 문장은 다음과 같아야 한다.

1. `이 새 대화방은 기존 NURI 장기 대화와 보관된 다른 대화방의 내용을 자동으로 기억한다고 가정하지 마라.`
2. `현재 이 대화방은 BOOTSTRAP_ONLY 상태다. NURI-00-마스터-현황·결정·과거이력의 별도 활성화 승인 전에는 코드·문서·DB를 수정하지 마라.`

bootstrap 동안에는 read-only 조사와 report 작성만 허용한다. 모든 room은 `BOOTSTRAP_READY / WRITE_LOCKED`로 보고한 뒤에야 활성화 후보가 된다.

## 작업 규칙

- 새 room은 사용자가 Codex UI에서 직접 생성한다.
- 보관된 과거 대화는 자동 상속으로 간주하지 않는다.
- 시작 시 실제 코드, Git, canonical 문서를 다시 읽는다.
- write room은 동시에 하나만 실행한다. read-only audit만 병렬 허용한다.
- 기존 dirty hunk는 먼저 소유자를 판정하고 임의로 stage하지 않는다.
- unknown 변경은 삭제하거나 commit하지 않는다.

## 완료 보고

수정 파일, 테스트, remote/device evidence, commit/push, 최종 status, 남은 risk, canonical 반영, 다음 dependency를 master room으로 전달한다. Master는 `완료`, `조건부 완료`, `보완 필요`, `실패` 중 하나로 판정한다.
