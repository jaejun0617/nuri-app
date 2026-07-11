# NURI 프로젝트 통합 현황 및 로드맵

기준일: 2026-07-12
기준 브랜치: `codex/task6-community-content-policy`
기준 커밋: 앱 repo `de67ae1`, 관리자 웹 repo `nuri-web` local redesign 기준으로 갱신
연관 참조 문서: `docs/reports/nuri-father-development-progress-budget-2026-07-04.md`

## 1. 프로젝트 전체 요약

NURI는 반려동물의 기억, 일상, 건강, 산책, 커뮤니티 활동을 기록하고 추억하는 감성 기반 디지털 메모리얼 앱이다. 구현 기준은 Android-first React Native 앱, Supabase RLS 기반 user/pet isolation, styled-components 테마, 실기기 QA, release-ready 운영 방어선이다.

현재 V1.0 핵심 기능은 닫혔고, V1.1 산책 POI와 1차/2차 MVP도 release blocker 없이 closeout 가능 상태다. V1.1.1 1차 기능인 `활동·칭호` 대시보드와 프리미엄 보상 모달은 repo 기준 구현 및 Android 실기기 visual QA까지 완료했다. 2026-07-09에는 운영자 알림 발송 기반, QA 알림 생성 RPC, Lv.1~30, 장기 summary RPC, privacy-limited `누리 랭킹` MVP를 추가했다. 2026-07-10에는 앱 내부가 아닌 별도 `admin-console` 운영자 알림 관리 UI와 live retention visual smoke, 랭킹/Lv.30 final visual QA를 닫았다. 2026-07-11 pre-store polish에서는 PremiumRewardModal max 상태를 보강한 뒤, 성장 시스템을 Lv.100 / max `1,250,000 XP`로 확장하고 level-band XP reward 감쇠와 홈 대표 칭호 badge를 추가했다. 같은 날 성능 polish로 Home shell 즉시 표시, 카드별 progressive loading, `활동·칭호` skeleton, `누리 랭킹` 탭별 cache/skeleton을 적용했다. 이어서 실서비스급 안정화 턴에서 기록/일정 user/pet scoped disk cache, `get_user_activity_long_summary_v1` 기반 활동 요약 재사용, `누리 랭킹` React Query 탭별 cache, 타임라인/커뮤니티 첫 fetch 지연 로딩을 추가했다. 병원/산책 direct visual smoke 조건부 항목은 Android 실기기 캡처와 logcat으로 해소했다. 관리자 홈페이지는 PO 정정에 따라 앱 repo 정적 `admin-console`이 아니라 별도 `nuri-web` 프로젝트의 `/admin` 트랙을 source of truth로 갱신했고, reference layout 기반 NURI Ops dashboard IA, 로그인/세션 보호, 비밀번호 변경, 한글화, 관리자 세션 visual QA를 반영했다. push token/opt-in은 다음 트랙 문서로만 유지한다.

고정 운영 원칙:

- QA 계정은 `adminQA`를 재사용한다. 이름만 adminQA이며 권한은 일반 사용자다.
- 무작위 신규 QA 계정 생성, admin 권한 부여, 민감정보 보고서 노출은 금지한다.
- Android 실기기 QA 기준 장비는 `SM_S937N / R5CY613NMSY`다.
- Play Store 자산, 앱 폰트/디자인 전체 리뉴얼, 운영자 관리 페이지 본구현, 실제 push notification 발송, 홈 위젯, 무지개다리, 공개 경쟁형 리더보드는 아직 후속이다.

## 2. 전체 진행률

| 구분 | 최신 진행률 | 근거 |
| --- | ---: | --- |
| V1.0 기능 개발 | 100% | 인증, 온보딩, 홈, 타임라인, 건강, 병원, 산책, 커뮤니티, 전체메뉴, 회원탈퇴 계약 완료 |
| V1.0 QA/출시 준비 | 약 99% | 신규/고정 QA 계정 Android smoke, navigation/back, keyboard/nav bar, crash-free 기준 완료. Play Store 자산은 최종 제출 직전 |
| V1.1 산책 POI 트랙 | 약 99% | approved/public/active 1,145건, public projection safety, Kakao walk fallback 제거, Android smoke 완료 |
| V1.1 추가 업데이트 1차 MVP | 약 98% | 회원탈퇴 입력 확인, 최근 로그인 표시, timeline category count 구현/QA 완료. 실제 탈퇴 예약과 일부 social 최종 pill은 조건부 evidence |
| V1.1 추가 업데이트 2차 MVP | 100% | daily streak, notification read path, XP/level/title MVP, 홈 알림 overlay/dismiss/expand UX final sign-off |
| V1.1 전체 | 약 83% | V1.1 기능 closeout 가능 상태에 V1.1.1 Lv.100/랭킹/운영자 알림 관리 콘솔/live retention visual closeout, 홈 대표 칭호 badge, pre-store 필수 polish, Home/domain loading polish, 기록/일정 disk cache, ranking React Query, 타임라인/커뮤니티 지연 로딩 안정화, 병원/산책 direct visual closeout을 반영. Play Store 제출 자산과 push 실제 발송은 별도 |
| V1.1.1 1차 기능 | 100% | 활동·칭호 대시보드, 알림 보존 정책, XP 다중 write smoke, 프리미엄 보상 모달 visual QA 완료 |
| V1.1.1 고도화 1차 | 100% | 운영자 알림 관리 콘솔 1차, QA 알림 생성/발송 wrapper, live retention visual smoke, Lv.1~100, XP reward 감쇠, 장기 summary RPC, privacy-limited 랭킹 MVP, 홈 대표 칭호 badge 완료. 운영자 관리 페이지 고도화와 push 실제 발송은 후속 |
| 관리자 홈페이지 | 약 45% | 실제 source of truth를 `nuri-web /admin`으로 정정. reference형 sidebar/main/right insight layout, 운영 도메인 IA, Guides CMS 실구현 연결, 로그인/세션 보호, 비밀번호 변경, 한글화, 위험 write disabled 정책 반영. 역할 권한/배포/실데이터 운영 기능은 본구현 잔여 |
| 전체 제품 로드맵 | 약 99.2% | 제품 core와 V1.1/V1.1.1 주요 사용자 기능 대부분 완료. Home/domain loading readiness와 cache/query 안정화, 병원/산책 direct visual closeout, `nuri-web` 관리자 홈페이지 IA/레이아웃/세션 보호 보강까지 반영했고, push token/opt-in, Play Store 제출 자산, 앱 폰트/디자인 전체 리뉴얼, 관리자 홈페이지 본구현 잔여 |

## 3. V1.0 구현 완료 내용

- Auth/onboarding: email login, Google/Kakao login, Naver/Apple 제외 상태, NicknameSetup, PetCreate
- 계정: 회원탈퇴 7일 유예, `회원탈퇴` 입력 확인, 최근 로그인 provider 표시
- Timeline: write/edit/delete, category count, 기록 상세/수정 흐름
- Health: 건강 기록 작성/조회/삭제, 체중 관리, 날짜 직접 입력, keyboard 대응
- Animal Hospital: 전국 기반 public read path, public safe projection, 전화/길찾기 CTA
- Walk: 산책 리스트와 V1.1 자체 POI read path 연결
- Community: 기본 진입, 정책/신고/닉네임 방어선, moderation 없는 무리한 확장 금지
- Android: keyboard/nav bar QA 기준, cold start, back/navigation smoke, crash-free logcat 기준

## 4. Animal Hospital 상태

- Localdata ingest, canonical table, public projection 기반 read path가 유지된다.
- public safe whitelist만 앱에 노출하고 sensitive/internal field는 차단한다.
- public active 병원 수는 5,427건 기준으로 관리한다.
- coordinate missing 122건은 주소/전화 정보형 표시로 안전 처리하며 release blocker가 아니다.
- Google Places/Photos runtime 재활성화는 하지 않았다.
- Kakao provider matching은 병원 도메인 유지 경로로 남아 있고, 산책 POI hard delete와 섞지 않는다.
- admin 운영자 QA는 앱 출시 blocker가 아니며 홈페이지/관리 페이지 트랙으로 parking한다.
- 2026-07-11 direct visual smoke에서 병원 리스트/상세/back, public text 차단 필드 미노출, 전화/길찾기 CTA를 Android release build에서 확인했다.

## 5. Walk / POI 상태

- V1.1 자체 POI track은 approved/public/active 1,145건을 source of truth로 둔다.
- pending/rejected/held POI는 public surface에 노출하지 않는다.
- 산책 도메인의 Kakao Local runtime fallback은 제거됐고 자체 POI + safe empty UX로 닫는다.
- Kakao Local global hard delete는 pet-friendly, 병원 matching, coord2region 유지 경로 때문에 보류다.
- public leak, internal key leak, anon direct table access는 release QA에서 차단 상태를 확인했다.
- 2026-07-11 direct visual smoke에서 산책 리스트/상세/back, 위치/API 준비 전 fallback, provider 실패 시 crash-free 상태를 확인했다.

## 6. Health 상태

- 건강 기록 작성/조회/삭제, 체중 관리, 날짜 직접 입력, keyboard 대응은 V1.0 기능 범위에서 닫혔다.
- 건강 카테고리 기록은 활동·칭호 대시보드의 건강관리 카드에 반영된다.
- 건강관리 XP는 기존 안정 write path 기준으로 표시하며, 의료적으로 과장된 문구는 사용하지 않는다.
- 장기 고도화는 건강 인사이트, 월간 요약, 장기 summary RPC 후보로 분리한다.

## 7. Timeline 상태

- timeline write/edit/delete와 카테고리별 count는 Android smoke와 focused test로 닫혔다.
- 실제 카테고리 enum 기준으로 산책, 식사, 일기장, 생활, 건강 등 카운트와 활동·칭호 대시보드 반영을 관리한다.
- 산책 타임라인은 XP와 streak에 연결된다.
- 일반 타임라인은 XP daily cap과 source idempotency를 유지한다.

## 8. Notification 상태

- notification read path, unread count, mark read, 전체메뉴 badge/dot을 구현했다.
- 홈 상단 알림은 inline card가 아니라 floating top notification shade overlay다.
- 알림 UX는 좌우 swipe dismiss, 전체삭제, 내부 scroll, collapsed/expanded 카드, 화살표 tap/상하 swipe를 지원한다.
- 알림별 작은 X는 최신 UX 정리 결과 제거했다. 주요 삭제 UX는 좌우 swipe dismiss와 전체삭제다.
- home quick dismiss와 inbox delete는 분리되어 있다. 홈에서 치운 알림은 전체보기/알림함에 남고, 알림함 삭제만 user-scoped server hide다.
- read/delete/home-dismiss는 서로 다른 상태다.
- 새 live notification row smoke는 2026-07-10 `adminQA` 단일 대상 실제 row로 visual closeout 완료했다. 홈 quick dismiss와 알림함 delete 분리를 Android screenshot/uiautomator로 확인했다.
- 운영자 발송 UI는 앱 내부가 아니라 `admin-console/notification-console.html` 별도 관리 콘솔 1차로 구현했다. push notification 실제 발송은 여전히 미구현이며 후속이다.

## 9. XP / Level / Title / Activity 상태

- XP ledger, daily cap, source idempotency, level summary, title MVP가 구현되어 있다.
- 서버/app 레벨 범위는 Lv.1~100이다. 기존 Lv.1~30 threshold는 유지하고, Lv.31부터 요구 XP가 점진적으로 커진다. Lv.100 max는 `1,250,000 XP`이며 이후는 `최고 레벨 달성`으로 표시한다.
- 앞으로 지급되는 XP는 기존 base 대비 약 1.3배로 상향하되, 현재 레벨 구간별 multiplier를 적용한다. Lv.1~10은 100%, Lv.11~30은 90%, Lv.31~50은 80%, Lv.51~70은 70%, Lv.71~90은 60%, Lv.91~100은 50%다.
- `전체메뉴 > 나의 반려동물 > 활동·칭호` 대시보드는 현재 성장 카드, 아이별 성장 기록, 산책/타임라인/건강관리 카드, 커뮤니티/댓글 공통 카드, 칭호·훈장 보관함을 표시한다.
- pet-scoped 활동은 pet 단위로 분리하고, community/comment는 user-scoped 공통 활동으로만 표시한다.
- ownerLabel을 통해 `AdminQAPet`, `AdminQAPet2`, `공통 활동` 범위를 구분한다.
- `PremiumRewardModal`은 XP 획득량, 누적 XP, 현재 레벨, 레벨업 여부, 산책 streak를 NURI 프리미엄 톤으로 표시한다.
- `오늘 하루 안 보기`는 KST 기준 user-scoped AsyncStorage preference이며 서버 XP/RPC/RLS에는 영향을 주지 않는다.
- 메인 홈은 현재 선택/대표 펫의 pet-level 대표 칭호를 작은 badge로 표시한다. user-level 공통 칭호를 pet 칭호처럼 오표시하지 않는다.

## 10. V1.1.1 후보 상태

| 후보 | 현재 상태 | 구현 여부 | 위험도 | 선행 조건 | 다음 액션 |
| --- | --- | --- | --- | --- | --- |
| 운영자 알림 발송 관리 체계 | DB/RPC/RLS/audit 기반 + 별도 `admin-console` 알림 콘솔 + 관리자 홈페이지 1차 shell 구현. 앱 내부 일반 사용자 UI 미노출 | 1차 구현 | 중간 | 인증/권한 gate, 템플릿, 승인/취소, opt-out, push 연동 | 관리 페이지 본구현 |
| push notification | remote push 미구현. token/permission/opt-out/secret 정책 문서화 | 미구현 | 높음 | 운영자 발송 UI, opt-out, token 저장, permission UX, delivery log | 발송 관리 체계 이후 FCM 설계 |
| 휴대폰 실기기 홈 위젯 | Android native/JS 일부 흔적은 release 노출 차단 | 후속 | 중간-높음 | AppWidget privacy, snapshot contract, update interval, battery policy | native widget 재설계 |
| 무지개다리 서비스 | profile state 일부만 존재, 상품/문의 flow 없음 | 후속 | 높음 | 감정 민감 문구, one-time suggestion, 문의/상품/결제 정책 | UX copy/정책 먼저 확정 |
| Lv.100 / 장기 summary RPC | Lv.1~100 curve, XP reward 감쇠, read-only summary RPC 구현 | 구현 | 중간 | Android 최종 smoke, 장기 운영 모니터링 | 유지/고도화 |
| 고급 랭킹/리더보드 | privacy-limited `누리 랭킹` MVP 구현. 공개 경쟁형 리더보드는 후속 | 부분 구현 | 높음 | opt-in, abuse 방어, 공개 노출 정책 | 안전 제한 유지 |

## 11. 남은 작업 리스트

Release blocker:

- 현재 보고 기준 없음.

Conditional evidence:

- PremiumRewardModal Lv.100 max fixture 로그인 기반 modal visual은 fixture auth 세션이 없으면 focused max state test/ranking visual로 보완한다. Lv.100/max/over-max 상태는 component presentation과 policy tests로 NaN/Infinity/음수 미노출을 고정해 release blocker는 없다.

V1.1.1 후보:

- 운영자 알림 발송 관리 페이지 고도화
- push notification
- Android 홈 위젯
- 무지개다리 서비스
- 공개 경쟁형 랭킹/리더보드

디자인 조정 예정:

- 스토어 출시 전 앱 내부 density, 카드 hierarchy, modal polish, keyboard/nav bar visual polish 후보 확정.

최종 제출 직전 준비:

- Play Store screenshot, 설명문, 문의처, 정책 URL, 스토어 메타데이터, 최종 제출용 캡처 패키지.
- 이 항목은 V1.0/V1.1/V1.1.1 1차와 디자인 조정 완료 뒤에만 다음 액션으로 올린다.

Parking / 보류:

- admin 운영자 QA
- Kakao Local global hard delete
- 공개 경쟁형 랭킹/리더보드
- 운영자 알림 관리 콘솔 인증/배포/운영 고도화

관리자 홈페이지:

- `admin-console/index.html`, `admin-console/styles.css`, `admin-console/admin-console.js`로 별도 responsive dashboard shell을 추가했다.
- 포함 도메인: Dashboard, Users, Pets, Timeline / Records, Health, Walk, Animal Hospitals, Community, Notifications, Rankings, Activity / XP / Titles, Reports / Evidence, QA / Release, Settings / Policy, Audit Logs.
- 1920px/1440px/tablet/mobile screenshot QA를 수행했고, 기존 `notification-console.html` 링크를 유지한다.
- production 배포 전 인증/권한 gate, HTTPS hosting, secret management, audit review가 필요하므로 본구현 트랙으로 분리한다.

## 12. 고도화 작업 제안

1. 운영자 알림 관리 콘솔 고도화
   - 목표: 이번에 추가된 `admin-console/notification-console.html`, admin notification DB/RPC/audit 기반을 실제 운영자가 안전하게 사용할 수 있도록 인증, 배포, 운영 로그, push opt-in 정책과 연결한다.
   - 분류: 홈페이지/관리 페이지 이동
   - QA 기준: admin 권한, user targeting, hard delete 없음, row-level audit
2. push notification
   - 목표: 앱 내부 알림을 push로 확장
   - 분류: V1.1.1 후보
   - QA 기준: opt-out, permission UX, token RLS, delivery log
3. 디자인 polish
   - 목표: 스토어 출시 전 앱 내부 시각 밀도와 premium tone 정리
   - 분류: 디자인 조정 예정
   - QA 기준: Android 실기기 screenshot, nav/keyboard overlap 없음
4. Play Store 자산 패키지
   - 목표: 최종 제출 자료 준비
   - 분류: 최종 제출 직전 준비
   - QA 기준: 정책 URL, screenshot, 설명문, version/build provenance
5. 공개 경쟁형 랭킹/리더보드
   - 목표: opt-in 기반 장기 리텐션용 비교 기능
   - 분류: Parking
   - QA 기준: privacy, RLS, abuse 방어, opt-in
6. 홈 위젯
   - 목표: 실기기 홈 화면에서 최소 개인정보 노출로 NURI 상태 표시
   - 분류: native 후속 트랙
   - QA 기준: Android AppWidget receiver, update interval, privacy review
7. 무지개다리 서비스
   - 목표: 민감한 순간을 조심스럽게 지원하는 문의/추모 flow
   - 분류: V1.2 또는 Parking
   - QA 기준: 문구 검수, one-time suggestion, 결제/문의 정책
8. Lv.100 이후 장기 성장 확장
   - 목표: 최고 레벨 이후 칭호/훈장/시즌형 성장 중심의 장기 동기 설계
   - 분류: V1.2 후보
   - QA 기준: XP inflation, abuse 방어, 기존 레벨 하락 없음

## 13. 최신 Android Evidence

- 프리미엄 보상 모달 산책 XP: `/tmp/nuri-qa/v111-premium-reward-modal-walk-xp.png`
- 오늘 하루 안 보기 tap 후 닫힘: `/tmp/nuri-qa/v111-premium-reward-modal-hide-today.png`
- cold start persistence: `/tmp/nuri-qa/v111-premium-reward-modal-cold-start-persistence.png`
- 같은 날 후속 작성 후 suppress: `/tmp/nuri-qa/v111-premium-reward-modal-suppressed-after-hide.png`

## 14. 최종 판정

V1.1.1 1차 기능과 고도화 1차는 release blocker 없이 closeout 가능하다. 새 알림 row 기반 live retention smoke는 2026-07-10 별도 admin-console 관리 UI, admin-only QA wrapper RPC, audit feed, Android `SM_S937N / R5CY613NMSY` visual evidence로 완료했다. service role key와 push secret은 요구하거나 노출하지 않았다.
