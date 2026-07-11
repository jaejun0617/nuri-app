# Admin Homepage Implementation Track

기준일: 2026-07-12

## 목적

NURI 관리자 홈페이지는 앱 내부 일반 사용자 화면이 아니라 별도 web 프로젝트 `nuri-web`의 `/admin` 트랙에서 본구현한다. 앱 repo의 `admin-console` 정적 파일은 QA/임시 콘솔 및 레이아웃 참고 자산이며, 실서비스 관리자 홈페이지 source of truth가 아니다.

이번 정정 기준은 PO 피드백에 따른다. 실제 관리자 홈페이지는 레퍼런스 이미지처럼 좌측 sidebar, 중앙 workspace, 우측 insight panel을 갖는 반응형 dashboard로 재설계하며, NURI 앱의 모든 운영 도메인(유저, 펫, 게시글, 삭제/숨김, 공지 발송, 병원 검수, 산책 장소, 알림, 랭킹, XP/칭호, QA 증적)을 담는 전용 콘솔로 확장한다.

## 1차 구현 범위

- 실제 관리자 웹 위치: `../nuri-web/src/app/admin/page.tsx`
- 실제 관리자 shell: `../nuri-web/src/components/layout/admin-shell.tsx`
- 실제 관리자 navigation: `../nuri-web/src/components/layout/admin-sidebar-nav.tsx`
- 실제 관리자 스타일: `../nuri-web/src/app/globals.css`
- 실제 관리자 문서: `../nuri-web/README.md`
- 앱 repo 정적 참고 자산: `admin-console/index.html`, `admin-console/notification-console.html`

`nuri-web` 관리자 홈은 아래 운영 도메인을 담는다.

- Dashboard
- Users
- Pets
- Timeline / Records
- Health
- Walk
- Animal Hospitals
- Community
- Notifications
- Rankings
- Activity / XP / Titles
- Reports / Evidence
- QA / Release
- Settings / Policy
- Audit Logs
- Guides CMS

## 레이아웃 기준

| 폭 | 기준 |
| --- | --- |
| 1920px desktop | 좌측 sidebar, 중앙 main workspace, 우측 insight panel을 3-column으로 유지 |
| 1440px desktop | 3-column 구조 유지, 카드 grid 2~3열 |
| 1024px tablet | insight panel을 main 아래로 stack, main card 2열 |
| 768px tablet/narrow | navigation compact, card 1~2열 |
| 390px mobile | navigation top strip, main/insight 1열, horizontal overflow 없음 |

## 보안 원칙

- production public hosting 전 인증/권한 gate가 필요하다.
- service role key, FCM/Expo secret, password, token을 입력/저장하지 않는다.
- 일반 앱 내부 navigation에 노출하지 않는다.
- production 전체 broadcast는 opt-out, 승인, audit, rollback 정책 전까지 disabled 상태를 유지한다.
- 실제 운영 전 HTTPS hosting, role-based access, audit log 검토, secret management를 별도 구현한다.
- 현재 `nuri-web`에서 실제 write 기능이 연결된 도메인은 가이드 CMS이며, 유저 조치/게시글 삭제/공지 전체 발송은 본구현 전까지 비활성으로 둔다.

## 본구현 단계

| 단계 | 목표 | 완료 기준 |
| --- | --- | --- |
| 1. Auth/Role Gate | 관리자 로그인과 role guard | anon/non-admin 차단, session timeout, audit trace |
| 2. Read-only Ops Data | 사용자/펫/커뮤니티/병원/산책/랭킹 상태 카드 연결 | raw id/email/phone/secret 미노출 |
| 3. Notification Ops | 기존 알림 콘솔을 homepage 안의 운영 섹션으로 정리 | QA 대상 발송, audit feed, broadcast disabled 유지 |
| 4. Moderation/Reports | 신고/커뮤니티 moderation 상태 표시 | 정책 위반 trace, action log |
| 5. Hospital Review | 동물병원 검수 상태와 pending queue 표시 | Candidate/Trust/User Layer 분리 유지 |
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
