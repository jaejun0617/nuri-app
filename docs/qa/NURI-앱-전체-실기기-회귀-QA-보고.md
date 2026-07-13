# NURI 앱 전체 실기기 회귀 QA 보고

기준일: 2026-07-14

## 최종 Release Gate 최신 시도

- APK: `android/app/build/outputs/apk/release/app-release.apk`
- APK SHA-256: `57c660393d4de35e1a00c8d19e4b29e85422fcddd60c86cb6048ac621ac6cbeb`
- install/update: 성공
- 기기: `SM_S937N / R5CY613NMSY`
- 증적 디렉터리: `/tmp/nuri-qa/final-release-gate-20260714/`

이번 최신 시도에서 Google OAuth 취소/성공, Google 신규 온보딩, Kakao OAuth 성공, Kakao 신규 온보딩, 소셜 session restore, 로그인 화면 Google/Kakao only 상태는 확인했다. Kakao 순수 취소 복귀, 전체 입력 화면 keyboard sweep, `adminQA` 재로그인 후 notification token isolation/account switch, 전체 핵심 도메인 회귀는 완료 판정하지 않는다.

local verification은 typecheck 통과, lint 0 error/기존 warning 6건, Jest 62 suites / 244 tests 통과, Supabase dry-run remote up to date, clean short logcat 앱 fatal/ANR/RN fatal 0건이다.

## Baseline

- 기기: `SM_S937N / R5CY613NMSY`
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- APK SHA-256: `59a152f3fe0d95bfc0579b8eb8942e16053047bd7d9f31dcaa346404493612b9`
- install/update: 성공
- package: `com.nuri.app`
- version: `1.0`, versionCode `1`

## 최신 확인 경로

| 항목 | 결과 | 증적 |
| --- | --- | --- |
| cold start/Home | adminQA Home shell, weather, pet card, bottom tab 표시 | `/tmp/nuri-qa/app-reconcile-cold-start-home-20260714.png` |
| Community list | `최근 글`, `6개`, post cards 표시 | `/tmp/nuri-qa/app-reconcile-community-20260714.png` |
| Community detail | post detail/comment input 표시 | `/tmp/nuri-qa/app-reconcile-community-detail-20260714.png` |
| Comment keyboard | IME visible, input/CTA 접근 가능 | `/tmp/nuri-qa/app-reconcile-keyboard-comment-20260714.png` |
| Comment back | Android back으로 keyboard dismiss | `/tmp/nuri-qa/app-reconcile-keyboard-back-20260714.png` |
| Hospital list | 병원명/전화번호/public-safe list 표시 | `/tmp/nuri-qa/app-reconcile-hospital-20260714.png` |
| Hospital detail/back | 상세 진입 후 back 리스트 복귀 | `/tmp/nuri-qa/app-reconcile-hospital-detail-20260714.png`, `/tmp/nuri-qa/app-reconcile-hospital-back-20260714.png` |
| Walk list | 위치 기준 산책 리스트/필터 표시 | `/tmp/nuri-qa/app-reconcile-walk-20260714.png` |
| Walk search keyboard | search input keyboard visible/back dismiss | `/tmp/nuri-qa/app-reconcile-walk-keyboard-20260714.png` |
| logcat | fatal/ANR/unhandled/RN fatal/Fatal signal 0건 | `/tmp/nuri-qa/app-reconcile-logcat-20260714.txt` |

## 보안·정책 확인

- 병원 public XML에는 운영시간, 야간, 응급, 특수동물, 주차, 장비, 홈페이지, SNS, raw/internal/source field가 노출되지 않았다.
- 커뮤니티 댓글 삭제 hard delete fallback은 코드에서 제거했고 focused test로 고정했다.
- actual push, broadcast, segment broadcast는 계속 비활성이다.
- 관리자 UI는 앱 내부 일반 사용자 화면에 노출하지 않는다.

## 조건부/반복 QA

이번 smoke는 최신 코드 변경 영향 경로와 대표 keyboard/navigation 경로를 직접 확인했다. 로그인/소셜 취소, 전체 입력 화면 sweep, logout/account switch token isolation은 기존 evidence와 테스트를 유지하되, 최종 제출 직전 release QA에서 반복 수행한다.
