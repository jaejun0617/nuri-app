# NURI Native Build Disk Hygiene Policy

이 정책은 Android native build, true-release build, QA isolated worktree, release artifact 생성 작업의 공통 preflight와 closeout 기준이다.

## 현재 적용과 삭제 승인 경계

2026-11-11 안내 보정: [가용 공간 15 GB 이하 기준](../project-memory/핵심-결정사항.md#2026-11-11-작업-장비-저장공간-기준)은 대용량 작업 전 확보를 우선하는 일반 기준이다. 아래 native build의 **25 GiB headroom·35–40 GiB 목표**와 목적·단위가 다르며 수치를 서로 대체하지 않는다. 이 문서 전체의 작성 시점은 미확인이며 보정일을 원문 작성일로 소급하지 않는다.

아래 Threshold·Safe cleanup·closeout의 정리 문구는 **정확한 대상과 삭제가 별도로 승인된 경우에만** 적용한다. [10/05 산출물 보존과 후속 실행 경계](advanced-codex-workflow.md#2026-10-05-po-최신-정책-디자인-반복-빌드-산출물-유지), [현행 보존·정리 기준](advanced-codex-workflow.md#delivery)에 따라 build/cache·승인 APK·증거·dirty·공유 캐시를 자동 삭제하지 않는다. 공간 부족만으로 새 삭제 권한이 생기지 않으며, 승인 없이 정리가 필요하면 대상·보존·재생성 근거를 제시하고 해당 대용량 작업만 대기한다.

아래 목록은 점검 후보이지 삭제 목록이 아니다. closeout의 '마지막 단계'는 승인된 정리의 순서이며 매 작업마다 cleanup을 의무 실행한다는 뜻이 아니다. 이번 문서 보정에서는 공간 측정·삭제·빌드·기기 작업을 수행하지 않는다. 실제 빌드 필요성은 [Metro 개발과 설치본 수락](advanced-codex-workflow.md#metro-개발과-설치본-최종-수락)을 따른다.

<!-- DISK_POLICY_PRESERVED_BEGIN -->
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
<!-- DISK_POLICY_PRESERVED_END -->
