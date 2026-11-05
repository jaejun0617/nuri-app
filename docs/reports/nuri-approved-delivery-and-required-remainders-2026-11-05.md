# NURI 최종승인 전달 및 1~6·NAV-01 필수 잔여 보고

2026-11-05 KST · Master 단독 · 부분 완료·전체 미동결 · STORE HOLD

## 1. 결론

PO 최종승인에 따라 현재 디자인·알림함·배지 변경을 검사, 커밋, 일반 push하고 같은 제품 SHA의 원격 CI 성공과 Galaxy SM-S937N 보존 설치를 확인했다. Metro는 종료했다. Mac 정리로 실제 여유 공간 6.50GiB를 추가 확보했다. 이번 승인은 디자인 전달 승인이지 기존 1~6·NAV-01 전체 수락 또는 베타·Store 출시 승인이 아니다.

이번 실행은 전달·제한적 설치 영향 확인·저장공간 정리·잔여 보고까지다. 기존 통합 잔여의 새 시험, 원래7~14, P1/P2, 유료 플랜·도메인 작업은 시작하지 않았다. 보고 후 PO 지시 대기다.

수락 원본은 [기존 단일 원장](../qa/nuri-integrated-closeout-2026-10-25.md)이다. 이 보고서는 전달 영수증과 미완료 요약이며 별도 수락 원장이 아니다. 과거 PASS와 실패 이력은 보존한다.

## 2. 소스·서버·설치·전달 연결

| 구분 | 실제 확인값 |
|---|---|
| 저장소 | `/Users/shinjaejun/.codex/worktrees/nuri-batch-a-20261020/nuri` |
| 브랜치 | `codex/walk-marker-recovery-20261020` |
| 제품 커밋 | `afd3fe8f40b3db513efbde3282e314dd91556ef7` |
| 제품 tree | `37f26d7854075ebec6f75386125c0f6aa04593ba` |
| 런타임 입력 SHA-256 | `0523c49eebb0ce08be7c6f8ff0c5f533e9a77d56fd88d86ce8a82da5c3ea8811` |
| 설치 APK SHA-256 | `586cdffe7d5a9f2571f5149cd4c71857e016e1cade28f6a3503c463473bcbcd0` |
| 번들 SHA-256 | `a96ca62b7f8e66e53bb29a3cb402dd6d9dd72bf31e247a9802c66994e50e1017` |
| 서명 SHA-256 | `08efb41ea4729792ce9fc3d242be9704e84a8ea3eadcbbcf1c8426884db689d3` |
| 설치 | 20:22 KST 영수증, 기존 서명·UID10402·최초 설치2026-06-02 19:16:57·권한 해시·화면/네트워크 설정 유지, `install -r`, 데이터 초기화 없음 |
| 빌드 | 기존 보호된 bundled Debug 내부 QA 방식, arm64-v8a, JS 번들 포함. APK1회 생성·물리1회 보존 설치. Store RC/Release 성능 수락 아님 |
| 원격 전달 | `e6c22f8`에서 제품 `afd3fe8`까지 기존 브랜치 일반 push 성공. force push·브랜치 변경 없음 |
| 제품 CI | [42018324530](https://github.com/jaejun0617/nuri-app/actions/runs/42018324530), 동일 SHA의 모든 필수 단계 success, 20:25 KST 완료 |
| 서버 확인 | 이번 실행의 읽기 조회에서 device-v3 v6·worker-v3 v4 ACTIVE 확인. 새 배포 없음 |
| 운영 migration | session-fence `20261029070215`, 사진 교체 `20261104074335`, PT409 `20261104100113`, 커뮤니티 삭제 경계 `20261105045403`, 알림30일 `20261105072331`, 누적 시간 `20261105081432`, 배지 snapshot `20261105100451` 목록 확인. 과거 migration repair/재적용 없음 |
| 에뮬레이터 | 마지막 설치 기준 `01d78a3`; 이번 재설치·새 기능 수락 없음. 현재 계정·권한·실행 상태는 새로 확인하지 않음 |
| 웹·인증 설정 | 이번 변경 없음. 앞서 localhost 기본 복귀 보정·브랜딩 저장 증거는 보존. 실제 유료 커스텀 도메인·브랜드 심사 완료를 주장하지 않음 |

제품 변경218파일은 승인된 UI·상단·재질·아이 포인트색 제거·알림함·배지·누적 산책 시간 및 해당 검사·이미지·이미 반영된 서버 소스다. 이전 로컬5커밋(로그인 패널 후속과 시스템 시작 화면 변경/원복)도 동일 브랜치에서 정상 전달했다. 심볼과 사계절 스플래시의 최종 원복 상태를 유지한다.

무관하거나 혼재한 문서·원문 자료·미추적 이미지·`supabase/.temp/cli-latest`는 제품 커밋에서 제외했다. 다른 원본 checkout은 HEAD·dirty181·내용 해시가 정리 전후 동일했다. 원격 상태와 현재 로컬 문서의 모든 증분이 같다는 뜻은 아니다. 본 보고서와 이번 최상단 안내만 후속 문서 전달 단위로 분리한다.

## 3. 검사와 실제 설치 확인

- 전체 Jest **347 suites / 4,661 PASS**, TypeScript PASS, source/secret guard PASS, source diff PASS. 전체 src lint 오류0·경고23이며 경고0이라고 보고하지 않는다.
- SQL 격리 계약60 PASS, transport24 PASS, 실제 worker handler의 fixture DB/provider 계약11 PASS, 누적 시간 격리 계약9조건 PASS. 운영 데이터 부하 시험이나 실제 새 FCM 전달 E2E가 아니다.
- 초기 전체 검사11 suites/67실패는 승인 전 계절색·상단 크기·예전 버튼/조회 key 기대 및 safe-area 테스트 mock 불일치였다. 최신 PO 계약에 맞춰 검사11파일만 보완했고 제품 로직 변경·skip·타입 무시 없이 최종 전체 검사를 통과했다. 초기 실패 영수증은 보존했다.
- 설치 후 Metro OFF에서 실제 Home·동일 사진/아이/글꼴/칭호와 알림함→알림 상세 및 활동·칭호 목적지를 확인했다. 설치 직전 Fast Refresh 연결 종료 배너 캡처는 구버전 실행 상태이며 새 후보 성공 증거로 사용하지 않는다.
- 런처 표시 이름 **누리**, 실제 숫자 **3**, 앱 미읽음3을 확인했다. 이미 읽은 `QA 배지 확인 2`를 연 것은 감소 시험이 아니며 3이 유지된 정상 결과다. 이후 실제 미읽음 활동 알림의 목적지 성공으로 서버/OS 요약이 **2**가 됐다. 20:28:39 KST 운영 읽기 조회에서 해당 native owner hash가 `canonical_qa`, QA 발송 허용 true, canonical unread2, 최근 읽음20:27:15로 확인됐다. 런처2 캡처도 보존했다.
- 이어 같은 canonical QA의 알림함에서 정상 ‘모두 읽음’을 실행했다. 앱 unread0·native count0·요약 알림 소거·런처 숫자 소거를 확인했고20:34:45 KST 서버 unread0·최근 읽음20:28:56을 대조했다. **현재 설치/현재 QA/권한ON에서3→2→0 동기화 PASS**다. 직접 DB 쓰기·기록 삭제 없이 정상 읽음3건만 반영됐다.
- 새 FCM metadata의 cold 수신·계정 전환·권한/채널/dismiss 조합 전체는 이번 차수 **NOT_RUN**이다. 계약 검사를 해당 실기기 E2E PASS로 확대하지 않는다. OS/런처 설정과 사용자의 요약 알림 지우기에 따른 숫자 표시 한계도 유지된다.
- 이번에 계정 전환·로그아웃·권한 변경·새 QA 생성·기록/프로필 저장·콘텐츠 삭제는 하지 않았다. QA 알림 읽음만 정상 앱 경로로 변경했고 기존 콘텐츠는 보존했다. 예전 QA 데이터/보조 패키지의 최종 정리는 잔여다.

증거 폴더: `/Users/shinjaejun/.codex/nuri-final-approved-20261105/`.
주요 영수증은 `inventory.json`, `source-commit.json`, `build-result.json`, `installation.json`, `jest-final.json`, `lint.json`, `product-ci.json`, `cleanup-result.json`이다. 현재 미읽음 관측은 `installed-home.png`, `launcher-three.png`, `inbox-before-read.png`, `qa-badge-detail.png`, `unread-destination.png`, `launcher-two.png`, `inbox-zero.png`, `launcher-zero.png`, `badge-zero.json`을 구분해 읽는다.

## 4. Mac 저장공간 정리

| 구분 | 결과 |
|---|---|
| 정리 직전 실제 여유 | 15.30765GiB |
| 정리 직후 실제 여유 | 21.81120GiB |
| 실제 증가 | **6.50355GiB**. APFS Data 볼륨 `df -k` Available 차이이며 purgeable 추정치 아님 |
| 정리 대상 | 명시한62경로: 앱 비-native 중간 산출물·generated/kotlin·Gradle 보고서·프로젝트 Gradle 작업 캐시·전역 build-cache-1·9.4.1/transforms |
| 보존 검증 | APK·build outputs·native cxx/merged libs·심볼·소스맵·intermediary bundle 및 Git dirty 목록의 전후 해시 동일 |
| 추가 보존 | 모든 소스·자산·migration·문서·증거·기존 APK, `.cxx`, node_modules, modules-2 다운로드 원본, SDK/NDK/JDK/서명·인증 자료, 개인·브라우저·OS 데이터 |

Gradle 실행이 없는 상태에서 삭제했고 `clean`, `reset`, `stash`, 앱 삭제/초기화는 하지 않았다. 캐시 삭제 때문에 다음 native 빌드는 일부 재컴파일·변환 비용이 생기지만 설치된 앱의 실행 입력과 데이터는 바뀌지 않는다. 사용자 자료·고유 증거까지 삭제해야 얻는 공간은 안전한 정리 범위에서 제외했다. ‘Mac에 더 삭제 가능한 파일이 전혀 없다’는 판정은 아니다.

## 5. 기존 1~6·NAV-01 실제 수락과 잔여

기존 묶음은 **2/7**, OS **11/13**, 기록 도메인 **0/4**, 이벤트 계약 **17묶음/26 eventType**를 유지한다. 앱 전체 개발률이 아니며 새 UI 승인·검사 수를 이 분모에 더하지 않는다.

| 번호·원장 ID | 보존하는 완료 증거 | 실제 필수 잔여 | 다음 완료 판정 |
|---|---|---|---|
| 1 · B2 | 기존 검사/CI 원인 보정 PASS. 이번 후보 전체4661·원격 CI·설치 연결 추가 | 배치 최종 수락이 끝난 제품·서버·설치·증거의 마지막 대조 | 마지막 제품 입력과 수락 증거가 같은 후보이며 필수 검사/CI 연결 |
| 2 · B1 | Firebase/암호화/worker 인증/QA2계정 제한, PT409 core/source PASS 유지 | P0 장기 안정성·미확정 worker502/메모리 영향, 최종 운영·키 보관 연결 | 관측 공백·잔여 위험을 근거로 판정. QA 제한 유지 |
| 3 · U1 | Google/Kakao 실제 인증·PKCE·세션·Home, 다른 설치 보존, Google 선택 후 로딩 시점·취소 일부, localhost 보정 | 단일 자동 진행, 여러 계정 중 승인 하나, 동의·재인증, fallback·중복/늦은 callback·이전 유효 세션 경계 | 계정 조건/공식 UI/최종 identity/단말 소유/복귀 일치. 제공자 필수 UI와 미충족 조건 구분 |
| 4 · U2 | 직접 목적지·성공 후 읽음·실패 미읽음, 댓글/답글/좋아요/XP/칭호/기록의 일부 업무 원본, 생일 생성·인앱 | 기존17/26의 미마감 생성·접근 제한·경쟁·실패·읽음, 생일 실제 OS 후속 | 원본→대상→전달→목적지→읽음을 필요한 원장 행별 연결 |
| 5 · U3 | OS01~09·11·12의 한정 PASS, 두 독립 설치·SDK 갱신/폐기/복구·권한/카테고리 OFF·cold/warm 일부. 이번 실제 배지3→2→0 | **OS10** 이전 계정 PendingIntent/늦은 auth·등록·해제, **OS13** 연속 입력·cold/warm 실패/취소/Back 잔여. 새 배지cold/계정·권한 영향 | 같은 요청·현재 소유·다른 설치 보존·중복 이동 없음. FCM접수와 OS 표시·탭·서버 읽음 별도 |
| 6 · U5 | 일반 CRUD/초안·삭제 캐시, 건강/일정 응답 유실 동일UUID, 신규 Kakao 사진 정상·DB/Storage 유실 복구. **Google 기존 중단 사진은11/05 11:51 동일 task/목표참조/큐 완료 PASS** | 네 도메인의 화면 이탈·취소·늦은 callback·계정/아이 변경·새 편집 충돌·중복·삭제 후 복원, 일정 예약·수명과 QA 정리의 미마감 조건 | 현재 소유/아이·Storage/정규/호환 참조·큐/화면·예약 정합성. 네 도메인 각각 필수 조건 충족 전 전체 PASS 금지 |
| NAV-01 | 빠른 왕복5/5·More대표5/5·시작/warm/cold/Back 일부, 기존 애니메이션과 실제398 encoded frame 표본 증거 | 미실행 공통 경로·연속 입력·취소/실패·외부 복귀, 이번 홈벨/공통모달/헤더 영향, 시각 증거 연결. 과거 앱 종료 원인은 미확정 | 원장 유한한 경로 범위로 확인. 최근 미재현을 과거 원인 해결로 바꾸지 않고 표본/compositor 구분 |

**기존 Google attempts5 사진 작업은 다시 미해결로 되돌리지 않는다.**11:46 미복구와11:51 직접 성공은 서로 다른 관측이다. `delivery-photo-recovery-1105/qa-upload-direct-acceptance.json`에서 같은 작업의 큐 제거·정규/대표/호환 참조 일치·관련 객체3개 불변·추가 업로드/파일 삭제0을 확인한 기존 수락을 재사용한다. 새 제품 입력의 변경 영향만 재확인하며 같은 실패를 반복하지 않는다.

세부 분모가 원장에 확정되지 않은 영역은 미확정이다. 이번 닫힌 것은 승인 소스 전달·현재 설치·실제 배지3→2→0 관측이며 U1/U2/U3/U5/NAV 전체 완료 단위0개다. 남은 완료 단위5개를 단순 기능 미구현5개로 해석하지 않는다.

## 6. P0 잔여와 24시간 관측

| 항목 | 현재 판정과 필요한 다음 근거 |
|---|---|
| P0_CORE_FIX | 기존 PASS 보존. 업무상40001→PT409·해제 호환·HTTP409/DEVICE_SESSION_STALE |
| P0_SOURCE_ACCEPTANCE | 기존 PASS 보존. 당시 커밋/CI·운영 적용 영수증 유지 |
| K | 기존 PASS 보존. 실제 등록 서버200 후 응답1회 유실·재호출200·동일 소유/다른 설치 유지. 이번 사진/배지 검사와 합산하지 않음 |
| D/F | **BLOCKED_PRECONDITION**. 같은 설치의 정상 인증으로 유효 이전 세션을 유지한 실제 지연 요청 조건 미확보. 로그아웃401·직접SQL·다른 설치 세션으로 대체 금지 |
| L-GLOBAL | 미수락. 기존 setPushNotificationOptIn/RPC로 전체OFF→ON 및 영향을 받는 두 설치 등록 복원을 관찰할 드라이버 필요. 카테고리/OS OFF PASS 재사용과 별도 |
| P0_RUNTIME_ACCEPTANCE | PARTIAL. 위 D/F/L-GLOBAL과 관련 세부 필수 조건 잔여 |
| 고정24시간 창 | 2026-11-04 19:01:13~11-05 19:01:13 KST. **이미 종료 시각 도달**. 시간 대기가 아니라 자료 대조·판정이 남음 |
| P0_STABILITY_ACCEPTANCE | 미수락·관측 증거 판정 필요. 이번에는 해당 고정 창의 CPU/rollback/40001·PT409/5xx/cron/메모리·Swap 자료를 새로 전수 회수하지 않았다. 창 도달만으로 PASS 또는 완전한24시간 관측이라 하지 않음 |
| worker502 |11/04 19:08:00.104 KST 사건의 원인·영향·복구 UNKNOWN 보존. 후속200·빈 queue만으로 복구 확정 금지. provider gateway/실행/claim·lease 연결 자료 필요 |
| 메모리/Swap | 마지막 SEVERE·Swap 잔여를 CPU2.72% 단기 감소만으로 해결하지 않음. 이번 현재값 미측정 |
| P0_FINAL_ACCEPTANCE | PARTIAL. 반복 프로세스 강제 종료·재시작·Compute/cron/RLS 변경 없음 |

시간을 채우기 위한 대기·상시 모니터링·예약 실행은 만들지 않았다. 지원 문의가 필요하면 사건 시각·식별자·공백을 정리해 PO 승인용 초안만 준비하고 자동 발송하지 않는다.

## 7. 해결·진행·잔여·계획

| 구분 | 내용 |
|---|---|
| 해결 | 승인 제품 커밋·일반push·동일SHA CI, bundled APK 물리 보존 설치, Metro OFF 실행·한글 앱 이름·배지3→2→0, 안전한6.50GiB 정리 |
| 진행 | 없음. 이번 보고 종료 후 작업 대기 |
| 잔여 | U1/U2/U3/U5/NAV 필수 조건, P0 D/F/L-GLOBAL·고정창 증거·502/메모리, 새 배지 나머지 영향, QA 정리 |
| 잔여 해결 계획 | PO 재개 후 현재 후보/QA 역할을 한 번 확인하고 아래 우선순위의 미수락만 수행. 유효 완료 증거 재사용. 제품 입력이 불변이면 재빌드·재설치·전체검사 반복 없음 |

## 8. 다음 작업과 정확한 재개 지점

| 우선순위 | 원래 작업 번호 또는 추가 범위 | 작업 | 선행 조건 | 담당 | 필요한 입력 | 완료 기준 | 현재 시작 가능 여부 | Astra 권장 추론 강도 | GPT-6.1 Sol 권장 추론 강도 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | P0 안정성·2 | 종료된 고정24시간 창의 보존/현재 자료 대조 | PO 재개, 원래 창 구분 | Master | 로그·메트릭 접근/보존 범위, 필요시 승인된 지원 자료 | 확보 구간·공백·재발·영향·미확정을 분리해 판정 | 시간 도달; 지금은 PO 대기 | Medium | Medium |
| 2 | P0 D/F·3·5/OS10 | 유효 이전 세션의 지연 등록·해제 | PO 재개, 정상 인증에서 실제 사전조건 확보 | Master | 기존 SessionOrderProbe/안전한 요청 식별, 필요시 PO 공식 인증 | 실제 요청·응답·소유·다른 설치·늦은 완료 불변식 충족 또는 정확한 차단 | 사전조건 차단 | High | High |
| 3 | P0 L-GLOBAL·5·배지 | 전체 수신 OFF/ON 및 새 배지cold/계정 경계 | QA 소유/두 설치 상태·원복 기준 확인 | Master | 정상 인증 RPC/드라이버, 기존 QA 발송 제한 | 전체 opt-out·등록 복원·인앱/FCM/OS/배지 각각 일치 | PO 재개·드라이버 준비 후 | High | High |
| 4 | 3·추가 로그인 | 단일/다중 승인 조건·취소/fallback/늦은 callback | 현재 후보·사진 대기 작업 영향 없음 | Master·직접 인증 PO | 준비된 계정 조건, 공식 화면 직접 인증 | 선택 계정과 누리 세션·등록·한 번 이동/취소 일치 | PO 재개·환경 입력 후 | Medium, 복합 경계 High | Medium, 복합 경계 High |
| 5 | 4·5·U2/U3 | 미마감 업무 원본·생일OS·OS13 | 원장 미마감 행/QA fixture 확인 | Master | 기존17/26 contract·해당 원본 ID·필요한 두 설치 | 업무 원본과 transport/계약 검사 별도 수락 | PO 재개 후 | Medium | Medium |
| 6 | 6·U5 | 네 기록 도메인 수명/실패 복구 잔여 | 현재 계정·아이·정규 데이터와 성공 증거 대조 | Master | 기존 QA 작업/예약ID·필요한 유실/지연 도구 | 각 도메인 기존 필수 조건 충족; Google 완료 작업 반복 없음 | PO 재개 후 | High 판단 후 Medium | High 판단 후 Medium |
| 7 | NAV-01 | 이번 공통 UI 영향과 미실행 복귀·연속 입력 | 관련 auth/목적지 준비 | Master | 기존 영상/시각 검토 기준·실기기 | 중간 Home/공백·중복 이동·취소/Back·종료 제보의 유한 판정 | PO 재개 후 | Medium | Medium |
| 8 | 1~6·NAV | QA 한정 정리·최종 연결·동결 판정 | 모든 필수 미수락 해소 | Master, 출시 승인 PO | QA 생성ID/소유/설정 원복/최종 증거 | 필수 FAIL/BLOCKED/NOT_RUN·미완결0, Store 승인과 구분 | 선행 미충족 | Medium | Medium |

현재 실제 모델·추론 강도는 이 차수 공개 실행 메타데이터로 확인하지 못했다. 권장값을 자동 적용했다고 주장하지 않는다. 다음 첫 조합은 현재 선택 모델/Medium(증거 대조), D/F의 구체적인 세션 조건 판단에만 High다.

정상 동결 후의 후속 순서는7 산책 장애→8 독립 거리 정확도→9 전체 화면 회귀→10 최종 보안→11 정책·법무→12 최종RC→13 제출 자료→14 PO 베타/Store 각각 Go/No-Go다. 지금 자동 착수하지 않는다.

## 9. 종료 상태

**WAITING_FOR_PO / PARTIAL_NOT_FROZEN / STORE_HOLD / AUTO_RESUME_NO.**
Metro OFF, 새 예약·백그라운드 검증 없음. 다음 PO 실행 지시 전 기존 통합 작업을 재개하지 않는다.
