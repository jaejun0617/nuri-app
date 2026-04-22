# AnimalHospital Provider Enrichment Report

- generated_at: 2026-04-22T16:31:00.145Z
- mode: dry-run
- provider: fixture
- hospitals_processed: 2
- provider_matched: 2
- failed_hospitals: 0
- total_candidates: 5
- by_field: {"coordinates":2,"open24Hours":1,"thumbnail":2}
- by_status: {"pending":3,"held":2}

## Results

| hospital | provider matched | candidates | error |
| --- | --- | --- | --- |
| animal-hospital:official-localdata:4060000:406000001020250003 | yes | coordinates:pending, open24Hours:pending, thumbnail:held | - |
| animal-hospital:official-localdata:3220000:322000001020210002 | yes | coordinates:pending, thumbnail:held | - |

## Operational Notes

- Provider phone/coordinates/photo/open24Hours values are candidates only.
- Public projection still requires approved verification.
- Provider photos are inserted as held unless an operator confirms representative ownership/source safety.
