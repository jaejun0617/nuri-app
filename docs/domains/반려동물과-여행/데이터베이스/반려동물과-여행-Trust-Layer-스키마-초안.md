# 반려동물과 여행 Trust Layer 스키마 초안

## 1. 목표

이번 스키마의 목적은 `반려동물과 여행`의 Trust Layer를 실제로 여는 것이다.

현재 앱은 TourAPI raw + rule/score 기반으로 `possible / check-required` 중심의 보수적 판정까지만 가능하다.

즉 이번 턴의 DB는 아래 문제를 해결해야 한다.

- canonical place를 내부 PK 기준으로 저장
- 반려동물 동반 정책과 검수 근거를 누적 저장
- 유저 제보를 추후 confidence 보강 근거로 재사용
- 장기적으로 `confirmed`를 열 수 있는 저장소 기반 마련

## 2. 핵심 원칙

- 외부 provider id를 내부 PK로 직접 쓰지 않는다.
- `confirmed`는 TourAPI raw나 정규식만으로 열지 않는다.
- 상태값은 enum보다 `text + check constraint`를 우선 사용한다.
- Trust Layer는 `places / pet_policies / user_reports` 3축으로 시작한다.
- 외부 원본 매핑 전용 `source_links`는 이번 턴 범위 밖이지만, 다음 단계로 자연스럽게 확장 가능해야 한다.

## 3. 테이블 설계

### 3-1. `places`

역할:

- 앱 내부 canonical place의 기준 테이블
- TourAPI/장소 검색 API 원본과 분리된 내부 anchor

핵심 컬럼:

- `id uuid primary key`
- `canonical_name text not null`
- `address text not null`
- `latitude numeric(9, 6) not null`
- `longitude numeric(9, 6) not null`
- `place_type text not null`
- `primary_source text not null`
- `primary_source_place_id text null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

설계 판단:

- 외부 원본 매핑 전용 테이블은 아직 만들지 않는다.
- 대신 `primary_source + primary_source_place_id`를 두어 현재 운영 anchor를 잡는다.
- 다음 단계에서 `place_source_links`를 추가해도 현재 `places.id`를 그대로 유지할 수 있게 한다.

### 3-2. `pet_policies`

역할:

- 반려동물 동반 정책 저장
- 검수 상태 저장
- confidence 저장
- evidence 저장

핵심 컬럼:

- `id uuid primary key`
- `place_id uuid not null references places(id)`
- `source_type text not null`
- `policy_status text not null`
- `policy_note text null`
- `confidence numeric(4, 3) not null`
- `requires_onsite_check boolean not null`
- `evidence_summary text null`
- `evidence_payload jsonb not null default '{}'::jsonb`
- `actor_user_id uuid null references auth.users(id)`
- `is_active boolean not null default true`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

상태값 제안:

- `source_type`
  - `tour-api`
  - `user-report`
  - `admin-review`
  - `system-inference`
- `policy_status`
  - `unknown`
  - `allowed`
  - `restricted`
  - `not_allowed`

설계 판단:

- `restricted`는 조건부 허용 또는 현장 확인 필요 상태다.
- `not_allowed`는 운영상 사실상 금지 근거가 강한 상태다.
- `is_active`를 둬서 소스별 최신 정책 1건을 유지하고, 과거 정책 이력도 보존한다.
- `actor_user_id`는 admin review나 user-origin policy에 대한 추적성을 남긴다.

### 3-3. `user_reports`

역할:

- 유저 제보 원본 저장
- 추후 Trust Layer confidence 집계의 근거 저장
- 최신성 문제와 정책 변경 신고의 입력 채널

핵심 컬럼:

- `id uuid primary key`
- `place_id uuid not null references places(id)`
- `user_id uuid not null references auth.users(id)`
- `report_type text not null`
- `report_note text null`
- `evidence_payload jsonb not null default '{}'::jsonb`
- `report_status text not null default 'submitted'`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

상태값 제안:

- `report_type`
  - `pet_allowed`
  - `pet_restricted`
  - `info_outdated`
- `report_status`
  - `submitted`
  - `reviewed`
  - `dismissed`

중복 제보 대응:

- `(place_id, user_id, report_type)` unique 제약을 둔다.
- 같은 유저가 같은 장소에 같은 유형 제보를 무한히 쌓지 못하게 한다.
- 내용 수정이 필요하면 기존 row update 흐름으로 푼다.

## 4. verification / confidence / evidence 저장 방향

### verification

Trust Layer의 최종 verification은 단일 컬럼 1개로 끝내지 않는다.

- `pet_policies.policy_status`
- `pet_policies.source_type`
- `pet_policies.is_active`
- `user_reports.report_status`

조합으로 판단한다.

### confidence

- `pet_policies.confidence`는 `0~1` 범위의 정규화 값으로 저장한다.
- 시스템 추론, TourAPI raw, 유저 제보, 관리자 검수 모두 같은 스케일로 저장한다.
- Aggregation Layer는 이 값을 그대로 읽지 않고 source와 evidence를 함께 본다.

### evidence

이번 턴은 evidence를 2단 구조로 저장한다.

- `evidence_summary`
  - UI/운영에서 바로 읽는 짧은 근거
- `evidence_payload jsonb`
  - 원문 문구, 검수 메모, 외부 source key, 제보 메타 등 구조화 가능한 근거

## 5. confirmed 정책 기준

이번 턴 문서 기준으로 아래를 고정한다.

- TourAPI raw만으로는 `confirmed` 금지
- 정규식만으로는 `confirmed` 금지
- `confirmed`는 장기적으로 아래 조합이 붙었을 때만 허용
  - `pet_policies`
  - `user_reports`
  - `admin review`

즉 Trust Layer DB가 생겨도, 관리자 검수 없는 자동 승격은 금지다.

## 6. RLS 방향

### `places`

- 읽기: 공개 read 허용
- 쓰기: 관리자만

### `pet_policies`

- 읽기: 공개 read 허용
- 쓰기: 관리자만

이유:

- 최종 정책은 서비스 신뢰도에 직접 연결되므로 일반 사용자 직접 쓰기 대상이 아니다.

### `user_reports`

- 읽기: 본인 또는 관리자
- insert/update/delete: 본인 또는 관리자

이유:

- 제보 원문은 개인정보/운영 이슈가 섞일 수 있어 public read를 열지 않는다.

## 7. 이번 턴에서 의도적으로 하지 않는 것

- `placeMeta` 테이블과 합치기
- GPS/검색/UI 변경
- Google Places 연결
- 외부 원본 매핑용 `place_source_links` 즉시 추가

## 8. 다음 단계

1. 이 SQL을 Supabase 리뷰 가능한 형태로 검토
2. `places / pet_policies / user_reports`를 읽는 repository/service 타입 추가
3. admin review 입력 경로와 Aggregation Layer 병합 조건 설계
