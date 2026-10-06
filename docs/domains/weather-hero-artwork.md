# Weather Hero Artwork Contract

## 2026-10-06 최종 승인·계절 검토 버튼 제거

PO가 최신 설치 후보를 최종 승인하고 오늘의 날씨 상단 계절 버튼 제거와 selective commit/push를 지시했다. 이 절이 현재 완료 상태를 소유하며 아래 후보·승인 대기 기록은 단계별 이력이다.

- `WEATHER_SEASONAL_ARTWORK=PO_PASS_FROZEN`. 가을 일반/비 낮·밤 4장, 겨울·봄·여름 일반/비/눈 낮·밤 각 6장, 총 22장을 유지한다. 가을 실제 눈은 공통 눈 경로를 사용한다.
- 오늘의 날씨의 임시 가을·겨울·봄·여름 검토 줄과 전용 컴포넌트를 제거한다. 제목·뒤로가기·Home 계절 검토 버튼·기존 `useEffectiveSeason`과 전역 override는 유지한다. 버튼 제거가 계절/주야/실제 날씨 데이터를 바꾸지 않는다.
- Home 배경 대표색 원값, 패널 없는 좌우 18/상단 12dp 정렬, 기온 53dp, 상단 연결 취소·하단 18% 연결·다른 카드·아이콘·30분 갱신은 승인 상태로 유지한다.
- 버튼 제거 source에서 TypeScript PASS, scoped ESLint 0 errors/0 warnings, 관련 22 suites/325 tests, 전체 171 suites/1,676 tests PASS. 새 build/install·실기기 조작·remote 배포·cleanup은 하지 않는다. 기존 `60bc57d7` 설치본에는 검토 버튼이 남아 있으며 이번 source 제거가 설치됐다고 보고하지 않는다.
- runtime WebP와 자산/생성 manifest를 선별 버전 관리한다. 대용량 원본 PNG·미채택 가을 눈 초안·기존 QA·APK/AAB·보고서·build/cache는 로컬에 보존한다. 생성 manifest의 pending 표기는 생성 시점 이력이며 현재 승인은 계절별 artwork manifest의 `PO_PASS_FROZEN`이 소유한다.
- 전 장면 native·확대 글꼴·iOS 및 사진별 정량 대비 검증은 미확인이다. PO 최종 승인을 이 검증들의 실행 증적으로 바꾸지 않는다. AUTH/API 동결, PRE_STORE 운영 게이트 보존, Store HOLD. 다음은 PO 디자인 지시만 기다린다.
- 최종 Git/보존 증적: `/private/tmp/nuri-weather-approval-closeout-20261006/FINAL_REPORT.md`.

## 2026-10-06 Home 배경 대표색 원값 적용

PO가 배경 대표색 그대로 적용을 선택했다. 이 절이 히어로 글자색의 현재 계약이며 아래 이전 계절 foreground 색은 이력이다. 배치/크기는 아래 패널 제거 계약을 유지한다.

- `src/theme/home/seasonalAmbient.ts`의 `HomeAmbientVisual.primaryColor`는 기존 배경 wash와 같은 상수를 사용한다. 가을 살구 `#F7C896`, 겨울 ice `#D4EAFE`, 봄 rose `#FFDCE7`, 여름 aqua `#C9F2F8`이다. near-white canvas base나 Home foreground brand/Weather 카드 primaryText를 대신 쓰지 않는다.
- `getWeatherHeroTextPalette`가 이 값을 지역·기온·날씨 상태·최고/최저·체감 글자에 낮·밤 동일하게 제공한다. 원색을 어둡게 하거나 밤에 흰색으로 바꾸지 않는다. 지역 표시 아이콘의 기존 주야 색은 `locationIcon`으로 분리해 보존한다.
- Home 배경 렌더 값·그림 22장·주야/강수 선택·좌우 18/상단 12dp·기온 53/최근 24dp·패널 부재·하단 연결/상단 롤백·버튼·다른 상세 카드·30분/API/AUTH는 변경하지 않는다. 밝은 원색이 모든 그림에서 대비를 보장한다고 주장하지 않는다.
- 후속 PO 설치 지시로 현재 source TypeScript·lint 0 errors/0 warnings·22 suites/325 tests·전체 171 suites/1,676 tests·증분 Release/install-r 각 1회 PASS. 최신 설치 SHA `60bc57d7fd9a205bd9058cc30c5491d7189ce13d069492338fec70e52207332e`. 22장/서명/bundle/font/색상 marker·source/input·설치 hash/UID/최초 설치/기기 설정 MATCH. 설치 외 실행/터치/캡처·remote/commit/push/cleanup 없음. native 대비/미적 승인 대기다. 보고서: `/private/tmp/nuri-weather-home-palette-20261006/FINAL_REPORT.md`.

## 2026-10-06 패널 제거·상단 좌측 정렬

PO 지시로 히어로 정보 유리 패널을 제거한다. 이 절이 현재 배치/크기 계약이며 글자색은 위 Home 배경 대표색 계약을 따른다. 아래 글라스 후보는 취소된 이력이다.

- 사진 위 BlurView·tint/테두리·패널 안쪽 padding과 최대 너비 제한을 제거한다. 기존 화면 기준과 같은 좌우 18dp·상단 12dp에 지역→기온→날씨→최고/최저→체감을 직접 배치한다. 지역과 기온 묶음의 간격은 6dp다.
- 현재 기온 fontSize 56→53dp·lineHeight 60→57dp. 최근 확인 상태의 24dp 기온·명시적 상태 문구는 유지한다. 긴 지역명과 확대 글꼴은 자연 높이/줄바꿈을 사용하고 고정 높이·말줄임·최대 너비를 두지 않는다.
- `getWeatherHeroTextPalette`는 직전 계절 Weather primaryText/surfaceColors의 글자색만 유지한다. 유리 바탕·테두리·fallback을 반환하지 않는다. 아이콘·다른 상세 글라스 카드·상단 연결 취소·하단 18% 연결·22장·계절 버튼·30분/API·AUTH는 변경하지 않는다.
- 패널 없는 그림 위 대비는 PO native 확인 대상이다. 직전 패널의 4.5:1 합성 대비 결과를 현재 상태의 대비 증적으로 사용하지 않는다. 현재 source/render tests는 패널 부재·정렬/글자 크기·상태/계절색·기존 자산/하단 연결 보존을 검증한다.
- TypeScript/lint 0 errors/0 warnings·19 suites/270 tests·전체 171 suites/1,672 tests·증분 Release/install-r 각 1회 PASS. 최신 SHA `0c6f0ae0e6786ac02a692786828e5e4c208c7d7e666e666798825af09e1dc575`. 화면 조작·remote·commit/push·cleanup 없음. 보고서: `/private/tmp/nuri-weather-hero-align-20261006/FINAL_REPORT.md`.

## 2026-10-06 히어로 정보 글라스 후보 이력

직전 PO 지시는 지역·기온·날씨 상태·최고/최저·체감온도에만 작은 프로스트 읽기 영역을 추가하는 것이었다. 당시 그림 전체의 밝기나 상단 연결은 변경하지 않았다. 다음 지시에서 이 패널을 취소했고 현재 계약은 위 `패널 제거·상단 좌측 정렬`이다. 아래 함수/바탕/대비는 이전 후보 이력으로만 보존한다.

- `getWeatherHeroReadingMaterial`은 기존 `getSeasonalWeatherVisualTheme`의 primaryText와 surfaceColors를 재사용한다. 낮 밝은 tint 0.78·계절 진한 글자, 밤 계절 어두운 tint 0.74·밝은 글자, 테두리 0.28이다. 투명도 감소 fallback에도 같은 계절 바탕과 대비를 유지한다.
- 가을 브라운 `#5A3023`, 겨울 블루 `#183653`, 봄 로즈 `#543B48`, 여름 그린 `#244D3F`. 밤 글자는 각각 `#FFF9F0`, `#F7FBFF`, `#FFF8FA`, `#F8FFF6`이다. 실제 기상/주야를 조작하지 않으며 가을 눈 공통 이미지에서도 정보 색은 가을 계약을 사용한다.
- 기존 설치된 BlurView를 사용한다. blur 12/2회, 곡률 22dp·정보 영역의 자연 높이·기본 최대 너비 248dp, 확대 글꼴은 가용 너비 전체로 확장한다. 모든 정보의 말줄임은 없고 별도 그림자·반사 장식도 없다. 공용 Home/Weather 글라스 구현과 아이콘/문구/수치/크기는 변경하지 않는다.
- 계절/낮밤 8개 조합의 흑백 배경 합성 및 fallback 대비 4.5:1 이상을 source test로 확인한다. 이는 native 캡처·전체 접근성 감사·전 장면 미적 승인을 대신하지 않는다.
- 이미지 22장/원본·하단 18% 연결·상단 연결 취소·검토 버튼·30분/API·AUTH를 유지한다. 증분 Release/install-r 각 1회 PASS, 최신 SHA `6ac73be210d0f9c2b4d08a7870898c8b4179637583b463536edce3dcfac7dc6a`. 설치 외 기기 조작/remote 배포·commit/push/cleanup 없음. 실제 가독성 승인은 PO 대기다. 증적: `/private/tmp/nuri-weather-hero-glass-20261006/FINAL_REPORT.md`.

## 2026-10-06 상단 연결 취소

PO가 상단을 이미지와 이어지게 하라는 지시만 취소했다. 헤더/상태 표시줄의 하늘색 surface, 이미지 위쪽 fade와 이를 위한 간격 보정을 제거한다. 헤더는 기존 화면 배경을 사용하고 이미지 위에 정상 12dp 간격을 둔다. 제목과 계절 검토 버튼은 유지한다. 이미지 22장·원본·글자 크기/주야 대비·하단 18% 연결·30분 데이터 계약은 변경하지 않는다.

첫 단계는 source 롤백과 로컬 검증만 수행했다. 이후 PO의 별도 설치 지시로 증분 Release build/install-r 각 1회 PASS, 최신 `f79127e7` 후보에 상단 연결 제거를 반영했다. 자산 22개와 하단/계절 버튼 수록, 상단 blend 부재·서명·bundle·font·설치 hash/UID/기기 설정을 확인했다. 설치 후 화면 조작/캡처·remote 배포·commit/push·cleanup 없음. source-only 결과와 설치 결과는 각각 `/private/tmp/nuri-weather-top-rollback-20261006/FINAL_REPORT.md`, 같은 폴더의 `INSTALL_REPORT.md`로 분리한다. 실제 상단/가독성 승인은 PO 확인 대기다.

## 2026-10-06 전 계절 적용 후보

PO가 나머지 세 계절 적용과 상세 상단 계절 검토 버튼, 이미지 상하 연결을 지시했다. 아래 가을 초기 기록은 이력이며 현재 자산은 가을 4장 + 겨울·봄·여름 각 6장 = 22장이다. 새 이미지 원본은 `output/imagegen/nuri-weather-seasons-20261006`에 보존하고 계절별 `src/assets/weather/{season}/artwork-manifest.json`에서 원본·무손실 배포 hash를 추적한다.

- 겨울은 눈밭·온실, 봄은 벚꽃 정원, 여름은 바다·카바나의 독립 장면이다. 세 계절 모두 일반/비/눈의 낮·밤 자산을 소유한다. 가을 눈은 등록하지 않고 실제 눈 데이터가 오면 공통 눈 이미지로 돌아간다.
- AQ 전용 이미지는 추가하지 않는다. 실제 날씨 시나리오·주야는 기존 bundle을 사용한다. 여름 눈 그림도 실제 `snow` 수신 때만 선택하며 계절 검토 버튼으로 강수나 주야를 위조하지 않는다.
- `WeatherSeasonReviewControls`의 가을/겨울/봄/여름 순서는 기존 `SeasonPreferenceProvider.setOverride`에 연결한다. Home과 같은 기기 로컬 설정이며 계정·DB에 저장하지 않는다. 임시 검토 UI 제거는 최종 승인 뒤 별도 지시를 따른다.
- 제목·계절 검토 줄과 status-bar 영역은 기존 화면 배경을 사용한다. 상단 하늘색 surface/fade는 PO가 취소했다. 하단 18%는 투명→불투명 continuation 색으로 이어지고 정보 패널과 끝점도 같은 색이다. 픽셀 편집·crop·resize 없이 원본 구도를 유지한다.
- 원본 정사각형의 최소 높이는 safe-area 좌우를 뺀 화면 폭이다. 헤더/버튼은 이미지 안에 억지로 쌓지 않아 동물 얼굴을 가리지 않는다. 정보 텍스트는 확대 글꼴에서 자연 높이를 사용한다.
- 히어로 정보의 현재 색/배치는 위 `패널 제거·상단 좌측 정렬` 계약을 따른다. 이미지 아래 상세 패널의 기존 색, 아이콘·상세 수치·위험 안내·Home Weather 재질은 유지한다. 실제 native 대비는 최신 설치본의 PO 확인 대상이다.
- 동시 PO 지시의 30분 최신 유효시간/자동 확인 계약은 `docs/domains/weather-api-v1.md`가 소유한다. 이 이미지 계약이 데이터 갱신을 소유하지 않는다.
- 검증/증분 Release/설치 증적: `/private/tmp/nuri-weather-seasons-20261006`. 모든 날씨·주야의 물리 분기 matrix, 확대 글꼴 native와 iOS는 별도 미확인이다. source 테스트와 실제 시각 승인을 구분한다. commit/push/cleanup/Store 없음.

## 2026-10-06 가을 v1

PO가 생성 시안의 적용을 지시하고, 가을 전용 눈 이미지를 제외했다. 이번 계약은 오늘의 날씨 상세 히어로의 자산과 표현만 소유한다. API v1, AUTH, 실제 수치, 위험 안내, 갱신, KST, 캐시, Home Weather 카드와 날씨 아이콘은 변경하지 않는다. 설치 후보의 최종 시각 승인은 별도다.

## Source Of Truth

- 가을 분기·글자색·하단 연결색: `src/theme/seasonal/weatherHero.ts`.
- 화면 적용: `src/screens/Weather/WeatherInsightScreen.tsx`.
- 원본·생성 조건: `output/imagegen/nuri-weather-autumn-20261006/generation-manifest.json`.
- 앱 자산·원본/배포 hash: `src/assets/weather/autumn/artwork-manifest.json`.
- 검증·설치 증적: `/private/tmp/nuri-weather-autumn-hero-20261006`.

## Branches

| 유효 계절 | 날씨 시나리오 | 주야 | 자산 |
| --- | --- | --- | --- |
| autumn | fresh | 낮 | normal-day-v1.webp |
| autumn | fresh | 밤 | normal-night-v1.webp |
| autumn | rain | 낮 | rain-day-v1.webp |
| autumn | rain | 밤 | rain-night-v1.webp |

- 유효 계절은 기존 `useEffectiveSeason`을 사용한다. 자동 기준은 KST 9~11월이며 기기 로컬 계절 검토 override가 우선한다. 새 계절 resolver나 별도 persistent 상태는 만들지 않는다.
- 주야와 강수 시나리오는 기존 검증된 Weather bundle을 사용한다. 그림을 선택하기 위해 실제 날씨·기온·확률을 덮어쓰지 않는다.
- 가을 전용 눈 자산은 등록하지 않는다. 생성된 눈 초안은 보존한다. 실제 `snow`가 수신되면 기존 공통 눈 처리로 돌아가며 눈 데이터를 일반 날씨나 비로 바꾸지 않는다.
- 별도 미세먼지 장면은 추가하지 않는다. legacy `dusty`는 가을 일반 낮/밤 자산을 사용하며 대기질 수치와 주의 안내는 그대로 표시한다.
- 봄·여름·겨울은 승인된 공통 원본 이미지와 기존 주야/강수 분기를 유지한다. 다른 계절의 새 자산은 PO의 별도 생성·적용 지시가 필요하다.
- unavailable은 이미지를 표시하지 않는다. 최근 정보는 현재 정보처럼 숨기지 않고 기존 안내를 유지한다.

## Rendering

- 원본 1,254px 정사각형을 무손실 WebP로 인코딩했다. 크기·구도·RGB 픽셀은 변경하지 않았다. 모든 원본 PNG는 보존한다.
- 가을 히어로의 최소 높이는 safe-area 좌우를 뺀 화면 폭이다. 작은 기기에서 고정 372dp 높이 때문에 발생하는 정사각형 가로 crop을 피한다. 글꼴 확대·긴 지역명은 자연 줄바꿈을 허용하며 고정 높이·말줄임으로 정보를 숨기지 않는다.
- 하단 20%만 fade한다. 끝점은 불투명한 continuation 색이며 히어로 아래 화면 배경도 같은 색으로 고정해 경계선을 만들지 않는다. 인위적인 흰색 띠를 이미지 파일에 합성하지 않는다.
- 가을 낮은 진한 청회색 글자, 밤은 흰색 글자를 사용한다. 그림을 매 프레임 분석하지 않고 검증 가능한 자산별 명시적 팔레트를 사용한다. 화살표의 색도 화면 팔레트를 따른다.
- 히어로 지역명 16→14dp, 일반 기온 76→56dp. 최근 확인 기온은 24dp로 표시해 긴 상태 문구가 그림을 가리지 않게 한다. 원래 상태 문구와 접근성 글꼴 확대는 유지한다.
- 기존 그림 위 광범위한 글자 그림자 12~16dp를 3dp로 줄인다. 패널·날씨 아이콘·내용 섹션 구조와 다른 Home 디자인은 그대로 둔다.

## Verification Boundary

- 분기·계절/주야·글자색·크기·다른 계절·미수신/최근·하단 끝점은 source/render tests로 확인한다.
- 무손실 픽셀 일치와 네 자산의 APK 수록을 별도 확인한다.
- 승인된 증분 Release 빌드·install-r는 각각 1회만 수행한다. 기기 설정·계정·데이터 변경과 강제 위험 날씨 주입은 하지 않는다.
- 실제 그림 crop, 확대 글꼴 배치, 색감의 최종 판단은 PO 기기 확인 대상이다. source 테스트를 물리 화면 검증으로 표현하지 않는다.
- 커밋·푸시·cleanup·Store는 이번 지시 범위에 없다. 기존 산출물/캐시·QA·계절 검토 버튼을 보존한다.
