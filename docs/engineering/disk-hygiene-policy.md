# NURI Native Build Disk Hygiene Policy

이 정책은 Android native build, true-release build, QA isolated worktree, release artifact 생성 작업의 공통 preflight와 closeout 기준이다.

## 현재 적용과 삭제 승인 경계

2026-11-13 PO 승인: 로컬 native build 시작 직전 **각 필요 볼륨에 25 GiB 이상**, 정리 목표 **35 GiB**. 25 GiB 이상이면 목표 미달만으로 빌드를 막지 않는다. [15 GB 일반 작업 경고](../project-memory/핵심-결정사항.md#2026-11-11-작업-장비-저장공간-기준)는 목적과 단위가 다르다. 작업 시작, 산출물 보존 후, 각 정리 후, 빌드 직전과 종료 시 실제 가용 bytes와 GiB를 남긴다. 빌드 경로·실제 `GRADLE_USER_HOME`·임시 경로가 같은 볼륨이면 중복 합산하지 않는다. 할당량은 APFS 공유 블록·스냅샷·열린 파일 때문에 회수량의 보장이 아니다.

- **A (상시 승인):** 현재 NURI와 종료를 증명한 NURI QA 복사본의 재생성 Android 출력·프로젝트 캐시·native 중간 파일·NURI 전용 종료 캐시. 정확한 경로와 재생성·비사용을 확인한다. 종료 작업을 먼저, 현재 증분 출력은 나중에 처리한다.
- **B (A 후 25 GiB 미달 시에만):** 실제 Gradle 사용자 홈의 build cache, 현재 wrapper 버전의 transform·생성 JAR·컴파일 DSL 및 식별된 생성 JAR 캐시. Gradle·IDE·빌드의 사용 여부를 확인하지 못하면 보존한다. 다운로드 의존성, `modules-2`, wrapper 배포본은 제외한다.
- **보호 우선:** APK/AAB·번들·소스맵·심볼·필수 검사/실행 증거는 생성물 밖의 독립 보존본과 SHA-256을 먼저 확인한다. 기존 동등 보존본을 재사용하고 과거 영수증은 덮어쓰지 않는다. 도구가 보호 항목을 찾으면 그 후보를 건너뛴다. 순수 캐시는 통째로 복제하지 않는다. 원본·dirty·설정·키·계정·SQL·문서, SDK/NDK/JDK, 패키지 원문 및 `node_modules` 전체, Docker/AVD, 사용자·OS·다른 프로젝트 자료는 자동 정리하지 않는다. 범위 밖 삭제는 별도 승인 대상이다.

## 로컬 실행

[디스크 도구](../../scripts/nuri-disk.py)는 macOS의 Python 3.11 이상과 시스템 도구만 사용한다. 프로젝트 루트에서 아래와 같이 실행한다.

- `python3 -B scripts/nuri-disk.py`: 삭제 없는 보고. 작업 전 후보의 정확한 경로·크기·보존/제외 사유와 재생성 비용을 공유한다.
- `python3 -B scripts/nuri-disk.py apply-approved --plan /absolute/path/to/report.json`: 보고와 현재 후보를 대조하고 승인 안에서 적용한다. 계획 파일은 새 경로를 허용하지 않는다. 종료 QA 복사본을 포함하려면 `~/.codex/nuri-disk-runs/completed-qa.json`에 그 복사본의 절대 `root`와 바깥 완료 근거 `evidence`를 등록한다. 다른 worktree를 자동 탐색하거나 삭제하지 않는다.
- `python3 -B ../scripts/nuri-disk.py prebuild -- ./gradlew …`: `android/`에서 승인된 Gradle 명령을 실행할 때 사용한다. 필요하면 후보를 보고하고 승인 정리 뒤 재측정한다. 최소치 미달 또는 가용 공간·권한 확인 실패면 Gradle을 시작하지 않는다. NURI 도구를 통과하는 로컬 빌드와 정리는 같은 잠금을 쓴다. 다른 작업은 프로세스·열린 파일을 확인하며 강제 종료하지 않는다.

`yarn android:release:qa`와 `yarn android:release:store`의 공통 로컬 래퍼는 이전 산출물 복제 전과 Gradle 직전에 위 prebuild를 호출한다. 임시 Metro OFF QA 빌드도 동일 guard로 감싼다. 직접 Gradle/IDE·다른 스크립트·CI의 자동 적용을 보장하지 않으며 예약 실행은 없다. 실행 영수증은 `~/.codex/nuri-disk-runs/`에 남는다. 작업 종료 시 증거 보존 후 보고하며 공간이 충분하면 증분 캐시를 유지한다.

아래 보존 블록은 이전 정책의 역사 원문이다. 임계치·정리 예시·별도 승인 경계가 위 현행 규칙과 다르면 위 규칙이 우선한다.

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
