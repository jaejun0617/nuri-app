# advanced-codex-checklist.md

작업 유형별 검사 적용성·기대 증거·결과 기록을 소유한다. 2026-11-11 개편 기준이며, 이 목록 전체를 매 작업마다 실행하지 않는다. 승인·실패 해결은 [Workflow](advanced-codex-workflow.md#execution-contract), 사실의 권위·갱신은 [Memory](advanced-codex-memory.md#authority-map)가 소유한다.

<a id="applicability"></a>
## 작업 유형별 적용성

| 실제 작업 | 기본 확인과 기대 증거 | 자동 수행하지 않을 것 |
| --- | --- | --- |
| 읽기 전용 분석 | 읽은 범위·고정 버전·근거·한계, 승인된 보고 위치 | 저장소 갱신·빌드·DB/기기 조작 |
| MD-only | 현재 원문 보존·역할·링크/anchor·diff·실제 staged 본문·동일 SHA 필수 CI | APK·재설치·수동 제품 전수 검사 |
| JS/TS·일반 UI | 타입·대상 lint·표적 행위 검사, 필요 시 Metro 개발 확인 | 작은 수정마다 Native 전체 빌드 |
| Native/빌드 입력 | 영향 native build·보존 설치·해당 실기기 경계 | Fast Refresh만으로 수락 |
| 변경 없는 APK QA | source/runtime/backend/계정/데이터 조건 적합성·미수락 행 실행 | 재개·모델 변경 이유의 rebuild/PASS 반복 |
| 서버만 수정 | 승인 서버 계약·RLS/사용자 권한·멱등성·실제 영향 흐름 | 앱 입력 불변인데 APK 재빌드 |
| Release/성능 | 해당 목적의 고정 후보·기기·측정 조건·지표 | Debug/Metro를 Release 성능으로 승격 |

작업에 해당하는 행을 고른 뒤 아래 상세 항목 중 영향 있는 것만 적용한다. 필수 조건을 편의상 NOT_APPLICABLE로 바꾸지 않는다. 검사 실행 승인은 [작업 계약](advanced-codex-workflow.md#execution-contract)에서 확인하며 위험 발견만으로 운영 변경 권한이 생기지 않는다.

<a id="evidence-contract"></a>
## 결과와 증거 계약

각 검사에는 **조건 ID / 적용 여부와 이유 / 기대 결과 / 실제 결과 / 증거 / 재사용 여부 / 남은 경계**를 남긴다.

- 결과: PASS, FAIL, PARTIAL, BLOCKED, NOT_RUN, NOT_APPLICABLE, DEFERRED_BY_PO. 원장의 용어와 연결하고 미실행·보류를 PASS로 계산하지 않는다. 재사용은 결과와 별도 속성이다.
- 증거 종류: source 검토, unit/SQL 계약, 서버 통합, 격리 앱 E2E, 운영 연결 앱 E2E, Release/성능. 서로 대신하지 않는다.
- 증거 식별: 후보 source·runtime 입력·서버 버전·환경·계정 역할·데이터/원본 ID·기기·시각·관찰 방법·실패/제한. 비밀값은 제외한다.
- 재사용은 source뿐 아니라 서버·권한·설정·계정·데이터·실행 경계의 영향 여부로 판단한다. 같은 SHA만으로 전체 재사용하거나 오래됐다는 이유만으로 전수 반복하지 않는다.
- API 성공은 화면 진입 성공이 아니다. 서버 읽음과 목적지 진입 후 읽음은 구분한다. 3fps 표본은 모든 compositor frame의 무플리커 보장이 아니다.
- 실제 수락은 [단일 원장](../qa/nuri-integrated-closeout-2026-10-25.md)과 해당 증거가 소유한다. 문서·CI 성공으로 수락을 올리지 않는다.

<a id="preflight"></a>
## 착수와 보호

- [ ] 현재 PO 범위·성공/중단 조건과 실제 경로·HEAD·index·dirty를 확인했다.
- [ ] [현재 상태](../project-memory/현재-프로젝트-상태.md#current-baseline), [현재 대기열](../project-memory/다음-작업-우선순위.md#resume-point), [결정 적용 지도](../project-memory/핵심-결정사항.md#decision-scope-map), 직전 관련 [로그](../project-memory/최근-작업-로그.md)를 연결했다.
- [ ] [로컬 native 빌드](disk-hygiene-policy.md#로컬-실행) 직전 필요 볼륨마다 25 GiB 이상을 실측했다. 생성물 정리 전 필요한 APK·번들·소스맵·심볼·검사 증거의 독립 보존본과 해시를 확인했고, 설치 시 source/runtime·APK·서명·대상 기기를 대조했다.
- [ ] 승인·요구·구현·배포·수락의 충돌을 종류별로 분리했다. 필요한 최소 근거만 읽고 미확인은 명시했다.
- [ ] 범위 밖 파일·사용자 데이터·기존 QA·비밀정보 보호와 자기 변경의 복구 단위를 정했다.
- [ ] 파일 개수가 아닌 권한·발송·비용·데이터·회귀 영향으로 위험을 판단했다.

<a id="code-checks"></a>
## 코드·상태·UX 표적 검사

- 타입: unknown guard, nullable/optional, route/props/store/API DTO 정합성, 반환·catch·Promise 실패. any·타입 무시·무관한 assertion 완화 없음.
- 상태: 전역/서버/화면/파생 분리, 목록/상세 캐시, 계정·펫 세대, optimistic rollback, query·초안·upload 수명.
- 비동기: effect 의존성, stale closure, 취소·late response·out-of-order·중복 요청, timer/listener/subscription 정리. 응답 유실은 같은 논리 요청의 확정 결과부터 확인.
- 이동: route 계약·Stack/Tab/Modal, deep link·외부 진입, 연속 탭·Back·취소·실패·복귀, 원래 위치·선택 유지.
- 성능: 관측 병목·selector 범위·객체 재생성 비용으로 memo 필요성 판단. inline callback 자체는 FAIL이 아니다. JS/UI thread, network/decode/render 비용을 분리.
- 목록/이미지: 설치 버전의 리스트 엔진·고유 key·window/batch·dedup·pagination guard, 썸네일/원본·signed URL·cache·empty/error/loading·안전한 fallback.
- UI: [고정 디자인](../project-memory/핵심-결정사항.md#2026-11-06-po-고정-모든-후속-디자인의-cta와-글자-크기), theme/AppText·사용자 폰트·큰 글자·긴 문구·keyboard·safe area·터치 영역·screen reader. 승인 화면만 검증.
- 목록 갱신: 메인 홈을 제외한 서버 목록의 일반 갱신은 활동·칭호의 당겨서 갱신을 우선한다. 빈 목록에서도 동작하고 갱신 중 기존 결과를 유지한다. 동일 기능의 상시 버튼은 두지 않되 조회 실패 재시도, 권한·위치 확인 등 목적이 다른 동작은 구분한다.
- 모달: 커뮤니티·공지사항·고객센터·구독의 앱 소유 확인·경고는 Android 기본 Alert 대신 [NuriAlert](../../src/app/ui/NuriAlert.ts) 또는 [ConfirmDialog](../../src/components/common/ConfirmDialog.tsx)를 사용한다. 신규 화면과 수정 화면 모두 적용하며, 취소·Android Back·파괴적 동작의 확인을 검증한다. OS 권한·시스템 사진 선택기·외부 제공자 창은 이 규칙의 대상이 아니다.
- 버전: 실제 React/RN·New Architecture 호환성, ref·cleanup·라이브러리 API. 최신이라는 이유로 바꾸거나 가정하지 않는다.
- 도메인: [공개 신뢰·moderation·CMS 경계](advanced-codex-workflow.md#code-domain-safety)를 확인. create/update/comment 우회, draft 유실, stable error UX를 영향 경로에서 검증.

<a id="qa-checks"></a>
## QA·서버 표적 검사

- [ ] [환경·정상 앱 로그인·사용자 동일성](advanced-codex-workflow.md#qa-server-safety)을 먼저 확인한 뒤 fixture를 준비했다.
- [ ] 합성 사전 상태, 실제 업무 동작, 실제 알림·읽음·보상 결과를 분리했다.
- [ ] 수신자·원본·대상 계정이 한정되며 일반 사용자·운영 fanout·외부 발송이 승인 밖으로 퍼지지 않는다.
- [ ] 앱의 미읽음→정확한 목적지→성공 후 서버 읽음→Back과 권한 실패를 필요한 원장 행에서 확인했다. 직접 결과 주입 없음.
- [ ] 격리/운영 backend·Auth·앱 ID·서명·저장공간·데이터·발송 차이를 남겼다. 격리 E2E를 운영 Cron·OS push 수락으로 확대하지 않았다.
- [ ] 앱 소비·재시도·증거 확보 전에 원본을 삭제하지 않았고, 정확한 생성 ID만 승인된 경로로 정리했다.
- [ ] SQL 경로와 소비는 [SQL 가이드](../sql/정리-가이드.md) 기준이다. supabase/migrations, supabase/tests, docs/sql, scripts 입력을 seed 전용으로 취급하거나 이동하지 않는다.
- [ ] 서버 변경 승인이 있는 경우 schema/RPC/RLS/Storage·오류 코드·멱등성·타인 접근·복구 위험을 검사했다. local 계약과 remote 적용을 별도 기록했다.

<a id="document-checks"></a>
## 문서와 전달 검사

- [ ] 수정 직전 원문과 HEAD, 보존·별도 복원 hash를 연결했다. ZIP/과거 사본을 현재 원본으로 취급하지 않았다.
- [ ] 변경한 문구의 시점·역할·승인과 고유 역사 본문을 구분했다. 전체 블록·제목·인접 문맥으로 최종 위치를 대응했다.
- [ ] 새/변경 링크가 실제 의도 파일·제목·fragment를 가리킨다. 중복 제목·접미사·명시 anchor와 참조 소비자를 필요한 범위에서 확인했다.
- [ ] [갱신 트리거](advanced-codex-memory.md#update-triggers)에 맞는 문서만 갱신했다. 과거의 다음 작업을 현행 큐로 노출하지 않았다.
- [ ] reviewed candidate = 실제 stage/commit이며 범위 밖 dirty는 그대로다. 전체 파일과 선택 구간 전달을 구분했다.
- [ ] 일반 push·고정 commit 원격 본문·동일 SHA 필수 CI를 연결했다. 경고와 미실행을 숨기지 않았고 검사 skip/정책 완화 없음.
- [ ] [계속/중단](advanced-codex-workflow.md#continue-stop)에 따라 종료 또는 승인 후속 진행을 결정했다.

<a id="completion"></a>
## 완료 판단과 개편 검증

적용 대상 필수 검사에 근거가 있어야 해당 범위 완료다. 빌드·기기·문서 갱신은 모든 작업의 공통 완료 조건이 아니다. 실패 시 [원인 분석](advanced-codex-workflow.md#diagnosis)으로 돌아가며 기존 dirty를 전체 되돌리지 않는다. Final Review는 읽기 전용 범위의 발견·위험·필요한 입력을 보고하고 저장소를 고치지 않는다.

운영지침 개편의 정적 평가, 문서 기반 모의 판단, 다음 정상 실행의 자동 로드, 실제 개발 행동 관찰은 별도 결과다. 뒤 두 항목은 미실행이면 PENDING이다. 평가용 Room·Codex subprocess를 자동 만들지 않는다.

[개편 이력과 근거](../project-memory/최근-작업-로그.md#2026-11-11-codex-운영지침-개편)에 수정 전후 hash·고정 평가 기준·항목별 근거를 연결한다. 높은 점수도 활성 위임 충돌·무단 운영 변경·전체 rollback·비밀 노출·근거 없는 PASS를 면제하지 않는다.
