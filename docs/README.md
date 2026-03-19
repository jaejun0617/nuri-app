# docs 정리 가이드

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
- SQL은 도메인 구분과 관계없이 `docs/sql/` 아래에 모은다.
- 처음 보는 사람도 경로만 보고 문서 성격을 이해할 수 있어야 한다.
- 같은 성격의 문서는 흩어놓지 않고 같은 폴더에 묶는다.
