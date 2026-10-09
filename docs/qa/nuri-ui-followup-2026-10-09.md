# NURI 계절 UI 후속 보완 및 PO 확인 후보

## PO 최종 승인 및 Release 전달

PO가 최종 승인해 [Release 빌드·설치·커밋·푸시](nuri-ui-approved-release-2026-10-09.md)를 완료했다. source `f6d284d`, 설치 APK `ccf759ca`의 승인 범위는 동결한다. 아래 PO 대기·build/install 0은 이전 단계 이력이다. 잔상 등의 시나리오별 native 증거를 추가 확보한 것은 아니며 기존 OPEN/미확인과 STORE HOLD는 유지한다.

## 후속 시작 오류 수정

- PO의 빨간 화면을 읽기 전용 캡처로 확인했다. 실제 오류는 `Tried to register two views with the same name NuriBlurCaptureExclusion`이다. 전체메뉴용 공통 wrapper 추가 시 기존 TimelineCreateButton의 별도 등록을 놓친 이번 후보의 회귀다.
- `TimelineCreateButton.tsx`가 공통 `BlurCaptureExclusion`을 import하도록 변경했다. native 등록은 공통 모듈 한 곳뿐이며 버튼 위치·터치·흰색 plus·촬영 제외 기능은 유지한다. native 파일/라이브러리 변경 없음.
- 기존 Jest preset은 native view registry를 거치지 않고 iOS를 기본으로 사용해 이 오류를 잡지 못했다. 새 `blurCaptureRegistration.test.ts`는 Android 조건과 실제 requireNativeComponent/registry로 두 import 순서를 검사한다. 수정 전 두 검사 모두 같은 오류로 실패, 수정 후 모두 PASS. 기존 버튼 회귀 검사는 공통 owner에 맞춰 갱신했다.
- 대상 4 suites/39 tests, 전체 210 suites/2,191 tests, TypeScript PASS. 이번 source/test 3개 ESLint 0 errors/0 warnings, 범위 diff check PASS.
- Metro reload 1회 후 오류로 해제된 RN surface가 복구되지 않아 빈 배경이 남았다. 로그에서 최초 fatal이 모든 surface를 종료한 것을 확인하고 앱 프로세스만 1회 재시작했다. 이후 S24의 로그인된 Home 정상 표시 및 새 프로세스의 중복 등록 오류/FATAL EXCEPTION/ReactNativeJS error 0을 확인했다. 하단 개발 경고 배너는 남아 있으며 숨기지 않았다.
- 이 확인은 **시작 오류 복구**만 소유한다. 전체메뉴 스크롤/Home 복귀 잔상, 나머지 UI의 PO 승인은 여전히 대기다. 계절을 조작하지 않았으며 관찰된 홈은 여름 preview였다.
- 새 빌드·설치·로그아웃·데이터 초기화·DB 수동 변경·commit/push 없음. Metro ON, 기기 PO 소유 유지.
- 결과: `/private/tmp/nuri-blur-registration-before.log`, `nuri-blur-registration-targeted.json`, `nuri-blur-registration-full.json`, `nuri-blur-registration-typescript.log`. 화면 관찰은 `/private/tmp/nuri-ui-redscreen-20261009.png` 및 `nuri-ui-redscreen-restarted-20261009.png`. 아래 검증 수치/기기 조작 0은 이 시작 오류 수정 이전 후보 이력이다.

## 현재 판정

요청한 UI 보완을 기존 Metro 후보에 반영했다. 로컬 검증 완료, PO 실기기 확인 대기다. 전체메뉴의 블러 촬영 경계와 화면 캐시를 보완했으나 **스크롤 잔상과 홈 복귀 잔상의 native 해결은 미확인**이다. PO는 홈으로 돌아올 때 보였다고 답했으며 정확한 출발 화면은 확인되지 않았다.

이 문서는 [직전 UI 정리·의료 기록 후보](nuri-ui-polish-medical-records-2026-10-09.md)의 후속 변경만 소유한다. 이전 건강 비용 입력·저장 QA를 이번 테스트로 완료 처리하지 않는다. 최종 PO 승인 전 빌드·설치·커밋·푸시·동결은 하지 않는다. STORE HOLD.

## 구현 범위

| 요청 | 반영 내용 | 확인 경계 |
| --- | --- | --- |
| 계절 마커 | 가이드 제목 및 자주 쓰는 기록의 마커를 effectiveSeason tint로 변경 | 글꼴별 줄 길이 측정 유지, 네 계절 컴포넌트 검사 PASS |
| 펫 이름과 조사 | 앱 소유 문구에 실제 문맥의 펫 이름 사용, 기존 조사 유틸로 누리를·똥을·누리와·똥과 처리 | 펫이 없거나 지정 ID가 없으면 반려동물, 다른 펫으로 대체하지 않음 |
| 전체메뉴 glass | 사용자/펫 영역 외 메뉴 그룹에도 기존 HomeFrostedGlass 적용, 각 행 기능과 구분 유지 | 네이티브 소재·확대 글꼴 외관은 PO 확인 |
| 전체메뉴 잔상 | 배경 밖의 앞쪽 콘텐츠를 기존 Android 촬영 제외 경계로 감싸고 드로어의 상시 texture/raster cache 제거 | 원인 후보에 대한 국소 수정이며 실제 재현·해결 판정은 보류 |
| 기록하기·수정 header | 계절색 텍스트 버튼, border/background 제거, 저장 중 중복 조작 방어 유지 | 최소 48dp 터치 영역, 저장 handler 유지 |
| 생활·미용 칩 | 균등한 3열, 작은 화면·확대 글꼴 2열, 작은 내부 여백, 중립색 선택 상태 | 단일/다중 선택과 해제 유지, 시각 패널 높이 32dp 이상·터치 높이 48dp 이상 |
| 이전·다음 | 글자 기호 대신 같은 줄 높이의 좌우 chevron, 중앙 정렬, 장식 낭독 제외 | 기존 paging·disabled·48dp 터치 유지 |
| 체중·인사이트 | theme textPrimary의 진한 3dp 선과 점, 기존 축·날짜·값·스크롤 유지 | 실제 값·집계 변경 없음 |
| 앱 종료 | 확인 버튼을 기존 계절 primary 역할로 변경 | 취소 보조 역할과 종료 handler 유지 |

펫 이름 변경은 Home, 일정, 타임라인 빈 상태, 기록 보상, 날씨 안내, 커뮤니티 입력 안내, 프로필 생성/수정, 글꼴 미리보기 등에 적용했다. 기록 수정은 기록 소유 펫, 프로필 생성은 입력 중 이름, 생성 후 전환은 해당 route의 이름을 사용한다. 사용자 작성 본문·저장 데이터·서버 콘텐츠에는 문자열 치환을 적용하지 않았다.

### 남겨둔 이미지 문구

`src/theme/seasonal/community.ts`의 커뮤니티 hero는 문구가 포함된 이미지다. 그림 안의 `우리 아이들의 이야기`와 이를 읽는 접근성 설명은 그대로다. 앱 텍스트 교체와 이미지 수정은 다르므로 이 영역까지 펫 이름 전환 완료라고 보고하지 않는다. 이번에는 승인된 그림을 덮거나 재생성하지 않았다. 이미지 로딩 실패 시 표시하는 대체 제목만 실제 펫 이름을 사용한다.

## 잔상 원인 조사와 수정 경계

- 전체메뉴는 드로어 overlay이며 실시간 블러와 `renderToHardwareTextureAndroid`/`shouldRasterizeIOS`가 함께 사용되고 있었다. 해당 캐시 지시를 제거하고 닫힘 애니메이션 완료 후 unmount는 유지했다.
- `SeasonalAmbientBackground`는 촬영 대상으로 남기고, Header·ScrollView·프로필·메뉴·toolbar를 `BlurCaptureExclusion` 안에 둔다. 이미 설치된 `NuriBlurCaptureExclusion`의 촬영 중 draw 제외 동작을 재사용한다. 일반 화면 렌더링과 터치에는 영향을 주지 않는 기존 native 계약이다.
- Android 코드·MainActivity·전역 inset·키보드 controller·navigation 구조는 수정하지 않았다. 다른 화면의 블러 정책도 변경하지 않았다.
- **확정되지 않은 부분:** 전체메뉴 스크롤에서 잔상이 사라졌는지, 불특정 화면에서 Home으로 돌아오는 중앙 잔상까지 같은 원인인지. 이번에는 기기 조작이나 촬영을 하지 않았으므로 둘 다 PO 확인 대상으로 남긴다.

## 주요 소스

- `src/app/ui/MarkerText.tsx`: native 줄바꿈 기반 계절 마커.
- `src/utils/petDisplayName.ts`, `src/hooks/usePetDisplayName.ts`: 앱 문구·조사·펫 문맥, 좁은 store 구독.
- `src/components/records/RecordChoiceGrid.tsx`: 동일 폭 compact 선택기와 접근성 상태.
- `src/components/navigation/HeaderTextActionButton.tsx`: opt-in seasonalText 표현. 기존 다른 caller 표현은 유지.
- `src/screens/Records/RecordCreateScreen.tsx`, `RecordEditScreen.tsx`: header와 선택기 연결.
- `src/components/common/BlurCaptureExclusion.tsx`, `src/screens/More/MoreDrawerContent.tsx`, `src/components/MoreDrawer/MoreDrawer.tsx`, `MoreMenuPresentation.tsx`: 전체메뉴 소재·촬영 경계·캐시.
- `src/components/health/WeightTrendChart.tsx`, `src/screens/HealthReport/HealthReportScreen.tsx`: 선 대비.
- `src/screens/Community/CommunityListScreen.tsx` 및 styles: paging 정렬.
- `src/screens/Main/MainScreen.tsx`: 종료 CTA 역할.

위험도는 MEDIUM이다. 화면 표현과 여러 앱 문구에 영향을 주지만 서버 상태·저장 payload·query·인증·키보드 구조는 변경하지 않는다.

## 검증 결과

| 항목 | 실제 결과 |
| --- | --- |
| TypeScript | PASS |
| 수정 source/test ESLint | 0 errors, 기존 no-shadow 23 warnings |
| 최종 대상 검사 | 14 suites / 279 tests PASS |
| 전체 검사 | 209 suites / 2,189 tests PASS |
| 범위 내 diff check | PASS |
| 저장소 전체 diff check | 이전 두 파일의 EOF whitespace 유지, 이번 변경 아님 |
| Metro | ON, Android bundle HTTP 200, 19,540,610 bytes |
| 연결 target | com.nuri.app, SM-S937N, Android 16 |
| native 외관·잔상·확대 글꼴·키보드·저장 | 이번 Codex 검증 미실행, PO 확인 대기 |

대상 테스트 중 이전 고정 문구·텍스트형 화살표 기대값은 실제 펫 문맥·새 아이콘 계약으로 갱신했다. 선택·callback·disabled·저장·접근성 검사는 유지했다. 신규 회귀 검사는 조사/다른 펫 오인 방지/네 계절/360·384·430dp 및 fontScale 1.0·1.3·1.5의 selector 속성/48dp target/블러 경계를 포함한다. 컴포넌트 속성 검사는 실제 native 픽셀 QA와 다르다.

기존 whitespace: `docs/qa/nuri-glass-expenses-2026-10-08-evidence/eslint.log`, `supabase/migrations/20261007074134_community_search_and_write_error_contract.sql`. 두 파일의 시작 시점 hash를 보존했다.

로컬 결과: `/private/tmp/nuri-ui-followup-20261009/targeted-final.json`, `full-suite.json`, `full-suite.log`, `typescript.log`, `lint.json`, `preservation.json`. 임시 경로는 영구 보존을 보장하지 않으며 이 문서가 검증 요약을 보존한다.

## PO 확인 순서

1. **전체메뉴**: 사용자/펫과 다른 메뉴의 glass를 확인하고 위아래 스크롤 후 Home으로 닫는다. 글자·사진 잔상 또는 중앙 잔상이 남으면 해당 경로를 기록한다.
2. **기록하기·수정**: 상단 계절색 텍스트, 생활 분류의 같은 폭, 미용 항목 선택·해제·확대 글꼴을 확인한다. 기존 draft·키보드·저장 흐름도 확인한다.
3. **Home·가이드**: 실제 펫 이름과 조사, 계절 마커를 확인한다. 다른 펫을 선택했을 때 문구가 해당 이름을 따르는지 확인한다.
4. **체중·인사이트·커뮤니티**: 진한 그래프 선과 값, 이전/다음의 세로 정렬 및 페이지 이동을 확인한다.
5. **Home 뒤로가기**: 앱 종료 모달 계절 CTA를 확인한다. 외관 확인만이면 취소한다. 다른 화면에서 Home으로 복귀할 때 잔상이 다시 보이면 출발 화면을 함께 알려준다.

새 의료 기록의 저장·수정·월별 합계 반영은 직전 후보의 별도 PO 항목이다. 이번 UI 확인이 이를 대신하지 않는다.

## 보존과 최종 상태

- 이번 delta: source 45개, test 9개. 이전 dirty·QA 데이터·산출물 보존.
- 승인된 스플래시·로그인 이미지/레이아웃, 계절 AUTO 설정을 변경하지 않았다. Auth 폴더의 유일한 변경은 `WelcomeTransitionScreen`의 펫 이름 문구다.
- native/assets/DB 파일 변경 0, remote 접근·직접 DB mutation 0, 기기 조작 0.
- HQA-01 탭 offset, HQA-02 native 정밀도 확인, 기존 탈퇴 FK/불변 trigger 충돌은 종전 상태 유지.
- BRANCH: `codex/task6-community-content-policy`
- HEAD: `1505c0e11ac3d2ee0339e75f43511c1ee232ddff`
- STAGED: NONE. BUILD: 0. INSTALL: 0. COMMIT: NO. PUSH: NO. CLEANUP: NO.
- DEVICE_OWNER: PO. METRO: ON. FREEZE: PENDING_PO_APPROVAL. STORE: HOLD.

다음 단일 단계는 PO의 Metro 화면 확인이다. 미확인 잔상을 해결 확정으로 바꾸거나 최종 승인 전에 Release 작업을 시작하지 않는다.

PO 승인을 기다립니다.
