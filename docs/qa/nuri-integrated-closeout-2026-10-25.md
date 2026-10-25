# NURI 통합 마감 수락 원장

상태: IN_PROGRESS. 전체 동결 아님. Master 단독 수행.

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
| 전체 Jest | PASS | 최종 사진 보정 후보315 suites, 4,347/4,347. `full-profile-final.json`. 처음 남은2개는 JSX 타입을 태그로 오인한 텍스트 검사와 종전 흰 Header 고정 기대값이었다. AST 태그/대비 역할로 보정했다. 실제 QA에서 찾은 species_key 쓰기 보정도 포함한다 |
| critical foundation | PASS | 12 suites, 127/127 |
| TypeScript | PASS | 최종 사진 보정 후보의 `tsc --noEmit` 종료0 |
| 변경 파일 lint | PASS | 전체 src 및 CI 범위604파일 오류0/기존 경고27. `lint-hero-checkpoint.json` |
| 최종 SHA의 원격 CI와 후속 단계 | NOT_RUN | 최종 선별 커밋·push 이후 확인 |

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
| 앱 권한 허용 | 단말 표시 확인, 나머지 연결 진행 |
| 앱 권한 거부 | NOT_RUN |
| 앱 카테고리 OFF | NOT_RUN |
| Android 채널 OFF | NOT_RUN |
| 전경 | NOT_RUN |
| 백그라운드 | 표시 PASS, 탭·읽음 진행 |
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
| 잔여 | 원격 CI, 인증 상태별·계정 경계, 업무 이벤트 E2E, OS 전체 상태, 기록 CRUD·실패 복구, 공통 NAV 경로 |
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
