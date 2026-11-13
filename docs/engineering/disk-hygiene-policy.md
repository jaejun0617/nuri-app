# NURI Native Build Disk Hygiene Policy

이 정책은 Android native build, true-release build, QA isolated worktree, release artifact 생성 작업의 공통 preflight와 closeout 기준이다.

## 현재 적용과 삭제 승인 경계

2026-11-13 PO 승인: 로컬 native build 시작 직전 **각 필요 볼륨에 25 GiB 이상**, 정리 목표 **35 GiB**. 25 GiB 이상이면 목표 미달만으로 빌드를 막지 않는다. [15 GB 일반 작업 경고](../project-memory/핵심-결정사항.md#2026-11-11-작업-장비-저장공간-기준)는 목적과 단위가 다르다. 작업 시작, 산출물 보존 후, 각 정리 후, 빌드 직전과 종료 시 실제 가용 bytes와 GiB를 남긴다. 빌드 경로·실제 `GRADLE_USER_HOME`·임시 경로가 같은 볼륨이면 중복 합산하지 않는다. 할당량은 APFS 공유 블록·스냅샷·열린 파일 때문에 회수량의 보장이 아니다.

- **A–C:** 종료 QA 빌드 출력, 비사용 Android 출력·프로젝트 Gradle 캐시, 실제 Gradle 홈의 재생성 build cache·transforms·생성 JAR·컴파일 DSL. 종료된 작업을 우선하고 Gradle·IDE·열린 파일 상태를 확인한다. 공유 다운로드 캐시는 재다운로드와 소비 관계가 확인된 정확한 항목만 별도 실행 목록에 넣는다. 현재 빌드의 의존성과 wrapper는 유지한다.
- **D·H:** 종료 QA의 중복 의존성과 재생성 환경. 잠금파일·패치·고정 도구로 재설치한 결과를 원본과 대조하고, 고유 수정·미추적 원본·증거는 먼저 보존한다. 도구는 등록된 `node_modules`만 제거하며 QA 작업본·Git 이력·브랜치 자체를 제거하지 않는다.
- **E–G:** 사용하지 않는 Metro·Yarn·npm·IDE 생성 캐시, 복원과 참조를 확인한 Docker 빌드 캐시·이미지, 미사용 NURI 에뮬레이터 스냅샷. 현 도구는 Metro 변환 캐시와 등록된 NURI Quick Boot 스냅샷을 처리한다. 다른 캐시와 Docker는 정확한 대상과 현재 사용·복원 검증을 거쳐 별도 실행한다. Docker 컨테이너·볼륨과 에뮬레이터 사용자 데이터는 보호한다.
- **보호 우선:** 현재 설치의 복구 APK, 고유 APK/AAB·번들·소스맵·심볼·검사/실행 증거, 원본·dirty·설정·키·계정·SQL·로컬 DB·문서, SDK/NDK/JDK, 사용자·OS·다른 프로젝트 자료는 자동 삭제하지 않는다. 이전 빌드의 순수 복사본은 별도 경로에 독립 정본이 있고 SHA-256이 같은 경우에만 중복 정리한다. 삭제 전 원래 경로·정본·해시를 영수증에 남긴다. 과거 영수증은 덮어쓰지 않는다.

## 로컬 실행

### 과거 QA 증거 분류

- **증거 A:** 유일한 수락·인증·보안·데이터 무결성·장애 증거, 현재 검증 APK와 복구본. 원본을 유지한다.
- **증거 B:** 당시 결과와 대표 증거가 남은 역사 자료. 고유한 내용을 가진 원본은 유지하고, 대표본과 동등하다고 확인한 반복본만 정리한다.
- **증거 C:** 명시적으로 폐기된 후보, 동일 해시 중복본, 재생성 가능한 종료 QA 산출물. 후보와 사용 상태를 확인해 등록한다. 이름이나 날짜만으로 폐기를 추정하지 않는다.

완료 시 PASS/FAIL/BLOCKED 보고서에서 실제 후보·대표 증거를 연결하고, 반복 캡처·중복 APK와 종료 빌드 출력은 각각 검토 목록에 등록한다. 자동 삭제는 정확한 경로, 독립적인 동일 SHA-256 정본, 종료 근거와 그 해시가 등록된 중복 파일 및 기존 생성물 허용 범위에 한정한다. 동일 해시가 아닌 폐기 후보는 폐기 결정·현재 참조·보존 조건을 별도로 대조하며 도구가 추정해 삭제하지 않는다. 삭제 결과는 실제 가용 공간 변화로 보고한다.

동결된 조건이라고 영상 전체를 유지할 필요는 없다. 원장, 정확한 검증 후보, 실행 결과로 확인 가능한 반복 영상은 정리 후보로 둔다. 플리커나 장애 등 영상에만 남은 동작은 대표 원본을 보존하며, 새 실기기 재현을 과거 후보의 증거로 바꾸지 않는다.

### 명령과 영수증

[디스크 도구](../../scripts/nuri-disk.py)는 macOS의 Python 3.11 이상과 시스템 도구만 사용한다. 프로젝트 루트에서 아래와 같이 실행한다.

- `python3 -B scripts/nuri-disk.py`: 삭제 없는 보고. 작업 전 후보의 정확한 경로·크기·보존/제외 사유와 재생성 비용을 공유한다.
- `python3 -B scripts/nuri-disk.py cleanup --plan /absolute/path/to/report.json`: 보고와 현재 후보를 대조하고 35 GiB까지 승인 범위를 적용한다. 회수량이 별도 승인된 정리는 같은 명령에 `--recover-gib 15`처럼 요청량을 명시할 수 있다. 이는 목표이며 보호 대상까지 확장하지 않는다. 기존 `apply-approved`도 같은 모드다. 보고서가 새 경로를 허용하지 않는다. 종료 QA 생성물은 `completed-qa.json`에, 증빙을 검토한 의존성·중복 APK/AAB·중복 영상/이미지·스냅샷은 `reviewed-cleanup.json`에 등록한다. 두 파일은 `~/.codex/nuri-disk-runs/`에 두며 저장소에 커밋하지 않는다.
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
