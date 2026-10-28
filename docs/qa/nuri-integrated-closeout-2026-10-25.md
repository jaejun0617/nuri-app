# NURI 통합 마감 수락 원장

상태: IN_PROGRESS. 전체 동결 아님. Master 단독 수행.

PO 중간 요약: [2026-10-25 20:15 KST 중간보고서](../reports/nuri-integrated-closeout-interim-2026-10-25.md). 아래 초기 단계의 이전 후보·검사 수치는 이력이며 최신 기준점은 바로 다음 3fabc74 절이다.

## 3fabc74 설치·CI 및 저장공간 복구 후 재개점

- 소스 `3fabc74973d295c419c77e9f3caaa6373b3cee0d`를 현재 브랜치에 정상 push했다. [원격 CI40186282381](https://github.com/jaejun0617/nuri-app/actions/runs/40186282381)는 source/secret·타입·lint·critical·전체·diff와 후속 단계 모두 PASS다. 최신 로컬 전체320 suites4,392/4,392·타입·대상 lint13파일0errors/0warnings다. 최초 raw icon provider guard1실패는 allowlist를 완화하지 않고 기존 adapter의 preserveOriginal 경로로 해결했다.
- APK `2dca8446739eed6fcc0807fd0ef08c08445048074b7bb8f6d2b72668567a3c9c`, 앱 입력 `1b8da5cded8fdacb981ee04ef731cec98a2dd59bccd12115a22b41b14f65daae`를 두 기기에 같은 서명·UID/최초 설치/데이터 보존으로 설치했다. `delivery-notification-controls-committed/installation.json`, Metro OFF, 내부 bundled Debug다. Store RC·release 성능 또는 전체 배치 동결이 아니다.
- 실제 물리 설정의 X·subtitle→받을 알림 간격34px/density2.8125≈12.09dp와 에뮬레이터32px/density2.625≈12.19dp를 확인했다. `settings-controls-physical-final.png`, `settings-controls-emulator-final.png`가 소유한다. 물리 기기의 PO 변경 수신 설정을 임의로 baseline으로 덮지 않았다.
- 에뮬레이터의 임시 OS 앱 알림 허용을 원래 거부 상태로 복원했다. 복귀 때 UI dump가 일시 실패해 actual permission과 Home을 재확인한 뒤 시트를 재진입했다. 앱 알림은 차단됨, 각 채널은 사용 가능, 정확 알림은 권한 필요이며 채널 행 clickable=false다. 원격 Google QA의 service/schedule/community ON은 그대로다. OS 권한 OFF를 계정 동의 OFF나 채널 OFF로 오인하지 않는다. 이는 설정 표시 검증이며 거부 상태 FCM 발송 matrix PASS가 아니다.
- 실제 업무 원본 부분 E2E: Google QA 일정 `f0c3aa86-211e-47e5-9269-7d271ebed6fb`를 앱 UI에서 생성·목록/상세 조회·시각 수정했다. 미래 native inexact registry1개를 확인했고 실제 시각 도래 후 서버 scheduler가 `schedule.reminder` 알림 `0953428d-9e93-4d73-a63d-5ab6e400ac5a`를 만들었다. FCM delivery0은 Native 단일 OS 경로 계약에 맞다. 빠른 팝업→알림 상세→정확한 일정 CTA와 read_at을 확인했다. 직접 row→target 계약은 아직 미완료다.
- 해당 일정만 앱에서 완료·삭제했고 원격 row0/native own alarm0을 확인했다. 다른 기록·일정·11개 미읽음은 보존했다. 로컬 알림 표시 자체는 관찰하지 못해 PASS로 쓰지 않는다. `schedule-business-source-partial.json`, `schedule-source-cleanup.json`이 근거이며 반복·응답 유실·실패 복구 전체 수락이 아니다.
- PO 저장공간 추가 요청으로 idle Gradle build-cache 및 이전 mint dependency build/.cxx9경로만 정리했다. 실제 Data 여유 약11→35GiB, 회수23.956GiB(25.7GB). 소스/dirty/dependency 원본/현재 APK 보존, current incremental·SDK·개인자료·QA 증거 삭제0이다. 외부 `nuri-storage-cleanup-20261025-Oqi03K/REPORT.md`를 참조한다. 저장공간 복구는 제품 수락 완료가 아니다.
- 다음1순위는 기존1~6/NAV의 직접 target·인증/계정 경계·설정/OS 상태·기록 실패 복구 미마감이다. 원래7~9는 아직 시작하지 않는다. 최신 증거를 이전 전체 수락으로 확대하지 않는다.

## 최신 피드백 및 실제 소비 증거

- 피드백 후보 `dc009e10c7f76e6230025e34912e304b8436e48bfe1a34af120dc0f244ee897e`, 앱 입력 `a28380341b8b69abf24a563128a511fa508b925b66b7e4f8b729b10bbabc04f4`를 동일 서명으로 두 기기에 설치했다. Metro OFF, UID·기존 데이터 보존이다. `delivery-notification-feedback/installation.json`이 설치 기준을 소유한다. 내부 bundled Debug이며 Store RC 또는 release 성능 검증이 아니다.
- `quick-feedback-physical.png`: 회보라 X와 CTA 문구/화살표 묶음 중앙을 확인했다. 버튼109..969px와 content393..685px의 중심은 모두539px이다. `settings-feedback-emulator-top.png`: X 보정과 subtitle 아래 간격을 확인했다. subtitle bottom738px/받을 알림 top770px, density2.625에서12.19dp다. 물리 기기의 전체 설정 검수로 확대하지 않는다.
- Google QA에서 운영 동의를 OFF/ON해 두 service 컨트롤의 동시 표시, community ON 보존과 원격 저장을 확인했다. 최종 category boolean은 기존 service/schedule/community ON으로 복구했다. 6.106678초/29 encoded VFR frames 녹화는 실제 동작 관찰이며60fps나 모든 compositor frame의 부드러움 증명이 아니다. 정확한 기록은 `toggle-feedback-frame-review.json`이다.
- 원격 `20261025095926_notification_preference_realtime`은 기존 owner RLS를 유지한 채 preferences 테이블을 기존 Realtime publication에 추가한다. 호스트 SQL45/45 PASS이며 실제 외부 변경의 live 전파 검증과는 구분한다. 같은 기기의 MutationCache 갱신을 두 기기 동기화 증거로 쓰지 않는다.
- Google QA의 OS 앱 권한을 거부 상태에서 허용으로 바꾼 후 실제 등록1개를 확인했다. 이 권한은 QA 임시 상태이며 최종 복원 여부를 별도 기록한다. exact alarm 권한은 변경하지 않았다.
- 전경 transport `66defd77-0a6b-468f-98b7-bb1a5af4038e`: FCM accepted, OS banner 없음, 최근3개에서 선택 후 상세/서버 read_at과 unread12→11을 확인했다. Realtime 갱신과 native 수신 callback을 독립 계측하지 않았으므로 native callback receipt PASS로 확대하지 않는다.
- 백그라운드 transport `288b2963-8a11-4d2c-a60c-f621ddbe4dd2`: 실제 launcher resumed 상태에서 FCM accepted→OS 알림 표시→해당 알림 탭→상세→서버 read_at→Home unread11 복귀를 확인했다. cron이 먼저 처리해 수동 worker는 claimed0이었다. `emulator-background-native-display.json`과 `emulator-background-consumed-ui.json`이 증거다.
- 위 두 항목은 QA 전용 transport/소비 증거다. 실제 업무 원본 이벤트 E2E, recent-removal/cold/force-stop/계정 전환/동일 계정 다중 기기 PASS가 아니다. 기존 다른11개 알림은 읽음·삭제하지 않았다.
- 추가 로컬 보정: 미리보기의 cached 데이터/오류를 빈 화면과 구분하고 query 실행 시 owner 경계를 확인한다. 채널 요약 행은 비상호작용 View이며 Native 일정 채널 조회에서 앱 전체 권한과 채널 차단을 분리한다. 이 보정은 위 설치본 이후 소스이므로 다음 후보 설치·권한 거부 상태 재검증 전에는 설치 완료로 쓰지 않는다. 최신 관련5 suites36/36 PASS다.

## 추가 승인: 알림 설정·Home 빠른 알림

- 기존1~6과 NAV-01을 대체하지 않는 같은 통합 배치다. PO 추가 원문 `5285248c-ea1e-4979-b6c8-f0529d68b7dc/붙여넣은 텍스트.txt`와4개 시안을 기준으로 설정 시트·Home 최근3개 팝업·배지를 구현한다. 원래7~9는 시작하지 않는다.
- 새 Home 팝업은 기존 Root native stack의 transparentModal이다. 팝업 인스턴스만 동일한 알림함/상세로 replace해 Home Back을 보존하며 More를 경유하지 않는다. RN Android Dialog의 iOS 전용 onDismiss에 기대거나 종료 시간을 추측하지 않는다. 실제 전환·Back·연속 탭 녹화는 새 후보에서 확인한다.
- 서버 최근3개 전용 조회와 기존 전체 unread query/cache를 공유한다. 이전 Home의30개 조회·로컬 숨김·독립 unread·항상 mount된 구 팝업 경로는 제거한다. 모두 읽음은 기존 서버 확정 범위 RPC이며 목록을 삭제하지 않는다.
- 토글은 손잡이 이동과 색상 교차 전환을 같은200ms native animation으로 처리한다. 즉시 임시 표시하고 저장 실패 시 확정 값으로 복귀한다. 중복 탭·변경 중 다른 요청·계정 경계·동작 줄이기를 처리한다. 기기에서 부드러움을 확인했다는 의미는 아니다.
- 기존 이미지와 같은 픽셀이 없는12개 자산은 최신 시안에서 직접 추출했다. 외부 `notification-art-review/published-manifest.json`이 원본 경로·추출 좌표·출력 SHA를 소유한다. 새로 생성하거나 이모지로 대체하지 않았다.
- 원격 `20261025091403_notification_granular_preferences`: 기존 private preferences 함수만 보정했다. 운영(service)은 다른 category의 master가 아니며 legacy master-OFF는 명시 변경 전 유효OFF를 보존한다. 행 잠금과 category patch로 응답 역전/다른 category 덮기를 막는다. QA rollback-only 원격 호출에서 serviceOFF/communityON 유지 확인. 일반 사용자 발송 gate·원본 데이터·RLS 변경 없음.
- 호스트 SQL39/39, JVM 실제 반복 정책47checks PASS. 서버 전후 advisor 종류·건수는 동일하다. 기존 `public.v_my_pets_with_days` definer view 지적은 이번 함수와 무관하며 별도 보안 마감 항목으로 보존한다. [조치 기준](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view).
- 일정 재ON은 기존 native 예약 엔진으로 현재 소유자의 최신 미완료·미삭제·알림ON 일정만 복구한다. 지난 회차는 전달하지 않고 기존 Calendar 반복 정책의 다음 회차·간격·종료일을 사용한다. 재조회 중 삭제/수정·계정 변경·generation 무효화와 현재 울리는 알람 보존을 검사한다. 서버 일정 이벤트는 기존처럼 inbox-only이며 FCM과 이중 예약하지 않는다. 실제 기기 예약·설정 동기화 수락은 아직 남는다.

## 중간 전달·진단 경계

- 추가 PO 피드백: Home/설정의 X는 source-color 브랜드 glyph가 color prop을 무시해 하늘색 하이라이트로 보였다. 두 화면의 제어 아이콘만 기존 Feather 원본으로 연결해 회보라색을 적용한다. CTA 문구/18sp chevron은 하나의 중앙 정렬 content group과 동일20dp line box로 맞춘다. 설정 intro 아래30+22dp 중복 공백은12+0dp로 줄이고 섹션 상단은18dp로 정리한다. 폰트 family나 Home 사진/계절 surface는 바꾸지 않는다.
- 후보 APK `57ac3dd68570c2d7c838118dd1c8917dbf84cd06adfaf727d96c196f5d89df68`을 두 기기에 같은 서명/UID/권한 보존·Metro OFF로 설치했다. 물리 기기의 실제0목록과 에뮬레이터 실제11미읽음/최근3행 팝업을 확인했다. 둘 다 목록 열기만 했으며 기존 읽음·알림 삭제0이다. `quick-physical-installed.png`/`quick-emulator-installed.png`는 PO 피드백 전 후보다. 원본 pixel size1080×2340/2400이며 시안과 다른 실제 데이터임을 구분한다. X/간격 보정 이후 새 후보 검증은 별도다.
- category 추가 보정 원격 `20261025094515_notification_event_preference_key`: pet birthday/together는anniversary, memorial은memorial만 확인하도록 lease/send/finalize의 설정 키 해석을 통일했다. 종전 record 토글까지 요구하던 조건을 제거하고 QA cohort/권한/원본 접근/만료/읽음/재시도 gate는 유지했다. 호스트 SQL44/44는 각 ON+recordOFF, 각 OFF+recordON, 전송 중 OFF와 empty QA cohort를 포함한다. source event의 실제 단말 E2E는 아직 아니다.
- 새 pending 토글은 MutationCache의 임시 값에서 파생해 운영 동의/누리 소식의 두 컨트롤이 함께 움직인다. 서버 cache를 임의의 성공 값으로 덮지 않고 실패 시 같은 확정 값으로 복구한다. 저장 중 닫기 이후 server cache 유지·계정 전환 후 늦은 응답 거부를 실제 hook 검사로 분리한다.
- 아직 남은 목적지 수락: 현재 전체 목록·OS·빠른 팝업은 기존 NotificationDetail에서 typed target을 해석한다. 최신 요청의 댓글·일정 등 직접 목적지 진입과 성공 후 읽음 전체 계약은 공통 resolver/실제 E2E 단계에서 추가로 닫아야 하며 완료로 보고하지 않는다.

- 중간 전달 SHA `7dde694bba265792e569c5110a983d916820b466`의 [원격 CI40176352673](https://github.com/jaejun0617/nuri-app/actions/runs/40176352673)는 source/타입/lint/foundation/전체/diff 후속 단계 모두 PASS다. 최신 추가 리디자인은 아직 이 SHA에 포함되지 않았으므로 최종 CI 수락과 구분한다.
- 현재 새 UI의 Full319 suites4,382/4,382 PASS 이후 일정 최신 버전 재조회·2개 추가 검사를 별도 실행한다. 최종 소스의 타입·lint·설치 증거는 후속 영수증으로 연결한다.
- 에뮬레이터 Google QA의 native getToken null은 실제 OS 알림 권한 거부와 대응했다. 원격 ES256 요청은 handler200을 확인했으므로 verify_jwt를 끄지 않았다. 실제 권한 허용 후 등록·다중 인스턴스 검증은 남는다.
- Metro/inspector 진단 중2026-10-25 17:28:35 KST 에뮬레이터 Hermes SIGSEGV를 관찰했다. `emulator-diagnostic-crash.json`을 보존하며 원인은 UNKNOWN이다. 이 구간에 Debug가 Metro 개발 번들을 다시 요청했으므로 bundled-only 수락에 재사용하지 않는다. Metro는 종료했고 새 후보의 Metro OFF 재실행·재발 여부를 별도 확인한다.

## 범위와 기준점

- 이번 범위는 1 검사, 2 외부 설정, 3 인증, 4 인앱 알림, 5 OS 푸시, 6 기록 통합, NAV-01이다. 원래 7 산책 장애, 8 정확도, 9 전체 화면 회귀는 시작하지 않는다.
- 기준 HEAD는 `116a6abf5cba22af3df0f6f15486352e0ecc2161`, 브랜치는 `codex/walk-marker-recovery-20261020`이다. 원본 Desktop checkout의 181개 변경과 별도 이미지 31개, 이전 미추적 최종점검보고서는 보존·제외한다.
- 외부 증적 디렉터리: `/Users/shinjaejun/.codex/nuri-integrated-closeout-20261025-TyHdIk`.
- 제품 계약: 흰색 하단 툴바와 상단 24dp, 커뮤니티 흰색, Home-only 계절색, 기존 폰트·알림 디자인·400ms 탭 페이드·상세 native slide·Back·draft 유지, STORE HOLD.

## 검사 B2

| 필수 검사 | 결과 | 근거 |
|---|---|---|
| 기존 로컬 33개 실패의 개별 재현·분류 | PASS | `baseline-failures.json`, `baseline-targeted.json` |
| 최신 승인 디자인에 뒤처진 기대값 보정 | PASS | 제품 디자인을 역변경하지 않고 8개 검사 파일의 기대값·fixture·renderer 정리 보정 |
| OAuth CI Google·Kakao 원인 보정 | PASS | 고정 테스트 project URL·publishable 형식을 격리. provider·redirect·S256 및 외부 origin/plain 거부 유지 |
| 전체 Jest | PASS | 최신3fabc74 후보320 suites, 4,392/4,392. `full-notification-feedback-corrective.json`. 이전315/4,347은 사진 보정 단계 기준점이다 |
| critical foundation | PASS | 12 suites, 127/127 |
| TypeScript | PASS | 현재3fabc74의 로컬 및 실제 CI 단계 통과 |
| 변경 파일 lint | PASS | 최신 대상13파일 오류0/경고0. 실제 CI lint 단계도 PASS. 이전 전체604파일의 기존 경고27과 구분한다 |
| 현재 SHA의 원격 CI와 후속 단계 | PASS | 3fabc74, run40186282381 전체 후속 단계 성공. 앞으로 제품 코드가 바뀌면 해당 최종 SHA 재검증 필요 |

로컬 33개와 CI 2개를 35개 제품 결함으로 합산하지 않는다. OAuth CI 원인은 운영 주소와 CI 주소의 혼용이며 운영 설정 강제 주입으로 해결하지 않았다.

## 설정 B1

| 필수 조건 | 결과 | 근거 |
|---|---|---|
| Firebase 앱·서버 project 일치 | PASS | Android `com.nuri.app`, Firebase `nuri-app-49b7e`, 전송 전용 service account |
| Edge 3개 비밀 설정·Vault worker 인증 | PASS | `push-configuration.json`; 비밀값 출력·Git 저장 없음 |
| 빈 cohort·비QA·client 직접 호출 차단 | PASS | migration `20261025054948`, rollback-only SQL 계약 6개 |
| QA만 등록·lease·전송 직전 재검증 | PASS | private runtime에 확인된 canonical QA 두 identity만 고정 |
| 인증 누락·오류 거부와 정상 worker 호출 | PASS | 누락/오류 403, 정상 200. `worker-auth-and-empty-queue.json` |
| 실제 FCM 접수와 단말 표시 | PASS, 소비 경로 검증 진행 | background transport fixture의 기기별 accepted 영수증 1개, 단말의 해당 QA 알림 표시 확인 |
| 최종 worker·cron·발송 범위 | 진행 | cron 3개 유지. 일반 사용자 대상 활성화 없음. 마감 시 다시 대조 |

`providerAccepted`는 FCM 접수일 뿐이다. 실제 단말 표시와 탭·읽음은 별도 증적으로 판정한다.

## 인증 U1

- 서버 canonical QA registry와 provider identity를 대조했다. Google·Kakao는 별도 사용자이며 임의 연결하지 않았다.
- 실기기의 기존 Kakao 세션은 실제 `auth.getUser()`와 cached owner가 일치했다.
- PO가 에뮬레이터의 기존 Google QA 로그인을 완료했다. 해당 기존 identity의 최신 서버 로그인 시각과 에뮬레이터 Home 진입을 확인했다. 새 QA 계정은 생성하지 않았다.
- 각 provider의 취소·Back·성공·재실행·복귀, 계정 전환·등록 경계와 중복 callback의 실제 검증은 완료한 범위만 후속 수락표에 반영한다.
- 실물 기기는 한 대다. PO 승인으로 Google Play API35 ARM64 에뮬레이터를 준비했으며 실물 두 대의 결과로 보고하지 않는다. SDK 약관과 설치는 별도 PO 승인을 받았다.

## 인앱 U2와 OS U3

- QA transport fixture는 기존 private publisher와 outbox·worker를 통과한다. **실제 업무 원본 생성 E2E가 아니라 전달·소비 검증용**이다.
- 과거 nickname 기반 QA producer는 현재 canonical Kakao QA를 거부했다. 계정 이름이나 기존 RPC 권한을 바꿔 통과시키지 않았다. 실패 트랜잭션의 새 알림은 0개다.
- QA fixture의 source는 `qa_transport`, dedupe prefix는 `qa.transport:TyHdIk:`다. 일반 사용자 알림·공지 전체 발송을 하지 않는다.

| OS 필수 시나리오 | 상태 |
|---|---|
| 앱 권한 허용 | PASS: QA background transport의 표시·탭·읽음 연결. 모든 업무 이벤트의 E2E는 아님 |
| 앱 권한 거부 | 전달 matrix NOT_RUN. 설정 표시·계정 동의/채널 분리와 원래 거부 상태 복원만 확인 |
| 앱 카테고리 OFF | NOT_RUN |
| Android 채널 OFF | NOT_RUN |
| 전경 | 부분 관찰: FCM 접수·OS 배너 없음·인앱 읽음. native callback receipt 독립 증거 미확보 |
| 백그라운드 | PASS: Google QA transport의 실제 OS 표시→탭→상세→서버 읽음. 실제 업무 원본 E2E와 구분 |
| 최근 앱 제거·프로세스 미실행 | NOT_RUN |
| 설정 강제 종료·직접 재실행 복구 | NOT_RUN |
| 네트워크 단절·TTL | NOT_RUN |
| 로그아웃·계정 전환 | NOT_RUN |
| 실제 별도 두 인스턴스 | 준비 완료, NOT_RUN; 실기기+에뮬레이터로 구분 |
| 등록 갱신·무효 등록 | NOT_RUN |
| 연속 탭·cold/warm 중복 진입 | NOT_RUN |

## 기록 통합 U5

사진 선택·취소·권한·업로드·복구, 기록 CRUD·서버/화면 동기화·응답 유실 재시도, 건강·체중 CRUD, 일정 CRUD·회차·예약 무효화, 입력·키보드·이탈·늦은 응답을 이번 배치에서 검증한다. 아래 HERO-01의 실제 QA 사진 저장은 부분 증적이며, 기록·건강·일정의 실제 CRUD 전체 수락은 아직 NOT_RUN이다. 실기기 기록 입력 focus/키보드/닫기/Timeline 복귀와 프로필 편집 진입/Back은 동일 후보0e04d3e2에서 저장 없이 확인했다.

## NAV-01과 U6 일부

- 최신 이전 설치본에서 More fade 종료·unmount 뒤 destination dispatch가 실행되어 Home이 노출되는 현상을 실제 녹화로 재현했다. Root route 이름으로 원인을 추측한 것이 아니다.
- Root 상세는 메뉴 위로 즉시 push한다. More의 실제 복귀 surface와 스크롤을 유지하며 숨겨진 메뉴의 입력·접근성·Back은 focus에 따라 비활성화한다. 탭 목적지는 기존 underlay 교체 후 More만 400ms fade하는 경로를 보존했다.
- 고정 지연, 가짜 화면, 전역 animation OFF, reset, 전역 navigation lock을 추가하지 않았다. 한 입력의 중복 dispatch만 차단하고 focus 이탈 또는 실패에서 해제한다.
- 관련 navigation 4 suites, 50/50 PASS. 설치본에서 More→알림함→More 5회 모두 진입·Back·스크롤 bounds 유지 PASS다.
- `nav-final-five.mp4`는 Metro OFF, 42.576756초, 398 encoded frames다. nominal 59.94fps와 평균 약9.35fps인 가변 프레임 기록을 구분한다. 398개 추출 프레임을 4개 contact sheet로 관찰한 범위에서 Home 순간 노출은 없었다. 모든 compositor frame의 수집이나 전역 성능 보증은 아니다.
- 다른 메뉴, 빠른 선택·전환 중 Back, Home bell, 인증·푸시·기록 저장 복귀 등 공통 경로 수락은 아직 진행 중이다. U6 전체 완료로 확대하지 않는다.

## 추가 영상 HERO-01: 사진 편집·Home 상단

- PO 영상 `KakaoTalk_Video_2026-10-25-16-03-22.mp4`는 15.133333초, 1080×2340, 30fps, 454 frames다. 영상 촬영 APK와 후보의 exact identity는 파일명이나 시각만으로 확정하지 않는다.
- 관찰: 약6초 뒤 사진 선택 미리보기가 나타나며 자동 추천색이 바뀐다. 약9~11초의 저장 후 편집 사진/색상이 잠시 이전 cache 상태로 돌아간다. 약12~13초 Home 진입에서는 진한 상단 띠와 로딩 후 사진 표시가 서로 다른 상태로 바뀐다.
- 하단 ellipse는 원본14초 프레임에서 정상이다. 여러 프레임을 붙인 contact sheet의 인접 경계를 사진의 다중 곡선 결함으로 오인한 최초 설명을 철회한다. mask geometry나 Android hardware layer를 변경하지 않는다.
- 원인: fallback에 `rgba(24,19,33,0.78)`/160dp를 사용하고 ready에서는0.18/112dp로 바꿨다. Header는 상태와 무관하게 흰 글자를 사용했다. 편집은 같은 pet object의 cache 갱신마다 폼을 재주입했고, immutable 새 avatar path를 재조회하기 전에 기존 avatarUrl을 비웠다.
- 후보 수정: fallback 강한 띠를 제거하고 ready 사진 위의 기존112dp/0.18 그라데이션만 유지한다. Header 로고/하트/문구/알림은 동일 image request의 실제 상태를 따라 밝은 fallback에서는 기존 ink, ready 사진에서는 흰색을 사용한다. 요청 identity로 A→B→A 및 늦은 callback을 구분한다. 사진 crop·ellipse·폰트·Home-only 계절색은 보존한다.
- 편집 수정: owner+pet별 최초 draft hydration만 layout 단계에서 수행해 재조회가 선택한 local photo와 색상을 덮지 않게 한다. timestamped immutable 업로드 경로는 유지하고 확인된 새 snapshot을 한 번에 교체한다. 강제 빈 avatar 중간 상태를 제거한다. 사진 선택에 따른 기존 자동 추천색 기능 자체는 유지한다.
- 후보0e04d3e246b37409dfafb3c76942762a5d75fb703607f229b3c07014ec39f473, 앱 입력b60348d30abd2b83c74f399df83f7ea739bb628803b3c3a6a9bdb62096967d36를 두 기기에 설치했다. 에뮬레이터의 streamed install은 실패/이전 hash 유지였고 정상 재시작 뒤 해시 확인한 파일로 에뮬레이터만1회 재시도했다. 앱 삭제·계정 초기화는 없고 UID10207/기존 권한/최초 설치 보존이다.
- 실제 표시: 사진 없는 에뮬레이터의 진한 띠 제거·ink Header, 사진 있는 실기기의 흰 Header/기존 완만한 shadow를 확인했다. 실기기 중간의 다른 앱 OS overlay capture는 앱 증적에서 제외하고 새로 생긴 해당 이미지1개만 개인정보 보존 최소화를 위해 제거했다. PO의 재개 지시 후 NURI focus를 확인하고 다시 검증했다.
- 실제 사진 E2E: 기존 canonical Google QA의 선택된 아이1명에 프로젝트 승인 PNG1개를 Photo Picker→Storage upload→pet update→refetch→완료→Home 경로로 저장했다. `video-160322/qa-profile-save.json`과135 encoded frames/8.344722초 영상이 소유한다. local preview가 저장 중 되돌아가지 않고 Home loading에도 강한 띠가 없는 수집 프레임을 확인했다. nominal60fps와 평균약16.18fps VFR이며 모든 compositor frame 증거는 아니다.
- 서버 대조에서 photo/theme 외 fingerprint 차이를 발견했다. 원인은 클라이언트가 조회에서 파생한 speciesKey를 사진 수정 때 원래NULL 컬럼에 써 넣은 것이다. 단일 필드를NULL로 계산한 fingerprint가 원본과 정확히 일치함을 확인했다. 종류를 명시적으로 수정할 때만 species_key를 전달하도록 추가 보정했다.
- 첫 QA 데이터 정리: 원본 사진NULL/색상#42CD50/species_keyNULL을 조건부 복원했고 나머지 원본 field fingerprint도 일치했다. 참조0 확인 후 이번 QA object1개만 Storage API로 삭제하고 실제 object 잔여0을 확인했다. 실기기의 PO 사진과 다른 아이는 변경하지 않았다.
- 마지막 보정 후보 APK `d26decd49e608e2ee471e51de7c26e41336f5888f5eb1ccdbfefaeec2623e197`, 앱 입력 `cfddd5f0dc0eec7062b7bac981bd4b391e13ee00d18b826eb5fbe3b564b96468`을 동일 서명/Metro OFF로 두 기기에 설치했다. 실제 두 단말의 ARM64 ABI만 포함한 내부 Debug이며 Store RC가 아니다. UID·최초 설치·권한·계정·데이터 보존은 `delivery-profile-final/installation.json`이 소유한다.
- 마지막 실제 사진 저장 재검증 PASS: 동일 QA 아이의 Photo Picker→업로드→저장→재조회→완료→Home을 확인했다. `qa-profile-final.json`과61 encoded frames/13.397767초 VFR 영상의3fps 추출 화면에서 저장 중 local preview가 되돌아가지 않고 Home loading에 강한 띠가 없는 범위를 확인했다. 사진 완전 로딩 이후나 모든 compositor frame의 보증으로 확대하지 않는다. photo/theme 제외 fingerprint가 저장 직후에도 원본 `ab174b05c2d7c0c29598f5a95db7e341`와 일치하고 species_key는NULL을 유지했다.
- 마지막 QA 정리 PASS: 조건부 원복 후 원본 photo/theme/fingerprint 일치, 참조0의 신규 object1개만 Storage API로 제거해 잔여0을 확인했다. 에뮬레이터의 이번 QA 미디어 ID1000000019와 정확한 파일만 제거했고 다른 사진·실기기 사용자 사진은 보존했다.
- 호스트 검증: 관련138/138, 추가 분류 보정 표적4/4, 전체315/4,347 기준점, 타입 PASS. 실제 source→Storage→server row→화면 검증과 호스트 mock 검사를 구분한다.

## 설치 후보

### BOOT-01: 시작 전 분홍 바탕과 API35 상태바

- 추가 PO 관찰을 동일 배치의 한정된 시작 surface 결함으로 연결한다. 산책 장애나 전체 화면 회귀 배치를 시작하는 것은 아니다.
- 첨부 단색의 표본은 `#F4B9B5`이며 native `nuri_splash_background=#F4B9B4`와 채널 1 차이다. 에뮬레이터 상태바는 해당 native 값과 정확히 일치했다. 반면 승인된 JS 스플래시는 네 계절 모두 `#FFFFFF`다.
- 이전 후보의 SM-S937N/Metro OFF cold-process launch에서 단색 분홍 표본을 실제 재현했다. `native-launch-before.json`은 16×32 RAM 축약 표본과 무입력·APK/UID/권한 보존을 소유한다. 표본 사이의 전체 표시 시간이나 모든 compositor frame을 측정한 증거는 아니다.
- Android 시작 테마의 `windowBackground`와 API31 이상 `windowSplashScreenBackground`, MainActivity의 재개/focus 배경이 같은 과거 분홍 resource를 참조했다. JS 로딩 전 native 바탕이 노출되는 조건이므로 특정 Google 계정이나 봄 선택 때문으로 판정하지 않는다.
- 후보 보정: native 바탕을 승인된 흰 스플래시와 일치시킨다. API35에만 있던 edge-to-edge opt-out을 제거해 기존 화면 safe-area 소유와 맞추고 누락된 dark system glyph 기본값을 명시한다. Root native stack에도 dark glyph를 명시해 focus 이후 native screens의 light 기본값과 경합하지 않게 한다. 스플래시 삽화·계절 결정·인증 분기·최소 hold·400ms 전환과 inset 수치는 바꾸지 않는다.
- 색상 보정 결과: APK `1750a2d7819f746e891adb23c3878ea315c6ced2b203531c81f8b86df893f4d6`, 앱 입력 `7e5c608a3daa4d5935b3b208fbfdb8ca0c88377c78eb5c4e6f353ae108024f29`를 같은 서명으로 두 기기에 교체했다. UID/최초 설치/권한 보존, Metro OFF다. 에뮬레이터는 설치 뒤 ADB 연결이 잠시 끊겼으나 재설치하지 않고 실제 APK hash로 설치 성공을 확인했다.
- 수정 후 실기기 cold-process launch의 수집 표본에서 분홍 단색은 없고 Home까지 복귀했다. 두 기기 Home 상태바는 실제 `#FEF2E9`이며 에뮬레이터 glyph 대비도 확인했다. `native-launch-after.json`, `delivery-native-launch/physical-install.json`, `emulator-install-verified.json`과 상태바 crop이 소유한다.
- **아직 완료 아님:** PO가 단색 변경만이 아니라 시작 즉시 splash 노출을 요구했다. native 시작 단계부터 승인 splash를 보여주고 실제 첫 프레임에 이어지는 연결은 아직 미구현이다. 흰 바탕 보정으로 시작 공백·초기화 지연까지 해결됐다고 보고하지 않는다. API35 입력·키보드·Back 등 영향 수락도 최종 후보에 연결해야 한다.

- 최초 NAV 후보 APK SHA-256: `7768c5605ceb895bc70a194b1abc82c0c8efaca129135acacd1154f24e7cb763`. 위 BOOT 색상 후보와 후속 HERO 후보는 별도 식별한다.
- 앱 입력 SHA-256: `93d8cc44eea3acb434185897b17f06989d7308cd0e47ed60d621971ff9f15979`.
- 같은 승인 signer, JS bundle 포함 Debug 내부 QA 후보이며 Store RC나 release 성능 검증본이 아니다. clean-source Release guard를 약화시키거나 보존 중인 미추적 파일을 숨기지 않았다.
- 첫 설치 명령의 응답 대기가 만료됐지만 실제 설치 APK hash는 새 후보와 일치했다. 설치를 불필요하게 반복하지 않고 UID10402·최초 설치일·권한 hash 보존과 Metro OFF 실행을 별도 재확인했다.

## 해결 / 진행 / 잔여 / 잔여 해결 계획

| 구분 | 내용 |
|---|---|
| 해결 | 로컬 실패 보정, 실제 QA 범위 제한·비밀 설정·worker 인증 연결, NAV 재현과 최소 수정, 설치 후보의 5회 왕복 |
| 진행 | 1~6과 NAV-01의 실제 수락 원장 채우기 |
| 잔여 | 인증 상태별·계정 경계, 직접 목적지와 업무 이벤트 E2E, OS 전체 상태·동일 계정 다중 기기, 기록 CRUD·실패 복구, 공통 NAV 경로와 최종 운영 상태. 현재3fabc74의 CI는 완료 |
| 잔여 해결 계획 | 같은 QA 계정·후보를 사용해 실제 결과와 source/server/device 증적을 연결하고 실패만 최소 수정·재검사 |

## 다음 작업 및 우선순위

| 우선순위 | 원래 작업 번호 | 작업 | 선행 조건 | 담당 | 필요한 입력 | 완료 기준 | 현재 시작 가능 여부 |
|---|---|---|---|---|---|---|---|
| 1 | 1~6, NAV-01 | 이번 배치의 미마감 필수 수락 | 현재 후보·QA 제한 유지 | Master | 필요한 경우 기존 provider의 안전한 직접 로그인 | 필수 FAIL·BLOCKED·NOT_RUN 해소 및 실제 CI | 진행 중 |
| 2 | 7 | 산책 장애 검증 | 이번 배치 정상 동결 | Master | 기존 잔여 장애 증적 조건 | 오프라인·응답 유실·강제 종료·삭제 복구의 잔여 증적 | 불가, 자동 시작 금지 |
| 3 | 8 | 산책 정확도 검증 | 7번 마감 | Master·PO | 독립 거리 기준·측정 조건 | 정량 증적 | 불가 |
| 4 | 9 | 전체 화면 회귀 | 선행 배치 마감 | Master | 작은 화면·큰 글꼴 전체 조건 | 전체 미마감 매트릭스 | 불가 |
| 5 | 10 | 최종 보안 점검 | 선행 기능·QA 마감 | Master | 최종 후보 | 최종 보안 수락 | 불가 |
| 6 | 11 | 정책·법무 마감 | 확정 서비스 계약 | PO·Master | 법무·정책 판단 | 의무 문서 수락 | 불가 |
| 7 | 12 | 최종 RC 제작·검증 | 10·11 및 앞선 잔여 해소 | Master | 승인된 RC 입력 | 정확한 RC의 최종 검증 | 불가 |
| 8 | 13 | 스토어 제출 자료 | 확정 RC | PO·Master | 제출 자료 | 자료 준비 완료 | 불가 |
| 9 | 14 | 베타·Store 각각 Go/No-Go | 모든 해당 수락 | PO | 각각의 출시 판단 | 명시적 결정 | 불가, STORE HOLD |
