# Release QA Checklist

## Release Gate

- [ ] 아래 계정 삭제 QA 증적이 모두 확보되지 않으면 배포 완료로 간주하지 않는다.
- [ ] 자동 검증과 수동 검증 항목이 각각 실행되고, 증적 캡처가 남아야 한다.

## 자동화 실행

- [ ] `yarn test:qa`
- [ ] `yarn test --watchAll=false --watchman=false`
- [ ] `yarn test:e2e:smoke`
- [ ] `yarn test:e2e:account`

## 가입/인증

- [ ] 회원가입
  - [ ] 필수 약관/개인정보 동의 없이는 가입 버튼이 비활성화된다.
  - [ ] 선택 마케팅 동의 여부가 `user_consent_history`에 함께 저장된다.
- [ ] 로그인
  - [ ] 정상 로그인 후 닉네임/펫 상태가 복원된다.
  - [ ] 네트워크 오류 시 토스트와 Alert 문구가 함께 노출된다.
- [ ] 로그아웃
  - [ ] 로컬 상태가 즉시 게스트 상태로 전환된다.
  - [ ] 재실행 후 세션이 다시 살아나지 않는다.
- [ ] 비밀번호 재설정
  - [ ] `[수동]` SignIn의 `비밀번호 찾기`가 `PasswordResetRequest` 화면으로 진입한다.
  - [ ] `[수동]` reset 요청 문구가 가입 여부를 노출하지 않는다.
  - [ ] `[수동]` 재발송 버튼은 60초 쿨다운 동안 비활성화된다.
  - [ ] `[수동]` Supabase recovery 메일의 redirect URL이 `nuri://auth/reset`로 앱 복귀한다.
  - [ ] `[수동]` 만료/오류 링크는 SignIn이 아니라 reset 요청 화면으로 복귀한다.
  - [ ] `[수동]` 새 비밀번호는 영문/숫자/특수문자 포함 8자 이상 규칙을 강제한다.
  - [ ] `[수동]` 비밀번호 변경 성공 후 SignIn으로 reset 이동하고 `새 비밀번호로 다시 로그인` 안내가 노출된다.
  - [ ] `[수동]` reset 완료 후 앱 재실행 시 recovery 세션이 다시 살아나지 않는다.
- [ ] 회원탈퇴
  - [ ] `[수동]` 삭제 요청 전 계정에 `profiles`, `pets`, `memories`, `pet_schedules`와 이미지/storage path가 실제로 존재하는지 확인한다.
  - [ ] `[수동]` More / Drawer 양쪽에서 동일하게 접근된다.
  - [ ] `[수동]` 삭제 요청 성공 후 `AppTabs` 게스트 상태로 리셋된다.
  - [ ] `[수동]` timeout/네트워크 중단 시 성공으로 오해되지 않는 보수적 메시지가 유지되는지 확인한다.
  - [ ] `[자동+수동]` `auth.users` 삭제가 확인된다.
  - [ ] `[자동+수동]` `profiles`, `pets`, `memories`, `pet_schedules`, `letters`, `emotions`, `daily_recall`, `ai_messages`, `anniversaries` 삭제가 확인된다.
  - [ ] `[자동+수동]` 커뮤니티 개인 콘텐츠(`posts`, `comments`, `likes`, `comment_likes`) 삭제가 확인된다.
  - [ ] `[자동+수동]` 개인화 데이터(`pet_place_bookmarks` 등 실제 적용된 user-layer 테이블) 삭제가 확인된다.
  - [ ] `[자동+수동]` `user_consent_history`는 삭제되지 않고 `user_id = null`, `anonymized_at not null` 기준의 비식별 보관으로 남는지 확인한다.
  - [ ] `[자동+수동]` `reports`, `pet_place_user_reports`, `pet_travel_user_reports`는 user 식별자가 제거된 상태로 남는지 확인한다.
  - [ ] `[자동+수동]` `pet_care_guide_events`, `audit_logs`, `pet_place_search_logs`, `pet_place_verification_logs`는 익명화 계약대로 user 식별자가 제거됐는지 확인한다.
  - [ ] `[자동+수동]` `account_deletion_requests`에 요청/최종 상태가 남는지 확인한다.
  - [ ] `[자동+수동]` `account_deletion_cleanup_items`에 bucket/path 단위 cleanup 대상이 기록되는지 확인한다.
  - [ ] `[자동+수동]` cleanup pending이 있으면 최종 상태가 `completed_with_cleanup_pending` 또는 `cleanup_pending`으로 남고, 단순 `completed`로 둔갑하지 않는지 확인한다.
  - [ ] `[자동+수동]` cleanup 완료 후 `account_deletion_requests.status = completed`, `cleanup_completed_at not null`로 전환되는지 확인한다.
  - [ ] `[자동+수동]` `pet-profiles`, `memory-images`, `community-images` 버킷에 orphan 0건 또는 pending queue 근거가 남는지 확인한다.
  - [ ] `[수동]` timeout/네트워크 중단 시 `unknown_pending_confirmation` 상태 확인 경로가 있는지 검증한다.
  - [ ] `[자동+수동]` 중복 요청 시 새 삭제 실행이 중복 생성되지 않고 기존 요청 상태를 재사용하는지 확인한다.
  - [ ] `[자동+수동]` 삭제 후 동일 계정 재로그인이 불가능한지 확인한다.

## 기록

- [ ] 기록 생성
  - [ ] 제목/날짜/태그/감정/이미지 입력이 정상 저장된다.
  - [ ] 저장 실패 시 draft가 유지된다.
  - [ ] 성공 시 draft가 정리된다.
- [ ] 기록 수정
  - [ ] 제목/본문/태그/감정/이미지 교체가 반영된다.
- [ ] 기록 삭제
  - [ ] 타임라인과 상세에서 삭제 후 목록 정합이 맞다.
- [ ] 업로드 복구
  - [ ] 이미지 업로드 일부 실패 시 큐에 저장된다.
  - [ ] 앱 포그라운드 복귀 후 자동 재시도된다.

## 타임라인/홈

- [ ] 타임라인
  - [ ] 월 필터/카테고리/검색이 함께 동작한다.
  - [ ] 최근 12주 히트맵이 렌더링된다.
- [ ] 홈
  - [ ] 이번 주 요약 카드가 실제 기록 수와 맞는다.
  - [ ] 일정/최근 활동/이번 달 일기와 충돌 없이 렌더링된다.
  - [ ] Android 홈 위젯에 오늘 일정/최근 기록이 반영된다.
- [ ] 펫 테마
  - [ ] 프로필 사진 변경 시 추천 테마 컬러가 같이 바뀐다.
  - [ ] 홈 강조색이 선택된 펫의 테마로 바뀐다.

## 운영/모니터링

- [ ] Sentry 이벤트 수집 확인
- [ ] Android `android/app/google-services.json` 배치 확인
- [ ] iOS `ios/nuri/GoogleService-Info.plist` 배치 확인
- [ ] 계정 삭제 RPC / 상태 추적 테이블 / cleanup queue 실DB 확인
- [ ] cleanup worker 또는 수동 재처리 절차가 staging/prod에서 같은 계약으로 동작하는지 확인
- [ ] 계정 삭제 증적 캡처
  - [ ] 요청 전 데이터 존재 캡처
  - [ ] 요청 직후 auth/users 및 요청 상태 캡처
  - [ ] cleanup pending 또는 orphan 0건 캡처
  - [ ] cleanup 완료 후 최종 상태 캡처
- [ ] Crashlytics 연동 여부 확인
