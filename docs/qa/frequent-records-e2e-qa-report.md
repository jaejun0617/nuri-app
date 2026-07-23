# 자주 쓰는 기록 UI·실제 저장 E2E QA 보고

## 범위

- 작업일: 2026-07-23
- 앱 repo 기준 변경: 자주 쓰는 기록 홈 섹션과 기록 작성 후 홈 갱신 계약
- QA 계정: `adminQA`
- Android: `SM_S937N / R5CY613NMSY`
- DB/RPC/RLS/migration: 변경 없음

## 구현 증적

- 홈 섹션: `FrequentRecordsSection`
- 순수 view model/formatter: `src/services/home/frequentRecords.ts`
- 설명 문구: `우리 아이의 일상을 빠르게 기록해보세요`
- 설명 문구 크기: React Native `fontSize: 9`, `allowFontScaling={false}`
- 데이터 source: 선택된 펫의 `MemoryRecord` 목록
- 상대시간 갱신: 홈 focus 복귀·기록 저장 후 `recordStore.refresh`; 홈 focus 및 앱 active 상태에서 60초 interval로 재계산
- 레이아웃: 모든 화면 1:1:1:1 동일 폭 4열
- 카드 시각: 카테고리 카드 배경 투명, 강한 그림자 제거, 시간 pill만 테마 틴트 유지
- 폰트: 제목 18/600, 설명 9/400, 전체 보기 12/500, 카테고리 13/600, 상대시간 9/500, 요약 10/500, 상태 13/500
- 상태: 로딩·오류·기록 없음 상태에서 가짜 시간/가짜 요약 미표시

## 실제 기록 E2E

| 카테고리 | 실제 입력 기록 | 저장 직후 홈 반영 | 재실행 유지 | 최종 상태 |
| --- | --- | --- | --- | --- |
| 산책 | `QA_walk_32min_20260723` | 확인 | 확인 | QA 계정에 유지 |
| 식사 | `QA_meal_food_180g_20260723` | 확인 | 확인 | QA 계정에 유지 |
| 건강 | `QA_health_condition_good_20260723` | 확인 | 확인 | QA 계정에 유지 |
| 미용 | `QA_grooming_bath_20260723` | 확인 | 확인 | QA 계정에 유지 |

확인한 내용:

- 카드 탭에서 각 실제 기록 작성 화면으로 진입했다.
- 저장 완료 후 보상 모달을 닫고 홈으로 복귀했다.
- 카드별 상대시간이 `방금 전` 또는 경과 시간으로 갱신됐다.
- UIAutomator accessibility label에 카테고리·상대시간·요약이 포함됐다.
- 앱을 강제 종료하고 재실행한 뒤 동일한 네 카드 기록이 다시 조회됐다.
- 새 QA 기록은 삭제·rollback하지 않았다.

## UX evidence

- `/tmp/nuri-qa/frequent-records-section.png`
- `/tmp/nuri-qa/frequent-records-four-qa.png`
- `/tmp/nuri-qa/frequent-records-after-restart.png`
- `/tmp/nuri-qa/frequent-records-after-restart-section.png`
- 키보드: 기록 제목 입력 시 keyboard bar 표시, 입력창 접근, back으로 키보드 dismiss 확인
- 저장 CTA: 키보드 dismiss 후 접근 가능, 중복 탭 없이 저장 완료
- 테마: `adminQA`의 현재 테마 포인트가 제목·아이콘·시간 pill·전체 보기 버튼에 반영됨

## 검증 명령

- `corepack yarn tsc --noEmit --pretty false`: 통과
- `corepack yarn lint`: 통과, 신규 error 없음
- `corepack yarn jest --runInBand`: 68 suites / 272 tests 통과
- `./gradlew app:assembleRelease`: 성공
- APK SHA-256: `ee1bbf1241062f2dcb0dd247b238ea9957cf4894a7ffd83c8b77e91eff2ce852`
- Supabase remote schema: 변경 없음, 신규 migration 없음

## 2026-07-23 후속 1:1:1:1·60초 실기기 검증

- 최신 release APK: `android/app/build/outputs/apk/release/app-release.apk`
- APK SHA-256: `ee1bbf1241062f2dcb0dd247b238ea9957cf4894a7ffd83c8b77e91eff2ce852`
- UIAutomator에서 네 카드가 동일한 y축과 동일 폭으로 확인됐다.
- 상대시간 최초 dump: 산책 `28분 전`, 식사 `27분 전`, 건강 `26분 전`, 미용 `25분 전`
- 60초 이상 경과 후 dump: 산책 `31분 전`, 식사 `30분 전`, 건강 `29분 전`, 미용 `28분 전`
- evidence:
  - `/tmp/nuri-qa/frequent-records-1x4-scrolled.png`
  - `/tmp/nuri-qa/frequent-records-1x4-after-60s.png`
  - `/tmp/nuri-qa/frequent-records-1x4-window-scrolled.xml`
  - `/tmp/nuri-qa/frequent-records-1x4-window-after-60s.xml`
  - `/tmp/nuri-qa/frequent-records-1x4-final-logcat-20260723.txt`
- refined logcat: Fatal 0, ANR 0, Fatal signal 0, ReactNativeJS fatal 0, Unhandled promise 0
- 상대시간 구현은 `useIsFocused`와 `AppState`를 함께 사용하고 60초마다 갱신하며, 기존 `now` 기본값 문제를 제거했다.

## 남은 리스크

- 상대시간은 초 단위가 아니라 60초 단위로 갱신한다. 분 경계가 지난 뒤 최대 60초 이내 화면에 반영되는 제품 계약이다.
- 기록 요약은 실제 제목 우선, 내용 fallback이며 원문은 24자에서 축약한다.
- 신규 APK에서는 기존 release gate와 동일하게 community·notification·keyboard/back·Supabase·logcat 반복 확인이 필요하다.

## 2026-07-23 한국어 요약·최종 타이포그래피 재검증

이 절이 기존 1:1:1:1 검증 기록을 대체하는 최신 UI·데이터 증적이다.

- 최종 폰트 계약:
  - 섹션 제목 `18px / 600`
  - 설명 문구 `10px / 400`
  - 전체 보기 `11px / 500`, 투명 배경
  - 카테고리명 `12px / 500`
  - 기록 시간 `9px / 500`
  - 기록 요약 `9px / 500`
  - 로딩·오류 문구 `13px / 500`
- 최종 UI 보정:
  - 왼쪽 스파클 래퍼 `26dp`, 아이콘 `19dp`
  - 카테고리 아이콘 `24dp`, 아이콘 래퍼 `36dp`
  - 기록 시간 pill 좌우 padding `10dp`
  - 카드 배경·강한 그림자 제거 유지
  - `오늘의 말`과 `오늘 한장` 사이 여백 확대
- 최신 QA 기록 입력:
  - 산책: `QA_walk_morning_20260723` → `오전 산책 완료`
  - 식사: `QA_meal_food_180g_20260723` → `사료 180g`
  - 건강: `QA_health_condition_bad_20260723` + 나쁜 상태 감정 → `컨디션 나빠요`
  - 미용: `QA_grooming_bath_fur_20260723` → `목욕 & 털 정리`
- 모든 기록은 `adminQA`의 기존 QA 펫에 실제 저장했으며, 삭제·rollback하지 않았다.
- 상대시간 재검증:
  - 60초 전후 산책 `2분 전 → 3분 전`, 식사 `1분 전 → 2분 전` 등 실제 갱신 확인
  - 앱 강제 종료·재실행 후 네 카드 요약과 기록 유지 확인
- 최신 evidence:
  - `/tmp/nuri-qa/frequent-records-korean-final-before-60s.png`
  - `/tmp/nuri-qa/frequent-records-korean-final-after-60s.png`
  - `/tmp/nuri-qa/frequent-records-korean-final-before-60s.xml`
  - `/tmp/nuri-qa/frequent-records-korean-final-after-60s.xml`
  - `/tmp/nuri-qa/frequent-records-korean-relaunch-scrolled.xml`
  - `/tmp/nuri-qa/frequent-records-korean-final-logcat-20260723.txt`
  - `/tmp/nuri-qa/frequent-records-korean-final-release.png`
  - `/tmp/nuri-qa/frequent-records-korean-final-release.xml`
  - `/tmp/nuri-qa/frequent-records-korean-final-release-logcat.txt`
- 최신 APK SHA-256: `5a9d19e5021fdb0553d3cc10caa6fb628ec0a96ac9ce6fe2e658f64c8adc53dd`
- 최신 검증: typecheck, lint, Jest `68 suites / 273 tests`, release build/install, Supabase dry-run 통과.
