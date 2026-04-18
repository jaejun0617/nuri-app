# 우리동네 동물병원 썸네일 정책 검증

날짜: 2026-04-18

## 판단

- 동물병원 MVP에서는 자동 외부 사진 검색을 열지 않는다.
- 병원 사진은 실제 병원과 다른 사진이 매칭될 경우 신뢰 정보처럼 오해될 수 있다.
- Google Places photo lookup은 비용과 출처/정책 리스크가 있으므로 산책장소 도메인에만 유지한다.
- 동물병원은 검증된 `thumbnailUrl`이 명시적으로 들어온 경우에만 이미지 URL을 사용한다.

## 반영 내용

- `resolveLocationDiscoveryThumbnail`에서 `animalHospital` 자동 Google Places photo lookup을 차단했다.
- 기존 walk 도메인 thumbnail flow는 유지했다.
- 동물병원 리스트는 이미지 영역 구조는 유지하되, 검증 이미지가 없으면 로컬 placeholder를 사용한다.

## 검증

- `yarn test --watchman=false __tests__/locationDiscoveryThumbnail.test.ts`
- `yarn eslint src/services/locationDiscovery/thumbnail.ts __tests__/locationDiscoveryThumbnail.test.ts`

## 남은 주의점

- 병원별 실제 썸네일을 열려면 다음 턴에서 source attribution, 사용 권한, stale policy, verified thumbnail 저장 계약이 먼저 필요하다.
- Google/Kakao/NAVER 사진을 public 확정 정보처럼 직접 노출하지 않는다.
