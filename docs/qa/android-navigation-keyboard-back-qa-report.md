# Android Navigation / Keyboard / Back QA Report

## 2026-07-19 전체 입력 Sweep

- 소스 inventory: `TextInput` 사용 TSX 27개. 일반 사용자 입력 구현 23개, 앱 내부 비노출 admin/dev 입력 4개.
- 실기기 surface: sign-in/up, reset request/form, social nickname/pet onboarding, nickname/pet edit, date/memorial, weight, record create/edit/tag, post/comment/report, hospital/walk search, schedule create/edit, guestbook, guide search, weather record, withdrawal confirm 등 24개.
- 모든 surface에서 keyboard bar/avoiding, input·CTA visibility, scroll, validation, keyboard back, modal/screen back, bottom nav overlap을 확인했다.
- 기록/일정 edit는 실제 controlled QA data에서 확인했고 임시 일정은 삭제해 원상복구했다. 비밀번호 변경·탈퇴 실행·원본 기록 수정은 하지 않았다.
- 판정: dead-end, keyboard 잔존, CTA 완전 가림, nav bar overlap 0건.

기준일: 2026-07-15
기준 기기: `SM_S937N / R5CY613NMSY`

## 2026-07-15 최신 release smoke

- APK SHA-256: `bfb9ac5ca79e61e8d91b2e738529f945dd6dcc77f12e7a597afca31b81a57524`
- install/update: 성공
- adminQA token_hash callback login: `/tmp/nuri-qa/final-100-20260715/adminqa-tokenhash-callback-after-fix.png`
- Community comment keyboard/back: `/tmp/nuri-qa/final-100-20260715/final-community-comment-keyboard.png`, `/tmp/nuri-qa/final-100-20260715/final-community-comment-keyboard-back.png`
- Walk search keyboard/back: `/tmp/nuri-qa/final-100-20260715/final-walk-search-keyboard.png`, `/tmp/nuri-qa/final-100-20260715/final-walk-search-keyboard-back.png`
- Hospital detail/back public-safe: `/tmp/nuri-qa/final-100-20260715/final-hospital-detail.png`
- Notification modal opt-in/permission/opt-out: `/tmp/nuri-qa/final-100-20260715/final-notification-optin.png`, `/tmp/nuri-qa/final-100-20260715/final-notification-optout.png`
- Account switch/Home restore: `/tmp/nuri-qa/final-100-20260715/final-secondary-qa-login.png`, `/tmp/nuri-qa/final-100-20260715/final-adminqa-restored.png`
- refined fatal/ANR/unhandled/RN fatal/Fatal signal: 0건

이번 smoke는 최신 코드 변경 영향 경로와 release blocker 가능성이 큰 입력/모달/전체화면 back 경로를 확인했다. 전체 입력 화면 sweep은 release APK 재빌드 때 반복 운영 gate로 유지한다.

## 2026-07-14 최신 release smoke

- APK SHA-256: `59a152f3fe0d95bfc0579b8eb8942e16053047bd7d9f31dcaa346404493612b9`
- install/update: 성공
- cold start Home: `/tmp/nuri-qa/app-reconcile-cold-start-home-20260714.png`
- Community list/detail/back: `/tmp/nuri-qa/app-reconcile-community-20260714.png`, `/tmp/nuri-qa/app-reconcile-community-detail-20260714.png`, `/tmp/nuri-qa/app-reconcile-community-back-20260714.png`
- Comment keyboard/back: `/tmp/nuri-qa/app-reconcile-keyboard-comment-20260714.png`, `/tmp/nuri-qa/app-reconcile-keyboard-back-20260714.png`
- Hospital list/detail/back: `/tmp/nuri-qa/app-reconcile-hospital-20260714.png`, `/tmp/nuri-qa/app-reconcile-hospital-detail-20260714.png`, `/tmp/nuri-qa/app-reconcile-hospital-back-20260714.png`
- Walk list/search keyboard/back: `/tmp/nuri-qa/app-reconcile-walk-20260714.png`, `/tmp/nuri-qa/app-reconcile-walk-keyboard-20260714.png`
- logcat: `/tmp/nuri-qa/app-reconcile-logcat-20260714.txt`
- refined fatal/ANR/unhandled/RN fatal/Fatal signal: 0건

이번 smoke는 전체 입력 화면 전수 대신 최신 코드 변경 영향 경로와 대표 keyboard/navigation 경로를 확인했다. 전체 입력 화면 sweep 기준은 계속 유지한다.

## QA 목적

실서비스 투입 전 사용자가 가장 자주 마주치는 이동, 뒤로가기, 입력, 하단 nav bar 충돌을 확인한다. 이번 문서는 Play Store 제출 자산이 아니라 앱 안정화 evidence다.

## 필수 경로

| 경로 | 확인 기준 | 결과 |
| --- | --- | --- |
| cold start -> Home | 세션 복원 후 Home shell 표시 | Android smoke에서 확인 |
| Home -> 전체메뉴 | drawer/route dead-end 없음 | Android smoke에서 확인 |
| 전체메뉴 -> 나의 반려동물 | 기존 프로필/일정 entry 유지 | Android smoke에서 확인 |
| 전체메뉴 -> 활동·칭호 | skeleton 후 카드 표시 | Android smoke에서 확인 |
| 전체메뉴 -> 누리 랭킹 | 탭 전환, Android back 정상 | Android smoke에서 확인 |
| Home -> 타임라인 | initial list, pagination 진입 | Android smoke에서 확인 |
| 기록 작성/수정 | keyboard가 input/CTA를 가리지 않음 | Android smoke에서 확인 |
| 건강관리 | 최근 기록/입력 flow 접근 | Android smoke에서 확인 |
| 산책 | 위치/리스트 shell 진입 | Android smoke에서 확인 |
| 병원 찾기 | 리스트/상세 fallback 유지 | Android smoke에서 확인 |
| 커뮤니티 | list/detail/comment path 가능 범위 | Android smoke에서 확인 |
| 알림함 | home dismiss/inbox delete 분리 회귀 없음 | focused + smoke로 확인 |

## Back 정책

- Android back은 modal/overlay가 열려 있으면 먼저 닫는다.
- keyboard가 열려 있으면 keyboard dismiss 후 화면 상태를 유지한다.
- ranking, activity, community, detail 화면은 entrySource 기반 fallback을 유지한다.
- admin console은 앱 내부 일반 사용자 route에 노출하지 않는다.

## 2026-07-11 Direct Back QA 증적

| 화면 | 경로 | Android back 결과 | 증적 |
| --- | --- | --- | --- |
| 우리동네 동물병원 리스트/상세 | `Home -> 전체메뉴 -> 우리동네 동물병원 -> 병원 상세` | 상세에서 리스트로 복귀, 리스트에서 이전 화면 복귀 가능. nav bar overlap 없음 | `/tmp/nuri-qa/conditional-closeout-hospital-detail.png`, `/tmp/nuri-qa/conditional-closeout-hospital-back.png` |
| 산책 리스트/상세 | `nuri://walk-spots -> 산책 장소 상세` | 상세에서 리스트로 복귀 가능. 위치/API 준비 전 crash 없음 | `/tmp/nuri-qa/conditional-closeout-walk-loaded.png`, `/tmp/nuri-qa/conditional-closeout-walk-back.png` |

logcat 증적: `/tmp/nuri-qa/conditional-closeout-hospital-walk-logcat.txt`

fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건으로 확인했다.

## Keyboard / Nav Bar 기준

- 입력창과 primary CTA가 Android keyboard 또는 nav bar에 가리면 blocker다.
- 기록 작성/수정, 건강 입력, 커뮤니티 글/댓글, search input은 keyboard open 상태에서 스크롤 또는 CTA 접근이 가능해야 한다.
- 하단 tab/nav bar와 FAB/CTA 사이에는 safe area 여백이 있어야 한다.

## 최종 판정

최종 release APK smoke 결과를 완료 보고에 연결한다. 병원/산책 direct back QA는 2026-07-11 증적으로 닫혔고, 현재 코드 변경은 keyboard layout을 직접 바꾸지 않고 기존 keyboard-aware 구조와 Android smoke 기준을 유지한다.
