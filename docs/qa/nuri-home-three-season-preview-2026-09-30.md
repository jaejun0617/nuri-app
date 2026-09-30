# NURI Three-Season Home Preview: Visual Match Failure

## Superseding Corrective

PO가 시안 재검토와 구현을 명시적으로 지시해 새 corrective를 적용·설치했다. 현재 결과와 검증 경계는 `docs/qa/nuri-home-three-season-reference-corrective-2026-09-30.md`를 따른다. 아래는 이전 tint 후보의 FAIL 이력이며 현재 설치본이 아니다.

## Current Decision

- PO가 설치 화면의 구체와 배경 색감이 생성 시안과 전혀 다르다고 지적했다. 시안 3장과 실기기 화면을 다시 대조한 결과, 현재 후보의 시각 일치는 FAIL이다.
- 계절 전환 버튼 구현과 객관 검증을 시각 디자인 승인으로 취급하지 않는다. 전체 Home 실기기 검증을 진행하던 중 PO 지적을 받아 승인용 검증을 중단했다.
- 현재 source와 설치 후보는 미승인 상태다. staging, commit, push는 하지 않았다. 가을 승인 커밋과 기존 dirty는 보존했다.

## Source of Truth

- 승인된 가을 디자인: `b63fb1c771d3cf1bcd56ebd4f21195f288b9a14d`.
- 현재 HEAD: `a94279bc727aab7600c1257c5e4bbd9320c3f1cf`.
- 브랜치: `codex/task6-community-content-policy`.
- 색감 기준은 `output/design/nuri-home-three-seasons-20260930/01-winter-home-concept.png`, `02-spring-home-concept.png`, `03-summer-home-concept.png`다.
- 시안의 생성 과정에서 달라진 UI geometry와 문구는 복사하지 않는다. 기존 승인 UI와 사용자 데이터는 별도 기준으로 보존한다.

## Confirmed Mismatches

1. 구체: 가을 pearl texture를 그대로 유지한 채 16~18% 단색 반사층을 합성했다. 겨울 시안의 차가운 pearl/lilac, 여름 시안의 aqua/mint 반사 재질이 구현되지 않았고 peach/gold가 남았다.
2. 배경: near-white base와 기존 가을 field geometry를 재사용해 계절색이 시안보다 옅다. 봄의 pink/peach/mint 교차와 여름의 mint/aqua/ivory 분포가 충분하지 않다.
3. 전경: 기존 계절별 header/weather 토큰이 선택값에 따라 적용됐다. 생성 시안의 가을 로고·날씨 전경색 보존과 다르다. 관련 JSX를 변경하지 않았다는 사실이 전경 색상 보존을 의미하지 않는다.
4. 검증 경계: 공통 구조·타입·테스트 통과만으로 target color match를 입증할 수 없다. 다음 후보는 시안과 실제 합성 화면을 직접 비교해야 한다.

## Implemented Preview Controls

- 상단 `가을`, `겨울`, `봄`, `여름` 임시 선택 버튼을 추가했다. ScrollView 밖의 overlay로 기존 content height를 바꾸지 않는다.
- Home 전용 context로 background, bubble reflection과 Weather를 포함한 바깥 유리의 선택 계절을 연결했다. 전역 날짜·저장 설정은 변경하지 않는다.
- 실기기에서 네 버튼의 표시, 선택 상태, Hero 전환과 스크롤 중 Weather 위치에서 계절 전환을 확인했다. 기존 UI 위치를 움직이지 않고 같은 위치에서 색상이 바뀐다.
- 최종 PO 승인 전에는 버튼을 유지한다. 승인 후 버튼과 임시 override를 제거하고 자동 계절 선택으로 재검증한 뒤 선별 커밋·푸시하는 것이 사용자의 종료 계약이다.

## Objective Validation

- Node 24.20.0, Yarn 3.6.4.
- TypeScript PASS.
- 대상 ESLint 오류 0개, 새 경고 0개. 기존 LoggedInHome no-shadow 경고 20개 유지.
- 관련 16개 스위트, 175개 테스트 PASS. full suite는 실행하지 않았다.
- `git diff --check` PASS.
- 가을 ambient descriptor, Home styles, Widget material, Frequent Records, Guide card, Weather card 및 계절별 기존 palette source는 HEAD와 byte 동일하다. 기존 Home의 하위 컴포넌트 정의도 동일하다.
- 다른 계절에서 Image의 intrinsic asset 크기가 absolute-fill 안에 남아 구체가 확대되는 실제 렌더링 결함을 발견했다. 자식 texture의 width/height를 100%로 명시하고 회귀 검사를 보완했다. 최신 설치에서 정상 구체 크기를 확인했다.
- 빌드·설치 총 3회: 자동 계절 후보 1회, 추가 PO 전환 버튼 후보 1회, 실제 렌더링 결함 수정 1회다. 각 APK와 로그는 보존했다. 미적 튜닝 반복 빌드는 하지 않았다.
- 최신 build 2026-09-30 18:20:48 KST, 서명 검증 ACCEPTED, release bundle 내장, Metro OFF, Fast Refresh OFF.
- 최신 APK SHA-256: `fce4aac73adae553e56539559a7961cde42d74987d719b3b37a2a09e561eff83`.
- APK: `/tmp/nuri-home-three-seasons-20260930/nuri-a94279b-four-season-preview-fixed-fce4aac7.apk`.
- Galaxy S24 `SM_S937N`, `R5CY613NMSY`: 최신 설치 성공, cold Home 진입, 네 계절 Hero와 Winter/Spring/Summer Weather 표시 확인. 18:22:02 KST 이후 수집 로그에서 FATAL EXCEPTION, 앱 ANR, RN Fatal 0건이며 관찰 화면에 Red Screen 없음.
- 최신 후보의 Summary부터 Diary까지 전체 실기기 검증은 중단되어 미완료다. 초기 자동 가을 후보의 전체 Home 회귀 확인과 최신 세 계절 후보의 검증을 혼동하지 않는다. 360dp·430dp는 자동 descriptor 검사이며 해당 폭의 물리 QA는 미확인이다.
- Supabase, 서버 계약, 배포와 원격 운영 변경 없음.

## Evidence

최신 이미지와 같은 이름 XML은 `/tmp/nuri-home-three-seasons-20260930/`에 있다.

- `preview-01-autumn-hero.png`
- `preview-02-winter-hero.png`
- `preview-03-spring-hero.png`
- `preview-04-summer-hero.png`
- `preview-05-winter-weather.png`
- `preview-06-spring-weather.png`
- `preview-07-summer-weather.png`
- `preview-fixed-build.log`, `preview-fixed-install.log`, `preview-fixed-runtime.log`, `preview-tests.log`, `preview-eslint.json`.
- `diagnostic-oversized-winter.png`은 이전 렌더링 결함 증적이며 최신 후보가 아니다.

## Recommended Next Action

시안의 계절별 구체 반사 재질과 배경 색 분포를 다시 설계하고, 승인 가을·기존 UI geometry·유리 alpha·임시 계절 전환 버튼은 보존한다. 시안 외 전경 색상 변경도 함께 분리 검토한다. 추가 corrective의 적용·빌드·설치는 PO 후속 지시를 기다린다. 현재 후보를 승인 완료로 보고하거나 커밋·푸시하지 않는다.
