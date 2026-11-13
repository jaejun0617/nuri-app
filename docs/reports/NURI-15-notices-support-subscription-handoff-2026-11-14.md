# NURI-15 공지사항·고객센터·구독 작업보고서

작성일: 2026-11-14 KST. 대상: PO와 프롬프트 엔지니어. Master 단독.

## 1. 배경과 읽는 기준

PO는 디자인 우선 구현 이후 실제 격리 Auth/API 연결, 관리자 공지 관리, 문의 사진, 답변 알림을 순차 승인했다. 이번 지시는 남은 공용 알림 연결, 설치본 검증, 선별 전달, Metro 종료와 공간 정리다. 초기 문서 전용 지시와 당시 구현 금지를 현재 지시로 혼동하지 않는다.

- 실제 기준: Master `nuri-batch-a-20261020/nuri`, 브랜치 `codex/walk-marker-recovery-20261020`, 시작 HEAD `272d576ac3ed89f18873940fbad2f759b3ae9d04`와 현재 working bytes.
- 기존 NURI-15 미전달 구현을 이어받았다. 이번 새 변경만으로 아래 모든 기능을 처음 구현·검증했다고 보고하지 않는다.
- 계획 정본: [NURI-15 최종 기획](../planning/NURI-15-final-plan-2026-11-13.md). 최신 PO UI 변경은 아래 현행 상태가 우선하며 기획의 과거 문구를 수락 증거로 쓰지 않는다.
- 제품 수락 소유자는 [기존 단일 원장](../qa/nuri-integrated-closeout-2026-10-25.md)이다. 이 보고서는 신규 병렬 수락 원장이 아니다.
- 직접 읽은 Master 지침과 자동 주입 여부는 별개다. 자동 주입의 정상 적용은 이 작업으로 새 PASS 처리하지 않았다.

## 2. 문제와 선택

직전 단계는 독립 답변 worker와 공용 알림 행 모양을 재사용했지만 목록 처리·target 검증은 별도였다. 운영 알림 원장에 바로 쓰면 합성 사용자와 운영 계정, 기존 읽음과 신규 답변이 섞일 수 있다.

선택지는 운영 알림 원장에 즉시 합류시키는 방법과, 동일 목록 컴포넌트에 인증된 출처별 API/target 어댑터를 연결하는 방법이었다. 후자를 적용했다. `UserNotificationsScreen`과 격리 문의 알림이 동일한 가상화 목록·날짜 묶음·갱신·오류·페이지 처리를 사용하고, 문의 target은 클릭 시 현재 서버 권한으로 다시 확인한다.

**완료 범위:** 격리 문의 답변의 실제 서버 페이지/target과 공용 목록 컴포넌트 연결. **미완료 범위:** 운영 공용 backend의 혼합 목록, 운영 `user_notifications` 원장·기존 resolver로의 등록, 운영 홈 배지, 운영 배포. 개발 진입이 아직 별도로 존재하는 사실을 숨기지 않는다.

## 3. 화면·디자인 현황

| 영역 | 현재 구현 | 동작·주의점 |
| --- | --- | --- |
| 전체메뉴 | 프로필 바로 아래 구독하기/구독 관리, 다음 월별 지출, 이용 안내의 공지/고객센터, 권한별 운영 메뉴 | 기존 이동·정보 배치를 보존. 구독 상태는 DEV 세션 한정 |
| 공지 목록 | 분류, 주요 공지, 최근 공지, 시각, 미읽음, 당겨서 갱신 | 작업본과 공개본 분리, 운영 공지를 자동 복사하지 않음 |
| 공지 상세 | 제목·게시 시·분·본문·누리 장식·목록 복귀 | 실제 표시 후 읽음, 중단/만료 재조회 |
| 고객센터 | FAQ·문의하기·내 문의 내역, 결제 관련 개발 화면 | 문의 작성과 내역을 분리. 내역 목록에는 메시지 입력창 없음 |
| 문의 등록 | 유형 선택 뒤 제목·본문·사진 폼, 긴 유형은 아코디언, 하단 등록 CTA | 커뮤니티의 칩을 그대로 복제하지 않음. 첫 저장 성공이 실제 접수 |
| 내 문의 내역 | 제목·상태·시·분·새 답변, 하단 문의하기 | 실제 서버 목록. 빈 상태와 오류를 구분 |
| 문의 상세 | 내 문의와 누리팀 답변, 사진 확대, 시각·추가 문의 입력 | 사진 클립과 보내기로 단순화. 문의방에서만 메시지·사진 입력 |
| 관리자 | 공지 작성/편집/게시/중단/삭제, 문의 큐·claim·답변·정보 요청·인계·종료·재개, FAQ 관리, 신고 검토 | UI 숨김만으로 권한을 보장하지 않고 서버에서 다시 확인 |
| 구독 | 월간/연간, 상품 선택·혜택·내 구독·스크롤 안 해지 문구 | 프로필·앱 심볼·중복 환불 진입 제거. 실제 결제 아님 |
| 광고 제거 | 별도 화면, 단일 설정 행·왕관·스위치·12sp 설명 | 별도 구독 혜택 버튼 없음. 모의 구독 상태만 사용 |

공통 표면은 `HomeReflectiveGlass`·`HomeFrostedGlass`와 기존 계절 테마를, CTA는 `CtaButton`/`CtaText`를 사용한다. 전역 배경·폰트 체계를 새로 교체하지 않는다. 공통 CTA 내부 채움 반경을 1dp 프레임 안쪽에 맞추고 overflow를 잘라 왼쪽 모서리 이질감을 보정한 기존 증분을 함께 전달한다. 사용자 소유 확인창은 `NuriAlert`이며 Android 권한·사진 선택기 등 시스템 화면은 대체하지 않는다.

누리 장식·왕관은 `src/assets/support`의 로컬 자산이다. 외부 서비스 화면을 통째로 이미지로 표시하는 구현이 아니다. `AppText`와 기존 제목/본문 토큰을 사용하며, 전체메뉴 밖의 무관한 디자인 dirty는 이번 전달에서 제외한다.

## 4. 공지 계약과 실제 확인 범위

- 전체메뉴 게시판은 `support_private`의 작업본·공개본을 사용한다. 기존 `announcements` 가상 알림·fanout과 분리한다. 게시판 게시·수정·중단·재게시만으로 OS push나 기존 공지 알림을 만들지 않는다.
- 관리자 capability, 현재 세션, expected revision, 요청 키와 동일 payload 검사를 적용한다. UI에서 지정 이메일만 비교해 관리자로 만드는 코드가 아니다.
- 작업본 수정은 공개본을 바꾸지 않는다. 명시적 수정 게시가 성공해야 공개본이 바뀐다. 최초 게시일과 기존 읽음을 재발행 때 초기화하지 않는다.
- 삭제는 일반 목록·상세에서 제외하고 감사와 삭제 상태를 보존한다. 전체 DB 원본 물리 삭제로 표현하지 않는다.
- 커뮤니티 공지는 기존 커뮤니티 관리 경로를 쓴다. 삭제 동작은 기존 moderation의 숨김 계약이다. 신고의 검토 완료는 신고 처리 상태/메모와 감사를 바꾸지만 게시글 자동 삭제를 하지 않는다.
- 주요 공지·분류·cursor 세대 변경 및 열린 상세의 기간 만료 재조회가 구현됐다. ID dedupe만으로 변동 중 누락 해결을 주장하지 않는다.
- 기존 격리 서버 근거: `board-api-receipt.json` 13조건, `admin-api-final-receipt.json` 일반 사용자 거절·작업본/공개본·삭제·충돌·불변 조건. 기존 S25 Metro의 전체메뉴/커뮤니티 CRUD 및 일반 사용자 버튼 비노출은 당시 입력의 근거로 재사용한다.
- 격리 FAQ 게시 원고 9개, 개발 화면의 원고와 공지 예시는 실제 운영 발행이 아니다. 안내 내용을 실제 공개 기능과 대조하는 최종 운영 검수가 남는다.

## 5. 문의·사진·관리자 답변

### 5.1 접수와 업무 상태

`support_ticket_create_v2`가 제목과 첫 본문/ready 사진을 같은 저장 명령에 묶는다. 제목은 필수이고 본문 없이 사진을 사용할 수 있다. 유형 선택·문의방 진입만으로 접수하지 않는다. 기존 제목 없는 문의와 v1 계약을 보존한다.

처리 생명주기(open/closed), 다음 응답 주체(staff/user/none), 담당자, revision, 사용자 마지막 메시지, 읽음 cursor를 분리한다. 일반 답변이 자동 종료를 뜻하지 않는다. 사용자 후속 질문은 운영자 응답 필요 상태를 복구하고 유효 담당자를 유지한다. 인계·닫기·재개는 별도 명령이다.

동일 actor·key·내용의 재전송은 최초 결과를 반환하고 다른 내용은 충돌시킨다. 성공 불명확 상태에서 새 키로 중복 접수하지 않는다. 담당 경쟁·오래된 revision·사용자 새 메시지 이후의 오래된 답변을 서버가 거절한다. 권한 유효한 충돌 초안과 권한 상실 후 원문 정리를 구별한다.

### 5.2 사진

실제 사진 선택 → 임시 업로드 → 서버 검증 → 비공개 ready object → 메시지 연결이다. 부분 실패 사진을 사용자 몰래 누락시켜 보내지 않는다. 사진은 attachment ID를 가진 현재 권한 조회 경로로 읽으며 다른 사용자에게 원본 URL을 넘기지 않는다.

격리 사진 처리기는 `scripts/qa/support-photo-route.cjs`, 앱 소비자는 `TicketPhotoViewer`와 `isolatedNoticeClient`다. 로컬 전달기는 정상 Auth와 소유/관리 권한을 확인하고 실제 Storage를 사용한다. 운영 사진 처리 서비스가 배포됐다는 뜻은 아니다.

기존 증거: 사진만 첫 접수, 같은 문의방 사진 추가, 문의자/관리자 열람, 다른 계정의 목록 비노출 및 문의/사진 404, 직접 Storage 조회·서명 발급 거절. 응답 단절 후 동일 키 재확인, 권한 회수, 미연결 사진 만료 정리, 합성 Auth 삭제 후 정확한 사진 ID 정리와 지연 업로드 재정리는 이전 격리 결과를 재사용한다.

탈퇴 사진 연결 코드는 `SUPPORT_PHOTO_CLEANUP_ENABLED`의 명시적 활성화 전에는 꺼져 있다. 전체 운영 탈퇴 유예·finalizer·보관기간·백업 파기까지 완료된 것은 아니다. 운영 flag와 배포는 변경하지 않았다.

### 5.3 답변 알림과 이번 증분

1. 관리자 답변 저장과 outbox 의도를 같은 트랜잭션에 기록한다.
2. 별도 `run-support-reply-worker.cjs`가 claim/lease·현재 수신 소유권·고유 전달·제한 재시도로 처리한다. 사용자 조회가 worker 실행 조건이 아니다.
3. 새 `support_notification_page_v1`은 실제 전달된 본인 이벤트만 페이지로 반환한다. 전체 미읽음 수는 페이지 길이와 구별한다.
4. `NotificationFeed`가 기존 알림함과 격리 문의 알림의 목록 처리를 공유한다. 읽음 cursor의 boolean을 사용하며 존재하지 않는 read_at을 만들지 않는다.
5. 탭하면 `support_notification_target_v1`으로 현재 세션의 접근을 재확인한다. 임의 route payload·타인 ticket·잘못된 DTO를 거절한다.
6. 긴 대화에서도 해당 답변이 포함된 페이지를 읽고, 실제 표시 후에만 읽음 cursor를 보낸다. Back 시 목록을 재조회한다.

전송 재시도는 여러 번일 수 있고 논리 인앱 전달은 고유 event로 중복 방지한다. 외부 exactly-once 배달, 즉시 Realtime, 운영 push·cold start·운영 계정 전환 전체 수락으로 확대하지 않는다. 활성 화면의 제한된 재조회와 독립 worker 실행을 Realtime으로 부르지 않는다.

## 6. 서버·환경·보안

| 경계 | 실제 사용 | 운영과 차이 |
| --- | --- | --- |
| Auth | 로컬 GoTrue 합성 reader/editor/other | Google/Kakao U1 인증 결과 아님 |
| API | 기기 루프백 56323 → 호스트 56321의 허용 경로 전달기 | 운영 client·토큰·DB 주소를 교체하지 않음 |
| DB | 전용 `supabase_db_n15-local`, PostgreSQL 17.6 | 전체 운영 DB 복제나 운영 migration 아님 |
| 권한 | 검증된 세션·현재 capability·소유권·함수 grant | 앱 role fixture·고정 uid·RLS 완화 없음 |
| worker | 별도 로컬 Node 프로세스 | 예약/상주 서비스·운영 Cron·FCM 아님 |
| 앱 | 내부 bundled Debug, DEV 격리 진입 | Store Release 및 실제 결제 배포 아님 |

이번 로컬 DDL은 `20261113153331_support_common_inbox_contract.sql` 한 건이다. `reply_inbox_rows(uuid)`와 공개 page/target 두 함수만 추가한다. 기존 migration을 바꾸거나 운영 schema에 적용하지 않았다. 함수는 SECURITY DEFINER, 빈 search_path이며 private 함수는 일반 역할 execute 불가, 공개 함수는 authenticated만 허용됨을 실제 catalog에서 확인했다. 실제 actor 함수는 세션과 support 활성 상태를 검사한다. 익명 API 401, 타 계정 target 404, 잘못된 limit 400을 확인했다.

이전 격리 기반 migration 13개는 별도 생성·적용 이력이다. 이번에 모두 다시 적용한 것이 아니다. 신규 게시판/문의 정의의 원격 운영 반영은 NOT RUN이다. 공식 [Database Functions](https://supabase.com/docs/guides/database/functions)의 권한 설명은 설계 참고이며 NURI 실행 증거가 아니다.

## 7. 구독과 결제의 정확한 상태

- 개발 상품은 누리 메모리 월 4,900원/연 49,000원, 메모리 플러스 월 7,900원/연 79,000원이다. PO의 편리한 개발 화면 요구에 따른 로컬 예시 가격이며 확정 스토어 상품이 아니다.
- 구독 누르기·해지·취소 예정·만료·확인 실패는 화면/메뉴 세션 상태만 바꾼다. entitlement·결제 영수증·실제 주문·사용자 권한을 변경하지 않는다.
- 전체메뉴 프로필에는 왕관+구독 배지를 표시하고 테두리는 없다. 메뉴를 닫았다 다시 여는 개발 동작에는 상태를 유지하되 계정/세션 변경에는 폐기한다.
- 구독 화면에는 중복 프로필·앱 심볼·환불 CTA가 없고, 해지 문구는 하단 고정이 아닌 내 구독 카드 안에 있다. 고객센터의 환불 화면은 로컬 예시이며 실제 금전 환불이나 권한 회수가 아니다.
- 실제 결제 연결 시 개발 상태 선택기를 제거하고 서버 검증된 상태를 내 구독에만 표시해야 한다. 스토어 상품·구매/복원·검증·갱신·해지·환불·세금/약관 계약은 구현/수락되지 않았다.
- 현재 DEV gate 설명과 단위 검사만으로 실제 Release의 deep link·state 복원·직접 navigation 차단까지 PASS하지 않는다. 이 공개 경계는 별도 설치 후보 검증이 필요하다.

## 8. 이번 검사와 재사용 증거

| 구분 | 결과 | 한계 |
| --- | --- | --- |
| 관련 TypeScript | 통과 | native/운영 수락 대체 아님 |
| 이번 수정 파일 ESLint | 오류·경고 0 | 전체 기존 경고는 CI 결과와 별도 |
| NURI-15 표적 Jest | 8 suites, 58 tests PASS | 컴포넌트·DTO·등록·관리·worker 계약 |
| 공통 회귀 Jest | 7 suites, 74 tests PASS | 기존 알림 삭제/읽음/열기/여백·CTA·메뉴 |
| 격리 API | 조회 전 독립 전달, target/읽음 분리, cursor, 타인 차단, 익명 차단, limit 검사 PASS | 운영·OS push 아님 |

초기 새 검사에서 renderer의 순환 구조를 문자열화한 테스트 오류와 변경 전 mock 메서드 참조를 발견해 실제 props/호출 계약 검사로 정정했다. assertion을 약화하거나 skip하지 않았다. 기존 vector-icons의 오래된 JSX transform 경고, 로컬 worker ESM 모듈 형식 경고는 남는다. 이전 62개/59개 등 숫자는 서로 다른 파일 집합의 실행이므로 이번 58개와 단순 증감 비교하지 않는다.

전달 범위로 넓힌 추가 ESLint는 오류 0, 기존 `MoreDrawerContent`의 no-shadow 경고 4개였다. 작업본의 source guard는 이번 제외 대상인 미추적 `ToolbarOutlineIcon.tsx`, `indoorActivityArtwork.ts` 때문에 `NURI_INPUT_UNDECLARED`로 중단됐다. 이는 선택 전달본의 실패나 두 파일의 삭제 사유가 아니다. 실제 전달 tree의 source guard·전체 검사 결과는 동일 SHA CI로 별도 확인한다. 셸의 전역 Yarn 1 호출은 프로젝트 버전 검사에서 즉시 거절됐고, 기존 Node 24.20.0·Corepack Yarn 3.6.4로 실행했다. 전역 도구나 lockfile은 변경하지 않았다.

비공개 근거 루트는 `~/.codex/n15-local/common-inbox-PwbibW/`다. 수정 직전 `baseline.json`·`before/`, `source-input.json`, `verification.json`, `worker.jsonl`, `jest-complete.json`, `jest-shared.json`을 보존한다. 사용자·토큰·사진 원시 자료는 Git에 넣지 않는다.

이전 근거는 `~/.codex/n15-local/registration-m52Fiq/`, `closeout-eVvqlV/`, `photo-access-qa-20261113.json`, `admin-api-final-receipt.json`, `board-api-receipt.json`, `ticket-api-receipt.json`이다. 서버 단독, Metro 개발, 이전 내장 APK의 실행을 이번 새 설치본의 전체 회귀 수락으로 합치지 않는다.

## 9. 진행률과 실제 잔여

**공지 약 85%, 고객센터 약 85%: 개발 완성도 추정이며 QA 수락률·운영 준비율·앱 전체 개발률이 아니다.** 공지는 이번 새 기능 변화가 없어 이전 85%를 유지한다. 고객센터는 이전 약 80%에서 조회 비의존 worker·공용 목록/API target 경계를 보강했으나 운영 통합과 공개 게이트가 남아 약 85%로 판단한다. 수락 행을 분모에서 빼 계산한 비율이 아니며 절대적 정밀 수치로 사용하지 않는다.

| 영역 | 해결/재사용 | 남은 필수 작업 |
| --- | --- | --- |
| 공지 | 화면, 관리자/사용자 실제 격리 API, 작업본/공개본, 관리 권한, 읽음·기간·고정 계약 | 운영 capability 매핑·배포 승인, 실제 공개 내용 검수, 긴 목록 위치/기간 전환 기기 경계, Release/구버전/비활성화 검사 |
| 고객센터 | 등록·제목·유형·사진, 내역/문의방, 담당·답변·읽음, 독립 로컬 전달과 공용 feed/target | 운영 공용 backend/resolver/배지 통합, foreground/재접속 및 계정·권한 상실 조합, 운영 사진·worker 배포/관측, 전체 finalizer, Release 경계 |
| 구독 | 누리 디자인·메뉴·왕관·가격·상태별 개발 화면 | 실제 상품과 결제 시스템 전부. 개발 편의 화면을 실서비스 entitlement로 사용 금지 |

운영 결정은 한 묶음으로 PO에게 인계한다. 운영 관리 capability와 주/대체 담당, 공식 연락 채널·응답 책임·휴무, 본문/사진/감사/백업별 보관·파기 기간, worker 실패 큐 확인 주체·실행 환경이 필요하다. 미결정 상태에서는 운영 문의 수집·응답 시간 약속·자동 파기를 열지 않는다. 실결제와 OS push 확대는 독립 후속이다.

## 10. 다음 액션

다음 한 단위는 **운영에 배포하지 않고 격리 환경에서 공용 알림 backend/resolver의 정식 통합 및 홈 배지 계약을 완성하는 것**이다. 이번 source adapter·기존 공지/개인 알림 계약을 재사용하고, 다른 소유자 알림을 섞지 않으며 문의 source의 읽음/삭제/retention 의미부터 고정한다. 단순 공통 화면 공유를 운영 통합 완료로 부르지 않는다. 이번 마감 뒤 자동 착수하지 않는다.

| 우선순위 | 원래 작업 번호 또는 범위 | 작업 | 선행 조건 | 담당 | 필요한 입력 | 완료 기준 | 현재 시작 가능 여부 | Astra 권장 추론 강도 | GPT-6.1 Sol 권장 추론 강도 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | E / NURI-15 | 격리 공용 backend·resolver·배지 정식 통합 | 이번 증거 재사용·운영 무변경 | Master | source별 읽음·삭제·retention 계약 | 혼합 목록/배지/target·계정 경계 증거 | 다음 지시 대기 | High | High |
| 2 | E / NURI-15 | 운영 결정·서비스 배포 계획·Release 도달 경계 | 위 계약과 운영 결정표 | Master·PO | 담당·연락처·보관·배포 책임 | 공개 가능한 경계와 미공개 기능 분리 | 결정 전 운영 공개 불가 | High | High |
| 3 | C | 튜토리얼 | E 마감·착수 지시 | Master | 실제 공개 화면·주제 | 안내·복귀 확인 | 대기 | Medium | Medium |
| 4 | D | 반응형 글꼴 제한 시범 | C 이후·대상 확정 | Master·PO | 폭/fontScale·시각 확인 | 제한 영역 검증 | 대기 | Medium | Medium |

기존 통합 4/7, OS13/13·기록4/4 내부 QA 동결, 월간요약·함께한 달 PO 보류, P0 stability/final PARTIAL·SU-544458 대기, C0 미동결·STORE HOLD를 유지한다. 모델·추론·전역 설정 변경 없음. U1/NAV/C0·신규 기획은 자동 시작하지 않는다.

## 11. 새 설치본·실기기 실행 영수증

| 필드 | 이번 실제 기준 |
| --- | --- |
| 제품 입력 | 시작 HEAD + 보존 working bytes. `source-input.json`의 1,440파일 hash를 빌드 중 고정 |
| 검증 APK | `~/.codex/n15-local/common-inbox-PwbibW/n15-common-inbox-dev-bundled.apk` |
| APK SHA-256 | `e9f621deb53adfd10739f02a65b76b45c0838fd7b1e9a8bb961b918304e7c433` |
| 내장 번들 SHA-256 | `4d71449dd9726ec85c2d857bd298e22c19b825fc20a8f342c4dbe0bd860ee63b` |
| 기존 복구 APK | `~/.codex/n15-local/n15-followups-dev-bundled.apk`, `21f5b278415e8be1f9d49e93ceab6cba02b0abcf93ea46169ca75e43e54ef6b8` |
| 기존 번들 | `adad8c04239a6ffc6b2d27aea7361e63fd37cec266cc5c392efb7659f8e48f32` |
| 서명 | 두 APK 동일 `08efb41ea4729792ce9fc3d242be9704e84a8ea3eadcbbcf1c8426884db689d3` |
| 대상 | 실제 Galaxy S25 Edge / SM-S937N, `com.nuri.app`, 내부 Debug·devEnabled=true |
| 설치 | 2026-11-14 00:48:55 KST update, 기존 firstInstall 2026-06-02 19:16:57 유지. `install -r` 성공 |
| 실행 모드 | Metro 8081 종료·대상 reverse 제거 후 내장 번들 실행. Release 성능·공개 수락 아님 |

APK는 build 출력 밖 독립 파일로 복사하고 inode·전체 hash 일치를 확인했다. 동일 package·서명으로 데이터 보존 설치했고 uninstall·clear·downgrade는 하지 않았다. 설치 전후 영수증은 `install-before.json`, `install-after.json`, `artifact.json`에 있다. 실제 serial·인증 자료는 공개 문서에 복제하지 않는다.

이번 APK에는 전달 대상 밖의 기존 로컬 디자인 입력도 포함되어 있다. 따라서 아래 선별 commit SHA 하나를 APK 전체 입력 SHA라고 표시하지 않는다. 관련 소스의 파일별 동일성은 보존 manifest로 추적하고, 무관한 dirty는 Git에 편승시키지 않는다.

### 11.1 지정 알림 한 건의 실제 시간순 결과

- 합성 문의 `72050b3f-9aaf-4648-8f07-9002d03b0859`, 답변 event `668a314c-55dc-4ef0-8ba2-3c3beb252e6d`. 정상 사용자 API 등록·관리자 claim/답변으로 준비했다. 새 문의 등록 자체를 이번 앱 UI 수락으로 계산하지 않는다.
- event는 UTC `2026-11-13T15:38:02.515036Z` 생성, 별도 worker가 `15:38:03.200560Z` 전달했다. 그 사이 문의 알림 조회가 없다는 전달기 기록과 DB 전달 행이 일치한다.
- 새 APK에서 기존 알림함의 DEV 격리 진입 → 정상 로컬 Auth → 미읽음 1개 → 정확한 문의 제목/본문/답변 → 표시 후 reader cursor 2 → Android Back → 동일 행의 읽음과 미읽음 0개를 확인했다.
- page/target 사전 조회는 읽음을 변경하지 않았다. read는 실제 답변 표시 후에만 갱신됐다. 타 계정 target 404·목록 제외, 익명 401, 잘못된 limit 400은 서버 API 검사이고 별도 기기의 타인 화면 수락이 아니다.
- `common-inbox-unread.png`, `common-inbox-target.png`, `common-inbox-read.png`는 비공개 로컬 root의 대표 화면이다. 글라스 알림 행·공통 목록, 문의/답변 구분, Back 후 읽음 변화를 육안 확인했다. 모든 화면·프레임의 무플리커 수락은 아니다.

### 11.2 정리와 보호

이번 문의 한 건의 정확한 owner·ID로 원본과 종속 시험 자료를 정리했다. 삭제 후 target 404, 기존 문의/메시지/읽음/outbox·공지/공개본/읽음·capability·사진 metadata의 비교 hash 일치를 확인했다. 기존 합성 계정은 재사용하므로 삭제하지 않았고 감사·request 결과도 보존했다. 새 사진 업로드나 기존 알림 읽음 일괄 변경은 없었다.

격리 세션은 정상 local logout, 시험 worker와 전달기는 정확한 PID로 종료, S25의 56323 reverse만 제거했다. 8081도 이번 Metro 종료에 맞춰 제거했으며 다른 기기의 설정은 건드리지 않았다. 기존 운영 연결 세션과 시작 Home·선택 상태로 돌아왔다. 기존 로컬 DB 스택과 후속 재사용할 신규 정의는 유지했다. 운영 데이터 수정·발송·권한 변경은 없다.

## 12. 공간·전달·확인 한계

| 측정 | bytes | GiB | 판정 |
| --- | --- | --- | --- |
| 빌드 전 정리 시작 | 25,830,592,512 | 24.057 | native build 차단 |
| 승인 캐시 정리 후 | 31,557,586,944 | 29.390 | 25 이상, 35 목표 미달 |
| 실제 build guard 직전 | 31,556,481,024 | 29.389 | 최소 기준 충족, 빌드 허용 |
| 빌드·실기기 종료 후 보고 | 26,657,419,264 | 24.827 | 다음 build 전 정리·재측정 필요 |

첫 정리 대상은 `/Users/shinjaejun/.gradle/caches/9.4.1/transforms`(논리 3,323,352,911 / 할당 3,132,071,936 bytes), `/Users/shinjaejun/.gradle/caches/build-cache-1`(논리 2,556,608,973 / 할당 2,563,637,248 bytes)였다. 기존 도구의 비사용·경로·보호 검사를 거쳤고 다운로드 원본·키·APK·증거는 삭제하지 않았다. 실제 가용량 증가는 5,726,994,432 bytes(약 5.334 GiB)이며 시스템 활동이 함께 있어 디렉터리 합과 같은 회수량으로 단정하지 않는다. 실행 영수증은 `~/.codex/nuri-disk-runs/run-xvg0xubk.jsonl`, build gate는 `run-1jqal92e.jsonl`이다.

마감 시에는 증거 보존·Git 전달 뒤 현재 사용하지 않는 `build-cache-1`만 다시 검증해 정리한다. 현재 보고 크기는 논리 876,612,694 / 할당 879,075,328 bytes이며 APK·검사 보고서가 없는 재생성 캐시다. 새 transforms·현재 증분 출력은 후순위로 유지한다. 최종 공간·실제 삭제 결과는 비공개 `common-inbox-PwbibW/closeout.json`과 최종보고가 소유한다. 35 GiB를 달성했다고 미리 표시하지 않으며 다음 native build는 그 직전 실측이 필요하다.

이번 전달은 공지·고객센터·구독의 기존 미전달 관련 구현, 이번 공통 feed/API 변경, 관련 검사·기획·작업보고와 메모리 선택 구간이다. 홈 기록·툴바 아이콘·놀이/장소 화면·기존 수락 원장·CLI metadata 등 무관한 dirty는 보존·제외한다. 메모리는 전체 파일 전달이 아니라 신규 마감 구간만 전달하므로 로컬 과거 기록까지 원격에 모두 있다고 표현하지 않는다.

전달 후보 목록/hash, 실제 staged/commit diff, normal push·원격 고정 tree 비교와 동일 SHA 필수 CI 결과는 `delivery-candidate.json` 및 `delivery.json`으로 연결한다. 이 보고서에 최종 SHA를 다시 넣기 위한 반복 commit은 하지 않는다. CI 성공은 새로운 운영·제품 E2E 수락이 아니며 실제 결과는 최종보고에서 확정한다.

**해결:** 격리 공통 목록/target·독립 전달·새 Metro OFF 지정 경로·시험 자료 보호. **진행:** 이 문서 작성 시 선별 전달·동일 SHA CI·마감 공간 정리. **잔여:** 정식 혼합 backend/resolver/홈 배지, Release·운영 결정·배포, 실제 결제. **잔여 해결 계획:** §10 첫 작업 한 단위만 다음 지시로 시작하고 현재는 종료·대기한다.
