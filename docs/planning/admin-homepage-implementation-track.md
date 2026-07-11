# Admin Homepage Implementation Track

기준일: 2026-07-12

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
| 4. Moderation/Reports | 신고/커뮤니티 moderation 상태 표시 | 1차 read-only 완료, soft action/audit write 후속 |
| 5. Hospital Review | 동물병원 검수 상태와 pending queue 표시 | 1차 read-only 완료, Candidate/Trust/User Layer 분리 유지 |
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
