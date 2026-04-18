# 우리동네 동물병원 canonical 데이터 적재 증적

날짜: 2026-04-18
Supabase project ref: `grmekesqoydylqmyvfke`

## official source

- 기준 source: 공공데이터포털 `행정안전부_동물_동물병원`
- 공공데이터포털 상세 URL: `https://www.data.go.kr/data/15045050/fileData.do`
- 제공 URL: `https://file.localdata.go.kr/file/animal_hospitals/info`
- 실제 다운로드 경로: `https://file.localdata.go.kr/file/download/animal_hospitals/info`
- 다운로드 파일 인코딩: `euc-kr`
- 실제 CSV parse row: 10,507건

## dry-run 결과

- 명령: `yarn ingest:animal-hospitals --input /tmp/animal_hospitals_official.csv --encoding euc-kr --dry-run --snapshot-id localdata-animal-hospitals-2025-11-27 --source-updated-at 2025-11-27`
- totalRows: 10,507
- mappedRows: 10,507
- failedRows: 0
- issueCount: 9,263
- issue 사유: 공식 CSV의 `좌표정보(X/Y)`는 EPSG:5174이므로 public WGS84 좌표로 확정하지 않고 `conversion-required`로 남김

## remote load 결과

- service role env가 없어 Supabase CLI SQL batch 경로로 적재함
- 단일 40MB SQL은 Management API 413으로 거절되어 200건 단위 53개 batch로 분할함
- 53개 batch 모두 `upserted_hospitals`, `upserted_sources`, `inserted_change_logs` 성공
- 총 upserted_hospitals: 10,507
- 총 upserted_sources: 10,507
- 총 inserted_change_logs: 10,507

## remote row-level 확인

- `animal_hospitals` total: 10,507
- public visible active/not hidden: 5,427
- inactive: 5,080
- hidden: 0
- coordinate conversion-required: 9,263
- official_phone present: 4,756
- anon REST public count: `content-range 0-0/5427`

## 확인된 안전 경계

- 폐업/휴업 등 inactive row는 public visible에서 제외된다.
- EPSG:5174 좌표는 WGS84처럼 저장하지 않는다.
- 좌표 변환 전 공식 canonical row는 `conversion-required`로 보수 처리된다.
- 전화번호는 공식 source에 존재하는 경우에만 canonical `official_phone`으로 적재된다.

## 남은 주의점

- `animal_hospital_source_records`, `animal_hospital_change_log` 직접 count 재조회는 batch 결과로는 10,507건이지만, 병렬 remote 조회 후 Supabase pooler circuit breaker가 발생해 별도 단일 쿼리 재확인이 필요하다.
- 좌표 변환이 아직 없으므로 위치 기반 public query는 canonical 단독으로 완성되지 않고 provider 후보/matching 보조가 필요하다.
