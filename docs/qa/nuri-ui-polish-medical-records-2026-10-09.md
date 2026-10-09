# NURI 계절 UI 정리 및 건강 지출 기록 후보

## PO 최종 승인 및 Release 전달

PO 최종 승인 후 [통합 Release 전달](nuri-ui-approved-release-2026-10-09.md)을 완료했다. source `f6d284d`, 설치 APK `ccf759ca`, 승인된 구현 동결. 아래 후보/승인 대기는 이전 이력이다. 새 의료 필드 실제 저장·월별 합계 검증과 기존 OPEN을 이번 디자인 승인만으로 PASS 처리하지 않는다. STORE HOLD.

## 판정과 승인 경계

- IMPLEMENTED_PENDING_PO_REVIEW. 요청한 디자인 및 건강 기록 필드를 구현했고 로컬 검증을 마쳤다. 이번 native 외관·키보드·저장 QA는 PO 직접 확인 대기다.
- 승인된 스플래시·로그인 배경/구도/CTA/상태바는 보존했다. 계절 AUTO를 변경하지 않았다.
- 기존 Metro ON, SM-S937N Android 16 앱 target 연결 확인. 새 APK build/install, 기기 조작, 실데이터 저장, commit/push/cleanup은 하지 않았다.
- 최종 PO 승인 이후에만 Release 빌드·설치·커밋·푸시·동결을 진행한다. STORE HOLD.
- 사용자 제공 참고 화면의 따옴표·마커 밑줄 원칙만 재해석했다. 외부 앱의 콘텐츠·자산을 복사하지 않았다.

## 구현 결과

| 요청 | 이번 후보 | 보존한 기능 |
| --- | --- | --- |
| 은은한 4계절 배경 | Home·일정·전체메뉴·타임라인·건강관리·가이드 공통 canvasGradient를 밝게 조정 | 계절 결정, 배경 geometry, 기존 장식 노출 조건, 인증 이미지 |
| 가이드 목록 | 제목을 따옴표/마커 밑줄로 강조, 카테고리·태그의 칩 배경 제거, 검색 아이콘 배경 제거 | 검색 동기 입력, 필터·정렬·권한·랭킹 |
| 가이드 상세 | 계절 배경, 이미지 및 무사진 placeholder 제거, 본문 중심 평면 구조, 제목/절 제목 마커 | 안내·주의·위험 의미, 출처, 열람 이벤트, 뒤로가기 |
| 전체메뉴 | 상단 톱니바퀴 제거, 사용자/펫 영역에 기존 실제 블러 소재 | 앱 글꼴·펫 강조색·알림·계정 메뉴와 안전 확인 절차 |
| Home | 기록 알림 및 실제 펫 이름의 더 알아보기에 glass, 누리 wordmark/하트에 계절색 | 프로필/알림 callback, 펫 정보, 계절 설정 |
| 기록하기 | 기존 수정 폼과 같은 계절 바탕/glass, 중립색, 정돈된 사진·입력 영역 | draft, 카테고리, 이미지, 날짜, 태그, 저장·일정 연결 |
| 기록수정 | 상단 수정 버튼, 사진 문구 중앙 정렬, 상하 저장 동일 handler와 동기 중복 방지 | 저장 오류 처리, 이미지 교체, 목록/상세 갱신 |
| 커뮤니티 | `< 이전`, `다음 >` 텍스트형으로 padding 축소, 최소 48dp 터치 영역 | 페이지 이동, disabled 처리, 댓글/작성/운영 계약 |
| 건강관리 | 5단계 체중 축/격자·최저/최고·최근 측정일, 마지막 측정 표시, 소수 둘째 자리 | 실제 측정값, 0 기준 축, 가로 스크롤, 수정 진입 |
| 인사이트 | 체중 패널과 건강 기록 더하기 사이 24dp 간격 | 기존 3탭 및 데이터 집계 |
| 자주 쓰는 기록 | `1일 전` 등 상대 시각에 실제 줄 길이 기반 밑줄 | 시간 계산 및 기록 진입 |
| 로그아웃 | 확인 CTA를 계절 primary, 취소는 보조 역할 | 로그아웃 절차, 탈퇴 destructive 역할 |

## 펫 테마와 계절의 분리

- 펫 선택 강조색은 프로필 링·칭호·이름·세부종/나이/몸무게·함께한 시간 및 해당 설정 미리보기에 남겼다.
- 일반 화면/컨트롤은 `NEUTRAL_UI_PALETTE`를 사용한다. active navigation과 toast 본문은 현재 앱 light/dark text token을 따른다.
- 계절 바탕, Home 브랜드의 계절색, 저장/로그아웃 등 기존 CTA 역할별 계절색, 위험/경고 의미색은 별도 계약이다. 공식 OAuth 브랜드 색상과 읽은 게시글 표시도 변경하지 않았다.
- 저장된 펫 테마 값, 선택기 swatch, 프로필 미리보기와 홈 위젯 데이터는 지우거나 다시 저장하지 않았다.
- 실제 소비자가 없는 legacy `MoreScreen`은 이번 작업에서 수정하지 않았다. 실제 전체메뉴 owner는 `MoreDrawerContent`다.

## 건강 기록 및 금액 계약

- 건강관리의 `병원·진단 기록`, `약·복약 기록`은 RecordCreate의 health 카테고리로 진입한다. 기존 병원 일정/투약 알림은 각각 별도 메뉴로 유지했다.
- 입력: 기록 종류, 병원명, 진단·진료 내용, 약 이름·복약 내용, 기존 병원·건강 비용. 병원/복약 종류는 컨디션을 강제하지 않는다. 컨디션 기록은 기존 필수 조건을 유지한다.
- 비용은 항목별 중복 합산이 아닌 **기록 1건의 총액**이다. `memories.price`만 금액 source로 사용한다. 빈 금액은 합계에 포함하지 않는다.
- 병원명 100자, 진료/복약 각 240자, optional `metadata.health.care`로 저장한다. 기존 condition/weight와 오래된 metadata를 읽고 유지한다.
- 생성 draft 복구, 수정 초기값/dirty, 상세 표시, 건강관리 활동 분류를 연결했다. 수정 요청에서 metadata를 생략한 기존 caller의 데이터를 지우지 않는다.
- 월별 지출은 기존 소유자 전체 펫 범위와 기록 날짜 기준을 재사용한다. 생성/수정/삭제 후 기존 전체 월 cache invalidation을 유지한다. 별도 지출 테이블·중복 row·새 RPC는 없다.

## 실제 서버 확인

- Linked project: `grmekesqoydylqmyvfke`, catalog 읽기 전용 확인.
- `memories.price`: nullable integer, 0 이상 check. `metadata`: jsonb. `occurred_at`: date.
- `memories_crud_own`: 소유 사용자 및 `owns_pet(pet_id)` 조건의 USING/WITH CHECK 유지. 기존 제목/내용 검사와 updated_at trigger 유지.
- DB schema/RPC/RLS/Storage 정책 변경 0, 직접 DB mutation 0, 운영 기록 쓰기 0.
- **서버 계약 확인과 실제 저장 QA는 다르다.** 이번 새 필드의 실기기 생성→수정→월별 합계 반영은 아직 미확인이다.

## 주요 소스

- `src/theme/home/seasonalAmbient.ts`: 공통 계절 바탕.
- `src/services/pets/themePalette.ts`: 펫 identity와 중립 UI palette 경계.
- `src/app/ui/MarkerText.tsx`: native text line 측정, 줄바꿈 대응 밑줄, 반복 동일 geometry 상태 변경 방지.
- `src/components/guides/GuideListCard.tsx`, `GuideRecommendationCard.tsx`, `src/screens/Guides/GuideListScreen.tsx`, `GuideDetailScreen.tsx` 및 해당 styles: 가이드 표현.
- `src/components/MoreDrawer/MoreMenuPresentation.tsx`, `src/screens/More/MoreDrawerContent.tsx`: 전체메뉴와 로그아웃.
- `src/screens/Main/components/LoggedInHome/LoggedInHome.tsx`, `src/components/records/FrequentRecordsSection.tsx`: Home identity/glass/시간 표시.
- `src/components/records/MedicalRecordFields.tsx`, `src/screens/Records/RecordCreateScreen.tsx`, `RecordEditScreen.tsx`, `RecordDetailScreen.tsx`: 건강 입력 및 저장 표시.
- `src/services/records/metadata.ts`, `src/services/local/recordDraft.ts`, `src/services/supabase/memories.ts`, `src/services/health-report/viewModel.ts`, `src/navigation/RootNavigator.tsx`: 타입/초기 진입/기존 저장 연결.
- `src/components/health/WeightTrendChart.tsx`, `src/screens/HealthReport/HealthReportScreen.tsx`: 그래프/새 건강 기록 진입.
- `src/screens/Community/CommunityListScreen.tsx` 및 styles: 페이지 이동 버튼.
- 일반 입력·정책·알림·일정·장소·관리 화면의 기존 palette 참조는 중립색으로 한정 변경했다. 신규 전역 입력/키보드 architecture는 없다.

## 검증 결과

| 검증 | 결과 |
| --- | --- |
| TypeScript | PASS |
| 수정 source/test ESLint | 0 errors, no-shadow 경고 29개. 경고는 이번에 제거하지 않음 |
| 최종 전체 테스트 | 208 suites / 2,172 tests PASS |
| 직접 관련 회귀 | 병원/복약 입력 조건, metadata/비용, draft, edit 중복 저장/기존 체중 보존, 월별 cache invalidation, 작은 체중 증감, 마커 줄바꿈, 가이드/메뉴/CTA/keyboard 검사 포함 |
| Metro Android dev bundle | HTTP 200, 19,530,221 bytes. 네이티브 APK 빌드 결과가 아님 |
| 수정 범위 diff check | PASS |
| 저장소 전체 diff check | 기존 whitespace 2건 유지: 이전 lint.log EOF, 이전 community SQL migration EOF. 두 파일 모두 task baseline hash 동일 |
| 인증 보존 | 관련 39개 경로의 기존 상태 동일: 존재 파일 37개 hash 동일, 이전 삭제 상태 2개 유지 |
| 실기기 외관/확대 글꼴/키보드/실제 저장 | PO 확인 대기, Codex 이번 QA 미실행 |

첫 전체 실행에서 6 suites의 이전 색상·gear·배경 강도 기대값 22건이 실패했다. 승인된 새 시각 계약으로만 기대값을 바꾸고 기능/콜백/접근성/비활성 검사는 유지했다. 후속 전체 실행은 208 suites/2,169 tests PASS, 마지막 회귀 3건 추가 후 2,172 tests PASS다. 테스트 통과를 native PASS로 해석하지 않는다.

검증 파일은 `/private/tmp/nuri-ui-polish-20261009/`의 `full-suite-verified.json`, `full-suite-verified.log`, `typescript-final.log`, `lint.json`, `preservation.json`에 있다. 이 문서는 장기 보존 요약이며 tmp 증거의 영구 보존을 보장하지 않는다.

## PO 화면 확인 순서

1. **Home**: 은은한 배경, 계절 누리 로고, 기록 알림/더 알아보기 glass, 펫 identity 강조색 유지, 자주 쓰는 기록 밑줄.
2. **가이드 목록→상세**: 칩 배경/검색 배경 제거, 제목 따옴표·줄바꿈별 밑줄, 상세 이미지 제거, 검색/필터/출처/뒤로가기. 긴 제목과 확대 글꼴도 확인한다.
3. **전체메뉴→로그아웃 모달**: gear 없음, identity glass, 앱 설정 접근 유지, 계절 확인 CTA. 외관 확인만이면 취소로 복귀한다.
4. **기록하기→기록수정**: 사진/입력 정렬, 상단 수정과 하단 저장, 키보드 위 입력 visibility, 태그 모달 복귀, draft. 실제 저장 시 기존 사용자 데이터를 덮어쓰지 않는 검증 대상을 PO가 선택한다.
5. **건강관리→병원·진단/약·복약 기록→월별 지출**: 새 필드/총액, 저장과 수정 후 내용/해당 월·전체 펫 합계. 체중/인사이트 그래프와 24dp 간격, `0.01kg` 수준 표시를 확인한다.
6. **커뮤니티 및 나머지 계절 화면**: 이전/다음 터치와 disabled, 일정/타임라인 배경, 일반 영역 중립색. 네 계절 및 360/384/430dp·확대 글꼴 확인은 이번 native 완료로 주장하지 않는다.

## 남은 위험과 보존

- HQA-01 건강관리 탭 offset 공유는 기존 OPEN, 이번 변경 없음.
- HQA-02 작은 체중 증감 표시: 소수 둘째 자리 코드/컴포넌트 검사 보완 완료. native 재검증 전이므로 최종 close하지 않는다.
- 기존 계정 탈퇴 FK/불변 trigger 충돌은 별도 OPEN, 이번 수정 없음.
- 사용자 선택색과 계절색은 다른 소유권이다. 추후 정책 변경 시 중립 palette 전환과 identity 예외를 함께 검토해야 한다.
- 실제 Android blur 대비/확대 글꼴/입력 포커스는 PO 확인 필요. 기존 전체 키보드 승인을 새 입력 필드 QA로 재사용하지 않는다.
- 위험도 MEDIUM: 공유 palette와 기록 저장 payload 영향. 변경 단위는 표현 layer와 optional 의료 metadata 연결로 분리했으며 서버 migration은 없다.

## 최종 상태

SOURCE: 56 files
TESTS: 17 files
BRANCH: codex/task6-community-content-policy
HEAD: 1505c0e11ac3d2ee0339e75f43511c1ee232ddff
STAGED: NONE
BUILD: 0
INSTALL: 0
COMMIT: NO
PUSH: NO
DEVICE_OWNER: PO
METRO: ON
FREEZE: PENDING_PO_APPROVAL
STORE: HOLD

다음 단일 단계는 PO의 Metro 화면 검증이다.
