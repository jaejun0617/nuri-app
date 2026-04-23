# AnimalHospital Provider Enrichment Batch2 Summary 2026-04-23

## 배경

- 기존 provider enrichment apply는 50개 병원 샘플 수준에 머물러 있었다.
- 전화번호 approved coverage는 official source 승격으로 크게 올렸지만, coordinates / open24Hours / thumbnail review queue는 더 확장할 필요가 있었다.

## 실행 범위

- provider: `google`
- mode: `apply`
- offset: `50`
- limit: `500`
- dedupe rule:
  - 같은 병원 같은 field에 `pending / approved / held`가 이미 있으면 신규 candidate를 다시 넣지 않음

## 결과

- hospitals processed: `500`
- provider matched: `499`
- failed hospitals: `0`
- total candidates inserted: `1,547`

field breakdown:
- phone: `229`
- coordinates: `499`
- thumbnail: `778`
- open24Hours: `41`

status breakdown:
- pending: `347`
- held: `1,200`

## remote queue snapshot after apply

- pending phone: `5`
- pending coordinates: `327`
- pending thumbnail: `4`
- pending open24Hours: `43`
- approved phone coverage: `3,024`
- approved coordinates coverage: `2`
- approved thumbnail coverage: `2`
- approved open24Hours coverage: `1`

provider-crosscheck rows:
- phone held: `253`
- phone pending: `5`
- coordinates held: `222`
- coordinates pending: `327`
- open24Hours pending: `43`
- thumbnail held: `868`

## 운영 메모

- phone candidate는 official phone approved가 이미 있는 병원은 dedupe로 다시 넣지 않았다.
- provider photo는 계속 `held`로만 적재했다.
- 이번 배치로 public gate가 완화된 것은 없고, 검수 queue만 확장됐다.
