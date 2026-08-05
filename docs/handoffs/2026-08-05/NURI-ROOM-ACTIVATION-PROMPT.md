# NURI Room Activation Prompt

아래 prompt는 bootstrap 완료 후 NURI-00이 한 번에 하나의 room을 활성화할 때 사용한다.

```md
NURI-00 활성화 승인

Room: [정확한 room 이름]
Issue: [issue ID]
Activation class: [ACTIVATE_FIRST | ACTIVATE_SCHEDULED | ACTIVATE_LATER | REFERENCE_ONLY]
Activation order: [1~6 | 마스터 승인 시 결정 | v1.1 승인 시 결정]
Write state: WRITE_ACTIVE
Primary scope: [ownership 문서의 범위]
Supporting rooms: [없으면 없음]
Actual HEAD at approval: [room이 방금 실행한 git rev-parse HEAD]
Dirty files allowed: [명시 목록]

이 승인 이후에도 명시된 scope만 수정하라. 다른 room의 runtime, migration, 문서, dirty hunk를 수정하지 마라. 작업 완료 시 `NURI-ROOM-COMPLETION-RETURN-TEMPLATE.md`를 채우고 `WRITE_COMPLETE`로 보고하라.
```

## Read-only bootstrap approval

`BOOTSTRAP_READY / WRITE_LOCKED` report만 승인한다. room 존재 자체는 사용자 UI 확인으로 별도 기록한다.

## Read-only audit prompt

```md
이 Room은 현재 READ_ONLY_AUDIT 상태다. 코드·문서·DB를 수정하지 마라.

Room: [정확한 Room 이름]
목적: [issue 또는 contract 조사]
확인 범위: [screens/code/services/store/Supabase/tests]
기준: room 시작 시 `git rev-parse HEAD`, 실제 코드, linked remote, canonical 문서 순서
금지: stage, commit, push, runtime 수정, migration/RLS/RPC 수정, production data, Android 조작, 기존 dirty 변경 삭제

보고:
- 실제 HEAD / branch / git status
- 확인한 파일과 ownership
- 구현·검증·출시 상태
- open risk와 근거
- 다른 Room과의 경계
- write가 필요해지는 조건
- NURI-00에 요청할 다음 activation
```
