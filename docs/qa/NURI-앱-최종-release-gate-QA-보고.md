# NURI 앱 최종 Release Gate QA 보고

기준일: 2026-07-14

## Baseline

- 앱 repo HEAD: `23744c3`
- branch: `codex/task6-community-content-policy`
- Android 기기: `SM_S937N / R5CY613NMSY`
- APK path: `android/app/build/outputs/apk/release/app-release.apk`
- APK SHA-256: `57c660393d4de35e1a00c8d19e4b29e85422fcddd60c86cb6048ac621ac6cbeb`
- package/version: `com.nuri.app` / `1.0` / `1`
- 증적 디렉터리: `/tmp/nuri-qa/final-release-gate-20260714/`

## 조건부 QA 4건 판정

| Criterion | 이번 턴 결과 | 판정 |
| --- | --- | --- |
| Google/Kakao OAuth 성공·취소·복귀 | Google 취소/성공/온보딩/session restore 확인. Kakao 성공/온보딩/session restore 확인. Kakao 순수 취소 복귀는 SSO/외부 앱 전환으로 깨끗하게 닫지 못함. | 조건부 잔존 |
| 전체 입력 화면 keyboard/navigation sweep | 로그인, NicknameSetup, PetCreate 일부 입력/validation/back 확인. 전체 TextInput route sweep은 완료하지 못함. | 조건부 잔존 |
| logout/account switch notification token isolation | `adminQA` 재로그인 사용자 입력이 완료되지 않아 최신 APK 실기기 E2E 미완료. 기존 Jest 계약은 통과. | 조건부 잔존 |
| 최종 release regression gate | 최신 APK build/install, Home/login screen, 소셜 온보딩 일부, tests/Supabase/logcat short gate 통과. `adminQA` 세션 전체 도메인 회귀는 미완료. | 조건부 잔존 |

## 통과한 검증

- typecheck: 통과
- lint: 0 error, 기존 warning 6건
- Jest: 62 suites / 244 tests 통과
- Supabase: `db push --dry-run` remote up to date
- release build: 성공
- install/update: 성공
- clean short logcat: 앱 fatal/ANR/RN fatal 패턴 0건
- public social surface: Google/Kakao 노출, Naver/Apple 미노출

## 증적

- 로그인 화면: `/tmp/nuri-qa/final-release-gate-20260714/login-home.png`
- Google 취소 복귀: `/tmp/nuri-qa/final-release-gate-20260714/google-cancel-return.png`
- Google 성공/온보딩: `/tmp/nuri-qa/final-release-gate-20260714/google-success-return.png`, `/tmp/nuri-qa/final-release-gate-20260714/google-home.png`
- Kakao 성공/온보딩: `/tmp/nuri-qa/final-release-gate-20260714/kakao-home.png`, `/tmp/nuri-qa/final-release-gate-20260714/kakao-session-restore.png`
- 현재 로그인 화면: `/tmp/nuri-qa/final-release-gate-20260714/current-screen.png`
- clean short logcat: `/tmp/nuri-qa/final-release-gate-20260714/logcat-clean-short.txt`

## 최종 판정

조건부 QA 일부 잔존. 이번 결과로 100% readiness를 선언하지 않는다.

기능 구현 criterion은 `74/74`로 유지한다. QA·보안 criterion은 `50/54`로 유지한다. 문서·release criterion은 이번 정정 반영 후 `21/21`로 유지한다. 앱 본체 가중 진행률은 `97.4%`다.

## 다음 닫힘 기준

1. 사용자 입력으로 `adminQA` 로그인 완료.
2. Kakao 순수 취소 후 로그인 화면 복귀 재검증.
3. 전체 TextInput route keyboard/navigation sweep.
4. notification opt-in/out, logout revoke, account switch isolation.
5. `adminQA` 세션 기반 전체 핵심 도메인 regression.
