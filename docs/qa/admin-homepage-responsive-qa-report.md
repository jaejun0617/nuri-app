# Admin Homepage Responsive QA Report

기준일: 2026-07-13

## 2026-07-13 Final Production Completion QA 갱신

실제 source of truth는 `../nuri-web /admin`이다. 이번 final completion으로 관리자 홈페이지
production 최신 배포는 복구됐지만, 운영자 세션 기반 최종 visual/function QA는 직접 입력 조건으로 남아 있다.

| 항목 | 결과 |
| --- | --- |
| production URL | `https://nuri-web-beryl.vercel.app` |
| `/admin/login` | 200 HTTPS |
| `/admin` 비로그인 | 307 `/admin/login?next=/admin` |
| `/api/health` | 200, `database=connected`, `version=52edfec`, `Cache-Control: no-store` |
| 보안 헤더 | CSP/HSTS/nosniff/frame deny/noindex 확인 |
| export route | `/api/admin/exports/audit`, `/api/admin/exports/operations`, `/api/admin/exports/[domain]` build 포함 |
| nuri-web 검증 | lint/build/test 14개/diff check 통과 |
| 앱 검증 | typecheck/lint/focused tests 8 suites/30 tests/diff check 통과 |
| Android | `SM_S937N / R5CY613NMSY`, latest release APK install, Home/Community/logcat current 수집 |

증적:

- `/tmp/nuri-qa/final-gap-android-cold-start.png`
- `/tmp/nuri-qa/final-gap-android-community.png`
- `/tmp/nuri-qa/final-gap-android-logcat.txt`

외부 조건:

- 1920/1440/1024/768/390px production 관리자 세션 visual QA는 운영자 로그인/MFA 입력이 필요하다.
- custom domain/Cloudflare/IP allowlist/external monitoring은 계정/소유권 확인 후 적용한다.

## 2026-07-13 Final Operations Platform QA 갱신

실제 source of truth는 `../nuri-web /admin`이다. 이번 갱신으로 operator, MFA/recovery,
monitoring route와 승인 실행/rollback batch 실행 UI가 추가됐다.

| 항목 | 결과 |
| --- | --- |
| 신규 route 보호 | `/admin/operators`, `/admin/operators/new`, `/admin/operators/requests`, `/admin/operators/recovery`, `/admin/monitoring` 모두 protected route group |
| MFA 로그인 guard | 등록된 TOTP factor가 있으면 `/admin/login`에서 6자리 인증 코드 필요 |
| approval execution | 승인 완료 action 실행 버튼/확인 모달/감사 로그 계약 추가 |
| rollback execution | 승인 완료 batch만 conflict-safe all-or-nothing 실행 |
| notification lifecycle | opt-in/token/provider unavailable summary 표시 |
| monitoring | critical event, 실패 action, approval 대기, rollback 실패 summary 표시 |
| Android 실기기 | 현재 연결 상태 확인 전까지 직접 증적 미완료로 분리 |

검증:

- `nuri-web npm run lint` 통과
- `nuri-web npm run build` 통과
- `nuri-web npm test` 12 tests 통과
- 앱 repo `corepack yarn tsc --noEmit --pretty false` 통과
- 앱 repo `corepack yarn lint` 통과, 기존 warning 6개 유지
- Supabase remote migration 반영 완료

## 2026-07-13 Production Deployment QA 갱신

실제 source of truth는 `../nuri-web /admin`이며, production URL은
`https://nuri-web-beryl.vercel.app`이다.

| 항목 | 결과 |
| --- | --- |
| production deployment | Vercel `dpl_92Nkp25kyAoYhqLQk2KChddH7u1Z` |
| HTTPS | 적용 |
| `/admin/login` | 200 |
| `/admin` 비로그인 | `/admin/login?next=/admin` redirect |
| `/admin/approvals` 비로그인 | redirect |
| `/admin/rollback` 비로그인 | redirect |
| `/api/health` | database connected |
| health version | `52edfec` |
| security headers | CSP/HSTS/nosniff/frame deny/noindex/no-store 확인 |
| Supabase smoke | anon 차단, service-role dashboard summary 허용 |
| client/static secret scan | service role key/session secret/password pepper 노출 없음 |

운영자 세션 기반 1920/1440/1024/768/390px visual QA는 첫 production 비밀번호 변경 완료 후
진행한다. 현재 자동 smoke는 통과했으며, 앱 내부 일반 사용자 화면에는 관리자 UI를 노출하지 않는다.

## 2026-07-13 본구현 5차 / Production Transition QA 갱신

실제 source of truth는 계속 `../nuri-web /admin`이다. 이번 본구현 5차에서는
`/admin/approvals`, `/admin/rollback`, notification production-safe policy, action policy
table, `npm test`를 추가했다.

확인 기준:

| 항목 | 결과 |
| --- | --- |
| 세션 보호 | 신규 `/admin/approvals`, `/admin/rollback` route는 `(protected)` route group 유지 |
| 2인 승인 | approval request 생성, 승인/반려 server action, 자기 승인 RPC 차단 |
| rollback | rollback request 생성만 허용, 실제 rollback 실행 disabled |
| notification | QA 단일 대상 발송만 유지, segment/broadcast/push disabled |
| action policy | UI/server/RPC 정책 문서화와 table 표시 |
| 테스트 | `nuri-web npm test` 추가 및 통과 |
| secret 노출 | password/token/service role key/raw metadata 원문 표시 없음 |

검증:

- `nuri-web npm run lint` 통과
- `nuri-web npm run build` 통과
- `nuri-web npm test` 통과
- `nuri-web git diff --check` 통과
- 앱 repo `git diff --check` 통과
- Supabase remote dry-run up-to-date
- anon policy/read/write negative smoke 차단 확인
- service-role policy/approval/self-review/rollback request smoke 통과

실제 responsive screenshot은 production 배포 전 operator QA checklist에서 재수행한다.

## 2026-07-12 본구현 3차/4차 QA 갱신

실제 source of truth는 계속 `../nuri-web /admin`이다. 이번 본구현 3차/4차에서는 role/capability,
notification console 통합, 운영 통계 dashboard, audit diff/history, conflict-safe undo UI를 추가했다.

확인 기준:

| 항목 | 결과 |
| --- | --- |
| 세션 보호 | 신규 `/admin/notifications` route와 기존 route는 모두 `(protected)` route group 유지 |
| Capability guard | UI disabled reason과 server action guard가 같은 capability 계약 사용 |
| Undo | undoable action만 되돌리기 버튼 표시, 현재 상태 conflict 시 강제 덮어쓰기 차단 |
| Audit | write/undo action은 `admin_operation_audit_logs`와 `admin_operation_undo_links` 계약 사용 |
| Notification | QA 단일 대상만 허용, 전체 broadcast/segment/push는 disabled 유지 |
| 통계 dashboard | read-only summary RPC로 운영 상태를 표시하고 raw PII를 노출하지 않음 |
| secret 노출 | password/token/service role key/raw metadata 원문 표시 없음 |

신규 screenshot:

| 화면 | 증적 | 결과 |
| --- | --- | --- |
| dashboard 1920px | `/tmp/nuri-qa/admin-phase3-dashboard-1920.png` | overflow 없음 |
| notification console | `/tmp/nuri-qa/admin-phase3-notifications.png` | overflow 없음 |
| 신고 history/undo | `/tmp/nuri-qa/admin-phase3-reports-history-undo.png` | overflow 없음 |
| 병원 검수 undo | `/tmp/nuri-qa/admin-phase3-hospital-review-undo.png` | overflow 없음 |
| 사용자 상세 action | `/tmp/nuri-qa/admin-phase3-user-detail-actions.png` | overflow 없음 |
| 반려동물 상세 summary | `/tmp/nuri-qa/admin-phase3-pet-detail-summary.png` | overflow 없음 |
| audit detail | `/tmp/nuri-qa/admin-phase3-audit-detail.png` | overflow 없음 |
| mobile 390px | `/tmp/nuri-qa/admin-phase3-mobile.png` | horizontal overflow 없음 |

검증:

- `nuri-web npm run lint` 통과
- `nuri-web npm run build` 통과
- `nuri-web git diff --check` 통과
- 앱 repo `git diff --check` 통과
- Supabase additive migration dry-run/remote apply/up-to-date 확인
- service-role dashboard/history smoke 통과
- anon dashboard/undo negative smoke 차단 확인

## 2026-07-12 본구현 2차 QA 갱신

실제 source of truth는 계속 `../nuri-web /admin`이다. 이번 본구현 2차에서는 신고/콘텐츠,
동물병원, 사용자 상세의 soft action과 공통 확인 모달, 운영 action audit log를 추가했다.

확인 기준:

| 항목 | 결과 |
| --- | --- |
| 세션 보호 | 신규 action route와 server action은 기존 `(protected)` route group과 관리자 세션 helper를 사용 |
| 확인 모달 | 모든 write action은 대상 요약, 위험도, 운영 메모, 확인 체크박스를 요구 |
| Audit write | 성공 action은 `admin_operation_audit_logs`에 기록 |
| 위험 write | hard delete, 사용자 권한 상승, 전체 broadcast는 계속 비활성 |
| 병원 public-safe | public 차단 필드 계약 유지, 앱 public projection 변경 없음 |
| secret 노출 | password/token/service role key/raw metadata 원문 표시 없음 |
| raw id 노출 | actor/target/user/pet 식별자는 마스킹 label 또는 opaque route id로 표시 |

신규 screenshot:

| 화면 | 증적 | 결과 |
| --- | --- | --- |
| 본구현 2차 dashboard | `/tmp/nuri-qa/admin-phase2-dashboard-1920.png` | overflow 없음 |
| 신고/콘텐츠 action | `/tmp/nuri-qa/admin-phase2-reports-actions.png` | overflow 없음 |
| 병원 검수 action | `/tmp/nuri-qa/admin-phase2-hospital-review.png` | overflow 없음 |
| 사용자 목록 tablet | `/tmp/nuri-qa/admin-phase2-users-1024.png` | overflow 없음 |
| 감사 로그 | `/tmp/nuri-qa/admin-phase2-audit-log.png` | overflow 없음 |
| 확인 모달 | `/tmp/nuri-qa/admin-phase2-confirm-modal.png` | responsive 확인 |
| 사용자 상세 | `/tmp/nuri-qa/admin-phase2-user-detail.png` | overflow 없음 |
| 반려동물 상세 | `/tmp/nuri-qa/admin-phase2-pet-detail.png` | overflow 없음 |
| mobile 390px | `/tmp/nuri-qa/admin-phase2-mobile.png` | page overflow 없음, 표는 내부 scroll |

검증:

- `nuri-web npm run lint` 통과
- `nuri-web npm run build` 통과
- `nuri-web git diff --check` 통과
- `nuri-web npm test`는 test script 부재로 실행 불가
- 앱 repo `git diff --check` 통과
- Supabase additive migration dry-run/remote apply 완료
- anon RPC 차단 smoke 확인
- service-role RPC/audit write smoke 확인

## 2026-07-12 본구현 1차 QA 갱신

실제 source of truth는 계속 `../nuri-web /admin`이다. 이번 본구현 1차에서는 기존 responsive shell을 유지한 상태로 아래 신규 운영 route를 추가했다.

- `/admin/reports`
- `/admin/community`
- `/admin/hospitals`
- `/admin/users`
- `/admin/users/[id]`
- `/admin/pets`
- `/admin/pets/[id]`
- `/admin/audit-logs`

확인 기준:

| 항목 | 결과 |
| --- | --- |
| 세션 보호 | 신규 route 전부 `(protected)` route group 아래에 있음 |
| Dashboard 연결 | 운영 도메인 카드와 sidebar가 1차 route로 연결됨 |
| Table responsive | 신규 `ops-data-table-wrap`으로 route별 표가 페이지 전체 horizontal overflow를 만들지 않도록 처리 |
| 위험 write | 신고 처리, 게시글/댓글 삭제, 사용자 조치, 동물병원 approve/reject/hold, broadcast 모두 disabled |
| secret 노출 | password/token/service role key/raw payload는 UI에 표시하지 않음 |
| raw id 노출 | 사용자/pet 상세 route는 보호된 route id를 사용하고 화면에는 마스킹 label 사용 |

권장 신규 screenshot:

| 화면 | 증적 |
| --- | --- |
| 본구현 dashboard | `/tmp/nuri-qa/admin-phase1-dashboard-1920.png` |
| 신고/콘텐츠 | `/tmp/nuri-qa/admin-phase1-reports-1920.png` |
| 동물병원 검수 | `/tmp/nuri-qa/admin-phase1-hospitals-1920.png` |
| 사용자 목록 | `/tmp/nuri-qa/admin-phase1-users-1920.png` |
| 감사 로그 | `/tmp/nuri-qa/admin-phase1-audit-1920.png` |
| 모바일 | `/tmp/nuri-qa/admin-phase1-mobile.png` |

## 대상

현재 source of truth:

- `../nuri-web/src/app/admin/page.tsx`
- `../nuri-web/src/components/layout/admin-shell.tsx`
- `../nuri-web/src/components/layout/admin-sidebar-nav.tsx`
- `../nuri-web/src/app/globals.css`
- `../nuri-web/README.md`

이전 정적 참고 자산:

- `admin-console/index.html`
- `admin-console/styles.css`
- `admin-console/admin-console.js`
- 연결 페이지: `admin-console/notification-console.html`

## QA 방법

2026-07-11에는 로컬 Chrome headless screenshot으로 앱 repo 정적 responsive layout을 확인했다. 2026-07-12 PO 정정 이후 실제 관리자 홈페이지는 `nuri-web /admin`으로 이동했다.

2026-07-12 인증/한글화 closeout에서는 `nuri-web /admin/login`으로 관리자 세션을 만들고, Playwright screenshot을 관리자 세션 storage state로 생성했다. 캡처용 storage state 파일은 검증 후 삭제했다. 비밀번호 값과 session token은 보고서/로그에 노출하지 않았다.

## Screenshot Evidence

| 폭 | 증적 | 결과 |
| --- | --- | --- |
| 로그인 | `/tmp/nuri-qa/admin-login-page.png` | 비로그인 진입 화면 표시 |
| 1920px desktop | `/tmp/nuri-qa/admin-dashboard-1920-ko.png` | 좌측 sidebar, main workspace, 우측 insight panel 유지 |
| 1440px desktop | `/tmp/nuri-qa/admin-dashboard-1440-ko.png` | desktop 3-column 레이아웃 유지 |
| 1024px tablet | `/tmp/nuri-qa/admin-dashboard-tablet-ko.png` | card grid와 panel stack 확인 |
| 390px mobile | `/tmp/nuri-qa/admin-dashboard-mobile-ko.png` | navigation/top stack, main 1-column 확인 |
| 비밀번호 변경 | `/tmp/nuri-qa/admin-password-change-ko.png` | 보안 설정 UI 표시 |
| 가이드 CMS | `/tmp/nuri-qa/admin-guides-cms-ko.png` | 기존 Guides CMS 접근 가능 |

## 확인 항목

| 항목 | 결과 |
| --- | --- |
| sidebar/main/right panel | desktop에서 정상 |
| tablet stack | 정상 |
| mobile stack | 정상 |
| domain IA | 사용자, 반려동물, 타임라인/기록, 건강관리, 산책, 동물병원, 커뮤니티, 알림 관리, 랭킹, 활동·XP·칭호, 리포트/증적, QA/릴리즈, 설정/정책, 감사 로그, 가이드 CMS 포함 |
| 인증 보호 | `/admin` 비로그인 접근 시 `/admin/login?next=/admin` redirect |
| 비밀번호 변경 | 변경 API 성공, 변경 전 비밀번호 거부, 검증 후 로컬 credential store 초기 상태 복구 |
| README 경로 | `../nuri-web/README.md` 갱신 완료 |
| secret 노출 | service role key, FCM/Expo secret, password/token 노출 없음 |
| 앱 내부 노출 | React Native navigation에 연결하지 않음 |

## 보안/운영 판정

앱 repo의 정적 shell은 local/admin-only 참고 자산이다. 실제 관리자 홈페이지는 `nuri-web`에서 session-gated route로 진행한다. production 배포 전에는 아래가 필요하다.

- HTTPS hosting
- role-based route guard
- audit log review
- secret management
- public hosting 금지 조건 해제 기준

## 판정

관리자 홈페이지 1차 responsive layout 기준은 `nuri-web`으로 source of truth를 정정한다. `nuri-web` lint/build, 관리자 세션 기반 responsive screenshot, 로그인/로그아웃/비밀번호 변경 smoke를 통과했다. 실운영 console 본구현은 다음 트랙으로 유지한다.
