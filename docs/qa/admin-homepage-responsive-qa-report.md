# Admin Homepage Responsive QA Report

기준일: 2026-07-12

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
