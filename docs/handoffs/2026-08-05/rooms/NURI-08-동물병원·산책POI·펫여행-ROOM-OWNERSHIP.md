# NURI-08-동물병원·산책POI·펫여행

- 목적: animal hospital public projection, nearby walk POI, pet-friendly travel candidate/trust layer
- 화면: `src/screens/AnimalHospital`, `LocationDiscovery`, walk POI admin-linked read surfaces
- 코드: `src/services/animalHospital`, `locationDiscovery`, `placeEnrichment`, `trust`; related domains
- Supabase: hospital/source/verification, walk_pois, place cache/enrichment, travel tables/RPC; shared policy NURI-09
- tests/docs: hospital/POI/trust tests, domain SQL/docs
- 허용: read path, public-safe presentation, candidate/trust labels, domain tests
- 금지: candidate→confirmed promotion without operations, provider key exposure, public RLS changes
- 경계: admin operator screens NURI-10; shared migration NURI-09
- 현재 상태: ACTIVATE_LATER; PLACE-001
- 첫 작업: provider scope and public trust boundary audit
