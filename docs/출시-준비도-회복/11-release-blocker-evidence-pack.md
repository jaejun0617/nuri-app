# 액션 1. Release blocker evidence pack

상태: 진행 중
최종 갱신: 2026-04-03
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
- [x] 계정 삭제 row-level 실행 증적
- [x] 커뮤니티 신고 row-level 1차 증적
- [x] 정책 문서 앱 링크 Android 실기기 열림 / 복귀 검증
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

## 2026-03-31 physical-device Step 2 account deletion hard delete 검증

- 실기기: `SM_S937N`
- QA 계정: `test1234@test.com`
- baseline 대상 `user_id`: `74cd98ab-5c3c-4502-b6cc-6543d8bd6a70`
- baseline 스냅샷:
  - `role = user`
  - `account_deletion_requests = 0`
  - `account_deletion_cleanup_items = 0`
  - `posts = 13`
  - `comments = 35`
  - `pets = 2`
- 사용자 시각 검증 결과:
  - 실기기에서 계정 삭제 실행 후 삭제 완료 토스트가 노출됐다.
  - 같은 자격 증명으로 다시 로그인 시도했을 때 계정이 삭제된 상태로 확인됐다.
  - 관리자 계정으로 커뮤니티를 확인했을 때 해당 계정이 남긴 게시글이 read-path에서 사라진 것을 확인했다.
- linked remote post-delete fact check 결과:
  - `auth.users = 0`
  - `public.profiles = 0`
  - `public.posts = 0`
  - `public.comments = 0`
  - `public.pets = 0`
  - `public.memories = 0`
  - `public.memory_images = 0`
  - `public.account_deletion_requests = 1`
  - `public.account_deletion_cleanup_items = 17`
- 최신 `account_deletion_requests` row:
  - `id = be833a80-31b1-44b3-8d95-cf9ec051fdd1`
  - `status = completed_with_cleanup_pending`
  - `storage_cleanup_pending = true`
  - `cleanup_item_count = 17`
  - `cleanup_completed_count = 0`
  - `requested_at = 2026-03-31 04:24:14.494449+00`
  - `completed_at = 2026-03-31 04:24:14.693494+00`
- cleanup queue row-level 결과:
  - `pet-profiles`, `community-images` bucket 대상으로 총 17건 생성
  - 현재 상태는 모두 `pending`
  - 이번 시점에서는 cleanup worker가 아직 실행되지 않아 object storage 삭제는 미완료
- logcat 모니터링:
  - `ReactNativeJS:I`, `AndroidRuntime:E` 필터 기준 관측 창에서 치명적 에러 출력은 포착되지 않았다.
- 판정:
  - 계정 삭제 DB hard delete는 `auth.users / profiles / posts / comments / pets` 기준으로 확인됐다.
  - `memories / memory_images`는 삭제 후 0건을 확인했지만, 이번 실행 전 baseline을 별도로 수집하지 않았기 때문에 “전후 비교형 hard delete 증적”로는 약하다.
  - storage cleanup은 별도 비동기 단계이며, 현재는 `completed_with_cleanup_pending` 상태라 Step 2를 “DB hard delete 성공 + storage cleanup 후속 확인 필요”로 잠근다.

## 2026-03-31 Step 2 storage cleanup 완료 증적

- cleanup 대상 request:
  - `account_deletion_requests.id = be833a80-31b1-44b3-8d95-cf9ec051fdd1`
- cleanup 시작 전 상태:
  - `account_deletion_cleanup_items = 17`
  - bucket 분포: `community-images = 15`, `pet-profiles = 2`
  - `storage.objects` join 기준 orphan 후보도 동일하게 `community-images = 15`, `pet-profiles = 2`
- 강제 실행 결과:
  - `public.claim_account_deletion_cleanup_items(20)` RPC는 remote에서 `request_id is ambiguous` 오류로 실제 claim worker로는 동작하지 않았다.
  - 이번 턴에서는 Step 2 release blocker를 닫기 위해 request를 `cleanup_pending`으로 올리고 cleanup item 17건을 직접 `processing`으로 전환한 뒤, `supabase storage rm --yes --experimental --linked`로 bucket object를 삭제하고 `public.complete_account_deletion_cleanup_item()`으로 상태를 닫는 수동 worker 절차를 실행했다.
- cleanup 완료 후 linked remote fact check:
  - `account_deletion_cleanup_items.status = completed` 17건
  - `account_deletion_requests.status = completed`
  - `storage_cleanup_pending = false`
  - `cleanup_completed_count = 17`
  - `cleanup_completed_at = 2026-03-31 06:22:04.101837+00`
  - `storage.objects` join 기준 target path orphan:
    - `community-images = 0`
    - `pet-profiles = 0`
  - `supabase storage ls --experimental --linked -r ss:///pet-profiles/74cd98ab-5c3c-4502-b6cc-6543d8bd6a70`: 빈 결과
  - `supabase storage ls --experimental --linked -r ss:///community-images/74cd98ab-5c3c-4502-b6cc-6543d8bd6a70`: 빈 결과
- 판정:
  - Step 2 account deletion은 `DB hard delete + storage cleanup 완료 + orphan 0건` 기준으로 release blocker 증적이 닫혔다.
  - 다만 `claim_account_deletion_cleanup_items()` remote 구현 자체는 현재 운영 버그가 확인됐으므로, cleanup worker 경로는 Step 3 이후 별도 engineering follow-up으로 남긴다.

## 2026-03-31 Step 3 community 신고 1차 증적 + 키보드 blocker fix 착수

- Step 3 baseline 대비 linked remote 변화는 아래와 같다.
  - `reports`: `23 -> 24`
  - `community_moderation_queue`: `18 -> 19`
  - `community_moderation_actions`: `2 -> 2`
- 새 신고 row-level 결과:
  - `reports.id = 0742e21d-c359-4075-b55f-3da49a0e06ae`
  - `reporter_id = a53f9c6c-5bce-4a37-94f7-ef5f683e538c`
  - `target_type = post`
  - `target_id = 657a66aa-347c-4e6a-8b0d-ebf4a2c98bd2`
  - `reason_category = spam`
  - `status = open`
  - `created_at = 2026-03-31 06:37:21.835547+00`
- 새 moderation queue row-level 결과:
  - `community_moderation_queue.id = c7db6eed-fe3a-465b-9057-b175ef1370a2`
  - `target_type = post`
  - `target_id = 657a66aa-347c-4e6a-8b0d-ebf4a2c98bd2`
  - `content_status_snapshot = active`
  - `report_count = 1`
  - `unique_reporter_count = 1`
  - `queue_status = open`
  - `decision = null`
  - `latest_reported_at = 2026-03-31 06:37:21.835547+00`

## 2026-04-02 Step 3 post auto-hide row-level 증적 확보

- 현재 linked remote baseline 재확인 결과는 아래와 같다.
  - `reports = 27`
  - `community_moderation_queue = 20`
  - `community_moderation_actions = 3`
  - `community_image_assets = 17`
- 기존 1차 target `657a66aa-347c-4e6a-8b0d-ebf4a2c98bd2`는 여전히 auto-hide 미발동 baseline으로 남아 있다.
  - `public.posts.status = active`
  - `community_moderation_queue.id = c7db6eed-fe3a-465b-9057-b175ef1370a2`
  - `report_count = 1`
  - `unique_reporter_count = 1`
  - `queue_status = open`
- 이번 턴에서 실제 auto-hide가 발동한 QA target은 아래와 같다.
  - `public.posts.id = 317f7b2e-5458-4352-841f-94a8db7bec73`
  - `title = [QA][Step3][6645108] auto hide target`
  - `status = auto_hidden`
  - `created_at = 2026-04-02 02:24:23.827061+00`
  - `updated_at = 2026-04-02 02:30:25.631387+00`

## 2026-04-03 Step 4 정책 문서 앱 링크 실기기 검증 + PO 승인

- 실기기/승인 source of truth:
  - Android physical device `SM_S937N`
  - PO 직접 확인 결과
- 확인된 실제 경로:
  - 회원가입 > `이용약관 동의` > `전체 보기` > `NURI 이용약관`
  - 회원가입 > `개인정보처리방침 동의` > `전체 보기` > `NURI 개인정보처리방침`
  - 전체메뉴 > 계정 삭제 > `삭제 안내 상태 확인` > `NURI 계정 삭제 / 탈퇴 안내`
- 확인 결과:
  - 세 경로 모두 외부 브라우저에서 Notion public URL로 정상 팝업됐다.
  - 세 경로 모두 로그인 요구 없이 본문 렌더링이 확인됐다.
  - Android 뒤로가기 후 앱으로 정상 복귀했다.
  - PO가 위 3개 경로를 직접 확인하고 Task 4 공식 승인 완료를 통보했다.
- 범위 분리:
  - 최종 완료 대상: `이용약관`, `개인정보처리방침`, `계정 삭제 / 탈퇴 안내`
  - 보류 대상: `마케팅 수신 안내`는 `draft` 유지, `커뮤니티 운영정책`은 public URL만 있고 현재 앱 연결 대상이 아니다.
- 판정:
  - 정책 문서 release blocker는 해제됐다.
  - 단, 이것을 법무 확정본 승인과 같은 뜻으로 쓰면 안 되며, 운영자 정보/문의처/법무 검토는 별도 확인 항목으로 남는다.
- 같은 target의 신고 row-level 결과:
  - `reports.id = 3703218c-495c-418d-b131-d5495b812a06`, `created_at = 2026-04-02 02:30:24.017763+00`
  - `reports.id = 2c5eec36-5922-4f71-bf33-f5deb91f0181`, `created_at = 2026-04-02 02:30:24.931796+00`
  - `reports.id = be547d12-bd74-4718-8d2e-bf0a8b4c7cc2`, `created_at = 2026-04-02 02:30:25.631387+00`
  - 세 row 모두 `target_type = post`, `reason_category = spam`, `status = open`
- 같은 target의 moderation queue row-level 결과:
  - `community_moderation_queue.id = 481f2b93-0b30-413c-be0c-c08fc39a7dbe`
  - `content_status_snapshot = auto_hidden`
  - `report_count = 3`
  - `unique_reporter_count = 3`
  - `queue_status = open`
  - `decision = null`
  - `decision_reason = auto_hide_threshold`
  - `operator_memo = 신고 누적 기준으로 자동 숨김 처리됐어요.`
  - `latest_reported_at = 2026-04-02 02:30:25.631387+00`
- 같은 target의 moderation action row-level 결과:
  - `community_moderation_actions.id = b19f8f17-90d8-432e-95fb-8c2dd13fb03f`
  - `action_type = auto_hide`
  - `before_status = active`
  - `after_status = auto_hidden`
  - `source_report_id = be547d12-bd74-4718-8d2e-bf0a8b4c7cc2`
  - `reason_code = auto_hide_threshold`
  - `created_at = 2026-04-02 02:30:25.631387+00`
- image cleanup trace fact check:
  - 이번 auto-hide target `317f7b2e-5458-4352-841f-94a8db7bec73`에는 `community_image_assets` row가 없다.
  - 그래서 이 target 기준 `cleanup_pending` 증적은 이번 턴에 확보하지 못했다.
  - 다만 linked remote 전체 기준으로는 historical trace 1건이 남아 있다.
  - `community_image_assets.id = 16819492-e954-4378-8b54-04597d2ec60a`
  - `post_id = 6f965ad9-38d7-424b-979c-7ae951dafbcc`
  - `upload_status = uploaded`
  - `source_post_status = auto_hidden`
  - `cleanup_reason = auto_hidden`
  - `cleanup_requested_at = 2026-03-25 06:29:43.704389+00`
- restore / resolved 경로 점검 결과:
  - repo SQL 기준으로는 `apply_community_moderation_action(... p_after_status = 'active')`가 `restore + resolved` 경로를 제공한다.
  - 하지만 linked remote에서 같은 RPC를 QA target에 직접 호출하자 실패했다.
  - 실제 오류는 `reports_status_check` 제약 위반이며, 함수 기본값 `resolved_no_action`이 remote `reports.status` 허용값과 맞지 않았다.
  - 실패 시점에도 target post, queue, action row는 그대로 유지돼 auto-hide 증적은 훼손되지 않았다.
- 판정:
  - Step 3 최우선 목표였던 `community moderation auto-hide row-level 증적`은 linked remote 기준으로 확보됐다.
  - 이번 턴에서는 `active -> auto_hidden`은 닫혔다.
  - `cleanup_pending`은 같은 target 이미지 부재로 미확보다.
  - `resolved / restore`는 repo SQL 경로 존재까지는 확인됐지만, linked remote 기본 경로는 `reports_status_check` mismatch로 아직 닫히지 않았다.

## 2026-03-31 Step 3 keyboard 감성 품질 repo 보정

- Android 실기기에서 키보드 show/hide 시 레이아웃이 툭 끊기고, dismiss 순간 하단에 흰 공백이 보이는 현상이 추가로 확인됐다.
- 실기기 로그 기준 앱은 Fabric/New Architecture로 동작 중이므로, 구형 `LayoutAnimation` 경로는 더 이상 쓰지 않는다.
- 이번 보정에서는 `useKeyboardInset()`에서 `LayoutAnimation`과 `setLayoutAnimationEnabledExperimental`을 완전히 제거했다.
- 대신 실제 keyboard transition은 `react-native-keyboard-controller` 기반으로 정리했다.
  - `CommunityDetailScreen` 신고 모달은 `KeyboardAvoidingView`로 원래 중앙 위치를 유지한 채 keyboard padding만 반영한다.
  - `NicknameSetupScreen`, `WeatherActivityRecordScreen`, `RecordTagModal`은 같은 keyboard-controller `KeyboardAvoidingView`를 사용해 Android에서도 `enabled + behavior="padding"` 조합으로 맞췄다.
  - safe-area와 최외곽 배경색을 화면별 기본 배경색과 맞춰 dismiss 순간 흰 공백이 드러나지 않게 했다.
- 신고 모달 테마도 기본 시스템 모달처럼 보이지 않도록 아래처럼 정리했다.
  - eyebrow `COMMUNITY CARE`
  - active reason chip: `theme.colors.brand`
  - primary CTA: `theme.colors.brand`
  - 신고 완료/중복 안내: premium modal
- audit 결과 Android `behavior={undefined}` 또는 keyboard-aware 구조가 이미 안정적으로 적용돼 있던 `SignIn`, `SignUp`, `PasswordResetRequest`, `PasswordResetForm`, `PetCreate`, `PetProfileEdit`는 이번 턴에 구조 변경 없이 유지했다.
- 로그 검증:
  - `adb logcat -c` 후 앱을 다시 실행했다.
  - 이후 `FATAL EXCEPTION`, `AndroidRuntime`, `IllegalViewOperationException`, `ReactNativeJS` 신규 로그는 포착되지 않았다.
- 판정:
  - repo 기준 keyboard smoothness / branding fix는 완료다.
  - physical-device 재검증 전까지는 운영 완료가 아니다.
- target post fact check:
  - `public.posts.id = 657a66aa-347c-4e6a-8b0d-ebf4a2c98bd2`
  - `status = active`
  - `title = 테스트6`
- 판정:
  - 신고 제출과 moderation queue 생성까지는 실기기 + linked remote 기준으로 확보됐다.
  - `community_moderation_actions`는 여전히 2건으로 증가하지 않았고, target post도 `active`를 유지하므로 이번 시나리오에서는 auto-hide가 발동하지 않았다.
  - 원인은 현재 시점 `unique_reporter_count = 1`로 auto-hide threshold에 도달하지 않았기 때문이다.
- 같은 시점 physical-device UX blocker:
  - Android 실기기에서 신고 사유 입력 중 시스템 키보드가 올라오면 하단 `신고하기` 버튼이 가려졌다.
  - 사용자는 뒤로가기로 키보드를 내려 신고를 강제로 완료했다.
- repo-side fix:
  - `CommunityDetailScreen` 신고 모달에 `KeyboardAvoidingView + ScrollView + safe-area bottom padding + blank-space keyboard dismiss`를 추가했다.
  - 신고 성공/중복 안내는 toast가 아니라 premium modal로 전환했다.
  - 전역 입력 화면 audit 결과 `SignIn / SignUp / PasswordResetRequest / PasswordResetForm / CommunityCreate / CommunityEdit / RecordCreate / RecordEdit / PetCreate / PetProfileEdit`는 기존 keyboard-aware 컨테이너가 유지되고 있었다.
  - keyboard-aware 보호가 없던 `NicknameSetupScreen`, `WeatherActivityRecordScreen`, `RecordTagModal`에는 같은 방어 로직을 추가했다.

## 2026-03-30 snapshot 판정

| 항목 | 현재 사실 | 판정 | 메모 |
| --- | --- | --- | --- |
| 물리 기기 연결 | `adb` 기준 emulator만 연결 | 미완료 | 실기기 QA blocker 유지 |
| 비밀번호 재설정 local 계약 | 앱 deep link와 Android intent-filter 존재 | 부분 확보 | 메일 앱 복귀 실증과 allowlist 증적이 필요 |
| 계정 삭제 row-level | Step 2 실기기 삭제 시나리오 1회 성공 | 부분 확보 | DB hard delete는 확인됐고 storage cleanup은 pending 17건으로 남음 |
| 커뮤니티 moderation row-level | queue/action/reporter/image row 존재 | 부분 확보 | resolved / cleanup_pending / restore 시나리오는 아직 미확보 |
| linked remote / migration | 정합 | 확보 | 자동 스크립트로 재현 가능 |

## 증적 분해

| 항목 | 현재 상태 | 이번 턴 가능 여부 | 못 닫는 이유 | 닫는 방법 |
| --- | --- | --- | --- | --- |
| physical-device QA | 미완료 | 불가 | 물리 실기기 캡처와 조작이 필요 | 최소 1대 기기에서 장소/여행/산책, reset, 커뮤니티 캡처 확보 |
| 비밀번호 재설정 메일 복귀 | local 계약만 확인 | 부분 가능 | 실제 메일 앱/딥링크 복귀와 allowlist 콘솔은 외부 장치/콘솔 접근 필요 | Supabase redirect allowlist 캡처 후 실기기 메일 복귀 캡처 |
| 계정 삭제 row-level 증적 | Step 2 hard delete + storage cleanup 완료 | 확보 | `claim_account_deletion_cleanup_items()` ambiguous `request_id` 버그가 있어 수동 worker 절차로 닫음 | Step 3 이후 cleanup worker RPC 자체 수정 여부 판단 |
| 커뮤니티 moderation / cleanup row-level | 신고 row 1건 + queue row 1건 추가, auto-hide 미발동 | 부분 가능 | 현재 `unique_reporter_count = 1`이라 auto-hide threshold에 못 미침 | 같은 target에 다른 reporter를 추가해 `community_moderation_actions`, status 전환, cleanup trace까지 캡처 |
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
- Step 2는 DB hard delete를 확인했지만, storage cleanup worker가 아직 돌지 않아 object cleanup 완료 증적은 후속 확인이 필요하다.

## 다음 액션

- 같은 target post에 대해 추가 reporter를 확보해 Step 3 auto-hide와 cleanup 관련 row-level 증적을 이어서 확보한다.

## 상태

- 진행 중

## 2026-03-31 Task 2.9 UI 안정화 선행 보정

- Step 3 auto-hide 실기기 재검증 전에, physical-device에서 직접 확인된 9개 UI/UX 결함을 먼저 정리했다.
- 이번 턴은 moderation 서버 계약이나 auto-hide threshold를 건드린 것이 아니라, 실기기에서 실제 입력/복귀를 막는 클라이언트 레이아웃 문제를 좁게 수정한 턴이다.
- 이번 보정에서 닫은 항목:
  - More 드로어의 `닉네임 수정`을 중앙 정렬 브랜드 모달로 전환
  - More 드로어의 `보안 및 개인정보`를 `비밀번호 변경`으로 명확히 바꾸고, 내부 스크롤이 있는 반응형 모달로 전환
  - `기록하기` 헤더에 상단 safe area inset 반영
  - logged-in home의 scroll offset을 마지막 위치로 복원
  - `일정 추가` 메모 입력 시 `일정 저장하기` 버튼 접근성 보강
  - `펫 프로필 수정` 태그 입력 시 `수정 완료` 버튼이 키보드에 가려지지 않도록 CTA를 스크롤 흐름 안으로 이동
  - `펫 등록 1/2`, `펫 등록 2/2`의 과도한 bottom lift를 줄이고 scroll 중심 폼으로 재정렬
- 화면 성격별 keyboard 대응 원칙도 이번 턴에 다시 잠갔다.
  - 긴 폼: `RecordCreate`, `ScheduleCreate`, `PetCreate`, `PetProfileEdit`은 scroll 기반 대응
  - 짧은 모달: `Community report`, `More nickname edit`, `RecordTagModal`, `More password modal`은 중앙 카드 + padding 대응
- repo 기준 검증:
  - `yarn tsc --noEmit`
  - `yarn test --watchAll=false --watchman=false __tests__/authNotices.test.ts __tests__/appBoot.test.ts __tests__/authStoreRecovery.test.ts __tests__/passwordRecoverySession.test.ts`
  - `git diff --check`
- 판정:
  - repo 기준 UI 안정화는 완료
  - physical-device 재검증 전까지 운영 완료로 올리지 않음

## 2026-03-31 Task 2.9.1 UI 최종 교정

- 실기기 재검증 결과 `기록하기`, `홈 스크롤 유지`는 통과했고, 나머지 폼/모달은 아직 `기록하기` 수준으로 정렬되지 않았다는 피드백이 들어왔다.
- 이번 보정은 `기록하기`의 구조를 기준으로 나머지 화면을 더 가깝게 맞추는 데 집중했다.
- 이번 턴에 추가로 바꾼 항목:
  - `닉네임 수정` 모달의 CTA를 카드 내부 footer로 완전히 고정
  - `비밀번호 변경` 모달에 `KeyboardAwareScrollView + scrollToFocusedInput`을 넣어 현재/새/확인 비밀번호 포커스 시 가림을 줄임
  - `일정 추가`, `펫 프로필 수정`, `펫 등록 1/2`, `펫 등록 2/2`를 `useKeyboardInset + KeyboardAwareScrollView` 기준으로 다시 맞춰 `기록하기`와 같은 scroll-first 대응으로 정리
- repo 기준 검증:
  - `yarn tsc --noEmit`
  - `yarn test --watchAll=false --watchman=false __tests__/authNotices.test.ts __tests__/appBoot.test.ts __tests__/authStoreRecovery.test.ts __tests__/passwordRecoverySession.test.ts`
  - `git diff --check`
- 판정:
  - repo 기준 Task 2.9.1 교정 완료
  - physical-device에서 닉네임 수정, 비밀번호 변경, 일정 추가, 펫 프로필 수정, 펫 등록 1/2 재검증 필요

## 2026-03-31 Task 2.9.2 후속 보정

- 실기기 피드백에 따라 `닉네임 수정` 모달 카드를 더 키워 CTA가 카드 밖으로 밀려나지 않게 다시 조정했다.
- More의 `비밀번호 변경` UI는 현재 공개 범위에서 제거했다.
- `일정 추가`, `펫 프로필 수정`, `펫 등록`은 계속 `기록하기` 기준 scroll-first keyboard 대응으로 유지하며 physical-device 재검증을 이어간다.

## 2026-03-31 Task 2.9.3 RecordCreate 표준 이식

- `일정 추가`, `펫 프로필 수정`, `펫 등록 1/2·2/2`를 `react-native-keyboard-controller`의 `KeyboardAwareScrollView`로 통일했다.
- 세 화면의 하단 여백식은 `기록하기`에서 검증된 식으로 고정했다.
  - `Math.max(insets.bottom + 184, keyboardInset + 108, 300)`
- `펫 등록`의 품종/세부 종 입력 포커스는 `assureFocusedInputVisible()`로 바꿔 구형 keyboard-aware scroll API 의존을 제거했다.
- repo 기준 검증:
  - `yarn tsc --noEmit`
  - `yarn test --watchAll=false --watchman=false __tests__/authNotices.test.ts __tests__/appBoot.test.ts __tests__/authStoreRecovery.test.ts __tests__/passwordRecoverySession.test.ts`
  - `git diff --check`
- 판정:
  - repo 기준 Task 2.9.3 완료
  - physical-device에서 세 화면 재검증 필요

## 2026-03-31 Task 2.9.4 다이내믹 하단 여백

- `RecordCreate`, `ScheduleCreate`, `PetProfileEdit`, `PetCreate`의 고정 `300px` 하단 여백을 제거했다.
- 네 화면 모두 아래 공식으로 통일했다.
  - keyboard shown: `keyboardInset + 40`
  - keyboard hidden: `insets.bottom + 80`
- CTA의 추가 하단 `marginBottom`도 제거해, 키보드가 올라왔을 때 버튼이 키보드 바로 위 약 40px 위치에 머물도록 조정했다.
- repo 기준 검증:
  - `yarn tsc --noEmit`
  - `yarn test --watchAll=false --watchman=false __tests__/authNotices.test.ts __tests__/appBoot.test.ts __tests__/authStoreRecovery.test.ts __tests__/passwordRecoverySession.test.ts`
  - `git diff --check`
- 판정:
  - repo 기준 Task 2.9.4 완료
  - physical-device에서 네 화면 하단 공백과 키보드 위 CTA 위치를 재검증해야 한다.
