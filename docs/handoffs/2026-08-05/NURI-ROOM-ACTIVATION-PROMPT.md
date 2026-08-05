# NURI Room Activation Prompt

아래 prompt는 bootstrap 완료 후 NURI-00이 한 번에 하나의 room을 활성화할 때 사용한다.

```md
NURI-00 활성화 승인

Room: [정확한 room 이름]
Issue: [issue ID]
Activation: [ACTIVATE_FIRST | ACTIVATE_PRIORITY_2 | ACTIVATE_LATER]
Write state: WRITE_ACTIVE
Primary scope: [ownership 문서의 범위]
Supporting rooms: [없으면 없음]
Actual HEAD at approval: [room이 방금 실행한 git rev-parse HEAD]
Dirty files allowed: [명시 목록]

이 승인 이후에도 명시된 scope만 수정하라. 다른 room의 runtime, migration, 문서, dirty hunk를 수정하지 마라. 작업 완료 시 `NURI-ROOM-COMPLETION-RETURN-TEMPLATE.md`를 채우고 `WRITE_COMPLETE`로 보고하라.
```

## Read-only bootstrap approval

`BOOTSTRAP_READY / WRITE_LOCKED` report만 승인한다. room 존재 자체는 사용자 UI 확인으로 별도 기록한다.
