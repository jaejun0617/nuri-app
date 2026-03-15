# 집사 꿀팁 가이드 웹 CMS 챕터 2 구현 상세

## 1. 문서 목적

이 문서는 `nuri-web` 기준 집사 꿀팁 가이드 웹 CMS 챕터 2의 범위와 구현 구조를 정리한다.

이번 챕터의 목적은 아래를 실제 서비스 기준으로 여는 것이다.

- 신규 가이드 등록
- 기존 가이드 수정
- `draft / published / archived / is_active` 상태 변경
- 운영 메타 저장
- 저장 후 목록/상세 반영

이미지 업로드는 이번 챕터에서 제외하고, 이미지 URL 메타 입력까지만 유지한다.

## 2. 챕터 2 범위

이번 챕터 2 완료 기준:

- `/admin/guides/new`
- `/admin/guides/[id]/edit`
- 등록/수정 폼
- status 변경
- `is_active` 변경
- `priority / sort_order / rotation_weight` 수정
- `tags / target_species / species_keywords / search_keywords` 수정
- `age policy` 수정
- 저장 성공 후 목록/상세 반영

이번 챕터에서 의도적으로 넘기는 범위:

- 이미지 업로드
- 썸네일/대표 이미지 파일 업로드
- 운영 리포트
- 추천/검색 운영 고도화

## 3. 챕터 1과의 연결

챕터 1은 읽기 구조를 여는 단계였다.

- 공개 메인
- 로그인
- 관리자 목록
- 관리자 상세
- role guard

챕터 2는 그 위에 쓰기 흐름을 추가한다.

- 목록 → 등록
- 목록 → 상세
- 상세 → 수정
- 저장 후 상세 복귀

즉, 챕터 1 구조를 깨뜨리지 않고 `읽기 + 쓰기 최소 CMS`까지 여는 단계다.

## 4. 등록/수정/상태 변경 계약

### 4.1 직접 입력 필드

- `title`
- `slug`
- `summary`
- `body`
- `body_preview`
- `category`
- `tags`
- `target_species`
- `species_keywords`
- `search_keywords`
- `age_policy_type`
- `age_policy_life_stage`
- `age_policy_min_months`
- `age_policy_max_months`
- `status`
- `is_active`
- `priority`
- `sort_order`
- `rotation_weight`
- `published_at`
- `thumbnail_image_url`
- `cover_image_url`
- `image_alt`

### 4.2 파생/자동 처리 필드

- `archived_at`
  - `status = archived`면 자동 세팅
  - 다른 상태면 `null`
- `deleted_at`
  - 이번 챕터에서는 직접 쓰지 않음
- `created_at`, `updated_at`
  - DB 기준 자동 관리

## 5. 폼 필드 정의

### 5.1 필수값

- `title`
- `slug`
- `summary`
- `body`
- `body_preview`
- `category`
- `target_species` 최소 1개

### 5.2 선택값

- `tags`
- `species_keywords`
- `search_keywords`
- `published_at`
- `thumbnail_image_url`
- `cover_image_url`
- `image_alt`
- `age_policy_life_stage`
- `age_policy_min_months`
- `age_policy_max_months`

### 5.3 기본값

- `category = daily-care`
- `status = draft`
- `is_active = true`
- `target_species = ['common']`
- `age_policy_type = all`
- `priority = 0`
- `sort_order = 0`
- `rotation_weight = 1`

### 5.4 normalize 규칙

- `slug`, `title`, `summary`, `body`, `body_preview`는 trim
- `tags`, `species_keywords`, `search_keywords`는 쉼표 구분 → trim → 빈값 제거 → 중복 제거
- `priority`, `sort_order`는 정수 변환
- `rotation_weight`는 최소 1
- `published_at`는 `datetime-local` 입력을 ISO로 변환
- `status = published`면 `published_at`이 비어 있어도 현재 시각으로 보정
- `status = archived`면 `archived_at` 자동 세팅

## 6. validation 규칙

실제 validation 기준:

- 제목 없음: `제목을 입력해 주세요.`
- 슬러그 없음: `슬러그를 입력해 주세요.`
- 요약 없음: `요약을 입력해 주세요.`
- 본문 미리보기 없음: `본문 미리보기를 입력해 주세요.`
- 본문 없음: `본문을 입력해 주세요.`
- 대상 종 없음: `대상 종을 한 개 이상 선택해 주세요.`
- 연령 범위인데 최소/최대 모두 없음: `연령 범위를 쓰려면 최소 또는 최대 개월 수를 입력해 주세요.`
- 연령 범위 최소값 > 최대값: `연령 범위의 최소값이 최대값보다 클 수 없어요.`
- 숫자 필드 비정상: 각 필드별 개별 메시지 노출

## 7. 저장 흐름

저장 흐름은 아래로 정리한다.

1. 클라이언트 폼 입력
2. 서버 액션 제출
3. 서버에서 normalize
4. 서버에서 validation
5. Supabase `pet_care_guides` insert/update
6. 목록/상세 revalidate
7. 성공 시 상세 화면 redirect

성공 후 이동:

- 신규 등록: `/admin/guides/[id]?saved=created`
- 수정 완료: `/admin/guides/[id]?saved=updated`

## 8. 권한 구조

챕터 1의 서버 가드를 그대로 유지한다.

- `/admin/guides/new`
- `/admin/guides/[id]/edit`

위 라우트는 모두 `admin`, `super_admin`만 접근 가능하다.

## 9. 이미지 업로드 처리 여부

이번 챕터에서는 이미지 업로드를 넘긴다.

대신 아래는 유지한다.

- `thumbnail_image_url`
- `cover_image_url`
- `image_alt`

즉, 이번 챕터는 **파일 업로드 없이 메타 입력만 가능한 상태**다.

## 10. 다음 챕터 확장 계획

챕터 3:

- 이미지 업로드
- 업로드 후 미리보기
- 썸네일 / 대표 이미지 정책 정리

챕터 4:

- 운영 리포트
- 추천 운영
- 검색 운영
