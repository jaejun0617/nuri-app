# 우리동네 동물병원 Android 실기기 QA

날짜: 2026-04-18
기기: R5CY613NMSY
앱 패키지: `com.nuri.app`
기준 커밋: `fc99202`

## 실행 기준

- `yarn android --deviceId R5CY613NMSY`
- Android debug APK 설치 성공
- 앱 실행 성공
- Metro dev server는 이미 `8081`에서 실행 중인 상태

## 확인한 것

- 전체메뉴에서 `우리동네 동물병원` 진입 성공
- 진입 후 4초 대기 기준 반복 로딩 화면 재현 안 됨
- 리스트 상단 지도 미노출 확인
- 리스트 카드는 산책장소형 compact 구조로 표시됨
- 리스트 카드 노출 정보는 `동물병원`, 병원명, 주소, 썸네일 기준으로 제한됨
- 병원 상세 진입 성공
- 상세 상단은 병원명, trust/status 요약, 주소, 거리, 전화 검증 상태, 기준일을 노출함
- 전화번호가 검수/확정되지 않은 병원은 `공식 전화 확인 중` fallback으로 표시됨
- 길찾기 CTA는 Android 외부 지도 앱 선택지를 정상 호출함
- 상세 지도는 horizontal pan이 동작해 static lite preview가 아니라 상호작용 가능한 지도임을 확인함
- 최근 `logcat` 400줄 기준 `FATAL EXCEPTION`, `AndroidRuntime`, `ReactNativeJS` 치명 오류 없음

## 이번 QA에서 의도적으로 확정하지 않은 것

- 공식/검수 전화번호가 있는 canonical row의 전화 CTA는 실데이터 표본이 없어 미확인
- remote canonical schema 반영 여부는 아직 미확인
- 전국동물병원표준데이터 실제 ingest 실행은 아직 미확인
- release candidate 빌드 기준 smoke는 이번 QA 범위가 아님
