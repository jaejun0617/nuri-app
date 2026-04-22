# AnimalHospital Provider Enrichment Report

- generated_at: 2026-04-22T16:33:06.253Z
- mode: dry-run
- provider: google
- hospitals_processed: 2
- provider_matched: 2
- failed_hospitals: 0
- total_candidates: 10
- by_field: {"coordinates":2,"open24Hours":2,"thumbnail":6}
- by_status: {"pending":3,"held":7}

## Results

| hospital | provider matched | candidates | error |
| --- | --- | --- | --- |
| animal-hospital:official-localdata:4060000:406000001020250003 | yes | coordinates:pending, open24Hours:pending, thumbnail:held, thumbnail:held, thumbnail:held | - |
| animal-hospital:official-localdata:3220000:322000001020210002 | yes | coordinates:held, open24Hours:pending, thumbnail:held, thumbnail:held, thumbnail:held | - |

## Operational Notes

- Provider phone/coordinates/photo/open24Hours values are candidates only.
- Public projection still requires approved verification.
- Provider photos are inserted as held unless an operator confirms representative ownership/source safety.
