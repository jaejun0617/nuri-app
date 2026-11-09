# NURI 통합 마감 중단 체크포인트

> 2026-11-09 문서 정리 3차 전달 안내: 이 문서는 2026-10-29 17:49 KST의 기존 로컬 보고서 원문이다. 아래 '현재'·승인·중단·미전달 표기는 당시 상태이며 오늘의 실행 권한이나 수락을 뜻하지 않는다. 최신 판정은 [단일 수락 원장](../qa/nuri-integrated-closeout-2026-10-25.md)을 따른다. 본문에 연결된 저장소 밖 영수증·영상·캡처는 로컬 전용이며 이번 Git 첨부가 아니다. 역사 본문과 기술 식별자는 보존했다.

기준: 2026-10-29 17:49 KST. Master 단독 수행. 이 문서는 중단 스냅샷이며, 수락 판정은 [단일 수락 원장](../qa/nuri-integrated-closeout-2026-10-25.md)을 따른다.

## 1. 결론

**PAUSED_BY_PO / PARTIAL_NOT_FROZEN / STORE HOLD**.

PO 지시대로 현재 발송된 물리 Kakao QA cold 알림 한 건만 검증하고 중단했다. 이후는 증거 대조와 문서 기록만 수행했다. 전체 완료·동결·출시 승인이 아니다.

- 필수 단위: **2/7 = 28.6%**. 검사/B2와 외부 설정/B1의 수락을 보존한다.
- OS 상태 묶음: 이전 검증 구성 **11/13 = 84.6%**. 최신 변경의 영향 재수락과 OS10·13 잔여가 있다.
- 기록: 도메인 전체 **0/4**. 개별 CRUD·실패 복구 성공과 전체 수락을 구분한다.
- 앞서 제시한 20:10~22:10 잠정 예상은 중단으로 보류한다. 재개 시 남은 조건을 기준으로 다시 산정한다.

## 2. 마지막으로 마친 검증

실제 물리 기기 SM-S937N/Android17, 현재 Kakao QA 세션에서 수행했다.

| 단계 | 확인 결과 |
|---|---|
| 발송 | QA transport c4fd861f-f419-4a2f-9365-60e0440b2c62, 실제 worker/FCM 기기 접수1건 |
| cold 조건 | 앱 UID의 의도된 SIGKILL, PID 없음, stopped=false. Android Settings 강제 종료가 아님 |
| 진입 | 실제 OS 알림 탭 후 승인된 시작 화면을 거쳐 해당 QA 댓글에 도달 |
| 읽음 | 서버 read_at `2026-10-29T08:42:41.469459Z` 확인 |
| 안정성·복귀 | 해당 화면에서10초 같은PID 관찰, 시스템 Back1회로 현재 누리 Home 복귀 |
| 영상 | 25.164556초/1080×2340/302 encoded VFR frames. 4개 contact sheet 수동 검토 |

증거: [실행·수동 수락 영수증](/Users/shinjaejun/.codex/nuri-profile-completion-20261028-urmnPT/session-cold-kakao-acceptance.json), [영상](/Users/shinjaejun/.codex/nuri-profile-completion-20261028-urmnPT/session-cold-kakao.mp4).

원본의 자동 검토 PENDING은 변경하지 않았다. 수집 프레임에서 목적 댓글 전 Home 노출은 관찰되지 않았지만, 모든 compositor frame·전체 NAV·과거 종료 제보의 근본 원인 해결로 확대하지 않는다. 업무 원본 E2E나 생일 알림 검증도 아니다.

## 3. 이번 실행에서 추가한 결과

| 범위 | 실제 결과와 한계 |
|---|---|
| Home 아이스블루 | 확정 HEX/위치 배열, 고정 viewport 유지. 전체9장 섹션/320dp 작은폭과 원복, 흰 toolbar·동일 hero crop 확인 |
| 서버 등록 순서 | 실제 auth.sessions의 서버 생성 시각과 verified JWT session을 device lock 안에서 검증. 로그아웃 종료 표식, legacy 우회와 직접 DML 보정 적용 |
| 코드·서버 계약 | 격리 SQL10/10, Edge8/8, 실제 원격 rollback-only5조건. 실제 동시 네트워크 E2E와 별도 |
| 정상 계정 전환 | PO의 정상 Google 로그아웃·Kakao 로그인 후 이전 물리Google 해제, 새Kakao 결합, 별도 emulatorGoogle 세션/등록 유지 |
| 이전 계정 알림 | 새 후보의 기존 Google immutable OS 요청2회 재사용에도 Kakao Home/owner와 이전 읽음 값 유지. 실제 알림창 손 탭2회와 구분 |
| 새 후보 warm | 같은 transport를 물리/에뮬레이터에서 실제 OS 탭→같은 댓글→10초 관찰→Back. 읽음 시각 멱등. emulator 결과는 PO도 직접 확인 |
| 일정 응답 실패 | 실제201 저장 뒤 QA 응답만 차단→실패 안내/입력 보존→같은폼 재시도→같은 UUID의 기존 일정 확인/목록 도달. 전후row 동일 |

일정의 최종 성공 증거는 [실제 재시도 수락](/Users/shinjaejun/.codex/nuri-profile-completion-20261028-urmnPT/schedule-response-fault-2/acceptance.json)과 native UI/서버·영상 영수증이다. QA 전용 프로세스의 네트워크 훅을 사용했으며 제품 APK·TLS·서버 성공값을 바꾸지 않았다. 수동 영상 검토는1fps표본이며 모든 encoded frame 검토로 보고하지 않는다.

초기 대역폭 시험은 삽입 전 실패, 지연 시험은 정상 완료를 늦게 관찰해 응답 유실 미수락이었다. 첫 응답 훅은 실패/입력 보존 뒤 QA 관찰 시간 종료로 재시도 미수락이었다. 준비·실패 영수증은 보존했고 최종 자동 조작 회차와 분리했다.

## 4. 아직 수락하지 않은 범위

| 원래 번호 | 상태 | 남은 필수 조건 |
|---|---|---|
| 1/B2 | PASS 보존 | 제품01d78a3의 로컬·동일 SHA CI 연결 완료. 이후 문서 변경은 미커밋 |
| 2/B1 | PASS 보존 | 실제 QA 연결·키/인증·제한 증거 보존. 최종 운영 상태 대조는 배치 마감 시 수행 |
| 3/U1 | 중단·미마감 | 늦은 인증/등록 callback, 계정 경계의 남은 필수 수락 |
| 4/U2 | 중단·미마감 | 17묶음/26eventType의 미마감 생성·접근·경쟁·읽음 경로 |
| 5/U3 | 중단·미마감 | OS10·13 및 최신 변경 영향 재수락. 실제 업무 원본·transport·계약 검사를 분리 |
| 6/U5 | 중단·미마감 | 사진/건강의 응답 불명확·이탈·늦은 callback, 일정의 남은 수명/예약 조건 등 |
| NAV-01 | 중단·미마감 | 기존 빠른5/5와 시작·이번warm/cold를 보존. 연속·취소·실패·공통 복귀 미마감 |

서버 순서 수정의 추가 native HTTP 프로브는 목표 요청을 수락 가능하게 관찰하지 못했다. register/revoke 지표가-1이므로 HTTP409/200 성공으로 계산하지 않는다. 기존 세션·등록은 전후 같았다. SQL rollback 검증·정상 계정 전환·이전 OS 요청 재사용과 다른 증거다. 진단 도구의 미관찰을 서버 제품 결함이나 콘텐츠 표시 제한으로 단정하지 않는다. 같은 프로브를 그대로 반복하지 않는다.

## 5. 소스·서버·CI·설치 연결

| 항목 | 확인값 |
|---|---|
| 저장소 | `/Users/shinjaejun/.codex/worktrees/nuri-batch-a-20261020/nuri` |
| 브랜치·제품 SHA | `codex/walk-marker-recovery-20261020` / `01d78a33e2f21ce4f61c4084d10e66d39658371c` |
| runtime SHA-256 | `1f70a2265b5caa4a6adc6f925155e3abc5f65aca0ddfaa49fa76532f99304c2b` |
| APK SHA-256 | `bcd0f484c2539819bb380734d18ddfdefd323ceb0dfb9808a9cf881e123ab966` |
| 설치 | 물리1대+Google Play API35 ARM64 emulator1개. 같은 bundled Debug, signer/UID/최초 설치/권한/데이터 보존, Metro OFF |
| 로컬 | 341 suites/4589PASS, critical127/127, 타입PASS, 관련lint0오류/0경고, source/secret guardPASS |
| 원격 CI | [40833607769](https://github.com/jaejun0617/nuri-app/actions/runs/40833607769), 동일 SHA 필수 후속 단계 success |
| migration | `20261029070215_notification_device_session_fence` |
| Edge | notification-device-v3 version4, verify_jwt 유지. worker-v3 version2 유지 |
| 최종 Git | 위 제품SHA까지 정상push. 중단 후 새commit/push 없음. 제품tracked diff0, 문서/기존자료는보존 |

설치/CI 원본: [delivery-device-session-ice-blue](/Users/shinjaejun/.codex/nuri-profile-completion-20261028-urmnPT/delivery-device-session-ice-blue). 내부 기능·시각 검증본이며 Store RC 또는 release 성능 수락이 아니다.

기존 remote migration19개와 local 이력 차이 때문에 일괄 db push dry-run이 차단됐다. 과거 이력 repair·되돌림·일괄 재적용 없이 현재 migration만 개별 반영했다. 기존 `public.v_my_pets_with_days` definer view ERROR1건은 원래10번 보안 잔여에 유지한다.

이전671744b 대비 실제 제품 변경은 Home token, 업로드 queue, 체중 sheet, 목적지 읽음 hook, push lifecycle, device Edge/migration과 해당 검사다. 정확한16파일 목록은 Git diff로 확인했으며 Room 결과4커밋을 다시 통합하지 않았다. 이번 실행에서 새 Room/agent 위임0이다.

## 6. 중단 상태와 보존할 자료

- 마지막 기기 동작: 물리 Kakao QA/누리 Home. emulator Google QA는 OS Home으로 backgrounded. 로그인이나 새 계정 생성은 추가하지 않는다.
- QA 명령·녹화·빌드와8081 listener는 종료됨을 확인했다. emulator 자체와 앱 데이터는 보존했다.
- NURI cron3/QA cohort2/직접 client update 금지는 마지막 구성 대조16:05 KST 기준이다. 현재 cold의 실제 QA provider 전달도 확인했다. 새 전체 구성 감사로 표현하지 않는다.
- 키 보관·worker/Vault 인증의 기존 증거를 유지한다. 이번에 키 회전·전체 발송 개방·cron 중지를 하지 않았다. Master 중단이 cron 중단을 의미하지 않는다.
- emulator OS 알림 임시ON은 남은 수신 시험을 위해 보존한다. 원래OFF/USER_SET 복원은 시험 종료 후 수행한다.
- `com.nuri.qa.transport`는 두 설치에 남아 있으나 실행 중이지 않다. 본체 `com.nuri.app`을 삭제·초기화하지 않았다.
- QA 댓글2/좋아요1/합성사진1, 새 일정3개 및 증거를 보존했다. 이번 중단에 삭제/전체 정리를 수행하지 않았다.

| QA 일정 | 실제 ID |
|---|---|
| 정상 지연 시험 | `1d597192-5302-4977-93cc-e2437f96e390` |
| 첫 응답 훅 | `3515aec7-c6ac-4c82-9207-1d71891ba591` |
| 최종 응답 실패 재시도 | `937c8db4-27f7-4670-b7f9-3256c7589f0f` |

17:46 무렵 읽기 전용 대조에서 위3개만 존재했고 `QA-20261029-SESSION-PROBE`는0개였다. 모두 Google QA/동일 아이 소유이며 reminder_minutes=[]/repeat_rule=none다. native 예약의 최종 원복 확인은 관련 시험 후 정리에 포함한다. 기존 게시글·좋아요·사진·이전 기록은 삭제 대상이 아니다.

## 7. 해결 / 진행 / 잔여 / 잔여 해결 계획

| 구분 | 내용 |
|---|---|
| 해결 | 최신 후보 전체 검사·CI·두 설치, Home색, 서버 세션 최소 보정, 정상 전환, 한정 warm/cold·이전 OS 요청 격리, 일정 응답 실패 재시도 |
| 진행 | 없음. PO 재개 지시 대기 |
| 잔여 | 인증/등록 실제 경계·OS10/13·업무 원본·기록 실패 복구·공통NAV·QA정리·최종수락 |
| 잔여 해결 계획 | 재개 후 같은 후보/서버/역할 유지 여부만 확인하고 미마감 행을 이어간다. 실패한 진단을 무작정 반복하거나 완료 조건을 낮추지 않는다 |

## 8. 다음 작업 및 우선순위

| 우선순위 | 원래 작업 번호 | 작업 | 선행 조건 | 담당 | 필요한 입력 | 완료 기준 | 현재 시작 가능 여부 |
|---|---|---|---|---|---|---|---|
| 1 | 3·5·NAV-01 | 인증/등록 경계·OS10/13 잔여 | PO 재개, 현재 기준 보존 | Master | 관찰 가능한 실제 요청 수단, 필요 시 기존 provider 직접 인증 | 필수 계정/읽음/중복/복귀 조건 수락 | 불가, PO 중단 |
| 2 | 4·6 | 업무 원본·사진/건강/일정 실패 복구 | PO 재개, QA 범위 유지 | Master | 기존 QA 원본·미마감 실패 위치 | 실제 서버/UI/중복·복구 수락 | 불가, PO 중단 |
| 3 | 5·6 | QA 생성분·패키지·설정 정리 | 관련 시험 종료 | Master | 위ID와 기존 생성 증거 | 해당 생성분만 정리·권한 원복 | 불가, 시험 미완료 |
| 4 | 1·2·NAV-01 | 최종 전달·설정·후보 정합성과 동결 | 전체 필수 잔여 해소 | Master | 최종 소스/서버/설치/CI 증거 | 필수 FAIL/BLOCKED/NOT_RUN 없음 | 불가 |
| 5 | 7 | 산책 장애 잔여 | 이번 배치 정상 동결·다음 실행 지시 | Master | 기존 장애 조건 | 남은 증적, 타이머/마커 기존PASS 보존 | 불가, 자동 착수 금지 |
| 6 | 8 | 산책 정확도 | 앞선 배치 마감 | Master·PO | 독립 거리 기준 | 정량 비교 | 불가 |
| 7 | 9 | 전체 화면 회귀 | 앞선 배치 마감 | Master | 작은 화면/큰 글꼴/입력·복귀 조건 | 전체 잔여 매트릭스 | 불가 |
| 8 | 10 | 최종 보안 | 선행 기능/QA 마감 | Master | 최종 후보·운영 근거 | 보안 잔여 판정 | 불가 |
| 9 | 11 | 정책·법무 | 확정 제품 계약 | PO·Master | 정책 판단 | 의무 문서 수락 | 불가 |
| 10 | 12 | 최종 RC | 앞선 수락 | Master | 승인된 서명/설정 | 실제 release 후보 수락 | 불가 |
| 11 | 13 | 제출 자료 | RC·정책 확정 | PO·Master | 제출 계정/자료 | 제출 준비 | 불가 |
| 12 | 14 | 베타·Store 각각 Go/No-Go | 해당 수락·자료 | PO | 각각의 명시 승인 | 개별 판단 | 불가, STORE HOLD |

## 9. 정확한 재개 지점

1. 위HEAD/설치·물리Kakao/에뮬레이터Google·서버 기준이 바뀌었는지만 한 번 확인한다. 이전 커밋으로 되돌리지 않는다.
2. native HTTP 프로브는 수락되지 않았다. 기존 결과를 읽고 검증 가능한 요청 수단을 정하기 전 같은 실행을 반복하지 않는다. 비밀값을 채팅으로 요청하지 않는다.
3. 독립적으로 가능한 다음 실행은 Google 에뮬레이터의 새 OS 알림 실패→취소·재시도다. 해당 새fixture는 아직 생성하지 않았다. 이어 사진/건강/일정의 미마감 행을 진행한다.
4. 이미 반영한 migration·4커밋·전체 검사/CI·설치·빠른5회·OS12를 근거 없이 반복하지 않는다. 앱 입력이 바뀌지 않는 문서 작업으로 재빌드하지 않는다.

**지금은 위 단계를 실행하지 않는다. PO가 이어서 작업하라고 지시할 때 재개한다.**
