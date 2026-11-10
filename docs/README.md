# docs 정리 가이드

## 2026-11-09 문서 역할 안내

2026-11-10 7차 정리: 현재 판단은 아래 역할별 문서에서 확인한다. 이 안내는 제품 상태나 수락 수치를 별도로 소유하지 않는다.

| 판단 | 소유 문서 |
| --- | --- |
| 현재 구현·수락·미완료 요약 | [현재 상태](project-memory/현재-프로젝트-상태.md) |
| 수락 ID·후보별 증거·동결 범위 | [단일 수락 원장](qa/nuri-integrated-closeout-2026-10-25.md) |
| 다음 작업·승인·선행 조건 | [우선순위](project-memory/다음-작업-우선순위.md) |
| 수행 이유와 날짜별 이력 | [작업 로그](project-memory/최근-작업-로그.md) |
| 적용 범위가 확인된 원칙·조건·예외 | [핵심 결정](project-memory/핵심-결정사항.md), 최신 PO 지시 |
| 기술적 선택과 리스크 | [리서치](리서치/리서치.md#2026-11-09-문서-역할과-sql-실행본-보존) |
| SQL 역할·소비 관계 | [SQL 가이드](sql/정리-가이드.md) |

과거 canonical·release snapshot은 해당 날짜의 판단이다. 현재 구현은 소스, 운영 반영은 운영 증거, 실제 수락은 원장을 각각 확인한다. 문서 정리는 기능 검증 재개나 출시 승인이 아니다.

과거 자료는 `project-memory/아카이브`와 날짜가 명시된 QA·reports에서 찾는다. [9/14 closeout 색인](release/v1.0-closeout/05-documentation-index.md)은 **2026-09-14 당시 제품·release·QA 스냅샷**의 진입점이지 이후 현재 상태·수락·우선순위의 대체 문서가 아니다.

7차까지 로컬 전용이었던 [10/29 정리 보고서](reports/nuri-storage-docs-cleanup-2026-10-29.md), [11/05 모달 감사](reports/nuri-modal-design-audit-2026-11-05.md), [원장 11/04 19:46 보고](qa/nuri-integrated-closeout-2026-10-25.md#2026-11-04-1946-kst-nuri-high-cpu-p0-final-verification-report)는 8차에서 역사 원문을 선별 전달한다. 저장소 밖 영수증·영상·캡처와 원장의 나머지 로컬 변경은 포함하지 않으며 문서 전달을 새 수락으로 계산하지 않는다.

코드 존재, 과거 PASS, 로컬 문서의 서버 상태를 현재 운영·실기기 PASS로 대체하지 않는다. 기존 계획은 구현 완료가 아니며, 과거 완료는 자동으로 허위가 되지 않는다.

## 구현 문서 안내

- 기록·미디어: [타임라인 이미지 시스템](domains/타임라인-메모리-이미지-시스템/타임라인-메모리-이미지-통합-완성본.md)
- 인증: [social login](domains/auth/social-login-v1.md)
- 산책: [구현 상세](domains/산책-위치기반-기능/산책-위치기반-기능-구현-상세.md)
- 현재 알림·NAV·기록 변경: [수락 원장](qa/nuri-integrated-closeout-2026-10-25.md)의 수정/증거 연결
- SQL 설명·소비 관계: [SQL 정리 가이드](sql/정리-가이드.md). `docs/sql`에도 실제 재구축·검사 입력이 있으며, 파일 존재·운영 적용 이력·현재 운영 정의는 구분한다.
- 2026-03-21 코드/SQL 원문 번들은 역사적 참고다. 현재 소스를 대신하거나 다시 실행할 SQL 묶음으로 취급하지 않는다.

`docs`는 역할 기준으로 아래처럼 본다.

- `docs/domains/`
  - 기능별 설계 문서, 통합 문서, 체크리스트
- `docs/sql/`
  - 도메인별 설명·수동 SQL·참고본과 실제 재구축·검사 입력
  - 버전 migration은 `supabase/migrations/`, 계약 검사·fixture는 `supabase/tests/`, 개별 입력·소비 스크립트는 `scripts/`에도 있다
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
- SQL 입력을 찾을 때: [SQL 가이드](sql/정리-가이드.md)에서 실제 소비 경로·순서·사용 조건을 먼저 확인한다. 경로 안내는 SQL 실행 승인이 아니다.
- 운영 기준 문서를 찾을 때: `docs/operations/`
- 현재 프로젝트 맥락을 볼 때: `docs/project-memory/`

## 정리 원칙

- `docs` 루트에는 역할 폴더만 둔다.
- 설명·수동 SQL은 `docs/sql/`, 버전 migration은 `supabase/migrations/`, 계약 검사는 `supabase/tests/` 등 실제 소비 경로에 보존한다. 위치 변경에는 소비 관계 검토가 필요하다.
- 처음 보는 사람도 경로만 보고 문서 성격을 이해할 수 있어야 한다.
- 같은 성격의 문서는 흩어놓지 않고 같은 폴더에 묶는다.
