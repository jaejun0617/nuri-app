# 우리동네 동물병원 UI/UX 정리 증적

날짜: 2026-04-18

## 적용 기준

- 산책장소형 리스트 구조와 일관되게 `썸네일 영역 + 동물병원 + 병원명 + 주소` 위계를 유지한다.
- 동물병원 도메인은 귀여움보다 신뢰감, 안정감, 낮은 정보 밀도를 우선한다.
- 불확실한 provider 정보와 민감 정보는 버튼/문구로 확정처럼 보이지 않게 한다.

## 반영 내용

- 리스트 썸네일 placeholder 내부의 중복 `동물병원` 문구를 제거했다.
- 리스트 텍스트 위계는 `동물병원 -> 병원명 -> 주소`만 유지했다.
- 상세 CTA는 `전화하기`와 지도 CTA 최대 2개로 정리했다.
- 별도 `장소 링크` 버튼은 제거하고, 좌표 기반 길찾기가 없을 때만 provider place URL을 `지도에서 보기` fallback으로 사용한다.

## 검증

- `yarn eslint src/components/animalHospital/AnimalHospitalCard.tsx src/screens/AnimalHospital/AnimalHospitalDetailScreen.tsx`
- `yarn test --watchman=false __tests__/animalHospitalPresentation.test.ts`

## 남은 주의점

- 이번 단계는 코드 기준 UI 구조 정리다.
- 실제 기기에서 CTA 배치와 상세 지도 조작감은 전체 회귀 검증 단계에서 다시 확인한다.
