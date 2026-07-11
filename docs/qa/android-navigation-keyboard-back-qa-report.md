# Android Navigation / Keyboard / Back QA Report

기준일: 2026-07-11
기준 기기: `SM_S937N / R5CY613NMSY`

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

## Keyboard / Nav Bar 기준

- 입력창과 primary CTA가 Android keyboard 또는 nav bar에 가리면 blocker다.
- 기록 작성/수정, 건강 입력, 커뮤니티 글/댓글, search input은 keyboard open 상태에서 스크롤 또는 CTA 접근이 가능해야 한다.
- 하단 tab/nav bar와 FAB/CTA 사이에는 safe area 여백이 있어야 한다.

## 최종 판정

최종 release APK smoke 결과를 완료 보고에 연결한다. 현재 코드 변경은 keyboard layout을 직접 바꾸지 않고, 기존 keyboard-aware 구조와 Android smoke 기준을 유지한다.

