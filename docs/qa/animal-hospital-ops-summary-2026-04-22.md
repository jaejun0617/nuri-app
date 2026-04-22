# AnimalHospital Ops Summary - 2026-04-22

## Remote Schema

- 기준 커밋: 51746398196a5de406a66b35f0c4ee7647c93110
- 적용 migration: 20260422103000_animal_hospital_ops_review_console.sql
- `supabase db push --linked --dry-run`: 적용 대상 migration 1개 확인
- `supabase db push --linked`: remote 적용 완료
- 후속 `supabase db query --linked`: temp role가 간헐적으로 circuit breaker에 걸렸으나 단일 query는 일부 성공

## Canonical / Source / Public Drift

- canonical row 수: 10,507
- source row 수: 10,507
- public visible active/not hidden row 수: 5,427
- inactive row 수: 5,080
- hidden row 수: 0
- migration 적용 전 verification row 수: 0
- 2026-04-22 운영 seed 후 verification 분포:
  - approved phone: 2
  - approved coordinates: 2
  - approved thumbnail: 2
  - pending thumbnail: 1
- thumbnail import candidate upsert: 3
- 위 수치는 2026-04-22 linked SQL로 다시 확인한 remote 기준이다.
- migration 적용 후 RPC `animal_hospital_ops_summary()`는 remote에 배포됐다.
- CLI 직접 호출은 기본 DB temp role에서 `auth.uid()`가 없어 거부되지만, `request.jwt.claim.role=service_role` claim을 설정한 linked SQL에서는 `animal_hospital_ops_summary()`, `animal_hospital_ops_detail()`, `animal_hospital_ops_review_items()` 응답을 확인했다. 실제 앱 admin session에서는 `admin/super_admin` profile 기준으로 호출해야 한다.
- 2026-04-22 P0-P2 후속 linked SQL 재확인:
  - source_unlinked_rows: 0
  - canonical_drift_suspected: 0

## Runtime Provider Snapshot

- 기준점: 강남구청 인근 37.5172363, 127.0473248
- query: 동물병원
- Kakao runtime candidate 수: 15
- public canonical bbox 결과 수: 80
- conservative exact name/address linked 수: 0
- provider-only 수: 15
- deferred 수: 0
- provider-only 비율: 1
- canonical linked 비율: 0
- runtime snapshot 저장: `animal_hospital_runtime_match_snapshots`에 `2026-04-22-gangnam-animal-hospital-smoke` 1건 저장
- ops summary 반영 수치: provider-only candidates 15, canonical linked 0, latest runtime snapshot at `2026-04-22 12:13:07.421955+00`
- sample candidates:
  - 굿모닝동물병원 / 서울 강남구 학동로 413
  - VIP동물의료센터 청담점 / 서울 강남구 삼성로133길 7
  - VIP동물한방재활의학센터by Dr신사경 / 서울 강남구 삼성로133길 7
  - 놀로 동물행동 클리닉 / 서울 강남구 삼성로133길 7
  - 혜민동물병원 / 서울 강남구 봉은사로57길 59

## Verification Coverage

- approved phone coverage: 2
- approved coordinates coverage: 2
- approved thumbnail coverage: 2
- pending phone: 0
- pending coordinates: 0
- pending thumbnail: 1
- thumbnail 후보 dry-run은 별도 evidence `docs/qa/animal-hospital-thumbnail-import-2026-04-22.md`에 기록했다.
- approved sample:
  - VIP동물의료센터 청담점
  - canonical id: `animal-hospital:official-localdata:3220000:322000001020210002`
  - phone: `025117522`
  - coordinates: `37.522301, 127.046908`
  - thumbnail: `https://www.vipah.co.kr/images/content/location_tit_img_cd.jpg`
- Android approved CTA/thumbnail smoke sample:
  - 24시 마이동물의료센터
  - canonical id: `animal-hospital:official-localdata:4060000:406000001020250003`
  - phone: `0319455000`
  - coordinates: `37.713595, 126.720972`
  - thumbnail: `https://24myamc.com/images/main-img101.png`
  - source page: `https://24myamc.com/`
- pending sample:
  - 서울대학교 수의과대학 동물병원 thumbnail
  - canonical id: `animal-hospital:official-localdata:3200000:320000001020080002`

## Operational Blocker

- `SUPABASE_SERVICE_ROLE_KEY`와 `NURI_SUPABASE_SERVICE_ROLE_KEY`가 현재 shell에 없어서 운영 스크립트 apply 모드는 실행하지 못했다.
- linked SQL로 candidate/verification seed와 runtime snapshot은 반영했다.
- 앱 admin 계정으로 운영자 화면을 직접 조작하지는 못했고, linked RPC 응답으로 summary/detail/review item contract를 확인했다.

## P0-P2 Follow-up

- 2026-04-22 후속 shell 확인:
  - `SUPABASE_SERVICE_ROLE_KEY`: missing
  - `NURI_SUPABASE_SERVICE_ROLE_KEY`: missing
  - `KAKAO_REST_API_KEY`: missing
- `scripts/import-animal-hospital-thumbnails.js --dry-run`은 재실행했고 3건 모두 validated 상태를 유지했다.
- `scripts/ingest-animal-hospitals.js --dry-run --ingest-mode delta`는 재실행했고 total 3 / mapped 3 / failed 0 / inactive 1로 통과했다.
- `--compare-remote`와 live runtime provider snapshot은 위 key 부재로 재실행하지 못했다.
