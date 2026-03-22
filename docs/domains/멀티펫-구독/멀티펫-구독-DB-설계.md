# 멀티펫 구독 DB 설계

## 1. 문서 목적

이 문서는 NURI의 `멀티펫 구독` 기능을 구현할 때 필요한 DB/서버 entitlement 구조를 실제 서비스 운영 관점에서 정리한 설계 문서다.

중요:

- 현재 프로젝트에는 멀티펫 구독용 SQL/테이블이 없다.
- 이번 문서는 새로 필요한 테이블과 관계를 정의하는 설계 문서다.
- 현재 실제 `pets` 테이블을 직접 구독 상태 source of truth로 쓰는 구조는 권장하지 않는다.

## 2. 현재 실제 DB 상태

현재 실제 코드에서 확인되는 것은 아래다.

- 반려동물 데이터: `pets`
- 계정 데이터: `profiles`
- 인증: Supabase Auth
- 이미지: Supabase Storage

현재 없는 것:

- 구독 상품 테이블
- 유저 구독 상태 테이블
- entitlement 테이블
- 결제 검증 이력 테이블

즉, 현재 앱은 멀티펫 기능은 있으나 구독 상태를 저장할 영속 레이어가 없다.

## 3. 왜 entitlement 레이어가 필요한가

`user_subscriptions`만으로 앱 권한을 바로 판단하면 운영이 불안정해진다.

이유:

- 플랫폼 결제 상태와 실제 앱 권한 상태는 항상 1:1로 단순하지 않다
- grace period, revoke, legacy granted, 운영자 수동 부여 같은 예외가 생긴다
- 클라이언트는 단순하고 빠르게 `현재 멀티펫 허용 여부`만 판단할 수 있어야 한다

따라서 권장 구조는 아래 두 층이다.

- 원본 결제 상태: `user_subscriptions`
- 앱 권한 상태: `user_entitlements`

## 4. 권장 테이블

### 4-1. `user_subscriptions`

역할:

- App Store / Google Play 구독 원본 상태 저장
- 플랫폼 영수증/거래 식별자 추적
- 만료/갱신/취소/복원 히스토리 반영

권장 컬럼:

- `id uuid primary key`
- `user_id uuid not null`
- `provider text not null`
- `product_id text not null`
- `status text not null`
- `started_at timestamptz null`
- `expires_at timestamptz null`
- `original_transaction_id text null`
- `latest_transaction_id text null`
- `validated_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

권장 status:

- `active`
- `grace`
- `expired`
- `revoked`

권장 인덱스:

- `idx_user_subscriptions_user_id`
- `idx_user_subscriptions_provider_transaction`
- `idx_user_subscriptions_status_expires_at`

### 4-2. `user_entitlements`

역할:

- 앱이 실제로 참조할 권한 상태
- 멀티펫 등록 가능 여부 판단
- 운영자 부여/legacy 허용 같은 예외 처리 수용

권장 컬럼:

- `id uuid primary key`
- `user_id uuid not null`
- `feature_key text not null`
- `status text not null`
- `source text not null`
- `max_pet_count integer not null`
- `effective_from timestamptz null`
- `effective_until timestamptz null`
- `updated_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`

현재 기능 기준 `feature_key`:

- `multi_pet`

권장 status:

- `active`
- `inactive`

권장 source:

- `subscription`
- `admin`
- `legacy`

권장 인덱스:

- `uq_user_entitlements_user_feature`
- `idx_user_entitlements_feature_status`

### 4-3. `billing_events`

역할:

- 영수증 검증/웹훅/복원/만료 이벤트 로그
- CS와 장애 분석용 감사 로그

권장 컬럼:

- `id uuid primary key`
- `user_id uuid null`
- `provider text not null`
- `event_type text not null`
- `product_id text null`
- `transaction_id text null`
- `payload jsonb not null`
- `processed_at timestamptz null`
- `result_status text not null`
- `created_at timestamptz not null default now()`

중요:

초기 MVP에서는 `billing_events`를 축소할 수 있다.
하지만 장기 운영 기준에서는 넣는 것이 맞다.

## 5. 권장 관계

- `profiles.user_id` 1 : N `user_subscriptions.user_id`
- `profiles.user_id` 1 : N `billing_events.user_id`
- `profiles.user_id` 1 : N `user_entitlements.user_id`

현재 핵심 권한은 `multi_pet` 1개이므로, 실질 운영상 `user_entitlements`는 유저당 1행에 가깝게 움직일 수 있다.

## 6. `pets` 테이블과의 관계

현재 `pets`는 그대로 유지한다.

중요:

- `pets`에 `is_paid_pet` 같은 컬럼을 바로 넣는 방향은 현재 기준 비권장
- 멀티펫 허용 여부는 유저 권한 문제이지, 펫 개별 row 속성으로 풀 문제가 아니다

권장 판단 방식:

1. 현재 유저의 entitlement 확인
2. 현재 유저의 pets count 확인
3. 새 펫 생성 허용 여부 결정

## 7. 권장 서버 판단 규칙

### 무료 유저

- `max_pet_count = 1`

### 유료 유저

- `max_pet_count >= 2`

### 생성 가능 여부 판단

예시 규칙:

- `current_pet_count < max_pet_count` 이면 생성 가능
- 아니면 차단

중요:

이 판단은 클라이언트가 아니라 서버 기준이어야 한다.

## 8. 만료 정책과 DB 반영

권장 정책:

- 구독 만료 후 entitlement를 바로 `inactive`로 내릴 수는 있다
- 하지만 기존 `pets` 데이터는 삭제하지 않는다
- 읽기 권한은 유지하고, 새 등록만 제한한다

즉 DB에서 펫 row를 건드리는 것이 아니라, entitlement만 바뀐다.

## 9. 권장 RLS 방향

현재 구독용 테이블이 새로 생기면 RLS도 분리돼야 한다.

### `user_subscriptions`

- 일반 유저는 본인 row만 read 가능
- write는 앱 클라이언트가 직접 하지 않는 방향 권장
- 서버 검증 또는 secure function 기준 권장

### `user_entitlements`

- 일반 유저는 본인 row read 가능
- 일반 유저 write 금지
- admin/service role만 update 가능

### `billing_events`

- 일반 유저 read 금지 또는 제한적 read
- admin/service role 전용에 가깝게 운용

## 10. 현재 시점 권장 결론

멀티펫 구독은 단순 결제 테이블 하나로 끝내면 안 된다.

현재 NURI 기준 권장 구조는:

1. `user_subscriptions`
2. `user_entitlements`
3. `billing_events`

이 3축이다.

초기 구현은 1, 2번부터 시작할 수 있지만,
장기 운영까지 보면 3번도 결국 필요하다.
