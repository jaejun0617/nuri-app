# 산책/location discovery POI SQL archive

이 디렉터리는 V1.1 산책 POI seed coverage와 rollback SQL의 reference archive다.

## 2026-06-22 현재 기준

- 최신 approved/public/active POI: 1,145건
- 신규 seed/import/review 작업: 없음
- DB write 작업: 없음
- migration 생성: 없음
- coverage SQL: 14개
- rollback SQL: 14개
- 최신 seed coverage SQL: `v1.1-walk-poi-national-5th-seed-coverage-2026-06-21.sql`
- 최신 rollback SQL: `v1.1-walk-poi-national-5th-seed-rollback-2026-06-21.sql`

## 운영 원칙

- 이미 remote에 적용된 migration 파일은 rename/delete하지 않는다.
- seed rollback은 destructive delete가 아니라 admin review `held` 전환 기준으로 작성한다.
- 직접 `walk_pois` canonical table에 무단 insert하지 않는다.
- 신규 seed는 반드시 `walk_poi_admin_import_commit_v1`와 `walk_poi_admin_review_v1` workflow를 사용한다.
- 2026-06-22 final closeout audit에서는 seed 추가, seed 수정, DB write, migration을 수행하지 않았다.

## Parking

admin UI 운영자 QA는 앱 출시 blocker가 아니며, V1.0/V1.1 앱 작업 완료 후 별도 홈페이지/관리 페이지 트랙에서 다룬다.
