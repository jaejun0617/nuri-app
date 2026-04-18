# 우리동네 동물병원 회귀 검증

날짜: 2026-04-18
기기: `R5CY613NMSY`
앱 패키지: `com.nuri.app`

## local 검증

- `yarn test --watchman=false __tests__/animalHospitalOfficialSource.test.ts __tests__/animalHospitalService.test.ts __tests__/animalHospitalMatching.test.ts __tests__/animalHospitalRepository.test.ts __tests__/animalHospitalProjection.test.ts __tests__/animalHospitalPresentation.test.ts __tests__/locationDiscoveryThumbnail.test.ts`
- 결과: 7 suites passed, 16 tests passed

- `yarn eslint src/domains/animalHospital src/services/animalHospital src/services/locationDiscovery/thumbnail.ts src/hooks/useAnimalHospitalThumbnail.ts src/components/animalHospital src/screens/AnimalHospital __tests__/animalHospitalOfficialSource.test.ts __tests__/animalHospitalService.test.ts __tests__/animalHospitalMatching.test.ts __tests__/animalHospitalRepository.test.ts __tests__/animalHospitalProjection.test.ts __tests__/animalHospitalPresentation.test.ts __tests__/locationDiscoveryThumbnail.test.ts scripts/ingest-animal-hospitals.js`
- 결과: pass

- `yarn tsc --noEmit`
- 결과: fail
- 원인: 이번 범위 밖 기존 오류 2건
- `src/screens/Main/components/LoggedInHome/LoggedInHome.tsx(191,35)` string -> Date 타입 오류
- `src/services/records/date.ts(62,35)` string -> Date 타입 오류

## Android 실기기 검증

- `adb devices`
- 결과: `R5CY613NMSY device`

- `yarn android --deviceId R5CY613NMSY`
- 결과: debug build/install/app start success
- build: `BUILD SUCCESSFUL in 1m 50s`
- install: `Success`
- start: `com.nuri.app/com.nuri.MainActivity`

- `adb shell pidof com.nuri.app`
- 결과: 앱 프로세스 확인

- `adb logcat -d -t 800 | rg -i "FATAL EXCEPTION|AndroidRuntime|ReactNativeJS|com.nuri.app"`
- 결과: NURI 앱 기준 `FATAL EXCEPTION`, `ReactNativeJS` 치명 오류 없음

## 미확인

- `uiautomator`가 앱 화면 대신 keyguard `Bouncer`를 보고 있어 실제 탭 기반 동물병원 리스트/상세 smoke는 이번 회귀 단계에서 미확인이다.
- `mFocusedApp`은 `com.nuri.app/com.nuri.MainActivity`로 올라왔지만 `mCurrentFocus=Window{... Bouncer}` 상태였다.

## 판단

- animalHospital 코드 경로의 unit/integration regression은 통과했다.
- Android debug build/install/start와 프로세스 생존은 확인했다.
- 실제 화면 조작 QA는 기기 잠금 해제 후 별도 smoke로 이어가야 한다.
