# 알림 v3 및 흰색 둥근 툴바 전달 기록

## 범위와 기준

- Master 단독. 최신 PO가 승인한 알림 계약, 모든 하단 툴바의 흰색·상단 모서리 24dp 통일, 커뮤니티 흰 배경을 구현했다. Home-only 4계절 배경, 400ms 전환, 기존 XP·332종 칭호 조건·랭킹·Walk 엔진은 유지한다.
- 작업 경로: `/Users/shinjaejun/.codex/worktrees/nuri-batch-a-20261020/nuri`, branch `codex/walk-marker-recovery-20261020`, build base `adeb0a8dc9cfb1d7d6a60a78314b2e00c63f8d2e`.
- 외부 증적 소유자: `/Users/shinjaejun/.codex/nuri-notifications-20261024-p1FgPs`. 최종 commit/push SHA는 이 폴더의 `git-delivery.json`이 소유한다. 설치 후 승인된 변경만 commit/push하며 Store·merge는 하지 않는다.
- 원본 Desktop checkout의 기존 dirty 181개와 별도 이미지 output 31개는 보존·제외한다. 저장공간 부족은 없었고 유효한 incremental 캐시·실패 증적·과거 APK를 삭제하지 않았다.

## 실제 수정 범위

| 영역 | 주요 파일 |
|---|---|
| 툴바·커뮤니티 | `AppNavigationToolbar.tsx`, `CommunityStackHeader.tsx`, Community list/create/edit/discussion/blocked/submission 표면 |
| 화면 | `NotificationDesign.tsx`, `UserNotificationsScreen.tsx`, `NotificationDetailScreen.tsx`, Home·More·Timeline·칭호 목적지 |
| 상태·조회 | `useNotificationInbox.ts`, `notificationSync.ts`, `notificationPresentation.ts`, `userNotifications.ts`, AppProviders·RootNavigator·App.tsx |
| OS | `nativePush.ts`, `pushTokenLifecycle.ts`, `NuriPushModule.kt`, `NuriPushService.kt`, MainActivity·Manifest·Gradle |
| 서버 | notification v3 migrations 5개, device/worker Edge 2개, transport shared helper·config |
| 검증 | notification management/boundary 및 기존 영향 테스트, SQL·transport 계약 스크립트 |

전체 변경 파일 목록은 commit의 `git show --stat`와 외부 Git receipt로 확정한다. unrelated output은 포함하지 않는다.

## 시안과 공용 UI

- 실제 OS 영역을 제외하고 원본 852px 폭으로 정규화했다. `comparison-empty.png`, `comparison-list.png`, `comparison-detail.png`는 원본·구현·50% overlay다. 전체 픽셀 일치나 모든 글자 확대 상태 PASS로 확대하지 않는다.
- 공용 `NotificationDesign.tsx`가 canvas/header/date-card/row/empty/detail을 소유한다. 날짜별 카드 하나와 내부 구분선, 읽지 않은 점, 실제 문자열·CTA를 사용한다. unread=0과 빈 목록을 구분하고 실패를 빈 목록으로 감추지 않는다.
- 좌우 20dp, 행 내부 16dp/14dp, 아이콘 44dp·텍스트 간격 16dp, 날짜 카드 radius 20dp·그룹 간격 30dp다. 빈 삽화 162×110dp·문구 위 14dp, 상세 좌우 21dp·본문 내부 22dp·radius 24dp·CTA 54dp다. 작은 폭·확대 글꼴에서는 상세 삽화를 재배치한다.
- AppText와 기존 사용자 폰트 선택을 유지한다. 시안 프리뷰만 jisu로 맞춘 뒤 현재 사용자 pretendard 선택을 복원했고 저장하지 않았다. 기존 Home의 `src/app/ui/AppText.tsx` 및 폰트 매핑을 재사용한다. 목록 제목 22/30sp, 빈 헤더 18/24sp, 행 제목 14/19sp, 메타 11/14sp, 미리보기 12/17sp, 상세 제목 24/29sp이며 letterSpacing은 0이다. 접근성 확대를 끄지 않는다.
- 실제 추출 자산 7개: 빈 삽화 원본 crop(250,725,360,245), 상세 삽화(465,685,320,323), 목록 아이콘 각각(81,y,96,96), y=424/604/790/1108/1293. `src/assets/notifications/`에 등록했고 새 생성·유사 대체를 하지 않았다. 원본 경로·SHA와 출력 SHA는 `extraction.json`에 있다.
- 외부 프리뷰에만 고정 시각·6개 알림을 주입했다. 앱 fixture·고정 override·실패 fallback은 없다. 종료 시 runtime globals를 회수하고 실제 계정 query/cache·폰트로 복구했다. 최종 APK 내 preview marker 부재를 확인했다. 실제 알림 삭제·읽음 변경으로 시안을 만들지 않았다.

## 서버 반영 및 계약

- 실제 linked project `grmekesqoydylqmyvfke`에 다음 migration을 반영했다: `20261025030651`, `20261025030704`, `20261025030905`, `20261025030939`, `20261025040438`.
- 공지 게시·예약·재발행, 댓글·답글·좋아요·신고 결과, 실제 칭호 최초 지급·XP 원장·레벨, 기록 CRUD, 주·월 회고, 함께한 달·저장된 기념일, 기존 일정 occurrence를 연결했다. 자기 알림·답글 중복·차단·삭제·권한 상실·OFF 설정·읽음 snapshot·dedupe·기간 고정을 처리한다. 미지원 멘션·팔로우·랭킹 보상·별도 복약 기능은 만들지 않았다.
- SQL scheduler·publication fanout·worker invoke cron 3개가 존재하고 최근 실행은 succeeded다. worker invoke는 Vault credential이 없으면 HTTP를 보내지 않으므로 cron 성공을 푸시 성공이라고 해석하지 않는다.
- Edge `notification-device-v3`, `notification-worker-v3` ACTIVE v1. 무인증 probe는 각각 401/403, 실제 세션 status는 configured=false였다. 푸시 토큰은 암호화·owner/device binding·기기별 receipt·lease/backoff/expiry를 사용한다. 외부 HTTP는 업무 transaction 밖이다.
- 세 번째 migration의 같은 초 timestamp 충돌로 DDL은 commit됐으나 history 기록이 실패했다. catalog·권한·트리거를 확인한 뒤 DDL을 재실행하지 않고 `20261025030905` applied history를 repair했다. 재시도 중 already-exists 실패는 성공으로 덮지 않았다. 이후 migration은 MCP transaction에 맡겨 기록했다.
- 원격 notification row 11개·preferences 1개·outbox 0개를 확인했다. 운영 fixture·전체 공지 시험 발송·실제 알림 읽음/삭제 QA는 하지 않았다. 새 schema/read-model backfill은 반영됐으므로 DB 무변경이라고 보고하지 않는다. 원본 업무 데이터 전체 row-level 불변 해시는 이번에 수집하지 않았다.
- 기존 private table RLS/권한과 owner-only RPC를 사용한다. advisor 기존 security ERROR 1은 그대로이며 이번 변경으로 전체 보안 PASS가 되지 않는다. private closed table의 no-policy INFO와 실제 공개 위험은 구분한다.

## 검증 및 설치

| 검증 | 실제 결과·경계 |
|---|---|
| TypeScript | 최종 소스 검사 PASS |
| Lint | 변경 TS 39파일, 오류 0·기존 경고 20·신규 의미상 경고 0. 자동 fix 없음 |
| Full suite | 314 suites, 4,300 PASS / 33 FAIL / 4,333 total. 이전 baseline과 실패 이름 일치, 신규 0. 전체 PASS 아님 |
| SQL 계약 | 실제 PostgreSQL 호환 PGlite에서 5migrations·34 checks PASS. 운영 DB 시험 변이 아님 |
| transport | 17 checks PASS. 암호화·AAD·분류·본문 제한이며 provider 전달 증적 아님 |
| Native | Kotlin compile 및 번들 포함 Debug build PASS |
| 미리보기 | 빈/목록/상세 3장과 overlay 확보. 실제 사용자 데이터 미사용 |
| 기기 | 실제 SM-S937N / Android17 / 1080×2340 / density450 / font1.0. 사용자가 부르는 S24 명칭과 실제 model을 구분 |

- 이 작업의 APK build는 총 3회, 교체 설치는 2회다. 첫 설치 뒤 관리 기능 및 계정 전환 경계를 보완했고 두 번째 build는 미설치 superseded, 세 번째 후보를 최종 설치했다. plan·Kotlin preflight는 APK build 횟수와 별도다.
- 최종 `delivery-3/build-result.json`: APK SHA-256 `fc9930468784b5b69fc95499ee66381181560aea486f6ddd571a8da7e7695dc9`, runtime input SHA-256 `fa57b85e71e0ca966b9453b5ea31b7d270e9cba7314f1f9d2999d9b236bc0772`.
- 승인 signer SHA-256 `08efb41ea4729792ce9fc3d242be9704e84a8ea3eadcbbcf1c8426884db689d3`, embedded JS 존재, fixture marker 부재. 설치 APK hash 일치·UID10402·최초 설치일·권한 SHA·표시 설정을 보존했다. uninstall·clear-data·새 계정·권한 강제 허용 0.
- Metro OFF/8081 listener 0에서 cold launch·Home·실제 빈 알림함(미읽음0)·설정/카테고리 진입·빠른 탭 순환·Home 복귀·백그라운드 복귀를 확인했다. 실제 알림함은 empty여서 populated 관리 길게 누르기는 물리 검증하지 않았다. 관리 확인/취소/열기 비삭제는 로컬 테스트다.
- 실제 세션을 보존했으나 고정 QA identity를 독립 확인하지 못했다. 모든 compositor frame·모든 키보드·큰 글꼴·오프라인·계정 전환·다중 기기·실제 푸시 전경/배경/종료 matrix는 NOT_VERIFIED다. Walk service OFF이며 새 보행·GPS/지도 캡처는 없다.
- 이 APK는 bundled-development Debug이며 canonical Final RC/Store artifact가 아니다. 설치 후 commit으로 runtime bytes가 바뀌지 않았는지는 외부 `git-delivery.json`이 증명한다. 최신 알림 계약의 Metro OFF가 이전 칭호 작업의 최종 ON 지시를 이 전달 범위에서 대체한다.

## 잔여와 마감

- 외부 설정: Edge `NURI_FCM_SERVICE_ACCOUNT`, `NURI_PUSH_TOKEN_KEY`, `NURI_NOTIFICATION_WORKER_SECRET`; Vault `nuri_notification_worker_secret`. 설정 전 OS 푸시 전체 완료로 보고하지 않는다.
- 설정 후 별도 승인 범위에서 실제 이벤트→알림함→목적지→읽음, 토큰/다중 기기/OS permission matrix를 검증해야 한다. 현재 클릭은 공통 상세에서 검증 후 CTA로 목적지에 이동하는 2단계다.
- 기존 33실패·Walk 삭제 복구/오프라인 Native 내구성·야외 정량·전체 Final RC·PO Store Go/No-Go 의무는 유지한다. 이번 구현이 해당 gate를 닫지 않는다.
- 현재 승인 전달 commit/push 후 읽기 전용 전체 점검으로 전환한다. 전체 점검은 새 제품 수정·DB 변경·기기 QA·build·Git·문서 덮어쓰기를 자동 실행하지 않는다. STORE HOLD다.
