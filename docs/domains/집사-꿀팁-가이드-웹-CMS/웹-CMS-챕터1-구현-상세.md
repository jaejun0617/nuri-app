# 집사 꿀팁 가이드 웹 CMS 챕터 1 구현 상세

## 1. 문서 목적

이 문서는 집사 꿀팁 가이드의 최종 운영 방향을 **웹 관리자 페이지(CMS)** 기준으로 정리하고, `nuri-web` 프로젝트에서 시작하는 웹 CMS 챕터 1의 범위와 구현 구조를 남긴다.

이번 챕터의 목적은 예쁜 관리자 웹을 만드는 것이 아니라, 실제 서비스 운영 기준으로 아래 구조를 올바르게 여는 것이다.

- 별도 웹 프로젝트 시작
- 앱/웹 공통 로그인 구조 정리
- 관리자 권한 가드 정리
- 읽기 중심 CMS 라우트 개방
- 운영 계약 정리

## 2. 왜 웹 CMS가 필요한가

집사 꿀팁 가이드의 장기 운영은 앱 관리자 화면이 아니라 웹 CMS가 기준이어야 한다.

이유:

- 긴 본문 작성과 수정이 PC에서 훨씬 쉽다.
- 태그, 카테고리, 상태, 우선순위 관리가 쉽다.
- 이미지 업로드와 미리보기가 모바일보다 안정적이다.
- 목록, 검색, 필터, 정렬, 대량 관리가 훨씬 효율적이다.
- 운영자는 실제로 모바일보다 PC에서 관리하는 편이 더 자연스럽다.
- 가이드 수가 많아질수록 앱 관리자 화면보다 웹 CMS가 훨씬 안정적이다.

## 3. 왜 `nuri-web` 별도 프로젝트로 가는가

이번 웹 CMS는 React Native 앱 폴더인 `nuri` 안에 넣지 않고, 프로젝트 상위 레벨의 형제 프로젝트 `nuri-web`으로 시작한다.

구조:

- `nuri`
  - React Native 앱
  - 사용자 조회 / 소비 채널
- `nuri-web`
  - 공개 메인 페이지
  - 로그인
  - 웹 관리자 페이지(CMS)
- Supabase
  - 앱/웹 공통 source of truth

이렇게 분리하는 이유:

- 모바일 앱과 웹 배포/빌드/런타임 책임을 분리할 수 있다.
- 웹 전용 라우팅, SSR, 권한 가드, 관리자 UI를 React Native 구조와 섞지 않아도 된다.
- 이후 공개 대표 웹과 관리자 CMS를 같은 웹 프로젝트 안에서 자연스럽게 확장할 수 있다.
- 필요하면 장기적으로 공개 웹과 관리자 웹을 다시 분리할 여지도 남긴다.

## 4. 앱과 웹 로그인 공유 구조

앱과 웹은 같은 Supabase Auth 계정을 공유한다.

기준:

- 앱 이메일/비밀번호 로그인과 웹 이메일/비밀번호 로그인이 같은 `auth.users` 계정을 사용한다.
- 세션은 앱과 웹에서 각각 별도로 유지된다.
- 권한은 앱과 웹 모두 `profiles.role` 기준으로 해석한다.

권한 해석:

- `user`
  - 공개 메인, 로그인은 가능
  - `/admin` 접근 불가
- `admin`
  - `/admin` 접근 가능
- `super_admin`
  - `/admin` 접근 가능

## 5. 이번 챕터 1 범위

이번 챕터 1은 읽기 중심 최소 범위로 본다.

포함 범위:

- 운영 계약 정리
- 공개 메인 페이지 초안
- 로그인 페이지 초안
- 관리자 가이드 목록 화면
- 관리자 가이드 상세 조회 화면
- 상태 필터
- 검색
- 정렬
- role guard
- 환경변수 / Supabase 연동 기본 구조

이번 챕터에서 의도적으로 넘긴 범위:

- 등록/수정 폼 실제 구현
- 발행/보관/비활성화 쓰기 동작
- 이미지 업로드
- 운영 리포트
- 추천 운영 고도화

## 6. 기술 구조

이번 챕터 1의 기술 선택은 아래 기준이다.

- 프레임워크: Next.js App Router
- 언어: TypeScript
- 인증/데이터: Supabase
- 렌더링 기준:
  - 공개 메인 / 관리자 읽기 화면은 서버 컴포넌트 우선
  - 로그인 폼은 클라이언트 컴포넌트

이 조합이 맞는 이유:

- App Router는 공개 웹과 관리자 라우트를 같이 운영하기 좋다.
- 서버 컴포넌트에서 세션과 권한을 읽기 쉽다.
- Supabase SSR 연동과 route guard를 붙이기 자연스럽다.
- 챕터 2 이후 등록/수정/이미지 업로드로 확장하기 좋다.

## 7. 권한 구조

이번 챕터 1 권한 구조는 아래로 간다.

- `/`
  - 누구나 접근 가능
- `/login`
  - 누구나 접근 가능
- `/admin/*`
  - `profiles.role in ('admin', 'super_admin')`만 접근 가능

구현 기준:

- 서버 컴포넌트에서 세션 확인
- `profiles.role` 조회
- 관리자 아니면 `/` 또는 `/login`으로 redirect

즉, 이번 챕터는 middleware보다 **서버 컴포넌트 + 서버 가드** 조합으로 시작한다.

이유:

- 챕터 1은 읽기 중심이라 구조가 단순한 편이 좋다.
- role 해석을 화면 단과 가깝게 두는 편이 현재 범위에 더 적합하다.
- 이후 필요하면 middleware를 추가해도 된다.

## 8. 운영 계약 정리

### 8.1 목록에서 필요한 필드

- `id`
- `slug`
- `title`
- `summary`
- `category`
- `tags`
- `target_species`
- `status`
- `is_active`
- `priority`
- `sort_order`
- `rotation_weight`
- `published_at`
- `archived_at`
- `deleted_at`
- `thumbnail_image_url`
- `cover_image_url`
- `image_alt`
- `created_at`
- `updated_at`

### 8.2 상세에서 필요한 필드

목록 필드 +

- `body`
- `body_preview`
- `species_keywords`
- `search_keywords`
- `age_policy_type`
- `age_policy_life_stage`
- `age_policy_min_months`
- `age_policy_max_months`

### 8.3 이후 등록/수정 폼에서 필요한 필드

- `id`
- `slug`
- `title`
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
- `archived_at`
- `deleted_at`
- `thumbnail_image_url`
- `cover_image_url`
- `image_alt`

## 9. 화면 설계

### 9.1 공개 메인 페이지

역할:

- `nuri-web`의 시작점
- 로그인 진입
- 관리자 권한이 있으면 관리자 진입 링크 노출
- 웹 CMS 챕터 진행 상태와 역할 분리 설명

판단:

- 메인 페이지 헤더에 로그인 메뉴를 두는 구조가 맞다.
- 로그인 후 관리자 권한이 있을 때만 관리자 진입 링크를 보여주는 것이 맞다.

### 9.2 로그인 화면

역할:

- 앱과 같은 Supabase Auth 계정으로 로그인
- 로그인 후 `/admin/guides`로 진입
- role은 로그인 자체가 아니라 관리자 라우트에서 판단

### 9.3 관리자 가이드 목록 화면

포함 요소:

- 검색
- 상태 필터
  - `draft`
  - `published`
  - `archived`
- 활성 상태 필터
  - `active`
  - `inactive`
- 정렬
  - 최신 수정순
  - 우선순위순
  - `sort_order` 순
- 로딩 / 빈 상태 / 에러 상태

운영자 관점 정보:

- status
- is_active
- category
- priority
- sort_order
- published_at
- updated_at

### 9.4 관리자 가이드 상세 조회 화면

포함 요소:

- 운영 메타
- 본문
- body_preview
- 검색 키워드
- species 키워드
- age policy
- 이미지 메타
- created_at / updated_at / published_at / archived_at / deleted_at

## 10. 라우트 구조

현재 챕터 1에서 실제로 여는 라우트:

- `/`
- `/login`
- `/admin`
- `/admin/guides`
- `/admin/guides/[id]`

다음 챕터에서 여는 라우트:

- `/admin/guides/new`
- `/admin/guides/[id]/edit`

## 11. 앱 관리자 브릿지와의 관계

현재 앱 안 관리자 화면은 브릿지 단계다.

정리:

- 지금은 앱 관리자 화면으로 최소 운영 흐름을 확인할 수 있다.
- 하지만 장기 운영은 웹 CMS로 이동한다.
- 웹 CMS가 안정화되면 앱 관리자 화면은
  - 긴급 운영용
  - 최소 점검용
  - 또는 축소/제거
  방향으로 정리하는 것이 맞다.

## 12. 챕터 2 이후 확장 계획

웹 CMS 챕터 2:

- 등록/수정 폼
- 발행/보관/비활성화 쓰기 동작
- validation
- slug / body_preview / 태그 입력 UX

웹 CMS 챕터 3:

- 이미지 업로드
- 미리보기
- 썸네일/대표 이미지 정책

웹 CMS 챕터 4:

- 운영 리포트
- 검색 운영
- 추천 운영
- 캠페인/시즌 운영

## 13. 이번 턴 실제 생성 범위

이번 턴에서 실제로 생성/구성한 것:

- 프로젝트 상위 레벨 `nuri-web` 생성
- Next.js + TypeScript + App Router 초기화
- Supabase 웹 패키지 추가
- `.env.example` 추가
- 공개 메인 페이지 추가
- 로그인 페이지 초안 추가
- `/admin` role guard 추가
- 가이드 목록 읽기 화면 추가
- 가이드 상세 읽기 화면 추가
