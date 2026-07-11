# Admin Homepage Responsive QA Report

기준일: 2026-07-11

## 대상

- `admin-console/index.html`
- `admin-console/styles.css`
- `admin-console/admin-console.js`
- 연결 페이지: `admin-console/notification-console.html`

## QA 방법

로컬 Chrome headless screenshot으로 정적 responsive layout을 확인했다. Playwright는 현재 workspace에 설치되어 있지 않아 사용하지 않았다.

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
| domain IA | Dashboard, Users, Pets, Timeline / Records, Health, Walk, Animal Hospitals, Community, Notifications, Rankings, Activity / XP / Titles, Reports / Evidence, QA / Release, Settings / Policy, Audit Logs 포함 |
| notification console 링크 | `notification-console.html` 존재 확인 |
| README 경로 | `admin-console/README.md` 갱신 완료 |
| HTML/JS syntax | HTML parser check와 `node --check` 통과 |
| secret 노출 | service role key, FCM/Expo secret, password/token 노출 없음 |
| 앱 내부 노출 | React Native navigation에 연결하지 않음 |

## 보안/운영 판정

이번 1차는 local/admin-only static dashboard shell이다. production 배포 전에는 아래가 필요하다.

- 인증/권한 gate
- HTTPS hosting
- role-based route guard
- audit log review
- secret management
- public hosting 금지 조건 해제 기준

## 판정

관리자 홈페이지 1차 responsive layout은 완료로 판정한다. 실운영 console 본구현은 다음 트랙으로 유지한다.
