# AGENTS.md

NURI의 작업 진입점이다. 실서비스 품질의 React Native·TypeScript·Supabase·Android 우선·styled-components 프로젝트를 다룬다. 상세 절차를 이 파일에 복제하지 않는다.

## 적용 범위와 권한

- 이 저장소와 그 하위 작업에 적용한다. 시스템·보안·도구 권한 안에서 **현재 PO 지시**의 목적·환경·변경 범위·종료 조건을 먼저 확정한다. 문서·기획·과거 명령 자체가 새 실행 권한은 아니다.
- 현재 수행 방식은 **Master 단독**이다. 별도 위임 승인이 없으면 Room·하위 에이전트를 만들거나 호출하지 않는다. [8/05 라우팅](docs/handoffs/2026-08-05/NURI-MASTER-TASK-ROUTING-POLICY.md#historical-scope)은 역사 자료이며 현재 Master 쓰기를 금지하지 않는다.
- 구현 사실은 소스, 배포·설치는 영수증, 수락은 원장, 요구사항은 승인 계약으로 판단한다. 코드가 다르다고 요구를 폐기하거나 PASS로 승격하지 않는다. [사실별 근거](docs/engineering/advanced-codex-memory.md#authority-map)를 따른다.

## 시작할 때 읽는 지도

| 필요한 판단 | 읽을 위치 |
| --- | --- |
| 승인·원인 분석·최소 수정·계속/중단 | [Workflow 실행 핵심](docs/engineering/advanced-codex-workflow.md#execution-contract) |
| 이번 작업에 적용할 검사·증거 | [Checklist 적용성](docs/engineering/advanced-codex-checklist.md#applicability) |
| 정보 권위·현재/역사·갱신·인계 | [Memory](docs/engineering/advanced-codex-memory.md#authority-map) |
| 최신 확인된 제품·설치·서버·수락 | [현재 상태](docs/project-memory/현재-프로젝트-상태.md#current-baseline) |
| 현재 승인과 유일한 다음 지점 | [우선순위](docs/project-memory/다음-작업-우선순위.md#resume-point) |
| 적용 정책·예외 | [핵심 결정 적용 지도](docs/project-memory/핵심-결정사항.md#decision-scope-map) |
| 직전 관련 작업의 이유·결과 | [최근 로그](docs/project-memory/최근-작업-로그.md) |
| 실제 QA 판정 | [단일 수락 원장](docs/qa/nuri-integrated-closeout-2026-10-25.md)의 대상 행과 연결 증거 |
| SQL·서버 변경을 승인받은 작업 | [SQL 가이드](docs/sql/정리-가이드.md)의 실제 소비 경로 및 해당 계약 |
| 도메인 구현·기술 판단 | 해당 승인 기획, 관련 소스·테스트와 [리서치](docs/리서치/리서치.md)의 관련 절 |

핵심과 직전 관련 절은 직접 확인한다. 새 세션·컨텍스트 유실·파일 hash 또는 범위 변경 시 재확인하되, 변경 없는 긴 전체 이력을 매 세부 단계마다 다시 읽지 않는다. 자동 주입과 도구로 읽기를 구분하며 읽지 않은 자료를 읽었다고 하지 않는다. [로드 확인 규칙](docs/engineering/advanced-codex-memory.md#instruction-loading)을 따른다.

## 보호 원칙

- 원인 가설은 허용하되 검증 전 사실로 단정하지 않는다. 원인 분석 → 최소 수정 → 해당 범위 검증을 따른다. 알려지지 않은 사실은 UNKNOWN이다.
- 기존 dirty·untracked·계정·데이터·증거를 보존한다. 실패를 이유로 전체 reset·stash·clean·초기화하지 않는다. 비밀값은 채팅·문서·Git·앱·화면 증거에 남기지 않는다.
- 승인 안의 연속 작업은 중간보고 후 이어간다. 실제 차단·STOP·범위 종료에서는 [계속/중단 규칙](docs/engineering/advanced-codex-workflow.md#continue-stop)을 적용한다. 파일 수만으로 재승인하거나 위험을 적었다는 이유로 운영 권한을 확대하지 않는다.
- 기존 타입·테마·AppText·공통 오류 계약을 재사용한다. `any`·타입 무시·검사 skip·권한 완화·결과 직접 조작으로 통과시키지 않는다. [코드·도메인 보호](docs/engineering/advanced-codex-workflow.md#code-domain-safety)를 따른다.
- Candidate / Trust / User Layer를 분리한다. confirmed는 명시적 개방 전 닫혀 있으며 개인화 데이터로 public trust를 올리지 않는다. 커뮤니티 moderation·초안·create/update/comment 방어를 보존한다.
- [고정 디자인과 후속 예외](docs/project-memory/핵심-결정사항.md#2026-11-06-po-고정-모든-후속-디자인의-cta와-글자-크기)를 시안만으로 바꾸지 않는다. 개발 Metro 확인과 독립 설치본 최종 수락은 [별도 경계](docs/engineering/advanced-codex-workflow.md#metro-개발과-설치본-최종-수락)다.
- 로컬 부재는 운영 부재 증거가 아니다. remote/runtime 확인은 태스크에 필요하고 승인된 최소 범위만 한다. 문서 작업을 DB·기기 조작으로 확대하지 않는다.
- [변화 기반 갱신](docs/engineering/advanced-codex-memory.md#update-triggers), [검사 결과와 재사용](docs/engineering/advanced-codex-checklist.md#evidence-contract), [전달·보고](docs/engineering/advanced-codex-workflow.md#delivery)로 마감한다. 문서·CI 완료는 제품 수락·출시 승인이 아니다.

## 개정과 적용 확인

2026-11-11 운영지침 개편 PO 승인에 따라 상세 규칙의 소유자를 정리했다. [변경 이력](docs/project-memory/최근-작업-로그.md#2026-11-11-codex-운영지침-개편)에 원문·검증·전달 근거를 연결한다. 다음 정상 실행의 자동 로드와 실제 행동 확인은 별도이며, 파일 저장만으로 적용 완료를 선언하지 않는다.
