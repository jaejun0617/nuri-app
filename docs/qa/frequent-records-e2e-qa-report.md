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
- 상대시간 갱신: 홈 focus 복귀·기록 저장 후 `recordStore.refresh`; 1초 타이머를 추가하지 않음
- 레이아웃: 넓은 화면 4열, Android 좁은 화면 2x2
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
- APK SHA-256: `5b461229f2229013414cdfc9ad8ac0f98b4ef0a6d5df347da545f9142484b69e`
- Supabase remote schema: 변경 없음, 신규 migration 없음

## 남은 리스크

- 상대시간은 화면 focus/refresh와 기록 저장 후 갱신한다. 초 단위 실시간 갱신은 의도적으로 추가하지 않았다.
- 기록 요약은 실제 제목 우선, 내용 fallback이며 원문은 24자에서 축약한다.
- 신규 APK에서는 기존 release gate와 동일하게 community·notification·keyboard/back·Supabase·logcat 반복 확인이 필요하다.
