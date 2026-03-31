# 액션 5. Guide source of truth 정리

상태: 검증 필요
최종 갱신: 2026-03-30
우선순위: P1

## 배경

- Guide는 운영 콘텐츠 도메인이라 test seed가 공개 운영 경로처럼 보이면 안 된다.

## 현재 문제

- 기존 구현은 remote가 비거나 실패하면 local seed를 사용자 화면에 그대로 노출했다.
- 이 구조는 운영 source of truth와 테스트 seed를 섞어 release 기준 판단을 흐린다.

## 목표

- 운영 빌드에서는 remote를 단일 source of truth로 본다.
- local seed fallback은 개발 보조 경로로만 제한한다.

## 작업 목록

- [x] 운영 빌드에서 local seed fallback 비활성화
- [x] source 설명 문구 보강
- [x] guide source 테스트 추가
- [ ] 실제 published row 운영 채움
- [ ] GuideAdmin -> published row 운영 캡처

## 이번 턴 실행 결과

- `src/services/guides/service.ts`에서 local seed fallback을 `__DEV__` 한정으로 줄였다.
- 운영 빌드에서 remote가 비거나 실패하면 `remote-empty` 또는 `null detail`로 남고, test seed를 사용자에게 대신 보여주지 않는다.
- `src/services/guides/source.ts`는 remote-empty + remote-error 상태를 별도 설명하도록 보강했다.

## 검증 결과

- `__tests__/guideCatalogSource.test.ts` 추가 및 통과
- 운영 빌드 시나리오
  - remote empty -> `remote-empty`
  - remote error -> seed fallback 미사용
- 개발 빌드 시나리오
  - remote empty -> local seed fallback 유지

## 권장안

- 권장안은 `운영 빌드 remote-only + 개발 빌드 fallback 허용`이다.
- 이유는 공개 사용자에게 테스트 seed를 보여주는 것보다, 운영 콘텐츠가 없음을 명확히 드러내는 편이 더 안전하고 유지보수성이 높기 때문이다.

## 완료 기준

- 운영 빌드에서 local seed가 기본 사용자 경로로 열리지 않는다.
- remote-empty / remote-error 상태가 화면 문구로 구분된다.

## 리스크

- 운영에서 published row를 실제로 채우지 않으면 Guide 화면은 빈 상태로 보일 수 있다.
- 그래서 이 작업은 source of truth 정리이지, 운영 콘텐츠 충전 완료를 뜻하지 않는다.

## 다음 액션

- 운영자가 published guide row를 실제로 채운 뒤 Guide list/detail/home 추천 화면을 캡처로 닫는다.

## 상태

- 검증 필요
