# Admin QA Backlog

작성일: 2026-04-29

## 문서 목적

이 문서는 도메인별 운영자(Admin) UI 실계정 QA를 v1.1 착수 전 v1.0 잔여 task/risk closeout에서 일괄 처리하기 위한 parking backlog다.

이 문서에 올라온 항목은 현재 도메인의 유저 서비스 기준 closeout을 막지 않는다. 단, 서버 계약 누락, RLS/RPC 오류, public trust 경계 파손, 사용자 화면 회귀처럼 운영자 UI QA가 아니라 제품/서버 결함인 항목은 이 문서에 parking하지 않는다.

## 운영 기준

- 신규 운영자 QA 항목은 이 문서에만 누적한다.
- Admin QA는 신규 기능 개발이 아니며, v1.1 착수 전 v1.0 잔여 task/risk closeout의 Admin QA batch에서 처리한다.
- 각 항목은 실제 admin 계정, linked remote, before/after 화면, DB row 또는 action log evidence를 함께 남긴다.
- Candidate / Trust / User Layer 경계가 바뀌는 조작은 public 반영 여부까지 확인한다.
- 이 backlog는 구현 미완료를 숨기는 문서가 아니라, 유저 서비스 closeout과 운영자 실계정 조작 증적을 분리하는 문서다.

## Backlog

| ID | 도메인 | Admin QA 항목 | 현재 판정 | 최종 처리 시점 |
| --- | --- | --- | --- | --- |
| ADMIN-QA-001 | 우리동네 동물병원 | 운영자 검수 UI approve/reject/held 실계정 QA | Parking. 2026-04-29 PO Lock-in에 따라 동물병원은 유저 서비스 기준 100% 완료로 close한다. | v1.1 착수 전 v1.0 Admin QA batch |

### 2026-06-02 ADMIN-QA-001 update

- release 앱에서 admin/super_admin 세션으로 `운영`, `가이드 운영`, `동물병원 운영` 메뉴와 운영 화면 summary, review queue 표시를 확인했다.
- approve/reject/held/action log/public projection은 동일 admin 세션의 Supabase RPC로 확인했다.
- ADB 입력/필터 커서 불안정으로 UI 버튼 직접 탭 3회 증적은 확보하지 못했다. 이 항목은 서버 계약 blocker가 아니라 P2 UI evidence gap으로 유지한다.
- QA admin 세션 확보 중 authenticated 사용자가 public client로 자기 `profiles.role`을 `super_admin`으로 갱신할 수 있는 서버 권한 blocker가 확인됐다. 이는 운영자 UI QA backlog가 아니라 V1.0 P0 보안 blocker로 `docs/qa/v1.0-remaining-task-risk-ledger.md`에서 관리한다.
- QA 종료 후 임시 role은 `user`로 원복했다.

### ADMIN-QA-001 Evidence 요구사항

- 실제 admin 계정으로 운영자 화면 진입
- pending 검수 항목 approve 전/후 화면
- pending 검수 항목 reject 전/후 화면
- held 처리 전/후 화면
- reviewer note 저장 여부
- `animal_hospital_operator_action_log` 또는 대응 action log row 변화
- public projection 반영 여부
- provider-only candidate가 verified/public trust로 승격되지 않는지 확인

### ADMIN-QA-001 관련 문서

- `docs/qa/animal-hospital-v1-evidence-pack-2026-04-28.md`
- `docs/qa/animal-hospital-provider-location-admin-closeout-2026-04-23.md`
- `docs/project-memory/현재-프로젝트-상태.md`
- `docs/project-memory/최근-작업-로그.md`
