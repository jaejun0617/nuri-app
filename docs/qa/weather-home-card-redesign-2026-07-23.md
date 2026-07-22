# 홈 날씨카드 낮/밤 리디자인 QA 보고서

## 범위

- 홈 날씨카드만 리디자인했다.
- 낮과 밤을 `weather.isDaytime`으로 분기했다.
- 위치, KST 날짜/시간, 해/달 상태, 현재 온도, 메인 카피, 행동 주의 패널, 체감온도·습도·바람·자외선 지표를 카드에 배치했다.
- 앱 전체 정보 구조, 폰트, 다른 화면 디자인, Play Store 자산, 관리자 홈페이지, DB/RPC/RLS/seed는 변경하지 않았다.

## 후속 세부 조정

- 위치·날짜/시간·하단 지표를 제외한 본문 타이포를 축소했다.
- 주의 패널 폭을 확대했다.
- 하단 지표 바는 전체 radius/border 대신 상단선과 체감·습도·바람 우측 구분선만 표시한다.
- 야간 날씨 영역의 달을 제거하고 시간 meta 행의 달 아이콘을 유지한다.
- 온도 숫자와 `°C`를 분리해 단위 크기를 낮췄다.

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
- 최종 APK SHA-256: `5c9d8b1cd0735409151286a089bcf88437fb8abd1f9a85dc828022e2d61cd52`
- install/update: 통과
- cold start/Home: 통과
- 실제 시간 기준 night variant: 통과
- day variant: 실기기 시각을 변경할 권한이 없어 일시적인 QA phase override 빌드로 캡처했다. 캡처 후 `dayPhase.ts`는 실제 시간 로직으로 원복하고 최종 APK를 다시 빌드했다.
- theme accent: 기존 `adminQA` 테마 primary가 강조 카피와 주의 패널 제목에 반영되는 것을 확인했다.
- narrow layout: 카드의 compact 분기와 텍스트 overflow 방지 코드를 정적·실기기 문맥에서 확인했다.
- keyboard/navigation: 이번 변경은 입력 경로를 건드리지 않았고 기존 앱 gate를 회귀시키지 않았다.

## 증적

- 낮 카드: `/tmp/nuri-qa/weather-card-day-refinement.png`
- 최종 밤 카드: `/tmp/nuri-qa/weather-card-night-refinement-final.png`
- 최종 logcat: `/tmp/nuri-qa/weather-card-refinement-final-logcat.txt`

## 자동 검증

- typecheck: 통과
- lint: 통과
- Jest: `67 suites / 268 tests`, 실패 0
- release build: 통과
- APK install/update: 통과
- `supabase db push --dry-run`: remote up to date
- app-scoped fatal scan: 0건

## 남은 리스크

- 기능·데이터·성능 blocker는 확인되지 않았다.
- 레퍼런스의 3D 날씨 일러스트는 별도 bitmap asset을 추가하지 않고 현재 앱의 semantic emoji 표현을 유지했다. 날씨 의미 전달과 기존 자산 계약을 보존하기 위한 범위 선택이며, 별도 일러스트 asset 도입은 이번 턴에 포함하지 않았다.
