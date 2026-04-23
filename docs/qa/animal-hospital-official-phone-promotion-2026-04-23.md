# AnimalHospital Official Phone Promotion 2026-04-23

## 배경

- 2026-04-23 기준 official Localdata 전화번호는 `pending` verification queue `3,022건`까지 적재됐지만, public phone은 approved verification만 반영되므로 앱 노출 coverage가 매우 낮았다.
- 사용자 관점에서는 일부 병원만 전화번호가 보이고, 다수 병원은 `전화번호 확인 중`으로 남는 상태였다.

## 적용 기준

- source: `official-source`
- evidence.source: `official-localdata`
- field_key: `phone`
- status: `pending -> approved`
- hospital guard:
  - `is_active = true`
  - `is_hidden = false`
- phone guard:
  - pending verified_value.phone 정규화 값과 현재 `animal_hospitals.official_phone` 정규화 값이 일치할 때만 승격

## 실행 결과

- dry-run candidates: `3,022`
- source mismatch: `0`
- phone mismatch: `0`
- inactive/hidden skipped: `0`
- 최종 approved official-source phone: `3,024`
- 최종 pending official-source phone: `0`
- approval policy: `official-localdata-phone-auto-approval-2026-04-23`

## 운영 메모

- 이번 승격은 공식 Localdata 전화번호만 대상으로 했다.
- provider phone candidate는 이번 승격 대상이 아니며, 계속 pending/held review queue로 남긴다.
- public 앱 노출은 계속 approved phone verification만 사용한다.
