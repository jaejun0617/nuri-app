# NURI Timeline Memory Detail Redesign Report

CLASSIFICATION: QA_EVIDENCE

기준일: 2026-10-07 KST. 추억 상세 시안 및 추가 지시 11개에 대한 새 디자인 후보다. 이전 Timeline·문서·저장공간 승인 보고서는 변경하지 않는다.

## 1. 착수와 범위

- PRIMARY_OWNER: NURI-04. 단일 writer로 구현했다.
- 사용자 승인: 구현·local 검증 후 Galaxy S24 Release 빌드·install-r 각 1회. 실제 화면은 PO 직접 확인.
- runtime 파일 18개, 테스트 파일 5개. DB·RLS·RPC·Storage 정책·XP 지급·기록 생성은 변경하지 않았다.
- 필수 engineering 문서·project-memory·routing policy·기존 Timeline QA·실제 source를 확인했다. Supabase SDK를 새로 도입하거나 서버 계약을 수정하지 않고 기존 날짜 범위 읽기 함수를 재사용한다.
- 위험도: 상세 이미지·관련 기록의 비동기 상태, 진입 출처 기반 복귀, 여러 화면의 저장 표시. 서버 write-path와 draft·disabled 방어는 유지했다.
- SOURCE_OF_TRUTH: 사용자 첨부 상세 시안, 명시 추가 지시, 실제 active caller/style merge와 기존 서비스 계약. native 시각 재현도는 PO 검증 전 미확인이다.

## 2. 구현 결과

| 지시 | 반영 | 검증 경계 |
| --- | --- | --- |
| 추억 상세 리디자인 | 중앙 제목·44dp 헤더 버튼·펫/날짜·카테고리·본문·개별 해시태그·같은 날 관련 기록 3개 preview 및 모두 보기 | source·화면 컴포넌트 테스트 PASS; 실제 화면 PO_PENDING |
| 카테고리별 빈 문구 | 산책·식사·일기·생활 세부 카테고리·건강·전체 각각 정의; 특정 이름 하드코딩 없음 | helper 테스트 PASS |
| 통계 패널 위로 | 기존 이미지 ground anchor에서 4dp 위로 조정 | layout 계약 테스트 PASS |
| 더보기 계절색 | Timeline-specific `selectedCategory` token을 헤더 더보기·관련 기록 모두 보기에 적용 | 4계절 컴포넌트 테스트 PASS |
| 목록의 NURI 아이콘 | seasonal Timeline 카테고리·무사진 placeholder에서 원본 외부 아이콘 강제를 제거 | 기존 semantic mapping 및 아이콘 테스트 PASS |
| 년월·최신순 패딩 | surface 상하 3dp에서 4dp로만 증가; 글꼴·좌우 계약 유지 | style 테스트 PASS |
| 전체 Wave 제거 | 기록 생성/수정·일정 생성/수정·펫 등록/수정·로그인 7개 화면 호출 제거; 가시 CTA 문구 고정 | 저장 disabled·busy 계약 유지; 소스 및 전체 suite PASS |
| 기록 완료 글꼴 | 하단 완료 11sp에서 12sp, lineHeight 16sp; preset 뒤에 적용 | presentation 테스트 PASS |
| 작성 중단 CTA | 계속 작성하기 Primary, 나가기 Neutral; draft 로직 변경 없음 | 기록·일정 생성 계약 테스트 PASS |
| 상세 뒤로가기 | 목록→상세의 즉시 출처 `timeline` 명시; 관련 상세·수정에도 출처 전달 | 헤더·Android back·기존 More 계약 테스트 PASS; 실기기 재현 PO_PENDING |
| 생활→기타 라벨 | `생활 · 기타`, 생활의 다른 세부 분류도 계층을 보존한 표시 | category helper 테스트 PASS; category key·필터·query 불변 |
| Home 펫 등록 + | 원본 plus glyph를 흰색으로 표시; 버튼 배경·크기·등록 기능 유지 | source 확인·전체 suite PASS; 시각 PO_PENDING |
| 상세 메뉴 | 여유 있는 18dp panel padding·12dp gap·48dp 액션, 아이콘 제거, 수정하기/삭제하기 | 삭제하기는 빨강/흰색; 최종 삭제 확인은 별도 유지·미실행 |

사진은 너비 기준 aspectRatio 1.55, radius 18dp로 맞췄다. 다중 사진의 카운터·dot·스와이프, 기존 signed URL hydration을 유지한다. 무사진 안내와 사진 로딩/실패/다시 불러오기를 구분한다. no-photo panel은 확대 문구를 위해 고정 aspect 대신 최소 높이와 유연한 패딩을 쓴다.

카테고리 칩은 좌우 8dp·상하 3dp·11sp이며 해시태그는 좌우 10dp·상하 5dp·11sp다. 큰 CTA처럼 확대하지 않았다. 기존 감정·구매 가격·이미지·편집·삭제 정보는 유지했다.

## 3. 반복된 뒤로가기 문제 원인

이전 `TimelineScreen.onPressItem`은 목록의 `route.params.entrySource`를 상세에 그대로 전달했다. 목록이 Home 또는 Home total-summary에서 열린 이력이 남으면 상세의 공통 back hook은 실제 stack history보다 해당 Home 출처를 우선해 홈으로 보냈다. 어떤 경로로 Timeline에 들어왔는지에 따라 발생했기 때문에 간헐적으로 보였다.

이제 목록에서 기록을 누른 즉시 출처는 항상 `timeline`이다. 상세는 기존 stack의 `goBack`을 사용하고 history가 없으면 TimelineMain으로 복귀한다. 직접 Home·More·건강·일정 진입의 기존 경로는 수정하지 않았다. related 상세의 replace·수정 진입도 전달된 즉시 출처를 유지한다. 실기기 연속 진입/복귀 재현은 PO 확인이 남았다.

## 4. 관련 기록과 서버 경계

현재 로드된 Timeline 페이지를 같은 날의 전체 건수로 오인하지 않도록 기존 `fetchMemoriesByPetDateRange`를 사용한다. `occurredAt` 우선 표시 날짜와 created fallback의 KST 일 경계를 일치시키고, 같은 펫·날짜만 선택한다. 현재 기록·중복 ID·건강 기록은 관련 preview에서 제외하고 정렬 tie-breaker를 유지한다.

request owner·focus cleanup으로 오래된 async 응답을 차단하고 loading/error/retry를 구분한다. 미확인 count를 임의 0으로 표시하지 않는다. SDK/query/RLS 수정은 없다. 기존 date-range 함수의 remote 최대 반환 row 제한은 유지되며, 한 날짜가 그 상한을 넘는 규모의 정확한 전체 count는 이번 범위에서 검증하지 않았다.

REMOTE_VERIFICATION: NOT_RUN. DB_MUTATION: NONE. 실제 조회 응답·private signed image 실패·오프라인 UX는 최신 APK에서 PO 확인 전 미확인이다. Community QA 100건·XP·계정·펫·기록 데이터에 쓰기/삭제 작업을 하지 않았다.

## 5. Local 검증

| 항목 | 실제 결과 |
| --- | --- |
| TypeScript | PASS, noEmit exit 0 |
| Targeted ESLint | 오류 0·경고 23, HEAD 기준 기존 경고 23과 동일, 새 문제 0 |
| Targeted tests | 15 suites / 272 tests PASS |
| Full suite | 185 suites / 1,892 tests PASS |
| git diff --check | PASS |
| 사진/무사진·retry·4계절·related·menu | synthetic 컴포넌트 및 helper 테스트 PASS |
| Native visual/device interaction | NOT_RUN, PO_DIRECT_REVIEW |

초기 대상 테스트에서 새 화면 mock의 SafeAreaContext와 이전 3dp 패딩 기대값을 보완했다. 신규 TypeScript 테스트의 flatten 반환 타입 단정도 제거했다. 최종 대상·전체 실행의 PASS만 위 수치에 사용한다. 이 결과는 Final E2E·운영 QA·Store 승인과 다르다.

## 6. Release 후보와 설치

INCREMENTAL_RELEASE_BUILD: 1회 PASS. clean 명령 없이 기존 checkout·cache를 사용했다. 앞선 승인된 저장공간 정리로 제거됐던 intermediate는 정상 재생성됐다.

- Gradle: `assembleRelease --no-daemon --console plain --max-workers=2 -Dorg.gradle.parallel=false`.
- BUILD_TIME: 550.539초. 995 actionable tasks: 873 executed, 112 from cache, 10 up-to-date.
- Node 24.20.0·Yarn 3.6.4·Java 17 입력 검사. 서명·config 내용 미노출, input/source hash 일치.
- QA dirty source snapshot을 source fingerprint로 기록했다. clean Store preflight/RC가 아니며 Git HEAD만으로 새 미커밋 source를 대표하지 않는다.
- APK verifier PASS: package·release variant·base HEAD·승인 signer, 새 상세 bundle marker 확인.
- APK: `/private/tmp/nuri-timeline-memory-detail-20261007-001213/nuri-timeline-detail-qa-bc4dae57.apk`.
- SHA-256: `bc4dae573ca797b629b84b7a2b2b02bd4e5e73b99b72504f245300c6608ee717`.
- APK_BYTES: 282009012.
- GALAXY_S24_INSTALL_R: 1회 PASS, 15.834초; model `SM-S937N`.
- 설치 APK hash 일치, 앱 UID·최초 설치 시각·화면 크기·density·fontScale 동일.
- uninstall·clear data·계정 변경·로그아웃·화면 조작·설정 변경·직접 저장/삭제: 0회.

Native 화면 캡처·fatal/ANR/RN fatal runtime 검사: NOT_RUN. 앱을 agent가 실행하지 않았으므로 설치 성공을 runtime PASS로 표기하지 않는다. 빌드에는 기존 Gradle/API deprecation 경고가 있으나 실패는 없다.

## 7. 증적과 보존

EVIDENCE_ROOT: `/private/tmp/nuri-timeline-memory-detail-20261007-001213`.

- `start-state.json`, `changed-code.json`, `build-source.json`, `candidate.json`: 시작/변경 범위·source/config 입력 hash.
- `typecheck-final-result.json`, `lint-baseline-comparison.json`, `targeted-latest.json`, `full.json`, `validation.json`: 최종 local 검증.
- `build-result.json`, `artifact-verification-result.json`, `install-preservation.json`: 단일 빌드/설치와 보존 metadata.
- `docs-before/`: 이번에 갱신한 현재 문서 6개의 수정 전 사본. 이전 문서 closeout 원문·감사 증적은 덮어쓰지 않는다.
- 기존 승인 APK·canonical Auth AAB·서명/config·기존 QA·production asset·무관한 dirty는 보존 대상이다. `preservation.json`에서 허용된 현재 task 문서 갱신 외 hash 변화/누락을 확인한다.

POST_PRESERVATION: PASS. 보호된 기존 dirty hash 변화 0, build snapshot의 예상 밖 변화/누락 0, HEAD·branch 동일·staged 없음, 서명/config hash 동일. 이전 Timeline APK hash 동일·canonical Auth AAB 존재·새 APK hash 동일·build output 4개 경로 존재를 확인했다. 대형 과거 evidence 전체를 재스캔했다고 주장하지 않는다.

DOCUMENT_VALIDATION: Markdown 구조 PASS·현재 task 문서 7개의 내부 링크 71개 PASS·최종 diff check PASS. 추가 source 수정·cleanup·DB 작업은 없었다.

이번 task 갱신: 핵심 project-memory 4개·Release Checklist·Research Index와 이 신규 보고서. 앞선 documentation/storage report·archive·영구 metadata·Community/Auth/Weather의 승인 보고서는 수정하지 않았다.

## 8. PO 직접 확인

1. 사진/무사진 상세의 사진 비율·본문·compact 칩과 4계절 더보기 색.
2. 같은 날 다른 추억 3개와 모두 보기, 관련 기록 진입/뒤로가기.
3. Home 경유 Timeline→상세→Back을 반복해 목록 복귀 확인.
4. 작성 중 가시 CTA 고정, 계속 작성하기/나가기 구분, 최종 삭제 확인 분리.
5. 통계 패널 4dp 상승·년월/최신순 패딩·생활 하위 라벨·NURI 아이콘·Home 흰 +.
6. 실제 signed image 실패·오프라인 및 긴 제목/펫 이름·확대 글꼴의 잘림/겹침. 이번 설치에서 기기 설정은 바꾸지 않았다.

기존 GLOBAL_CTA의 빈 Timeline Primary 중복·일정 첫 진입 합성 이상은 별도 OPEN scope다. 이번 후보에서 해결 또는 PO_ACCEPTED_LIMITATION으로 승격하지 않는다.

## 9. Final State

HEAD: `f110bcc5b359bd44ba3381527d9ab7c084dace31`.

BRANCH: `codex/task6-community-content-policy`. STAGED: NONE. COMMIT: NO. PUSH: NO. CLEANUP: NO. STORE: HOLD.

MEMORY_DETAIL_REDESIGN: IMPLEMENTED_PENDING_PO_APPROVAL.

TIMELINE_ADDITIONAL_SCOPE: IMPLEMENTED_PENDING_PO_APPROVAL.

LOCAL_VALIDATION: PASS. GALAXY_S24_CANDIDATE_INSTALL: PASS. NATIVE_VISUAL_QA: PO_PENDING.

BUILD_OUTPUTS: PRESERVED. QA_DATA: NO_MUTATION. AUTO_START_NEXT_WORK: NO.

MASTER_STATE: STOPPED_WAITING_FOR_PO_TIMELINE_MEMORY_DETAIL_REVIEW.

PO 승인을 기다립니다.
