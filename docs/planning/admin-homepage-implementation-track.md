# Admin Homepage Implementation Track

기준일: 2026-07-12

## 2026-07-13 Final Operations Platform Completion

`nuri-web /admin`은 관리자 홈페이지 단계별 본구현을 종료할 수 있는 최종 운영 플랫폼
기준으로 보강됐다. 앱 내부 일반 사용자 화면에는 관리자 UI를 추가하지 않았다.

- 구현 위치: `../nuri-web`
- 앱 repo DB 계약:
  - `supabase/migrations/20260713190000_admin_final_operations_platform.sql`
  - `supabase/migrations/20260713193000_admin_final_operator_capability_backfill.sql`
- Supabase remote: additive migration 반영 완료
- nuri-web 신규/갱신 route:
  - `/admin/operators`
  - `/admin/operators/new`
  - `/admin/operators/requests`
  - `/admin/operators/recovery`
  - `/admin/monitoring`
  - 기존 `/admin/approvals`, `/admin/rollback`, `/admin/notifications` 실행/감사 계약 고도화
- production security:
  - 등록된 운영자 MFA factor가 있으면 로그인 시 TOTP 코드가 필요하다.
  - 승인 완료 action은 별도 실행 단계에서 idempotency와 audit를 남긴다.
  - rollback batch는 승인 완료 후 conflict-safe all-or-nothing으로 실행한다.
  - 요청자 자기 승인과 자기 실행은 차단한다.
- 앱 read-path:
  - 승인된 콘텐츠 soft hide는 post/comment source status를 `hidden`으로 바꿔 public read-path에서 제외한다.
  - undo는 감사 로그의 after_state와 현재 source status가 일치할 때만 허용한다.
- 알림 수명주기:
  - 앱 전체메뉴 알림 설정에 운영 알림 opt-in/out을 연결했다.
  - logout/account deletion 시 현재 device token을 best-effort revoke한다.
  - 실제 push provider token이 없으면 `provider_unavailable`으로 기록하며 가짜 token을 만들지 않는다.
- 계속 닫힌 범위:
  - hard delete
  - 전체/segment broadcast
  - 실제 push 발송
  - 앱 디자인 리뉴얼
  - Play Store 자산

외부 활성화 항목은 custom domain/IP allowlist/external monitoring, Android 실기기 직접 증적,
실제 2인 운영자 계정으로 승인/실행 smoke다.

## 2026-07-13 Production Deployment & Operations Cutover

`nuri-web /admin`은 PO 승인 기준으로 Vercel production HTTPS 환경에 배포됐다. 앱 내부
일반 사용자 화면에는 관리자 UI를 추가하지 않았다.

- production provider: Vercel
- production project: `pet-nuri/nuri-web`
- production URL: `https://nuri-web-beryl.vercel.app`
- production deployment ID: `dpl_H3RpagG5Qn2boNWXg4kDPu5DJz2o`
- source commit: `fe880d5`
- 앱 repo DB 계약: `supabase/migrations/20260713123000_admin_production_auth_store.sql`
- production auth:
  - local file credential fallback 금지
  - `admin_operator_accounts` 기반 persistent credential store
  - scrypt hash + server-only pepper
  - 첫 로그인 비밀번호 변경 강제
  - auth version 기반 session invalidation
- production smoke:
  - `/admin/login` 200 HTTPS
  - `/admin`, `/admin/approvals`, `/admin/rollback` 비로그인 redirect
  - `/api/health` database connected
  - Origin 없는 login POST 403
  - anon credential table/direct dashboard RPC 차단
  - service-role dashboard summary 허용
- 조건부:
  - custom domain은 NURI 소유 domain/DNS가 확정되지 않아 미연결
  - 운영자 직접 비밀번호 변경/세션 기반 visual QA는 입력 완료 후 closeout
  - 외부 monitoring/IP allowlist는 provider plan/account 확인 후 후속 적용

Play Store 자산, 앱 디자인 리뉴얼, push actual, hard delete, 전체/segment broadcast는 열지 않았다.

## 2026-07-13 본구현 5차 + Admin Ops Production Transition Closeout

`nuri-web /admin`은 본구현 5차에서 production transition 직전 운영 방어선을 추가했다.
앱 내부 일반 사용자 화면에는 관리자 UI를 추가하지 않았다.

- 구현 위치: `../nuri-web`
- 앱 repo DB 계약: `supabase/migrations/20260713093000_admin_operations_phase5_production_transition.sql`
- nuri-web 신규 문서:
  - `../nuri-web/docs/admin-implementation-phase5-report.md`
  - `../nuri-web/docs/admin-production-hosting-checklist.md`
  - `../nuri-web/docs/admin-production-auth-checklist.md`
  - `../nuri-web/docs/admin-final-security-checklist.md`
  - `../nuri-web/docs/admin-operator-qa-checklist.md`
  - `../nuri-web/docs/admin-incident-response-runbook.md`
  - `../nuri-web/docs/admin-production-transition-closeout-report.md`
- production role/claim:
  - local capability 모델을 production claim 전환 가능한 action policy와 연결했다.
  - `approvals.*`, `rollback.*` capability를 추가했다.
  - UI disabled reason, server action guard, RPC policy summary가 같은 계약을 사용한다.
- 2인 승인:
  - `/admin/approvals` route를 추가했다.
  - `admin_action_approval_requests`와 approval RPC를 추가했다.
  - 자기 승인 차단은 RPC에서 강제한다.
- rollback:
  - `/admin/rollback` route를 추가했다.
  - `admin_rollback_requests`와 rollback request RPC를 추가했다.
  - 당시에는 rollback 실행을 disabled로 두고 request/audit/runbook 단계만 구현했다. 현재 final completion에서는 승인 완료 batch 실행까지 구현됐다.
- notification:
  - QA 단일 대상 발송만 유지한다.
  - segment/broadcast/push actual은 계속 disabled다.
- remote 상태:
  - additive migration remote apply 완료
  - dry-run up-to-date 확인
  - anon policy/read/write negative smoke 차단 확인
  - service-role policy/approval/self-review/rollback request smoke 통과

실제 HTTPS hosting, DNS, production auth provider, public URL 공유는 PO 승인 전까지 보류한다.

## 2026-07-12 본구현 3차 + 4차 운영 고도화 갱신

`nuri-web /admin`은 본구현 3차/4차에서 role/capability, undo/rollback, notification
console 통합, 운영 통계 dashboard, audit diff/history를 갖춘 운영 콘솔로 확장했다.
앱 내부 일반 사용자 화면에는 관리자 UI를 추가하지 않았다.

- 구현 위치: `../nuri-web`
- 앱 repo DB 계약: `supabase/migrations/20260712143000_admin_operations_phase3_undo_stats.sql`
- nuri-web 신규 문서:
  - `../nuri-web/docs/admin-implementation-phase3-report.md`
  - `../nuri-web/docs/admin-role-capability-model.md`
  - `../nuri-web/docs/admin-undo-rollback-contract.md`
  - `../nuri-web/docs/admin-operations-dashboard-report.md`
- role/capability:
  - local admin session에 role/capability를 포함한다.
  - UI disabled reason과 server action guard가 같은 capability 계약을 사용한다.
  - 전체 broadcast와 hard delete는 capability와 무관하게 비활성이다.
- undo/rollback:
  - `admin_operation_undo_links`와 `admin_undo_operation_action_v1`를 추가했다.
  - v2 action RPC는 복구 가능한 before/after overlay 상태를 audit에 남긴다.
  - 현재 상태가 audited after_state와 다르면 conflict로 차단하고 강제 덮어쓰지 않는다.
- notification:
  - `/admin/notifications` route를 추가했다.
  - QA 닉네임 단일 대상 앱 내부 알림만 허용한다.
  - 전체 발송, segment 발송, push 실제 발송은 계속 disabled다.
- 운영 통계:
  - `admin_get_operations_dashboard_summary_v1` read-only RPC로 사용자/펫/신고/병원/알림/audit 요약을 표시한다.
  - raw UUID/email/phone/password/token/service role key는 UI와 audit metadata에 노출하지 않는다.
- remote 상태:
  - additive migration dry-run 통과
  - remote apply 완료
  - remote up-to-date 확인
  - service-role summary/history smoke 통과
  - anon summary/undo negative smoke 차단 확인

본구현 5차 후보는 production role/claim hardening, undo coverage 확대, 운영 통계 chart,
2인 승인/rollback 정책이다.

## 2026-07-12 본구현 2차 + 운영 고도화 1차 갱신

`nuri-web /admin`은 본구현 2차에서 read-only 운영 화면을 soft action 가능한 운영 콘솔로 확장했다.
앱 내부 일반 사용자 화면에는 관리자 UI를 추가하지 않았다.

- 구현 위치: `../nuri-web`
- 앱 repo DB 계약: `supabase/migrations/20260712130000_admin_operations_phase2_actions.sql`
- nuri-web 신규 문서:
  - `../nuri-web/docs/admin-implementation-phase2-report.md`
  - `../nuri-web/docs/admin-action-audit-contract.md`
- 구현 action:
  - 신고 상태 변경: `대기`, `검토 중`, `처리 완료`, `보류`
  - 콘텐츠 검토 상태: `정상`, `검토 필요`, `숨김 권고`, `숨김`
  - 동물병원 검수 상태: `승인`, `반려`, `보류`, `검토 중`
  - 사용자 검토 flag: `정상`, `검토 필요`, `제한 권고`
- 공통 운영 계약:
  - 모든 write action은 확인 모달을 거친다.
  - 모든 성공 action은 `admin_operation_audit_logs`에 기록한다.
  - 모든 action은 원본 삭제 없이 overlay 상태 table에 저장한다.
  - hard delete, 권한 상승, 전체 broadcast는 계속 비활성이다.
- 추가 table:
  - `admin_operation_audit_logs`
  - `admin_report_review_states`
  - `admin_content_review_states`
  - `admin_hospital_review_states`
  - `admin_user_review_states`
- 추가 RPC:
  - `is_nuri_ops_admin_v1`
  - `admin_write_operation_audit_v1`
  - `admin_update_report_review_v1`
  - `admin_update_content_review_v1`
  - `admin_review_hospital_v1`
  - `admin_update_user_review_v1`
- RLS/security:
  - anon/public direct access 차단
  - non-admin action 차단
  - service role key는 nuri-web 서버 runtime 전용
  - password/session token/service role key/raw metadata 전체를 UI/audit에 저장하지 않음
- remote 상태:
  - additive migration dry-run 통과
  - remote apply 완료
  - anon RPC smoke 차단 확인
  - service-role RPC smoke와 audit write smoke 확인

본구현 3차에서는 DB claim 기반 role model 정식화, rollback/undo, 운영 통계 dashboard, notification console 통합을 진행한다.

## 2026-07-12 본구현 1차 갱신

`nuri-web /admin`은 인증/세션 보호와 한글화 이후, 운영 콘솔 본구현 1차로 read-only 운영 도메인 route를 확장했다.

- 구현 위치: `../nuri-web`
- 신규/갱신 route:
  - `/admin`
  - `/admin/reports`
  - `/admin/community`
  - `/admin/hospitals`
  - `/admin/users`
  - `/admin/users/[id]`
  - `/admin/pets`
  - `/admin/pets/[id]`
  - `/admin/audit-logs`
  - 기존 `/admin/guides`, `/admin/security` 유지
- 구현 성격:
  - 신고/콘텐츠 관리 read-only
  - 커뮤니티 게시글/댓글 read-only
  - 동물병원 public-safe 필드와 검수 상태 확인
  - 사용자/반려동물 목록과 상세 조회
  - 알림/병원 변경 감사 로그 요약
  - Dashboard 카드와 sidebar를 실제 1차 route로 연결
- 보안 정책:
  - 모든 신규 route는 `(protected)` route group 안에 있어 관리자 세션 없이는 접근할 수 없다.
  - service role key는 서버 런타임 전용으로만 사용한다.
  - raw UUID/email/phone/password/token/secret은 화면에 직접 노출하지 않는다.
  - 사용자 hard delete, 게시글/댓글 hard delete, 전체 broadcast, 사용자 권한 상승, 동물병원 approve/reject/hold는 비활성으로 유지한다.
- DB/RPC/RLS/seed 변경:
  - 없음. 이번 턴은 `nuri-web` 서버 runtime에서 기존 table을 제한 projection으로 읽는 1차 운영 화면이다.

본구현 2차에서는 실제 운영 action을 열기 전에 admin-only RPC, role model, confirmation modal, audit write 계약을 먼저 확정해야 한다.

## 2026-07-12 인증/세션 보호 갱신

`nuri-web /admin`은 1차 리디자인 이후 관리자 로그인과 세션 보호를 갖춘 실제 운영자 route로 전환됐다.

- 로그인 route: `../nuri-web/src/app/admin/login`
- 보호 layout: `../nuri-web/src/app/admin/(protected)/layout.tsx`
- 보안 설정 route: `../nuri-web/src/app/admin/(protected)/security`
- 인증 helper: `../nuri-web/src/lib/admin/auth.ts`
- API: `../nuri-web/src/app/api/admin/login`, `logout`, `password`
- 관리자 ID: `pet_nuri`
- 초기 비밀번호 값은 문서/코드에 남기지 않고 `nuri-web/.env.local` 서버 전용 환경변수로만 관리한다.
- password는 scrypt hash로 서버 전용 local credential store에 저장한다.
- session은 HttpOnly cookie로 보호한다.
- `/admin` 하위 route는 비로그인 접근 시 `/admin/login`으로 redirect한다.
- `/admin/security`에서 PO가 직접 비밀번호를 변경할 수 있다.

현재 위험 write 기능은 계속 비활성이다. 사용자 조치, 게시글 삭제, 공지 전체 발송은 접근 정책, 감사 로그, 운영 승인 계약이 붙기 전까지 열지 않는다.

## 목적

NURI 관리자 홈페이지는 앱 내부 일반 사용자 화면이 아니라 별도 web 프로젝트 `nuri-web`의 `/admin` 트랙에서 본구현한다. 앱 repo의 `admin-console` 정적 파일은 QA/임시 콘솔 및 레이아웃 참고 자산이며, 실서비스 관리자 홈페이지 source of truth가 아니다.

이번 정정 기준은 PO 피드백에 따른다. 실제 관리자 홈페이지는 레퍼런스 이미지처럼 좌측 사이드바, 중앙 업무 영역, 우측 인사이트 패널을 갖는 반응형 대시보드로 재설계하며, NURI 앱의 모든 운영 도메인(사용자, 반려동물, 게시글, 삭제/숨김, 공지 발송, 병원 검수, 산책 장소, 알림, 랭킹, XP/칭호, QA 증적)을 담는 전용 콘솔로 확장한다.

## 1차 구현 범위

- 실제 관리자 웹 위치: `../nuri-web/src/app/admin/page.tsx`
- 실제 관리자 shell: `../nuri-web/src/components/layout/admin-shell.tsx`
- 실제 관리자 navigation: `../nuri-web/src/components/layout/admin-sidebar-nav.tsx`
- 실제 관리자 스타일: `../nuri-web/src/app/globals.css`
- 실제 관리자 문서: `../nuri-web/README.md`
- 앱 repo 정적 참고 자산: `admin-console/index.html`, `admin-console/notification-console.html`

`nuri-web` 관리자 홈은 아래 운영 도메인을 담는다.

- 대시보드
- 사용자
- 반려동물
- 타임라인 / 기록
- 건강관리
- 산책
- 동물병원
- 커뮤니티
- 알림 관리
- 랭킹
- 활동 · XP · 칭호
- 리포트 / 증적
- QA / 릴리즈
- 설정 / 정책
- 감사 로그
- 가이드 CMS

## 레이아웃 기준

| 폭 | 기준 |
| --- | --- |
| 1920px desktop | 좌측 사이드바, 중앙 업무 영역, 우측 인사이트 패널을 3열로 유지 |
| 1440px desktop | 3열 구조 유지, 카드 grid 2~3열 |
| 1024px tablet | 인사이트 패널을 본문 아래로 stack, 본문 카드 2열 |
| 768px tablet/narrow | navigation compact, 카드 1~2열 |
| 390px mobile | navigation top strip, 본문/인사이트 1열, horizontal overflow 없음 |

## 보안 원칙

- `/admin`은 관리자 세션 없이는 접근할 수 없다.
- production 공개 배포 전 HTTPS와 운영자 권한 모델을 추가로 확인한다.
- service role key, FCM/Expo secret, password, token을 클라이언트에 입력/저장하지 않는다.
- 일반 앱 내부 navigation에 노출하지 않는다.
- production 전체 발송은 수신 제외, 승인, 감사, rollback 정책 전까지 disabled 상태를 유지한다.
- 실제 운영 전 HTTPS hosting, 역할 기반 접근, 감사 로그 검토, secret management를 별도 구현한다.
- 현재 `nuri-web`에서 실제 write 기능이 연결된 도메인은 가이드 CMS이며, 유저 조치/게시글 삭제/공지 전체 발송은 본구현 전까지 비활성으로 둔다.

## 본구현 단계

| 단계 | 목표 | 완료 기준 |
| --- | --- | --- |
| 1. Auth/Role Gate | 관리자 로그인과 session guard | `/admin` 비로그인 차단과 비밀번호 변경 완료, 역할 모델과 감사 추적은 후속 |
| 2. Read-only Ops Data | 사용자/펫/커뮤니티/신고/병원/audit 상태 route 연결 | 1차 완료, raw id/email/phone/secret 미노출 |
| 3. Notification Ops | 기존 알림 콘솔을 homepage 안의 운영 섹션으로 정리 | QA 대상 발송, audit feed, broadcast disabled 유지 |
| 4. Moderation/Reports | 신고/커뮤니티 moderation 상태 표시 | 2차 soft action/audit write 완료, hard delete 금지 유지 |
| 5. Hospital Review | 동물병원 검수 상태와 pending queue 표시 | 2차 approve/reject/hold overlay 완료, Candidate/Trust/User Layer 분리 유지 |
| 6. QA Evidence | release evidence와 Android smoke 결과를 모아보기 | screenshot/log 경로와 blocker status |
| 7. Deployment | HTTPS, auth, environment, rollback 문서화 | public hosting 전 security review 완료 |

## 이번 턴에서 하지 않은 것

- 앱 내부 관리자 UI 추가
- production 배포
- Play Store 자산 생성
- push token/opt-in 구현
- service role key 또는 push secret 사용
- 실운영 broadcast 활성화
- DB/RPC/RLS/seed 변경
- 유저/펫/게시글 삭제/공지 발송의 실제 운영 write 기능 활성화

## 다음 액션

관리자 홈페이지 본구현은 `nuri-web Auth/Role Gate -> Read-only Ops Data -> Notification Ops -> Moderation/Delete Workflow` 순서로 진행한다. 앱 폰트/디자인 전체 리뉴얼과 Play Store 자산 패키지는 별도 PO 승인 후 진행한다.
