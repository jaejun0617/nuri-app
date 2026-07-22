# 홈 날씨카드 낮/밤 리디자인 QA 보고서

## 2026-07-23 온도 본체·카드 여유 공간 최종 closeout

- 온도 숫자 본체를 `38px / lineHeight 40px / weight 800`으로 복원했다. `°=13px`, `C=21px`의 상단 정렬 구조는 유지한다.
- 카드 최소 높이를 `216dp` outer / `213dp` surface로 늘리고 중앙 영역을 `100dp`로 확장했다.
- 산책 문구와 하단 체감·습도·바람·자외선 지표 사이의 상단 여백을 `10dp`로 늘려 정보가 붙어 보이지 않도록 했다.
- 최신 release APK SHA-256은 `df16452225cae4be55bccd9c780008c2fa2ea84724c31ae2e93b7e7df769cb21`이다.
- 최신 증적은 `/tmp/nuri-qa/weather-card-temperature-38px-spacing.png`, `/tmp/nuri-qa/weather-card-temperature-38px-spacing-logcat.txt`다.
- `67 suites / 269 tests`, typecheck, lint, release build/install, app-scoped fatal scan 0건을 통과했다.

## 범위

- 홈 날씨카드만 리디자인했다.
- 낮과 밤을 `weather.isDaytime`으로 분기했다.
- 위치, KST 월·일·요일, 해/달 상태, 현재 온도, 메인 카피, 행동 주의 패널, 체감온도·습도·바람·자외선 지표를 카드에 배치했다.
- 앱 전체 정보 구조, 폰트, 다른 화면 디자인, Play Store 자산, 관리자 홈페이지, DB/RPC/RLS/seed는 변경하지 않았다.

## 후속 세부 조정

- 위치·날짜/시간·하단 지표를 제외한 본문 타이포를 축소했다.
- 주의 패널 폭을 확대했다.
- 하단 지표 바는 전체 radius/border 대신 상단선과 체감·습도·바람 우측 구분선만 표시한다.
- 야간 날씨 영역의 달을 제거하고 시간 meta 행의 달 아이콘을 유지한다.
- 온도 숫자와 `°C`를 분리해 단위 크기를 낮췄다.

## 최종 표기·밀도 조정

- 상단 시간과 `오늘`을 제거하고 `월 일 (요일)`만 표시한다.
- 지역과 날짜를 `space-between`으로 양끝에 배치하고 동일한 `textPrimary` 색상·13px를 적용한다. 하단 지표 값보다 2px 크게 유지한다.
- 카드 높이와 본문 타이포를 낮추고, 온도 숫자 상단에 작은 `°`, `C`를 분리 배치한다.
- 메인 카피는 `산책하기 좋은 날씨예요` 또는 `산책하기 좋은 날씨는 아니에요`를 사용한다.

## 메타·지표·아이콘 최종 조정

- 지역·날짜 폰트를 12px로 낮추고 날짜 옆 해·달 아이콘을 제거했다.
- 온도 단위를 숫자 상단에 맞추고 메인 산책 안내를 14px, 주의 제목을 기존보다 1px 낮췄다.
- 체감·습도·바람 지표의 아이콘·라벨·값을 `#FFFFFF`로 통일했다. 자외선 지표는 기존 의미색을 유지한다.
- 날씨 이모티콘은 좌측 날씨 영역 중앙에 정렬했다.

## 상단 meta 폰트 최종 조정

- 지역명과 월·일·요일을 날씨 서브 카피와 같은 `9px / lineHeight 13px`로 적용했다.

## 온도 본체 최종 조정

- 온도 숫자 본체를 `24px / lineHeight 28px`로 낮추고 작은 `°`, `C` 단위의 상단 정렬을 유지했다.

## 구현 파일

- `src/components/weather/WeatherGuideHomeCard.tsx`
- `src/screens/Main/components/LoggedInHome/LoggedInHome.tsx`

## 디자인 판정

### 낮 variant

- 화이트/오프화이트 surface, 얇은 하늘색·라일락·핑크·노랑 외곽선, 약한 그림자를 적용했다.
- 위치 pill과 하단 지표 bar를 밝은 유리 패널로 분리했다.
- 온도와 본문은 짙은 네이비 계열, 강조 단어와 주의 패널 제목은 사용자 테마 primary 색상이다.

### 밤 variant

- 딥 네이비·인디고 surface, 낮은 opacity의 하이라이트 stroke, 보라·블루 계열 외곽 glow를 적용했다.
- 위치 pill과 주의 패널은 반투명 패널, 하단 지표 bar는 딥 네이비 패널로 구성했다.
- 온도·본문은 밝은 색상, 강조 단어와 주의 패널 제목은 사용자 테마 primary 색상이다.

### 반응형

- 부모 컨테이너의 가로 폭을 사용하고, 370dp 이하에서는 compact padding·본문 크기·주의 패널 폭을 줄인다.
- 온도·카피·패널은 고정 폭 대신 flex 비율을 사용해 일반 Android 폭에서 overflow를 방지했다.

## 데이터 및 테마 계약

- day/night variant는 `weather.isDaytime`에서 결정한다.
- 카드 강조색은 홈의 선택 펫 테마에서 파생한 `petTheme.primary`를 전달한다.
- 날씨 일러스트의 해·달·비·구름 표현은 기존 semantic weather emoji를 사용하고 테마색으로 덮지 않는다.
- 홈 서브 카피의 펫 이름은 기존 `formatWeatherPetText` 계약을 사용한다. 카드에 임의의 `누리` 또는 브랜드명이 하드코딩되지 않는다.

## Android 실기기 QA

- 기기: `SM_S937N`
- adb serial: `R5CY613NMSY`
- QA 계정: 기존 `adminQA`
- 최종 APK: `/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/android/app/build/outputs/apk/release/app-release.apk`
- version: `1.0 (1)`
- 최종 APK SHA-256: `d160914657d6cc290f30a378db5810f171617cc5e3e7be980c49fce7f391c61a`
- install/update: 통과
- cold start/Home: 통과
- 실제 시간 기준 night variant: 통과
- day variant: 실기기 시각을 변경할 권한이 없어 일시적인 QA phase override 빌드로 캡처했다. 캡처 후 `dayPhase.ts`는 실제 시간 로직으로 원복하고 최종 APK를 다시 빌드했다.
- theme accent: 기존 `adminQA` 테마 primary가 강조 카피와 주의 패널 제목에 반영되는 것을 확인했다.
- narrow layout: 카드의 compact 분기와 텍스트 overflow 방지 코드를 정적·실기기 문맥에서 확인했다.
- keyboard/navigation: 이번 변경은 입력 경로를 건드리지 않았고 기존 앱 gate를 회귀시키지 않았다.

## 증적

- 낮 카드: `/tmp/nuri-qa/weather-card-day-refinement.png`
- 최종 카드: `/tmp/nuri-qa/weather-card-temperature-24px.png`
- 최종 logcat: `/tmp/nuri-qa/weather-card-temperature-24px-logcat.txt`

## 자동 검증

- typecheck: 통과
- lint: 통과
- Jest: `67 suites / 269 tests`, 실패 0
- release build: 통과
- APK install/update: 통과
- `supabase db push --dry-run`: remote up to date
- app-scoped fatal scan: 0건

## 남은 리스크

- 기능·데이터·성능 blocker는 확인되지 않았다.
- 레퍼런스의 3D 날씨 일러스트는 별도 bitmap asset을 추가하지 않고 현재 앱의 semantic emoji 표현을 유지했다. 날씨 의미 전달과 기존 자산 계약을 보존하기 위한 범위 선택이며, 별도 일러스트 asset 도입은 이번 턴에 포함하지 않았다.
