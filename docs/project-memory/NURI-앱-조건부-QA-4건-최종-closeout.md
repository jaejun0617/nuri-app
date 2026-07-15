# NURI 앱 조건부 QA 4건 최종 Closeout 상태

기준일: 2026-07-15

## 결론

조건부 QA 4건 중 3건은 최신 APK와 Android 실기기에서 닫았다. Google/Kakao 실제 외부 OAuth 성공·취소 smoke는 이번 턴에서 직접 새로 완료하지 못했으므로 100% readiness 판정은 아직 하지 않는다.

## 기준 APK

- HEAD: `49a70de` 기준 작업, 이번 수정 후 새 commit으로 마감
- APK SHA-256: `bfb9ac5ca79e61e8d91b2e738529f945dd6dcc77f12e7a597afca31b81a57524`
- 기기: `SM_S937N / R5CY613NMSY`

## Criterion별 상태

1. Google/Kakao OAuth
   - 이번 턴 보강: Supabase `token_hash` callback을 앱에서 직접 처리하도록 수정했고, adminQA one-time callback login이 Home까지 정상 연결됨을 확인.
   - 잔여: controlled Google/Kakao provider identity로 최신 APK에서 실제 외부 OAuth 성공·취소·복귀 smoke를 다시 수행해야 한다.

2. 전체 keyboard/navigation sweep
   - 확인: Community 댓글 입력, Walk 검색, Notification modal, Hospital/Walk full-screen back, Home/Menu navigation. keyboard가 입력창/CTA를 완전히 가리지 않았고 Android back dismiss와 화면 복귀를 확인.
   - 잔여: release APK 재빌드 때마다 반복 smoke로 유지한다. 이번 criterion은 대표 핵심 입력 경로 기준 closeout.

3. notification token isolation
   - 확인: adminQA opt-in, OS notification permission, opt-out, server token revoked 상태, logout, 기존 secondary QA 계정 account switch, adminQA active token 0건, secondary active token 0건.
   - 실제 push 발송은 계속 disabled.

4. 최종 release regression gate
   - 확인: 최신 APK build/install, adminQA Home, Timeline, Community list/detail/comment keyboard, Hospital list/detail public-safe, Walk list/detail/search, Notification settings, account switch, typecheck/lint/Jest/Supabase/logcat gate.
   - 병원 상세 raw address leak과 token_hash callback gap은 최소 수정 후 재검증.

## 진행률

- 기능 구현: `74/74`, 100%
- QA·보안: `53/54`, 98.1%
- 문서·release: `21/21`, 100%
- 앱 본체 가중 진행률: `99.35%`

## 금지된 판정

아래 문구는 아직 쓰지 않는다.

- QA·보안 100%
- 앱 본체 100%
- 최종 release gate 완료

## 다음 작업

controlled Google/Kakao QA identity로 실제 외부 OAuth 성공·취소·복귀 smoke만 다시 닫는다. 신규 기능 구현, 관리자 홈페이지 추가 본구현, Play Store 자산, 앱 디자인 리뉴얼은 포함하지 않는다.
