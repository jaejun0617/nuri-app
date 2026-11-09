# NURI 사진 참조·로그인 통합 후속 보고 — 미마감·미동결

> 2026-11-09 문서 정리 3차 전달 안내: 이 문서는 2026-11-04 초기 기록과 18:34 KST 증분의 기존 로컬 보고서 원문이다. 아래 '현재'·승인·중단·미전달 표기는 당시 상태이며 오늘의 실행 권한이나 수락을 뜻하지 않는다. 최신 판정은 [단일 수락 원장](../qa/nuri-integrated-closeout-2026-10-25.md)을 따른다. 본문에 연결된 저장소 밖 영수증·영상·캡처는 로컬 전용이며 이번 Git 첨부가 아니다. 역사 본문과 기술 식별자는 보존했다.

## 2026-11-04 18:34 KST 현재 전달 상태

**부분 완료 / PARTIAL_NOT_FROZEN / STORE HOLD**. Master 단독, PO 재개 유효. 아래 초기 보고는 당시 이력이며 이 최신 절이 현재 상태를 소유한다. 수락 판정은 [단일 원장](../qa/nuri-integrated-closeout-2026-10-25.md)의 최신 절을 따른다.

| 구분 | 실제 결과 |
|---|---|
| 해결 | 신규 Kakao QA 사진의 정상 교체·DB 응답 유실 후 동일 작업 foreground 복구·Storage 응답 유실 복구. 최신 물리 후보의 실제 Kakao 및 Google callback·PKCE·세션·Home. 별도 callback 표시를 기존 로그인 화면으로 통합. OAuth 프로젝트 대조·누리 이름/PO 로고 저장. localhost 기본 복귀 수정 및 실기기 오류 안내/기존 세션 복구 |
| 진행 | 정상 push된 제품1d73341의 필수 CI41808141057 실행 중. 기존 U1·U2·U3·U5·NAV 미완료를 유지 |
| 잔여 | Google 단일 자동 선택·여러 계정 중 승인 하나 등 미확보 조건, 브랜드 심사/실제 노출, 기존 Google attempts5 작업의 명시 복구, 사진/기록 수명·OS10/13·업무 원본·NAV 기존 필수 행, QA 정리 |
| 잔여 해결 계획 | 이미 통과한 신규 fixture 재시험 없이 미완료 행만 진행. 브랜드 정책 주소가 없으면 해당 입력만 분리. 유료 플랜/도메인은 PO 보류로 구매하지 않음. 필수 조건이 남아 전체 동결하지 않음 |

### 실제 원인과 최소 조치

- 사진: 슬롯 UNIQUE와 경로 upsert 충돌을 invoker 함수 `replace_memory_image_refs`의 참조 비교·원자적 교체로 처리했다. 실제 앱 교체/두 응답 유실 시험은 `0a3e3c5`·Kakao 신규 fixture `689dfeb2-204e-4adf-a446-a2895f534355` 증거다. 후속1d73341은 인증 표시만 달라 사진 결과를 재사용한다. 최초 cold 자동 복구·다른 사진 바이트 비교·계정 변경의 전체 수락은 아니다. 이전 Google `3b3dc81a`의 attempts5·목표 파일·참조·객체3개는 변경하지 않았다.
- 인증: 새 Auth Tab callback과 로그인 시작 잠금의 순서를 보정한 후 실제 Kakao 세션을 확정했다. 표시 전용 `SocialLoginSurface`를 공유해 세션 처리 중 기존 로그인 화면을 유지한다. 최신 Kakao 영상19.269756초/264 encoded VFR frame 중4fps 수동 표본을 검토했다. 미지원 경로·검증 timeout 전체를 실제 PASS로 확대하지 않는다.
- Google: 실제 OAuth client 소속은 `nuri-project-497609`의 `NURI Supabase Google Web`이며 Firebase 프로젝트와 다르다. `누리 (NURI)`와 PO가 선택한 `appstore.png`를 저장했다. 게시·인증 제출은 하지 않았다. 18:17:36 새 로그인→callback/PKCE→18:17:49 세션→18:17:51 Home이며 물리/에뮬레이터 Google 등록2개와 이전 물리 Kakao revoked를 확인했다. 캐시 세션 복원을 단일 자동 선택으로 계산하지 않는다.
- localhost: 최초 Google 실패18:15:20의 실제 서버 오류는 `400: OAuth state has expired`/303, Site URL은 `http://localhost:3000`이었다. 기본값만 기존 HTTPS NURI callback으로 수정했다. allowlist3개·PKCE·client·secret·앱 코드는 그대로다. 비인증 오류 진단303이 새주소를 반환하고 실기기 Chrome→누리 만료 안내→확인→기존 Google Home/owner 복구를 확인했다. 실제 provider state 만료 E2E 재시험과는 다르다. PO의 최초 Kakao 제보는 대응 영상/로그 미확인이다.
- **무료 플랜이 localhost 문제의 원인은 아니다.** 사용자 지정 로그인 도메인은 별도 기능이다. 현재 Supabase Free에서 유료 플랜 비용 외 custom domain 약$10/월 및 도메인 비용이 추가되며 PO가 유료 전환은 나중으로 보류했다. 무료 플랜을 유지하며 localhost를 수정했다.

### 소스·서버·기기·증거

| 항목 | 연결 |
|---|---|
| 제품·브랜치 | `1d7334162023ed3903d24389c98d6e2d4153a16e` / `codex/walk-marker-recovery-20261020` |
| runtime | `9fd2e7e206904139b9d66906b08d52e20b94664d64cb94c54f0c10de0c27486f` |
| APK | `fbbe4b127cfea2dfebb7a7ac26784542101fd925bcdf1e3372dbc9fcc8bd1ad3` |
| 검사·전달 | 로컬342 suites/4607 PASS·TS·대상lint·source/secret guard. 관련5커밋 정상push. [동일SHA CI41808141057](https://github.com/jaejun0617/nuri-app/actions/runs/41808141057) 실행 중 |
| 물리 | SM-S937N, 17:57 bundled Debug/Metro OFF 보존 설치, 현재 Google QA Home. 서명·UID·최초 설치·데이터 유지 |
| 에뮬레이터 | 기존01d78a3/Google QA. 이번 인증 UX·사진 새후보 설치/수락으로 계산하지 않음 |
| 서버·웹 | 사진 migration20261104074335 유지. 기존 session-fence/notification-device-v3 v4/worker-v3 v2 재배포 없음. Site URL만 변경, 웹 배포 없음. 이번 조치에서 worker·cron 최종 재감사 없음 |
| 증거 | 루트 `/Users/shinjaejun/.codex/nuri-profile-completion-20261028-urmnPT`: `delivery-login-surface-1104/{build-result,installation}.json`, `auth-login-surface-1104.json`, `auth-site-url-evidence-1104.json`, `google-login-surface-1104-registrations.json`, `auth-site-url-{before,after}-1104.jpg`, `google-branding-{name,logo}-saved-1104.jpg`, `auth-fallback-1104.mp4` |

푸시 순서의 출처는 `docs/project-memory/핵심-결정사항.md`의 `2026-10-04 Offline session · Kakao app return 경계`다. 기능 QA 뒤 push 규칙에 따라 후보의 실제 정상 인증·사진 핵심 및 발견된 오류 복귀를 확인한 뒤 전달했다. 전체 배치 동결과 분리하며 미수락 행을 삭제하지 않았다. 배포 없는 소스 검증 워크플로만 실행된다. 기존 문서·무관한 변경은 제품 push에 포함하지 않았다.

기존 묶음2/7·OS11/13·기록0/4와17개 묶음/26eventType을 유지한다. 이번 신규 수락은 U1의 실제 Google 선택 후 identity/복귀, localhost 오류 복귀, U5의 신규 fixture 교체/두 응답 유실, 관련 로그인 표시 NAV다. 업무 원본 이벤트 전체 E2E나 OS transport 시험을 새로 수행한 것으로 합산하지 않는다. QA 기존5회 작업·실패 파일·신규 fixture 및 미참조 파일, 보조 패키지·에뮬레이터 임시 권한은 필요한 후속 검증/정리 대기로 보존했다. 앱 초기화·Google 계정 삭제·일반 발송 개방은 없다.

### 다음 작업 및 우선순위

| 우선순위 | 원래 번호 또는 추가 범위 | 작업 | 선행 조건 | 담당 | 필요한 입력 | 완료 기준 | 현재 시작 가능 | Astra 권장 | GPT-6.1 Sol 권장 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 1/B2 | 전달SHA CI 후속 확인 | push완료 | Master | 실행 결과 | 전체 필수 단계success·SHA연결 | 실행 중 | Medium | Medium |
| 2 | 3/U1·추가 로그인 | 실제 계정 조건·남은 복귀 수락 | 현재 QA 세션·조건 분리 | Master/PO직접인증 | 필요한 단일/다중 계정 환경 | 조건별 실제 UI·세션 일치 | 준비 가능, 인증 입력 시 요청 | Medium | Medium |
| 3 | 6/U5 | 기존5회 작업과 도메인 수명 잔여 | 기존 데이터 보존 | Master | 기존원장 | 현재 제품 복구 계약·필수 행 증거 | 가능 | High | High |
| 4 | 4·5·NAV-01 | 업무원본·OS10/13·전환 잔여 | 관련 QA 역할과 후보 | Master | 원장별 선행 조건 | 필수 미마감 해소 | 가능 | Medium | Medium |
| 별도 | 추가 브랜드 | 검증된 홈페이지·정책·브랜드 심사 | 소유권/승인자료 | PO·Master | 공식 홈페이지·정책주소 | 실제 이름/로고 표시 | 자료 미확보, 유료 전환 보류 | Medium | Medium |
| 후속 | 7→8→9→10→11→12→13→14 | 산책 장애→정확도→전체 화면→보안→법무→RC→스토어자료→Go/No-Go | 현재 배치 동결·별도PO지시 | Master·PO | 단계별 기준/승인 | 각 원래 완료 조건 | 불가, 자동 착수 안 함 | Medium, 원인 분석 High | Medium, 원인 분석 High |

정확한 다음 실행은 현재 CI의 전체/후속 단계 확인이다. 이후 원장의 현재 미수락부터 이어간다. 증거 연결 권장: 현재 선택 모델/Medium. 실제 모델·추론 설정은 확인되지 않았고 변경하지 않았다. 기존 초기 보고의 모델 확정 표현은 이번 실제 메타데이터 확인으로 재사용하지 않는다.

---

## 이전 초기 보고 (역사 기록, 현재 상태 아님)

2026-11-04 KST · Master 단독 · **부분 완료 / 미동결 / STORE HOLD**

이 문서는 현 실행의 전달 및 재개 지점을 기록한다. 수락 상태는 [단일 원장](../qa/nuri-integrated-closeout-2026-10-25.md)이 소유한다. 직전 PO 중단은 해제됐으며, 현재 실제 제공자 인증 입력이 남아 있다.

## 직전 대비 확인 결과

| 범위 | 새로 확인하거나 마친 작업 | 미수락·재확인 |
|---|---|---|
| A · U5 | 서버에서 슬롯 UNIQUE와 기존 경로 upsert의 충돌을 처리. 앱 타입·큐 검사, 배포 후 원격 롤백 계약 검사 통과. 이전 작업은 5회 한도에서 동일 ID·파일로 격리 | 기존 QA 참조와 파일은 유지. 앱→Storage→DB→큐→화면 E2E와 실제 응답 유실 재검증은 미수락 |
| B · 카카오 | 공식 Auth Tab 적용. 첫 실기기에서 웹 중계 대신 앱 콜백에 도달했으나 시작 잠금으로 확정 실패. 순서 수정 후 새 후보 빌드·설치, 카카오 공식 인증 화면 도달 | 새 후보 실제 카카오 인증·복귀·세션·목적지 확인 필요 |
| B · Google | 명시 로그아웃 뒤 Google에서 ‘다른 계정 사용’과 Android Back 후 버튼 재활성화를 실기기에서 관찰 | 최초 로그인, 단일 자동 선택, 다중에서 선택한 QA 세션, 여러 계정 중 승인 하나, 동의·재인증은 미검증 |
| U1·OS10 | 물리 Google 로그아웃이 해당 등록만 해제하고 에뮬레이터의 기존 Google 등록을 유지함을 원격 확인 | 새 계정 등록·늦은 콜백·유효 이전 세션 경계는 미수락 |
| U2·U3·NAV-01 | 기존 유효 증거 보존. 이번 Google Back은 브라우저 취소·로그인 버튼 회복으로만 기록 | 신규 업무 원본 E2E·신규 QA transport 없음. OS10·OS13 및 공통 이동의 기존 잔여 유지 |

기존 묶음 수락은 **2/7, OS 11/13, 기록 도메인 0/4**다. 이 수치를 앱 전체 개발률 또는 오늘의 시험 수로 해석하지 않는다. 17개 묶음·26 eventType 분모는 그대로다.

## 사진: Storage·참조·큐를 분리한 판정

- Storage: 복구된 목표 경로의 객체는 이전 기록의 파일 3개 중 하나다. 이번 배포·롤백 검사에서 업로드·삭제를 수행하지 않았다.
- DB: 기존 슬롯 0에 다른 경로를 넣는 upsert가 HTTP 409 / Postgres 23505를 발생시켰다. 신규 호출자 권한 함수가 현재 참조를 비교하고, 순번·정규 참조·호환 컬럼을 원자적으로 갱신한다. 소유자 RLS, 기존 트리거와 제약은 유지한다. 변경이 확정됐는지 모르는 경우 기존 파일을 선삭제하지 않는다.
- 큐: 새 작업은 이전 참조 집합과 업로드 경로를 보존한다. 같은 참조가 이미 확정됐으면 멱등 확인하며 다른 최신 편집과 충돌하면 거부한다. 이전 QA 작업의 5회·작업 ID·목표 경로는 갱신 설치 뒤에도 그대로였다. 강제 재시도·횟수 초기화·큐 삭제를 하지 않았다.
- 배포된 함수로 QA 기록의 정상 슬롯 교체, 소유권 실패 시 롤백, 같은 요청, 오래된 기준, 순서·행 ID 보존, 타 사용자 차단을 rollback-only로 검증했다. 앱 큐의 네트워크 단절을 재현한 시험은 아니다.

## 인증·계정 선택·복귀

- 수정 전: Google 및 카카오는 기존 외부 브라우저 OAuth였다. 카카오의 제공자→Supabase 서버 콜백과 Supabase→앱 HTTPS App Link는 서로 다르다. 카카오의 웹 안내 페이지와 실기기의 도메인 검증을 확인했다.
- 수정 후: 지원되는 Android 브라우저만 [공식 Auth Tab](https://developer.chrome.com/docs/android/custom-tabs/guide-auth-tab)을 사용하며 앱 콜백과 PKCE 검증을 그대로 통과한다. 미지원 브라우저·기존 앱 링크는 유지한다. 로딩 상태를 표시하고 중복 요청을 막는다. 웹 배포, redirect allowlist, 앱 링크 설정은 바꾸지 않았다.
- Google: [공식 계정 선택](https://developers.google.com/identity/openid-connect/reference)은 명시 로그아웃 후 요청한다. 평상시는 제공자 정책에 맡긴다. 브라우저 세션·기기 계정·승인 credential·Supabase identity를 같은 분모로 세지 않았다. 모든 다중 환경에서 선택 UI를 강제하거나 단일 자동 선택을 보장한 변경은 아니다.
- 계정·보안: 로그인 시작 전에 무조건 로컬 세션을 해제하지 않는다. 명시 로그아웃은 기존 local scope를 유지한다. 보안 설정·identity 병합·다른 기기 로그아웃은 하지 않았다.

## 전달·설치·증거

| 항목 | 확인 |
|---|---|
| 제품 후보 | `0a3e3c59a9fe8ebbe4d6dd6c6cb8c666475d72db`, `codex/walk-marker-recovery-20261020` |
| 런타임 / APK | `1902556cc879e44522465cd94fe0bc322c274e9206b730c236e9ff595022a8b5` / `c78b2e9cfe3138f0b51f6933da9683ca65eebf3fa24f22f9971a6e12d0eebb21` |
| 로컬 검사 | 342 suites·4,606 PASS, TypeScript·대상 lint·source/secret guard PASS |
| 설치 | SM-S937N 보존 설치, bundled Debug, Metro OFF. 에뮬레이터는 기존 `01d78a3`; 신버전 설치로 합산하지 않음 |
| 서버 | `20261104074335_replace_memory_image_refs` 적용·기록, invoker/anon 차단 검증. 기존 session-fence/Edge/worker/QA 발송 제한 변경 없음 |
| Git·CI | 관련 코드만 로컬 커밋. 실기기 인증 수락 전 푸시 금지 규칙에 따라 후보 푸시·동일 SHA CI 미수행 |
| QA 정리·원복 | 이번에는 원래 QA 큐와 파일, 보조 패키지, 네트워크·권한 설정을 보존. 앱 삭제·초기화 및 다른 데이터 정리 없음 |

증거 루트: `/Users/shinjaejun/.codex/nuri-profile-completion-20261028-urmnPT`. `upload-info-1104/reference-observation.json`은 이전 409, `upload-info-1104/verify-atomic-reference.cjs --deployed`는 이번 롤백 검사, `delivery-photo-auth-armed-1104/{build-result,installation}.json`은 최신 설치 후보, `delivery-photo-auth-1104`는 최초 인증 실패 후보를 연결한다.

## 다음 작업

| 우선순위 | 원래 번호 또는 추가 범위 | 작업 | 선행 조건 | 담당 | 필요한 입력 | 완료 기준 | 지금 시작 가능 | Astra | GPT-6.1 Sol |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 추가 카카오 / U1 | 현재 공식 로그인에서 세션·목적지 확인 | 설치 완료 | PO 인증, Master 검증 | 기존 카카오 QA 직접 인증 | 중계 미노출 관찰, 올바른 QA 세션·목적지 | 인증 입력 대기 | Medium | Medium |
| 2 | 추가 Google / U1·OS10 | 실제 계정 선택·복귀·전환 | 승인 QA 계정/브라우저 환경 확인 | Master | 필요 시 기존 Google QA 직접 인증·다중 조건 | 각 실제 조건의 UI와 최종 identity 확인 | 준비 가능 | Medium | Medium |
| 3 | 6 / U5 | 사진 참조 정상·응답 유실 실기기와 기록 잔여 | 격리 보존, 승인 QA fixture | Master | 기존 QA 환경 | DB·Storage·큐·확정 화면의 연결 | 준비 가능 | High | High |
| 4 | U1·U2·U3·U5·NAV-01 | 기존 미완결 행의 영향 검증·전달·정리 | 관련 후보 및 인증 확인 | Master | 원장 행별 조건 | 실제 증거, 원격 CI, 미완료 없는 동결 판단 | 인증 후 영향 재개 | Medium | Medium |

현재 실제 모델 GPT-6.1 Sol. 추론 설정은 변경하지 않았다. 해결된 DB 계약과 진행 중인 제공자 실기기 시험을 전체 수락과 구분한다. 현재 정확한 다음 실행은 실기기의 카카오 QA 인증 직후 세션 교환·Home/약관/온보딩의 정상 목적지·원격 등록을 확인하는 것이다. 후속 7→14는 별도 지시 전 착수하지 않는다.
