# docs 정리 가이드

## 2026-11-09 문서 역할 안내

| 판단 | 소유 문서 |
| --- | --- |
| 현재 구현·수락·미완료 요약 | [현재 상태](project-memory/현재-프로젝트-상태.md) |
| 수락 ID·후보별 증거·동결 범위 | [단일 수락 원장](qa/nuri-integrated-closeout-2026-10-25.md) |
| 다음 작업·승인·선행 조건 | [우선순위](project-memory/다음-작업-우선순위.md) |
| 수행 이유와 날짜별 이력 | [작업 로그](project-memory/최근-작업-로그.md) |
| 지속 적용 정책 | [핵심 결정](project-memory/핵심-결정사항.md) |
| 기술적 선택과 리스크 | [리서치](리서치/리서치.md#2026-11-09-문서-역할과-sql-실행본-보존) |
| SQL 역할·소비 관계 | [SQL 가이드](sql/정리-가이드.md) |

과거 canonical·release snapshot은 해당 날짜의 판단이다. 현재 구현은 소스, 운영 반영은 운영 증거, 실제 수락은 원장을 각각 확인한다. 문서 정리는 기능 검증 재개나 출시 승인이 아니다.

2026-09-14 당시 NURI v1.0의 제품 상태, 완료 작업, release/실기기 QA 증적, 남은 gate는
[`release/v1.0-closeout/05-documentation-index.md`](release/v1.0-closeout/05-documentation-index.md)에서 먼저 확인한다.
이 closeout은 해당 날짜의 과거 스냅샷이다. 현재 판단은 위 역할 안내의 현재 상태와 단일 수락 원장을 따른다.

`docs`는 역할 기준으로 아래처럼 본다.

- `docs/domains/`
  - 기능별 설계 문서, 통합 문서, 체크리스트
- `docs/sql/`
  - 실행 기준 SQL, 마이그레이션, 수동 릴리즈 SQL
  - 도메인 SQL도 여기서 함께 본다
- `docs/operations/`
  - 마이그레이션 운영 기준, 공용 릴리즈 운영 기준, 프로젝트 진행 현황
- `docs/project-memory/`
  - 현재 상태, 결정사항, 작업 로그, 다음 우선순위
- `docs/engineering/`
  - 개발 워크플로와 엔지니어링 기준
- `docs/qa/`
  - QA 체크리스트

## 빠른 탐색 기준

- 기능 문서를 찾을 때: `docs/domains/<도메인명>/`
- 실행할 SQL을 찾을 때: `docs/sql/`
- 운영 기준 문서를 찾을 때: `docs/operations/`
- 현재 프로젝트 맥락을 볼 때: `docs/project-memory/`

## 정리 원칙

- `docs` 루트에는 역할 폴더만 둔다.
- 설명·수동 SQL은 `docs/sql/`, 버전 migration은 `supabase/migrations/`, 계약 검사는 `supabase/tests/` 등 실제 소비 경로에 보존한다. 위치 변경에는 소비 관계 검토가 필요하다.
- 처음 보는 사람도 경로만 보고 문서 성격을 이해할 수 있어야 한다.
- 같은 성격의 문서는 흩어놓지 않고 같은 폴더에 묶는다.
