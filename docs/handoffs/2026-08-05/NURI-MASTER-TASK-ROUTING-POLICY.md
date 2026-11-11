# NURI Master Task Routing Policy

<a id="historical-scope"></a>
## 현재 적용 범위: 2026-08-05 라우팅의 역사 기록

이 문서는 **당시 Room 배분·상태·review 계약**을 보존한다. 아래 'Master는 직접 구현하지 않는다', primary/supporting Room, WRITE_LOCKED, 코드 우선순위는 그 운영 방식의 기록이며 현재 Master 단독 작업에 적용하는 활성 의무가 아니다. 기존 제목·원문·당시 PASS는 유지하며 오늘의 제품 수락이나 새 Room 생성 권한으로 사용하지 않는다.

현재 작업은 [AGENTS](../../../AGENTS.md)에서 시작해 [승인 작업 계약](../../engineering/advanced-codex-workflow.md#execution-contract), [계속·중단](../../engineering/advanced-codex-workflow.md#continue-stop), [작업별 검사](../../engineering/advanced-codex-checklist.md#applicability), [사실별 권위](../../engineering/advanced-codex-memory.md#authority-map)를 따른다. 현재 PO가 Master 단독을 지정하면 위임·새 Room 없이 승인 범위에서 직접 수행한다. 실제 코드가 요구사항·수락 원장·실행 승인을 대체하지 않는다.

현행 상태·후속 큐는 [현재 상태](../../project-memory/현재-프로젝트-상태.md#current-baseline)와 [우선순위](../../project-memory/다음-작업-우선순위.md#resume-point)가 소유한다. 파일 수·과거 review 양식 때문에 무관한 전체 검사·빌드·메모리 쓰기를 강제하지 않으며 read-only·STOP·현재 승인 경계를 유지한다. 증거·재사용·미실행은 [검사 결과 계약](../../engineering/advanced-codex-checklist.md#evidence-contract)으로 구분한다.

2026-11-11 변경은 이 역할 안내만 추가한 것이다. 당시 본문은 아래 그대로이며 [개편 로그](../../project-memory/최근-작업-로그.md#2026-11-11-codex-운영지침-개편)의 원본 hash·대응·전달 영수증으로 추적한다. 다음 정상 실행의 실제 자동 로드는 아직 PENDING이다. 이 역사 문서는 매 작업의 필수 전체 읽기 대상이 아니며 당시 Room 이력을 확인할 때만 읽는다.

<!-- ROUTING_HISTORY_20260805_BEGIN -->
기준일: 2026-08-05

## 목적

`NURI-00-마스터-현황·결정·과거이력`은 작업을 직접 구현하지 않고, 요청을 하나의 primary room과 필요한 supporting room으로 라우팅한다. 이 문서는 room 이름, 실제 존재, bootstrap, activation, write 상태를 분리한다.

## 상태 계약

| 축 | 값 |
| --- | --- |
| Physical room | `ROOM_EXISTS` / `ROOM_EXISTENCE_UNCONFIRMED` |
| Bootstrap | `BOOTSTRAP_NOT_STARTED` / `BOOTSTRAP_READY` |
| Activation class | `ACTIVATE_FIRST` / `ACTIVATE_SCHEDULED` / `ACTIVATE_LATER` / `REFERENCE_ONLY` |
| Activation order | `1`~`6` / `마스터 승인 시 결정` / `v1.1 승인 시 결정` |
| Write | `WRITE_LOCKED` / `WRITE_ACTIVE` / `WRITE_COMPLETE` |

새 room은 사용자가 Codex UI에서 생성한다. Codex는 새 room이나 background agent를 자동 생성하지 않는다. 모든 새 starter는 `BOOTSTRAP_ONLY / WRITE_LOCKED`로 시작하며 NURI-00의 별도 승인 전에는 수정하지 않는다.

## Routing 절차

1. 요청을 기능, 버그, 정책, release, 공용 backend 중 하나로 분류한다.
2. 하나의 primary room을 지정한다.
3. cross-domain 영향이 있으면 supporting room과 순서를 지정한다.
4. room의 physical/bootstrap/activation/write 상태를 registry에서 확인한다.
5. room이 없거나 미확인이라면 사용자가 먼저 생성하고 starter를 전달한다.
6. bootstrap report가 `BOOTSTRAP_READY / WRITE_LOCKED`인지 확인한다.
7. NURI-00이 이번 작업만 `WRITE_ACTIVE`로 승인한다.
8. 완료 report를 review한 뒤 `WRITE_COMPLETE`로 닫고 다음 dependency를 활성화한다.

동시에 `WRITE_ACTIVE`인 room은 하나만 허용한다. 같은 worktree, 같은 Android 기기, 같은 Supabase migration 경계의 병렬 write는 금지한다.

## 결정 routing cases

| Case | Primary | Supporting | 판정 |
| --- | --- | --- | --- |
| 1. 날짜 직접 입력/DatePicker | NURI-02 | NURI-12 필요 시 | PASS |
| 2. 전체 요약 `0 → 실제값` | NURI-03 | Timeline 진입 원인이면 NURI-04, release는 NURI-12 | PASS |
| 3. Timeline fast re-entry | NURI-04 | NURI-03 payload 지원, NURI-12 evidence | PASS |
| 4. Naver 제거 | NURI-01 | NURI-09 remote Provider, NURI-12 release regression | PASS: NURI-01 → NURI-09 → NURI-12 |
| 5. 병원 public field/trust boundary | NURI-09 | NURI-08 feature contract | PASS |
| 6. 전체 typography | NURI-11 read-only 검수 | 실제 변경 feature room을 순차 활성화 | PASS |
| 7. 관리자 신고/운영 도구 | NURI-10 | NURI-09 공용 contract | PASS |
| 8. release APK crash | NURI-12 diagnosis | owning room fix → NURI-12 regression | PASS |
| 9. v1.1 자체 POI/확장 | NURI-14 | NURI-08 → NURI-09 → NURI-12 | PASS |
| 10. 새 unknown domain | 기존 room 흡수 검토 | NURI-00 결정 | PASS: NURI-15는 모든 생성 기준 충족과 사용자 승인 후에만 제안 |

새 domain room 기준은 장기 코드 소유권, 고유 화면/service/store/Supabase 경계, 독립 테스트와 open issue, 기존 room 흡수 불가, 장기 유지 필요성이다. 하나라도 부족하면 기존 room에 흡수한다.

## Cross-domain 규칙

- Home 카드 → Timeline은 NURI-04 primary, NURI-03 payload 최소 지원
- Auth provider 제거는 NURI-01 primary, NURI-09 remote support, NURI-12 regression
- 공용 migration/RLS/RPC/grant는 NURI-09 primary
- Feature room은 DB migration을 독자적으로 확장하지 않는다.
- Design room은 feature 로직을 소유하지 않는다.
- Release room은 기능 버그를 수정하지 않고 owning room으로 반환한다.
- Master room은 runtime, migration, build write를 하지 않는다.

## 완료 review contract

각 room은 다음을 제출한다.

- 작업명, primary/supporting room, 실제 HEAD, branch, git status
- 수정 파일과 소유권, 기존 dirty 변경 보존 여부
- migration/remote 변경 여부와 migration list
- typecheck, lint, focused/전체 test 결과
- Android 기기, APK path/version/checksum, logcat, evidence path
- commit/push/origin 상태
- 구현/검증/출시 상태와 잔여 risk
- canonical/project-memory/handoff 갱신 여부
- 다음 dependency와 master 승인 요청

Master review 판정은 `완료`, `조건부 완료`, `보완 필요`, `실패` 중 하나다. 증적 없는 실기기·remote·release 완료 주장은 승인하지 않는다.

## 기준 우선순위

1. 실제 코드와 Git
2. linked remote와 SQL catalog
3. canonical current 문서
4. room ownership와 handoff
5. historical archive와 과거 대화

현재 작업 기준 HEAD는 문서에 하드코딩하지 않고 각 room 시작 시 `git rev-parse HEAD`로 기록한다. `8975ba7`은 최초 canonical/handoff publication lineage일 뿐 현재 작업 HEAD가 아니다.

<!-- ROUTING_HISTORY_20260805_END -->
