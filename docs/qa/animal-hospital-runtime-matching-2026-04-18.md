# 우리동네 동물병원 runtime matching 검증

날짜: 2026-04-18
기준 위치: 경기 고양시 일산서구 일산동 인근
Supabase project ref: `grmekesqoydylqmyvfke`

## 변경 목적

- 공식 canonical row가 WGS84 좌표를 갖기 전에도 provider 후보를 canonical과 보수적으로 연결할 수 있는지 확인한다.
- runtime provider 후보를 canonical처럼 확정하지 않고, 확실한 조건에서만 canonical linked candidate로 승격한다.
- 애매한 후보는 provider-only로 유지해 public trust 오표시를 막는다.

## 구현 기준

- 1차 canonical 조회: 현재 위치 반경 기반 공식 canonical search
- 보조 canonical 조회: Kakao runtime 후보명 기준 canonical name lookup
- 매칭 허용 규칙: 기존 보수 규칙 유지
- 자동 merge 금지: match가 정확히 1개일 때만 canonical link 처리
- inactive/hidden canonical row는 보조 조회 결과에서도 제외

## 실제 데이터 smoke 결과

- Kakao keyword: `동물병원`
- radius: 3000m
- 상위 후보 검증 수: 8개
- canonical linked: 1개
- linked rule: `name-phone-exact`
- provider-only 유지: 7개

## 확인된 사례

- `중산동물메디컬센터`는 Kakao 후보와 official canonical row가 이름과 공식 전화번호로 정확히 일치해 canonical linked candidate로 처리 가능함.
- `이용철동물병원`, `더오래동물병원`, `사과나무동물병원`, `최지영재활한방동물병원`, `초원동물병원`, `산들동물병원`, `더독동물병원`은 이름만으로 확정하지 않고 provider-only로 유지함.

## 안전 경계

- 이름 검색으로 canonical 후보를 가져오더라도 주소/전화/좌표 중 허용된 확정 조건을 만족하지 않으면 연결하지 않는다.
- public field whitelist는 확대하지 않았다.
- provider 전화번호는 canonical의 공식 전화번호를 대체하지 않는다.
- EPSG:5174 좌표를 WGS84처럼 사용하지 않는다.

## 검증

- `yarn test --watchman=false __tests__/animalHospitalService.test.ts __tests__/animalHospitalMatching.test.ts`
- `yarn eslint src/services/animalHospital/service.ts __tests__/animalHospitalService.test.ts`
- `git diff --check`

## 남은 주의점

- canonical WGS84 좌표 변환 전까지는 위치 반경 기반 canonical 우선 노출이 제한적이다.
- 도로명/지번 주소 차이로 확실한 같은 병원이라도 이번 규칙에서는 provider-only로 남을 수 있다.
- 다음 턴에서 좌표 변환 또는 verified provider linkage를 추가하면 canonical linked 비율을 더 안전하게 높일 수 있다.
