# NURI 앱 최종 Release Gate QA 보고

기준일: 2026-07-15

## 2026-07-15 OAuth 보강 결과

- 기준 HEAD: `1576396`에서 시작, 이번 문서 갱신 후 새 commit으로 마감.
- 최신 APK SHA-256: `8bbc30195880ba02688b846551654486a695a94b0cdc84f15d01cb95e7d92d1e`
- 증적 디렉터리: `/tmp/nuri-qa/final-oauth-20260715/`
- Android 기기: `SM_S937N / R5CY613NMSY`
- provider surface: Google/Kakao 버튼 노출, Naver/Apple 미노출.
- Google: account chooser 진입, 실제 callback/session 생성 후 `NicknameSetup` 도달. 신규 소셜 사용자 온보딩 분기 동작 확인.
- Kakao: web flow 진입, provider/browser 상태에서 callback/onboarding 분기 확인.
- 취소 복귀: 현재 Chrome/provider 쿠키 상태에서는 Android back이 로그인 화면 복귀가 아니라 `NicknameSetup` 분기로 이어져 순수 취소 증적을 분리하지 못했다. 이 항목은 100% 승격 조건으로 남긴다.
- adminQA 복구: server-only Supabase admin 환경에서 `adminQA` 일반 사용자 profile을 확인하고 one-time magiclink `token_hash` callback으로 Home 진입. 비밀번호, token, provider email은 출력/문서화하지 않음.
- 검증: typecheck 통과, lint 0 error/기존 warning 4건, Jest `63 suites / 247 tests` 통과, Supabase dry-run remote up to date, release build/install 성공, 앱 fatal/ANR/unhandled/RN fatal/Fatal signal 0건.

| Criterion | 2026-07-15 OAuth 보강 결과 | 판정 |
| --- | --- | --- |
| Google/Kakao OAuth 성공·취소·복귀 | Google/Kakao provider 진입과 callback/session/onboarding 분기는 확인. 순수 취소 후 로그인 화면 복귀는 분리 실패. | 조건부 잔존 |
| 전체 입력 화면 keyboard/navigation sweep | TextInput inventory 188개 매칭 확인. 이번 턴 전수 실기기 sweep은 수행하지 않음. | 운영 반복 gate |
| logout/account switch notification token isolation | 직전 최신 APK에서 closeout. 이번 턴 adminQA는 token_hash로 Home 복구. | closeout 유지 |
| 최종 release regression gate | 최신 APK build/install, adminQA Home 복구, typecheck/lint/Jest/Supabase/logcat gate 통과. | 조건부 유지 |

## 2026-07-15 보강 결과

- 기준 HEAD: `49a70de`에서 시작, 이번 수정 후 새 commit으로 마감.
- 최신 APK SHA-256: `bfb9ac5ca79e61e8d91b2e738529f945dd6dcc77f12e7a597afca31b81a57524`
- 증적 디렉터리: `/tmp/nuri-qa/final-100-20260715/`
- 수정: Supabase `token_hash` callback 처리 추가, 동물병원 상세 public raw address 차단.
- Android QA: adminQA 직접 로그인, Home, Timeline, Community list/detail/comment keyboard/back, Hospital list/detail public-safe, Walk list/detail/search/back, Notification opt-in/OS permission/opt-out, logout, secondary QA account switch, adminQA 복구.
- 서버 token 확인: adminQA `push_opt_in=false`, active token 0건, revoked token만 존재. secondary QA active token 0건.
- 검증: typecheck 통과, lint 0 error/기존 warning 4건, Jest `63 suites / 247 tests` 통과, Supabase dry-run remote up to date, release build/install 성공, 앱 fatal/ANR/unhandled/RN fatal/Fatal signal 0건.
- 판정: 조건부 QA 4건 중 token isolation 1건 closeout. keyboard/navigation과 최종 regression은 대표 경로 보강, Google/Kakao 실제 외부 OAuth 성공·취소 smoke는 이번 턴에서 새로 직접 완료하지 못해 100% 판정 보류.

| Criterion | 2026-07-15 결과 | 판정 |
| --- | --- | --- |
| Google/Kakao OAuth 성공·취소·복귀 | token_hash callback gap은 수정/검증. controlled provider 실제 성공·취소는 이번 턴 새 증적 없음. | 조건부 잔존 |
| 전체 입력 화면 keyboard/navigation sweep | Community 댓글, Walk 검색, Notification modal, Hospital/Walk back, Home/Menu navigation 확인. 전체 TextInput route 전수는 미완료. | 조건부 잔존 |
| logout/account switch notification token isolation | adminQA opt-in/permission/opt-out/logout, secondary QA switch, server active token 0 확인. | closeout |
| 최종 release regression gate | 최신 APK build/install, 핵심 도메인 대표 회귀, public-safe hospital, tests/Supabase/logcat 통과. 전체 도메인 전수 회귀는 미완료. | 조건부 잔존 |

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
