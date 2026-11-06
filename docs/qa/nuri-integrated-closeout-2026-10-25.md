# NURI 통합 마감 수락 원장

<!-- OS10_BIRTHDAY_20261106_BEGIN -->
## 2026-11-06 생일 모달 완료 후 OS10 재개: 부분 완료

### 결론과 증분

**생일 모달의 이번 디자인 보정·물리 설치 확인 완료. OS10은 PARTIAL, OS13 PASS·OS12/13·통합2/7·기록0/4·전체 미동결·STORE HOLD 유지.** 최신 PO 지시의 순서대로 생일 모달을 마친 뒤 OS10을 실행했다. Master 단독이며 기본 cwd의 Room B나 다른 checkout은 수정하지 않았다. 아래 과거 절의 생일 미생성/ActivityResult 관측0/실제 FCM 미수신 상태는 당시 이력이다.

증거 루트: `/Users/shinjaejun/.codex/nuri-os10-birthday-20261106/`. 이번 실기기 원복·운영 표본 종료는 **15:25:00 KST /06:25:00 UTC**다. Git/CI 종료는 뒤의 `git-delivery.json`을 따른다.

| 기존 ID·조건 | 직전 | 이번 실제 결과 | 현재 판정·한계 |
|---|---|---|---|
| 추가 승인 생일 모달 | 이미지/닫기/문구/글꼴 조정 중 | 사료·케이크·껌·장난감·리본·하트와 누리 심볼, 오른쪽 X, 실제 이름15sp·제목22sp. 강제 귀여운 글꼴 제거, 선택된 Pretendard/귀염뽀짝체를 공통 AppText로 존중. 물리 Pretendard·긴 QA 이름·X·추억 목적지 확인 | 이번 UI 보정 PASS. 두 글꼴은 단위 검사, 두 번째 글꼴의 실기기 렌더링까지 주장하지 않음 |
| U1/OS10-A 미소비 이전 인증 | BLOCKED_TEST_CAPABILITY, ActivityResult 관찰0 | 실제 Kakao Auth Tab RESULT_OK1개를 교환 전247.620초 보류. nativeBusy=true·두 CTA disabled·교환0. 원래 callback/result 반환 후 교환 성공1·인증 route1·Kakao Home/등록 | 관찰 수단 확보 PASS. A 보류 중 정상 B 시작 전제는 불성립하여 **BLOCKED_NORMAL_FLOW_APPLICABILITY**. A→B→늦은A 수락은 아님 |
| OS10-B 이전 수신자의 실제 FCM | 수동 RemoteMessage 경계만 PASS | 실제 worker/FCM→SDK 원본1개 수신 후 앱 dispatch만490.766초 지연. 정상 Google 전환 후 동일 Intent 반환/Task 성공. 현재 owner·native27·snapshot 시각·OS 목록·Home·다른 설치 불변, 이전 read_at=null | **PASS: 실제 FCM + 통제 앱 처리 지연 경계**. 제공자 내부 운송 지연이나 자연 발생 지연이라고 보고하지 않음 |
| U2 정상 생일 원본 | 시험 아이 승인 대기 | 승인 아이1개 정상 생성, PO 후속 승인에 따라 해당 QA 아이만 당일 생일로 잠시 변경. 정기 scheduler가 정상 pets 원본 생성·worker accepted1·OS 요약→알림함→목적지→읽음·Back | 원본/전달/기존 OS 연결의 한정 증거 확보. 최신 개별 생일 OS 행의 정기 수신은 아래 준비 상태로 잔여 |
| 추가 승인 개별 OS 목적지 | foreground는 요약만 표시 | 실제 QA transport 생일1개로 개별 제목/본문·OS 탭→생일 모달·서버 읽음 확인. foreground는 무음, 기존 배지 snapshot 유지 | 개별 표시 경로 PASS. 정상 scheduler 원본으로 합산하지 않음 |
| P0 | core/source/runtime PASS, stability/final PARTIAL | 기존 계약 불변. 이번77.881분 DB표본 commit+14623/rollback+1, reset 불변·30초 초과 client0 | 기존 판정 유지. rollback1 원인 미귀속, CPU/메모리/Swap 신규 계측 없음 |

직전 OS10 미완료의 두 대표 조건 중 실제 FCM 처리 경계1개를 닫았고, 인증1개는 도구 차단에서 정상 흐름 적용성 판단으로 바뀌었다. 신규 OS 분모를 추가하지 않았다. 기존 D/F/K/L-GLOBAL·등록 Promise178초·이전 PendingIntent·소비된 callback·OS12/13은 관련 방어 입력 불변으로 재사용한다.

### 인증과 FCM의 실제 실행 경계

1. `FlowProbe`v17은 lifecycle observer의 실제 Auth Tab callback을 ON_START 전에 관찰한다. 기존 transient registry map 관측0을 그대로 반복하지 않았다. 06:13:32.075Z 실제 성공 결과1개를 메모리에 보류했고 code/URI/PKCE/JWT 원문은 저장하지 않았다. `auth-held-state.json`에서 OAUTH_INTENT_STARTED/PENDING_FLOW_READY까지만 있고 CODE_EXCHANGE_STARTED는0이다. `auth-unconsumed-held.png`와 native status에서 Kakao 처리 중·Google disabled·authTabRequest 유지다.
2. 현 `MainActivity.openOAuthTab`의 단일 authTabRequest, JS oauthStartInProgress, SignIn submittingRef가 직렬화를 보장한다. 결과를 보류한 순간 공식 탭은 이미 닫혀 정상 취소 버튼이 남지 않았으며 B를 시작하려면 이 잠금을 인위적으로 변경해야 한다. 그 조작은 하지 않았다. 06:17:39.695Z **같은 원래 callback과 결과**를 반환한 뒤 CALLBACK_RECEIVED/PENDING_FLOW_VALIDATED/교환 성공/세션/인증 route 각1회, Kakao owner/누리 Home을 확인했다. 그 뒤 정상 logout→공식 Google 선택→Google Home/등록도 성공했다. 정상 새 시도는 이전 완료 뒤에만 입증했고 같은 제공자 A/B 겹침·fallback은 미입증이다.
3. 권장 판단안은 **지원 Auth Tab 환경은 미소비 A 보류 중 B 시작 불가라는 적용성 근거를 인정하고, 도달 가능한 취소·사용 완료 결과·중복 앱링크는 기존 PASS를 연결**하는 것이다. 이는 PO 판단 대상이며 자동 PASS/조건 삭제하지 않았다. unsupported fallback까지 같은 결론으로 확대하지 않고 기본 브라우저 변경·새 인증 구조·busy 해제는 하지 않는다.
4. 실제 QA 알림 `b546000b-61d8-4b0c-86c7-508a83630c31`은 worker accepted1/물리 receipt1이다. SDK가06:12:01.175Z 받은 원본 Intent를 owner 검사 이전의 Firebase bind dispatch에서 한 번만 보존했다. TTL844초·expires06:26:04.767Z·notification payload 없음·최초 recipient=Kakao를 확인했다. SDK Task는 즉시 정상 반환해 메인 스레드/서비스 callback을 계정 전환 내내 붙잡지 않았다.
5. 06:19:57Z Google Home·server/native Google owner·미읽음27 확정 후06:20:11.941Z 원래 handler에 동일 Intent를 넘겼고06:20:11.963Z 완료/성공을 관찰했다. 만료 이전이고 이후 Google owner/count27/observedAt1793945983393·OS summary만 존재·Googleet Home·다른 설치 last_seen11/05 12:39:26.497816Z가 불변이다. 이전 Kakao read_at도null이다. NuriPushService는 recipient mismatch에서 expiry/표시/snapshot 전에 반환한다. 정상 전송·실제 SDK 수신·원래 handler 완료를 연결했으므로 메시지 미도착을 차단 PASS로 오인하지 않았다.
6. `flow-v17.log`의 FCM detail.delayMs=399866은 Auth hold와 공유한 타이머 탓에 과소 표기됐다. **원본 로그를 수정하지 않고**, FCM captured/dispatch의 wallMs와 uptime 차이에서490766ms를 계산해 `final-evidence.json`에 명시했다. 로그 수치 하나를 실제 운송 지연으로 쓰지 않는다. 원문 Intent/result는 프로세스 메모리에서만 유지했다.

### 생일 계약·모달·실제 원본

- PO가 승인한 권장 방식은 **사용자 시간대00:00 인앱 생일 생성,09:00 외부 푸시**다. 신규 migration `20261106050544_notification_birthday_midnight_inbox`만 적용했고, 기존 migration/cron/RLS/권한/QA cohort/Edge를 변경하지 않았다. scheduler 함수의 signature·SECURITY DEFINER·빈 search_path·ACL을 보존했다. 실제 정의 hash는 `64da20a3981d98992a5b9d08bfa6af07`, 적용 확인05:07:06.297Z이며 파일명 시각을 배포 관측 대신 쓰지 않는다.
- 정상 원본은 시험 아이 `569a0e07-1dab-4823-b748-2da5f38448ff`, Kakao QA 소유,04:52:39.668247Z 정상 생성이다. 당일 시험으로 생일2025-11-06을 정상 UI에서 저장한 뒤14:07 KST 정기 scheduler의 복구 창으로 알림 `10e27831-d9b9-4182-9b2f-7f6c71af5e2d`가 생성됐다. source=pets, version2025-11-06:2026, 인앱 available11/06 00:00 KST, push available09:00, expiry11/07 09:00, attempt1/physicalaccepted다. 정각00시/09시 수신 관찰은 아니다.
- 당시 구제품의 foreground 요약 OS→알림함 선택→기존 QA 아이 Timeline→read_at05:08:46.126684Z→Back을 연결했다. 새 개별 OS UI는 별도 QA transport `6835ab57-a128-428d-b2fd-6025d4a77f24`에서 확인했다.05:53:15.597254Z 서버 읽음과 OS→모달을 연결하며 두 원본을 합치지 않는다. 마지막7fbb00b는 같은 정상 생일 row의 모달 표시·닫기·CTA를 재확인했지만 이미 읽은 행이라 새로운 읽음 증거가 아니다.
- 초기 이미지 intrinsic 크기로 패널 내 빈 공간이 생긴 결함은240dp 양축 제한과 scrollable modal로 수정했다. latest PO의 ‘폰트 스타일은 바꾸지 말라’를 반영해 jisu 강제 override4개를 제거했다. 실제 이름을 그대로 사용하며 ‘QA 아이’ 같은 접미어를 제품에서 붙이지 않는다. 초기 QA transport의 잘못된 임시 제목은 생성 도구 문구였고 정상 scheduler 제목은 실제 pet.name 기반이었다. 해당 QA row는 정상 UI로 개별삭제했다.
- 최종 캡처 `birthday-user-font-visible.png`는 실제 Pretendard·이름15/제목22/본문15/CTA16sp·오른쪽X·이미지와 문구 잘림 없음이다. `birthday-user-font-final.png`는 비동기 모달 표시 전 알림함이므로 모달 증거로 사용하지 않는다. profile edit 완료 화면은 활동칭호 읽기 토큰으로 맞췄고 실제 날짜 복원 저장 뒤 `profile-edit-done-final.png`로 확인했다.
- 시험 아이 생일은 정상 UI로 **2025-11-07**로 복원했고 입양일2026-11-06·원래 누리 선택을 유지했다. 다음 정상 인앱 생성 가능 시각은11/07 00:00 KST, 외부 푸시는09:00 KST, 기존 복구 종료11/08 09:00 KST다. 새 후보의 정상 개별 생일 OS 행→모달→읽음 후속은 그때 확인한다. 읽음/삭제된 알림의 푸시는 기존 lease가 억제하므로09시 전에 시험 알림을 미리 읽거나 삭제하지 않는다. 새 예약/자동화/대기는 만들지 않았다.

### P0 관측과 제공자 문의 초안

고정 창11/04 19:01:13~11/05 19:01:13 KST의 기존 자료와 버전 구분을 재사용한다. devicev5/v6·workerv2/v3 구간과 창 이후v4를 합치지 않는다. 이번 DB05:07:06.297~06:24:59.146Z는 별도77.881분 표본이며 rollback+1≈0.000214회/초, commit+14623, 연결24·장시간 client0·stats_reset2025-12-08 불변이다. 해당rollback의 정확한 요청 원인은UNKNOWN이다. 이전40001 폭증 재현으로 단정하지 않으며 이번 전구간 로그0건을 주장하지 않는다. raw CPU/실메모리/commitment/Swap/OOM의 신규 시계열은 미확보다. 과거502의 원인·영향·복구UNKNOWN, SEVERE·Swap523.86MB·고정 창 계측 공백은 남는다.

**발송 대상/초안: Supabase 공식 Support, 미발송.** 프로젝트 `grmekesqoydylqmyvfke`, 사건2026-11-04 10:08:00.104 UTC(19:08 KST), notification-worker-v3 HTTP502/기록11ms. 확보된 gateway/request 고유 ID 및 execution/deployment 연결은UNKNOWN이며 만들어 넣지 않는다. 질문: 해당 시각의 gateway→execution 연결, isolate boot/종료/OOM·함수 진입 여부, claim 이전/이후 및 lease 재처리 추적 자료가 존재하는지, 고정 창의 cron dispatch1440/worker HTTP1423 차이17 설명, raw CPU User/System/IOWait와 실제 메모리/commitment/Swap IO/OOM의 구분 자료를 요청한다. 후속200이나 빈queue로 과거 작업 복구를 입증하지 않았음을 명시한다.

최소 첨부안은 기존 `nuri-os-required-20261105/operating-evidence-start.json`의 사건·집계 부분, `acceptance.json`의 고정 창 버전/공백 부분, `nuri-os-boundaries-20261106/operating-evidence.json`의 후속 구간 부분이다. **원문 전체 파일을 바로 보내지 않고** 발송 승인 시 사건 시각/상태/계측만 추려 토큰·쿠키·개인정보·소유자ID를 제외한 첨부를 만든다. 지원 발송/위험 수용은 PO 결정이며 플랜 변경·재시작·프로세스 종료는 실행하지 않았다.

### 소스·검사·설치·정리

- 제품HEAD `7fbb00b6b101e2fc7b753005ceeb4acab1faa507`, tree `2652783572b695aabe594e8bf1e94bcf82a92074`, runtime `91ef95722c3c15548762126cd4f809672c5d91bcff2dfc82370a18279a7a81cf`, APK `2a42411fba1f4ba293efb93fc4eb95d60d04a0aa2046a3bd0852e0b099f9470f`다. `delivery-birthday-font-preference/{build-result,installation}.json`과 연결한다. 이전832e1a7/8ebd538/fef5e83 캡처는 해당 후보로만 해석한다.
- 로컬 전체348 suites/4666 PASS는 기능 후보 검사, 이후표적4suites24 및 글꼴설정2suites18 PASS·타입·대상lint·source/secretguard PASS를 연결한다. SQL 격리65/65 PASS에는 midnight/09시 lease·DST·중복·기존OFF·권한이 포함된다. watchman recrawl/Gradle deprecation은 기존 경고로 보존하며 경고0이라고 하지 않는다. 최신 제품의 원격 CI [42174362769](https://github.com/jaejun0617/nuri-app/actions/runs/42174362769)는06:29:45Z **success**, 전체348 suites/4667 PASS·핵심12suites132 PASS·TypeScript/secret/source guard PASS, 전체lint0오류23경고다. `product-ci.json`에 실제 결과를 보존했다. 문서 CI와 앱 제품SHA는 분리하며 후속 결과는 `git-delivery.json`을 따른다.
- 물리 SM-S937N bundled Debug/Metro OFF·서명/UID10402/최초설치/권한hash/기존데이터/네트워크/density450/fontScale1 보존이다. 에뮬레이터01d78a3는 새 UI 수락에 쓰지 않고 Google 독립등록의 owner/status/last_seen 보존만 확인했다. devicev6/workerv4 그대로며 웹/인증 설정 변경0이다.
- 종료 시 물리 Kakao/누리 Home·globalON·OS권한ON, Google 물리등록 정상logout revoked·다른Google설치 active 보존이다. QA transport2개만 정상 개별dismiss, 정상 생일 원본/시험아이/기존자료는 후속 확인을 위해 보존했다. 홈 생일 표시이력은 presentation-only이며 canonical읽음과 다르다. 칭호 trigger/audit 부수 효과의 완전 원복은 미확인이라 임의 삭제하지 않았다.
- `FLOW_CLEANUP` 이후 보조패키지 제거·명령표식ABSENT·훅/메모리해제·앱정상재실행을 확인했다. instrumentation 종료는 의도한 프로세스 종료이고 자연충돌로 계산하지 않는다. 최초 스크린샷1MiB buffer초과는 도구 준비 문제로24MiB 보완, 잘못된Activity명 실행1회는 올바른 com.nuri.MainActivity로 정정했다. 제품 FAIL/화면튐으로 집계하지 않는다.
- 기존14개 dirty 및 미추적문서/이미지, 원본checkout181개dirty를 보존했다. 제품20파일만 기존브랜치 정상push, 문서는 이번 marker6개만 선택stage한다. release의 역사snapshot은 소급수정하지 않고 현재 판정은 본 원장에 둔다.

### 해결·진행·잔여·다음 실행

해결: 생일 UI 보정·선택글꼴 준수·개별OS 목적지 표시, 정상생일원본 복구창 생성/전달, 실제FCM의 이전수신자 앱처리 경계, 제품 일반push/동일SHA CI success. 진행: 이번 문서 증분 전달/자동 CI 회수. 잔여: OS10-A 적용성 판단, 다음 정상생일 개별OS 후속·fixture정리, P0 제공자자료/위험판단. 단위/SQL계약·QAtransport·정상원본·통제callback은 각각 분리했다.

| 우선순위 | 원래 작업 번호 또는 추가 범위 | 작업 | 선행 조건 | 담당 | 필요한 입력 | 완료 기준 | 현재 시작 가능 여부 | Astra 권장 추론 강도 | GPT-6.1 Sol 권장 추론 강도 |
|---|---|---|---|---|---|---|---|---|---|
|1|U1·OS10-A|Auth Tab의 미소비A/B 조건 적용성 판정|위 실제 직렬화/정상A완료 증거|Master, 판정PO|지원 환경의 도달불가 인정 여부. fallback의 별도 준비환경 필요 여부|원장필수조건을 명시적으로 판정, 임의PASS금지|판단안 준비완료, 동일시험 반복안함|High|High|
|2|U2 생일|정상 정기원본의 최신개별OS·모달·읽음·Back 후 정리|보존QA아이/미읽음 새원본/권한ON|Master|시각도달 후 실행.09시전 시험알림 읽기금지|정상원본ID→FCM→개별OS→모달→읽음 연결|11/07 00시인앱·09시푸시부터, 예약미설정|Medium|Medium|
|3|P0 안정성|502·SEVERE·Swap·공백 문의/잔여위험 판정|새 제공자자료 또는 명시적위험판단|Master, 승인PO|위 공식지원 문의 발송 승인|확보가능자료/회수불가범위 구분·판정|본문/첨부선별안 준비, 미발송|Medium|Medium|
|4|기존1~6·NAV 및7~14|이후 우선순위 결정|이번 OS잔여 판정|PO|별도실행지시|기존 단일원장 기준|자동시작안함|Medium|Medium|

정확한 다음 실행은 OS10-A의 적용성 판단 또는11/07 09:00 KST 정상생일원본 조회→실기기 OS행 탭이다. 자동 재개/예약 관측은 없다. OS13 PASS, P0 core/source/runtime PASS, stability/final PARTIAL, 전체 미동결·STORE HOLD. 실제 모델/추론설정은 미확인이며 전역설정 변경0이다.
<!-- OS10_BIRTHDAY_20261106_END -->

<!-- OS_BOUNDARIES_20261106_BEGIN -->
## 2026-11-06 OS 경계 검증 증분: OS13 수락, 전체 부분 완료

### 결론과 비교 단위

**OS 영역 PARTIAL, OS13 PASS, OS10 BLOCKED_TEST_CAPABILITY의 잔여 유지, 전체 미동결·STORE HOLD.** 최신 PO 보정 지시에 따라 Master 단독으로 수행했다. 기존 문서33973ba 이후 제품 변경0, 서버 변경0, 앱 빌드·재설치0이다. QA 도구만 수정·보존 설치 후 제거했다. 다른 통합 도메인·디자인·P1/P2·원래7~14는 시작하지 않았다.

증거 루트는 `/Users/shinjaejun/.codex/nuri-os-boundaries-20261106/`다. 기존 `nuri-os-required-20261105`와 원장의 완료 증거를 재사용한다. 실제 기기 시험 종료 및 원복 확인은 **2026-11-06 12:51:45 KST / 03:51:45 UTC**다. 문서 전달/CI 종료 시각은 이 뒤의 `git-delivery.json`을 따른다.

기존 OS 묶음의 직전 미완료는 OS10·OS13 두 개, 이번 완료는 OS13 한 개, 현재 미완료는 OS10 한 개다. **OS11/13→12/13**, 통합2/7·기록0/4는 그대로다. 생일은 기존 U2 업무 원본의 OS 후속 미완료이며 새 OS 분모를 만들지 않는다. 새 제품 결함 확인0, 제품 변경으로 인한 재검증0이다.

| 기존 ID·하위 조건 | 기존 충족 범위 | 이번 실행·관찰값 | 판정·잔여 |
|---|---|---|---|
| OS13 연속 입력·독립 중복 알림 진입 | 실제 OS75ms 간격2입력, cold/warm·실패·취소·동일 알림 재시도·읽음·Back | 실제 수신 알림의 PendingIntent를 보존해 두 번 send. MainActivity 진입도 각각1회, 상세1개·동일 서버 읽음·Back1회 Home | PASS. 자연 발생 callback 중복이 아니라 통제 재전달임을 명시 |
| OS10 이전 PendingIntent | 직전 instrumentation 종료로 최종 UI 미확인 | 같은 PendingIntent를 Google 전환 후 재전달. native 진입1회 뒤 Google 홈·미읽음27·owner 유지, 이전 Kakao read_at 불변, 다른 설치 보존 | 해당 하위 조건 PASS |
| OS10 원래 등록 Promise 늦은 완료 | D/F는 plain client 서버 dispatch만 PASS | 앱이 만든 Kakao register의 실제200 응답을178.197초 보류 후 원래 interceptor chain으로 반환. 그 사이 정상 logout/Google 로그인. 이후 대기 중 Google register200·Google owner 확정 | 해당 하위 조건 PASS. 원래 response object 반환이며 별도 재전송 아님 |
| OS10 해제의 늦은 완료 | F 서버200/revoked0·현재/다른 설치 보존 PASS | 기존 performLogout이 revoke Promise를 기다린 뒤 로컬 logout/다음 로그인을 허용하는 직렬 경계 확인 | 원래 revoke 완료 전 새 owner를 만드는 정상 UI 전제는 성립하지 않음. F 서버 수락 보존, 별도 UI 지연 PASS로 확대하지 않음 |
| U1/OS10 인증 중복 | 정상 제공자→PKCE→세션→Home | 실제 Kakao 복귀 Intent를 보존, 동일 URL 앱 진입2회 추가. PKCE HTTP1회, CODE_EXCHANGE_SUCCESS1회, ROUTE_TARGET_AUTHENTICATED1회 | 통제 앱링크 중복 방지 PASS. Auth Tab ActivityResult 자체의 재전달 수락은 아님 |
| U1/OS10 취소·이전 인증 결과 | 기존 정상 취소·재시도 | 정상 logout→Google 공식 화면 Back 취소→이전 사용 완료 Kakao callback 재전달. 추가 교환0, CALLBACK_REJECTED→익명 로그인 화면. 새 Kakao 정상 재시도 후 이전 결과 재전달도 거부·현재 세션/Home 보존 | 소비된 이전 결과 하위 조건 PASS. 아직 소비되지 않은 이전 시도의 실제 인증 결과 지연은 BLOCKED_TEST_CAPABILITY |
| OS10 이전 FCM·snapshot | 실제 FCM 정상 수신·cold metadata·정상 전환·dismiss PASS | Google owner 상태에서 실제 NuriPushService 수신 핸들러에 이전 recipient 입력. badge owner-mismatch/stale/expired-snapshot, 현재 native27·화면·서버 상태 불변 | 통제 native 처리 경계 PASS. 실제 FCM 운송 지연 E2E는 NOT_RUN이며 대체하지 않음 |
| U2 생일 OS | 기존 계약·원본 일부 및 이번 운영 scheduler 정의 | 기존 QA 생일10/14·10/21·10/28, 현재 정상 복구 창에 해당 원본 없음 | BLOCKED_PRECONDITION. 새 시험 프로필 승인 범위 미확정, 아래 구체안만 준비 |

OS13은 알림 PendingIntent 중복·오래된 알림 진입·목적지 수명 조건으로 닫는다. 아직 미소비 OAuth 결과의 현재 시도 오염 위험은 U1/OS10에 그대로 남기며 OS13 성공으로 대신하지 않는다.

### 실행 경계와 근거

1. **실제 전달과 통제 재전달:** QA transport `eff62ec8-b77d-4d56-be40-a0cd526ed407` 한 건만 생성했다. 정기 worker/FCM accepted1회, 실제 OS 알림의 contentIntent를 확보했다. uptime179493458/179503523의 send에 각각179493466/179503530의 MainActivity 진입이 대응한다. 약10초 간격이며 동시 입력으로 표현하지 않는다. read_at은03:24:21.884455Z 한 값, 최종 상세는 `duplicate-tap-detail.png`, Back은 별도 실제 UI 관찰이다. `os13-duplicate.mp4`32.458초/324 encoded VFR frames를6개 contact sheet로 모두 수동 검토했다. 첫 진입의 기존 Home→상세 전환과 약1.3~6.1초 구간의 상세 로딩 뒤 콘텐츠 확정을 관찰했다. 두 번째 전달 후 잘못된 중간 Home·중복 상세는 관찰되지 않았다. compositor 전체 프레임/자동 시각 PASS가 아니다. 좁은 구간의 detail HTTP200과 서버 읽음은 `operating-evidence.json`에 연결한다.
2. **이전 알림의 처리 종료:** Google 전환 후 uptime179748172에 같은 실제 PendingIntent를 보내179748176의 세 번째 진입을 확인했다. `old-pending-google-home.png`와 `after-old-pending-and-native.json`은 Googleet 홈·native27·Google owner를 보존한다. 현재 로그인 화면으로 잘못 이동하거나 Kakao 내용을 열지 않았다. 소유 차단은 읽음이나 기존 서버 데이터를 변경하지 않았다.
3. **원래 응답의 늦은 반환:** `instrumentation-v12.log`에서 서버200179547689→hold179547690→정상 revoke200179613227→Google 실제 PKCE179672885→원래 response 반환179725887→Google register200179727707 순서다. `before-original-response-release.json`에서 Google 홈은 이미 표시됐지만 등록 직렬 큐가 기다려 native owner는null이었다. `after-original-response-settled.json`에서 Google 소유/등록이 확정됐다. `google-before-late-completion.png`는 이름과 달리 release 명령 뒤 캡처이므로 반환 전 화면 증거로 쓰지 않는다. 이전 응답이 Kakao를 다시 bind하지 않았고 다른 Google 설치의 last_seen은 그대로였다. 정상 logout 성공으로 이전 세션을 무효화한 시험이므로 기존 D의 유효 이전 세션409와는 다른 조건이다.
4. **인증 중복/늦은 소비 결과:** `instrumentation-v14.log`의 실제 Activity Intent 캡처1회는 delivery 횟수가 아니다. 이후 controlled send4회는 실제 앱링크 진입 각각에 대응한다. 처음2회는 원래 callback 후60초 안이며 `auth-trace-v14-duplicate.json`의 CALLBACK_RECEIVED/교환/인증 route 각1회만 남는다. 다음2회는 Google 취소 뒤 익명 상태와 새 Kakao 세션 확정 뒤의 오래된 결과다. `auth-trace-v14-final.json`에 각각 거부→복구가 있고 PKCE는 정상 Kakao 로그인2회에만2회다. 예전 사용 인가 코드를 서버에 다시 교환하지 않았다. `cancelled-attempt-old-result-rejected.png`, `auth-late-retry-final.json`이 근거다.
5. **도구 한계:** 초기 v11은 OS 알림 도착 전 capture로 준비 종료했다. v12/13의 ActivityResultRegistry 관찰은 lifecycle에서 교체되는 callback을 포착하지 못했다. v14는 실제 MainActivity.getIntent에서 원래 URI를 메모리로만 보존해 앱링크 경계를 관찰했다. ActivityResult 관측0을 callback 없음이나 제품 결함으로 계산하지 않는다. 동일 실패의 무변경 재실행 없이 이 경계에서 종료했다. v14 빌드는 APK 생성/서명 후 기존v13 영수증의 wx 보호로 비정상 종료됐으며 manifest14/서명을 별도 확인하고 새 영수증만 보존했다. 앱 APK는 불변이다.
6. **native 통제의 한계:** 실제 FCM을 늦춘 것이 아니라 기존 service에 RemoteMessage를 전달한 시험이다. 현재 Google owner에서 이전 Kakao recipient 차단, 같은 owner의 오래된 관측 시각/만료 차단을 각각 확인했다. 임의 메타데이터를 실제 운송 payload로 보고하지 않는다. 단위/계약 검사를 실기기 FCM E2E로 바꾸지 않는다.

### 생일 원본과 다음 한 번의 실행안

실제 전체 `notification_private.scheduler_user_v3` 정의와 pet trigger를 읽었다. 사용자 time_zone의09:00, anniversary 기준일 이후, runtime 활성화 이후이며 due_at부터24시간 내에만 생성한다. 주간/월간 요약3일 복구와 생일1일 복구는 다르다. 현재 연도와 이전 연도를 검사하고 pet ID·기준일·연도 기반 중복 방지를 적용한다. global 수신 가능 조건과 publication의 실제 category 설정을 별도 확인해야 한다. 기존 아이의 생일·cron·기기시각을 변경하지 않았다.

기존 QA 중 다음 생일은 **2027-10-14 09:00 KST**다. 신규 QA 원본에 대한 최소 PO 판단안은 다음과 같다.

- Kakao QA에 `QA-OS-BIRTHDAY-20261107` 시험 아이1개를 정상 아이 등록 화면으로 추가, 생일2025-11-07, 입양일2026-11-06, 사진/체중/기록은 추가하지 않는 범위. 기존 아이를 수정하지 않는다.
-11/06 등록 완료 시11/07 09:00 KST 정기 scheduler부터 실행 가능하다. 늦으면11/08 09:00 이전 기존 복구 창에 한한다. 실제 생성/FCM/OS/탭/목적지/읽음을 연결하고 날짜 조건이 지나면 새 실행 계획을 정한다. 예약/자동 실행은 만들지 않았다.
- 새 아이 선택·petStore 갱신과 `nuri_titles_v2_pet_dates`의 칭호 source 갱신이 발생할 수 있다. 최초 아이가 아니므로 첫 아이 흐름을 시험 목적으로 재실행하지 않는다. 다른 알림/칭호 부수 결과는 ID로 추적하고 임의 광역 삭제하지 않는다.
- 시험 후 원래 누리 선택으로 복원하고, 해당 시험 아이만 기존 정상 삭제 기능으로 정리한다. 관련 알림은 ID 확인 후 개별 삭제하며 audit/칭호 영향의 완전 원복을 미리 보장하지 않는다. **새 프로필 생성은 이번에 실행하지 않았으며 이 범위 승인만 필요하다.**

### 운영 관측과 P0의 분리

고정 창11/04 19:01:13~11/05 19:01:13 KST는 이미 종료됐고 직전 영수증을 재사용했다. 해당 창의 devicev5/v6·workerv2/v3와 창 이후v4를 합치지 않았다. 동일 과거502 로그를 다시 조사하지 않았다.

이번 추가 창은 **11/06 12:15~12:46 KST /03:15~03:46 UTC**다. source별 event first/last와 query window는 `operating-evidence.json`에 있다. postgres230건, function_edge107건, edge702건은 수집된 이벤트이며 연속 완전성을 증명하지 않는다. devicev6 HTTP20035건/4011건, workerv4 HTTP20029건, 해당 조회의40001/PT409/5xx0건이다. 401은03:18:23.695Z의 시작 관측 중1건으로 정확한 원요청 인과는 미확인이고 이후 정상 등록200을 확인했다. 의도한 관측 SQL의 잘못된 함수 시그니처42883 한 건은 제품 오류가 아니다.

DB12:21:35.788939~12:49:09.763866 KST의1653.975초 동안 commit+6045/rollback+0, stats_reset2025-12-08 불변, 과거 loop PID0·30초 초과 client0, 종료 연결22다. 직전 밤 이후 누적rollback+2415의 전체 원인은 이번 표본으로 귀속하지 않는다. scheduler/publication/worker SQL dispatch는 각31 succeeded이나 worker 로그는29건이다. 계측 차이2는 남고 dispatch 성공으로 전달 성공을 대체하지 않는다. 새 fixture의 accepted1과 OS 도착은 별도 확인했다.

이번 raw CPU/메모리/Swap 신규 시계열은 미확보다. 기존 SEVERE·Swap523.86MB 표본·과거502 원인/영향/복구 UNKNOWN·고정 창 공백을 해결 처리하지 않는다. P0_CORE_FIX/P0_SOURCE_ACCEPTANCE/P0_RUNTIME_ACCEPTANCE는 PASS, P0_STABILITY_ACCEPTANCE/P0_FINAL_ACCEPTANCE는 PARTIAL이다.

**제공자 문의 초안, 미발송:** “프로젝트 grmekesqoydylqmyvfke,2026-11-04 10:08:00.104 UTC의 notification-worker-v3 HTTP502/11ms 사건에 대해 gateway request와 execution/deployment 연결, isolate boot/termination/OOM 여부, 함수 진입 및 claim 이전/이후 구분을 요청합니다. 현재 확보 로그에는 function/version/execution 연결이 없고 당시 SQL dispatch 성공만 있습니다. 고정 창11/04 10:01:13~11/05 10:01:13 UTC의 raw CPU 성분·memory commitment·swap IO/OOM 자료와 dispatch/runtime 계측 차이 설명도 요청합니다. 원문 토큰·사용자 데이터는 포함하지 않습니다.” 외부 발송·플랜 변경·재시작은 실행하지 않았다.

### 후보·정리·전달

- 시작 root/branch/HEAD/upstream은 지정 Master 저장소·codex/walk-marker-recovery-20261020·33973baa291b192d3316583785a3e1e8cfbb4770으로 일치했다. 예전 Room B는 쓰지 않았다. 기존 dirty 문서·이미지·미추적 자료 및 supabase/.temp/cli-latest 변경을 보존했다.
- 앱 제품afd3fe8f40b3db513efbde3282e314dd91556ef7, runtime0523c49eebb0ce08be7c6f8ff0c5f533e9a77d56fd88d86ce8a82da5c3ea8811, APK586cdffe7d5a9f2571f5149cd4c71857e016e1cade28f6a3503c463473bcbcd0은 불변이다. devicev6/workerv4 및 세션/P0/badge migration 일치, 서버/웹/인증 설정 변경0이다. [제품CI42018324530](https://github.com/jaejun0617/nuri-app/actions/runs/42018324530)와347 suites4661·타입·guard를 재사용하며 수동 전체 재검사 없음이다.
- 물리SM-S937N 기존 bundled Debug/Metro OFF에서 실제 인증·알림·Back·통제 경계를 확인했다. 에뮬레이터01d78a3는 실행/재설치하지 않고 기존 독립 Google 등록의 owner/status/last_seen 보존을 서버에서 확인했다. 새 UI/배지의 에뮬레이터 수락으로 계산하지 않는다.
- 이번 fixture1건은03:45:03.907295Z 정상 개별 soft-dismiss했다. 다른 알림·기록·사진은 보존했다. 최종 물리Kakao/누리 Home/native0/OS summary없음, 물리Google user_logout revoked, 다른 설치Google active·last_seen11/05 12:39:26.497816Z 불변, 양계정global opt-in true다.
- 앱UID10402·최초설치2026-06-02 19:16:57·APK·permission hash fce9b61e55931b24c3909fd22fac0b452cae8ab6575d29efbfdb9de23d56ce12·네트워크·fontScale·density를 보존했다. QA 패키지 제거/명령 표식ABSENT/훅 종료 후 앱 정상 재실행을 확인했다. 일반 패키지 조회가 별도user150 접근을 거절한 사실은 보존하며 그 user에는 접근하지 않았다. 대상user0에서 보조 패키지 없음 확인이다. instrumentation 종료의 프로세스 종료를 자연 충돌로 계산하지 않는다.
- 이번 logout은 정상 서버 요청으로 수행했다. 이전11/05 시험의 서버 세션 잔여 가능성은 현재 계정이나 다른 설치를 강제로 해제해 정리하지 않았다. 원문OAuth code/JWT/PKCE/FCM token은 도구 메모리에서만 처리하고 저장하지 않았다. 증거/영상은 로컬 보존, Git은 아래 marker의 문서 증분5개만 선별 전달한다. 문서 커밋과 자동 CI는 `git-delivery.json`의 실제 결과를 따른다.

### 해결·잔여·다음 실행

해결: OS13 필수 알림 진입 중복/복귀, OS10의 원래 등록 응답·이전 PendingIntent·통제 native 방어, 인증 앱링크 중복/사용 완료 이전 결과·취소 후 재시도. 진행: 문서 증분 전달과 해당 자동 CI 회수. 잔여: OS10 미소비 인증 결과와 실제 지연 FCM E2E, 생일 정상 원본 OS, P0 안정성 자료/위험 판단이다. 이 잔여를 제품 결함으로 단정하거나 다른 성공으로 대신하지 않는다.

| 우선순위 | 원래 작업 번호 또는 추가 범위 | 작업 | 선행 조건 | 담당 | 필요한 입력 | 완료 기준 | 현재 시작 가능 여부 | Astra 권장 추론 강도 | GPT-6.1 Sol 권장 추론 강도 |
|---|---|---|---|---|---|---|---|---|---|
|1|3·5 / U1·OS10|미소비 이전 인증 결과의 현재 시도 경계|실제 native 결과를 원래 처리 전에 보존·반환 가능한 관찰 수단|Master|기존 QA 공식 인증. 현 도구는 ActivityResult 관측0|정상 PKCE/취소 정책 아래 현재 시도·세션·owner 보존|BLOCKED_TEST_CAPABILITY. 같은 registry 프로브 반복 금지|High|High|
|2|5 / OS10·배지|이전 recipient 실제 FCM 지연 E2E|기존 QA 메시지의 실제 수신/처리를 계정 전환과 연결할 유한한 통제 수단|Master|새 계정/권한 변경 불필요, 수단 또는 통제 경계 증거의 수락 판단|실제 FCM 도착과 owner 차단·배지·다른 설치 보존 연결|native 경계는PASS, 실제 전송 지연NOT_RUN|High|High|
|3|4·5 / U2 생일|정상 scheduler 생일 OS 후속|위 시험 아이1개 생성 범위 승인 또는 기존 due 도달|Master, 승인PO|시험 프로필 범위만 판단|정상 원본→worker/FCM→OS→목적지→읽음·정리|승인 전 생성하지 않음. 승인 시11/07 09:00 KST 실행안|Medium|Medium|
|4|P0 안정성|과거502·SEVERE·Swap·관측 공백 판정|새 제공자 자료 또는 명시적 잔여 위험 판단|Master, 판단PO|위 문의 초안 발송 승인 또는 자료|공백/영향을 해소하거나 잔여 위험 명시 판정|기존 동일 로그 재조회 종료|Medium|Medium|
|5|기존1~6·NAV, 원래7~14|다음 우선순위 결정|OS 잔여 판단 후 별도 지시|PO|후속 실행 지시|기존 수락 원장 기준|자동 착수하지 않음|Medium|Medium|

정확한 다음 실행 지점은1번의 **미소비 Auth Tab 결과를 원래 Promise/앱링크 처리 전에 관찰할 수단의 유한한 검증**이다. 코드에 중복 방지가 존재한다는 사실로 실기기 수락을 대신하지 않으며 새 인증 구조는 권장하지 않는다. 두 모델 모두 해당 판단High, 통상 증거 연결/보고Medium 권장이다. 실제 모델·추론 강도는 미확인이고 자동 변경하지 않았다. 문서/CI 전달 후 이번 실행 종료, 다른 영역 AUTO_RESUME_NO, STORE HOLD.
<!-- OS_BOUNDARIES_20261106_END -->

<!-- OS_REQUIRED_20261105_BEGIN -->
## 2026-11-05 OS 필수 잔여 증분 검증: 부분 완료

### 1. 결론과 실제 범위

**OS 영역 PARTIAL, 전체 미동결, STORE HOLD.** 이번 PO 재개는 OS에 한정했다. 이전 대기 문구는 이번 실행에 적용하지 않았으며 다른 통합 도메인과 원래7~14는 시작하지 않았다. 관측 종료는21:58:50 KST/12:58:50 UTC다. 추가 질문 없이 기존 공식 QA 로그인과 승인 도구로 진행했다. 제품 결함 신규0, 제품 수정/배포/앱 빌드/재설치0이다.

증거 소유자는 `/Users/shinjaejun/.codex/nuri-os-required-20261105/`의 `checkpoint.json`, `operating-evidence-start.json`, `acceptance.json`, 각 상태 JSON과 instrumentation 영수증이다. 아래 과거 상태는 당시 이력으로 보존하며 이 절의 증분으로만 갱신한다.

### 2. 원장 ID 증분

| ID | 직전 미완료 | 이번 결과와 적용 범위 | 남은 조건 |
|---|---|---|---|
| P0 D | BLOCKED_PRECONDITION: 유효 이전 세션 없음 | PASS, 통제된 실제 앱 요청 지연 dispatch. 유효 이전 Kakao 세션을 유지한 상태에서 새 Google 소유 확정 후 원래 register를 전달해409/DEVICE_SESSION_STALE | 자연 패킷 재정렬과 원래 Promise의 늦은 응답 수락은 아님. 후자는 OS10에 유지 |
| P0 F | BLOCKED_PRECONDITION | PASS, 같은 실행의 원래 revoke를 지연 전달해200/revoked=0, 현재 Google 및 다른 설치 등록 불변 | 늦은 UI callback 전체 수락으로 확대하지 않음 |
| P0 K | PASS | 기존 실제 서버200 뒤 응답1회 유실/재호출200 증거 재사용 | 현재 등록 함수/호출 계약 불변. 재시험 없음 |
| L-GLOBAL | 미수락 | PASS, 인증 API 범위. 같은 Google QA 두 설치 OFF/정상 ON 재등록/복구 후 두 FCM accepted | 존재하지 않는 전체 토글 UI 수락으로 바꾸지 않음 |
| 새 배지 영향 | cold/계정/dismiss 미수락 | 물리 cold metadata1, 정상 계정 변경2→Google27, Google cold30, 성공 읽음30→29, summary dismiss 후 서버/앱/native29 유지·런처 소거 PASS | 실제 이전 계정 FCM 지연·중복 snapshot의 운영 수신은 NOT_RUN. 기존 단위검사와 구분 |
| OS10 | IN_PROGRESS | D/F 사전조건 해소와 서버 경계, 정상 전환/이전 알림 소거/다른 설치 보존 추가 | 이전 인증 callback·취소된 시도의 실제 늦은 결과 및 이전 계정 FCM metadata는 미수락 |
| OS13 | IN_PROGRESS | 최신 물리 실제 OS 행75ms 간격2입력→정확한 상세1개→서버 읽음→Back1회 Home. 기존 실패/취소/동일 알림 회복 증거 재사용 | 입력2회가 PendingIntent2회 전달을 뜻하지 않음. 독립된 중복·이전 callback 전달은 미수락 |
| 생일 OS 후속 | 미수락 | BLOCKED_PRECONDITION: 기존 QA의 실제 생일은10/14·10/21·10/28,11/05 원본 없음 | 생일/cron을 바꾸거나 직접 삽입해 scheduler 원본으로 계산하지 않음 |

같은 비교 단위의 직전 미완료 ID는 D/F/L-GLOBAL/OS10/OS13, 이번 한정 조건 완료는 D/F/L-GLOBAL, 전체 묶음 미완료는 OS10/OS13이다. 추가 제품 결함0, 제품 변경에 따른 재확인0이다. 배지와 업무 원본의 하위 조건은 위 행에 연결하며 임의의 새 분모를 만들지 않는다. 통합2/7·OS11/13·기록0/4는 유지한다. 앱 개발률로 환산하지 않는다.

### 3. D/F의 실제 사전조건과 한계

- 기존 보조 도구를 최소 보완했다. 실제 앱의 이전 register/revoke 한 건씩을 원문 그대로 프로세스 메모리에 보존하고 즉시 transport failure를 반환했다. 동일 QA의 원래 `/auth/v1/logout` 요청 한 건은 전송 전에 유실시켰다. 로컬 로그아웃은 정상 진행됐으나 서버의 이전 세션은 정상 네트워크 실패 의미로 남았다. JWT 위조/auth.sessions 쓰기/권한 변경은 없다.
- 공식 Google UI에서 기존 canonical QA 이메일 해시를 대조해 선택했다. 새 계정 생성 없이 Home/새 native owner/새 서버 등록과 이전 세션의 실제 유효성을 확인했다. 전환 직후 이전 Kakao는 revoked, 물리 Google과 에뮬레이터 Google은 active였다.
-21:34:13 KST 원래 이전 요청을 변경 없이 전달했다. register409/DEVICE_SESSION_STALE와 같은 시각 SQLSTATE PT409, revoke200/revoked=0을 연결했다. `boundary-before-release.json`과 `boundary-after-release.json`에서 소유/등록 상태가 동일했다. 에뮬레이터 last_seen도 이 경계에서는 불변이다. 이후 L-GLOBAL의 정상 재등록 시각 갱신은 별도다.
- 재전달은 plain client가 수행했으므로 원래 JS Promise에 그 최종 응답을 주입하지 않았다. 따라서 클라이언트의 늦은 완료나 늦은 OAuth callback을 PASS로 올리지 않는다. 이전 실제 OS PendingIntent도 보존/재생했지만 직후 instrumentation이 종료돼 UI/접근/목적지 결과는 미수락이다. 이 종료의 앱 프로세스 종료는 자연 충돌이 아니다.
- 시험 때문에 전송하지 않은 이전 QA logout의 서버 세션은 유효한 채 남을 수 있다. 도구/앱에는 이전 자격정보가 남지 않고 새 소유 등록의 fence가 재활성화를 거부했다. 임의 세션 삭제/전체 로그아웃으로 정리하지 않았다. 현재 앱은 정상 재인증한 Kakao 세션이다.

### 4. L-GLOBAL과 두 설치 복원

- 현재 인증된 앱의 단말 endpoint 요청에서 기존 헤더를 프로세스 메모리로만 재사용하여 `set_user_notification_opt_in_v1`을 정상 호출했다. 전체 OFF/ON 모두HTTP200이다. API 시험이며 `setPushNotificationOptIn`의 UI 호출 시험이 아니다.
- Kakao 단일 설치 OFF: 새 알림 `30e2726f-b669-48c0-bf2a-44f0d05ebff8`은 인앱 보존, delivery=suppressed/attempts0/device receipts0. ON 후 물리 FCM 등록 active 복원, Google 설치 불변이다.
- Google 동일 계정 두 설치 OFF: 두 fcm 등록과 이전 disabled tombstone이 user_opt_out/revoked로 바뀌었다. 양쪽 foreground 동기화에서 native owner도 해제됐다. 초기 `9300edd6...`은 소비 전에 ON을 먼저 켜 provider_unavailable로 끝난 준비 이력이다. 이를 OFF suppression 성공으로 쓰지 않는다.
- OFF를 유지한 두 번째 fixture `651fc777-347b-4a5d-9333-c4e90c3d53be`는 suppressed/attempts0/device receipts0이다. 정상 ON 후 두 앱 foreground에서 같은 두 fcm 행이 active/opt_in=true로 복원됐다. 미사용 disabled 행은 정상 계약대로 revoked를 유지하며 임의로 원상 수치 복제하지 않았다.
- 복구 후 `b423187e-447b-41c3-8707-0002fab48352`는 두 독립 설치에 accepted 각1회다. 물리 실제 OS 탭/상세 성공 뒤 read_at12:41:38.394646Z를 확인했다. 다른 계정 설정은 계속true였다. QA 발송 제한은2명으로 유지했다.

### 5. 배지와 OS13의 실제 결과

- 물리 앱을 바탕화면으로 보낸 뒤 `am kill --user 0`로 종료했다. 준비 첫 관찰은 PID가 남았고 다른 Android user의 stopped=true를 넓은 정규식이 읽은 오류라 제외했다. 재확인에서 실제 user0 stopped=false/PID없음을 확인했다. Settings 강제 종료 시험이 아니다.
- 새 FCM 수신 뒤 새 native PID, canonical 미읽음1/native1/OS1/런처1을 확인했다. JS 화면을 열기 전 metadata 처리 증거다. FCM이 프로세스를 먼저 시작하므로 OS 탭 직전에도 PID가 없었다고 쓰지 않는다.
- 정상 계정 전환 후 이전 Kakao 수치2가 Google 수치27을 덮지 않았다. 전체 복구 후 새 FCM의 canonical30/native30, 실제 목적지 성공 뒤29를 확인했다. 기존3→2→0은 별도 유효 증거로 재사용한다.
- 실제 Google OS 행에75ms 간격으로 두 물리 입력을 했다. 정확한 알림 상세1개와 서버 읽음, 시스템Back1회 Home을 관찰했다. `os13-current.mp4` 실제38.197초/1080×2340/122 encoded VFR frames를 두 contact sheet로 모두 수동 검토했다. 중간 Home/다른 아이/중복 목적지는 관찰되지 않았다. 기존 승인 시스템 심볼/계절 splash는 유지됐다. 모든 compositor frame이나 전달된 callback2회를 검증한 것은 아니다. Back은 별도 UI 상태 증거다.
- OS13 실패·취소·같은 알림 재진입은11/04의 `5106267e...`/`99e18395...` 및 기존 원장 절을 재사용한다. 신규 badge envelope와 표면 변경은 기존 목적지 조회/성공 후 읽음 계약을 바꾸지 않았다. 최신 독립된 늦은 callback 조건은 남긴다.
- Google summary를 해당 OS 행에서만 swipe했다. 서버/앱/native29는 유지, OS summary와 런처 숫자는 사라졌다. foreground 재조회에도 같은 수치의 summary를 강제로 재생성하지 않았다. `summary-dismissed.json`, `dismissed-after-resume.json`, `dismissed-launcher.png`가 근거다. 지우기를 읽음 처리로 계산하지 않았다.

### 6. 종료된24시간 창과 운영 위험

고정 창은11/04 19:01:13~11/05 19:01:13 KST다. 기다림 없이 기존 영수증과 실제 해당 구간 로그/대시보드를 대조했다. `operating-evidence-start.json`에 source별 first/last/count를 보존했다. 이벤트 first/last는 연속 수집 완전성을 증명하지 않으며 stats_reset은2025-12-08 그대로다.

| 자료 | 확보 결과 | 공백/해석 |
|---|---|---|
| 고정 창 postgres 로그 | 40001=조회 결과0, PT4094건 | 실제 serialization failure를 전역 차단한 것이 아님. 미기록 구간을0으로 간주하지 않음 |
| device runtime | version5 HTTP200126회, version6 HTTP20045회 | 마지막v5 11/05 13:52:22~첫v6 14:11:18 사이 전환 시각은 불명확. 관리API updated_at을 배포 시각으로 쓰지 않음 |
| worker runtime | v2 HTTP2001118회, v3 HTTP200304회, version/execution 연결 없는5021회 | 현재v4는 고정 창 이후19:05:16.685 관리 갱신, 첫v4 호출19:06:03.509. 최신v4 연속24시간으로 합산 금지 |
| cron | scheduler/publication/worker SQL dispatch 각1440 succeeded, retention32 succeeded | worker HTTP1423개 기록과 dispatch1440의 계측 차이17은 남음. dispatch 성공을 전달 완료로 바꾸지 않음 |
| 고정 창 기타5xx | gateway5008건·weather5031건 | 별도 비OS 사건. 원인/누락 영향 전부를 확정하지 않았고 무관한 수정 없음 |
| 고정 창 CPU/메모리 | 대시보드 표시CPU5.12%, 사용403.36MB, commitment1.36GB/SEVERE | 표시 집계 정의 미확인.19:01~19:01 전체 차트는 시작부 고부하 후 낮은 추세이나 raw 시계열 미확보 |
| 성분 표본 |11/05 16:01:13 KST System0.70%, User1.85%, IOwait3.50%, Total표시6.07%, Swap523.86MB, commitment1.37GB | 한 시점이며24시간 평균/최대 아님. Swap IO/OOM 내부 자료 UNKNOWN |
| 이번 카운터 |21:16:14~21:56:53 KST commit+8429, rollback+1/2438.223초≈0.00041회/초 | 전체 배포24시간 delta가 아님. 의도한 QA PT4091과 같은 구간이며 완전한 원인 귀속은 아님 |
| 요청 컨텍스트 |21:38:12~21:56:53 calls+93/1120.923초≈0.083회/초 |24시간 호출량이 아닌 별도 두 표본. 과거 loop PID0,30초 초과 client query0 |
| 고정 창 이후~21:58:50 | devicev6 20043회/의도한4091회, worker v3 2004회/v4 200172회, 40001조회0/PT4091 | 현재 정상 전달과 별도 추가 관측. 고정 창을 대체하지 않음 |

과거19:08:00.104 KST worker502는 function/version 식별자 없는 사건으로 **원인·영향·복구 UNKNOWN**을 유지한다. queue 현재 accepted8/expired1/suppressed3을 과거502 복구 증거로 쓰지 않는다. API 지연은 작업 혼합과 실행시간 표본이 달라 개선율 UNKNOWN이다. CPU 회복만으로 단독 원인100%/메모리 해결을 선언하지 않는다. 재시작/프로세스 강제 종료/Compute/cron 변경0이다.

### 7. P0와 전체 수락의 분리

| 수락 | 최신 판정 |
|---|---|
| P0_CORE_FIX | PASS 보존: PT409/HTTP409/stable code, 운영 함수 hash4개 동일 |
| P0_SOURCE_ACCEPTANCE | PASS 보존: 기존 P0 Git/CI, 이번 제품 변경0 |
| P0_RUNTIME_ACCEPTANCE | PASS, 기존A~L 한정 범위 + 이번D/F 서버 순서 경계 및 L-GLOBAL 인증 API를 연결. OS10/13·인증 전체 수락이 아님 |
| P0_STABILITY_ACCEPTANCE | PARTIAL. 시간 창 도달/자료 확보,502·메모리/Swap·완전한 시계열/카운터 공백 잔여. PENDING_OBSERVATION_WINDOW 상태는 더 이상 사용하지 않음 |
| P0_FINAL_ACCEPTANCE | PARTIAL |
| OS10 / OS13 / 업무 원본 생일 OS | 각각 IN_PROGRESS / IN_PROGRESS / BLOCKED_PRECONDITION |
| 통합/출시 | 전체 미동결, STORE HOLD |

### 8. 환경·후보·전달

- 실제 root는 `nuri-batch-a-20261020/nuri`, branch `codex/walk-marker-recovery-20261020`, 시작 HEAD와 원격은 `f0c8a25a7447546791aa229e6cbe83215e3b936a`다. 기본 cwd의 예전 Room B에는 쓰지 않았다. staged0, 기존 혼재 문서/이미지/미추적 자료 보존이다.
- 앱 제품 `afd3fe8f40b3db513efbde3282e314dd91556ef7`, runtime `0523c49eebb0ce08be7c6f8ff0c5f533e9a77d56fd88d86ce8a82da5c3ea8811`, 물리APK `586cdffe7d5a9f2571f5149cd4c71857e016e1cade28f6a3503c463473bcbcd0` 불변이다. [제품 CI42018324530](https://github.com/jaejun0617/nuri-app/actions/runs/42018324530)와347/4661·타입·guard를 재사용했고 전체 검사/같은 CI/APK 설치를 반복하지 않았다.
- 실제SM-S937N은 새 배지/공식 로그인/OS 입력/Back/전체 API의 대상이다. 두 번째 기존Google AVD는01d78a3/APK bcd0f484의 독립 등록/해제/복원/FCM 접수만 확인했다. 구버전을 새 배지·로그인 UI 수락으로 합산하지 않았다.
- 운영 devicev6/worker v4/기존 migration3개와 P0 함수 hash4개가 기존 영수증과 일치한다. 서버/웹/인증 설정 변경0, 재배포0. 새 측정만 별도 증거다.
- QA 보조 패키지만 같은 서명으로 빌드/업데이트했다. 최초 version6 설치는 기존version8보다 낮아 거부됐고 앱 본체는 불변이었다. version9/10으로 목적에 맞춰 검증한 뒤 보조 패키지를 제거했다. 테스트성 자료는 증거 루트에 보존하고 원문JWT/FCM/키/이메일은 출력·저장하지 않았다.
- 이 절·리서치·project-memory의 **이번 marker 증분만** 문서 전달 대상이다. 문서 커밋/CI는 앱 제품/설치 기준과 분리하며 최종 실제 영수증은 증거 루트 `git-delivery.json`을 따른다.

### 9. 정리·원복

이번 QA transport5건은 각각 정상 인앱 개별 삭제/확인으로 soft-dismiss했다. 생성 주체/ID와 dismissed_at5개를 `acceptance.json`에 연결했다. 과거 알림은 삭제하거나 모두 읽지 않았다. 최종 canonical은 Kakao0/Google27로 원래 값이며 물리native0/OS summary없음이다. QA transport를 업무 원본 생성 E2E로 합산하지 않았다.

물리는 시작과 같은 Kakao QA/누리 Home, 새 정상 세션으로 복원했다. 물리Kakao active/물리Google user_logout revoked/에뮬레이터Google active다. 알림 권한·네트워크·채널은 변경하지 않았고 물리 permission hash/UID/최초설치/APK가 동일하다. unused disabled tombstone은 OFF 계약의 revoked 상태를 보존했다. 보조 패키지/우리 명령 표식/실행 훅0, Metro OFF, 이번에 켠 AVD는 정상 종료하고 데이터는 보존했다. 이전 증거/사용자 콘텐츠/완료 사진 작업은 정리하지 않았다.

### 10. 해결·잔여와 정확한 다음 실행

| 구분 | 결과 |
|---|---|
| 해결 | D/F 유효 이전 세션의 실제 지연 dispatch와 소유 보존, 전체 API OFF/ON 두 설치, 새 cold metadata/정상 계정 배지/summary dismiss, QA 원복 |
| 진행 | 이번 실행 중인 명령/도구 없음. 문서 증분 전달 후 대기 |
| 잔여 | OS10 늦은 인증/현재 시도 오염·이전 FCM, OS13 독립 callback 중복/이전 결과, 실제 생일 OS, P0 안정성의502/메모리·Swap/관측 공백 |
| 잔여 해결 계획 | 아래 표의 관찰 사전조건을 확보한 단일 표적 실행. 완료된 D/F·K·OFF/ON·OS12·빠른 왕복·설치는 반복하지 않음 |

| 우선순위 | 원래 작업 번호 또는 추가 범위 | 작업 | 선행 조건 | 담당 | 필요한 입력 | 완료 기준 | 현재 시작 가능 여부 | Astra 권장 추론 강도 | GPT-6.1 Sol 권장 추론 강도 |
|---|---|---|---|---|---|---|---|---|---|
|1|3·5·NAV/OS10·13|늦은 실제 인증 결과와 별도 중복 callback 관찰|Auth Tab ActivityResult/앱링크의 원래 결과를 구분·보존하고 앱에서 처리 종료까지 관찰할 수단|Master|기존 QA 공식 세션. 지금 PO 질문/직접 입력 요청 없음|현재 소유/읽음/화면 불변 및 목적지1회, 원래 Promise 결과까지 연결|현 도구만으로 불가: 네트워크 dispatch와 native 결과 경계를 구분해야 함|High|High|
|2|5/U2 생일 OS|정상 scheduler 원본→FCM→OS→목적지/읽음|승인 QA의 실제 due 원본과 관측 가능한 수신 시각|Master|정상 원본 조건, DOB/cron 임의 변경 없음|정상 scheduler origin을 실제 OS 후속까지 연결|오늘 due 없음. 기다리기 위한 실행 없음|Medium|Medium|
|3|P0 안정성|고정 창의 남은 provider 자료/위험 판정|이미 확보한 창과 누락 식별자 연결|Master, 위험 수락은PO|502 request/execution 연결, raw metrics 또는 provider 자료. 외부 문의는 별도 지시 전 발송 안 함|원인/영향/공백을 해소하거나 PO가 잔여 위험을 명시 판정|기존 동일 로그 재조사는 종료. 새 자료 필요|Medium, 충돌 판단High|Medium, 충돌 판단High|
|4|1~6·NAV 잔여|인증 전체·업무 원본·기록 도메인 우선순위 제시|OS 마감 판단 후 별도 실행 지시|Master|PO 다음 우선순위|원래 원장 조건 충족, 전체 미동결 보존|이번에는 자동 착수하지 않음|Medium|Medium|

다음 한 번의 실행 지점은1번의 **실제 native 인증 결과 관찰 가능성 검증**이다. 원래 요청의 서버 응답과 앱 callback을 혼동하지 않는 것이 추천 High의 이유다. 통상 증거/문서는 두 모델 모두Medium 권장, 실제 모델·추론 강도는 미확인이고 변경하지 않았다. 승인 디자인/정책/STORE HOLD를 유지한다.
<!-- OS_REQUIRED_20261105_END -->

<!-- FINAL_APPROVAL_20261105_BEGIN -->
## 2026-11-05 최종승인 전달·정리 후 PO 대기

- 승인 제품 `afd3fe8`의 전체347 suites4661·타입·source guard와 [동일 SHA CI](https://github.com/jaejun0617/nuri-app/actions/runs/42018324530) PASS, bundled Debug 물리 보존 설치·Metro OFF를 확인했다. 앱 이름 누리·실제 배지3→2→0과 canonical QA 서버 미읽음2/0 일치·0일 때 요약/숫자 소거를 수락했다. cold/계정·권한 전체 수락으로 확대하지 않는다.
- 재생성 산출물62경로 정리로 실제6.50355GiB 확보, 정리 후21.81120GiB 여유다. APK·outputs·native/심볼/소스맵·Git 상태·원본 checkout을 보존했다. [전달 및 필수 잔여 보고](../reports/nuri-approved-delivery-and-required-remainders-2026-11-05.md).
- Google 기존 중단 사진은11/05 11:51의 같은 task·참조·큐 복구 PASS를 보존한다. P0 K PASS, D/F 사전조건 차단·L-GLOBAL 미수락·24시간 고정 창은 이미 도달했지만 증거 판정 미완료, 502/메모리 영향 미확정이다.
- 통합2/7·OS11/13·기록0/4 및 U1/U2/U3/U5/NAV 필수 잔여·전체 미동결·STORE HOLD를 유지한다. 이번에는 기존 잔여 시험을 재개하지 않았다. **WAITING_FOR_PO / AUTO_RESUME_NO**. 과거 자동 재개 예정 문구보다 이 종료 지시가 우선한다.
<!-- FINAL_APPROVAL_20261105_END -->

## 2026-11-04 20:20 KST P0 잔여 수락 결과

**P0_FINAL_ACCEPTANCE: PARTIAL / HARD STOP / STORE HOLD.** 관측은20:07:20~20:18:30 KST(11:07:20~11:18:30 UTC), 운영 로그의 조회 시작은 배포19:01:13 KST다. 이번 범위는 검증·읽기 관측·증거/문서뿐이며 앱·서버 수정/배포/설치·다른 작업 재개는 없다.

증거 E: `/Users/shinjaejun/.codex/nuri-profile-completion-20261028-urmnPT/p0-cpu-1104/remaining-acceptance-20261104.json`. 기존19:46 원장과 `post-deployment-verification.json`은 과거 실행 사실 그대로 보존한다.

### 기준점과 운영 관측

- 소스/실제 원격 HEAD895ae46a9e33acc63fdd0aefcb641d7acd4c26fa, 기존 브랜치 유지. tracking ref1d73341은 오래된 값이라 ahead1을 미푸시로 해석하지 않았다. 시작 staged0. 기존 dirty 문서·이미지·temp 파일은 보존한다.
- 운영 migration20261104100113 존재, lock/register5/revoke 해시는 각각8ca2a9112fab663f344bdb76c05fdf47 / cc1c12c2966dad73da6b1fe1307d8abc / 1350f61776e5da73c68099debb158a14로 이전 배포와 일치한다. device-v3 v5, worker-v3 v2 유지. worker bundle141bbc9e9e20f9c26bd2a9b80163b5d2e6e7e433c8a827eea42a570d337ecec3.
- 물리 앱1d73341과 P0 소스895ae46 사이 src/android/ios/package/lock/patch 입력 diff0. 기존 보존 설치·Metro OFF를 재사용했으며 최신 APK를 생성하거나 설치하지 않았다. emulator01d78a3은 두 번째 Google 등록 보존에만 사용했다.
- 20:08:10.344845→20:18:24.646240,614.302초: commit11905774→11907661(+1887), rollback861098185→861098193(+8,0.0130/s), 주요 요청 컨텍스트 calls861231490→861231545(+55,0.0895/s). stats_reset2025-12-08 동일. 초기 queryid 숫자 정밀도 손실은 보존하고 최종 텍스트 -7821780334453251234로 식별했다.
- +8 rollback과 같은 구간에서42P01 1건(이번 조사 쿼리의 잘못된 복수 테이블명, 실제 단수명으로 보정), P0002 7건을 확인했다. 후자는 detail_v3/get_user_notification_detail_v3의 NURI_NOTIFICATION_UNAVAILABLE(20:16:14~25)이다. 대상 알림/사용자 동작 연결은 UNKNOWN이며 무한 stale 재시도로 계산하지 않는다. 정상 동작 또는 결함 해결로 단정하지도 않는다.
- 로그19:01:13~20:16에서40001=0, PT409=4. 이는 배포 직후 기존3루프 종료와 이전 승인 stale1회가 포함된 창이며, 이전19:01:32 시작 창의PT409=1과 충돌하지 않는다.20:17~18:30 종료 표본도40001/PT409/5xx=0. 전체 소스 집계의20:16~17은 별도 공백이며 PostgreSQL 오류와 함수 endpoint 누적은20:17까지 확보했다.
- 20:09 KST dashboard 시점: CPU User1.24%, System0.35%, IOWait1.60%, Total표시3.19%; Idle표시97.15%와 합계 차이는 임의 보정하지 않는다. commitment1.35GB·Swap502.07MB·SEVERE 경고 유지.19:10~20:10 그래프의 한 점이지 구간 평균이 아니다. swap 입출력/커널 OOM은UNKNOWN. 확보한 로그의 OOM 문구0건을 커널 OOM 부재로 확대하지 않는다.
- 최종 DB 연결20, 과거3PID0. 장시간 active는 realtime replication/WalSenderWaitForWal1건으로 stale 루프가 아니다. NURI cron3개는 각각74/74 SQL 성공·active. SQL dispatch 성공은 worker 성공을 보장하지 않는다.
- 함수 로그19:01:13~20:17: worker75회 중5021건(1.33%), device26회5xx0·4090. 평균 execution은 각각700.63ms/775.96ms, 최대1969/2887ms. register/revoke 혼합이므로 동일 작업 지연 개선율UNKNOWN. PostgreSQL PT409 건수와 Edge409 건수를 합산하지 않는다.
- 각 로그 source의 반환 first/last_event와 조회 창은 E에 기록했다. 보존기간·수집 공백은UNKNOWN, 조회 불가 구간을0으로 만들지 않았다. 통계 초기화·부하 시험 없음.

### worker502 제한적 판정

19:08:00.104 KST/11ms 사건을19:07:45~19:08:20로 한정 조사했다. gateway request 식별자는 있으나 execution/deployment/function 식별자가 비어 있고 일치하는 내부 로그는 찾지 못했다. 인접 shutdown은 다른 request이며 EarlyDrop을 CPU/OOM 원인으로 단정하지 않는다. 배포 worker 소스의 명시 반환은200/403/405/503이고502 반환은 없다.

현재 queue에5분 이상 pending/retry/leased는 없고 실패 시각±1분 신규 delivery0, 오래된 provider_unavailable1건은P0 이전이다. 이는 과거 claim·lease·실제 누락·복구를 증명하지 않는다. **원인UNKNOWN / 영향UNKNOWN / 복구UNKNOWN / 확보된 창의 추가502 없음**. 재호출·재배포·강제 종료로 재현하지 않았다. gateway 내부 추적 자료가 필요하면 PO의 공식 지원 판단 대상으로 남긴다.

### D/F/K와 L 판정

| ID | 이전 | 이번 실제 수행·환경 | 결과와 최소 잔여 |
|---|---|---|---|
| D | 실제 지연 미수락; 과거 앱 요청401 | 기존 SessionOrderProbe 소스/영수증과 현재 installed instrumentation만 대조. 요청 지연 미실행 | BLOCKED_TEST_CAPABILITY: 기존 등록 지연 probe 미설치, 재설치 금지. 유효한 이전 세션 PT409 조건은 별도로 BLOCKED_PRECONDITION. 로그아웃401을PT409로 대체하지 않음 |
| F | 로컬 revoke0; 실제 지연 미수락 | 같은 등록/해제 probe 미설치. 실제 지연 미실행 | BLOCKED_TEST_CAPABILITY. 설치된 사진 probe를 해제 요청 도구로 사용하지 않음. 새 소유자/다른 설치 보존을 실제 지연으로 확인해야 함 |
| K | 계약 멱등PASS; 실제 응답 유실 미수락 | 현재 ReferenceResponseProbe는 Kakao 사진 fixture와 Storage/replace_memory_image_refs만 지원 | BLOCKED_TEST_CAPABILITY. 단말 endpoint 성공 응답 유실을 식별할 수 없음. 사진 시험을 등록 E2E로 전용하지 않음 |
| L-GLOBAL | 카테고리OFF만PASS | UI는category, setPushNotificationOptIn/RPC는 존재하나 기존 재사용 가능한 인증 QA 호출 도구 미확보 | BLOCKED_TEST_CAPABILITY. 새 토글·직접DB 수정·계정 가장 없음. API 전용 검증이면 UI 수락과 구분 필요 |
| L-OS | 이번 실기기 조건 미실행 | PO가 물리OS허용OFF, 실제permission=false/launcher 확인 후 새QA1건, 이후PO인앱확인·ON복구 | PASS 한정1회. 물리OS목록0·인앱1행/PO표시·다른설치등록유지·양쪽권한true복구. FCM accepted는OS표시가 아님 |

L-OS 신규 알림 `a4215a19-53cf-4f7f-b858-592127140a7c`, delivery `bd433178-84ae-4a69-9d62-96862fc42859`, key `qa.transport:20261104:p0-remaining:os-off`.20:14:24 생성→정기worker→두Google등록accepted/attempts1. 물리 OS권한false 상태의 알림 목록은0, PO가 알림함 존재를 확인했다. emulatorOS화면 수락은 하지 않았다. 이1건은 업무 원본이 아닌 QA transport이며15분 push 만료·생성 근거를 보존, 일괄 삭제하지 않았다.

이번 실행은 계정을 변경하지 않았고 최종 양쪽 nativeGoogle owner를 확인했다. 물리 알림권한true복구/에뮬레이터true유지, 네트워크 변경0, 지연훅 시작0, active instrumentation0, Metro OFF. 기존 QA패키지는 보존했고 시험 때문에 새 설치/실행한 helper는 없다. 이전 계정 해제·정상푸시·OS12·빠른왕복을 반복하지 않았다.

### 최종 수락과 다음 한 번의 실행 조건

| 항목 | 상태 |
|---|---|
| P0_CORE_FIX | PASS 유지 |
| P0_SOURCE_ACCEPTANCE | PASS 유지:895ae46·CI41815478530 |
| P0_RUNTIME_ACCEPTANCE | PARTIAL: L-OS 추가수락, D/F/K/L-GLOBAL 차단 |
| P0_STABILITY_ACCEPTANCE | PENDING_OBSERVATION_WINDOW |
| P0_FINAL_ACCEPTANCE | PARTIAL |

24시간 고정 창은11/04 19:01:13~11/05 19:01:13 KST다. 현재 약77분까지의 자료뿐이며 미래PASS·자동대기·background 관측은 없다. P0 제품 소스/기존CI는 불변이고 새 전체검사를 반복하지 않았다. 이번 P0 문서 증분만 선택 전달 대상으로 분리하며 기존 통합 dirty/과거 로컬 보고 전체는 포함하지 않는다. 실제 문서 commit/push 결과는 E의 후속 Git 영수증 및 종료 응답에서 제품SHA와 구분한다.

| 우선순위 | 범위 | 다음 작업 | 선행 조건·필요 입력 | 담당 | 완료 기준 | 현재 시작 가능 |
|---|---|---|---|---|---|---|
| 1 | P0 안정성 | 고정24시간 창과502 위험 판정 | 11/05 19:01:13 이후 PO지시·운영자료, 필요시gateway지원자료 | Master/PO | 확보/공백 구간·재발·영향과 위험수락 명시 | 불가:창미충족·STOP |
| 2 | P0 D/F/K/L-GLOBAL | 안전한 시험 도구와 유효 세션 조건 확보 | 별도 범위 승인, 기존probe 재사용 가능 환경 또는 제한적 도구 준비 허용 | Master | 실제 앱 요청·응답·소유 상태 연결;API시험은별도표시 | 불가:도구/사전조건 |
| 3 | 기존1~6+NAV/UI | 기존 잔여와 로그인 중앙로딩·문구 | 별도 PO재개 | Master | 기존필수수락 및 승인UI | 불가:ON_HOLD |
| 4 | 원래7~14 | 후속 검증/출시 판단 | 기존배치동결 및 각PO지시 | Master/PO | 각 원래 완료조건 | 불가 |

관측·문서 연결은 Astra/GPT-6.1 Sol 모두Medium, D/F/K 경계 판단은둘다High 권장. 실제 모델·추론 강도 미확인, 설정 변경 없음.
**P1/P2: NOT_STARTED / LOGIN_UI_IMPROVEMENT: NOT_STARTED / EXISTING_INTEGRATION: ON_HOLD / STORE: HOLD / AUTO_RESUME: NO.** 최종보고 후HARD STOP.

상태: IN_PROGRESS. 전체 동결 아님. Master 단독 수행.

## 2026-10-29 첫 root 진입의 native 애니메이션 분리

- 94b7ac8b3277543255c0729eba84fb50c8d1460e/[CI40709096063](https://github.com/jaejun0617/nuri-app/actions/runs/40709096063)의 필수 후속 전체 PASS·runtime1d7b2f4e3d10d38c7cfd89cabc73f806e550b899dc9683a33851dfa7926c68ac·APKcdc83027115ae2cc20419c757900c6ecc0ee6c19de480d750317162db1cbfd56을 양쪽 보존 설치/Metro OFF로 확인했다. `delivery-boot-shell-preload`와 `boot-preload-acceptance.json`이 정확한 영수증을 소유한다.
- 실제 physical cold c2ff559c에서는 ActivityOptions의 기존 icon 선호가 적용돼 누리 OS icon→승인 artwork→해당 댓글/15:03:11.301723Z 읽음→Back1회 같은 Home을 확인했다.287개 수집 프레임을 모두 검토했으며 QA transport이지 업무 원본 E2E가 아니다. 새 앱 코드에서 이 native 부분이 불변인 범위만 재사용할 수 있다.
- preload는 충분한 해결안이 아니었다. emulator85개 수집 프레임의60~62가 빈 바탕이며15.353444~16.444144초는 표본 간격이다. 양수 onLayout을 실제 표시 완료로 올리지 않았다. 설치된 ScreenStack은 preloaded top도 새 진입으로 분류하고, Android33+ DEFAULT enter는 alpha0/50ms offset·450ms 이동을 적용한다. 따라서 준비된 구조와 실제 native 진입 효과를 별개로 다룬다. 이 경로의 시간만으로 전체 공백 지속시간·과거 종료 원인을 확정하지 않는다.
- 다음 최소 후보는 효과 없는 preload·layout state·임시 props를 제거하고 원래 canonical 단일 boot reset으로 돌아간다. AppTabs root 진입에만 animation none을 명시해 겹치는 DEFAULT enter를 사용하지 않는다. 실제 툴바400ms fade·More·상세 native slide/역방향 Back·guest/auth·cold 알림의 두 장짜리 stack은 유지한다. 새 가림막·타이머·전역 animation OFF는 없다. 숨긴 Home 환영 안내의 focus 경계와 실제 수락한 FCM icon 옵션은 유지한다.
- preload 기능 자체의 route/layout 검사4개는 해당 실험 제거와 함께 정리하고 실패 영상/앞선 CI/회귀 JSON은 보존했다. 시각 수락 조건은 낮추지 않았다. 최초 root 진입만 별도로 검사하면서 탭400ms·auth·상세 animation assertion을 유지했다. 최종6suites79/79·전체339suites4563/4563·타입·대상lint0오류/0경고 PASS(`boot-entry-*`)이며 새 후보 CI/설치·실제 시작 수락은 남는다. 전체 항목2/7=28.6%·OS10/13·기록 전체0/4·미동결·원래7~9 미착수·STORE HOLD다.

## 2026-10-28 실제 실패 안내 수락과 최초 shell 준비

- c5313379e84bf65838eb157e89d2cbf1049df12d/[CI40699213322](https://github.com/jaejun0617/nuri-app/actions/runs/40699213322)의 필수 후속 전체 PASS를 확인했다. runtime cc821f9c23c67d4ae13eca3daebc2c91b75dd4a3c4f59fdadd32b75aacf1fb11·APK0675ae25e91e48166c0b6bf588a218468d2dc2da103e0bd323a72e3462ace4ae를 두 인스턴스에 보존 설치/Metro OFF로 확인했다. `delivery-boot-shell-replacement`와 `boot-shell-acceptance.json`이 영수증을 소유한다.
- 실제 offline 수락: Google 에뮬레이터의0b9c0dce 알림은 실패 시 정확한 ‘알림을 불러오지 못했어요’/재시도와 read_at NULL을 유지했다. 네트워크를 켜자마자 한 첫 재시도는 아직 연결 준비 전이어서 수락하지 않았다. 실제 VALIDATED network 복구 뒤 정상 UI 재시도→해당 QA 댓글→14:15:28.871868Z 읽음→시스템 Back1회 같은 Home을 확인했다. 앞선97개 수집 프레임 영상은 오류 상태까지만 증명하며 후속 성공은 UI/서버 증거다. network1/1 원복이다.
- 시작 수락은 PARTIAL이다. normal 물리204개 수집 프레임에서 기존 OS icon→artwork→같은 아이 Home의 공백을 관찰하지 않았다. emulator78개에서는 frame53/14.997878초에 빈 바탕, frame54/15.835911초에 Home 기본 UI가 남았다. 표본 간격은 실제 전체 compositor 지속시간 보장이 아니다. UI dump 실패는 유지된 PID20014/복구한 hash 영상·후속 Home과 구분했다.
- 별도 physical cold66e1bcdb의 실제 OS→해당 댓글/읽음14:06:39.812062Z→Back1회 Home을 확인했다.294개 수집 프레임에서 icon_preferred 테마만으로는 icon 생략이 해결되지 않았다. 최초 전송3fcb8c03은 전경 조건이므로 cold OS 시험 NOT_RUN으로 분리했다. 전달 전용 행을 업무 이벤트 E2E에 합산하지 않는다.
- 최소 다음 후보는 설치된 native stack의 preload로 최초 ordinary AppTabs 하나만 준비하고 실제 양수 layout의 route key가 일치한 뒤 기존 replace를 실행한다. guest/auth·알림/댓글 복구의 atomic Back·2초 브랜드 최소 시간·400ms·현재 선택은 보존한다. 모든 화면 영구 mount·고정 준비 지연·가림막은 없다. 실제 layout은 화면 기본 구조 준비 신호이며 데이터/이미지 전체 완료나 접근 권한 증명이 아니다.
- 알림 PendingIntent에는 Android33+의 공식 ActivityOptions splash icon 선호만 추가한다. 계정·원본·채널·TTL·중복·background launch 권한은 바꾸지 않는다. 최초 환영 안내는 preload 중 열지 않도록 기존 load effect를 Home focus 범위로 옮겼다. 숨긴 Home 회귀1FAIL→정상 focus 뒤 조회/명시 확인 수락과, 설치된 StackRouter의 preload key 재사용을 검사했다. 최초 준비 회귀2FAIL/20PASS를 보존하며 최종6suites83/83·전체339suites4567/4567·타입/대상lint0오류/0경고 PASS다(`boot-preload-final-*`). 새 native 컴파일/동일 SHA CI·보존 설치/실제 시작 수락은 아직 남는다. 전체 항목 완료 기준은2/7=28.6%, OS10/13=76.9%, 기록 도메인 전체0/4이며 전체 미동결·원래7~9 미착수·STORE HOLD다.

## 2026-10-28 시작 연결의 두 번째 경계 분리

- 5bb2b38f718c3f74f6b7135fa2205ea11f6e08c8/[CI40695529169](https://github.com/jaejun0617/nuri-app/actions/runs/40695529169) 필수 후속 전체 PASS, runtime9365e5fd95d2f3d6857191e3440ee59e29c8d25d63c3e0016ff004defd7a8ac8·APK3ba9adbd45b761d86f9869ee369f2a1210f2dfe1e88756f276e054f1cfdbdf20을 두 인스턴스에 동일 서명·UID·최초 설치·권한·데이터 보존/Metro OFF로 설치했다. native 컴파일 포함 BUILD SUCCESSFUL이며 이번 신규 package의 override 인자명 경고2개는 다음 후보에서 원래 interface 이름과 맞춘다. 기존 시스템바/React delegate deprecation과 구분한다.
- 첫 경계: normal launcher cold에서 물리202/에뮬레이터67개 수집 프레임의 OS 아이콘→승인 JS artwork 연결에 빈 바탕을 관찰하지 않았다. emulator UI dump1회 실패는 앱 PID 유지와 완료 영상의 hash 복구·나중의 같은 아이 Home으로 구분했다. 동일 launch를 다시 시작하지 않았다. `native-handoff-first-acceptance.json`이 영수증과 한계를 소유한다.
- 두 번째 실제 FAIL: emulator에서 JS artwork 뒤 frame47(14.332522초)이 빈 바탕이고 frame48(14.868289초)에 Home 기본 UI가 보인다. 약0.536초는 해당 VFR 영상의 표본 간격이지 모든 compositor frame의 실제 지속시간 계측이 아니다. 첫 native 경계 수락을 전체 시작 PASS로 확대하지 않는다. 초기 BottomTab의 focused animation 값은0이어서 첫 장면을 의도적으로 투명하게 시작하는 fade가 원인은 아니었다. 현재 후보는 한 장짜리 최초 Splash→AppTabs에서 전체 reset 대신 native replace를 사용해 출발 scene 수명을 보존한다. 복구된 커뮤니티 목록도 같은 단일 경로만 적용하며 알림/댓글 복구의 두 장짜리 atomic Back stack과 guest/auth 분기는 유지한다. 실제 gap 해소 여부는 새 설치에서 판정한다.
- 별도 cold OS: QA 전달7d51a148의 실제 알림 탭→해당 댓글→read_at→Back1회 Home을 확인했다(304개 수집 프레임 전부 검토). 그러나 notification cold 시작에서는 OS가 기존 icon을 생략한 흰 시작 view를 유지했다. [Android 공식 계약](https://developer.android.com/develop/ui/views/launch/splash-screen)의 Android13+ icon_preferred를 기존 icon에 명시한다. API33/35 resource만 보완하고 기존 이미지·흰 바탕·system glyph·권한·안전영역은 그대로 둔다. 실제 구형 API 전체 시각 검증으로 확대하지 않는다.
- 현재 후보: 새 정상 shell 회귀1FAIL/19PASS→관련4suites54/54·타입·대상lint0오류/0경고·전체338suites4562/4562 PASS다(`boot-shell-replacement-before/focused/full.json`). native 컴파일/새 SHA CI·보존 설치와 normal/cold notification/실패 안내/입력의 실제 수락은 남는다. 새 guard를 약화하거나 타이머·전역 가림막·전체 animation OFF·Root 전면 교체를 추가하지 않았다. 전체1~6/NAV 미동결·원래7~9 미착수·STORE HOLD다.

## 2026-10-28 알림 왕복5회와 시작 화면 연결 후보

- 333795c의 새 알림 요청 화면을 물리2회/에뮬레이터3회, warm3회/cold2회에서 실제 OS PendingIntent→정확한 QA 댓글→서버 read_at→시스템 Back1회 Home으로5/5 확인했다. `push-request-journeys-acceptance.json`은 실제 좋아요 원본1건과 전달 전용4건을 구분한다. 영상123/218/163/316/148개 수집 프레임을 모두 검토했다. warm의 원래 출발 Home은 native 앱 복귀 및 정상 push에서 보이지만 canonical 서버 대기는 실제 알림 요청 화면 안에서 처리된다. cold는 Splash에서 댓글로 열리며 목적지 전 Home은 관찰되지 않았다. 정상 슬라이드 출발 화면을 의도하지 않은 중간 Home으로 분류하지 않는다. 모든 compositor frame/연속 요청/전체 NAV PASS는 아니다.
- 기존 시작 잔여: native 시작 화면이 첫 빈 React frame에 자동 해제돼 승인된 로컬 이미지가 그려지기 전 흰 공백을 보였다. 최신 후보는 Android31+의 기존 OS Splash exit view를 이미지 onLoad+onLayout 및 다음 프레임까지 유지한 뒤 해제한다. 새 화면/가림막/이미지/라이브러리/고정 대기/전환시간 변경은 없다. 이미지 오류·Splash 이탈·다른 부트 목적지는 해제하며 기존 React를 보존한 Activity 재생성에는 새 대기를 걸지 않는다. Activity 파괴 시 listener view를 정리한다.
- Android12+의 OS가 먼저 표시하는 아이콘 시작 화면 자체를 임의 제거하거나 full-screen 이미지로 바꿨다고 주장하지 않는다. 이번 최소 보정의 목표는 OS 시작 화면→기존 승인 JS 스플래시의 빈 handoff 제거다. 기존 계절 선택·접근성·2초 브랜드 노출·인증/알림 목적지·400ms는 보존한다.
- 새 후보의 관련4suites31/31·타입·대상lint0오류/0경고·전체338suites4559/4559 PASS다(`native-handoff-focused.json`, `native-handoff-full.json`). native 컴파일·동일 SHA CI·보존 설치·실제 정상/cold 알림/키보드/Back의 영향 수락은 아직 남는다. 이전333795c의5회 영상을 새 native 후보의 시작 수락으로 사용하지 않는다. 전체 미동결·원래7~9 미착수·STORE HOLD다.
- 추가 실제 실패 수락:333795c의 전달 시험81e5e86b를 emulator OS에서 정상 표시/탭한 뒤 QA 단말만 offline으로 두었다. 실제 요청 실패/재시도 버튼→Back1회 Home→network1/1 복구 뒤 Home 유지·server read_at NULL을 확인했다.85개 수집 프레임 전부 검토했으며 성공 응답이 늦게 도착하는 조건까지 증명한 것은 아니다. `push-request-cancel-06-*`이 근거다. 첫 안내가 연결 실패를 ‘삭제되었거나’로 표시한 실제 FAIL과, 실패 시 오래된 query data를 새 목적지 확인처럼 보여줄 수 있는 계약 FAIL2개를 보존했다(`request-offline-before.json`,2FAIL/7PASS).
- 최소 보정: 요청 확인 실패는 ‘알림을 불러오지 못했어요’와 재시도를 표시하고, 자동 목적지 확인 실패에 cached target을 표시하지 않는다. 일반 명시 상세의 기존 offline cache/서버의 삭제·접근 불가 결과는 유지한다. 별도 완료/읽음 처리도 없다. 명시 오류 분기 뒤 불가능해진 query union branch의 refetch 접근을 제거해 타입 축소를 존중했다. 최종 관련5suites52/52·타입·대상lint0오류/0경고·전체338suites4560/4560 PASS다(`native-handoff-offline-focused.json`, `native-handoff-offline-full.json`). 새 설치에서 실제 안내/재시도와 시작 연결을 함께 수락한다.

## 2026-10-28 22:03 KST 최신 후보 수락 기준 진행률

- 후보333795c241f9674d695b9e3c0070ee12b35dfb5f의 전체337suites4553/4553·타입·관련lint0오류/0경고와 [CI40689673810](https://github.com/jaejun0617/nuri-app/actions/runs/40689673810)의 필수 후속 단계 전부 PASS를 확인했다. `delivery-push-request-screen/ci.json`이 동일 SHA를 소유한다. runtime f042c5acf0904696e4446ffaaef60ee0b52b41e76a33fe8901a0a20ce8c1a678·APK253c9d2ac38ff086cbda1fe0746e4272c3c22a2ac4366fc92d4b5545951a983c을 물리1대+Google Play 에뮬레이터1대에 기존 서명·UID·최초 설치·권한·데이터 보존/Metro OFF로 설치했다. 내부 bundled Debug이며 Store RC/Release 성능 수락이 아니다.
- `push-settings-final-audit.json`은22:01 KST의 실환경3개 설정·FCM 서비스 계정 project/digest·Edge/Vault worker 인증 일치·0700/0600 보관·device-v3 v3/worker-v3 v2 ACTIVE·NURI3cron 활성/1분·canonical QA2명만 허용·누락/오류 인증403/403을 확인했다. 키 회전·일반 사용자 발송 개방·대기열 삭제·서버 변경0이다. 기존 실제 기기 암호화 토큰의 전달 성공을 재사용하며 단순 설정 존재만으로 수락하지 않았다.

| 수락 단위 | 이 후보의 최종 상태 | 근거와 미마감 |
|---|---|---|
| 1 검사/B2 | PASS | 최신 로컬 전체와 동일 SHA 원격 후속 단계 수락 |
| 2 외부 설정/B1 | PASS | 실제 QA 전달 경로와 최신 설정·보관·인증·범위 대조 |
| 3 인증/U1 | IN_PROGRESS | 실제 provider 성공/취소/세션 증거 보존, 늦은 callback/이전 계정 목적지 경계 잔여 |
| 4 인앱/U2 | IN_PROGRESS | 원본 댓글·답글·댓글 좋아요/기록·XP·칭호 등의 한정 E2E 보존,17묶음/26eventType 전체 미마감 |
| 5 OS/U3 | IN_PROGRESS | 기존10/13묶음76.9%, OS10/12/13 잔여. 최신 이동/읽음 영향은 재수락 중 |
| 6 기록/U5 | IN_PROGRESS | 도메인 전체0/4, 실제 CRUD/일부 실패 복구와 전체 필수 수락은 구분 |
| NAV-01 | IN_PROGRESS | 새 후보 실제 warm/cold·Back 수락과 시작 handoff·빠른 입력 잔여 |

- 최종 마감 항목 비율은2/7=28.6%다. 코드 작성량·앱 전체 개발률·개별 필수 행의 가중 완료율이 아니다. 이후 런타임/서버가 바뀌면 영향 있는 해당 수락을 재개방한다. 중간 설명의1/7=14.3%는 최신 CI와 외부 설정 최종 대조 전 시점이며 그 뒤 완료된 두 항목과 구분한다.
- 새 업무 원본: Kakao 물리의 정상 댓글 좋아요→66159a9f→FCM accepted/Google 에뮬레이터 OS→정확한 QA 댓글→12:46:38.865682Z read_at·Back1회 Home을 확인했다. `community-like-consumed.json`과 `push-request-like-01-*`이 근거다. QA 전달 시험용 news.direct 행은 이 업무 E2E에 합산하지 않는다. QA 댓글2개/좋아요1개는 영향 있는 재시험 뒤 정상 UI로 정리할 예정이다.
- 관찰: 새 warm 영상은 서버 대기를 실제 알림 요청 화면 안에서 처리한다. 원래 Home이 native 재개 및 정상 push 출발 화면으로 보이는 구간은 잘못된 중간 Home reset과 구분하며, 영상을 검토하기 전 전역 무플리커 PASS로 올리지 않는다. cold 영상의 흰 native→JS handoff는 기존 BOOT-01 잔여로 유지한다. 전체 미동결·원래7~9 미착수·STORE HOLD다.

## 2026-10-28 실제 댓글/답글과 OS warm 이동의 준비 지연

- 최신 설치3c31287fa874d34e4e052bbbabe175e8f1aeaac8/[CI40684999925](https://github.com/jaejun0617/nuri-app/actions/runs/40684999925) 전체 후속 PASS·runtime e0ebf56642b4b5360989db0b24deea81e67f947d9152beacf205054a9586576d·bundled Debug APK76e656052b7f803ec8bd793416668b63a442971bcbcd6bef58590bfe8765ab3c을 양쪽 보존 설치/Metro OFF로 확인했다. 실제 offline 재시험에서 네트워크 안내·입력 보존·서버0·network1/1 복원을 수락했다(`schedule-network-acceptance.json`). 이전 일정의 정상 성공/예약 경로는 오류 전달1줄만 달라 영향 없이 재사용하며 전체 응답 유실/도메인 완료로 확대하지 않는다.
- 신규 업무 원본 E2E: 기존 Kakao QA 소유 cef6a6d1 게시글을 그대로 재사용했다. Google emulator의 정상 댓글 bc550ea3→a1079375/FCM accepted/물리 OS 해당 본문→정확한 댓글 문맥→read_at12:17:30.532994Z를 확인했다. Kakao 물리의 정상 답글 a37a783b→47923dc5/accepted/에뮬레이터 OS 해당 본문→펼친 해당 답글 문맥→read_at12:21:03.579474Z도 확인했다. 각 원본1알림/수신 대상1기기이며 답글에 게시글 작성자용 중복 댓글 알림은 없었다. `community-business-acceptance.json`이 증거를 연결한다. transport 행 삽입/원장 직접 지급이 아니다. 두 QA 댓글만 영향 있는 다음 NAV 재시험을 위해 보존했고 기존 게시글/사용자 콘텐츠는 수정하지 않았다.
- 새 NAV FAIL: physical OS warm 탭 영상208개 수집 프레임에서 기존 Home이26.136222~27.652467초(약1.516245초) 먼저 보이고 댓글 화면이 열린다. 원래 출발 Home의 native 복귀이지 잘못된 Home reset이라고 추정하지 않는다. App이 목적지를 알기 위한 detail/preferences의 두 조회를 기다린 뒤 dispatch하는 실제 순서와 연결한다. 기존 More의 별도 해결을 취소하거나 정상 슬라이드의 출발 화면과 혼동하지 않는다. 물리 영상은1080×2340/34.762489초/208 frames/약5.98fps VFR이며3개 sheet의 전 수집 프레임을 검토했다. emulator 답글 영상은 탭 전에 종료돼 탭 영상 PASS로 쓰지 않으며 UI/서버 읽음 증거만 연결한다.
- 최소 후보: warm OS 요청은 기존 NotificationDetail의 실제 헤더/Back/로딩/실패/재시도 화면으로 즉시 push하고, 서버 확인이 끝나면 그 요청 화면만 typed 목적지로 replace한다. HomeQuick 또는 이미 진행 중인 요청은 replace하여 임시 요청 stack을 쌓지 않는다. 일반 알림 상세/소식/접근 불가의 명시 동작, cold Splash의 기존 owner/부트 게이트,400ms/기존 native motion은 유지한다. 고정 지연·전역 가림막·애니메이션 OFF·전역 lock을 추가하지 않았다. 목적지가 있는 요청 화면은 읽음 처리하지 않고 실제 목적지의 기존 표시/도메인 성공 후 읽음을 유지한다. 계정 불일치/Back/계정 A→B→A의 늦은 조회를 차단한다.
- 새 관련32/32·타입/lint를 검사 중이다. 최초 전체4552PASS/1FAIL은 설정 시험의 gcTime0 수집 timer와 ‘unmount 뒤 서버 성공 cache’ assertion의 경합이다. 분리 실행은12/12 PASS였고 제품 cache 정책은 바꾸지 않았다. 같은 시험에서 GC timer만 통제해 서버 확정 값 assertion을 그대로 유지한 뒤 timer 실행 후 실제 수집도 추가 검증했다. 최신 전체/CI·새 보존 설치·OS warm/cold/Back 재수락이 남아 있으며 소스 완료를 NAV PASS로 쓰지 않는다. OS10/13(76.9%) 한정 수락·기록4도메인 전체0/4·전체 미동결·원래7~9 미착수·STORE HOLD다.
- 이 요청 화면 후보의 최종 전체337suites4553/4553·타입·관련lint0오류/0경고·diff PASS다(`push-request-loading-full-corrected.json`). 이전4545개와 신규8개를 구분하며 실제 설치/동일 SHA CI 수락은 이어서 기록한다.

## 2026-10-28 일정 실제 수락과 offline 오류 원인 보존

- 설치39c36f019d89fedaf84073de3c072ea85c3bba3f/[CI40682565945](https://github.com/jaejun0617/nuri-app/actions/runs/40682565945) 모든 후속 PASS·runtime46bc85491d0da91a81bcf68d37639e5fa0faf1da6a24f771d54ebee3e91f27f8·bundled Debug APK845d4d9ca383fc4182d32abcd8f0a3aced27ac5d2fe9218dbce95afade8b0ab1을 물리/Google Play 에뮬레이터에 동일 서명·UID·최초 설치·권한·데이터 보존/Metro OFF로 설치했다. `delivery-schedule-submission`이 영수증을 소유하며 실제 수락은 `schedule-crud-acceptance.json`이다.
- 에뮬레이터 요청 전 네트워크 차단→실패/서버0→제목/메모 보존→네트워크 복구/정상 저장 연속2탭→ed4eeb2b1개/매일/5분 전 native 예약1개를 확인했다. 같은ID의 제목/메모 수정과10분 전 변경은 이전5분 예약을 교체했다. 미래 일정 명시 완료 후 예약0, 정상 삭제 후 서버0/추적한 해당 native 예약0·빈 목록·동일 More 복귀를 확인했다. 네트워크1/1 원복, 기존 사용자 일정 변경0이다. 첫 과거 시각 시험은 입력 검증에서 차단돼 네트워크 주입 NOT_RUN으로 별도 보존했다.
- 녹화는1080×2400/75.191944초/335 encoded frames(약4.45fps VFR), SHA f6fde9aa9124661d60adc90bf80a79ec5fde06e0fd4473fa19b97f3177de602d다. 3개 sheet의335개 수집 프레임에서 편집 완료·목록·상세·완료/삭제 확인창의 정상 경로를 관찰했다. 영상은 삭제 실행 뒤 복귀 전 끝나므로 삭제 복귀는 UI/서버 영수증으로만 수락한다. 모든 compositor frame/전 경로/FCM 수락으로 확대하지 않는다. 복사 hash 확인 뒤 이번 remote 영상만 제거했다.
- 새 실제 FAIL: offline의 auth.getUser 오류를 createSchedule이 버리고 user=null을 ‘로그인 정보 없음’으로 바꿔 재로그인을 요구했다. 실제 세션은 유지돼 재로그인 없이 저장 재시도에 성공했다. SDK 오류를 공용 network 분류로 그대로 전달하는1줄 보정을 추가했다. 회귀1FAIL/8PASS→관련52/52·타입/lint0오류/0경고이며 새 전체/CI·설치 후 정확한 offline 안내 확인은 이어서 기록한다. DB/인증/예약 정책 변경0이다.
- 일정 정상 CRUD·요청 전 실패/입력 보존 수락을 저장 후 응답 유실·실제 늦은 owner callback 전체 E2E로 확대하지 않는다. 기록 도메인 전체0/4·OS10/13(76.9%)·전체 미동결·원래7~9 미착수·STORE HOLD를 유지한다.
- offline 오류 보존 후보의 최종 전체336suites4545/4545 PASS(`schedule-auth-network-full.json`)다. 이전4544개와 새 오류 회귀1개를 구분하며 동일 SHA CI·새 설치/실제 안내 수락을 대체하지 않는다.

## 2026-10-28 일정 저장 재시도와 소유 경계 후보

- 원래6의 일정은 응답을 받기 전 재시도하면 새 서버 PK로 INSERT할 수 있었다. 원격 기존 UUID PK와 owner/pet 열을 읽기 전용으로 확인했고 DB/RPC/RLS/예약 정책은 바꾸지 않았다. 폼 수명 안에서 요청 전에 만든 UUID를 유지하고23505일 때 현재 owner/pet의 동일한 미삭제 row만 확인한다. 수정 입력을 upsert하지 않고 명시적인 ‘일정 확인’에서 최신 서버 값을 다시 읽어 기존 완료/예약 흐름을 진행한다.
- 화면 이탈·아이 변경·계정 A→B→A 뒤 늦은 완료/안내/이동은 기존 useOwnerOperation 세대로 차단한다. 이미 서버에 전송한 요청의 취소나 일정 초안의 프로세스 영속 복원을 구현했다고 주장하지 않는다. 일반 기록의 기존 durable draft 증거와 구분한다.
- 최초 서비스 회귀4FAIL/3PASS, 날짜 복귀 계약1FAIL을 보존했고 생산 코드의 점 구분 날짜를 기존 ISO 일자 계약으로 정규화했다. 관련5suites75/75·타입·관련lint0오류/0경고·source guard PASS다. 최초 전체4543PASS/1FAIL은 일정 폼 시험의 로그인 전제 누락이었으며 로그인 fixture만 보강했다. 원래 알림 offset/반복·저장 assertion은 유지한다. 최종 전체336suites4544/4544 PASS(`schedule-submission-full-corrected.json`)이며 동일 SHA CI·보존 설치·실제 실패/재시도·예약 수락은 이어서 기록한다.
- OS 상태10/13(76.9%) 한정 수락과 기록 도메인 전체0/4를 유지한다. 전체 배치 완료율을 임의 산출하지 않으며 이번 설치와 일정 실제 QA 뒤 인증·OS10/12/13·업무 이벤트·남은 실패 복구를 계속한다. 원래7~9 미착수·STORE HOLD다.

## 2026-10-28 디스크 캐시 설치 수락과 실제 XP 원본 알림

- 최신 설치는a53f62e6c781012d46bb853605df9e8bd92f5d39/[CI40678423371](https://github.com/jaejun0617/nuri-app/actions/runs/40678423371) 모든 후속 단계 PASS, runtime a135892ca529866a3a00a96e720ec6bccf647f99d8b92645bddc1557f6c317a7, APKc80541db402af7ef2a609b3a7f75ed628d6e1bde63785fab4ed422a01f81deed다. `delivery-home-cache-restore`의 build/두 설치/CI는 동일 서명·UID·최초 설치·권한·데이터 보존/Metro OFF를 확인한다. Full335suites4531/4531·타입·관련lint0오류/기존11경고다. 이 이후 문서만 바뀌면 앱 입력은 불변이며 같은 APK를 재설치하지 않는다.
- 실제 cache 수락: 보존한 QA0a9a9479를 알림에서 연 뒤 정확한 QA 제목 확인→정상 삭제→원래Home 복귀→일반Timeline0개/카드0을 확인했다. Home으로 복귀한 뒤 앱 UID/PID SIGKILL(stopped=false, 데이터 삭제0)→정상 재실행→같은 Googleet⁶→Timeline0개/카드0을 다시 확인했다. 물리의 누리 일반 목록22개와 선택도 유지됐다. `cache-delete-acceptance.json`, `cache-delete-server-zero`, warm/cold empty와 physical-existing-records UI 영수증이 근거다. R1~R6 QA 기록은 모두0이며 기존 기록을 비우거나 캐시 전체를 삭제하지 않았다.
- 실제 업무 원본/읽음: R6 저장의 record.created e29f29d0와 재시도에서 정상 확정된 XP ledger b1457226(timeline_memory/0a9a9479/+20)→activity.xp_granted18cf8ca6을 확인했다. 재시도2회에도 ledger와 두 원본 알림은 각각1개다. 최신 Home quick에서 XP→활동 요약→read_at11:20:08.940927Z, 기록→정확한 R6 상세→read_at11:20:50.074067Z·Home badge22→21→20을 연결했다. 뒤의 삭제 알림2cd03ccc는11:22:00.412221Z 원본에서 생성됐다. `interrupt-business-server/consumed/after-delete-business`와 두 목적지 UI가 근거이며 transport 행 삽입/모의 원본이 아니다. 각26eventType/OS 전달 전체 PASS로 합산하지 않는다. 삭제 후 기존 XP 보존 정책을 변경하지 않았다.
- 녹화는1080×2400/141.662878초/416 encoded frames, 약2.94fps VFR이다. 3개 contact sheet의 수집 프레임을 확인했고 정상 삭제 후 반환·빈 목록을 관찰했다. cold 시작에는 기존 native 아이콘→흰 handoff→JS splash→Home이 보인다. 캐시 수락을 native-first splash의 시각적 마감/전역 무플리커로 확대하지 않는다. 복사 hash 대조 후 이번 remote 영상만 제거했으며 원본은 외부 증거 루트에 보존했다.
- 다음1순위는 남은 일정의 저장 응답 유실/예약·계정 경계와 사진·건강 실패 복구다. 원래1~6/NAV 전체 미동결·기록4도메인 전체0/4·OS10/12/13 미마감·원래7~9 미착수·STORE HOLD를 유지한다.

## 2026-10-28 저장 중단 복구 수락과 Home 디스크 캐시 보정

- 4a8b67a97796e6f0ff33c0f257a1a5f2f52f0d1b/[CI40676454025](https://github.com/jaejun0617/nuri-app/actions/runs/40676454025) 후속 전체 PASS, runtime efcb14d1f5225f3345dfd67f3d1fe9a6db3e8997f990c964be0bc84ee6dad346, bundled Debug APKbbdbe40c51f97c354cbd4b2986f6fc82186d1af83a171c1cb0288bb19a99cbd0를 양쪽에 동일 서명·UID·권한·데이터 보존/Metro OFF로 설치했다. `delivery-record-cache-race`의 source/build/install/CI 영수증과 전체334suites4523/4523·critical127/127·타입·전체lint0오류/기존24경고·diff를 연결한다. 첫 source guard는 shell PATH의 Yarn 불일치로 거부됐고 승인 Node24/Yarn3.6.4 경로에서 그대로 PASS했다. 검증 강도/설정은 바꾸지 않았다.
- 실제 중단 복구: Google emulator에서 QA-20261028-INTERRUPT를 정상 저장했고0a9a9479가11:05:49.906774Z에 확정된 것을 host read-only SQL로 확인했다. 같은 시점의 작성 submit disabled/폼 잔존을 확인한 뒤 해당 QA 앱 UID/PID만 SIGKILL했다. pid없음/stopped=false·앱 데이터 보존이며 Android 설정 강제 종료와 다르다. 재실행 후 owner/pet별 초안의 제목/원문이 복원됐다. 본문을 QA-interrupt-retry-edited로 바꾸고 정상 submit을 두 번 실행했으나 서버는 같은ID/created_at/updated_at·QA-interrupt-original1개를 유지했다. ‘저장된 기록을 확인했어요’→‘계속 작성’은 수정 입력을 보존하고 ‘기록 보기’는 실제 저장 원문 상세를 열었다. `record-interrupt-acceptance.json` 및 해당 UI/서버 영수증이 근거다. 1080×2400/4.135489초/173 encoded frames 영상 SHA b31a59c5051f5677018922db6097fa0bf7ef155d4f5d1fa43e2956a29a2c28e4를 보존했다. 중단 전후 정상 원본 저장 복구 PASS이며 어느 TCP 응답이 유실됐는지는 입증하지 않는다. 네트워크 shaping은 원래 unlimited/0ms로 원복했고 QA 행은 다음 캐시 삭제 수락에 재사용한다.
- 새 FAIL: 새 설치 후 Timeline에서도 삭제된 QA-20261028-REPLAY 카드가 서버0/카테고리0에 남았다. 늦은 페이지 경합 수정의 실제 전체 해소라고 보고하지 않는다. 실제 Home 코드가 디스크 복구 시 items0만 확인해 이미 ready인 서버 빈 결과도 replaceAll로 덮었고, 두 목록이 모두 비면 디스크 저장 자체를 생략해 오래된 데이터를 남겼다. 프로세스 종료 뒤에도 반복되는 현상과 이 경로를 연결하되 저장 파일 원문을 추출했다고 주장하지 않는다.
- 최소 보정: 두 store의 restoreFromCache는 아직 확정되지 않은 빈 상태에만 preview를 넣는다. 서버 ready/로컬 mutation 결과는 건드리지 않고 진행 중 요청의 status/requestSeq를 그대로 유지해 늦은 디스크가 정상 서버 완료를 취소하지 않는다. idle에서 복구돼도 bootstrap을 실제 실행하고 offline error는 error로 유지한다. Home은 이 복구 API를 사용하며 두 목록이 실제 ready이면 빈 snapshot도 저장한다. source/pet 범위·기존 캐시 key/수명·디자인·400ms·DB/서버 정책은 변경하지 않았다.
- 새 관련3suites25/25·타입 PASS, lint0오류/기존 Home shadow11경고/신규0이다. 이전4523개의 CI/설치를 이 새 미커밋 후보 수락으로 사용하지 않는다. 최신 전체/CI·보존 설치·QA 행 삭제와 재실행/빈 목록 실제 확인이 다음1순위다. 기록4도메인 전체0/4·OS10/12/13 전체 미마감·원래7~9 미착수·STORE HOLD를 유지한다.
- 이 디스크 복원 후보의 최종 전체335suites4531/4531·타입·관련lint PASS다(`home-cache-restore-full.json`). 기존4523개와 신규8개를 구분하며 동일 소스 CI·설치는 아직 별도 수락 대상이다.

## 2026-10-28 건강 상세 설치 수락과 기록 캐시 경합

- 설치 기준은7f428863e604555570335dbe7cd4b781ccf368ba/[CI40671978734](https://github.com/jaejun0617/nuri-app/actions/runs/40671978734) 후속 전체 PASS, runtime7eca30a32877fe868a5e4382e63e28f3afcb45249bdaf1aea84005f4e78dce7e, bundled 내부 Debug APKd681a45a0fc0719842c5e5b997442399349ea7479711b34186177dba7408f735다. `delivery-health-detail-context`의 빌드/물리·에뮬레이터 설치/CI 영수증으로 동일 서명·UID·최초 설치·권한·데이터 보존과 Metro OFF를 확인했다. 아래 이전 설치 대기 표기는 당시 이력이며 이번 건강 상세 수락으로 갱신한다. Store RC/Release 성능 검증본은 아니다.
- 물리 SM-S937N에서 More→건강→QA648346cc 상세→같은 건강→같은 메뉴→Home5/5를 확인했다. header Back3회/system Back2회이며 선택 아이와 메뉴 항목 bounds를 보존했다. `health-context-physical-result.json`과143.715244초/1080×2340/786 encoded frames 영상(SHA521e36bceae577c0e34cda9e356e0a993f250b07e96bba28896cb2837c5bb214)이 근거다. 6개 contact sheet의786개 수집 프레임에서 의도하지 않은 More 가림/중간 Home/공백을 관찰하지 못했다. 약5.47fps VFR이며 마지막 sheet의 검정 채움은786개 뒤의 빈 셀이다. 모든 compositor frame이나 전 경로 PASS로 확대하지 않는다.
- 같은 실제 건강 기록을 QA-health-condition→QA-health-edited로 정상 수정했다. 같은 ID/created_at/health metadata와10:40:46.676989Z updated_at, 상세·이전 건강 목록의 새 본문을 확인했다. 삭제 확인창의 QA 제목 대조 뒤 해당 행만 삭제했고 원래 건강 목록/빈 당일 화면으로 복귀했다. `health-record-edited-server/detail-edited/list-edited/delete-confirm/after-delete-return/deleted-server`가 근거다. 기존 체중3로그/6kg와 기존 일반 기록은 보존했다. 건강의 정상 CRUD와 요청 전 offline 복구 부분 수락이며 도메인 전체 수락은 아니다.
- 별도 실제 관찰: Google emulator의 일반 Timeline에서 서버/카테고리0인데 이미 삭제된5117d952 카드가 남았다. `timeline-empty-count-stale-card.png/json`과 read-only 서버0을 보존했다. 명시 새로고침 뒤 빈 화면으로 일치했다. 이 과거 관찰의 정확한 요청 순서는 미계측이므로 원인을 단정하지 않는다. 통제된 store 검사에서는 삭제 전 loadMore 응답의 재삽입, replace 뒤 이전 refresh 덮어쓰기, cache clear 후 동일 request 번호 재사용, 늦은 page 실패 덮어쓰기6개 실패를 실제 재현했다(`record-race-before`:6FAIL/5PASS).
- 최소 보정은 recordStore의 단조 증가 요청 identity와 해당 아이의 write/clear 시 이전 refresh 공유 해제다. 이전 페이지의 성공·실패를 무시하고 변경 뒤 새 refresh는 실제 새 조회를 시작한다. 변경이 없으면 기존 동시 refresh 공유를 유지한다. DB/RLS/서버·디자인·400ms·목록 remount는 변경하지 않았다. 새 경합11개 및 관련8suites88/88·타입 PASS다. 첫 lint의 사용하지 않는 이전 st1개를 제거한 뒤 관련lint0오류/0경고다. 이 보정의 최신 전체/CI/설치 수락은 아직 남는다.
- 응답 유실 시험은 보수적으로 미수락이다. 에뮬레이터에만10,000:1kbit/s를 적용해 실제 c15d8d9e(QA-20261028-REPLAY,10:50:31.90584Z) 저장 후 네트워크를 차단했지만30초 관찰에서 실패 UI가 없었고 원복 뒤 정상 상세에 도달했다. `replay-loss-*`는 실패 주입 시도/NOT_RUN이며 중복 재시도 PASS로 합산하지 않는다. wifi/data1/1·속도 unlimited·지연0ms를 finally로 복원했다. 해당 QA 행은 정상 삭제했고 `replay-deleted-server`의 QA 기록0과 `replay-after-delete-settled` 빈 목록을 확인했다. 운영 시간/다른 기기 네트워크/서버 정책은 변경하지 않았다.
- 다음1순위: 이 캐시 보정의 최종 검사·CI·보존 설치와 실제 삭제/재진입을 확인하고, 기존 응답 유실·사진·건강·일정 실패 복구 및 OS10/12/13·인증·실제 업무 이벤트 미마감을 계속한다. OS 기존10/13 한정 수락, 기록4도메인 전체0/4, 전체 미동결·원래7~9 미착수·STORE HOLD를 유지한다.
- 캐시 보정의 최종 전체334suites4523/4523·타입·관련lint0오류/0경고·diff PASS다(`record-race-full.json`). 이전4512개와 신규11개를 구분하며 새 소스 CI·설치 수락을 대신하지 않는다.

## 2026-10-28 OS07/09 수락과 건강 상세의 계층 결함

- 앱79fc198/동일 CI·양쪽 설치 후보에서 OS07의 두 준비 조건을 분리했다. 최근 목록의 Pet Nuri 카드 제거 후 pid없음/stopped=false를 확인한 e4cc7dd2, task를 유지한 채 QA 앱 UID SIGKILL로 pid없음/stopped=false를 확인한4c71c7a5 모두 정상 FCM 경로→실제 OS 단일 표시→탭/상세→서버 읽음→Home을 확인했다. read_at은 각각09:55:50.791399Z/09:59:04.832688Z이며 각25초 영상과 `recents-removed-verified/process-absent-tap-result`가 후보/해시를 소유한다. 첫 swipe가 카드를 제거하지 못한 채 발행한 ab29157d는 준비 미충족으로 OS07 수락에서 제외했고 재현 실패나 제품 결함으로 계산하지 않았다.
- OS09: Google 에뮬레이터만 wifi/data0/0 및 Active default network:none에서 fab6c290를 정상 worker/FCM accepted 상태로 만들었다. OS0 확인 후 원래1/1 복원 시 실제 단일 알림 표시→탭→읽음10:02:27.695872Z→Home을 확인했다. 별도957b8b4a는 QA transport에만120초 수명을 부여했고 실제 accepted 후10:05:38.075276Z 만료까지 계속 offline이었다. 재연결 후15초/3개 관찰의 OS0과 네트워크1/1 복원을 확인했다. `os09-valid-*`, `offline-valid-tap-result`, `os09-expiry-result`가 증거다. 서버/API 또는 native 중 어느 계층에서 폐기됐는지는 미확정이며 실제 업무 이벤트 E2E나 모든 지연 상황의 보장으로 확대하지 않는다. 기존 worker/data payload·FCM normal·native expiry guard·운영 수명은 변경하지 않았다. [공식 수명 계약](https://firebase.google.com/docs/cloud-messaging/customize-messages/setting-message-lifespan)의 accepted/표시 구분을 적용했다.
- 실제 건강 원본: 물리/누리에서 QA-20261028-HEALTH 입력 후 요청 전 offline 저장 실패/서버0→입력·normal 컨디션 보존→네트워크 원복→정상 재시도1개(648346cc, category health/condition,10:10:28Z)→보상 확인/건강 목록 반영을 확인했다. `health-offline-*`, `health-record-created-server/after-create-return`가 근거다. 응답 유실 수락은 아니며 이 QA 기록은 새 계층 수정의 상세/편집/삭제 검증을 위해 보존 중이다.
- 신규 NAV FAIL: 위 건강 목록에서 정상 생성 행을 열자 원래 HealthReport가 AppTabs/Timeline RecordDetail로 돌아가고 보존된 More가 그 위에 실제 표시됐다. `health-detail-more-overlay-observation.png/json`으로 UIA underlay 혼입과 실제 화면 가림을 구분했다. 하단 탭 보정은 이 별도의 상세 진입을 바꾸지 않았다. 같은 TimelineStack을 Root HealthTimeline에 재사용해 현재 건강 화면 위에 상세를 열며, header/삭제 Back은 바로 아래 실제 HealthReport가 있을 때만 부모 stack을 pop한다. 건강 날짜/탭/스크롤/More 문맥과400ms·native 상세 정책은 유지하고 전체 navigator를 교체하지 않는다. 돌아올 때 해당 아이의 건강 query만 무효화해 편집/삭제 결과를 재조회한다. 다른 entry의 기존 health fallback은 유지한다.
- 수정 전 새 회귀3FAIL/78PASS를 보존했다. 첫 수정 뒤 구 destination 기대1FAIL은 같은 pet/memory/entry 검증을 유지해 새 presentation에 맞췄으며 새 route를 누락한 transition 분류는 TypeScript가 차단했다. 명시 detail 정책을 추가한 뒤 관련132cases·타입 PASS다. 최신 전체/설치와 QA 기록 편집/삭제·실제 Back 수락은 아직 남는다. 기록 전체0/4·전체 미동결·STORE HOLD다.
- 건강 계층 보정의 최종 전체333suites4512/4512·타입·관련lint0오류/0경고·diff PASS다(`health-detail-presentation-full.json`)。 이 검사와 새 설치/해당 소스 CI는 구분한다. 기존 OS13묶음 중 관찰 범위를 명시해 수락한 것은10개이고 OS10/12/13의 전체 수락은 남는다. 전체 배치 완료율이나 앱 전체 개발률로 바꾸지 않는다.

## 2026-10-28 상세 명시 탭 수정의 실제 설치 수락

- 앱 소스79fc198a833467fc50e235d7268bfdaf3a615d40/[CI40666412971](https://github.com/jaejun0617/nuri-app/actions/runs/40666412971) 후속 전체 단계 PASS, runtime b7ecdc2393bb0c6eec3eddf096dc05fb0702e782f9cf67adc0431ac0827319bf, bundled 내부 Debug APK3d22fe81df1c2016a6ce3de610abda59f4017da26d6c2aa148889a8f09caaa70다. `delivery-retained-menu-toolbar`의 빌드/양쪽 설치/CI 영수증이 동일 서명·UID·최초 설치·권한·데이터 보존, Metro OFF를 확인한다. 문서만 후속 변경되면 이 앱 입력을 재설치하지 않는다.
- 물리 SM-S937N에서 More→건강→하단 Home3/3, More→건강→header Back의 같은 메뉴 위치1/1, More→건강→하단 Timeline1/1을 확인했다. 선택 아이도 유지됐고 총5/5다. `retained-menu-physical-result.json`과 실제85.950744초/452 encoded frames/1080×2340 영상이 근거다. 5개 contact sheet의452개 수집 프레임에서 의도하지 않은 More 재노출·Home 경유·빈 화면을 확인하지 못했다. 평균 약5.26fps VFR 관찰로 모든 compositor frame 또는 전체 경로 PASS를 선언하지 않는다.
- 준비 helper 첫 실행은 recorder가 없는 pidof의 정상exit1을 오류로 처리해 녹화 전에 중단됐다. status0/1을 구분한 뒤 한 번 실행했으며 제품 재현 실패/추가 빌드로 계산하지 않는다. AppNavigationToolbar의 실제 호출부는 AppTabs/More/건강이며 override와 Back은 기존 검사/기기 결과로 구분한다. 공통 코드 검토를 모든 개별 메뉴의 실제 실행으로 합산하지 않는다.
- 다음: 앱 소스 변경 없이 OS07 최근 목록 제거/프로세스 미실행, OS09 네트워크/만료와 나머지 인증·이벤트·기록 실패 복구를 계속한다. 전체 미동결·기록4도메인 전체0/4·원래7~9 미착수·STORE HOLD다.

## 2026-10-28 최신 설치 수락과 상세 툴바의 잔존 메뉴

- 설치 기준은618b0fc91803a42a774f6b8bc8d894671b65cd22/[CI40660757723](https://github.com/jaejun0617/nuri-app/actions/runs/40660757723) 후속 전체 PASS, runtime bdce38ba3bc61c62a95b42810d0fd1da01f9737ac51ab08342a01622c39b16ff, APK9e49cbfb33a39f524682f886e644f6c826cb49b1b34f14eca3ee2af19be15b0a다. `delivery-notification-delete-return`의 빌드·두 설치 영수증이 동일 서명·UID·권한·데이터 보존과 Metro OFF를 확인한다. 전체333suites4502/4502·타입·관련lint PASS다. Store RC/성능 검증본은 아니다.
- Google 에뮬레이터의 실제 기록 알림39dc1f05→5117d952 상세→읽음09:05:20.495197Z→해당 QA 기록 삭제→알림 목록→Back Home을 확인했다. `delete-return-inbox-confirmed`, `record-offline-deleted-server`와 `notification-delete-return-20261028.mp4`가 증거다. 영상은1080×2400/72.883756초/267 encoded frames, 평균 약3.66fps VFR이므로 모든 compositor frame 무플리커 증명으로 확대하지 않는다. 물리의 삭제된 기록 알림da73d838은 원문을 다시 노출하지 않는 안내 상세→읽음09:13:15.000843Z→Home 복귀를 확인했다. QA R1/R2/R3 기록은 모두 삭제했고 기존 기록은 보존했다.
- OS08: 에뮬레이터 Android 설정의 실제 ‘강제 종료’ 확인 후 stopped=true에서03c2deb4의 FCM accepted/OS0을 확인했다. 설정의 ‘열기’로 수동 재실행한 뒤 e1883deb와 앞선 메시지가 OS 자동 그룹으로 표시됐다. 그룹 summary 탭은 개별 목적지 수락에 합산하지 않았다. 분리된 후속 d13953f5는 실제 단일 알림 표시→개별 탭→상세→read_at09:17:26.474772Z다. `os08-stopped-before-send/stopped-after-accepted/relaunch-ready/recovery-child-displayed/recovery-child-destination`이 근거다. 실제 기기 구성은 물리1대+에뮬레이터1개이며 이 케이스 실행은 에뮬레이터다. 원래 OS 권한OFF는 남은 검증 뒤 복원해야 한다.
- 건강 부분 수락: 물리/누리의 정상 UI로 QA 체중9b171263(2026-10-28/QA-20261028-WEIGHT)를6.1→6.2kg 수정하고 Home6.2kg 반영을 확인했다. 해당 QA 행만 삭제 후 이전3개 로그와 pet6.00kg가 복원됐고 Home도6kg다. `weight-home-updated`, `weight-home-restored-after-delete`와 실제 서버 대조가 근거다. 건강 전체 실패 복구나 기록4도메인 완료는 아니다.
- 새 NAV FAIL: More→건강관리에서 하단 Home을 누르면 Home 위의 보존된 More가 그대로 나타나는 것을2회 확인했다. Root 상세 push에서 메뉴를 보존하는 정상 Back 계약과 달리, 공용 상세 툴바의 기본 탭 이동에는 메뉴 해제가 없었다. `AppNavigationToolbar`의 명시적 탭 이동만 기존 closeMoreDrawer를 호출한다. 커스텀 tab override/More push/Back/400ms는 유지한다. 회귀 검사는 도구의 잘못된 parent 선택을 고친 뒤 수정 전4FAIL/12PASS, 수정 후 관련6suites97/97·타입·lint0오류/0경고다. 현재 이 새 보정의 설치 수락은 남아 있다.
- 기존 native cold 각5회·More 왕복5회는 해당 후보의 한정 증거로 유지한다. 새 툴바 변경은 상세→명시적 탭/Back을 다시 검증해야 한다. 시작 native·인증·알림 읽음·서버는 이번 보정에서 바꾸지 않는다. 전체1~6/NAV 미동결·기록4도메인 전체0/4·STORE HOLD이며 다음은 이 후보 검사/보존 설치 후 위 신규 경로 수락이다.
- 이 툴바 보정의 최종 전체333suites4507/4507·타입·관련lint0오류/0경고·diff PASS다. 첫 전체4493PASS/14FAIL은 기존 아이콘 시험 mock에 새 close 함수가 없던 테스트 연결 오류로 보존했다. mock만 실제 계약에 맞추고14색상/기존 route assertion과 명시 탭4회 해제를 모두 검사했다. `toolbar-retained-menu-full-corrected.json`이 최종 결과이며 새 설치/동일 SHA CI와는 별도다.

## 2026-10-28 알림에서 기록 삭제 후 복귀 결함 보정 중

- 173b2334fe71e635d034545426aa7c800fe91d5b/[CI40656687504](https://github.com/jaejun0617/nuri-app/actions/runs/40656687504) 전체 후속 PASS·runtime64dbddaa3be3ec70b9d51204a3afd6311d6008cc8522a34b69651ac4b8a59c73·bundled Debug APK05645b075500e281a5550e2d99768e852335e0dd482b17161a1ee926760d5c27를 물리/에뮬레이터에 동일 서명·UID·데이터/권한 보존/Metro OFF로 설치했다. 실제 추모 아이 시트 표시, 살아 있는 아이 숨김과 추모 아이 작성 복귀→Home에서 살아 있는 아이 선택→일반 Timeline22개 일치를 확인했다. `memorial-visible-confirmed`, `alive-hidden-latest`, `timeline-selection-alive-after-memorial-return`이 근거다. 알림으로 다른 아이의 기록을 열었을 때도 실제 기록의 추모 상태를 사용했다.
- 실제 QA 기록227b0a0a(누리테스트)를 앱에서 작성·명시 기억 활동 포함 후 삭제했다. 기존 추모 기록은 수정하지 않았다. ME01은 이 새 기록이 아니라 앞선 기존 기억 활동 조회의 정상 engine refresh08:30:50Z에서 최초 부여됐다. award e4baa62b→알림6dff3d09→실제 해당 아이/ME01 보관함→read_at08:42:23.141314Z를 확인했다. 새 기록 알림7a1b1e95도 정확한227b0a0a 상세→read_at08:43:22.1939Z다. Home 선택은 누리로 보존했다. `title-me01-destination`, `memorial-notification-pet-not-global`과 관련 서버 조회를 연결하며 transport 삽입 E2E가 아니다. 다른25개 eventType의 실제 완료로 확대하지 않는다.
- 새 FAIL: 알림 전용 NotificationTimeline이 RecordDetail로 시작한 상태에서 삭제하면 기존 공통 삭제 코드가 notificationOpen 없는 TimelineMain을 그 안에 추가했다. 이 화면의 HomeTab 이동은 해당 부모에 없으므로 실제 시스템/헤더 Back이 모두 무효였다. 정상 원본 삭제는 완료됐고 해당 QA row0이다. `record-me1-after-delete-route`에 재현을 보존한다. 최소 후보는 알림 진입의 삭제 완료/기존 canonical 삭제 조정 경로만 stack Back으로 원래 알림 화면에 복귀시킨다. 일반·건강·일정 반환과400ms·Walk 데이터 엔진은 보존한다.
- 보정 검사: 수정 전 notification delete 회귀1FAIL/28PASS, 수정 뒤 관련68/68·타입 PASS다. 삭제 후 늦은 완료가 owner 변경/화면 이탈 뒤 navigation·cache에 적용되지 않도록 기존 useOwnerOperation을 상세 삭제에도 사용했다. 실제 네트워크 요청 취소나 서버 rollback을 보장한다고 쓰지 않는다. 새 소스는 아직 설치 수락 전이다.
- Google 에뮬레이터에서 요청 전 네트워크만 차단해 명확한 저장 실패/서버0개→입력 보존→화면 이탈 확인→재진입 초안 복원→네트워크 복원 후 실제1개 저장을 확인했다. ID5117d952, 제목QA-20261028-OFFLINE이며 소유 Googleet⁶/본문이 일치한다. `record-offline-failure-alert/failed-server/draft-restored/retry-server`가 증거다. wifi/data는 원래1/1로 복원했다. 저장 후 응답 유실·업로드 실패·건강/일정 전체 수락과는 별개이며 이 QA row는 후속 새 후보의 알림 삭제 수락에 재사용한다. 기록4도메인 전체 완료는0/4다.
- 다음: 최신 전체/CI·보존 설치 후 알림 진입 QA 기록 삭제→원래 목록·정상 Back을 확인한다. 실패 복구와 기존 OS13/이벤트17/인증 미마감은 계속한다. 원래7~9·STORE HOLD는 유지한다.
- 최신 삭제 반환 후보의 최종 전체333suites4502/4502, 타입·관련lint0오류/0경고·diff check PASS다(`notification-delete-full-tests.json`). 실제 설치 수락은 아직 남는다.

## 2026-10-28 일반 Timeline의 이전 아이 고정 수정 중

- f798be3/CI40653859668 전체 필수 PASS·runtime d2fe1b4f8aa2db5e878bf80189298f5c05c8836851a47755cff49d7193e1d9cc·APK5d964abd8e956798f8a891c8494e077385bd3d22aa91de3ce2d4ae8893220a4e를 물리/에뮬레이터에 보존 설치했다. Metro OFF 실제 살아 있는 누리 기록의 관리 시트에서 기억 활동 행이 숨겨지고 수정/삭제가 유지됨을 확인했다(`memorial-live-hidden`). 추모 아이의 실제 양성 수락은 아래 결함 때문에 아직 미확인이다.
- 실제 Home에서 누리→누리테스트를 선택한 후 하단 Timeline을 열어도 이전 누리22개가 남았다. 작성 복귀의 petId가 보존된 route에 남고 `resolveSelectedPetId`의 preferred 우선순위가 현재 선택을 가린 것이 원인이다. 새로운 후보는 일반 Timeline만 현재 선택을 따르게 하며 알림의 명시적 소유 펫/접근 불가 null/owner 회고·기간 조회는 보존한다. Navigator·400ms·route key·Back/같은 아이의 필터와 스크롤은 바꾸지 않는다. 표적63/63·타입 PASS, 관련lint0오류/기존ControlsBar shadow1경고/신규0이며 최신 설치 수락 전이다.
- 기록 R1(26e20439)의 실제 생성→사진 연결→본문 수정→사진 제거→Home 최근 기록 반영→재설치 후 유지→앱에서 QA 제목 확인 후 삭제까지 확인했다. 서버 해당 row0, 사진 참조0, 해당 Storage path0 및 Timeline23→22/일기11→10이다. `record-r1-created/edited/deleted-server`, `record-r1-home-summary`, 두 실제 영상이 후보·시각·해시를 소유한다. 일반 record.created/updated/deleted의 서버 알림3개는 업무 원본 생성 증거이며 클릭·읽음 E2E 또는 기록4도메인 전체 수락으로 합산하지 않는다. Home 삭제 후 갱신·실패 복구는 남아 있다.
- 최신 사용자 질문에 타임라인 대형 Hero 생략을 의견으로 제안했을 뿐 이미지·디자인은 변경하지 않았다. 현재1~6/NAV 미마감을 계속하며 원래7~9·STORE HOLD를 유지한다.
- 이 보정의 최종 전체333suites4498/4498 PASS(`timeline-pet-full-tests.json`)이며 표적63·타입·관련lint0오류/기존1경고·diff check와 연결한다. 최종 SHA의 CI·설치 영수증 및 실제 아이 전환은 후속 증거이며 검사 PASS와 동일시하지 않는다.

## 2026-10-28 최신 PO: 추모 아이의 기록 관리에만 기억 활동 표시

- 최신 PO가 ‘추억으로 함께하기’는 추모 프로필인 아이의 기록에서만 보여야 한다고 확정했다. 기존 공용 `isMemorialPet(deathDate)`와 상세 기록의 실제 petId를 사용한다. 전역 선택 아이가 다른 경우에도 그 상태를 대신 사용하지 않으며, 프로필 미확인은 추모로 추정하지 않는다.
- 함께하는 아이는 해당 행·switch·상태 조회를 모두 생략한다. 기존 기록·참여 데이터·획득 칭호·서버 RPC/집계·수신 설정은 변경하지 않는다. 기록 수정/삭제와 나머지 시트는 유지한다. 이 변경 때문에 기존 684c8f2 설치와 새 표시 후보를 구분해 다시 수락한다.
- 표적40/40·최종 전체332suites4492/4492·타입·관련lint0오류/경고·diff check PASS다. 실제 함께하는 프로필/추모 프로필의 단말 수락은 새 설치에서 이어간다. 기존 후보의 물리 Home 최근 기록에서 QA-body-edited까지 갱신된 것도 확인했다.
- 684c8f2/CI40651173067 후속 전체 PASS·runtime d024a087ff757aa2f6aff29cfe2ec09f3c5ace1da32007530edbf0a713711f02·APK102835367e76afc0a791085b470a1c2373a31479187287b6a690670db4aa7ffc를 두 인스턴스에 동일 서명·UID·데이터·권한 보존/Metro OFF 설치했다. 실제 물리 QA 기록26e20439 생성/사진 연결→본문 수정/사진 제거→상세·목록23개/일기11개 갱신과 서버 이미지0/해당 Storage path0을 확인했다. 기존 기록29개는 보존하고 이 QA 생성분의 나머지 조회/삭제·실패 복구는 계속한다.

## 2026-10-28 기록 재시도·초안·사진 소유 경계 후보

- 원래6의 실제 코드 진단에서 일반 기록의 재시도마다 새 UUID INSERT, owner/pet 없는 일반 초안 key, 사진 큐의 전달된 userId를 실제 인증 확인 없이 신뢰하는 경로를 확인했다. 운영 중 중복·혼입이 발생했다고 소급 단정하지 않는다. 현재 보정은 기존 memories PK/RLS와 기존 초안/업로드 큐를 활용하며 DB·XP 정책·새 오프라인 엔진을 바꾸지 않는다.
- 일반 작성은 암호학적 UUID를 초안에 먼저 보존하고 같은 ID로 재시도한다. 23505는 현재 owner/pet의 동일 row를 조회해 확인한 경우에만 기존 저장 안내를 하며, 편집한 본문·사진을 기존 row에 덮어쓰지 않는다. 기록 생성의 두 실제 호출부(일반/날씨)를 연결했다. 일반 초안은 owner/pet별로 분리하고, 레거시는 실제 서버 소유 펫 확인 뒤 같은 펫만 이동한다. 손상/저장 실패는 삭제·빈 초안으로 은폐하지 않고 재시도를 제공한다.
- 사진 큐는 현재 서버 인증과 앱 owner를 함께 확인하고 계정 A→B→A/이탈을 무효화한다. 변경 중에는 작업과 확인된 업로드 path를 보존하며 다른 계정으로 삭제/연결하지 않는다. 큐 변경은 직렬화한다. 실패는 호출당 한 번만 처리하고 기존5회 한도에서 자동 재시도를 멈추되 유일한 사진 계획은 삭제하지 않는다. 새 명시적 이미지 수정이 해당 계획을 교체하는 기존 동작은 유지한다. 한도 도달 후 사진 선택을 다시 적용하는 실제 UX는 아직 별도 기기 수락 전이다.
- 작성/수정/날씨의 picker·저장·후처리는 mounted owner/pet 요청 세대를 확인한다. AppProviders의 업로드 후 갱신도 계정 세대를 확인한다. 이미 전송한 요청을 취소했다고 주장하지 않으며 기존 서버 RLS가 최종 권한 경계다. GPS 원자 저장·엔진·거리·타이머는 수정하지 않았고 기존 연결 회귀 검사를 유지한다.
- 최초 전체 검사는 332suites 중329PASS/3FAIL, 4484PASS/4FAIL이다. 키보드 검사의 로그인 fixture 누락2개와, owner guard/검증된 replay 무효화가 추가된 뒤의 source 검사2개다. 로그인 전제·기존 busy 안정성·create/update/delete 캐시 무효화 검증을 유지해 표적16/16을 통과시켰다. `records-full-tests.json`은 최초 실패를 보존하며 최종 전체 결과와 설치 수락은 후속 증거로 구분한다.
- 수정 뒤 최종 전체332suites4488/4488, 타입·관련lint 오류/경고0·diff check PASS다. `records-full-tests-corrected.json`이 최종 결과이며 서비스/초안/owner/큐 계약 검사와 실제 UI 재시도의 회귀를 포함한다. 실제 단말·Storage·네트워크 유실 E2E의 대체 증거가 아니다.
- 다음: 최종 타입/lint/전체/CI와 동일 서명 bundled 후보의 일반 기록·사진·건강 생성/수정/실패/Back을 실제 확인한다. 일정의 응답 유실과 원래 인증·17이벤트·OS13·NAV 미마감은 계속 남아 있다. 코드 검사를 도메인4/4 또는 전체 동결로 합산하지 않는다.

## 2026-10-28 15:45 KST native 후보 수락과 기록 경계 착수

- 최신 설치 소스0302841a3e2a415557dc1e9f97f47682a1520456, runtime79968d7dc9e164fcf38e81177426b8cd44d0d4c2f14deaff54f0c2d192dc4b70, APK6c34778fffbeaedb17cb1d1ff5bd5a0790ac28b60cdec99c490b131350d815b7이다. delivery-screens-race의 동일 서명·UID·데이터·권한 보존/Metro OFF 설치와 [CI40643480162](https://github.com/jaejun0617/nuri-app/actions/runs/40643480162) 후속 전체 PASS를 연결한다. 실제 native 재컴파일이며 Fast Refresh가 아니다.
- 물리 cold5/5, emulator 유효 cold5/5(원래1+resume2+finish2), 각 목적지10초·선택 아이 유지·새 native crash0을 확인했다. emulator의 준비 실패2회는 SIGKILL 직후 ActivityManager가 죽은 task를 재사용해 `Activity not started/LaunchState UNKNOWN`을 반환한 경우다. 첫 실패의 stdout은 보존되지 않았고 두 번째는 launch-4.json으로 확인했다. QA helper만 실제 launcher resumed와 이전 ProcessRecord 제거를 기다리고 표준 MAIN/LAUNCHER로 시작해 남은2회 COLD를 확인했다. 제품에 고정 지연을 추가하지 않았다. 실패 영상/관찰도 보존하며 유효 성공과 합산하지 않는다.
- 물리 More→알림함→More→Home5/5, 메뉴 항목 bounds·선택 아이 보존이다. 150.223344초/1080×2340/1141 encoded VFR frames·평균약7.60fps 영상과2초 간격 contact sheet를 확인했다. 표본에서 의도하지 않은 중간 Home은 관찰되지 않았으나 모든 compositor frame 또는 전 경로 zero-flicker 증명은 아니다. screens-cold-* / screens-more-physical-*가 원본·해시·실제 조건을 소유한다. 과거 영상의 종료 원인은 계속 미확정이다.
- OS04 실제 채널 OFF: 물리 nuri_news만 true→false로 바꾸고 canonical Kakao transport231d44be를 전송했다. FCM accepted/7515등록1개, OS keys0이며 inbox는 보존됐다. 채널을 원래true로 복원한 뒤 실제 인앱→상세→06:41:35.354269Z 읽음을 확인했다. 앱 category·다른 채널·사용자 알림은 변경하지 않았다. channel-off-* / physical-news-channel-baseline/restored.json이 증거다.
- 다음 최소 단위는 기록 응답 유실·재시도와 초안 범위다. 실제 createMemory는 매번 서버 UUID INSERT이고 일반 draft는 owner/pet 없는 공통 key다. 요청 식별자와 기존 draft의 owner/pet 구분, 이탈/계정 변경 후 늦은 반영 방어를 보정한다. 현재는 코드 진단이며 실제 중복 생성 E2E를 이미 실행했다고 주장하지 않는다. DB/RLS/XP 규칙·새 오프라인 엔진은 변경하지 않는다.

위 수락은 1~6/NAV의 일부이며 이벤트17·OS13·기록4도메인 전체 완료나 동결이 아니다. 원래7~9·STORE HOLD를 유지한다.

## 2026-10-28 15:22 KST 세션 경계 수락과 시작 종료의 새 근거

- 로그아웃 보정 소스ae6a5d320b6d40a56c7f0befd3d4a1e7c671c2ed, runtime0fc57adf36fabeeed49e963797a3f8ecfd460d7ce3cb26d29b1842f957f0a74d, APKb912a4d33223eeec4e0ba7c34787a745657572e6a0c09181708e272017aecafa를 두 인스턴스에 동일 서명·UID·데이터·권한 보존/Metro OFF로 갱신했다. [CI40641481350](https://github.com/jaejun0617/nuri-app/actions/runs/40641481350)의 전체·critical·타입·lint·후속 단계 PASS다. delivery-local-logout 영수증이 소유한다.
- 실제 두 Google 서버 세션에서 물리만 logout한 뒤 물리 세션만 제거되고 에뮬레이터 세션714fa019는 유지됐다. 에뮬레이터 등록edf89425만 새 QA transport7a4ed093의 FCM을 접수했고 실제 OS 표시→탭→알림 상세→06:16:33.862971Z 읽음을 확인했다. 물리 OS key0, emulator1이다. local-session-before/after 및 local-logout-survivor-displayed/consumed 증거를 연결한다. 이 시험 중 강제 세션 만료·토큰 추출·신규 계정 생성은0이다. 이후 물리는 기존 Kakao SSO로 정상 복귀했다.
- OS11-SESSION-ISOLATION의 기존 FAIL은 위 후보/조건에서 PASS다. 두 인스턴스 전체 matrix를 완료한 것은 아니다. Google service OFF는 원래true로 실제 UI/서버 복원했다. 에뮬레이터 OS 앱 권한은 계속 임시true로, QA 종료 시 원래false로 복원해야 한다.
- 새 시작 종료: 물리의 설치 직후 첫 실행15:05:29/PID19803에서 native SIGSEGV를 확보했다. 재실행은 정상Home이다. 정확한 APK libreactnative BuildId a611525f8033715552514b1b0045a21f28ca315d와 역어셈블을 대조해 pullTransaction+520의 delegate vtable 두 번째 load(0x11dcaf4, x8=0x100000003)임을 확인했다. 실제 잘못된 delegate 상태는 확인되지만 그 포인터의 생성 주체까지 계측한 것은 아니다. 과거 영상/10월26일 종료의 원인을 동일하다고 소급 단정하지 않는다.
- 설치된 screens4.27.0에는 [공식4413](https://github.com/software-mansion/react-native-screens/pull/4413)의 미수정 초기화 경합이 실제 남아 있다. 4.27 유지·공식4파일만 Yarn patch로 역이식하며 upstream head204d36b4와 path mapping 후4/4 bytes 일치를 확인했다. 화면 전환/400ms/애니메이션을 끄거나 Navigator를 교체하지 않는다. 새 후보 Android 컴파일·bounded cold/Back 검증 전이므로 NAV 시작 안정성은 아직 FAIL이다.
- 별도 진단 도구: Metro JS를 제공하지 않는 inspector-only를 일시 연결해 세션 갱신을 관찰하려 했으나 emulator15:09/PID10940에서 Hermes native 종료를 관찰했다. 해당 시도는 성공 증거가 아니다. 즉시 도구를 종료했고 앱을 정상 재실행했으며 이후 세션/전송 검증은 Metro·inspector OFF에서 수행했다. 이 Hermes 스택과 물리 Fabric 스택을 하나의 원인으로 합치지 않는다.
- 새 C++ host 검사는 설치된 실제 RNSScreenRemovalListener를 컴파일해 mutation 보존·stale token·캡처 해제·재진입·동시 callback 교체를 검증했다. Fabric/JNI 값 타입만 stub이므로 Android 전체 PASS가 아니다. 최초 Mac CLT 기본 경로에 libc++ 헤더가 없어 컴파일이 실패했고 xcrun이 반환한 실제 SDK 표준 헤더 경로를 명시해 통과했다. assertion/대상을 약화하거나 skip하지 않았다.
- 이 공식 수정 후보는 전체328suites4461/4461·타입·관련lint PASS다. 설치 후 유한 관찰은 물리/에뮬레이터 각각cold5회(10초·Home 또는 고정 알림 목적지)와 대표 push/Back5회로 정한다. 앱 설정 force-stop과 일반 프로세스 미실행은 별도로 기록한다. 반복0종료는 관찰 조건의 결과이며 과거 전체 종료의 해소나 절대 무결함 증명이 아니다. 해당 원인의 새 단서 없이 반복 횟수를 계속 늘리지 않는다.

다음은 공식 native 수정의 Android 설치 후보와 시작/전환 수락이며 기존1~6/NAV 잔여는 계속한다. 전체 미동결·STORE HOLD다.

## 2026-10-28 14:59 KST 다중 세션 로그아웃 회귀 발견

- 5517 후보에서 물리 Google logout05:38:32Z 직후에는 에뮬레이터의 등록이 active였지만, 이후 원격 Google auth.sessions가0이 되고 에뮬레이터도 SignIn으로 복귀했다. 등록 row만으로 다른 인스턴스 세션 유지 PASS를 판정할 수 없었다. 기존 두 인스턴스 표시/읽음 동기화는 logout 이전 관측 범위로 보존한다.
- 실제 원인은 auth.ts의 signOut/signOutBestEffort가 옵션 없이 호출해 SDK 기본 global 범위를 사용한 것이다. 설치된 auth-js GoTrueClient와 [공식 signOut 계약](https://supabase.com/docs/reference/javascript/auth-signout)을 대조했다. 일반 로그아웃·복구 세션 정리와 개발 도구의 같은 버튼만 명시 local로 보정하며 계정 삭제·provider·callback·DB/RLS를 변경하지 않는다.
- 새 회귀 검사6개 중 수정 전5개가 scope 누락으로 실패했고, 최소 수정 후 관련5suites25/25·전체327suites4460/4460·타입·관련lint PASS다. 최신 후보의 설치·실제 두 세션 중 한쪽 logout 후 다른 쪽 갱신/수신은 아직 재검증 전이다. OS11의 세션 분리 필수 케이스는 현재 FAIL이며 이전 등록 해제 부분 PASS로 덮지 않는다.
- 알림 category OFF 시험 c6bbdc7e는 inbox 보존/worker suppressed/기기 발송0 및05:45:37.135983Z 서버 읽음을 확인했다. 이후의 전역 세션 해제로 인한 로딩/SignIn은 위 결함과 구분한다. 원래 Google QA로 정상 OAuth 재로그인해 Home으로 복귀했다. 임시 service OFF/에뮬레이터 OS 허용은 후속 QA 뒤 원래 설정으로 복원한다.

| 케이스 / 원래 번호 | 조건 | 현재 결과 | 상태 |
|---|---|---|---|
| OS11-SESSION-ISOLATION / 3·5 | 한 설치 logout 후 다른 설치 세션 유지·등록·수신 | 5517에서 전역 세션 해제 재현. 최소 수정의 기기 수락 대기 | FAIL |
| OS03-CATEGORY-OFF / 4·5 | news OFF, inbox 저장·읽음 유지/OS 발송 없음 | c6bbdc7e suppressed, device receipt0, 실제 인앱 선택/서버 read_at. 이후 세션 실패는 별도 결함 | PASS |

다음은 이 실제 결함의 새 후보 설치와 두 세션 재검증이다. 기존17이벤트·26eventType·OS13묶음의 분모는 유지하며 전체 미동결·STORE HOLD다.

## 2026-10-28 14:35 KST 최신 설치와 수락 누적

- 최신 앱 소스5517bd4e4569b0556c05d5cadcefaffd6efdeaa2, runtime4b4d2841761a9e5a4dc6047f96f7fc92c7fbf1d7fca5f99281389cc41ca83d35, APK19249651e7b3b2c11f9799a0c2771acd05178c19a5fbda0543914770a7e3b2dd다. 두 인스턴스에 동일 서명·UID·권한·데이터 보존/Metro OFF로 설치했다. delivery-footer-cta의 build/installation/emulator-installation 영수증과 [CI40635471433](https://github.com/jaejun0617/nuri-app/actions/runs/40635471433)의 전체·critical·타입·lint·후속 단계 PASS를 연결한다.
- 실제 CTA: 두 기록 아래 버튼[51,1835,1029,1981]px, 약347.73×51.91dp, 목록 끝에서 FAB 위55px다. footer-cta-physical.png/layout.json에서 헤더 링크·‘모든 아이’ 안내 없음, 목록 아래 중앙 CTA를 확인했고 클릭 후 기간 밖 기록이 다시 나타났다. 일반 Timeline·기간 날짜·선택 아이·Back은 보존했다.
- 이전1bac1d5의 실제 주간 warm3/3과 background2회·cold1회의 이동/읽음/Back 증거는 common resolver·Root·두 read/open hook·기간 query·Auth·Native push10파일 SHA가 최신과 같아 해당 범위만 재사용한다. 새 CTA 배치 자체는 이전 영상으로 대신하지 않았다. reused-notification-source-boundary.json이 원본/최신 파일 해시를 소유한다. cold의 기존 am kill 준비 실패1회는 새 메시지 발행 전 프로세스가 종료되지 않은 시험 준비 실패다. 다음 앱 UID SIGKILL(설정 강제 종료 아님) 후 실제 OS 탭→고정2행·서버 읽음·10초 안정·Back을 관찰했다. 과거 native SIGSEGV 원인은 여전히 미확정이다.
- 현재 두 인스턴스는 PO가 직접 로그인한 같은 canonical Google QA다. 이름이나 선택 아이가 아니라 서버 identity·Native owner·등록 owner로 확인했다. Google QA가 소유한 아이는 실제2마리이며 두 기기의 선택 아이가 서로 다른 것은 계정 불일치가 아니다. 물리1대+Google Play 에뮬레이터1개이며 실물2대 결과로 확대하지 않는다.

| 케이스 / 원래 번호 | 기대·조건 | 실제 결과·증거 | 상태 |
|---|---|---|---|
| B2-LATEST / 1 | 최신 앱 소스의 로컬·원격 필수 gate | 326suites4454/4454, 타입 PASS, 관련lint0errors/기존1warning, 동일5517 SHA CI의 후속 단계까지 PASS | PASS |
| B1-CUSTODY / 2 | 실환경 키·인증·암호화·QA 제한·보관 | 실제 FCM2등록 접수/단말 표시, Vault↔Edge digest 일치, 실제403 경계, key-custody와NURI3cron/cohort2 유지. 원문/앱 번들 유출·회전 없음 | PASS |
| AUTH-KAKAO-LOGIN / 3 | 기존 canonical provider 성공·Home·등록 | 실제 Chrome OAuth 후05:10:45.320227Z 동일Kakao ID 로그인, Native owner 일치/7515등록05:10:48 active·Home. 최초 Back 시도는 SSO가 먼저 성공해 취소로 계산하지 않음 | PASS |
| AUTH-KAKAO-CANCEL / 3 | provider browser에서 Back→SignIn, 세션 미생성 | Kakao browser 관찰 뒤 Back·로그인 화면 복귀, 기존 마지막 로그인 시각 불변. kakao-cancel-finalized.mp4(5.881167초/84 encoded frames)와 해시 복구 영수증. 최초 MP4 복사가 finalization보다 빨라 실패한 것은 도구 이슈이며 불완전 파일도 보존 | PASS |
| AUTH-GOOGLE-CANCEL / 3 | provider browser에서 Back→SignIn | google-cancel-observed-result.json, Native owner 없음·로그인 버튼 복귀, Metro OFF | PASS |
| AUTH-GOOGLE-LOGIN / 3 | 고정Google QA로 성공, 기존 데이터 | PO 직접 로그인 완료, 서버05:17:16.696377Z canonical ID·현재 Native owner/70e0등록 일치, 기존 아이2마리 Home | PASS |
| AUTH-RESTORE / 3 | Google 세션의 재실행·갱신 | 물리의 실제 COLD 재실행→기존Home/Native owner, 앱 데이터 초기화0. 에뮬레이터는10/25 세션이10/28 04:52:33 서버 refreshed_at으로 갱신됐고 현재 등록05:23:42 성공. 임의 만료 토큰 주입은 하지 않음 | PASS |
| AUTH-LOGOUT-DEVICE / 3·5 | 해당 설치의 owner/등록 해제 | Kakao logout05:09:28.653357Z, Native owner 없음/7515 revoked(user_logout), 재로그인 시 재연결. 다른 인스턴스 분리 해제의 최종 검증은 별도 미마감 | PASS |
| OS02-DELIVERY / 5 | OS 거부에서도 inbox 저장, OS 미표시 | 7dd5c9f7는 두 등록FCM accepted, 에뮬레이터 실제권한false/기존 및 이후NURI OS keys0, 인앱11개/해당 행 표시. 동시에 권한허용 물리에서는 실제OS 표시·탭·상세·05:22:15.206661Z read_at | PASS |
| OS11-LIVE-READ / 4·5 | 한 기기 읽음의 다른 인스턴스 실시간 반영 | 7dd5c9f7와01706689에서 물리 읽음 후 에뮬레이터 팝업을 재진입하지 않고11→10. server unread10과 일치. dual-read-emulator-live.json/dual-instance-live-read-sync.json | PASS |
| OS11-DUAL-DISPLAY / 5 | 같은 계정2등록·각 OS표시·탭 | 01706689가70e0/edf8 두 등록accepted·두 OS에 같은QA제목/각 UID 알림key1개. 물리 read_at05:26:27.105566Z, 이후 emulator OS 탭에도 동일 상세/읽음 시각 불변 | PASS |
| NAV-OS-QUICK-BACK / NAV | quick modal 배경의 OS탭 후 정상복귀 | 실제 emulator 상세→Back1회 Home/선택GooglePet 유지. 기존 App.tsx의 ephemeral quick replace 계약에 맞다. 초기 시험이 popup 복원을 기대한 것은 미확인 기대값이었으며 제품 결함으로 처리하지 않음. dual-instance-back-observation.json | PASS |
| OS05-NATIVE-FOREGROUND / 5 | 전경 인앱 갱신·native callback·OS중복 없음 | 양쪽 foreground/권한true 유지 중8ea8674a accepted2, OS keys양쪽0·배지양쪽11. 등록last_seen이05:31:36/05:28:39→05:34:02/05:34:03으로 변경. Realtime은등록sync를호출하지않고 App의 Native수신/토큰변경callback만 이 조건에서sync하므로 수신bridge의 간접 증거다. raw native 패킷 계측과 구분 | PASS |

위 행은 필수 묶음의 하위 수락이며 인증/OS13/이벤트17/기록4도메인의 전체 완료로 합산하지 않는다. 에뮬레이터 OS 권한은 두 기기 표시 검증을 위해 임시허용했고 원래false/USER_SET 상태로 최종 복원해야 한다. 물리는 Google QA 로그인 상태이며 후속 계정 전환 검증 뒤 최종 상태를 기록한다. 전체 미동결·원래7~9 미착수·STORE HOLD다.

## 2026-10-28 목록 하단 CTA 피드백과 현재 설치

- 안내 제거 후보1bac1d5c08dc978c85bd4b2aba556bd0792e4413 / runtime66fecd04 / APK816d0ad3을 두 QA 인스턴스에 동일 서명·UID·권한·데이터 보존/Metro OFF로 설치했다. [CI40633837435](https://github.com/jaejun0617/nuri-app/actions/runs/40633837435) 전체 필수 단계 PASS, 로컬325suites4446/4446·타입 PASS다. 실기기에서 안내 제거와 실제 주간 고정2행→Back 선택 아이 보존3/3을 확인했다. weekly-warm-01..03-result.json과 각 영상/화면이 근거다.
- 최신 PO가 ‘전체 기록 보기’를 오른쪽 위가 아닌 목록 아래 CTA로 변경하도록 요청했다. 이 추가 후보는 TimelineListFooter 하나로 기간 목록의 실제 끝에 배치하며, 기존 폰트·라벤더와 중앙 문구/18dp 화살표를 사용한다. 좌우18dp·상단24dp·최소높이52dp·하단64dp를 확보해 작성 FAB와 겹치지 않도록 한다. 기간이 비어도 전체 보기는 제공하고 추가 페이지·초기 로딩·실패를 목록 끝으로 오인하지 않는다. 정상 일반 Timeline은 기존48dp 끝 여백을 유지한다. 새 설치 수락은 아래 기존 후보와 구분해 추가한다.
- CTA 후보의 표적5suites49/49·타입 PASS, 최종 전체326suites4454/4454 PASS다. 관련 lint 오류0/기존ControlsBar shadow1/신규0이다. 최초 전체의1실패는 footer가 분리돼 과거 source 문자열을 찾지 못한 검사였다. 필터된0개를 실제 컴포넌트에 넣어 null을 검증하는 방식으로 바꾸고 Home 재선택/빈 카테고리 계약을 보존했다. 초기4453PASS/1FAIL은 footer-full-tests.json, 수정 후 전체는 footer-full-tests-corrected.json으로 구분한다.
- B1 키 보관: Desktop의 유일 원본 JSON을 서버 digest/프로젝트/RSA 형식 대조 후 사용자 Library/Application Support/NURI/PushTransport로 이동했다. 원본 bytes 유지·폴더0700·파일0600·Desktop 사본 없음이며 키 회전/폐기/원문 출력은 하지 않았다. push-key-custody.json이 경로·시각을 소유한다. 현재 Edge3개 존재, Vault↔Edge worker digest 일치, notification-device-v3 v3 / worker-v3 v2 ACTIVE, NURI3cron1분/최근succeeded·QA cohort2 유지다. 무인증/오류 인증의 실제 worker 호출은 모두403/WORKER_AUTH_REQUIRED다. 일반 사용자 발송은 개방하지 않았다.

## 2026-10-28 13:39 KST 회고 조회 수락과 표시 피드백

- 실제 후속 후보7bf555766d11281654e481df90277dc3aa073014 / runtime157f4a62 / APKdbaa4a27은 물리SM-S937N과 Google Play API35 에뮬레이터에 같은 서명·UID·데이터 보존/Metro OFF로 설치했다. [CI40631438704](https://github.com/jaejun0617/nuri-app/actions/runs/40631438704)의 후속 필수 단계까지 PASS다. 아래6988/5d88493은 이전 후보 이력이다.
- 물리 기기의 실제 주간26de2132는2026-10-19≤발생일<2026-10-26, 누리의2개와 카테고리 산책1/생활1을 표시했다. 전체 보기 후 두 아이의29개(건강 포함)를 끝까지 로딩했고 Back→Home에서 누리테스트 선택을 유지했다. 재진입하면 다시 고정 주간2개다. 외부 증거 weekly-period-verified.png / weekly-all-29.png / weekly-range-cleared.png, recap-range.mp4를 연결한다. 현재 선택 아이의 빈 결과와 자동9월 필터가 회고를 가리던 FAIL을 해당 조건에서 해소했다.
- PO 최신 요청으로 새 안내 ‘모든 아이 · 전체 기록’은 제거한다. 실제 주간의 날짜와 ‘전체 기록 보기’ 동작은 보존하며, 제한을 해제하면 추가 안내 띠 자체가 없다. 기존 월 선택 컨트롤은 바꾸지 않는다. 서로 다른 아이 알림의 선택 전환 확인창은 방향 논의이며 아직 신규 기능을 추가하지 않았다.
- 최신 OS 소비1건: QA transport d5fa0466-3935-463e-9141-1692518ae990 / delivery f7ac9b28-51cf-4abb-9ebb-1711647dd77b를 물리 기기의 launcher 상태에서 실제 알림창 표시→탭→주간2행→04:37:59.125938Z read_at으로 연결했다. accepted 기기1/시도1이다. 업무 원본 E2E 또는 OS13묶음 전체 PASS가 아니다. bg-week-01-destination.png와24.990156초/1080×2340/68 encoded VFR frames 녹화를 보존한다. 녹화 중 다른 앱의 알림이 추가돼 첫 unique-control 선택은 안전하게 거부됐고, 정확한 QA 제목을 다시 확인해 해당 행만 눌렀다. 전체 삭제나 다른 알림 읽음은 하지 않았다.
- 스크린샷 helper의 기본1MiB 버퍼로 일부 캡처가 실패한 것은 도구 한계였다. 외부 helper만24MB로 보정한 뒤 캡처에 성공했다. 앱 종료로 오인하지 않는다. 현재 PID19150의 새 crash exit는 관찰되지 않았으며 과거 SIGSEGV의 원인은 여전히 미확정이다. 유한 반복·cold/warm·최종 후보의 남은 수락은 계속 진행한다.

## 2026-10-28 현재 중간 기준점

- 후속 실행은 새 원장을 만들지 않고 이 원장을 계속 쓴다. 최신 설치6988f7a46ef20e7f0c1475e7e845551de0f97d51/APK4a480d3e/runtime75f2089e는5d88493 프로필 변경을 포함하는 후속 commit이며 실기기1대+Google Play 에뮬레이터1개에 동일 서명·UID·권한·데이터 보존/Metro OFF 설치했다. CI40628826679 후속 전체 단계 PASS다. 5d88493/632332f7의 프로필 증거는 해당 코드가 바뀌지 않아 재사용하되 공통 진입·읽음·Back은 최신 후보에서 다시 확인한다.
- 최신 실제 인앱 생일: 정상 scheduler 알림4c33b1e1을 Home 빠른 알림에서 눌러 해당 아이의 Timeline으로 직접 진입했다. 실제 표시 녹화와03:55:59.613588Z 서버 read_at, Android Back→Home 미읽음1→0을 확인했다. OS 표시/탭은 아직 별도다. 홈 아이콘16dp의 흰 사각 모서리 제거는 notification-icon-white-after.png가 소유한다. 목록 표면은 추가 검증 중이다.
- 실제 주간 수락에서 새 FAIL을 발견했다. owner 전체 회고26de2132의2026-10-19≤occurred_at<2026-10-26에는 누리의2개가 있으나 선택된 누리테스트의 기록만 표시하고 자동 최신 월이 기간을 가렸다. 현재 미설치 보정은 owner/pet/기간 전용 query·기존 cursor reader의 서버 발생일 조건·명시 전체 해제·알림 진입의 자동 월 선택 OFF다. 일반 Timeline cache/선택 펫과 정상 필터 정책은 보존한다. 실제 결함 보정에 필요한 두 번째 후보이며 같은 APK의 반복 설치가 아니다. 이 보정의 전체325suites4446/4446·표적62·타입 PASS다.
- 종료 제보의 유한 재현 계획: 수정 후보에서 같은 주간 target을 사용해 warm 인앱3회, background OS warm3회, 프로세스 미실행 OS cold3회, 전환 중 Back3회를 수행한다. 각 회10초 관찰과 한 번의 native exit-info/해당 PID JS 오류 확인, 녹화를 연결한다. OS 시험용 재전송은 QA transport로 구분하고 기존 주간 업무 이벤트 E2E에 합산하지 않는다. 과거 SIGSEGV의 trace는 없고 원인 연결은 미확정이며 미재현만으로 원인 해결/차단 해제를 선언하지 않는다.

- [12:33 KST 중간보고](../reports/nuri-integrated-closeout-interim-2026-10-28.md)가 최신 설치 5d88493/632332f7, 동일 SHA CI40622609366, 미설치 알림 후속 수정과 남은 1~6/NAV를 구분한다. 아래 10월25일 수치는 이전 후보 이력이다.
- 생일 누락은 선택 펫이 아니라 memorial profile 제외 조건이 원인이다. 원격20261028031925는 scheduler predicate1곳만 수정했다. SQL52/52, 전후 advisor 동일, QA push cohort2와 NURI cron3활성 유지. 정상 정기 작업의 실제 생일1개 생성·실기기 빠른 알림창 표시를 확인했다. OS 표시/탭/읽음은 아직 별도 미검증이다. 사용자 수신 설정은 변경하지 않았다.
- 주간 영상은17.03초로 기간 필터2행 노출을 확인했지만 종료 장면은 없다. 과거 native SIGSEGV 이력과 이 영상/APK의 대응은 미확인이다. 직접 목적지·성공 후 읽음·기간 안내/전체 기록 보기와 홈 아이콘 사각 흰 모서리 보정은 아직 새 후보 설치 전이다.
- 생일/기념일 모달·일정 빠른 이동은 방향 논의만 했으며 새 이미지/기능을 추가 구현하지 않았다. 원래7~9 및 Store는 미착수/HOLD다.

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

원래13개 상태 묶음과 순서를 유지한다. 원문에는 별도 행 ID가 없었으므로 아래 OS01~13은 같은 행을 추적하기 위한 보조 ID다. 이전 PASS는 과거 후보의 전달/소비 증거이며, 공통 이동·읽음 변경의 최신 수락을 대체하지 않는다. 서버는v3/QA cohort2/20261028031925, 최신 앱 후보는 위 절의 해시를 사용한다.

| ID / 원래 작업 | OS 필수 시나리오·기대 | 기존 결과·증거 | 최신 결과·기기/다음 조치 |
|---|---|---|---|
| OS01 / 5 | 앱 권한 허용: 정상 표시·탭·목적지·읽음 | 과거 transport 소비 증거 보존 | PASS: 618b0fc/에뮬레이터 d13953f5 실제 OS 단일 표시·상세·읽음. 위 OS08 증거와 공유하며 별도 업무 E2E로 합산하지 않음 |
| OS02 / 5 | 앱 권한 거부: inbox 유지·OS 미표시 | 설정 분리·원래 거부 복원 증거 보존 | PASS: 5517의7dd5c9f7/에뮬레이터 권한false·OS0·inbox11/해당 행. 권한/발송/목록 코드는 이후 변경하지 않아 재사용. 최종 OFF 복원은 남음 |
| OS03 / 5 | 앱 카테고리 OFF: inbox 유지·OS 억제 | 과거 미실행 상태 보존 | PASS: c6bbdc7e suppressed·device0·inbox/읽음. 이후 설정/worker 조건 불변으로 재사용. service 설정은 원래값 복원 |
| OS04 / 5 | Android 채널 OFF: 앱 설정 우회 없이 미표시 | 과거 미실행 상태 보존 | PASS: 231d44be 물리 채널OFF·FCM accepted/OS0·inbox/채널 복원 후 읽음. 채널/전송 구현 불변으로 재사용 |
| OS05 / 5 | 전경: native 수신·inbox 갱신, OS 중복 배너 없음 | 과거 간접 증거 한계 보존 | PASS(간접 native bridge): 5517의8ea8674a/두 인스턴스 accepted2·OS0·badge11과 native callback만 호출하는 등록last_seen 갱신. 이후 해당 연결 불변. raw packet 수집 증거는 아님 |
| OS06 / 5 | 백그라운드: OS 표시→탭→실제 목적지→읽음 | 과거 Google transport 증거 보존 | PASS: 618b0fc/에뮬레이터 d13953f5 background 단일 OS 표시→상세/읽음. 같은 OS01/08 실행의 공유 증거이며 전체 eventType E2E는 아님 |
| OS07 / 5 | 최근 앱 제거·프로세스 미실행: 두 조건 구분 및 cold 진입 | 과거 미실행 상태 보존 | PASS: 79fc198/에뮬레이터 e4cc7dd2 최근 카드 제거와4c71c7a5 앱 UID SIGKILL 각각 pid없음/stopped=false→OS 표시/탭/읽음/Back. 준비 실패1회 제외, 위 실제 영상/서버 증거 |
| OS08 / 5 | 설정 강제 종료: 플랫폼 미수신과 수동 재실행 복구 구분 | 과거 미실행 상태 보존 | PASS: 618b0fc/에뮬레이터 실제 Settings stopped=true/accepted·OS0→수동 열기→별도 단일 알림 표시·탭·읽음. 자동 그룹 summary 탭은 개별 목적지 PASS에 합산하지 않음 |
| OS09 / 5 | 네트워크 단절·TTL: 유효 메시지와 만료 메시지 구분 | 과거 미실행 상태 보존 | PASS(관찰 범위): 79fc198/에뮬레이터 fab6c290 offline accepted·OS0→원복 표시/읽음,957b8b4a 실제120초 만료 후 재연결15초 OS0. 운영 수명/worker 변경0·폐기 계층 미확정·network1/1 원복 |
| OS10 / 3·5 | 로그아웃·계정 전환: 현재 owner 등록과 대상 격리 | 과거 미실행 상태 보존 | NOT_RUN(필수 묶음 잔여): 실제 Kakao→Google→Kakao/등록 결합과 local logout 격리는 위 증거. 이전 계정 알림 탭·늦은 callback의 전체 실제 경계는 남음 |
| OS11 / 4·5 | 실제 별도 두 인스턴스: 각각 수신·읽음 동기화·한쪽 로그아웃 격리 | 과거 준비 상태 보존 | PASS(물리1+에뮬레이터1): 01706689 동일Google 두 등록/각 OS1/읽음 시각 불변·live11→10, ae6a5d3 local logout 뒤 emulator 세션·7a4ed093 수신/읽음 유지. auth/local/등록/읽음 경로 불변으로 한정 재사용. 실물2대/OEM절전 검증은 아님 |
| OS12 / 5 | 등록 갱신·무효 등록: 현재 기기 연결·정확한 오류만 폐기 | NOT_RUN | NOT_RUN, 등록 식별자/전송 결과 대조 |
| OS13 / 4·5·NAV | 연속 탭·cold/warm: 동일 요청 중복 이동·중간 Home 없음 | 과거 후보의 한정 결과 보존 | FAIL(필수 잔여):3c31287 물리 실제 댓글 OS warm 탭에서 목적지 조회 전 기존 Home 약1.516245초 노출. 즉시 실제 알림 요청 화면→검증된 목적지의 최소 후보 검사 중. 빠른 연속/공통 경로 전체는 미실행이며 이전 More/건강 수락과 구분 |

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
