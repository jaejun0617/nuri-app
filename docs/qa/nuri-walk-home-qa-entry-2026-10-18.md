# 임시 Home 도보 QA 진입

## 목적과 현재 상태

PO가 도보 QA를 쉽게 열 수 있도록 로그인 Home의 펫 더 알아보기 바로 아래, 프로필 수정하기 위에 임시 CTA를 요청했다. 검증 완료 후 폐기하는 버튼이며 영구 제품 기능이 아니다.

- 기존 글라스 재질, 계절 CTA 색,12sp/18sp 문구, 최소48dp 터치를 사용한다. 기존 두 CTA와52dp 섹션 간격은 바꾸지 않는다.
- 로그인/선택 펫이 있고 기존 native `isWalkDistanceQaEnabled()`가 참일 때만 표시한다. Store에서는 버튼과 QA host가 없다.
- 클릭 후에만 기존 host를 읽어 `ACTUAL` 모드로 연다. Home 초기 로딩에 QA 화면 import/관찰을 추가하지 않는다. 기존 session과 QA protocol은 읽기만 하며 권한 요청·CONFIGURE·START_STEP·기록 시작은 하지 않는다.
- QA Wizard와 native의 실제 시작 계약은 기존 명시 버튼이 소유한다. 이 진입 버튼이 물리 보행 승인이나 타이머 exit gate를 대신하지 않는다. 기존 종료 결과/미정리 session을 자동 삭제하거나 덮어쓰지 않는다.
- 닫기는 기존 최소화 확인/PAUSED/복구 계약을 재사용한다. 계정 key 변경 시 임시 modal을 버리고 다른 계정 화면으로 넘기지 않는다.

## 검증

Evidence: `/Users/shinjaejun/.codex/nuri-walk-evidence/home-entry-20261018-8gMEjr`.

- 기존 slot/실제 모드 진입2건 fail-first. 첫 slot selector가 RN composite를 골랐던 실패와 올바른 host selector의 실제 미구현 실패를 구분 보존했다.
- 최종 관련5 suites/208 tests·TypeScript PASS. Store gate, 로그인/펫 경계,48dp/작은 계절색 글씨, 중복 탭/재열기, 계정 교체, 무권한 요청/무자동 수집, active walk 최소화 보존을 포함한다.
- ESLint 오류0, Home 기존 no-shadow15개이며 새 파일/나머지 대상은 경고0이다. 기존 JSX-transform 경고를 숨기지 않는다.
- 직전 Release source는 `410d13d81746d368a7217a8bc92c1aea9c76de2c`, APK SHA256은 `196073fe382558fb63fff067a648507551978506f0a508c7726342e38c0c1110`이다. 이 이전 APK에는 이번 새 버튼이 없다. PO가 새 버튼의 추가 Full Suite1·QA Release1·install-r1을 승인했다. 최종 exact commit/APK/설치 확인과 실제 실행 결과는 위 외부 evidence의 `FINAL-REPORT.md`/`FINAL-RECEIPT.json`이 소유한다.
- 원본 dirty181/status/content hash 보존, native/거리 엔진/Wizard protocol/타이머/서버 변경0이다. 최종 local PASS 이후10개 요청 범위만 selective commit하며 push는 하지 않는다.

## 폐기 조건과 범위

도보 QA 완료가 확인되면 임시 버튼과 임시 연결 source를 함께 제거한다. 이번 로컬 테스트 PASS만으로 물리 QA 완료를 선언하거나 출발 전에 버튼을 지우지 않는다.

제거 범위는 `HomeWalkQaEntry.tsx`와 전용 테스트, `LoggedInHome`의 import/prop, `HomeHeroInfoPanel`의 slot, QA host의 임시 initialMode/onClose 연결과 해당 임시 계약 테스트다. 기존 QA Wizard/DevTest 진입, 승인된 Walk 디자인, sanitized receipt와 최초 실패/최종 PASS 증적은 유지한다. 검증 종료 확인 없이 자동 삭제·설치·다음 단계 실행은 하지 않는다.

## 다음 Gate

승인된 추가 최종 검증/Release/install 후 exact source로 실기기 진입만 검증한다. 실제 위치 화면은 촬영하지 않고 버튼 클릭만으로 service가 켜지지 않는지 확인한다. 기존 `TIMER_DEVICE_EXIT_GATE: NOT_PASS`, `OUTDOOR_QA_READY: NO`, `PHYSICAL_QA_STARTED: NO`, `STORE: HOLD`, `PUSH: NO`를 유지한다.
