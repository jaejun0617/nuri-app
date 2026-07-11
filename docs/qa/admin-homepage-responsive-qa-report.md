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

2026-07-11에는 로컬 Chrome headless screenshot으로 앱 repo 정적 responsive layout을 확인했다. 2026-07-12 PO 정정 이후 실제 관리자 홈페이지는 `nuri-web /admin`으로 이동했다. `/admin`은 auth guard가 걸린 실제 운영 route이므로 무인 screenshot은 로그인 세션 없이는 제한되며, 이번 정정은 `nuri-web` lint/build/static responsive CSS review로 보완한다.

## Screenshot Evidence

| 폭 | 증적 | 결과 |
| --- | --- | --- |
| 1920px desktop | `/tmp/nuri-qa/admin-homepage-1920.png` | 좌측 sidebar, main workspace, 우측 insight panel 유지 |
| 1440px desktop | `/tmp/nuri-qa/admin-homepage-1440.png` | desktop 3-column 레이아웃 유지 |
| 1024px tablet | `/tmp/nuri-qa/admin-homepage-tablet.png` | insight panel stack, card grid 안정 |
| 390px mobile | `/tmp/nuri-qa/admin-homepage-mobile.png` | navigation top strip, main 1-column, horizontal body overflow 없음 |

## 확인 항목

| 항목 | 결과 |
| --- | --- |
| sidebar/main/right panel | desktop에서 정상 |
| tablet stack | 정상 |
| mobile stack | 정상 |
| domain IA | Dashboard, Users, Pets, Timeline / Records, Health, Walk, Animal Hospitals, Community, Notifications, Rankings, Activity / XP / Titles, Reports / Evidence, QA / Release, Settings / Policy, Audit Logs, Guides CMS 포함 |
| notification console 링크 | `notification-console.html` 존재 확인 |
| README 경로 | `admin-console/README.md` 갱신 완료 |
| HTML/JS syntax | HTML parser check와 `node --check` 통과 |
| secret 노출 | service role key, FCM/Expo secret, password/token 노출 없음 |
| 앱 내부 노출 | React Native navigation에 연결하지 않음 |

## 보안/운영 판정

앱 repo의 정적 shell은 local/admin-only 참고 자산이다. 실제 관리자 홈페이지는 `nuri-web`에서 auth-gated route로 진행한다. production 배포 전에는 아래가 필요하다.

- 인증/권한 gate
- HTTPS hosting
- role-based route guard
- audit log review
- secret management
- public hosting 금지 조건 해제 기준

## 판정

관리자 홈페이지 1차 responsive layout 기준은 `nuri-web`으로 source of truth를 정정한다. `nuri-web` lint/build는 통과했고, 실제 관리자 계정 기반 visual QA는 다음 본구현 턴에서 수행한다. 실운영 console 본구현은 다음 트랙으로 유지한다.
