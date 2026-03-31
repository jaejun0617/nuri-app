# 액션 3. PetTravel trust / search-filter 계약

상태: 검증 필요
최종 갱신: 2026-03-30
우선순위: P0

## 배경

- PetTravel은 공개 신뢰도 도메인이라 잘못된 노출 기준이 바로 사용자 오판으로 이어진다.
- raw TourAPI 문구만으로 `confirmed`를 열지 않는 현재 원칙은 계속 유지돼야 한다.

## 현재 문제

- 2026-03-30 감사 시점에는 이 도메인이 적색 가능성이 있는 축으로 분류됐다.
- 현재 worktree 기준 단일 테스트 재실행에서는 적색이 재현되지 않았지만, release 직전 다시 흔들리지 않도록 계약을 문서로 잠글 필요가 있다.

## 목표

- region-only 검색, trust label, commercial 제외, candidate 유지 원칙을 다시 잠근다.
- 현재 로컬 검증 결과를 문서에 남겨 다음 세션의 오판을 막는다.

## 작업 목록

- [x] current test suite 재실행
- [x] current trust/search/filter 계약 문서화
- [ ] physical-device 검색 UX 검증
- [ ] stale/conflict 사례 캡처

## 이번 턴 실행 결과

- `yarn test --watchAll=false --watchman=false __tests__/petTravel.test.ts` 재실행 결과 통과
- 현재 계약은 아래 기준으로 유지된다.
  - raw TourAPI 동반 문구만으로 `confirmed`를 열지 않는다.
  - `possible`이어도 public trust는 `needs_verification` 또는 `candidate`로 남을 수 있다.
  - region-only 검색은 행정명 별칭 차이로 적합한 후보를 과도하게 탈락시키지 않도록 area scope 가산점을 준다.
  - 상업성 강한 결과는 계속 제외한다.

## 완료 기준

- 관련 테스트가 적색 없이 유지된다.
- trust/search/filter 규칙이 `confirmed` 개방과 분리돼 문서에 고정된다.

## 리스크

- 실기기 검색 UX와 stale/conflict 캡처가 없으면 release evidence로는 아직 부족하다.
- mixed-suite 또는 실데이터 질 변화에 따른 재적색 가능성은 계속 감시해야 한다.

## 다음 액션

- release blocker evidence 트랙에서 지역명 단독 검색, stale/conflict, 지도 인터랙션을 물리 실기기 기준으로 검증한다.

## 상태

- 검증 필요
