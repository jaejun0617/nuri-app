# NURI 앱 최종 통합 Release QA 보고

기준일: 2026-07-19

## Artifact

- 기준 HEAD: `388d9c7`, 최종 HEAD는 closeout commit.
- package: `com.nuri.app`.
- versionName/versionCode: `1.0` / `1`.
- APK: `android/app/build/outputs/apk/release/app-release.apk`.
- 크기: 114,810,904 bytes.
- SHA-256: `0d598322d5cd6463582ab3e17d93a9d0bc81e44ce7d7eec5fa45efbcb74fabe4`.
- 기기: `SM_S937N / R5CY613NMSY`.
- 계정: 고정 `adminQA`; controlled Google/Kakao identities는 OAuth·account-switch QA에만 사용하고 모두 logout/revoke했다.
- 증적: `/tmp/nuri-qa/`이며 Git에 포함하지 않는다.

## 조건부 QA 4건 Closeout

### 1. OAuth

- 로그인 화면에 Google/Kakao만 노출되고 Naver/Apple은 노출되지 않는다.
- Google chooser 진입 후 Android back으로 로그인 화면에 clean return, spinner 종료, crash 0을 확인했다.
- controlled Google identity 실제 성공, `NicknameSetup -> PetCreate -> Home`, force-stop 후 session restore를 확인했다.
- Kakao web flow 진입 후 Android back clean return, spinner 종료, crash 0을 확인했다.
- controlled Kakao identity 실제 성공, 신규 onboarding과 Home/session restore를 확인했다.
- provider email, token, 계정 식별 정보는 캡처·문서에 남기지 않았다.

### 2. Keyboard / Navigation

- `TextInput` 사용 소스 27개를 inventory했다. 일반 사용자 입력 구현 23개를 대상으로 하고 앱 내부 비노출 admin/dev 입력 4개는 제외했다.
- 실제 노출되는 24개 screen/sheet/modal 입력 surface를 실기기에서 열었다: sign-in, sign-up, reset request/form, NicknameSetup, nickname edit, PetCreate/Edit, memorial/date picker, weight, record create/edit/tag, post editor, comment, report, hospital/walk search, schedule create/edit, guestbook, guide search, weather activity record, withdrawal confirm.
- keyboard bar/avoiding, input·CTA visibility, scroll, validation, keyboard back 1회, screen/modal back 2회, bottom navigation overlap을 확인했다.
- record/schedule edit는 controlled QA data로 열었고 임시 일정은 QA 종료 후 삭제해 원상복구했다. 비밀번호와 사용자 원본 기록은 변경하지 않았다.

### 3. Notification Token Isolation

- `adminQA`: OS permission 허용, opt-in/register, opt-out/revoke, logout revoke를 확인했다.
- controlled Google secondary identity: 같은 기기 opt-in/register 후 `adminQA`와 동시 active ownership 0, logout 후 non-revoked 0을 확인했다.
- controlled Kakao identity도 종료 후 non-revoked 0이다.
- 최종 server aggregate는 세 controlled identities 모두 non-revoked 0, cross-user active device 0이다.
- 실제 OS token rotation은 발생하지 않았다. refresh handler/RPC의 동일-device upsert, ownership 유지, stale 교체 계약은 focused test와 controlled RPC evidence로 확인했다.
- actual push, broadcast, segment dispatcher는 비활성이다.

### 4. Release Regression

- Home, Timeline, Community, Hospital, Walk, Weather, Growth/Ranking, Notification, Settings/Profile을 최신 APK에서 순회했다.
- Community는 6개 목록과 detail/editor/comment/report를 확인했다. soft-hide/direct-detail 차단/undo 계약은 현재 read-path tests와 최신 production moderation evidence를 함께 사용했다.
- Hospital list/detail은 병원명·검수 전화·거리·전화/길찾기만 표시하고 raw address와 운영시간/야간/응급/특수동물/주차/장비/홈페이지/SNS/raw metadata를 표시하지 않는다.
- Walk는 Kakao Local 실제 결과와 search/fallback을 표시했고 fan-out 12 제한 및 dedupe는 focused tests로 고정했다.

## Security Gate

- Supabase dry-run: remote up to date, destructive diff 없음.
- anon: admin dashboard, approval queue, undo, push-token write 차단.
- anon private token row: 0건.
- service role: read-only dashboard/token lifecycle summary 허용.
- hidden community content, soft-deleted comment, user/device token scope, withdrawal grace, public hospital projection은 focused/regression tests 통과.
- hard delete RPC, actual push dispatcher, Naver/Apple public surface 없음.
- app query cache는 logout/session clear에서 제거된다.
- monitoring/worker 로그에 email, token, storage path, raw error를 남기지 않는다.

## Final Gate

| Gate | 결과 |
| --- | --- |
| typecheck | 통과 |
| lint | error 0 / warning 0 |
| tests | 64 suites / 249 tests / failure 0 |
| release build | 성공, 949 tasks |
| install/cold start | 성공 |
| app-scoped logcat | Fatal/ANR/unhandled/RN fatal/Fatal signal/SecurityException 0 |
| Supabase | up to date, destructive diff 0 |
| criterion | 기능 74/74, QA·보안 54/54, 문서 21/21 |

최종 판정은 현재 승인 범위 100%다. 별도 PO 승인 트랙과 정책상 비활성 기능은 진행률 분모에서 제외한다.
