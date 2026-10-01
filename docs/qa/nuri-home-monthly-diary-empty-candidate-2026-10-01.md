# NURI Monthly Diary Empty-State Candidate

> 최종 PO 승인과 버튼 없는 종료 결과는 `nuri-home-monthly-diary-final-approval-2026-10-01.md`를 따른다. 이 문서의 최초 후보와 높이 결함은 역사적 기록으로 보존한다.

> 이 문서는 최초 후보의 이력이다. PO의 높이 지적 후 직접 native 측정에서 이미지 원본 높이가 layout에 영향을 주는 결함을 확인했다. 현재 검토 기준은 `nuri-home-monthly-diary-corrective-2026-10-01.md`이며 아래 최초 geometry·검증 결과를 최신 수정본의 결과로 해석하지 않는다.

## 1. Scope and Approval Boundary

- PO가 이번 달 일기의 빈 상태 분석 방향을 채택하고 네 계절 투명 이미지 생성, 구현, 상단 계절 전환 버튼을 명시적으로 요청했다. 이어 Galaxy S24 검토용 빌드·설치 각 1회를 승인했다.
- 이번 범위는 일기 빈 상태와 임시 검토 장치다. 기존 기록이 있는 일기 목록, 월·카테고리 필터, 기록 상세, 전체 보기와 일반 기록 작성 목적지는 유지한다.
- 승인된 네 계절 Home 배경, Hero, 공통 유리 50%/60%, 다른 섹션, 글꼴 선택 정책, Bottom Navigation과 원격 데이터 계약은 변경하지 않는다.
- 위험도는 Medium이다. 신규 bitmap과 일기 빈 상태 높이가 추가되지만 서버·native dependency·전역 테마·기기 날짜를 변경하지 않는다. 최종 시각 승인은 아직 없다.

## 2. Implementation

- `MonthlyDiaryEmptyState.tsx`: 중앙 일기 이미지, 빈 상태 제목, 설명 두 줄과 기존 기록 버튼. 제목 앞 중복 아이콘, 상단 중복 설명, 별도 backing panel과 강한 glow는 추가하지 않았다.
- 이미지 영역은 `width: 88%`, `maxWidth: 240dp`, `aspectRatio: 1`, `contain`이다. 이미지 4장 모두 동일한 영역에서 바뀌며, 장식은 touch와 접근성 탐색을 막지 않는다. 실제 문구와 CTA는 bitmap에 포함되지 않는다.
- `HomeDiarySeasonReviewControls.tsx`: 가을·겨울·봄·여름 segmented controls. Screen의 safe area 아래에서 ScrollView 밖에 배치해 하단 검토 중에도 접근 가능하다. 선택 상태는 Home의 메모리에만 있고 영구 저장하지 않는다.
- 선택값은 기존 배경의 season과 일기 이미지의 season에만 연결한다. Home 공통 foreground는 승인 Autumn 기준을 계속 사용한다. 첫 진입은 기존 KST 자동 계절 판정이며 수동 선택은 검토용이다.
- 임시 toolbar가 화면 상단 높이를 사용하므로 검토 중 visible viewport는 줄어든다. 기존 Hero·날씨·다른 섹션의 내부 geometry를 다시 설계한 것은 아니다. 승인 전 toolbar를 제거하지 않는다.
- 비어 있는 목록이 `ready`가 아닌 경우 loading 또는 error 안내로 구분한다. 조회 실패를 일기 없음으로 표시하지 않는다. 기존 Home 기록 캐시와 필터를 사용하며 월 전체를 조회하는 새 서버 요청은 추가하지 않았다.
- CTA의 라벨은 `기록하기`이며 기존 일반 RecordCreate 흐름이다. 일기 카테고리가 사전 선택된 새 navigation 계약으로 바꾸지 않았다.

## 3. Generated Assets

- 도구: built-in `image_gen`, 투명 RGBA PNG. 원본은 Codex generated_images에 남기고 프로젝트에 별도 복사했다.
- 위치: `src/assets/seasonal/home/diary/`. 4장 모두 1254×1254, 합계 4,324,589 bytes, 약 4.12MiB다.
- alpha 검사: 네 모서리 alpha 0, 완전 투명 픽셀 약 57.5~58.3%. 배경 rectangle이 없으며 일기와 소량의 주변 장식만 포함한다.
- 가을: cream/apricot 일기와 단풍. 겨울: ice-blue 일기와 눈 결정. 봄: rose-pink 일기와 꽃잎, emerald/mint 없음. 여름: aqua 일기와 물방울·작은 잎.
- 최종 prompt set과 자산 경로: `src/assets/seasonal/home/diary/generation-manifest.json`.

| Asset | SHA-256 |
|---|---|
| autumn-empty-v1.png | 78e02a20be677d2a2aa8025d30200d92d0226808235cbccb232f296d167a72b5 |
| winter-empty-v1.png | 1160e2992c3e4ff5b5290e4c3fed2d92cc9308a32874fffded07339f250f9e7b |
| spring-empty-v1.png | e14792cca9d8fdc91bae5069500a92a39414d49e09e4fd083ed1ed149af8de6d |
| summer-empty-v1.png | abcb3d55a892431cd8ccac9d56779670ae9ff85665bb743767e656392d790b72 |

## 4. Local Validation

- Node 24.20.0, Yarn 3.6.4, toolchain guard PASS.
- TypeScript PASS. Targeted ESLint errors 0, new warnings 0; `LoggedInHome.tsx`의 기존 no-shadow warnings 20개 유지.
- 관련 11개 스위트, 148개 테스트 PASS. 일기 4개 자산·alpha 형식·loading/error·기록 CTA·선택 state, 기존 배경·유리·헤더·간격·캐시·자동 계절·날씨 계약을 검사했다. full test는 실행하지 않았다.
- 360/400/430dp에서 image width clamp가 패널 내부에 들어오는 산술 계약을 검사했다. 실제 기기 글꼴 확대·pixel clipping 검증을 수행한 것으로 해석하지 않는다.
- `git diff --check` PASS. 승인 background/mesh/glass/header/Home styles/calendar source는 HEAD 대비 동일하다.

## 5. Release and Installation

- ANDROID_RELEASE: PASS (최초 후보 1회)
- ADB_INSTALL_R: PASS (최초 후보 1회)
- 최초 APK SHA-256: `636d6ccb943fabb438a17b07f74671d33966ae6cf7ffbe0e9d531de71afd5729`. 보존 위치: `/tmp/nuri-monthly-diary-empty-20261001/nuri-monthly-diary-review-636d6ccb.apk`.
- 이번 후보는 QA release이며 Metro 서버와 Fast Refresh를 사용하지 않는다. 기존 승인 signer와 비교하는 static verifier를 사용한다.
- 최초 설치 당시 기기: Galaxy S24, `SM_S937N`, `R5CY613NMSY`. 당시에는 설치 외 실행·터치·스크롤·캡처를 하지 않았다.
- 이후 PO가 직접 검증을 명시적으로 요청했다. 최초 후보의 native 높이 결함을 `/tmp/nuri-monthly-diary-empty-20261001/before-height-corrective.png`와 XML로 확인했다. 최초 후보는 높이 검증 FAIL이며 수정본으로 대체한다. 최신 runtime 결과는 후속 보고서에서 별도 기록한다.

## 6. Evidence and Git

- 검증 root: `/tmp/nuri-monthly-diary-empty-20261001`.
- 검증 파일: `types.log`, `eslint.json`, `tests.log`, `build.log`, `source-fingerprint.json`.
- HEAD: `7e5a3cfeb1cf9fda229b775ffa128e47b75b0c68`.
- Branch: `codex/task6-community-content-policy`.
- 기존 project-memory dirty, 연구 문서, Supabase temp, 미사용 계절 이미지와 output을 보존한다. staging·commit·push 없음. 추가 disk cleanup과 다음 섹션 작업은 하지 않는다.

## 7. PO Direct Review

1. 네 계절에서 일기장·스프링·겹친 페이지가 유리패널 위에 자연스럽게 놓여 보이는가.
2. 가을·겨울·봄·여름의 개성이 다르면서 같은 일기장 계열로 느껴지는가.
3. 이미지가 과하게 크거나 잘리지 않고 제목·설명·버튼의 위계가 분명한가.
4. 상단 버튼을 눌러 하단 일기와 배경을 함께 비교해도 스크롤 위치와 기존 UI가 유지되는가.
5. `전체 보기`와 `기록하기`가 기존 목적지로 이동하는가.
6. 긴 반려동물 이름과 선택 글꼴·확대 글꼴에서 제목과 버튼이 겹치지 않는가.

## 8. Final State

- INITIAL_IMPLEMENTATION: SUPERSEDED
- INITIAL_LOCAL_VALIDATION: PASS
- INITIAL_NATIVE_HEIGHT: FAIL
- PO_VISUAL_APPROVAL: PENDING
- REVIEW_CONTROLS: RETAINED
- STAGING / COMMIT / PUSH: NONE
- AUTO_START_NEXT_WORK: NO

PO 승인을 기다립니다.
