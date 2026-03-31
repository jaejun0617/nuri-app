# 액션 1. Release blocker evidence pack

상태: 진행 중
최종 갱신: 2026-03-31
우선순위: P0

## 배경

- 현재 전체 점수 58점에서 가장 큰 감점 요인은 release blocker 증적 부족이다.

## 현재 문제

- physical-device QA가 없다.
- 비밀번호 재설정 메일 복귀, 계정 삭제 end-to-end, 커뮤니티 row-level moderation/cleanup, 장소/여행/산책 공개 신뢰도 캡처가 미완료다.
- 자동 확인 가능한 항목과 외부 조건이 필요한 항목이 한 묶음으로 남아 있다.

## 목표

- 자동으로 확보 가능한 증적은 이번 턴에 바로 확보한다.
- 외부 의존 증적은 비어 있는 항목, 못 닫는 이유, 닫는 방법을 명확히 고정한다.

## 작업 목록

- [x] 자동 증적 수집 스크립트 추가: `scripts/collect_release_readiness_snapshot.sh`
- [x] linked remote / migration / 기본 테스트 / 파일 배치 자동 점검 구조 생성
- [x] 현재 연결 기기 inventory 확인
- [x] 계정 삭제 row-level 현재 상태 스냅샷
- [x] 커뮤니티 moderation row-level 현재 상태 스냅샷
- [x] 비밀번호 재설정 deep link local 전제조건 재확인
- [x] Step 1 recovery session 오분기 repo-side blocker fix
- [ ] physical-device QA 캡처
- [x] 비밀번호 재설정 메일 복귀 실기기 재검증
- [ ] 계정 삭제 row-level 실행 증적
- [ ] 커뮤니티 moderation / cleanup row-level 실행 증적
- [ ] 장소/여행/산책 공개 신뢰도 실기기 캡처

## 이번 턴 실행 결과

- 자동 수집 스크립트를 추가해 아래 항목을 한 번에 다시 확인할 수 있게 만들었다.
  - `yarn test:qa`
  - `petTravel / consents / legalDocuments / guideCatalogSource` 타겟 테스트
  - linked Supabase migration list / dry-run
  - Android/iOS Firebase 파일 존재 여부
  - local-only runtime config 파일 존재 여부
- 자동 증적 재실행 결과는 아래와 같다.
  - `yarn test:qa`: 9 suite / 25 test 통과
  - 타겟 테스트: 4 suite / 10 test 통과
  - linked remote migration history: 8개 local/remote 정합
  - `supabase db push --linked --dry-run`: up to date
  - Android `google-services.json`: 존재
  - iOS `GoogleService-Info.plist`: 없음
  - `src/services/supabase/config.ts`, `src/config/runtime.ts`: local-only 확인
  - `src/services/monitoring/config.ts`: tracked DSN 기본값 제거 확인
- `adb devices -l` 기준 현재 연결은 `emulator-5554` 1대뿐이며 물리 Android 기기는 미탐지 상태다.
- 계정 삭제 row-level snapshot 결과는 아래와 같다.
  - `account_deletion_requests`: 0건
  - `account_deletion_cleanup_items`: 0건
  - 최근 요청 5건 조회 결과: 빈 결과
- 커뮤니티 운영 row-level snapshot 결과는 아래와 같다.
  - `reports`: 23건, 현재 상태 분포는 `open` 23건
  - `community_moderation_queue`: 18건
  - `community_moderation_actions`: 2건
  - `community_reporter_flags`: 1건
  - `community_image_assets`: 17건
  - 최신 `community_moderation_actions` 2건은 모두 `auto_hide_threshold` 근거의 `active -> auto_hidden` 전환이었다.
  - `community_image_assets`는 `uploaded` 17건이며, 이 중 1건은 `source_post_status = auto_hidden`, `cleanup_reason = auto_hidden` 상태다.
- 비밀번호 재설정 mail return local 전제조건은 아래처럼 다시 확인했다.
  - [auth.ts](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/services/supabase/auth.ts#L10) 기준 redirect URL은 `nuri://auth/reset`
  - [linking.ts](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/navigation/linking.ts#L24) 기준 recovery/form route가 앱 라우팅에 연결됨
  - [AndroidManifest.xml](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/android/app/src/main/AndroidManifest.xml#L65) 기준 `scheme=nuri`, `host=auth`, `pathPrefix=/reset` intent-filter 존재
  - 실제 메일 앱 복귀 캡처와 Supabase redirect allowlist 콘솔 증적은 여전히 미확보다.

## 2026-03-31 physical-device Step 1 실패 증적

- `adb devices -l` 기준 physical device 1대가 단독 인식됐다.
  - device: `SM_S937N`
  - transport: `usb`
- 실기기에서 비밀번호 재설정 메일 발송, 메일 링크 클릭, 새 비밀번호 입력까지는 실제로 완료됐다.
- 그러나 비밀번호 재설정 완료 직후 앱이 기존 사용자 세션을 정상 마무리하지 못하고, 기존 계정 컨텍스트에서 `PetCreate(from: 'auto')` 성격의 반려동물 추가 화면으로 새는 현상이 확인됐다.
- linked remote fact check 결과는 아래와 같다.
  - `auth.users`에서 테스트 이메일 기준 row는 1건뿐이다.
  - 해당 row는 기존 사용자 `a53f9c6c-5bce-4a37-94f7-ef5f683e538c` 하나이며, `created_at = 2026-03-15 18:20:22 UTC`, `deleted_at = null`이다.
  - `last_sign_in_at = 2026-03-31 02:10:29 UTC`로 이번 실기기 테스트 시점 sign-in activity는 기록됐다.
  - `public.profiles`도 같은 `user_id` 기준 1건만 존재한다.
  - profile row는 `nickname = 관리자님`, `nickname_confirmed = true`, `role = super_admin` 상태를 유지하고 있다.
  - `public.pets`에는 같은 `user_id` 기준 총 2건이 존재한다.
  - 기존 펫 1건은 `created_at = 2026-03-21 23:17:31 UTC`에 이미 존재했고, 추가 펫 1건은 `created_at = 2026-03-31 02:11:30 UTC`에 새로 생성됐다.
- 판정:
  - 실제 계정 중복 생성은 미발생이다.
  - 이번 Step 1 실패는 DB duplication이 아니라, recovery session을 일반 로그인 세션처럼 취급해 기존 계정의 부트 가드와 `PetCreate` write path까지 열어 버리는 앱 라우팅/상태 처리 blocker다.

## 2026-03-31 snapshot 보정

| 항목 | 현재 사실 | 판정 | 메모 |
| --- | --- | --- | --- |
| 물리 기기 연결 | `adb` 기준 `SM_S937N` 1대 단독 연결 | 확보 | Step 1 실기기 실행 가능 상태 확인 |
| 비밀번호 재설정 메일 복귀 | 메일 클릭과 비밀번호 변경은 성공 | 실패 | 완료 직후 기존 계정 `PetCreate(from: 'auto')` 오분기 blocker 발생 |
| auth.users duplication | 테스트 이메일 기준 1건 | 중복 없음 | 실제 신규 계정 생성 증거 없음 |
| profiles duplication | 같은 `user_id` 기준 1건 | 중복 없음 | 기존 profile row 유지 |
| pets side effect | 같은 `user_id` 기준 2건 | side effect 발생 | 2026-03-31 02:11:30 UTC 새 pet row 1건 생성 확인 |
| 비밀번호 재설정 운영 판정 | recovery 세션 처리 버그 존재 | release blocker | 코드 수정 전 Step 2 진행 금지 |

## 2026-03-31 repo-side blocker fix 반영

- repo 기준으로는 recovery 세션을 일반 로그인 bootstrap에 승격하지 않도록 앱 계약을 수정했다.
- 핵심 변경은 아래와 같다.
  - `authStore`에 `passwordRecoveryFlow` persisted state와 TTL을 추가했다.
  - `AppProviders`에서 recovery session을 일반 로그인 bootstrap으로 승격하지 않고 guest sandbox에 머물게 했다.
  - `PasswordResetRecoveryScreen`에서 recovery 진입 직후 flow를 activate하고, 실패 시 세션을 정리한 뒤 `PasswordResetRequest`로 되돌리게 했다.
  - `PasswordResetFormScreen`에서 성공, 에러, 뒤로가기, 취소 모두 `passwordRecoveryFlow 해제 -> signOut/clearLocalAuthSession -> SignIn reset` 경로로 수렴하도록 바꿨다.
  - `boot.ts`, `HomeScreen`, `MainScreen`에서 recovery active 동안 `SignIn` 외 자동 분기와 `PetCreate(from: 'auto')` 진입을 막았다.
  - `SignInScreen`에서 stale recovery flag가 남아 정상 로그인까지 막는 상태를 방지하도록 local recovery cleanup을 추가했다.
- 자동 검증 결과는 아래와 같다.
  - `yarn test --watchAll=false --watchman=false __tests__/appBoot.test.ts __tests__/authStoreRecovery.test.ts __tests__/passwordRecoverySession.test.ts`: 3 suite / 12 test 통과
  - `yarn tsc --noEmit`: 통과
- 현재 판정:
  - repo 기준 blocker fix는 완료다.
  - 실기기 Step 1 재검증 전까지는 release blocker 해제라고 쓰지 않는다.
- 운영 메모:
  - 이번 버그로 생성된 `2026-03-31 02:11:30 UTC` pet row는 지금 턴에 삭제하지 않았다.
  - 이 row는 별도 운영/DB 정리 task로 분리해야 한다.

## 2026-03-31 physical-device Step 1 재검증 성공

- 실기기: `SM_S937N`
- QA 계정: `shinjaejun1996@gmail.com`
- 기존 비밀번호: `qwer1234!`
- 새 비밀번호: `test1234!`
- 사용자 시각 검증 결과:
  - 검증 포인트 1 통과: recovery 링크 클릭 후 앱이 `PetCreate`로 새지 않고 `PasswordResetFormScreen`으로 정상 진입했다.
  - 검증 포인트 2 통과: `test1234!` 제출 성공 직후 앱이 기존 로그인 세션으로 새지 않고 `SignIn` 화면으로 정확히 복귀했고, 성공 안내 문구도 표시됐다.
- linked remote fact check 결과:
  - `auth.users`: 테스트 이메일 기준 1건 유지
  - `auth.users.last_sign_in_at = 2026-03-31 03:04:10.335724+00`
  - `public.profiles`: 같은 `user_id` 기준 1건 유지, `nickname_confirmed = true`, `role = super_admin`
  - `public.pets`: 같은 `user_id` 기준 2건 유지
  - 이번 재검증 이후 추가 pet row는 생성되지 않았다.
- 판정:
  - Step 1 release blocker는 repo fix + physical-device 재검증 기준으로 해소됐다.
  - 이전 blocker의 본질이었던 recovery session의 일반 로그인 승격과 `PetCreate(from: 'auto')` side effect 재발은 이번 시나리오에서 재현되지 않았다.
- 운영 메모:
  - `2026-03-31 02:11:30 UTC`에 생성된 historical garbage pet row는 여전히 남아 있다.
  - 이 row는 Step 1 성공과 별개인 운영/DB 정리 task다.

## 2026-03-30 snapshot 판정

| 항목 | 현재 사실 | 판정 | 메모 |
| --- | --- | --- | --- |
| 물리 기기 연결 | `adb` 기준 emulator만 연결 | 미완료 | 실기기 QA blocker 유지 |
| 비밀번호 재설정 local 계약 | 앱 deep link와 Android intent-filter 존재 | 부분 확보 | 메일 앱 복귀 실증과 allowlist 증적이 필요 |
| 계정 삭제 row-level | 관련 테이블 0건, 최근 요청 없음 | 미완료 | 구조는 배포됐지만 운영 증적은 아직 없음 |
| 커뮤니티 moderation row-level | queue/action/reporter/image row 존재 | 부분 확보 | resolved / cleanup_pending / restore 시나리오는 아직 미확보 |
| linked remote / migration | 정합 | 확보 | 자동 스크립트로 재현 가능 |

## 증적 분해

| 항목 | 현재 상태 | 이번 턴 가능 여부 | 못 닫는 이유 | 닫는 방법 |
| --- | --- | --- | --- | --- |
| physical-device QA | 미완료 | 불가 | 물리 실기기 캡처와 조작이 필요 | 최소 1대 기기에서 장소/여행/산책, reset, 커뮤니티 캡처 확보 |
| 비밀번호 재설정 메일 복귀 | local 계약만 확인 | 부분 가능 | 실제 메일 앱/딥링크 복귀와 allowlist 콘솔은 외부 장치/콘솔 접근 필요 | Supabase redirect allowlist 캡처 후 실기기 메일 복귀 캡처 |
| 계정 삭제 row-level 증적 | 구조 배포 / 운영 row 0건 | 부분 가능 | 실제 삭제 대상 QA 계정과 storage 정리 시나리오가 필요 | QA 계정 준비 후 요청 전/후 테이블과 bucket 캡처 |
| 커뮤니티 moderation / cleanup row-level | queue/action/image 실row 존재 | 부분 가능 | resolved / cleanup_pending / restore 시나리오가 아직 없음 | QA 게시글/댓글/신고/이미지 시나리오를 재현해 row 상태 전환 캡처 |
| linked remote schema / migration | 확보 | 가능 | 없음 | 자동 스크립트로 재검증 |

## 완료 기준

- 자동 증적은 스크립트와 실행 결과로 재현 가능해야 한다.
- 외부 의존 증적은 필요한 캡처 순서와 판정 기준이 문서에 잠겨 있어야 한다.

## 리스크

- 이 문서만으로 external QA를 대체할 수 없다.
- 실제 운영 증적이 쌓이기 전까지 release blocker 해제는 금지다.
- 계정 삭제는 row 0건이라 “구현 배포”와 “운영 증적 확보”를 같은 말로 쓸 수 없다.
- 커뮤니티는 실row가 있어도 `resolved`, `cleanup_pending`, `restored` 전환이 없으면 cleanup gate를 통과할 수 없다.
- 비밀번호 재설정 Step 1은 이번 재검증으로 닫혔지만, historical garbage pet row 1건은 별도 운영 정리 전까지 남는다.
- `2026-03-31 02:11:30 UTC` pet row는 아직 운영 정리 전이다. repo-side fix가 들어가도 이 historical garbage row가 자동으로 사라지지는 않는다.

## 다음 액션

- Step 2 account deletion 실기기 QA를 수행해 `account_deletion_requests`, `account_deletion_cleanup_items` row-level 증적을 확보한다.
- Step 2와 Step 3은 Step 1 blocker가 해소된 뒤 진행한다.

## 상태

- 진행 중
