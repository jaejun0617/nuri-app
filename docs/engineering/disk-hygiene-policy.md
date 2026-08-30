# NURI Native Build Disk Hygiene Policy

이 정책은 Android native build, true-release build, QA isolated worktree, release artifact 생성 작업의 공통 preflight와 closeout 기준이다.

## Threshold

- `>=35 GiB`: healthy
- `25–35 GiB`: build allowed, closeout cleanup recommended
- `15–25 GiB`: stale generated output cleanup required before native build
- `<15 GiB`: native build blocked

native build를 시작하기 전에 항상 `df -h`로 현재 여유 공간을 기록한다. 35–40GiB는 운영 목표이며, 25GiB 미만에서는 안전한 생성물 정리 후에도 gate를 충족하지 못하면 build하지 않는다.

## Preflight inventory

다음 항목은 삭제 전에 실제 크기와 사용 여부를 확인한다.

- NURI repository의 `node_modules`, `android/app/build`, `android/build`
- detached QA worktree와 그 내부 `node_modules`, Android build output
- `/tmp/nuri-*`, `/private/tmp/nuri-*`의 temporary checkout와 APK staging
- project/global Gradle cache, Yarn/Corepack cache, NVM Node installation

기존 source, `.git`, dirty worktree, project-memory, research, canonical QA evidence, 승인 APK, keystore/signing material, Android SDK/NDK, 사용자 파일은 cleanup 대상이 아니다.

## Safe cleanup

완료된 task의 재생성 가능한 isolated worktree와 generated build output을 우선 정리한다. 승인 APK와 evidence가 build tree 안에 있으면 먼저 별도 canonical 위치에 보존한 뒤 build output만 제거한다. Git worktree metadata가 있는 directory는 수동 삭제하지 않고 `git worktree remove`로 처리한다.

global Gradle/Yarn cache는 Tier 1 cleanup 후에도 공간이 부족할 때만 선택적으로 정리한다. 전체 cache 삭제를 기본값으로 사용하지 않는다. `git clean`, `git reset`, `git stash`, `git checkout .`은 사용하지 않는다.

## Required closeout fields

각 native/build/QA task의 closeout에는 다음을 남긴다.

```text
DISK_BEFORE_TASK:
DISK_BEFORE_CLEANUP:
TASK_TEMP_OUTPUT_CREATED:
TASK_TEMP_OUTPUT_REMOVED:
SPACE_RECOVERED:
DISK_AFTER_CLEANUP:
CANONICAL_ARTIFACT_PRESERVED:
QA_EVIDENCE_PRESERVED:
EXISTING_DIRTY_PRESERVED:
DISK_HYGIENE:
```

cleanup은 commit/push/evidence 확보 이후 task closeout의 마지막 단계로 수행한다. 다음 task가 시작되기 전에 다시 disk preflight를 실행한다.
