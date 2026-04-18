# 우리동네 동물병원 public query 우선순위 검증

날짜: 2026-04-18

## 점검 배경

- runtime 후보명으로 canonical을 보조 조회하면 같은 이름의 원거리 official row가 함께 조회될 수 있다.
- 이 row가 실제 match 없이 public 결과에 섞이면 사용자는 provider-only 후보보다 더 신뢰도 높은 공식 병원처럼 오해할 수 있다.
- public query는 조회된 canonical이 아니라 확정 match된 canonical과 위치 기반 official canonical만 노출해야 한다.

## 수정한 안전 규칙

- 후보명 보조 조회 결과는 match 입력으로만 사용한다.
- `linkAnimalHospitalRuntimeCandidates`는 실제 match가 1개로 확정된 canonical만 `linkedCanonicals`로 반환한다.
- public query merge 순서는 `linked canonical -> 위치 기반 official canonical -> provider-only candidate`로 제한한다.
- match가 없는 후보명 조회 canonical은 public result에 포함하지 않는다.

## 검증한 케이스

- 확실한 `name/address` 또는 `name/phone` match는 canonical linked 병원으로 노출된다.
- 같은 이름으로 canonical 조회가 되어도 주소/전화/좌표 확정 조건이 없으면 provider-only 후보만 노출된다.
- 기존 위치 기반 official canonical은 provider-only 후보보다 먼저 노출된다.
- provider-only 후보의 전화번호와 민감 필드는 public으로 노출되지 않는다.

## 검증 명령

- `yarn test --watchman=false __tests__/animalHospitalService.test.ts __tests__/animalHospitalMatching.test.ts`
- `yarn eslint src/services/animalHospital/service.ts src/services/animalHospital/matching.ts __tests__/animalHospitalService.test.ts __tests__/animalHospitalMatching.test.ts`

## 남은 주의점

- canonical WGS84 좌표 변환 전까지 위치 기반 official canonical 우선 노출은 제한적이다.
- 같은 이름 병원이 많은 지역에서는 이번 규칙이 의도적으로 보수적으로 동작해 provider-only 후보가 남을 수 있다.
