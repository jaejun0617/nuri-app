# Final Release Gate

## 이미 닫힌 항목

- [x] 정책 문서 public 연결
  - 회원가입의 `이용약관`, `개인정보처리방침`, More의 `계정 삭제 안내`가 실제 public 문서를 열고 Android 실기기에서 앱 복귀까지 확인됐다.
- [x] 비밀번호 재설정 복귀
  - recovery 링크 복귀, 비밀번호 변경, `SignIn` 복귀가 Android 실기기에서 검증됐다.
- [x] 계정 탈퇴 7일 유예 기본 동선
  - 요청, 유예, 복구 가드, 보수적 안내 UX가 앱에 반영됐다.
- [x] 계정 탈퇴 자동 파기 worker
  - remote worker 배포, due request claim, finalizer, storage cleanup, `completed` 수렴까지 E2E로 검증됐다.
- [x] 커뮤니티 신고 정책과 auto-hide
  - blocked-term, stable error contract, auto-hide, reporter flag trace, moderation queue/action log, hidden 이미지 비노출이 remote 기준으로 검증됐다.
- [x] 커뮤니티 인앱 정책 notice
  - notice, helper box, 정책 팝업, 앱 복귀까지 실기기 확인이 끝났다.
- [x] 닉네임 정책과 Android 기본 레이아웃
  - 닉네임 `2..10`, Community header, Timeline 탭 유지, bottom gap 보정이 실기기 기준으로 닫혔다.
- [x] 외부 지도 전환 기본 동선
  - 장소/여행 상세의 외부 지도 열기 동선은 PO 확인 기준 완료로 분류한다.

## 출시 전 반드시 남은 항목

### 1. 장소/여행/산책 물리 실기기 최종 캡처

- [ ] 산책, 장소, 여행 리스트/상세를 실제 기기에서 다시 확인한다.
- [ ] 공개 라벨과 `내 상태`가 섞여 보이지 않는지 확인한다.
- [ ] stale/conflict 문구가 과한 확신처럼 읽히지 않는지 확인한다.
- [ ] 지도 미리보기와 외부 지도 버튼 역할이 충돌하지 않는지 확인한다.
- [ ] 긴 설명 `더보기/접기`와 스크롤 체감을 캡처한다.

### 2. 운영 증적 패키지 마감

- [ ] 계정 탈퇴 worker의 실제 cron 자동 tick 1회 증적을 남긴다.
- [ ] 계정 탈퇴 최종 상태 캡처를 release 보관본으로 정리한다.
- [ ] `community_moderation_queue`, `community_moderation_actions`, `community_image_assets` row-level 캡처를 남긴다.
- [ ] `qa-task4-*` 테스트 데이터 정리 또는 격리 근거를 남긴다.

### 3. 모니터링/배포 필수 설정

- [x] Sentry는 v1.0 Android 단독 출시에서 보류하고 앱 전송 경로를 비활성화한다.
- [x] Android `google-services.json` 배치 상태를 확인한다.
- [x] iOS `GoogleService-Info.plist`는 v1.1 iOS 출시 항목으로 이관한다.
- [x] Firebase Crashlytics는 Android release crash 수집용으로 유지한다.
- [x] Android release signing config를 upload key 기준으로 전환한다.

### 4. 스토어 제출 자산

- [x] 앱 아이콘 최종본을 확정한다.
- [x] 스플래시 화면 최종본을 확정한다.
- [ ] 앱스토어/플레이스토어 스크린샷을 준비한다.
- [ ] 스토어 설명문, 문의처, 정책 URL을 최종 점검한다.

### 5. 출시 후보 빌드 smoke

- [ ] 가입, 로그인, 로그아웃을 출시 후보 빌드에서 다시 확인한다.
- [ ] 비밀번호 재설정, 탈퇴, 커뮤니티 기본 동선을 출시 후보 빌드에서 다시 확인한다.
- [ ] 홈, 타임라인, 기록, 장소/여행/산책 진입이 한 번씩 정상 동작하는지 확인한다.

## v1.1 백로그

- [ ] 장소/여행 `confirmed` 개방 검토
- [ ] 장소/여행 admin review write path
- [ ] 커뮤니티 preview batch 최적화
- [ ] broad/specific 여행 검색 추가 보정
- [ ] 운영자용 moderation/admin UI
- [ ] auth/account baseline-history 정리
- [ ] 외부 API 키 통제, 환경 분리, 운영 도구 정리
