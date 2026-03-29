# Release QA Checklist

## Release Gate

- [ ] 아래 계정 삭제 / 커뮤니티 abuse QA 증적이 모두 확보되지 않으면 배포 완료로 간주하지 않는다.
- [ ] 아래 장소/여행/산책 공개 신뢰도 QA 증적이 확보되지 않으면 배포 완료로 간주하지 않는다.
- [ ] Android 또는 iOS 중 최소 1대의 물리 실기기에서 장소/여행/산책 공개 신뢰도 QA 증적이 확보되지 않으면 emulator 확인만으로 배포 완료로 간주하지 않는다.
- [ ] 자동 검증과 수동 검증 항목이 각각 실행되고, 증적 캡처가 남아야 한다.
- [ ] Task 4 실증에서 확인된 `댓글 auto-hide 제약 오류`, `reporter flag 미기록`, `community image upload 실패`가 staging/prod에서 다시 재현되면 배포를 중단한다.

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

## 커뮤니티 운영 방어선

- [ ] 아래 커뮤니티 항목은 `repo 기준 확인 가능 항목`과 `staging/prod 적용 확인 항목`을 분리해 증적을 남긴다.
- [ ] 게시글/댓글 작성
  - [x] `[자동]` linked project remote에 `community_blocked_terms`, `community_blocked_term_patterns`, `assert_community_content_policy()`, `trg_guard_community_post_update`, `trg_guard_community_comment_update`가 실제 배포돼 있다.
  - [x] `[자동]` `community_blocked_terms`와 `community_blocked_term_patterns`에 초기 운영 seed가 실제 존재한다. 현재 기준 `term 4건 + pattern 1건`이며, false positive 우선 원칙 때문에 보수적으로 유지한다.
  - [x] `[자동]` post create/update, comment create/update가 같은 콘텐츠 정책 contract와 stable error code(`community_content_policy_violation` 등)를 반환한다.
  - [ ] `[자동+수동]` 게시글 작성은 5분 3회, 1시간 10회 제한을 초과하면 서버 기준으로 차단된다.
  - [ ] `[자동+수동]` 같은 제목+본문 게시글은 30초 안에 중복 등록되지 않는다.
  - [ ] `[자동+수동]` 댓글 작성은 1분 5회, 10분 20회 제한을 초과하면 서버 기준으로 차단된다.
  - [ ] `[자동+수동]` 같은 게시글에는 같은 댓글이 30초 안에 중복 등록되지 않는다.
  - [x] `[수동]` Android emulator 기준 post create, post edit, comment create 차단 시 raw 서버 문구 대신 보수적인 한국어 UX 문구가 노출된다.
  - [x] `[수동]` Android emulator 기준 게시글 작성/수정, 댓글 작성 차단 후 입력값이 지워지지 않고 같은 화면에서 바로 수정 재시도가 가능하다.
  - [x] `[자동]` comment update 서버 guard는 실제 차단됐다. 앱 comment edit UI는 아직 없으므로 수동 UI 검증 항목은 별도로 만들지 않는다.
- [ ] 신고 / moderation
  - [ ] `[자동+수동]` 신고는 10분 5회, 1일 20회 제한을 초과하면 서버 기준으로 차단된다.
  - [ ] `[자동+수동]` 같은 대상 중복 신고는 기존 unique 계약대로 1회만 허용된다.
  - [ ] `[자동+수동]` 본인 글/댓글 신고는 차단된다.
  - [ ] `[자동+수동]` `reports.status`는 `open / triaged / reviewing / resolved_actioned / resolved_no_action / rejected_abuse` 계약을 지원한다.
  - [ ] `[자동+수동]` `community_moderation_queue`에 `report_count / unique_reporter_count / latest_reported_at / queue_status / priority / decision / resolved_at`가 남는다.
  - [ ] `[자동+수동]` 게시글은 unique reporter 3명, 댓글은 unique reporter 2명 이상일 때 `auto_hidden`으로 전환되고 queue가 함께 갱신된다.
  - [ ] `[자동+수동]` 댓글 auto-hide 검증에서 `comments_status_check` 제약 오류가 없어야 한다. `new row ... violates check constraint "comments_status_check"`가 재현되면 release blocker로 본다.
  - [ ] `[자동+수동]` 신고 직후 detail 재조회와 list 재진입 시 auto-hidden 대상이 기존 active 캐시에 남아 있지 않다.
  - [ ] `[자동+수동]` `community_moderation_actions`에 before/after status, actor, reason, source_report 연결 근거가 남는다.
  - [ ] `[자동+수동]` 신고 rate limit 차단 시 `community_reporter_flags.rate_limit_hit_count` 또는 동등한 운영 trace가 실제로 남아야 한다. 오류 문구만 있고 flag row가 없으면 미완료다.
  - [ ] `[자동+수동]` `rejected_abuse` 처리 시 `community_reporter_flags`에 반복 악성 신고 추적 근거가 남는다.
- [ ] 이미지 / cleanup
  - [ ] `[자동+수동]` 먼저 community image upload 자체가 성공해 실제 bucket object가 생성되는지 확인한다. `StorageApiError(database error, code: P0001)` 상태면 이후 hidden/cleanup 검증으로 넘어가지 않는다.
  - [ ] `[수동]` create/edit 이미지 upload warning 또는 image-pick 오류는 raw 원문이 아니라 branded message로 노출되는지 확인한다.
  - [ ] `[자동+수동]` `community-images` 업로드는 10분 10장, 게시글당 최대 3장 제한을 초과하면 서버 기준으로 차단된다.
  - [ ] `[자동+수동]` hidden / auto_hidden / deleted / banned 게시글은 이미지를 다시 signed URL로 노출하지 않는다.
  - [ ] `[자동+수동]` hidden 이미지 비노출은 `object not found`만으로 통과 처리하지 않는다. 업로드 성공과 attach row가 먼저 확인돼야 한다.
  - [ ] `[자동+수동]` `community_image_assets`에 uploaded / attached / cleanup_pending / cleaned_up 상태와 orphan path 근거가 남는다.
  - [ ] `[자동+수동]` `community_image_assets`가 0건이면 storage sync trigger/backfill 여부를 먼저 확인하고, cleanup_pending 검증은 미완료로 유지한다.
  - [ ] `[자동+수동]` 다중 이미지 업로드가 일부만 성공하고 중간에 실패해도 이미 성공한 path가 orphan로 방치되지 않고 cleanup queue 또는 후속 delete 증적으로 회수된다.
  - [ ] `[자동+수동]` 게시글 이미지 제거/숨김/삭제 후 즉시 hard delete 대신 cleanup pending 계약이 남는다.
  - [ ] `[자동+수동]` 복구 시 아직 삭제되지 않은 이미지 경로는 다시 attached 상태로 되돌릴 수 있다.

## 장소/여행/산책 공개 신뢰도

- [ ] 아래 항목은 최소 `walk candidate`, `pet-friendly-place trust_reviewed/needs_verification`, `pet-travel trust_reviewed/needs_verification/candidate` 예시를 캡처로 남긴다.
- [ ] 산책 리스트 / 상세
  - [ ] `[수동]` 산책 리스트 카드에서 공개 라벨이 `후보`로만 보이고 개인 상태와 혼동되지 않는다.
  - [ ] `[수동]` 산책 상세 상단의 `현재 위치 기반 후보` 설명이 검수/확정 정보처럼 읽히지 않는다.
  - [ ] `[수동]` 거리/편의 정보와 공개 신뢰 라벨이 같은 축으로 오해되지 않는다.
  - [ ] `[수동]` 산책 상세 지도 미리보기가 실제 기기에서 한 손가락 이동과 두 손가락 확대/축소로 동작하고, 스크롤과 충돌하지 않는다.
- [ ] 펫동반 장소 리스트 / 상세
  - [ ] `[수동]` 리스트 카드에서 `후보 / 확인 필요 / 검수 반영`이 첫눈에 구분되고 `내 상태`와 시각적으로 분리된다.
  - [ ] `[수동]` 상세에서 기준일, 재확인 권장, stale/conflict 경고가 과한 확신이나 `confirmed`처럼 읽히지 않는다.
  - [ ] `[수동]` canonical id가 없는 후보는 저장/제보 버튼 대신 보수적 안내만 노출되고, 사용자에게 과도하게 어색하지 않다.
  - [ ] `[수동]` 검색어 없음 또는 약한 검색어에서 trust 근거가 약한 후보가 상단을 다시 과다 점유하지 않는다.
  - [ ] `[수동]` 상세 지도 미리보기가 실제 기기에서 한 손가락 이동과 두 손가락 확대/축소로 동작하고, 외부 지도 버튼과 역할이 섞이지 않는다.
  - [ ] `[수동]` 긴 설명 문단은 기본 3줄 + `더보기/접기`로 보이고, 공개 라벨과 `내 상태`보다 더 강하게 읽히지 않는다.
- [ ] 반려동물과 여행 리스트 / 상세
  - [ ] `[수동]` 리스트 카드에서 공개 라벨과 `내 상태`가 섞여 보이지 않는다.
  - [ ] `[수동]` `trust_reviewed / needs_verification / candidate` 차이가 배지 색/문구/설명으로 구분된다.
  - [ ] `[수동]` 상세에서 기준일, 공개 신뢰도 안내, stale/conflict 문구가 `확정`처럼 읽히지 않는다.
  - [ ] `[수동]` 지역명 단독 검색에서 애매한 후보가 다시 상단에 과다 노출되지 않는다.
  - [ ] `[수동]` 상세 지도 미리보기가 실제 기기에서 한 손가락 이동과 두 손가락 확대/축소로 동작하고, 스크롤과 충돌하지 않는다.
  - [ ] `[수동]` 긴 설명 문단은 기본 3줄 + `더보기/접기`로 보이고, 개인 상태와 공개 신뢰 섹션보다 더 먼저 시선을 빼앗지 않는다.
- [ ] stale / conflict 예시 캡처
  - [ ] `[수동]` stale trust 예시 1건 이상을 리스트와 상세에서 각각 캡처한다.
  - [ ] `[수동]` source conflict 예시 1건 이상을 상세에서 캡처한다.
  - [ ] `[수동]` 개인 상태(`저장함 / 최근 검색 / 내가 제보함`)가 public trust를 올리지 않는 예시를 캡처한다.

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
- [ ] Task 4 staging/prod 적용 증적
  - [ ] `posts/comments/reports/storage.objects` trigger가 staging/prod에도 동일하게 배포됐는지 확인한다.
  - [ ] `community_moderation_queue`, `community_moderation_actions`, `community_reporter_flags`, `community_image_assets` 실DB row 생성 증적을 남긴다.
  - [ ] auto-hide / restore / cleanup pending 시나리오를 staging/prod 또는 동등 환경에서 재연한 캡처를 남긴다.
- [ ] Release 직전 운영 캡처 순서
  - [ ] 1단계. `community_moderation_queue`에서 auto-hide 대상의 `report_count / unique_reporter_count / queue_status / priority`를 캡처한다.
  - [ ] 2단계. `community_moderation_actions`에서 before/after status, actor, reason, source_report 연결 캡처를 남긴다.
  - [ ] 3단계. `community_image_assets`에서 `attached -> cleanup_pending` 전환 또는 `hidden 이미지 비노출` 근거를 캡처한다.
  - [ ] 4단계. `qa-task4-*` 계정/게시글/신고/이미지 object 정리 여부를 체크하고 release 전 삭제 또는 격리 근거를 남긴다.
  - [ ] 5단계. 장소/여행 stale/conflict 예시 화면과 공개 라벨/개인 상태 분리 화면을 캡처한다.
  - [ ] 6단계. 장소/여행 상세의 `더보기/접기` 정상 노출 화면과 지도 터치 이동/확대/축소 화면을 최소 1대 물리 실기기에서 캡처하고, 기기명 또는 OS 버전을 함께 기록한다.
  - [ ] 7단계. release 담당자가 위 캡처와 자동 검증 결과를 한 묶음으로 보관했는지 확인한다.
- [ ] 계정 삭제 증적 캡처
  - [ ] 요청 전 데이터 존재 캡처
  - [ ] 요청 직후 auth/users 및 요청 상태 캡처
  - [ ] cleanup pending 또는 orphan 0건 캡처
  - [ ] cleanup 완료 후 최종 상태 캡처
- [ ] Crashlytics 연동 여부 확인
