# 우리동네 동물병원 verification/admin/reporting 후속 범위

날짜: 2026-04-18

## 현재 닫힌 범위

- official source snapshot을 canonical master로 적재했다.
- public query는 canonical linked 후보와 provider-only 후보를 보수적으로 분리한다.
- public projection은 병원명, 주소, 좌표, 거리, 안전한 상태 요약, 공식 전화번호, trust label, 전화/지도 CTA만 노출한다.
- 운영시간, 24시간, 야간, 주말, 특수동물, 응급, 주차, 장비, 홈페이지/SNS는 public 기본 노출에서 제외되어 있다.

## 아직 열면 안 되는 것

- 사용자 제보를 public trust 상승 근거로 사용하는 경로
- admin 검수 없이 운영시간/24시간/야간/주말/특수동물/응급/주차/장비/홈페이지/SNS를 노출하는 UI
- provider 사진/홈페이지/SNS를 검증 없이 병원 상세 정보로 보여주는 UI
- 애매한 name/address 후보를 자동 merge하는 dedupe 고도화

## 다음 구현 권장 순서

1. `animal_hospital_verifications` 최소 schema와 field-level verification contract를 먼저 만든다.
   - 필드 단위: phone, coordinates, operating_hours, emergency, specialty, parking, website
   - 상태 단위: pending, approved, rejected, expired
   - 감사 단위: source, reviewer, reviewed_at, expires_at, note
   - public projection은 approved + not expired만 소비한다.

2. admin은 처음부터 write UI가 아니라 read-only 검수 큐부터 연다.
   - canonical row, source provenance, provider linkage, conflict flag를 한 화면에서 확인한다.
   - operator action log 없이는 approved 상태를 만들지 않는다.
   - RLS/RPC는 앱 UI보다 먼저 닫는다.

3. 사용자 reporting은 moderation/action log와 함께 별도 도메인으로 연다.
   - 신고는 public trust를 직접 올리지 않는다.
   - 신고는 verification queue의 evidence로만 들어간다.
   - reporter trace, abuse 방어선, 중복 신고 제한, cleanup 정책을 먼저 만든다.

## 선행해서 풀어야 할 기술 부채

- EPSG:5174 -> WGS84 좌표 변환 경로를 닫아야 canonical nearby query 품질이 올라간다.
- `animal_hospital_source_records`, `animal_hospital_change_log` remote count를 pooler circuit breaker 회복 후 단일 쿼리로 재확인해야 한다.
- 실기기 keyguard 해제 후 동물병원 리스트/상세 탭 기반 smoke를 다시 확보해야 한다.
- 전체 `tsc --noEmit`을 막는 기존 Date 타입 오류 2건을 별도 턴에서 처리해야 한다.

## 다음 턴의 최종 권장 1개

좌표 변환과 verified phone/coordinate verification contract를 먼저 닫는다.

이유:

- 현재 canonical 10,507건 중 9,263건이 EPSG:5174 변환 대기 상태라 canonical-first nearby UX가 제한적이다.
- 운영시간/응급/특수동물보다 좌표와 전화가 public MVP의 안전성과 행동 전환에 직접 연결된다.
- verification/admin/reporting UI를 열기 전에 field-level verification contract를 고정해야 public 확장 리스크를 낮출 수 있다.
