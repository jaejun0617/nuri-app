# 🌈 NURI : Emotion-Driven Digital Memory Archive Platform

## 출시 상태

### 완료

- Sentry 연동
- 오프라인/네트워크 실패 UX 1차 정리
- 로그아웃 / 회원탈퇴 플로우
- 약관 / 개인정보 / 마케팅 동의 저장 이력 연동 및 조회 검증
- 이미지 업로드 실패 복구 큐
- 기록 임시저장 복구
- 타임라인 최근 12주 히트맵
- 홈 이번 주 요약 카드
- QA 회귀 테스트 1차 구축
- Android 홈 위젯
- 펫 테마 선택 UI
- Maestro E2E 스모크 플로우

### 보류중

- Crashlytics 실제 수집 검증 마감

### 출시 전 필수

- Crashlytics 실수집 확인 및 최종 마감
- 최종 배포 전 QA 전체 점검
- 스토어 배포용 release 빌드 기준 모니터링 재검증

> **기억은 사라지지 않습니다. 우리는 아이를 잊지 않습니다.**

<br/>

## 0. Why NURI?

NURI는 창업자의 개인적인 상실 경험에서 시작되었습니다.

사랑하는 반려견을 떠나보낸 이후, 가족이 깊은 슬픔 속에서 감정을 정리하지 못하는 모습을 보며 **감정을 구조화할 수 있는 디지털 공간의 필요성**을 느꼈습니다.

**NURI는 단순한 추모 앱이 아닙니다.**  
누구나 사용할 수 있는 앱이며, 사랑하는 반려동물의 매 순간을 기억하고 기록하는 **감정 데이터를 기반으로 기억을 구조화하는 플랫폼**입니다.

---

## 1. 서비스 개요

NURI는 반려동물을 떠나보낸 보호자, 또는 아이의 추억을 체계적으로 기록하고 싶은 보호자를 위한 **디지털 메모리얼 & 감정 기록 플랫폼**입니다.

### 1.1 핵심 가치

| 핵심 개념               | 설명                                           |
| ----------------------- | ---------------------------------------------- |
| 🧩 **기억 구조화**      | 감정/태그 기반의 체계적 기억 아카이빙          |
| 📊 **감정 데이터 축적** | 감정 태그/히스토리 누적 및 분석 확장 기반      |
| 🔄 **회상 알고리즘**    | 서버 고정 방식의 일관된 Daily Recall 시스템    |
| 🏗 **확장성**            | 커뮤니티, 유료 구독(AI), 기념일/알림 확장 구조 |

### 1.2 상세 기능(현재 방향)

**① 개인화(Profiles / Auth 연동)**

- 로그인 시 `profiles.nickname` 기반으로 `"{닉네임}님, 반가워요!"` 노출 (없으면 `"반가워요!"`)
- 세션/닉네임/펫 목록을 앱 부팅에서 자동 복원(AsyncStorage + Supabase session sync)

**② 반려동물 프로필(Pets)**

- 이름/생일/몸무게/입양일(함께한 시간) + 태그(좋아하는 것/취미 등)
- `death_date` nullable로 추모 UI/기념일/메시지 로직 확장 대비

**③ 아카이빙(=Memories) & 타임라인**

- 사진 업로드 + 제목/내용 + 감정 태그 + 태그(text[]) + 날짜(occurredAt)
- 홈: “요약 화면(최근 기록 위젯)”
- 타임라인: “전체 탐색 화면(무한 스크롤 + 정렬/검색/월 점프)”
- 상세/수정/삭제(삭제 시 Storage 파일까지 정리)

**④ 정서적 교감(편지/AI 메시지)**

- 아이에게 남기는 편지(letters)
- 구독/결제 기반 AI 답장(Edge Function + 구독 상태 + ai_messages 저장 구조로 확장)

**⑤ 멀티 반려동물 지원(미니 프로필 전환 우선)**

- 헤더 우측: **미니 프로필(썸네일)** + 원형 (＋)
- (＋) → 반려동물 추가 등록
- 썸네일 클릭 → 다른 아이로 즉시 전환
- 전역 상태: `pets[]`, `selectedPetId` (레이아웃은 유지, 데이터만 교체)

### 1.3 UI/UX 및 네비게이션

- 하단 탭: `[홈] - [타임라인] - [기록하기] - [전체메뉴]`
- 홈은 “요약”, 타임라인은 “전체 탐색”으로 역할 분리
- Timeline 탭 내부 Stack(`TimelineMain -> RecordDetail -> RecordEdit`)으로 구성해 상세/수정에서도 하단 탭을 유지

---

## 2. Problem Definition

| #     | 문제                                     |
| :---- | :--------------------------------------- |
| **1** | 장례 이후 장기적 기억을 관리할 공간 부족 |
| **2** | 감정 정리를 도와주는 구조 부재           |
| **3** | 체계적인 타임라인 관리 부족              |
| **4** | 기일 관리 시스템 부재                    |
| **5** | 감정 데이터를 축적·분석하는 서비스 부족  |

> 💡 **문제의 본질은 사진 저장이 아닌, 감정 관리 구조의 부재입니다.**

---

## 3. Core Value

- 보호자 중심 UX
- 감정 기반 데이터 구조(태그/감정/회상)
- 서버 고정 로직(Daily Recall / AI 메시지 / 캐싱)
- 확장 가능한 도메인 모델(추모/구독/커뮤니티)

---

## 4. Tech Stack

| 영역            | 기술                                                                           |
| --------------- | ------------------------------------------------------------------------------ |
| **Mobile**      | React Native CLI · TypeScript · React Navigation · Zustand · styled-components |
| **Backend**     | Supabase (Auth · PostgreSQL · Storage · RLS) · Edge Functions                  |
| **Android**     | Gradle 8.13 · AGP 8.6 · Kotlin 2.1 · AsyncStorage v3                           |
| **RN Polyfill** | `react-native-url-polyfill` · `react-native-get-random-values` · `buffer`      |

---

## 5. 아키텍처 원칙

- Feature-based 분리(화면/서비스/스토어)
- 서버 상태(Supabase) / UI 상태(Zustand) 분리
- **서버 기준 설계:** 일관성은 서버에서, 클라이언트는 단순하게
- 확장 대비: `death_date` / `subscriptions` / `community` 사전 설계
- RN New Architecture 안전: **동일 참조 fallback(Object.freeze)**로 snapshot 흔들림 방지

---

## 6. MVP Scope

- **Phase 1:** Auth · Pet Profile · Memory CRUD · Timeline · Daily Recall(서버 고정)
- **Phase 2:** Emotion Tracking · AI 메시지/챗 · Push · IAP
- **Phase 3:** Community Feed · Comments · Likes · Notifications

---

## 6.1 현재 구현 상태

### 완료

- Auth 연동 + 세션 복원
- Pet CRUD + `selectedPetId` 유지
- Memory CRUD + Storage cleanup
- BottomTab + RootStack 분리
- Signed URL 캐싱 + cursor pagination + prefetch
- Timeline sticky 정렬/검색 + 월 점프 기본 구조
- LoggedInHome 리디자인 및 Today Records Slider

### 진행 중

- Records 화면군 UI/타입/스타일 구조 통일
- Timeline 성능 최적화 후속 정리
- Home 감성 UX 디테일 고정

### 예정

- 서버 검색(`title`, `tags`)
- Daily Recall 서버 고정 완성
- AI 메시지 / 구독 / 결제
- Community / 알림 / 상호작용 기능

---

## 7. Core Features Architecture (Draft)

### 7.1 Memory System (기록)

```text
memories
├── pet_id
├── title
├── content
├── image_url (storage path)
├── emotion
├── tags (text[])
└── occurred_at
```

### 7.2 Daily Recall Engine (서버 고정)

```text
daily_recall
├── pet_id
├── date
├── memory_id
└── mode (anniversary | random | emotion_based)
```

### 7.3 Subscription / Feature Gating

```text
subscriptions
├── user_id
├── tier
├── started_at
├── expires_at
└── store_receipt
```

---

## 8. Supabase Database / Storage / Security

✅ **스키마 + RLS + Storage “뼈대”를 먼저 고정**  
기능을 추가해도 DB를 갈아엎지 않도록 기반을 선확정했습니다.

### 8.1 핵심 테이블(요약)

```sql
profiles        id(auth.uid) · nickname · avatar_url · created_at

pets            id · user_id · name · birth_date · adoption_date · weight_kg
                likes[] · dislikes[] · hobbies[] · personality_tags[] · death_date(nullable)
                profile_image_url(path) · created_at · updated_at

memories        id · pet_id · image_url(path) · title · content · emotion · tags(text[])
                occurred_at · created_at

letters         id · pet_id · content · is_ai_generated · created_at

daily_recall    id · pet_id · date · memory_id · mode

subscriptions   id · user_id · tier · expires_at · store_receipt · created_at
```

> 참고: 과거 문서/코드에서 `records` 용어가 보일 수 있으나, 앱 구현은 `memories` 기준으로 정리합니다.

### 8.2 Storage 버킷(최종 확정)

- `pet-profiles`
- `memory-images`

**원칙**

- DB에는 **full URL 저장 금지**, Storage **path만 저장**
- 렌더링 시점에 URL 변환(public 또는 signed)
- `memory-images`는 **private + signed URL**을 기본으로 사용

### 8.3 RLS 기본 원칙

- 모든 테이블 RLS 활성화
- 사용자 본인 데이터만 CRUD 가능(`auth.uid()` / owner 기반)

---

## 9. App Boot(부팅) 순서 고정

```text
hydrate(AsyncStorage)
  → supabase.auth.getSession()
  → (session) profiles.nickname fetch
  → pets fetch → selectedPetId 정렬
  → onAuthStateChange로 로그인/로그아웃 동기화
```

---

## 10. 설치 패키지(현재 프로젝트 기준)

✅ “지금 단계에서 반드시 필요한 것들”만 설치하고, 나머지는 필요 시 추가합니다.

- **Core**
  - `@supabase/supabase-js`
  - `@react-native-async-storage/async-storage`
  - `react-native-url-polyfill`
  - `react-native-get-random-values`
  - `buffer`
  - `zustand`
- **Navigation**
  - `@react-navigation/native`
  - `@react-navigation/native-stack`
  - `@react-navigation/bottom-tabs`
  - `react-native-screens`
  - `react-native-safe-area-context`
  - `react-native-gesture-handler`
- **Media**
  - `react-native-image-picker`

---

# 🛠 Development Logs & Progress Updates

> 규칙: “문제 1개 해결 → (1) 커밋 → (2) README 누적 문서화 → (3) 다음 챕터 트리거 문장”

## ✅ Chapter 1 — Pet CRUD (실데이터 연결)

- pets row → 앱 타입 매핑(배열/숫자 방어)
- **DB에는 path만 저장**, 렌더링에서 URL 변환
- PetCreate 온보딩(이미지 선택 → 업로드 → path 저장 → 재조회 → Main reset)
- AppProviders 부팅에서 pets 자동 fetch + auth 이벤트 동기화
- Logged-in 홈: pets 0마리면 PetCreate 자동 유도 + 헤더 (＋) 연결

## ✅ Chapter 2 — Android Storage 업로드 안정화(BlobUtil 기반)

- Android `content://` 업로드 파이프라인 안정화(BlobUtil 기반)
- includeBase64 의존 제거(대용량/메모리 리스크 감소)
- Android 권한 정리(READ_MEDIA_IMAGES/READ_EXTERNAL_STORAGE 등)
- 버킷명 통일: `pet-profiles`, `memory-images`
- 이미지 포함 등록 end-to-end 성공 고정

## ✅ Chapter 3 — Memory CRUD 완성(Create/Read/Edit/Delete + Storage Cleanup)

- Memory 생성/조회/수정/삭제 흐름 고정
- 삭제 시 Storage 파일까지 함께 제거(`deleteMemoryWithFile`)
- Detail에서 삭제: optimistic remove → refresh로 정합성 보장

## ✅ Navigation Architecture Refactor (RootStack + AppTabs)

- Splash 제외 전 화면 공통 BottomTab 적용
- RecordDetail/RecordEdit는 “몰입 화면”으로 Stack 영역에서 표시
- 탭 진입 시 `petId` fallback 규칙 고정:
  - `route params -> selectedPetId -> pets[0]`

## ✅ Chapter 6 — Signed URL 캐싱 + Cursor Pagination + Prefetch 고정

### 6.1 Signed URL 캐싱(TTL)

- key=`imagePath`(storage path)
- value=`{ url, expiresAtMs }`
- 만료 60초 전부터 자동 갱신(깜빡임 방지)

### 6.2 Cursor 기반 pagination(`created_at desc`)

- 최초: `order(created_at desc) + limit(N)`
- 다음: `lt(created_at, cursor) + order(created_at desc) + limit(N)`
- 응답: `nextCursor=마지막 createdAt`, `hasMore=items.length===limit`

### 6.3 Prefetch 전략

- 목록 fetch 후 상단 N개(기본 10개) signed URL 선 캐싱
- 홈/타임라인/상세에서 반복 렌더 시 네트워크 호출 감소

## ✅ Chapter 6-1 — Timeline UX 고정(Sticky 정렬/검색 + 월 점프 + Debounce)

- 컨트롤 바를 `stickyHeaderIndices`로 고정
- 정렬: **store는 항상 최신순 유지**, 화면에서만 reverse
- 검색(제목/태그) + debounce
- 월/연도 필터 + 섹션 점프(`scrollToIndex`)
- 검색 중 자동 `loadMore`는 OFF + footer 수동 버튼 제공
- RN New Architecture 대비: 동일 참조 `EMPTY_ITEMS/FALLBACK_STATE`로 렌더 안정성 고정

## ✅ Chapter 6-2 — RecordCreate 타입 안정화 + 스타일 분리

- `RecordCreateTab`이 `petId`를 optional param으로 받을 수 있도록 탭 라우트 타입 정식화
- `RecordCreateScreen`에서 `any` navigation / route 사용 제거
- `CompositeNavigationProp` + `RouteProp` 적용으로 탭 이동 타입 안전성 확보
- 이미지 선택 시 MIME type을 `asset.type -> fileName -> uri` 순서로 추론하도록 보강
- 에러 처리 로직을 `unknown` 기반 메시지 함수로 통일
- `RecordCreateScreen` 인라인 스타일 제거
- `RecordCreateScreen.styles.ts`로 스타일 분리하여 Records 화면군 구조 통일
- `petId` 해석 규칙 유지:
  - `route.params.petId -> selectedPetId -> pets[0]`

## ✅ Chapter 6-3 — Home 오늘의 사진 복구 + LoggedInHome 타입 정리

- `homeRecall`의 오늘의 사진 후보 선택 로직을 `imageUrl` 기준에서 `imagePath` 기준까지 포함하도록 수정
- 리스트 fetch 단계에서 `imageUrl`이 비어 있어도 홈의 "오늘의 사진"이 정상 선택되도록 복구
- `LoggedInHome`의 today photo 렌더 경로를 `imagePath -> signed URL 캐시` 흐름과 정합되게 유지
- `LoggedInHome` 내부의 `any` / `as any` 제거
- 탭 이동과 스택 이동 타입을 정리하여 HomeTab / RootStack 네비게이션 사용 구분
- `useNavigation()` 중복 호출 구조를 정리하여 Hook order warning 방지
- `InteractionManager.runAfterInteractions()`를 제거하고 `requestIdleCallback` 기반 idle scheduler로 변경
- RN 경고 없이 signed URL prefetch가 비동기 idle 타이밍에 실행되도록 수정

## ✅ Chapter 6-4 — RecordCreate 리디자인 + 타임라인 카테고리 정합화

- `RecordCreateScreen`을 이미지 중심 작성 화면으로 전면 리디자인
- 상단 `취소 / 기록하기 / 완료` 헤더 구조로 재구성
- 날짜 영역을 카드형 CTA로 정리하고, `오늘 / 어제 / 직접입력` 모달 흐름 추가
- 사진 업로드 영역을 점선 박스 + 미리보기/변경/제거 구조로 정리
- 태그 입력을 일반 입력창에서 `태그 추가` 바텀시트 스타일 모달로 변경
- 추천 태그 / 최근 사용 / 선택 태그 제거 흐름 추가
- 기록하기 분류 기준을 타임라인과 동일한 축으로 정리
  - `산책 / 식사 / 건강 / 일기장 / 기타`
- `기타` 선택 시 세부 분류를 추가
  - `미용 / 병원·약 / 기타`
- 저장 시 메인 분류 + 세부 분류가 타임라인 필터에서 읽을 수 있는 태그 조합으로 저장되도록 정리
- `TimelineScreen`의 카테고리 판별 로직이 태그 기반 저장도 인식하도록 보강
- `산책`으로 저장한 기록이 `전체`에는 보이지만 `산책` 필터에는 보이지 않던 정합성 이슈 수정
- `TimelineTab`이 `petId` optional param을 받을 수 있도록 탭 라우트 타입 정리

## ✅ Chapter 6-5 — Home / Timeline / FAB 브랜드 컬러 정합화

- `LoggedInHome`의 메인 보라 톤을 `RecordCreate` / `Timeline`과 동일한 계열로 통일
- 홈 카드, 반려동물 스위처, 아코디언 포인트 컬러를 `#6D6AF8` 기반으로 재정렬
- 하단 탭의 활성 색상과 중앙 FAB 컬러를 같은 브랜드 톤으로 맞춤
- 홈의 반려동물 추가 `+` 아이콘까지 동일 계열로 정리
- 아코디언 구조는 유지한 상태로 시각 톤만 맞춰 홈 화면의 일관성을 확보

## ✅ Chapter 6-6 — Home Quick Actions + 펫 이름 기반 추천 팁 섹션 설계

- 로그인 홈의 `오늘날의 기록` 아래에 2x2 퀵 액션 카드를 추가
  - `산책일지 / 건강기록 / 식사기록 / 미용`
- 각 카드 클릭 시 `TimelineTab`으로 이동하면서 해당 카테고리 필터가 즉시 선택되도록 연결
  - `미용`은 `기타 > 미용` 서브카테고리까지 함께 전달
- 하단 탭의 타임라인 아이콘을 기존 `clock`에서 더 가벼운 라인 아이콘으로 교체
- 추천 섹션 타이틀을 고정 문구가 아닌 `펫 이름` 기준으로 렌더링
  - 예: `{petName}를 위한 추천 팁`
- 현재 추천 팁은 하드코딩 카드로 시작하지만, 추후 아래 입력값을 조합해 개인화 추천으로 확장할 수 있도록 설계 방향을 고정
  - 반려동물 기본 정보: 품종 / 나이 / 성별 / 체중 / 중성화 여부
  - 기록 패턴: 산책 빈도 / 식사 기록 / 건강 기록 / 미용 주기
  - 시즌성 힌트: 날씨 / 월별 관리 포인트 / 접종·검진 주기
  - 회상 데이터: 최근 자주 남긴 기록 카테고리와 감정 태그
  - 장기적으로는 `daily_recall`, `letters`, 구독 기능과 연결해 "오늘 이 아이에게 필요한 관리 팁"으로 확장 가능

## ✅ Chapter 6-7 — Home 하단 카드 UI 고정 + 타임라인 필터 딥링크 연결

- `LoggedInHome` 하단 퀵 액션 카드를 실제 화면에 반영
  - `산책일지 / 건강기록 / 식사기록 / 미용`
- 카드 아이콘은 홈 시안 톤에 맞춰 더 단순한 라인 아이콘으로 교체
  - 산책: `walk`
  - 건강: `medical-bag`
  - 식사: `silverware-fork-knife`
  - 미용: `content-cut`
- 각 카드는 `TimelineTab`으로 이동하면서 카테고리 파라미터를 직접 전달
  - `walk / meal / health`
  - `other + grooming`
- `TimelineScreen`은 route param으로 전달된 카테고리를 초기 필터 상태에 반영하도록 보강
- 추천 팁 섹션은 홈 상단 섹션 톤과 맞도록 타이포/간격을 단순화
- 퀵 액션 카드와 추천 팁 카드는 border를 제거하고, 카드 아래쪽에만 아주 얕은 shadow 레이어를 별도로 두어
  - 전체 외곽 shadow가 아니라
  - 바닥에서 살짝 떠 있는 듯한 깊이만 남기도록 조정
- 아바타 링은 `함께한 시간` pill과 같은 딥 보라를 기준색으로 맞추고,
  `LinearGradient + glow + shadow` 조합으로 radial-gradient에 가까운 분위기를 구현
- 이후 홈 정보 구조를 다시 정리하면서 퀵 액션 섹션을 프로필 카드 바로 아래로 이동
  - `자주 쓰는 기록`
  - `산책, 식사, 건강, 미용 기록을 바로 열어보세요`
- 사진/기록 구간의 리드 문구도 홈 흐름에 맞게 재정리
  - `오늘의 추억 둘러보기`
  - `사진과 기록을 천천히 살펴보세요`
- 퀵 액션 카드는 2x2 대신 한 줄 4개 레이아웃으로 압축해 빠른 진입 성격을 강화
- 퀵 액션 프레임은 보더와 shadow를 제거해 더 플랫한 인상으로 정리하고,
  추천 팁 카드는 가짜 레이어 없이 심플한 카드 구조로 유지

## ✅ Chapter 6-8 — Timeline Empty State 리디자인

- 타임라인 빈 상태를 홈/기록하기 톤과 맞는 감성형 empty state로 재구성
- `assets/logo/logo_v2.png`를 빈 상태 메인 심볼로 사용
- 원본 이미지의 큰 투명 여백을 제거하도록 `logo_v2.png` 자체를 크롭
  - 화면 스타일만 키우는 방식이 아니라, 실제 발바닥 로고가 더 크게 보이도록 asset 자체를 정리
- 발바닥 로고는 배경 원 없이 단독으로 크게 노출
  - `200 x 200`
- 필터 컨트롤 영역 아래 border를 제거해 상단이 더 가볍게 보이도록 조정
- 빈 상태 문구를 더 부드럽고 회상형 톤으로 변경
  - `아직 남겨진 추억이 없어요`
  - `우리 아이와 함께한 반짝이는 순간을`
  - `첫 기록으로 천천히 시작해보세요`
- CTA 버튼은 더 크고 안정적인 크기로 재설계하고,
  버튼 앞에 간단한 필기 아이콘을 넣어 “기록 시작” 의미를 강화
- 로고와 타이틀 사이 간격도 다시 조정해, 이미지가 커져도 전체 vertical rhythm이 무너지지 않도록 정리

## ✅ Chapter 6-9 — Home 프로필 수정 플로우 연결

- 로그인 홈의 프로필 카드 우측 상단 톱니바퀴를 `프로필 수정` 전용 화면으로 연결
- 프로필 수정 화면은 홈과 동일한 브랜드 톤(`#6D6AF8`)으로 재구성
  - 프로필 이미지 교체
  - 반려동물 이름 / 생일 / 입양일 / 품종
  - 성별 / 중성화 여부
  - 취미 / 좋아하는 것 / 싫어하는 것 / 태그
- 수정 완료 시 홈 카드와 아코디언 데이터가 즉시 반영되도록
  - `updatePet`
  - `fetchMyPets`
  - `setPets`
  흐름으로 정합성을 고정
- 프로필 이미지는 기존 `pet-profiles` 업로드 파이프라인을 재사용하여 변경 가능하도록 연결
- 태그는 칩 UI + 추천 태그 구조로 편집할 수 있게 구성
- 이름 변경은 실수 방지를 위해 최대 3회 제한을 적용
  - 현재 단계에서는 DB 컬럼이 없으므로 `AsyncStorage` 기반 로컬 카운트로 먼저 운영
  - 추후에는 `pets` 테이블에 별도 변경 횟수 컬럼을 두고 서버 기준으로 승격 가능
- 수정 완료 후에는 별도 완료 화면으로 전환해
  - 변경 성공 감각을 한 번 더 전달하고
  - 홈으로 자연스럽게 복귀하도록 UX를 마무리
- 이후 시안 톤에 맞춰 프로필 수정 화면 디테일을 추가 정리
  - 프로필 이미지는 더 크게 확대하고, 사진 자체를 눌러 바로 교체 가능하도록 단순화
  - 카메라 버튼은 원형 아바타 우하단 테두리를 걸치듯 배치
  - 헤더 왼쪽 액션은 `<` 대신 `취소` 텍스트로 바꿔 의도를 더 직관적으로 전달
  - 상단 헤더를 status bar와 조금 더 떨어뜨려 답답함을 완화
  - 태그는 최대 `10개`까지 확장
  - 태그 입력행은 `입력창 + 추가 버튼 + 개수 표시` 구조로 재정리
  - 추천 태그는 품종 태그보다 범용성이 높은 성향/행동 태그 위주로 교체
- 완료 화면은 화면 중앙 정렬로 다시 맞춰 성공 메시지가 더 또렷하게 읽히도록 조정

## ✅ Chapter 6-10 — Home 하단 확장 섹션 설계

- 추천 팁 아래에 홈 하단 전용 섹션을 추가
  - `이번 주 일정`
  - `최근 활동`
  - `오늘의 팁`
  - `이번 달 {petName} 일기`
- `최근 활동`은 타임라인 최신 기록 상위 7개를 그대로 재사용
  - 카테고리별 아이콘을 함께 노출
  - 우측 시간 표기는 `방금 전 / n시간 전 / 어제 / M.D` 기준으로 정리
  - `전체보기`는 `TimelineTab` 전체 필터로 연결
- `이번 달 일기`는 타임라인의 `일기장` 카테고리 중 현재 월 기록만 따로 모아 보여주도록 분리
  - `더보기`는 `TimelineTab -> diary` 필터로 바로 이동
- `이번 주 일정`은 아직 별도 일정 도메인이 없기 때문에,
  최근 기록 패턴을 바탕으로 이번 주에 남기면 좋은 루틴 카드를 제안하는 방식으로 시작
  - 예: 건강 메모, 미용 루틴, 산책 리듬 이어가기
  - 실제 일정/알림/기념일 기능은 추후 별도 테이블 또는 서버 리마인더 로직으로 확장 예정
- `오늘의 팁`은 현재 하드코딩 카드로 시작
  - 추후에는 시간대, 계절, 품종, 나이, 최근 기록 패턴을 기준으로
    여러 템플릿 중 하나를 자동 순환 노출하는 구조로 확장 예정
- 타임라인 메인 카테고리의 `기타` 라벨은 홈/타임라인 톤을 맞추기 위해 `···` 형태로 단순화

## ✅ Chapter 6-11 — Schedule 도메인 연결 시작

- `pet_schedules`를 기준으로 한 일정 도메인 코드를 앱에 추가
  - Supabase service: `fetchSchedulesByPetRange / createSchedule / updateSchedule / deleteSchedule`
  - Zustand store: `scheduleStore`
- 로그인 홈의 `이번 주 일정`은 이제 실제 `pet_schedules` 데이터를 우선 조회
  - 주간 범위: 오늘 00:00 ~ 6일 뒤 23:59
  - 홈에서는 최대 5개까지 요약 노출
- 아직 실제 일정 데이터가 없을 때는 홈이 비어 보이지 않도록
  기존 루틴 제안 카드(건강/미용/산책)를 fallback으로 유지
- 일정은 `icon_key + color_key + category + sub_category` 구조로 설계해,
  홈 카드와 향후 일정 목록 화면에서 더 직관적인 구분이 가능하도록 준비
- 로그아웃/게스트 전환 시 schedule 캐시도 함께 비우도록 AppProviders를 보강
- 다음 단계에서는 일정 생성/목록 화면을 붙여
  홈 `이번 주 일정`이 더미가 아닌 실제 사용자 일정 입력 흐름과 연결되도록 확장 예정

## ✅ Chapter 6-12 — Schedule 목록/생성 화면 연결

- `ScheduleListScreen` 추가
  - 홈 `이번 주 일정`의 `더보기`가 이제 실제 일정 목록 화면으로 이동
  - 오늘 포함 7일 범위 일정을 다시 보여주고, 당겨서 새로고침 가능
  - 아직 일정이 없으면 첫 일정 생성 CTA를 노출
- `ScheduleCreateScreen` 추가
  - 일정 제목 / 날짜 / 시간 / 하루 종일 여부
  - 카테고리
  - 아이콘
  - 색상
  - 메모
  입력으로 바로 `pet_schedules`에 저장 가능
- 일정 저장 후에는 주간 범위를 다시 refresh하고 `ScheduleList`로 복귀해
  홈 / 목록 / store 상태가 같은 기준 데이터를 보도록 정리
- 홈 `이번 주 일정` 카드 tap 동작도 우선 `ScheduleList`로 연결해,
  일정 도메인이 타임라인 필터보다 먼저 보이도록 흐름을 분리

## ✅ Chapter 6-13 — Schedule 입력 UX + 상세/수정 플로우

- `ScheduleCreate`의 날짜/시간 입력을 직접 타이핑 중심에서 모달형 선택 UX로 정리
  - 날짜: `오늘 / 내일 / 이번 주` preset + 직접 입력
  - 시간: 자주 쓰는 시간 preset + 직접 입력
  - `하루 종일` 토글과 자연스럽게 맞물리도록 구성
- `ScheduleDetailScreen` 추가
  - 일정 제목 / 일정 시간 / 카테고리 / 메모를 한 화면에서 확인
  - 수정 / 삭제 액션 제공
- `ScheduleEditScreen` 추가
  - 생성 화면과 같은 패턴으로 일정 수정 가능
  - 저장 후 상세 화면으로 복귀하고 주간 일정 캐시를 refresh
- `ScheduleList`의 각 일정 카드는 이제 상세 화면으로 이동
  - 목록 -> 상세 -> 수정/삭제 흐름이 실제 도메인 화면으로 닫히도록 정리

## ✅ Chapter 6-14 — Schedule 화면 여백/빈 상태 보정

- 홈 `이번 주 일정`에서 하드코딩 루틴 카드 fallback을 제거
  - 이제 실제 `pet_schedules`가 없으면 정직한 empty state와 `일정 추가하기` CTA만 노출
- `ScheduleList`, `ScheduleCreate`, `ScheduleDetail` 헤더 상단 여백을 늘려
  status bar와 타이틀/액션 버튼이 너무 붙어 보이지 않도록 정리
- 일정 화면군의 상단 rhythm을 통일해
  목록 / 생성 / 상세 / 수정이 같은 흐름 안에서 더 안정적으로 보이도록 조정

## ✅ Chapter 6-15 — Schedule 후속 기능 + RecordCreate 최근 태그 실제화

- 일정 도메인에 이미 설계된 필드를 화면에 올려
  `반복 / 알림 / 완료 처리` 흐름을 실제로 사용 가능하게 정리
- `ScheduleCreate`, `ScheduleEdit`
  - 반복: `반복 안 함 / 매일 / 매주 / 매월`
  - 알림: `없음 / 10분 전 / 1시간 전 / 하루 전`
  선택을 저장하도록 연결
- `ScheduleDetail`
  - 반복 / 알림 / 완료 상태를 함께 표시
  - `일정 완료 처리 / 완료 해제` 토글로 `completed_at`을 직접 갱신 가능
- 홈 `최근 활동`의 기타 계열 라벨은 더 자연스럽게 정리
  - `기타 · 미용`
  - `기타 · 병원/약`
  - `기타`
- 홈의 사용하지 않는 `formatWeeklyDateLabel` helper 제거
- `RecordCreate`의 `최근 사용` 태그는 더미 배열이 아니라
  실제로 사용자가 최근 직접 추가한 태그를 `AsyncStorage`에 누적해 다시 보여주도록 변경
  - 자동 카테고리 태그는 제외
  - 수동 추가 태그만 최근 사용 대상으로 유지

## ✅ Chapter 7 — Timeline Performance Optimization

Timeline 화면에서 기록 수가 증가할수록 스크롤이 끊기거나 버벅이는 문제가 발생할 수 있다.  
특히 pagination(`loadMore`) 과정에서 **전체 리스트를 매번 merge + sort 하는 구조**는 데이터가 많아질수록 성능 비용이 크게 증가한다.

이번 챕터에서는 **타임라인 스크롤 경험을 부드럽게 유지하기 위한 구조적 성능 최적화**를 적용하였다.

### 문제 원인

기존 구조에서는 `loadMore` 실행 시 다음과 같은 작업이 수행되었다.

1. 기존 리스트 + 새 페이지 데이터를 `Map`으로 병합
2. 전체 데이터를 다시 `sort`
3. 정렬된 리스트를 상태에 저장

이 방식은 기록이 누적될수록 매번 **O(n log n)** 정렬이 발생하여 스크롤 중 프레임 드랍을 유발할 수 있다.

### 해결 전략

NURI 타임라인은 다음 구조를 가진다.

- 데이터 정렬 기준: `created_at DESC`
- pagination 방식: `cursor 기반`

즉, **다음 페이지 데이터는 항상 기존 데이터보다 오래된 기록**이다.

기존 방식

```text
prevItems + newItems
→ merge(Map)
→ 전체 sort
```

개선 방식

```text
prevItems + newItems
→ 중복 ID 제거
→ 뒤에 append
```

이 방식은 다음과 같은 장점을 가진다.

- 전체 정렬 제거
- 리스트 append 방식 유지
- FlatList 재렌더 비용 최소화
- 스크롤 프레임 안정화

### 최적화 핵심 로직

```ts
function appendPageUniqueById(prev: MemoryRecord[], nextPage: MemoryRecord[]) {
  const seen = new Set(prev.map(it => it.id));

  const append = nextPage.filter(it => {
    if (seen.has(it.id)) return false;
    seen.add(it.id);
    return true;
  });

  return append.length ? prev.concat(append) : prev;
}
```

이 로직은 다음 원칙을 따른다.

- 기존 배열 순서를 유지
- 새로운 페이지는 뒤에 추가
- 중복 데이터는 제거

### 추가 안정성 설계

#### 1) Out-of-order 응답 방지

네트워크 지연으로 인해 이전 요청이 늦게 도착하는 문제를 방지하기 위해 `requestSeq` 기반 상태 보호 로직을 유지하였다.

- `bootstrap / refresh -> requestSeq 증가`
- `loadMore -> 현재 requestSeq 스냅샷 비교`

이 구조를 통해 오래된 응답이 상태를 덮어쓰는 문제를 방지한다.

#### 2) FlatList 렌더 안정화

다음 설정을 유지하여 스크롤 성능을 안정화하였다.

- `removeClippedSubviews`
- `initialNumToRender`
- `maxToRenderPerBatch`
- `windowSize`
- `updateCellsBatchingPeriod`

### 결과

- 기록 수 증가에도 스크롤 프레임 유지
- `loadMore` 실행 시 UI 끊김 최소화
- 대량 데이터에서도 안정적인 pagination
- 서버 검색 / 태그 필터 / 월별 점프 / AI 추천 기능으로 안정적 확장 가능

NURI Timeline은 단순한 기록 리스트가 아니라 감정 기반 기억을 탐색하는 인터페이스이다.  
따라서 사용자가 스크롤하는 경험 자체가 끊김 없이 자연스럽게 흐르는 것이 매우 중요하다.

---

## Chapter 6-16 — 일정 영역을 "주간"이 아닌 "전체 일정" 기준으로 재정리

처음 붙였던 `pet_schedules`는 홈 위젯 성격에 맞춰 `이번 주 일정` 중심으로 잘라 보여주도록 설계했지만,
실제 사용 흐름을 다시 보니 사용자는 병원 예약, 미용 주기, 장기 루틴처럼
짧은 범위보다 **오래 누적되는 일정 아카이브**를 더 자연스럽게 기대한다.

그래서 일정 도메인의 기준을 `이번 주`에서 `전체 일정`으로 옮겼다.

### 핵심 변경

- `scheduleStore`를 주간 범위 캐시에서 **pet별 전체 일정 캐시**로 변경
- 홈 `이번 주 일정` 섹션을 **`전체 일정` 섹션**으로 변경
- 홈에서는 전체 일정 중 최신 기준이 아니라 **정렬된 일정 7개만** 미리 보여주고,
  `더보기`에서 전체 일정 화면으로 자연스럽게 이어지도록 정리
- 일정이 하나도 없어도 홈에는 `일정 추가하기` CTA를 항상 남겨
  사용자가 바로 다음 행동을 이해할 수 있게 함
- `ScheduleList`도 더 이상 주간 범위를 잘라 보여주지 않고,
  **등록된 전체 일정**을 한 화면에서 확인하도록 변경

### 의도

이 수정으로 일정은 단순한 "이번 주 요약 카드"가 아니라,
반려동물과 관련된 중요한 약속과 루틴을 차곡차곡 쌓아두는 **장기 기억 캘린더**로 역할이 바뀌었다.

홈은 여전히 가볍게 7개만 보여주지만, 사용자가 `더보기`를 누르면
몇 달 뒤 일정이든 몇 년 뒤 일정이든 같은 흐름 안에서 찾을 수 있다.

---

## Chapter 6-17 — 수정 완료 피드백 화면 통일

프로필 수정 완료 화면은 이미 존재했지만,
일정 수정이나 기록 수정처럼 **실제로 중요한 편집 동작**은 저장 이후 바로 이전 화면으로 복귀하고 있었다.
이 구조는 저장 성공 여부는 알 수 있지만, 사용자가 "무엇이 정리되었는지"를 감정적으로 인식하기에는 약했다.

그래서 수정 플로우 전반에 완료 피드백 패턴을 확장했다.

### 핵심 변경

- 공용 `EditDoneScreen` 추가
- `ScheduleEdit` 저장 후:
  - `일정 수정 완료!`
  - 전체 일정으로 바로 이어지는 CTA 제공
- `RecordEdit` 저장 후:
  - `기록 수정 완료!`
  - 상세 화면으로 바로 이어지는 CTA 제공
- 기존 `PetProfileEditDone`은 그대로 유지하여
  프로필 / 일정 / 기록 편집이 모두 **"수정 후 확인"** 흐름으로 통일되도록 정리

### 의도

NURI의 수정 행위는 단순한 CRUD가 아니라,
이미 남겨둔 추억과 정보를 다시 더 또렷하게 다듬는 행위에 가깝다.
그래서 저장 직후에는 조용히 뒤로 돌아가기보다,
무엇이 업데이트되었는지 짧게 확인시켜 주는 화면이 더 제품의 톤과 맞는다.

---

## Chapter 6-18 — 기록 정렬 기준을 "작성 시점"이 아닌 "기억 날짜" 기준으로 보정

기록 수정 화면에서 `occurredAt`을 바꿔도
타임라인과 홈의 최근 활동 순서가 그대로 남아 있으면,
사용자는 "날짜는 고쳤는데 왜 위치는 그대로지?"라는 어색함을 바로 느끼게 된다.

NURI에서 중요한 것은 글을 언제 작성했는지가 아니라,
그 기억이 **언제 있었는가**이기 때문이다.

### 핵심 변경

- `recordStore`의 로컬 정렬 기준을 `createdAt` 고정에서
  **`occurredAt 우선, 없으면 createdAt fallback`** 구조로 변경
- `replaceAll`, `upsertOneLocal`, `updateOneLocal`, `loadMore` 이후에도
  같은 기준으로 다시 정렬되도록 보정
- 날짜 수정 후:
  - 타임라인 `최신순 / 오래된순`
  - 홈 `최근 활동`
  - 월별 필터 기준
  이 모두가 수정된 날짜를 기준으로 다시 반영되도록 정리

### 의도

NURI의 기록은 게시글보다 "그날의 기억"에 가깝다.
그래서 `3월 2일에 작성했지만 실제 기억 날짜를 3월 1일로 수정했다면`,
그 기록은 이제 `3월 1일의 기억`으로 다시 해석되어야 한다.

이 보정을 통해 기록의 위치와 시간 감각이 실제 기억 흐름과 더 자연스럽게 맞물리게 되었다.

---

## Chapter 6-19 — Guest Home을 로그인 홈과 같은 톤의 프리뷰 화면으로 재구성

기존 Guest Home은 매우 단순한 안내 화면에 가까웠다.
하지만 홈 진입 직후의 첫 인상은 제품의 세계관을 설명하는 가장 중요한 장면이기 때문에,
로그인 전 화면도 실제 LoggedInHome의 구조와 분위기를 어느 정도 미리 보여주는 편이 더 자연스럽다.

그래서 Guest Home을 단순 CTA 화면이 아니라,
**로그인 이후 홈 경험을 미리 엿보게 하는 프리뷰 화면**으로 재구성했다.

### 핵심 변경

- `GuestHome.tsx`를 로그인 홈과 같은 섹션 문법으로 재구성
- 메인 원형 이미지는 `src/assets/home/home.png`를 사용해
  홈의 중심 비주얼 역할을 하도록 정리
- 아래 섹션은 모두 하드코딩 프리뷰 데이터로 채움
  - 자주 쓰는 기록
  - 오늘의 추억 둘러보기
  - 누리를 위한 추천 팁
  - 최근 활동
  - 이번 달 누리 일기
- 섹션 썸네일 이미지는 placeholder 반려동물 사진 URI로 연결해
  실제 데이터가 없는 상태에서도 화면 밀도가 유지되도록 구성
- 상단 헤더 / 아이콘 / 펫 스위처 / 히어로 카드 / 보라 톤을
  LoggedInHome과 최대한 비슷한 감각으로 맞춤
- 게스트 홈 타이포는 과하게 크지 않도록
  **12~16px 범위 중심**으로 조정해 로그인 홈과 같은 리듬으로 정리

### 의도

로그인 전 화면은 비어 있는 상태를 보여주는 곳이 아니라,
"로그인하면 어떤 경험이 펼쳐지는가"를 짧게 설득하는 곳이어야 한다.

이번 재구성으로 Guest Home은 단순한 안내 페이지가 아니라,
NURI 홈의 분위기와 정보 구조를 미리 체험하게 하는 **브랜드 프리뷰 레이어**에 더 가까워졌다.

---

## 🚧 In Progress — 홈 UI 2차 업그레이드

홈 화면 LoggedInHome UI를 **이미지 중심 감성 UX**로 단계적으로 리디자인하고 있다.

### 핵심 변경

#### 1) 헤더 구조 리디자인

- `{nickname}님, 반가워요!` 인사 영역
- 검색 / 알림 아이콘 UI
- 멀티펫 스위처 (최대 4 + 추가 버튼)
- 활성 펫 보라 링 강조

#### 2) 프로필 HERO 카드 완성

- 중앙 정렬 프로필 카드
- 퍼플 glow avatar + white ring
- 이름 / 견종 / 나이 / 성별 / 몸무게 / 생년월일 표시
- **함께한 시간 Pill 강조 UI**

#### 3) 프로필 아코디언

- 취미
- 좋아하는 것
- 싫어하는 것
- `#태그`
- 개별 펼치기
- **모두 펼치기 / 모두 접기**

#### 4) 오늘날의 사진 카드

- 이미지 기반 카드
- 전체 overlay tint 적용
- Timeline 이동 CTA

#### 5) Today Records Slider

- horizontal FlatList
- 정사각 카드 비율
- snapToInterval 스냅 UX
- active 카드 강조
- 이미지 parallax 효과
- indicator dot

#### 6) 상태 안정성

- `recordStore -> byPetId[petId]` 직접 구독
- fallback 동일 참조 유지 (`FALLBACK_RECORDS_STATE`)
- pet 변경 시 UI 상태 초기화

---

## Chapter 6-20 — Pet Create 2-Step Wizard 리디자인

### 무엇을 바꿨나

- 반려동물 등록 화면을 단일 폼에서 **2단계 위저드**로 재구성했다.
- 상단 헤더에 `프로필 등록 (1/2)`, `프로필 등록 (2/2)` 흐름과 진행 바를 추가했다.
- Step 1은 `이름 / 생일 / 입양일 / 품종 / 성별 / 중성화 여부`로 정리했다.
- Step 2는 `몸무게 / 좋아하는 것 / 싫어하는 것 / 취미 / 태그` 입력으로 분리했다.
- 브랜드 보라 계열과 홈 화면 톤에 맞춰 카드, 입력창, CTA 스타일을 다시 맞췄다.

### 날짜 입력 UX

- 생일과 입양일은 `20111028`처럼 숫자만 입력해도 저장 전에 `2011-10-28` 형식으로 정규화되게 했다.
- 동시에 캘린더 아이콘을 누르면 `연 / 월 / 일`을 직접 선택하는 모달 시트를 열 수 있게 했다.
- 즉, **직접 입력과 선택형 UX를 같이 지원**하는 구조로 맞췄다.

### 레이아웃/성능 보정

- Step 1, Step 2, 태그 입력 블록을 memo 컴포넌트로 분리해 입력 중 불필요한 리렌더 범위를 줄였다.
- 진행 바는 화면 폭을 거의 다 쓰는 형태로 조정해 시안처럼 더 선명한 단계 인지가 가능하게 했다.
- 상단 헤더와 기본 정보 블록 간격을 다시 줄여 status bar 아래에서 더 단정하게 시작하도록 맞췄다.
- `PetCreate` 스택 기본 헤더를 비활성화해 상단 공백이 남지 않도록 정리했다.
- 진행 바는 라벨 줄과 바 줄을 분리해 `1/2`, `2/2` 텍스트 폭에 영향받지 않게 다시 구성했다.
- 헤더 왼쪽 액션은 아이콘 대신 `취소` 텍스트로 바꿔 프로필 수정 화면과 톤을 맞췄다.
- 카드 시작점과 CTA 간격도 시안 기준으로 재조정해 더 자연스러운 상하 밀도를 만들었다.

### 검증 규칙

- `좋아하는 것 / 싫어하는 것 / 취미 / 태그`는 각각 최소 1개 이상 있어야 등록할 수 있게 했다.
- 태그는 저장 시 `#` prefix가 자동으로 붙게 정리했다.
- 등록 완료 시 기존 펫 목록을 다시 fetch해서 홈 상태와 바로 동기화한다.

### 의도

반려동물 등록은 단순한 CRUD가 아니라,
홈 화면의 첫 인상을 완성하는 온보딩 단계에 가깝다.

그래서 한 번에 모든 값을 길게 받는 방식보다,
기본 정보와 성향 정보를 나눠 입력하는 쪽이 더 자연스럽고 부담이 적다.

---

## Onboarding Flow Principle

NURI의 첫 진입은 곧바로 입력을 요구하는 방식보다,
서비스의 분위기와 가치를 먼저 보여주고 그 다음 행동을 유도하는 쪽이 더 자연스럽다.

그래서 현재 기준의 권장 온보딩 순서는 다음과 같다.

1. `Splash`
2. `Guest Home`
3. `회원가입 / 로그인`
4. `닉네임 설정`
5. `반려동물 등록`
6. `AppTabs(Home)`

### 핵심 규칙

- 비로그인 상태에서는 먼저 `Guest Home`을 보여준다.
- `Guest Home`은 단순한 빈 화면이 아니라, 로그인 후 어떤 경험이 열리는지 미리 설득하는 프리뷰 레이어다.
- 로그인 이후에만 반려동물 등록을 받는다.
- 이미 로그인된 사용자라도 `pet = 0` 상태일 때만 `PetCreate`로 유도한다.
- `pet > 0` 상태라면 바로 홈 경험으로 진입한다.

### 의도

NURI는 데이터 입력 도구가 아니라,
반려동물과의 시간을 기록하는 감정형 아카이브에 가깝다.

따라서 첫 진입에서 바로 등록 폼을 보여주기보다,
먼저 홈의 분위기와 제품 가치를 전달하고,
그 다음 계정 생성과 반려동물 등록으로 이어지는 흐름이 더 설득력 있고 이탈도 적다.

---

## Chapter 6-21 — Nickname Setup 리디자인 + 온보딩 분기 정리

### 무엇을 바꿨나

- 닉네임 설정 화면을 기존 카드형 폼에서 **온보딩 전용 미니멀 레이아웃**으로 재구성했다.
- 중앙 로고, 단일 입력 라인, `중복확인` 버튼, 하단 CTA 구조로 단순화했다.
- 전체 배경은 `#FFFFFF`로 유지하고, 버튼과 포인트 컬러는 브랜드 보라 계열로 맞췄다.

### 검증 규칙

- 닉네임이 이미 사용 중이면 `이미 사용중인 닉네임 입니다.`를 빨간 문구로 표시한다.
- 닉네임이 8자를 넘으면 `닉네임은 8자 이내로 입력해주세요`를 빨간 문구로 표시한다.
- 특수문자가 포함되면 `특수문자는 사용할수 없습니다`를 빨간 문구로 표시한다.
- 중복확인을 통과해 `사용 가능한 닉네임입니다` 상태가 되어야만 `완료` 버튼이 활성화된다.

### 라우팅 기준

- `Splash` 이후의 메인 분기는 이제 `HomeScreen`에서 먼저 결정한다.
- 비로그인 사용자는 `AppTabs -> Guest Home`으로 진입한다.
- 로그인했지만 닉네임이 없으면 `NicknameSetup`으로 진입한다.
- 닉네임 설정 완료 후에는 `PetCreate`로 이동한다.
- 이미 로그인했고 닉네임은 있지만 반려동물이 없을 때만 `PetCreate`를 보여준다.

### 의도

닉네임 설정은 단순한 텍스트 입력이 아니라,
게스트 상태에서 계정 기반 사용자 상태로 넘어가는 첫 단계다.

그래서 화면도 일반 폼처럼 보이기보다,
온보딩 흐름 안의 한 장면처럼 더 단순하고 또렷하게 보여주는 쪽이 맞다.

---

## Chapter 6-22 — Welcome Transition 도입

### 무엇을 바꿨나

- 반려동물 등록 완료 직후 바로 홈으로 보내지 않고, `WelcomeTransition` 화면을 새로 추가했다.
- 현재 온보딩 순서는 `Splash -> Guest Home -> 회원가입/로그인 -> NicknameSetup -> PetCreate -> WelcomeTransition -> Home`으로 이어진다.
- 전환 화면은 설정한 닉네임을 기준으로 개인화 문구를 노출한다.

### 화면 구성

- 중앙에 브랜드 로고를 `200x200` 크기로 크게 노출
- `{닉네임}님을 위한 소중한 공간을 준비하고 있어요...` 문구 표시
- 진행 바와 타이머를 함께 노출
- 하단 dot indicator로 “전환 단계” 느낌을 유지

### 테스트 기준

- 현재는 레이아웃 조정을 위해 `60분` 테스트 타이머로 설정했다.
- 실제 배포 시에는 최소 노출 시간과 실제 준비 완료 시점을 조합하는 방식으로 다시 조정할 예정이다.

### 의도

닉네임 설정과 반려동물 등록이 끝난 직후는,
사용자 입장에서 “우리 공간이 만들어지는 순간”처럼 느껴지는 구간이다.

그래서 즉시 홈으로 점프하기보다,
짧은 개인화 전환 화면을 거치게 하면 온보딩의 감정선이 훨씬 부드럽게 이어진다.

---

## Chapter 6-23 — Auth Session 검증 보강

### 무엇을 바꿨나

- 앱 부팅 시 `getSession()` 결과만 그대로 믿지 않고, `getUser()`로 실제 사용자 존재 여부까지 한 번 더 검증하도록 변경했다.
- stale session이 남아 있는 경우에는 guest 상태로 정리되도록 보강했다.

### 문제 상황

- 테스트 중 DB와 auth 사용자를 삭제했는데도, 로컬 AsyncStorage에 남아 있던 세션 때문에 앱이 계속 로그인 상태로 오인하는 경우가 있었다.
- 그 결과 `Splash -> Guest Home`이 아니라 `NicknameSetup`으로 바로 진입하는 문제가 발생했다.

### 해결 방식

- `AppProviders` 부트 단계에서 세션을 복원한 뒤 실제 `auth.getUser()`까지 확인한다.
- 세션은 있지만 사용자 정보가 유효하지 않으면 `signOut()`으로 정리하고 guest로 처리한다.
- auth state change 이벤트에서도 동일한 검증을 타게 맞췄다.

### 의도

온보딩 분기에서 가장 중요한 전제는
“지금 사용자가 정말 로그인 상태인가”를 정확히 아는 것이다.

세션 캐시만 믿으면 테스트 환경이나 계정 삭제 상황에서 분기가 쉽게 꼬일 수 있기 때문에,
부팅 시점의 인증 상태를 더 보수적으로 검증하는 구조가 필요했다.

---

## Chapter 6-24 — Auth 직접 진입 구조 + 화면 리디자인

### 무엇을 바꿨나

- `AuthLanding` 중간 화면을 제거하고 인증 유도를 `SignIn` 직접 진입으로 단순화했다.
  - Guest Home
  - More / MoreDrawer
- `SignIn`, `SignUp`, `NicknameSetup` 스택 헤더를 숨겨 중복 뒤로가기 아이콘을 제거했다.
- 로그인/회원가입 화면을 시안 톤으로 재구성했다.
  - 로그인: 중앙 로고형 레이아웃 + 소셜 버튼
  - 회원가입: 상단 헤더형 레이아웃 + 약관 동의 + 비밀번호 확인
- Auth 화면 SafeArea를 `react-native-safe-area-context` 기준으로 통일했다.

### 회원가입/로그인 동작 보강

- 로그인 성공 후 바로 홈으로 보내지 않고 `Splash`로 reset해 중앙 온보딩 분기를 다시 타도록 정리했다.
- 회원가입 실패 에러 메시지를 사용자 문구로 매핑했다.
  - `email rate limit exceeded` -> 가입 요청이 많습니다
  - `user already registered` -> 이미 가입된 이메일입니다
- 닉네임 화면은 `after=signup` 진입 시 입력값을 빈값으로 시작하도록 고정했다.

### 의도

중간 인증 랜딩을 줄이고 인증 목적지로 바로 보내야 전환 마찰이 줄어든다.
또한 로그인 이후 분기를 `Splash` 한 곳으로 모아야 `닉네임 없음/펫 없음` 케이스가 꼬이지 않는다.

---

## Chapter 6-25 — PetCreate 입력/모달/업로드 안정화

### 무엇을 바꿨나

- 날짜 입력 파서를 보강해 `YYYY-M-D`도 허용하고 저장 시 `YYYY-MM-DD`로 정규화했다.
  - 예: `2011-9-28` -> `2011-09-28`
- 입양일 입력에서 `2011-10` 이후 day 입력이 막히던 문제를 입력 동기화 로직에서 수정했다.
- 등록 완료 모달을 화면 중앙에 고정되도록 성공 모달 전용 backdrop으로 분리했다.
- 등록 완료 모달 문구는 중앙 정렬이 명확하게 보이도록 copy wrapper를 추가했다.
- 웰컴 트랜지션은 초 타이머 표시를 제거하고 4초 진행 후 홈으로 자동 전환되게 변경했다.

### 이미지 업로드 처리

- 반려동물 생성과 이미지 업로드 실패를 분리해, 이미지 실패가 전체 등록 실패로 전파되지 않게 했다.
- `pet-profiles` 업로드는 `upsert: false`로 조정해 RLS 충돌 가능성을 낮췄다.

### 의도

등록 흐름에서 입력 포맷/모달 위치/이미지 업로드 실패가 한 번에 UX를 깨뜨리지 않도록,
성공 경로를 우선 보장하고 실패는 국소적으로 안내하는 방향으로 안정화했다.

---

## Chapter 6-26 — PetCreate 최종 안정화(실기기 흐름 확인)

### 무엇을 보강했나

- 입양일 입력의 day 이어쓰기 이슈를 추가 보정했다.
  - `2011-10` 이후 숫자 입력이 막히지 않고 `2011-10-28`까지 자연스럽게 이어진다.
- 등록 완료 모달은 날짜 모달과 backdrop을 분리해 화면 중앙 고정으로 정리했다.
- 성공 모달 문구는 copy wrapper를 분리해 중앙 정렬 시각 안정성을 높였다.
- 펫 프로필 이미지 업로드는 `upsert=false`로 유지해 스토리지 정책과 충돌 가능성을 낮췄다.

### 확인 결과

- 회원가입 -> 닉네임 설정 -> 펫 등록 -> 웰컴 트랜지션 흐름에서
  펫 등록과 이미지 업로드가 정상 동작하는 것을 확인했다.
- 기존에 보이던 등록 실패 전파(이미지 실패가 전체 실패로 보이는 문제)는 재현되지 않았다.

### 의도

온보딩 마지막 단계에서 작은 입력/모달/업로드 오류가 전체 첫인상을 무너뜨리지 않도록,
등록 성공 경험을 안정적으로 고정하는 것이 목적이다.

---

## Chapter 6-27 — RecordCreate/Detail 확장(오늘의 기분 + 다중 이미지)

### 무엇을 바꿨나

- `RecordCreate`에 `오늘의 기분` 선택 UI를 추가했다.
  - emotion enum(`happy/calm/excited/...`)을 그대로 저장
  - 선택 UI는 4x4 그리드로 정리
- 사진 첨부를 단일에서 다중(최대 10장)으로 확장했다.
  - 메인 프리뷰 + 썸네일 선택
  - 선택 이미지 제거 지원
- 태그 모달의 `최근 사용` 섹션에 `전체 지우기`를 추가했다.
  - UI와 AsyncStorage 값을 함께 정리

### 저장/업로드 안정화

- 다중 이미지 업로드 실패율을 줄이기 위해 업로드 path를 `timestamp + random nonce`로 생성하도록 변경했다.
- 다중 업로드는 순차 처리 + 이미지별 1회 재시도로 보강했다.
- DB에서 `image_urls` 컬럼이 아직 없더라도 앱이 깨지지 않도록,
  `image_url` 단일 경로로 폴백하는 호환 로직을 추가했다.

### 상세보기 반영

- `RecordDetail`에서 다중 이미지가 있으면 가로 슬라이드(paging)로 표시하도록 변경했다.
- `오늘의 기분` 카드(emoji + 라벨)와 날짜/태그 영역을 상세 레이아웃에 반영했다.
- 내용 영역을 태그보다 먼저 보여주고, 본문 높이를 키워 읽기 흐름을 개선했다.
- `수정/삭제`는 카드 외부 우측 하단에 단순 텍스트 액션으로 배치했다.

### 의도

기록 작성의 표현력을 높이고(감정 + 여러 장 사진),
상세 화면에서 기억을 “읽는 흐름”을 더 자연스럽게 만드는 것이 목표다.

---

## Chapter 6-28 — Timeline 탭 내부 Stack 전환(상세에서도 탭바 유지)

### 무엇을 바꿨나

- 타임라인 네비게이션을 `TimelineStackNavigator`로 분리했다.
  - `TimelineMain`
  - `RecordDetail`
  - `RecordEdit`
- 기존 RootStack의 `RecordDetail/RecordEdit` 라우트를 제거했다.
- 상세 화면 상단 왼쪽 화살표는 제거했다(요청 반영).
- 홈/완료 화면에서 상세로 이동하는 경로를 새 탭-스택 구조로 보정했다.

### 결과

- 타임라인에서 상세/수정으로 들어가도 기존 하단 탭바가 유지된다.
- 스택 구조가 `Timeline` 도메인 안으로 모여 라우팅 책임이 더 명확해졌다.

### 의도

기록 탐색(타임라인)과 기록 상세/수정을 같은 도메인 흐름 안에서 유지해
탭 경험의 일관성과 조작 편의성을 높이기 위함이다.

---

## Chapter 6-29 — Timeline 상세 UX 보정(뒤로가기/감정 표시/편집 스크롤)

### 무엇을 바꿨나

- `RecordDetail` 상단 뒤로가기를 텍스트 `<` 대신 큰 아이콘 화살표로 교체했다.
- `RecordDetail`의 `수정/삭제`는 카드 아래 바깥 영역(오른쪽 정렬)으로 다시 배치했다.
- `RecordDetail` 뒤로가기 fallback이 홈으로 가던 문제를 수정해,
  뒤로 이동이 불가능한 경우에도 `TimelineMain`으로 복귀하도록 정리했다.
- 하단 탭에서 `타임라인` 버튼을 눌렀을 때 상세 화면이 다시 열리던 상태를 수정했다.
  - 탭 클릭 시 항상 `TimelineMain`으로 이동하도록 고정
- 타임라인 카드에서 감정값 raw 텍스트(`happy`)가 보이던 문제를 수정했다.
  - emotion enum을 이모지로 매핑해 표시
  - 감정 이모지의 배경/보더를 제거해 더 가볍게 노출
- `RecordEdit` 화면이 스크롤되지 않던 문제를 수정했다.
  - `KeyboardAvoidingView + ScrollView` 구조로 변경
  - 키보드 열림 상황에서도 입력 필드 이동이 자연스럽게 유지

### 결과

- 상세 진입/복귀 흐름이 타임라인 중심으로 안정화됐다.
- 감정 표현이 작성 화면(이모지)과 목록 화면(이모지)이 일관되게 맞춰졌다.
- 기록 수정 화면의 입력 접근성이 개선됐다.

### 의도

작은 네비게이션/표현 불일치가 누적되면 기록 UX의 신뢰도가 빠르게 떨어진다.
이번 보정은 “타임라인에서 들어가고, 타임라인으로 돌아오며, 감정은 같은 형태로 보인다”는
기본 경험을 단단하게 고정하는 데 초점을 맞췄다.

---

## Chapter 6-30 — 다중 이미지 실제 저장/상세 슬라이더 마무리

### 무엇을 바꿨나

- 다중 이미지 저장 시 DB가 `image_urls`를 지원하지 않으면 단일 저장으로 폴백되던 동작을
  사용자에게 안내하도록 보강했다.
- `memories.image_urls` 추가 마이그레이션 SQL을 프로젝트에 포함했다.
  - `docs/sql/migrations/2026-03-05_memories_add_image_urls.sql`
- `RecordDetail` 슬라이더 인디케이터를 정리했다.
  - dot + 페이지 숫자(`1/7`)를 함께 표시
  - 숫자는 dot 아래에 배치
- 상세 이미지 슬라이드는 스냅 동작을 강화해 홈 슬라이더와 유사한 조작감을 맞췄다.
  - `snapToInterval`, `decelerationRate="fast"`, `disableIntervalMomentum`

### 결과

- DB 스키마가 맞춰진 환경에서는 다중 이미지가 실제로 저장되고, 상세에서 슬라이드로 정상 노출된다.
- 슬라이더 상태가 현재 페이지를 더 명확하게 전달한다.

### 의도

다중 이미지 기능은 UI만 맞아도 체감상 동작하지만, 저장 스키마가 맞지 않으면 실제로는 단일 이미지로 축소된다.
이번 챕터는 기능의 “보이는 동작”과 “실제 저장”을 동일하게 맞추는 데 초점을 두었다.

---

## Chapter 6-31 — RecordDetail/RecordEdit 모달 UX + 편집 다중 이미지 지원

### 무엇을 바꿨나

- 타임라인 상세(`RecordDetail`)의 삭제 흐름을 네이티브 Alert에서 커스텀 모달로 전환했다.
  - 경고 아이콘 기반 삭제 확인 모달
  - 로고 미사용(요청 반영)
- 기록 수정(`RecordEdit`) 저장 완료도 커스텀 모달로 전환했다.
  - 체크 아이콘 + 완료 문구 + 확인 버튼
- `RecordEdit`의 감정 선택 UI를 텍스트 칩에서 이모지 그리드(4x4)로 변경했다.
- `RecordEdit`에 다중 이미지 편집을 추가했다.
  - 기존 이미지 여러 장 조회
  - 썸네일 전환
  - 현재 이미지 삭제
  - 새 이미지 추가 후 저장 시 병합 반영

### 결과

- 상세/수정 화면의 피드백 방식이 타임라인 톤과 일관되게 맞춰졌다.
- 다중 이미지 게시물도 편집 화면에서 실제로 관리(조회/삭제/추가)할 수 있게 됐다.
- 감정 선택 경험이 기록하기와 기록수정에서 동일한 패턴으로 통일됐다.

### 의도

기록 상세와 수정은 사용자가 가장 자주 왕복하는 구간이기 때문에,
피드백 모달과 편집 도구의 일관성을 맞추는 것이 체감 품질에 직접적으로 영향을 준다.
이번 보정은 “보고, 고치고, 저장하는 흐름”을 끊김 없이 이어주는 데 초점을 두었다.

---

## Chapter 6-32 — 로그아웃 즉시 반영(체감 지연 제거) + 홈 리콜 이모지 톤 정리

### 무엇을 바꿨나

- 로그아웃 동작에서 지연 원인을 분리했다.
  - 기존: `로그아웃 -> Splash reset`으로 이동하며 `MIN_SPLASH_MS` 대기 구간에 다시 진입
  - 결과적으로 “로그아웃 버튼을 눌러도 바로 안 나간다”는 체감이 발생
- 로그아웃 순서를 즉시 반영형으로 변경했다.
  - `로컬 상태 정리(signOutLocal + pets/records clear) -> AppTabs(게스트 홈) 즉시 reset`
  - 서버 `signOut`은 `signOutBestEffort(timeout)`로 백그라운드 정리
- `authStore.signOutLocal`에서 `booted=false`로 게이트를 닫던 동작을 제거했다.
  - 수동 로그아웃에서는 부트 게이트를 유지해 Splash 재대기 현상을 막음
- 홈 리콜 메시지는 시간대(아침/점심/저녁) 이모지를 별도 아이콘으로 노출하도록 정리했다.
  - 메시지 본문 앞 중복 이모지는 제거
  - 아이콘 크기는 실제 화면 피드백 기준으로 미세 조정

### 결과

- 로그아웃 클릭 시 즉시 게스트 홈으로 전환되어 체감 지연이 사라졌다.
- 네트워크 상태가 느려도 UI는 블로킹되지 않고, 서버 세션 정리는 안전하게 이어진다.
- 홈 메시지 영역의 이모지 표현이 단일 포인트로 정리되어 시각적 일관성이 좋아졌다.

### 의도

로그아웃은 기능보다 체감 속도가 더 중요한 액션이다.
이번 보정은 서버 정합성은 유지하면서도, 사용자가 느끼는 반응 속도를 우선하는 방향으로
흐름을 재배치해 UX 마찰을 최소화하는 데 초점을 두었다.

---

## Chapter 6-33 — 닉네임 정책 실무 고도화 (중복/금칙어/우회표기 + 확인중 고정 이슈 보정)

### 무엇을 바꿨나

- 닉네임 검증을 클라이언트 단순 조회에서 서버 정책 중심으로 전환했다.
  - `check_nickname_availability` RPC 기준으로 중복/형식/금칙어를 단일 경로에서 판정
  - 클라이언트는 판정 코드(`ok/taken/blocked/...`)를 메시지로 매핑해 UI에 반영
- 닉네임 저장 로직을 `update + insert fallback`에서 `upsert(onConflict:user_id)`로 단순화했다.
  - 저장 경로를 줄여 오류 분기를 축소
  - `23505`(unique) 계열은 사용자 메시지로 매핑
- DB 마이그레이션 파일을 추가해 닉네임 정책 기반을 고정했다.
  - `docs/sql/migrations/2026-03-06_profiles_nickname_policy_and_rpc.sql`
  - `profiles.nickname` 실무 제약(대소문자 무시 unique, 길이, 문자/공백)
  - `blocked_nicknames` + 정책 트리거 + RPC 포함
- 닉네임 화면의 “확인중...” 고정 이슈를 보정했다.
  - 동일 값 재검사 가드 추가
  - debounce 자동 검사 루프 조건 축소
  - RPC 6초 타임아웃 추가(네트워크 지연 시 영구 로딩 방지)

### 결과

- 닉네임 중복/금칙어 판정이 서버 기준으로 일관되게 동작한다.
- 화면에서 `닉네임 확인중...`이 무한 지속되는 케이스를 차단했다.
- 닉네임 저장/검사 흐름이 단순화되어 장애 포인트가 줄었다.

### 의도

닉네임 정책은 UX 이슈처럼 보여도 실제로는 보안/운영 정책에 가깝다.
이번 보정은 “클라이언트 보조 + 서버 강제” 구조로 정렬해,
동시성/우회입력/지연 상황에서도 예측 가능한 동작을 유지하는 데 목적이 있다.

---

## Chapter 6-34 — 온보딩 복구 강화 + PetCreate 뒤로가기 차단 + 닉네임 완료 플래그

### 무엇을 바꿨나

- 온보딩 중 앱이 튕겨도 같은 작성 화면으로 복귀하도록 draft 복구를 추가했다.
  - `NicknameSetup` 입력 draft 저장/복원
  - `PetCreate`는 `step(1/2,2/2)` + 폼 전체 draft 저장/복원
  - 성공 완료 시 draft 자동 정리
- `PetCreate`에서 취소/뒤로 진입으로 온보딩이 탈락하는 경로를 차단했다.
  - 헤더 `취소` 제거
  - Android 하드웨어 back 차단
  - iOS 스와이프 back(gesture) 차단
- 회원가입 후 튕김/리로드 시 잘못 `PetCreate`로 가던 분기 문제를 구조적으로 수정했다.
  - `nickname 존재`가 아니라 `nickname_confirmed` 기준으로 라우팅
  - 가입 직후 `handle_new_user`는 `nickname_confirmed=false`로 생성
  - 닉네임 저장 완료 시 `nickname_confirmed=true`로 승격
- 회원가입 요청 무한 대기 방지를 위해 `signUp` 타임아웃을 추가했다.

### 결과

- 닉네임/프로필 등록 도중 앱이 중단되어도 같은 단계에서 이어서 진행할 수 있다.
- `PetCreate`에서 뒤로 빠져 “펫 없는 로그인 홈”으로 이탈하던 흐름이 사라졌다.
- 회원가입 후 재실행 시 닉네임 미완료 상태면 안정적으로 `NicknameSetup`으로 복귀한다.
- `가입 중...`이 영구 고정되는 케이스를 줄였다.

### 의도

온보딩은 “완주율”이 핵심이기 때문에, 뒤로 이탈 경로와 중단 복구 품질이 직접 성능 지표가 된다.
이번 보정은 단계 강제와 draft 복구를 함께 묶어 실제 이탈률을 줄이는 방향으로 설계했다.

---

## Chapter 6-35 — 전체 코드 점검 + lint/타입 무오류 고정 + 리렌더 안정화

### 무엇을 바꿨나

- 전체 정적 점검을 기준으로 오류를 우선 정리했다.
  - `yarn lint`
  - `yarn exec tsc --noEmit`
- `RecordDetail`에서 조건부 Hook 호출 구조를 제거해 Hook order 오류를 해소했다.
- `RecordEdit / ScheduleEdit / PetCreate`의 Hook 의존성 배열을 재정리해 불필요 경고를 정리했다.
- `AppTabsNavigator`와 `LoggedInHome`의 inline 함수 생성 지점을 줄여 렌더 시 컴포넌트 재생성 경고를 해소했다.
  - TabBar renderer memoization
  - `ItemSeparatorComponent` inline 제거
- 비동기 fire-and-forget(`void`) 패턴을 `.catch` 기반으로 바꿔 예외 누락/경고를 정리했다.
  - Auth / Store / 온보딩 draft / Schedule / ProfileEdit 흐름 포함
- 핵심 파일 상단에 `파일 위치 + 역할` 주석을 통일해 유지보수 가독성을 개선했다.

### 결과

- lint 경고/오류를 모두 제거해 `lint clean` 상태를 확보했다.
- 타입체크도 무오류 상태를 유지했다.
- 탭바/슬라이더/온보딩 입력 구간의 불필요 재생성 포인트가 줄어 렌더 안정성이 개선됐다.

### 의도

기능 개발이 누적된 상태에서는 단일 버그보다 “작은 경고와 불안정 패턴의 누적”이 더 큰 장애로 이어진다.
이번 점검은 기능 추가보다 코드베이스 건강도를 회복하는 데 초점을 맞춰,
다음 개발 단계에서도 속도와 안정성을 동시에 유지할 수 있는 기반을 만들었다.

---

## Chapter 6-36 — PetCreate 진입 컨텍스트 분리 UX (온보딩 강제 유지 + 홈 진입 유연화)

### 배경

`PetCreate`는 지금 서비스에서 두 가지 성격을 동시에 가진다.

1. 온보딩 필수 단계
   - 회원가입/닉네임 직후에는 펫 등록이 끝나야 홈 경험이 완성된다.
   - 이 구간에서는 뒤로 빠지는 경로가 열리면 “펫 없는 로그인 홈”으로 이탈할 수 있어 완주율이 떨어진다.
2. 로그인 홈 내 기능 진입
   - 이미 서비스를 사용 중인 상태에서 홈의 작은 펫 추가 칩(+)으로 들어오는 경우
   - 이때는 강제 단계가 아니라 “추가 작업”에 가깝기 때문에 이전 화면 복귀 UX가 필요하다.

이 두 컨텍스트를 동일한 화면 정책으로 처리하면 한쪽 UX가 항상 깨진다.

### 무엇을 바꿨나

- `PetCreate`에서 진입 컨텍스트(`route.params.from`)를 기준으로 하단 액션을 분기했다.
  - `from === 'header_plus'`:
    - 1/2 단계 하단에 `이전으로` 버튼 노출
    - 사용자가 홈으로 자연스럽게 복귀 가능
  - `from === 'auto' | 'cta' | undefined`:
    - 기존 강제 온보딩 정책 유지
    - 1/2 단계에서 뒤로 이탈 버튼 미노출
- `이전으로` 버튼은 안전한 fallback을 포함한다.
  - `navigation.canGoBack()` 가능 시 `goBack`
  - 불가능한 스택 상태에서는 `AppTabs(HomeTab)` reset

### 결과

- 온보딩 구간의 강제 진행 UX는 그대로 유지된다.
- 로그인 홈에서 펫 추가로 진입한 사용자에게는 복귀 경로가 제공되어 사용성이 개선된다.
- 하나의 화면을 두 컨텍스트에 맞게 분기해도 타입/린트/동작 안정성은 유지된다.

### 검증

- `yarn exec tsc --noEmit` 통과
- `yarn lint` 통과

### 의도

“뒤로가기 차단”과 “뒤로가기 제공”은 서로 모순이 아니라, 진입 컨텍스트가 다를 때 각각 맞는 정책이다.
이번 보정은 화면을 분리하지 않고도 컨텍스트 기반 UX를 적용해,
온보딩 완주율과 실사용 편의성을 동시에 확보하는 데 목적이 있다.

---

## Chapter 6-37 — Sentry 모니터링 1차 적용 (크래시/성능/화면 트래킹 기반)

### 무엇을 바꿨나

- `@sentry/react-native`를 프로젝트에 설치했다.
- 모니터링 공통 레이어를 추가했다.
  - `src/services/monitoring/sentry.ts`
  - `src/services/monitoring/config.ts`
  - `src/services/monitoring/config.example.ts`
- 앱 시작 시 Sentry 초기화를 1회 수행하도록 연결했다.
  - DSN이 비어있으면 자동 비활성(오버헤드 없음)
- React Navigation 컨테이너를 Sentry와 연결해 화면 전환 트레이싱 기반을 만들었다.
- 인증 세션 변경 시 Sentry user context(`id`, `email`)를 동기화했다.
- 부팅 예외를 모니터링 레이어로 캡처하도록 연결했다.
- `metro.config.js`를 `withSentryConfig`로 감싸 소스맵/번들 처리 기반을 맞췄다.

### 결과

- 실제 운영에서 “어디서 터졌는지 모르는 상태”를 벗어날 수 있는 최소 관측 기반이 준비됐다.
- 화면 전환/부팅 구간에서 장애 추적이 가능해졌다.
- 현재 설정은 DSN 미입력 시 비활성이라 개발 중 성능/동작에 영향이 없다.

### 운영 적용 메모

- 배포 전 `src/services/monitoring/config.ts`에 실제 `SENTRY_DSN`을 넣어야 수집이 시작된다.
- 릴리즈 추적 정확도를 위해 `SENTRY_RELEASE`를 빌드 버전에 맞춰 업데이트하는 것을 권장한다.

---

## Chapter 6-38 — Sentry 실검증(DEV) + Release 빌드 검증

### 무엇을 진행했나

- Sentry DSN을 실제 값으로 연결하고, 개발 빌드 수집을 활성화했다.
  - `SENTRY_ENABLE_IN_DEV = true`
- `DevTest`에 Monitoring 섹션을 추가해 즉시 검증 가능한 버튼을 연결했다.
  - `테스트 이벤트`: message + exception 전송
  - `네이티브 크래시`: native crash 트리거
- 이벤트 그룹핑으로 확인이 헷갈리지 않도록 테스트 이벤트 메시지에 timestamp를 포함했다.
- `DevTest` 화면 스크롤/텍스트 렌더 오류를 수정해 테스트 동선을 안정화했다.
- Android 릴리즈 빌드를 실제 실행했다.
  - `./gradlew assembleRelease`
  - 결과: `BUILD SUCCESSFUL`

### 검증 결과

- Sentry 대시보드(`Errors & Outages`)에서 DEV 테스트 이벤트/예외가 정상 수집되는 것을 확인했다.
- 릴리즈 APK 생성이 성공해 배포 전 단계로 진행 가능한 상태를 확보했다.

### 운영 메모

- 네이티브 크래시 수집은 디버그 빌드에서 재현 편차가 있을 수 있어, 최종 판단은 release 설치 후 1회 확인이 권장된다.

---

## Chapter 6-39 — TSX 파일 역할 주석 정리 + 리렌더링 저위험 보정

### 무엇을 진행했나

- 프로젝트 내 `tsx` 파일 상단 주석을 전부 점검했다.
- 모든 `tsx` 파일 맨 위에 최소한 아래 정보가 보이도록 정리했다.
  - 파일 경로
  - 화면/컴포넌트 역할
  - 해당 파일이 플로우 안에서 맡는 책임
- 이미 주석이 있던 파일도 역할 설명이 약한 경우엔 보강했다.
- 리렌더링 관점에서는 “효과는 분명하지만 동작 리스크는 낮은” 항목만 먼저 손봤다.
  - `GuestHome`: `useMemo(() => () => ...)` 형태의 네비게이션 핸들러를 `useCallback`으로 단순화
  - `SignInScreen`: 비밀번호 토글 / 비밀번호 찾기 / 회원가입 이동 핸들러를 분리해 inline 함수 생성을 줄임
  - `WelcomeTransitionScreen`: 단순 문자열 파생값에서 불필요한 `useMemo` 제거
  - `HomeScreen`: 정적 splash 배경 asset require를 컴포넌트 바깥으로 이동

### 왜 이렇게 했나

- 지금 구조에서는 “무거운 화면을 무턱대고 memo로 감싸는 것”보다,
  먼저 책임을 읽기 쉽게 만들고 불필요한 함수/값 생성을 줄이는 편이 더 안전했다.
- 특히 홈/인증/스플래시 계열은 진입 빈도가 높아서,
  작은 정리라도 추후 리팩터링이나 성능 점검 때 기준점 역할을 하게 된다.
- 이번 작업은 대규모 동작 변경이 아니라,
  **읽기 쉬운 구조 확보 + 저위험 리렌더링 보정**에 초점을 맞췄다.

### 결과

- 각 `tsx` 파일이 “어디에 있고 무엇을 하는지”를 파일 상단만 보고 빠르게 파악할 수 있게 됐다.
- 이벤트 핸들러/정적 asset/단순 파생값 쪽의 불필요한 재생성을 일부 줄였다.
- 다음 단계에서 실제 체감 성능이 필요한 화면(`LoggedInHome`, `TimelineScreen`, 생성/수정 폼`)을
  더 깊게 프로파일링할 수 있는 준비가 됐다.

---

## Chapter 6-40 — 홈/타임라인/일정 화면 리렌더링 최적화 + 공용 재사용 레이어 정리

### 무엇을 진행했나

- 리렌더링 비용이 큰 화면과 중복 로직이 많은 화면을 우선 정리했다.
  - `LoggedInHome`
  - `TimelineScreen`
  - `ScheduleCreateScreen`
  - `ScheduleEditScreen`
  - `ScheduleListScreen`
  - `ScheduleDetailScreen`
  - `MemoryCard`
- 화면 안에 흩어져 있던 공통 규칙을 재사용 가능한 레이어로 분리했다.
  - `src/hooks/useSignedMemoryImage.ts`
    - memory image path → signed URL 변환/로딩 상태 공용 훅
  - `src/services/memories/categoryMeta.ts`
    - 기록 카테고리/서브카테고리 해석
    - 타임라인 필터 / 홈 카드 메타 공용화
  - `src/services/schedules/form.ts`
    - 일정 생성/수정 폼 옵션, 날짜/시간 정규화, reminder 매핑 공용화
  - `src/services/schedules/presentation.ts`
    - 일정 아이콘/색상/날짜 표시 규칙 공용화
- `LoggedInHome`에서는 중복 effect와 파생 계산을 줄였다.
  - signed URL 로딩 effect를 공용 훅으로 이동
  - 선택 펫 계산을 단순화
  - 불필요한 `useMemo` 일부 제거
  - 카드/월간 일기 서브 컴포넌트를 `memo` 기준으로 정리
- `TimelineScreen`과 홈의 카테고리 해석 규칙을 같은 유틸을 쓰도록 맞췄다.
- 일정 화면군(Create/Edit/List/Detail)이 서로 다른 방식으로 들고 있던
  아이콘/색상/날짜/알림 옵션을 한 군데로 묶었다.

### 왜 이렇게 했나

- 이전 구조는 화면별로 “거의 같은 코드”를 따로 들고 있어서,
  한쪽만 수정되면 다른 화면 규칙이 쉽게 어긋날 수 있었다.
- 특히 일정 화면군은 생성/수정 폼의 옵션과 검증 로직이 거의 복제 상태였고,
  홈/타임라인은 같은 기록 카테고리를 서로 다른 함수로 읽고 있었다.
- 이번 정리는 단순히 코드 줄이기 목적이 아니라,
  **같은 도메인 규칙은 같은 파일에서 관리한다**는 기준을 세우는 작업이다.

### 결과

- 홈/타임라인/일정 화면이 같은 규칙을 공유하게 됐다.
- signed URL 로딩 로직이 공용 훅으로 정리돼 이미지 카드 계열의 중복 effect가 줄었다.
- 일정 화면군의 옵션/검증 로직이 한 곳으로 모여 이후 기능 추가 시 수정 지점이 명확해졌다.
- 이번 수정 범위 기준으로 아래 검증을 통과했다.
  - `yarn tsc --noEmit`
  - `yarn eslint ...`

### 다음에 바로 이어서 보기 좋은 지점

- `LoggedInHome`를 섹션 단위 컴포넌트로 더 쪼개기
- `RecordCreateScreen` / `RecordEditScreen`의 날짜/태그/이미지 로직 공용화
- 다중 이미지 signed URL도 단건 훅처럼 공용 훅으로 승격

---

## Chapter 6-41 — Record 생성/수정 폼 공용화 + 입력 규칙 정리

### 무엇을 진행했나

- `RecordCreateScreen`와 `RecordEditScreen`가 각각 들고 있던 폼 헬퍼를 공용 레이어로 분리했다.
  - `src/services/records/form.ts`
- 공용화한 항목은 아래 기준이다.
  - 기록 카테고리/기타 서브카테고리 옵션
  - 감정 옵션
  - picker 이미지 mimeType 추론
  - 다중 이미지 선택 결과 정리
  - 날짜 포맷/오프셋/검증
  - 태그 파싱/병합
  - 최근 태그 저장소 키와 최근 태그 정규화
- `RecordCreateScreen`는 새 공용 헬퍼를 기준으로
  이미지 추가, 날짜 단축 선택, 태그 병합, 최근 태그 저장 흐름을 정리했다.
- `RecordEditScreen`도 같은 공용 규칙을 사용하도록 맞췄다.
  - 태그 파싱
  - 날짜 검증
  - picker 이미지 추가
  - 감정 옵션 렌더링

### 왜 이렇게 했나

- 레코드 생성/수정 화면은 같은 도메인인데도,
  실제로는 거의 같은 helper를 각 파일 안에 복제해서 들고 있었다.
- 이 상태에서는 한쪽만 수정되어 규칙이 어긋날 가능성이 높았고,
  나중에 태그 정책이나 이미지 선택 규칙을 바꾸면 두 화면을 같이 수정해야 했다.
- 이번 정리는 “기록 입력 규칙은 한 곳에서 관리한다”는 기준을 세우는 작업이다.

### 결과

- 생성/수정 화면이 같은 입력 규칙을 공유하게 됐다.
- 레코드 폼 관련 중복 코드가 줄었고, 다음 단계 리팩터링 범위가 더 명확해졌다.
- 이번 수정 범위 기준 검증:
  - `yarn tsc --noEmit`
  - `yarn eslint src/services/records/form.ts src/screens/Records/RecordCreateScreen.tsx src/screens/Records/RecordEditScreen.tsx`

### 다음 후보

- `RecordCreateScreen` / `RecordEditScreen`의 이미지 프리뷰 UI 자체를 공용 컴포넌트로 추출
- 태그 모달/날짜 모달도 공용 컴포넌트로 승격

---

## Chapter 6-42 — LoggedInHome 섹션 분리 + Record/Schedule UI 공용 컴포넌트화 + Jest 복구

### 무엇을 진행했나

- `LoggedInHome`의 큰 렌더 블록을 섹션 컴포넌트로 분리했다.
  - 오늘의 사진
  - 오늘의 기록
  - 일정 보기
  - 최근 활동
  - 이번 달 일기
- 이 분리 목적은 “파일 예쁘게 쪼개기”가 아니라,
  각 섹션이 독립적인 렌더 경계를 갖도록 만드는 데 있다.
- 레코드 화면 공용 UI도 추가했다.
  - `src/components/records/RecordImageGallery.tsx`
  - `src/screens/Records/components/RecordDateModal.tsx`
  - `src/screens/Records/components/RecordTagModal.tsx`
- 일정 생성/수정 화면의 날짜/시간 선택 모달도 공용 컴포넌트로 묶었다.
  - `src/components/schedules/SchedulePickerModal.tsx`
- Jest 설정도 실제 루트 스모크 테스트가 통과하도록 보완했다.
  - `jest.config.js`
  - `jest.setup.js`
  - `react-navigation`, `AsyncStorage`, `Sentry`, `image-picker`, `blob-util`, `reanimated` 등 테스트 환경 mock 보강

### 왜 이렇게 했나

- `LoggedInHome`는 데이터가 많아서 펫 전환이나 store 갱신 때 여러 섹션이 한 번에 다시 그려질 여지가 있었다.
- 레코드 생성 화면은 날짜/태그 모달과 이미지 프리뷰 UI가 파일 안에 크게 붙어 있었고,
  수정 화면도 별도 이미지 프리뷰 UI를 따로 들고 있었다.
- 일정 생성/수정은 이미 로직은 공용화했지만, picker modal UI는 그대로 복제 상태였다.
- 테스트는 “코드가 맞는지”보다 “환경이 못 따라오는 상태”가 더 큰 문제였어서,
  최소한 루트 렌더 스모크 테스트는 다시 살아나게 만드는 게 우선이었다.

### 결과

- `LoggedInHome`는 큰 섹션 기준으로 렌더 책임이 더 또렷해졌다.
- 레코드 생성/수정 화면은 공용 이미지 프레임과 공용 모달을 기반으로 정리됐다.
- 일정 생성/수정 화면은 날짜/시간 모달 UI를 한 컴포넌트로 공유하게 됐다.
- Jest 기준 최소 스모크 테스트가 다시 통과한다.

### 검증

- `yarn tsc --noEmit`
- `yarn eslint ...`
- `yarn test --watchAll=false --watchman=false`
  - `react-native-screens` 링크 경고 로그는 남지만 테스트 자체는 통과

### 다음 후보

- `LoggedInHome`의 헤더/히어로/아코디언 영역도 별도 파일로 분리
- `RecordImageGallery`의 variant props를 줄이고 스타일 계약을 더 단단하게 정리
- Jest에서 `react-native-screens` 경고까지 조용하게 처리

---

## Chapter 6-43 — 출시 전 UX 보강: 전역 토스트, 동의 이력, 계정 삭제, 업로드 복구 큐, 기록 draft, 주간 요약

### 무엇을 진행했나

- 앱 전역 toast 레이어를 추가했다.
  - `src/store/uiStore.ts`
  - `src/components/common/GlobalToast.tsx`
- 네트워크/일반 실패를 같은 톤으로 다루기 위한 에러 정규화 헬퍼를 추가했다.
  - `src/services/app/errors.ts`
- 회원가입 동의 저장 흐름을 분리했다.
  - `terms / privacy / marketing` 스냅샷을 로컬에 저장
  - 로그인 세션이 준비되면 `user_consent_history`로 flush
  - `src/services/legal/consents.ts`
- 로그아웃/탈퇴 후 로컬 정리 규칙을 공용화했다.
  - `src/services/auth/session.ts`
  - `MoreScreen`, `MoreDrawerContent`에서 같은 규칙 사용
- 계정 삭제 RPC와 동의 이력 테이블 SQL 초안을 추가했다.
  - `docs/sql/release_account_consents.sql`
- 기록 작성 중단 복구를 위해 `RecordCreate` draft 저장/복원을 붙였다.
  - `src/services/local/recordDraft.ts`
  - `src/screens/Records/RecordCreateScreen.tsx`
- 이미지 업로드 실패분을 나중에 복구하는 큐를 추가했다.
  - `src/services/local/uploadQueue.ts`
  - 앱 부팅/포그라운드 복귀 시 재시도
- 홈에 “이번 주 요약” 카드를 추가했다.
  - `src/services/home/weeklySummary.ts`
  - `src/screens/Main/components/LoggedInHome/LoggedInHome.tsx`

### 왜 이렇게 했나

- 지금 단계에서 가장 위험한 건 “실패했을 때 사용자가 뭘 해야 하는지 모르는 상태”였다.
- 그래서 이번 보강은 기능 추가보다도
  - 실패를 짧게 알려주는 피드백
  - 작성 중인 데이터 보존
  - 업로드 실패 후 나중에 복구되는 경로
  - 탈퇴/동의처럼 운영에 필요한 상태 이력
  쪽에 무게를 뒀다.
- 홈의 주간 요약은 데이터가 쌓이기 시작했을 때 바로 체감이 오도록 넣었다.

### 결과

- 회원가입 후 동의 이력 저장 구조가 앱/SQL 양쪽에 생겼다.
- 로그아웃과 계정 삭제는 공통 정리 규칙을 쓰게 됐다.
- `RecordCreate`는 앱을 닫거나 저장이 실패해도 draft를 다시 불러올 수 있다.
- 이미지 업로드가 일부 실패해도 대기 큐에 넣고 앱이 다시 활성화될 때 재시도한다.
- 홈에서 이번 주 산책/식사/건강/기록일 수를 바로 볼 수 있다.
- 전역 toast가 들어가서 Alert만으로 끝나지 않게 됐다.

### 자동 검증

- `yarn tsc --noEmit`
- `yarn eslint App.tsx ...`
- `yarn test --watchAll=false --watchman=false`
- 추가 테스트:
  - `__tests__/weeklySummary.test.ts`
  - `__tests__/appErrors.test.ts`

### 남겨둔 것

- `Crashlytics`, 홈 위젯, 진짜 이미지 픽셀 기반 테마 추출, 실제 E2E 도구 연결은 아직 안 들어갔다.
- 이 항목들은 네이티브 설정/외부 의존성/배포 환경 준비가 더 필요해서 다음 단계로 넘긴다.

---

## Chapter 6-44 — Timeline 캘린더 히트맵 + Release QA 체크리스트 정리

### 무엇을 진행했나

- 타임라인 상단에 최근 12주 기준의 캘린더 히트맵을 추가했다.
  - `src/services/timeline/heatmap.ts`
  - `src/screens/Records/TimelineScreen.tsx`
  - `src/screens/Records/TimelineScreen.styles.ts`
- 날짜별 기록 수를 집계해서 강도 5단계(`0~4`)로 시각화했다.
- 오늘 날짜는 별도 border로 강조하고, 이번 달이 아닌 날짜는 opacity를 낮춰 구분했다.
- QA 체크리스트 문서도 따로 정리했다.
  - `docs/qa/release-checklist.md`
- 히트맵 집계 로직에 대한 테스트를 추가했다.
  - `__tests__/timelineHeatmap.test.ts`

### 왜 이렇게 했나

- 타임라인은 기록이 많아질수록 “어느 날에 남겼는지” 감으로 보기 어려워진다.
- 리스트 기반 탐색만으로는 밀도나 공백 구간을 파악하기 어렵기 때문에,
  최근 12주 흐름을 한 번에 읽을 수 있는 압축 뷰가 필요했다.
- 그리고 지금 단계에서는 기능 추가만큼 중요한 게
  출시 전에 뭘 확인해야 하는지 팀 기준을 남기는 일이라서,
  QA 체크리스트도 같이 문서화했다.

### 결과

- 타임라인 진입 시 상단에서 최근 기록 밀도를 바로 확인할 수 있다.
- QA 항목이 가입/로그인/로그아웃/회원탈퇴/기록/업로드 복구/홈/모니터링 기준으로 정리됐다.

### 검증

- `yarn tsc --noEmit`
- `yarn eslint src/screens/Records/TimelineScreen.tsx src/screens/Records/TimelineScreen.styles.ts src/services/timeline/heatmap.ts __tests__/timelineHeatmap.test.ts`
- `yarn test --watchAll=false --watchman=false __tests__/timelineHeatmap.test.ts`

---

## Chapter 6-45 — QA 자동화 1차: 핵심 도메인 회귀 테스트 묶음 정리

### 무엇을 진행했나

- 출시 전에 자주 깨질 수 있는 핵심 규칙을 Jest 회귀 테스트로 묶었다.
  - `__tests__/recordsForm.test.ts`
  - `__tests__/schedulesForm.test.ts`
  - `__tests__/categoryMeta.test.ts`
  - `__tests__/consents.test.ts`
- 이미 만들어둔 테스트와 합쳐서 QA 전용 실행 명령도 추가했다.
  - `package.json` → `yarn test:qa`
- `docs/qa/release-checklist.md`에도 자동화 실행 순서를 함께 적었다.

### 왜 이렇게 했나

- 지금 프로젝트는 실제 E2E 도구를 새로 붙이지 않아도,
  폼 규칙/카테고리 해석/동의 저장/주간 요약/히트맵 같은 도메인 규칙만 깨져도
  사용자 체감 문제가 바로 생긴다.
- 그래서 이번 단계는 “디바이스 E2E 전부 자동화”보다
  “핵심 비즈니스 규칙을 빠르게 깨지지 않게 고정”하는 쪽에 우선순위를 뒀다.

### 결과

- QA용 핵심 회귀 스위트가 아래 명령 하나로 돌 수 있다.
  - `yarn test:qa`
- 현재 자동화 범위는 아래를 포함한다.
  - 기록 태그/날짜/picker mimeType 규칙
  - 일정 날짜/시간/알림/반복 규칙
  - 타임라인/홈 공용 카테고리 해석
  - 동의 스냅샷 저장/복원/삭제
  - 주간 요약 계산
  - 타임라인 히트맵 집계
  - 공용 에러 문구

### 검증

- `yarn test:qa`
- `yarn tsc --noEmit`

### 아직 남은 것

- 실제 디바이스 시나리오 기반 E2E 도구 연결은 아직 없다.
- 즉, 지금 단계는 “핵심 로직 자동화”까지고,
  네비게이션/실기기/스토리지/권한까지 포함하는 진짜 E2E는 다음 단계다.

---

## Chapter 6-46 — Crashlytics 1차 연동: Firebase 네이티브 설정 + JS 모니터링 통합

### 무엇을 진행했나

- React Native Firebase 의존성을 추가했다.
  - `@react-native-firebase/app`
  - `@react-native-firebase/crashlytics`
- Android에 Firebase 플러그인을 연결했다.
  - `android/build.gradle`
  - `android/app/build.gradle`
- iOS는 `FirebaseApp.configure()`가 앱 시작 시 1회 실행되도록 연결했다.
  - `ios/nuri/AppDelegate.swift`
  - `ios/Podfile`
- JS 모니터링 래퍼도 Sentry + Crashlytics를 함께 타도록 확장했다.
  - `src/services/monitoring/sentry.ts`
  - `src/services/monitoring/config.ts`
  - `src/services/monitoring/config.example.ts`
- Firebase 설정은 `firebase.json`으로 추가했다.
- Jest mock도 보강해서 기존 테스트가 유지되게 맞췄다.
  - `jest.setup.js`

### 왜 이렇게 했나

- 운영 단계에서는 JS 예외만 수집하는 것보다
  네이티브 크래시와 릴리즈 심볼 업로드 체인까지 같이 잡히는 구조가 필요하다.
- 기존 프로젝트는 Sentry는 이미 들어가 있었지만,
  Firebase Crashlytics가 없어 네이티브 크래시 관점의 운영 안전망이 비어 있었다.
- 그래서 이번 단계는 “Sentry를 없애는” 방식이 아니라,
  기존 모니터링 래퍼를 유지하면서 Crashlytics를 병행 수집하는 쪽으로 설계했다.

### 결과

- `captureMonitoringException`, `captureMonitoringMessage`, `setMonitoringUser`,
  `triggerMonitoringNativeCrash` 호출이 Sentry와 Crashlytics 양쪽으로 퍼지게 됐다.
- iOS Pods 설치도 완료됐다.
- 다만 실제 네이티브 빌드 완료를 위해 아래 두 파일은 직접 넣어야 한다.
  - `android/app/google-services.json`
  - `ios/nuri/GoogleService-Info.plist`

### 검증

- `yarn tsc --noEmit`
- `yarn test --watchAll=false --watchman=false __tests__/App.test.tsx __tests__/appErrors.test.ts __tests__/weeklySummary.test.ts __tests__/timelineHeatmap.test.ts`
- `pod install`
  - iOS 환경에서 `xcode-select`가 Command Line Tools를 가리키는 경고는 남았지만 설치는 완료됐다.

### 남은 것

- Firebase 콘솔에서 다운로드한 실제 설정 파일 배치
- Android/iOS release 빌드에서 Crashlytics 이벤트/크래시 실수집 확인

---

## Chapter 6-47 — 펫 테마 선택 + Android 홈 위젯 + Maestro E2E 스모크 추가

### 무엇을 진행했나

- 펫 프로필 생성/수정 화면에 공용 `PetThemePicker`를 추가했다.
  - `src/components/pets/PetThemePicker.tsx`
- 테마 계산/파생 팔레트를 공용 서비스로 묶었다.
  - `src/services/pets/themePalette.ts`
- 홈 화면은 선택된 펫의 테마를 헤더/히어로/태그 강조색에 반영하도록 정리했다.
  - `src/screens/Main/components/LoggedInHome/LoggedInHome.tsx`
- 홈의 프로필 진입 버튼은 톱니바퀴 대신 `🐾` 이모티콘으로 바꿨다.
- 오늘의 메시지 영역은 별도 배경 없이 더 가볍게 보이도록 조정했다.
- Android 홈 위젯 브리지와 네이티브 위젯을 추가했다.
  - `src/services/home/widgetBridge.ts`
  - `src/services/home/widgetSnapshot.ts`
  - `android/app/src/main/java/com/nuri/widget/*`
  - `android/app/src/main/res/layout/nuri_home_widget.xml`
- Maestro 스모크 플로우를 추가했다.
  - `.maestro/login-record-crud.yaml`
  - `.maestro/account-delete.yaml`

### 왜 이렇게 했나

- 자동 추천만 노출하면 사용자가 원하는 브랜드 감각을 직접 고르기 어렵다.
- 그래서 추천 색은 기본값 계산에만 쓰고, 실제 선택은 사용자가 하도록 바꿨다.
- 홈 위젯은 앱 렌더링 트리와 분리된 네이티브 스냅샷 구조로 붙여야 리렌더링 부담이 없다.
- QA 자동화도 도메인 테스트만으로는 부족해서, 실제 탭 이동과 CRUD 흐름을 따라가는 스모크 플로우가 필요했다.

### 결과

- 펫별 테마를 사용자가 직접 선택할 수 있다.
- 홈 카드와 태그 강조색이 선택된 펫의 테마와 함께 움직인다.
- Android 홈 화면에서 오늘 일정/최근 기록을 바로 볼 수 있다.
- Maestro로 로그인, 기록 생성/수정/삭제, 회원탈퇴 스모크 플로우를 실행할 수 있다.

---

## Chapter 6-48 — 펫 추모 프로필 + 테마 확장 + Pretendard 적용 준비

### 무엇을 진행했나

- 펫 생성/수정 화면에 `추모 프로필` 선택과 날짜 입력을 공용 UI로 붙였다.
  - `src/components/pets/PetMemorialFields.tsx`
  - `src/screens/Pets/PetCreateScreen.tsx`
  - `src/screens/Pets/PetProfileEditScreen.tsx`
- 추모 상태 해석을 공용 서비스로 묶고, 홈 문구와 이름 표기에 재사용했다.
  - `src/services/pets/memorial.ts`
- 홈, 타임라인, 기록하기, 하단 탭 네비게이션까지 선택된 펫 테마가 이어지게 정리했다.
  - `src/screens/Main/components/LoggedInHome/LoggedInHome.tsx`
  - `src/navigation/AppTabsNavigator.tsx`
  - `src/screens/Records/TimelineScreen.tsx`
  - `src/screens/Records/RecordCreateScreen.tsx`
- 홈의 `반가워요!` 문구와 `함께한 시간` 하트도 테마와 연결했다.
  - 하트는 단순 동일색이 아니라, 테마색과 겹치지 않도록 대비되는 보조색 규칙으로 바꿨다.
- 전역 폰트 토큰을 `PretendardVariable` 기준으로 받을 수 있게 준비했다.
  - `src/app/theme/tokens/typography.ts`
  - `react-native.config.js`
  - `src/assets/fonts/.gitkeep`

### 왜 이렇게 했나

- 추모 프로필은 생성 시점에만 필요한 정보가 아니라, 이후 언제든 바뀔 수 있는 상태다.
- 그래서 온보딩과 프로필 수정에서 같은 규칙과 같은 입력 방식을 쓰게 맞췄다.
- 테마는 홈 한 군데만 바뀌면 어색해서, 기록 작성과 타임라인, 탭까지 함께 움직여야 일관성이 생긴다.
- 하트처럼 의미 아이콘은 테마색과 겹치면 보이지 않기 쉬워서, 단순 tint가 아니라 대비색 규칙이 필요했다.
- 폰트도 화면마다 따로 만지기보다 `AppText` 기반 전역 토큰에서 한 번에 바뀌게 잡는 편이 유지보수에 안전하다.

### 결과

- 추모 프로필 사용자도 자연스럽게 등록/수정할 수 있다.
- 홈의 이름, 오늘의 메시지, 하트, 타임라인/기록하기/탭 액션이 같은 펫 테마를 공유한다.
- 추모 프로필의 오늘의 메시지 아이콘은 촛불 대신 무지개로 통일했다.
- 함께한 시간 하트는 테마와 겹치지 않도록 색상 tint 대신 대비되는 하트 이모지로 바꿨다.
- `PretendardVariable.ttf`를 자산으로 링크해서 앱 전역 텍스트가 Pretendard 기준으로 동작할 준비를 마쳤다.

---

## Chapter 6-49 — 더보기 전면 정리 + 계정 설정 모달 + 닉네임 월간 제한

### 무엇을 진행했나

- 더보기 드로어를 화면 폭 기준으로 다시 정리하고, 그림자 없이 플랫한 전체 메뉴 레이아웃으로 바꿨다.
  - `src/components/MoreDrawer/MoreDrawer.tsx`
  - `src/screens/More/MoreDrawerContent.tsx`
- 상단을 고정 제목형이 아니라 인사형 헤더로 바꾸고, 오른쪽 프로필 액션 버튼과 연결했다.
- 더보기 하단에도 앱 주요 탭으로 바로 이동할 수 있는 네비게이션 툴바를 붙였다.
- 섹션 카드를 `나의 반려동물 / 활동 및 기록 / 소통 및 정보 / 앱 서비스 설정` 구조로 재정렬했다.
- 계정 섹션에 `닉네임 수정`, `비밀번호 변경`, `로그아웃`, `회원탈퇴`를 넣었다.
- `닉네임 수정` 모달에서 닉네임을 바꿀 수 있게 했고, 닉네임은 월 1회만 변경되도록 로컬 정책을 분리했다.
  - `src/services/local/accountPreferences.ts`
- `비밀번호 변경`은 현재 비밀번호 확인 + 새 비밀번호 검증 + 완료 팝업 흐름으로 묶었다.
  - `src/services/supabase/account.ts`
- 홈 프로필에만 추모 무지개가 보이고, 요약 섹션에서는 빠지도록 이름 사용 범위를 분리했다.
  - `src/screens/Main/components/LoggedInHome/LoggedInHome.tsx`
- 더보기의 아이콘 박스 배경색도 선택된 펫 테마를 따라가도록 연결했다.

### 왜 이렇게 했나

- 더보기는 정보 밀도가 높은 화면이라, 그림자나 떠 있는 카드보다 간격 정리가 더 중요했다.
- 그래서 카드/섹션/행의 패딩과 마진을 일정한 규칙으로 다시 잡아 전체 화면이 정돈돼 보이도록 맞췄다.
- 계정 설정은 별도 화면으로 흩어놓기보다 더보기 안에서 바로 끝나는 모달 흐름이 더 빠르고 직관적이다.
- 더보기도 홈의 연장선처럼 느껴져야 해서, 선택된 펫 테마가 아이콘 배경과 포인트 색에 이어지게 맞췄다.
- 주요 탭으로 돌아가기 위해 더보기를 닫고 다시 찾는 흐름은 불필요해서, 하단 툴바에서 바로 이동할 수 있게 했다.
- 닉네임 변경 제한은 서버 강제 전에도 사용자 기대를 먼저 맞추기 위해 앱 정책으로 선반영했다.

### 결과

- 더보기 화면이 꽉 차게 보이면서도 답답하지 않게 정리됐다.
- 인사형 헤더, 섹션 카드, 하단 네비게이션 툴바가 한 톤으로 정리돼 메뉴 구조가 더 읽기 쉬워졌다.
- 더보기 안에서도 홈/타임라인/기록/방명록으로 바로 이동할 수 있다.
- 아이콘 배경과 포인트 색이 선택된 펫 테마와 연결되어 화면 간 분위기가 끊기지 않는다.
- 닉네임 변경과 비밀번호 변경을 더보기 안에서 바로 처리할 수 있다.
- 비밀번호 변경은 완료 팝업까지 포함한 닫힌 UX로 마감된다.
- 추모 무지개 표시는 프로필 맥락에서만 노출되어, 요약 카드들에는 과하게 반복되지 않는다.

---

## Chapter 6-50 — 더보기 테마 확장 + 하단 툴바 + 기록 상세 피드화

### 무엇을 진행했나

- 더보기 상단 프로필 원형 버튼을 더 키워서 헤더 비중에 맞게 재조정했다.
- 더보기 아이콘 박스 배경색이 선택된 펫 테마를 따라가도록 연결했다.
- 더보기 하단에 실제 앱 탭과 같은 역할을 하는 네비게이션 툴바를 붙였다.
  - `홈`
  - `타임라인`
  - `기록`
  - `방명록`
  - `더보기`
- 아직 실제 화면이 없는 메뉴는 `soon` 배지를 보이도록 정리했다.
  - `건강 기록 리포트`
  - `산책 코스 보관함`
  - `커뮤니티`
  - `집사 꿀팁 가이드`
  - `알림 설정`
- 타임라인 상세 화면 아래를 “다른 추억 추천” 카드가 아니라, 같은 아이의 기록이 계속 이어지는 피드 형태로 바꿨다.
  - `src/screens/Records/RecordDetailScreen.tsx`
  - `src/screens/Records/RecordDetailScreen.styles.ts`
- 기록 상세 하단은 스크롤이 바닥에 가까워지면 `loadMore`가 이어져, 같은 펫의 기록을 더 길게 따라볼 수 있게 했다.

### 왜 이렇게 했나

- 더보기는 단순 메뉴 모음보다 “앱 안의 허브”처럼 보여야 탐색 흐름이 부드럽다.
- 그래서 테마, 툴바, 메뉴 아이콘까지 홈과 같은 리듬을 공유하게 맞췄다.
- 상세 화면도 한 건만 보고 끝나는 구조보다, 바로 다음 기록으로 이어지는 방식이 기록 앱 경험에 더 잘 맞는다.
- 인스타처럼 무한 피드의 감각을 주되, 현재 구조에서는 같은 펫의 기록을 이어 보는 쪽이 맥락상 자연스럽고 구현 부담도 덜하다.

### 결과

- 더보기에서 바로 주요 탭으로 이동할 수 있다.
- 더보기 아이콘과 툴바 포인트 색이 선택된 펫 테마와 일관되게 움직인다.
- 아직 준비 중인 메뉴는 구현 상태가 사용자에게 더 명확하게 보인다.
- 기록 상세 화면에서 다른 추억이 아래로 자연스럽게 이어져 체류 흐름이 길어졌다.
- 상세 피드는 기존 recordStore 페이지네이션을 재사용해서 성능 부담을 크게 늘리지 않았다.

---

## Chapter 6-51 — 상세 카드별 액션 메뉴 + 공용 하단 툴바 재사용

### 무엇을 진행했나

- 더보기 하단에 하드코딩돼 있던 툴바를 [`src/components/navigation/AppNavigationToolbar.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/components/navigation/AppNavigationToolbar.tsx) 로 분리했다.
- 더보기와 추억 상세 화면이 같은 하단 네비게이션 툴바를 재사용하도록 연결했다.
- 더보기 드로어 열림 상태는 [`src/store/uiStore.ts`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/store/uiStore.ts) 의 전역 상태를 사용하도록 맞췄다.
- 추억 상세 화면 상단의 `<` 버튼과 상단 `...` 버튼을 제거했다.
- 각 기록 카드마다 `...` 액션 버튼을 넣어서, 카드 진입 없이 바로 `수정 / 삭제`를 할 수 있게 바꿨다.
- 추억 상세 카드 본문은 한 줄 캡션 대신 아래 순서로 다시 나눴다.
  - 이름
  - 제목
  - 내용
  - 감정 / 태그 / 날짜
- “이어지는 기록” 같은 설명 문구는 제거하고, 카드가 바로 이어지는 피드 흐름만 남겼다.

### 왜 이렇게 했나

- 기록 상세는 문서형 상세보다 피드형 소비 흐름이 더 자연스럽다.
- 특히 수정/삭제가 필요한 기록 앱에서는 카드마다 액션이 바로 보이는 편이 훨씬 직관적이다.
- 상단 헤더 액션은 현재 카드와 아래 카드들의 책임이 섞여 보여서, 카드 단위 액션으로 옮기는 게 구조적으로도 더 명확했다.
- 하단 툴바는 더보기와 상세에서 같은 이동 규칙을 써야 학습 비용이 줄어든다.
- 본문도 이름/제목/내용을 분리해야 한눈에 읽히고, 감정 기록 앱 톤에도 더 잘 맞는다.

### 결과

- 더보기와 추억 상세가 같은 네비게이션 툴바를 공유한다.
- 추억 상세 화면은 상단 액션 없이 훨씬 단순한 피드 화면이 됐다.
- 각 카드에서 바로 `수정 / 삭제`가 가능해졌다.
- 기록 내용이 이름, 제목, 내용 순으로 읽혀서 가독성이 좋아졌다.
- 기존 페이지네이션을 재사용해 무한 피드 감각은 유지하면서 렌더링 구조는 단순해졌다.

---

## Chapter 6-52 — 기록 수정 재동기화 + 상세 본문 톤 다운

### 무엇을 진행했나

- 기록 수정 저장 후 로컬 패치만 믿지 않고 `refresh(petId)`까지 호출하도록 바꿨다.
- 추억 상세 카드 본문에서 이름 줄은 제거했다.
- 상세 카드 본문은 `제목 → 내용 → 감정/태그/날짜` 순서만 남기도록 정리했다.
- 제목은 이전보다 폰트를 줄이고 weight도 낮춰서 과하게 튀지 않게 조정했다.

### 왜 이렇게 했나

- 기록 수정은 저장 직후 상세/리스트에서 바로 최신 상태가 보여야 체감이 좋다.
- 로컬 patch만으로 충분할 때도 있지만, 실제 운영에서는 서버 정합을 한 번 더 맞추는 편이 안전하다.
- 상세 본문은 이름이 이미 헤더에서 한 번 보이기 때문에 아래에서 반복할 필요가 없다.
- 제목은 내용보다 살짝만 강조되는 정도가 읽기 흐름에 더 자연스럽다.

### 결과

- 기록 수정 후 상세화면과 목록 반영이 더 안정적으로 맞춰진다.
- 상세 카드 본문이 덜 복잡하고 더 읽기 쉬워졌다.
- 제목과 내용의 위계가 과하지 않게 정리됐다.

---

## Chapter 6-53 — 실패 문구 톤 정리 + 공통 에러 매핑

### 무엇을 진행했나

- [`src/services/app/errors.ts`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/services/app/errors.ts) 에 공통 에러 매핑 규칙을 추가했다.
- 백엔드나 Supabase에서 넘어오는 영어 원문 에러를 그대로 보여주지 않고, 상황에 맞는 한국어 안내 문구로 바꿨다.
- 아래 주요 흐름에 공통 매핑을 연결했다.
  - 로그인
  - 회원가입
  - 닉네임 저장
  - 반려동물 등록 / 수정
  - 기록 저장 / 수정 / 삭제
  - 일정 저장 / 수정 / 조회
  - 비밀번호 변경
  - 로그아웃
  - 회원탈퇴

### 왜 이렇게 했나

- 서비스 톤이 정리돼 있어도 실패 문구에서 갑자기 영어 원문이 나오면 완성도가 크게 떨어진다.
- 특히 인증/저장/업로드 실패는 사용자가 가장 불안해하는 구간이라, 원인을 차분하게 설명하는 문구가 필요했다.
- 화면마다 제각각 다른 톤을 쓰면 브랜드 인상이 약해지기 때문에, 공통 규칙으로 묶는 편이 유지보수와 품질 모두에 유리하다.

### 결과

- `user already registered`, `invalid login credentials`, `email not confirmed` 같은 원문이 그대로 보이지 않는다.
- 네트워크 불안정, 인증 만료, 권한 부족, 업로드 지연 같은 상황이 더 자연스러운 한국어 문구로 안내된다.
- 로그인/회원가입/기록/일정/계정 설정 전반의 실패 UX 톤이 한결 정돈됐다.

---

## Chapter 6-54 — 지능형 날씨 가이드 UI 구조 선반영

### 무엇을 진행했나

- 홈 상단에 `지능형 날씨 가이드` 카드를 추가했다.
- 위치명, 현재 기온, 한 줄 추천 문구를 보여주는 요약 카드를 눌러 날씨 상세 화면으로 이어지게 만들었다.
- 날씨 상세 화면은 아래 구조로 고정했다.
  - 현재 날씨 / 온도 / 상태 문구
  - 주간 예보 스트립
  - 미세먼지 / 초미세먼지 / 오존 카드
  - 상황별 추천 CTA
- 날씨가 좋지 않을 때 이어지는 `실내 놀이 추천` 화면을 만들었다.
- 실내 활동 상세 가이드를 `노즈워크 / 터그 놀이 / 개인기 연습 / 홈 마사지` 4종으로 분리했다.
- 각 가이드에서 바로 이어지는 전용 기록 화면과 완료 팝업까지 같이 붙였다.
- API 연결 전 단계라서 실제 네트워크 호출 대신, 위치명 문자열을 기준으로 mock 시나리오를 재사용하는 구조로 먼저 고정했다.

### 왜 이렇게 했나

- 날씨 API와 위치 권한은 붙이는 순간 고려해야 할 예외가 많다.
- 그래서 먼저 레이아웃, 상태 분기, 화면 흐름, 기록 연결을 다 만든 다음 API를 붙이는 편이 훨씬 안전하다.
- 같은 카드, 같은 예보 스트립, 같은 공기질 카드가 홈/상세/추천 흐름에서 반복되기 때문에 공용 컴포넌트로 먼저 분리해두는 쪽이 유지보수와 리렌더링 측면에서 유리하다.
- 실제 위치 기반 값이 들어와도 화면 구조는 그대로 유지되고 데이터만 갈아끼우는 형태가 되도록 설계했다.

### 어떻게 나눴나

- 공용 데이터 계층
  - `src/services/weather/guide.ts`
- 공용 UI 컴포넌트
  - `WeatherGuideHomeCard`
  - `WeatherForecastStrip`
  - `AirQualityInsightCard`
  - `IndoorActivityCard`
  - `ActivityGuideHeroCard`
- 화면 계층
  - `WeatherInsightScreen`
  - `IndoorActivityRecommendationsScreen`
  - `ActivityGuideScreen`
  - `WeatherActivityRecordScreen`

### 결과

- 홈에서 날씨 기반 활동 추천 흐름이 하나의 기능 묶음으로 생겼다.
- 상세 날씨, 실내 놀이 추천, 활동 가이드, 기록 저장까지 UX가 자연스럽게 이어진다.
- 아직 API를 붙이지 않았는데도 디자인 시안 기준의 화면 구조와 사용자 흐름은 거의 완성됐다.
- 다음 단계에서는 위치 권한과 실제 날씨 API만 붙이면 된다.

---

## Chapter 6-55 — 날씨 카드 톤 정리 + 실내 활동 기록 입력 보정

### 무엇을 진행했나

- 홈 날씨 카드는 다시 보더가 보이도록 원복했다.
- 대신 펫 프로필 카드는 보더와 그림자를 모두 제거해서 더 평평한 카드로 정리했다.
- `오늘의 메시지` 영역은 카드처럼 띄우지 않고, 하단에만 아주 연한 보더와 아래쪽 그림자를 주는 방식으로 정리했다.
- 날씨 카드 우측 화살표는 검정으로 정리해 대비를 높였다.
- 실내 활동 기록 화면에서는 사진 기본값을 비워두고, 제목도 placeholder만 남기고 기본 입력값은 제거했다.
- `오늘 아이의 기분은?` 선택지는 더 늘리고 4열 그리드 형태로 다시 정리했다.
- `태그 + 추가`는 반응 없는 텍스트가 아니라, 기존 기록하기에서 쓰던 태그 모달을 재사용하도록 연결했다.

### 왜 이렇게 했나

- 날씨 카드는 홈 상단의 별도 정보 블록이라 얇은 보더가 있는 편이 오히려 섹션 경계가 더 분명하다.
- 반대로 펫 프로필 카드는 홈의 핵심 오브제라서 보더와 그림자가 같이 있으면 카드 느낌이 과해지고 조금 답답해 보인다.
- `오늘의 메시지`는 정보 카드보다 감성 문구에 가까워서 전체 박스보다 하단만 받쳐주는 편이 더 자연스럽다.
- 날씨 카드의 우측 이동 아이콘은 옅은 회색보다 검정이 현재 타이포 대비에 더 잘 맞는다.
- 실내 활동 기록은 빠르게 남기는 흐름이 핵심이라, 예시 입력값이 실제 값처럼 보이는 것보다 비워진 상태가 더 명확하다.
- 태그 추가는 이미 기록하기에서 익숙한 입력 패턴이 있으니, 같은 모달을 재사용하는 편이 사용자 학습 비용이 가장 적다.

### 결과

- 홈 상단 날씨 카드와 펫 프로필 카드의 위계가 더 자연스럽게 나뉘었다.
- 오늘의 메시지는 존재감은 유지하면서도 덜 무겁게 보이도록 정리됐다.
- 날씨 카드의 우측 이동 아이콘 가독성이 더 좋아졌다.
- 실내 활동 기록 화면은 더 가볍고 빠르게 입력할 수 있는 상태가 됐다.
- 태그 추가가 실제로 동작하고, 기존 기록하기와 같은 방식으로 이어져 UX 일관성이 좋아졌다.

---

## Chapter 6-56 — 위치 권한 + 행정동 + 실날씨 계층 연결

### 무엇을 진행했나

- `@react-native-community/geolocation`을 기준으로 위치 권한과 현재 좌표 계층을 추가했다.
- 좌표를 행정동 이름으로 바꾸는 `district` 계층을 따로 분리했다.
- Kakao Local API 인터페이스를 먼저 고정하고, 키가 없을 때는 fallback 동 이름으로 처리되게 만들었다.
- Open-Meteo forecast / air quality 호출 계층을 추가했다.
- 실제 API 응답을 기존 `WeatherGuideBundle` UI 모델로 변환하는 매퍼를 만들었다.
- 홈과 날씨 상세 화면이 같은 `useWeatherGuide()` 훅을 공유하도록 정리했다.

### 왜 이렇게 했나

- 위치 권한, 좌표, 동 이름, 날씨 응답은 실패 지점이 각각 다르기 때문에 한 파일에 몰아넣으면 유지보수가 금방 무너진다.
- 그래서 `permission -> coordinates -> district -> weather bundle` 순서로 계층을 나눠두는 편이 훨씬 안전하다.
- UI는 이미 완성도가 높기 때문에, 데이터만 실데이터로 바꿔도 화면 구조를 다시 흔들 필요가 없도록 설계하는 게 맞았다.
- 홈과 상세가 서로 다른 mock을 쓰면 체감 품질이 떨어지기 때문에, 같은 훅으로 묶어 데이터 기준을 맞췄다.

### 결과

- 현재 위치 권한과 좌표를 실제로 읽을 수 있는 구조가 생겼다.
- 행정동 이름도 API 키만 넣으면 `일산동`, `서초동` 같은 형태로 바로 치환할 준비가 됐다.
- Open-Meteo 기반 날씨/대기질 응답을 현재 카드 UI에 바로 매핑할 수 있게 됐다.
- 홈과 상세 날씨 화면이 같은 데이터 계층을 바라보는 상태가 됐다.

---

## Chapter 6-57 — Kakao 행정동 정밀화 + Android geolocation 빌드 복구

### 무엇을 진행했나

- Kakao REST API 키를 로컬 런타임 설정 파일로 분리했다.
  - 실제 키는 로컬 전용 [`src/config/runtime.ts`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/config/runtime.ts)
  - Git에는 예시 파일 [`src/config/runtime.example.ts`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/config/runtime.example.ts) 만 남기도록 정리했다.
- `district` 계층을 보강해 역지오코딩 응답이 도착하기 전에도 좌표 기반 fallback 동 이름을 더 정밀하게 보여주도록 조정했다.
- Kakao 역지오코딩 결과를 추적하기 위한 로그를 추가해 `source: 'kakao'` 와 실제 행정동 이름을 바로 검증할 수 있게 했다.
- Android에서는 `@react-native-community/geolocation`가 RN `0.84` New Architecture 환경에서 codegen JNI를 제대로 만들지 않아 빌드가 깨지는 문제가 있었고,
  이를 위해 [`scripts/ensure-geolocation-codegen.js`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/scripts/ensure-geolocation-codegen.js) 를 추가했다.
- `postinstall` 시 geolocation용 JNI stub을 자동 생성하도록 해서 CMake autolinking 실패를 우회하고, 이후 `yarn install` 뒤에도 같은 문제가 다시 생기지 않도록 했다.

### 왜 이렇게 했나

- 날씨 기능에서 가장 중요한 건 “정확한 현재 위치 체감”이다. `현재 위치` 같은 뭉뚱그린 표현보다 `일산3동`, `서초1동`처럼 실제 동 이름이 보여야 사용자가 기능을 신뢰한다.
- Kakao 응답이 오기 전 단계에서도 너무 넓은 단위(`일산동`)만 보이면 체감 품질이 떨어지기 때문에, fallback도 테스트 좌표 기준으로 더 좁은 동 단위까지 맞출 필요가 있었다.
- geolocation 패키지의 Android 빌드 실패는 기능 문제가 아니라 New Architecture/CMake autolinking 결함에 가까웠다. 이건 매번 수동 수정하는 방식보다 `postinstall` 자동 보정이 맞다.

### 결과

- 홈 날씨 카드에서 Kakao 응답 기준 실제 행정동(`일산3동`)이 정상적으로 표시되는 것을 확인했다.
- 동 이름은 이제 fallback보다 실제 Kakao 역지오코딩 결과를 우선 사용하며, DevTools 로그로도 `source: 'kakao'`를 검증할 수 있다.
- Android는 geolocation을 추가한 뒤에도 다시 빌드 가능한 상태로 복구됐다.
- 위치 권한 -> 좌표 -> 행정동 -> 날씨 카드까지의 전체 흐름이 실사용 기준으로 이어졌다.

---

## Chapter 6-58 — 날씨 캐시 + 실패 UX 정리

### 무엇을 진행했나

- 날씨 번들을 좌표 기준으로 `AsyncStorage`에 짧게 캐시하는 계층을 추가했다.
- 홈/상세 날씨 화면이 같은 캐시를 보도록 `useWeatherGuide()` 안에 캐시 로딩/저장 흐름을 연결했다.
- 위치 권한 없음 / 현재 위치 조회 실패 / 네트워크 실패 상황에서 보여주는 문구를 더 자연스럽게 정리했다.
- Kakao 행정동 해석 디버그 로그는 확인이 끝났기 때문에 제거했다.

### 왜 이렇게 했나

- 위치와 날씨는 네트워크/권한/GPS 상태에 따라 응답 속도가 흔들릴 수 있다.
- 이때 화면이 매번 빈 상태로 돌아가거나 갑자기 `현재 위치` fallback으로 튀면 체감 품질이 크게 떨어진다.
- 그래서 최근 확인한 날씨를 먼저 보여주고, 뒤에서 최신값으로 조용히 갱신하는 쪽이 훨씬 안정적이다.

### 결과

- 홈과 날씨 상세 진입 시 최근 확인한 날씨가 있으면 즉시 먼저 보인다.
- 연결이 불안정해도 기존 값을 유지한 채 안내 문구만 부드럽게 보여줄 수 있게 됐다.
- 위치/행정동/날씨 계층이 기능적으로는 마감 단계에 가깝게 정리됐다.

---

## Chapter 6-59 — 하단 툴바 통일 + 홈/기록 스크롤 보정

### 무엇을 진행했나

- 메인 하단 탭바 구현을 별도로 두지 않고, [`src/components/navigation/AppNavigationToolbar.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/components/navigation/AppNavigationToolbar.tsx) 공용 툴바를 기준으로 통일했다.
- 라벨은 `더보기` 대신 `전체메뉴`로 정리했다.
- 홈 화면 [`src/screens/Main/components/LoggedInHome/LoggedInHome.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/screens/Main/components/LoggedInHome/LoggedInHome.tsx) 에 하단 safe area 기반 여백을 추가해서 `이번 달 일기` 섹션이 툴바에 가리지 않도록 보정했다.
- 기록 생성 화면 [`src/screens/Records/RecordCreateScreen.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/screens/Records/RecordCreateScreen.tsx) 도 하단 저장 버튼이 시스템 네비게이션 바에 가리지 않도록 하단 여백을 늘렸다.
- 타임라인 [`src/screens/Records/TimelineScreen.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/screens/Records/TimelineScreen.tsx) 헤더 왼쪽에 홈 복귀 버튼을 넣고, `기록 밀도`는 기본 접힘 상태로 변경했다.

### 왜 이렇게 했나

- 오버레이형 툴바를 쓰면 화면마다 스크롤 하단 여백을 별도로 잡아주지 않으면 마지막 카드나 CTA가 가려진다.
- 탭바와 상세 화면 툴바가 서로 다른 구현을 가지면 미묘한 간격/높이 차이가 계속 누적된다.
- 공용 툴바를 기준으로 정리해야 이후 홈/방명록/상세의 하단 네비게이션 톤을 한 번에 맞출 수 있다.

### 결과

- 홈과 기록 생성 화면에서 하단 요소가 툴바/시스템 네비게이션에 덜 가려진다.
- 타임라인은 기본 진입 시 상단이 더 단정하게 보이고, 밀도 섹션도 접힌 상태로 시작한다.
- 메인/상세/전체메뉴 하단 툴바 기준이 한곳으로 정리됐다.

---

## Chapter 6-60 — 실기기 네비게이션/날씨 체감 보정 + 전체메뉴 활동 확장

### 무엇을 진행했나

- Android 실기기에서 하단 시스템 네비게이션 바가 앱 배경을 비치던 문제를 줄이기 위해 [`android/app/src/main/java/com/nuri/MainActivity.kt`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/android/app/src/main/java/com/nuri/MainActivity.kt) 에 시스템 바 외관 제어를 추가했다.
- [`src/components/navigation/AppNavigationToolbar.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/components/navigation/AppNavigationToolbar.tsx) 의 하단 툴바 비율을 더 낮추고, 아이콘/라벨은 조금 더 아래로 내렸으며 중앙 `기록하기` 버튼도 한 단계 더 축소했다.
- 홈 진입점 [`src/screens/Main/MainScreen.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/screens/Main/MainScreen.tsx) 에 Android 뒤로가기 종료 확인을 추가했다.
- 실기기에서 위치 좌표 수집이 흔들리던 경우를 줄이기 위해 [`src/services/location/currentPosition.ts`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/services/location/currentPosition.ts) 에 고정밀 → 저정밀 → 마지막 성공 좌표 캐시 fallback 흐름을 추가했다.
- Kakao 행정동 해석이 잠깐 실패해도 지역명이 계속 `현재 위치`로 보이지 않도록 [`src/services/location/district.ts`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/services/location/district.ts) 에 동 이름 캐시를 추가했다.
- 홈과 날씨 상세가 같은 번들을 즉시 재사용할 수 있게 [`src/hooks/useWeatherGuide.ts`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/hooks/useWeatherGuide.ts), [`src/screens/Main/components/LoggedInHome/LoggedInHome.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/screens/Main/components/LoggedInHome/LoggedInHome.tsx), [`src/screens/Weather/WeatherInsightScreen.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/screens/Weather/WeatherInsightScreen.tsx) 에 초기 날씨 번들 전달 구조를 연결했다.
- 전체메뉴의 `활동 및 기록` 섹션에 [`src/screens/More/MoreDrawerContent.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/screens/More/MoreDrawerContent.tsx) 기준 `실내 놀이 추천` 항목을 추가했다.

### 왜 이렇게 했나

- 에뮬레이터에서는 정상이던 위치/행정동 흐름도 실기기에서는 권한, GPS 정확도, 마지막 위치, 네트워크 환경 때문에 훨씬 흔들릴 수 있다.
- 홈에서 이미 확인한 지역/날씨를 상세 화면이 다시 처음부터 불러오면 느리게 느껴지고, 실제로는 같은 데이터를 또 기다리는 UX가 된다.
- 하단 툴바는 앱의 톤을 결정하는 요소인데, 시스템 네비게이션 바 처리와 비율이 어색하면 화면 전체 완성도가 바로 떨어진다.
- `실내 놀이 추천`은 날씨-활동-기록 흐름의 일부이기 때문에 `활동 및 기록` 안에 두는 것이 가장 자연스럽다.

### 결과

- 실기기에서도 홈 날씨 카드가 `현재 위치`에 오래 머무르지 않고, 마지막으로 확인한 동 이름과 좌표를 더 안정적으로 유지할 수 있게 됐다.
- `오늘의 날씨` 상세는 홈에서 이미 확인한 날씨/지역을 먼저 보여주고 뒤에서 최신화하기 때문에 체감 속도가 훨씬 빨라졌다.
- Android 하단 시스템 네비게이션 바와 앱 하단 툴바가 이전보다 덜 충돌하고, 전체 톤도 더 낮고 자연스럽게 정리됐다.
- 전체메뉴 `활동 및 기록`에서 `실내 놀이 추천`으로 바로 진입할 수 있어 날씨 흐름과 탐색 흐름이 더 잘 이어진다.

---

## Chapter 6-61 — 날씨/테마 공용 레이어 정리 + 상세 액션 모달 안정화

### 무엇을 진행했나

- 날씨 아이콘 체계를 [`src/services/weather/guide.ts`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/services/weather/guide.ts), [`src/services/weather/mapper.ts`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/services/weather/mapper.ts), [`src/components/weather/WeatherGuideHomeCard.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/components/weather/WeatherGuideHomeCard.tsx), [`src/components/weather/WeatherForecastStrip.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/components/weather/WeatherForecastStrip.tsx) 기준으로 이모지 기반으로 통일했다.
- 실내 놀이 추천 데이터는 4종에서 8종으로 확장하고, [`src/screens/Weather/IndoorActivityRecommendationsScreen.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/screens/Weather/IndoorActivityRecommendationsScreen.tsx), [`src/screens/Weather/ActivityGuideScreen.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/screens/Weather/WeatherActivityRecordScreen.tsx) 에서 공용 키 타입과 안전한 라우팅 흐름을 맞췄다.
- [`src/components/layout/Screen.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/components/layout/Screen.tsx), [`src/components/navigation/AppNavigationToolbar.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/components/navigation/AppNavigationToolbar.tsx), [`src/navigation/AppTabsNavigator.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/navigation/AppTabsNavigator.tsx) 에서 공용 레이어가 `theme`를 직접 읽도록 정리했다.
- 위치/행정동 훅은 [`src/hooks/useCurrentLocation.ts`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/hooks/useCurrentLocation.ts), [`src/hooks/useDistrict.ts`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/hooks/useDistrict.ts), [`src/hooks/useWeatherGuide.ts`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/hooks/useWeatherGuide.ts) 기준으로 transient failure 시 기존 값을 유지하도록 보강했다.
- 타임라인 상세 [`src/screens/Records/RecordDetailScreen.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/screens/Records/RecordDetailScreen.tsx), [`src/screens/Records/RecordDetailScreen.styles.ts`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/screens/Records/RecordDetailScreen.styles.ts) 의 `...` 액션 모달을 화면 중앙 정렬로 바꾸고, 삭제 확인 모달도 프로덕션 톤으로 다시 정리했다.

### 왜 이렇게 했나

- 날씨 아이콘이 플랫폼 아이콘/문자 체계가 섞여 있으면 일관성이 떨어지고, 렌더링 계층도 복잡해진다.
- 공용 Screen/Toolbar가 테마를 직접 보지 않으면, 화면 개별 스타일을 다 수정하지 않는 한 테마 변경이 전체 앱에 자연스럽게 번지지 않는다.
- 실기기 위치는 일시 실패가 잦기 때문에, 실패 순간마다 `현재 위치`나 빈 값으로 흔들리면 체감 완성도가 크게 떨어진다.
- 상세 액션 시트에서 삭제 대상 id를 모달 열기 전에 지워버리면 `삭제하기`를 눌러도 반응이 없는 구조적 버그가 생긴다.

### 결과

- 홈 카드, 주간 예보, 날씨 상세가 모두 같은 이모지 날씨 표현을 사용하게 됐다.
- 실내 놀이 추천은 8종으로 확장됐고, 하단 툴바와 겹치지 않게 여백도 같이 정리됐다.
- 공용 레이어는 테마 변경을 직접 따라가므로, 이후 남은 하드코딩 컬러만 줄이면 전체 화면 통일성이 더 쉽게 올라가는 구조가 됐다.
- 위치/행정동 훅은 실기기에서 잠깐 실패해도 이전 안정 값을 유지해서 깜빡임이 줄었다.
- 타임라인 상세의 `...` 모달은 중앙 정렬된 깔끔한 팝업으로 바뀌었고, 삭제 확인 팝업의 `삭제하기`는 빨간 CTA로 바뀌면서 실제 삭제 동작도 다시 정상 작동하게 됐다.

---

## Chapter 6-62 — 날씨 캐시를 TanStack Query + Zustand 조합으로 전환

### 무엇을 진행했나

- [`package.json`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/package.json), [`yarn.lock`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/yarn.lock) 에 `@tanstack/react-query`를 추가했다.
- [`src/app/providers/AppProviders.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/app/providers/AppProviders.tsx) 에 `QueryClientProvider`를 연결해 앱 전역에서 Query 캐시를 사용할 수 있게 했다.
- [`src/store/weatherStore.ts`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/store/weatherStore.ts) 를 새로 만들어, 좌표별 날씨 번들을 `zustand` 메모리 캐시로 10분 유지하도록 구성했다.
- [`src/hooks/useWeatherGuide.ts`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/hooks/useWeatherGuide.ts) 는 기존 훅 내부 캐시 중심 구조에서 벗어나 다음 순서로 데이터를 조회하도록 바꿨다.
  - 1) `Zustand` 메모리 TTL 캐시
  - 2) `AsyncStorage` TTL 캐시
  - 3) `TanStack Query` 기반 API 호출
- [`src/services/weather/cache.ts`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/services/weather/cache.ts) 의 캐시 키는 `v2`로 올려서 이전 형식의 주간예보 라벨 캐시를 자동 무효화했다.
- [`src/services/weather/mapper.ts`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/services/weather/mapper.ts) 는 주간예보 라벨을 고정 배열이 아니라 실제 날짜 기준으로 계산하도록 바꿨다.

### 왜 이렇게 했나

- 홈 → 날씨 상세 → 다시 홈 → 다시 상세로 돌아갈 때, 같은 좌표와 짧은 시간 범위 안에서는 같은 날씨 데이터를 재사용하는 편이 훨씬 자연스럽다.
- 기존 구조는 `AsyncStorage` 캐시가 있어도 훅이 다시 돌면서 메모리 레벨 재사용이 약했고, 화면 왕복에서 체감 로딩이 남아 있었다.
- 서버 상태 캐시는 `TanStack Query`, 앱 메모리 상태는 `Zustand`가 맡도록 역할을 분리하면 유지보수성과 확장성이 더 좋다.
- 주간예보 라벨도 실제 날짜를 기준으로 계산해야 `오늘 / 내일 / 월 / 화 / 수 ...`처럼 직관적으로 보일 수 있다.

### 결과

- 같은 좌표 기준으로 10분 안에 다시 상세에 들어오면 API를 다시 호출하지 않고 메모리/로컬 캐시를 재사용한다.
- 날씨 상세 진입 시 홈에서 이미 확인한 데이터가 훨씬 자연스럽게 유지되고, 왕복 체감 속도도 개선됐다.
- 주간예보는 더 이상 `오늘 / 내일 / 수 / 목 ...`처럼 고정 배열 때문에 어색하게 보이지 않고, 실제 요일 순서대로 렌더링된다.
- 날씨 데이터 계층은 이제 `TanStack Query + Zustand + AsyncStorage fallback` 구조로 정리돼, 이후 다른 서버 조회 흐름에도 같은 패턴을 적용하기 쉬워졌다.

---

## Chapter 6-63 — 타임라인 기타 필터 확장 + 모달 테마 일관성 정리

### 무엇을 진행했나

- [`src/services/memories/categoryMeta.ts`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/services/memories/categoryMeta.ts), [`src/services/records/form.ts`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/services/records/form.ts), [`src/navigation/TimelineStackNavigator.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/navigation/TimelineStackNavigator.tsx) 를 기준으로 `기타` 서브카테고리를 확장했다.
  - `미용`
  - `병원/약`
  - `실내 놀이`
  - `교육/훈련`
  - `외출/여행`
  - `용품/쇼핑`
  - `목욕/위생`
  - `기타`
- [`src/components/common/GlobalToast.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/components/common/GlobalToast.tsx), [`src/screens/Records/components/RecordTagModal.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/screens/Records/components/RecordTagModal.tsx), [`src/screens/Records/components/RecordDateModal.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/screens/Records/components/RecordDateModal.tsx), [`src/components/schedules/SchedulePickerModal.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/components/schedules/SchedulePickerModal.tsx) 에서 모달/팝업의 하드코딩 컬러를 줄이고 `theme` 기반 색을 직접 읽도록 정리했다.
- [`src/screens/Records/TimelineScreen.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/screens/Records/TimelineScreen.tsx) 의 월/연도 선택, `기타 선택` 모달도 `theme.colors.overlay / surfaceElevated / border / textPrimary`를 기준으로 렌더링되게 맞췄다.
- [`src/screens/Records/RecordDetailScreen.tsx`](/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri/src/screens/Records/RecordDetailScreen.tsx) 의 상세 액션 모달은 삭제 대상 id를 분리해 보관하도록 바꿔, `삭제하기`가 무반응이던 구조적 리스크를 줄였다.

### 왜 이렇게 했나

- 타임라인의 `기타` 필터가 사실상 `미용 / 병원 / 기타`만 지원하면 실제 기록 종류를 충분히 나누기 어렵고, 생성 화면과 조회 화면의 분류 체계도 쉽게 어긋난다.
- 테마 전환이 공용 레이어까지만 먹고 모달/팝업이 하드코딩 컬러를 유지하면, 실제 서비스 톤이 라이트/다크 또는 브랜드 테마에서 쉽게 깨진다.
- 상세 액션에서 삭제 대상 id를 메뉴 상태와 같은 상태로만 관리하면, 모달 전환 타이밍에 값이 비어 `삭제하기`가 눌려도 실제 삭제가 안 되는 문제가 생길 수 있다.

### 결과

- 타임라인 `기타` 필터와 레코드 작성 화면이 같은 서브카테고리 목록을 공유하게 됐고, 실제 분류 범위도 넓어졌다.
- 전역 토스트, 태그/날짜 모달, 일정 피커, 타임라인 선택 모달은 `theme`를 직접 읽어 서비스 전반 톤과 더 자연스럽게 맞춰진다.
- 타임라인 상세의 액션/삭제 모달도 테마 톤을 따르면서, 삭제 대상 상태를 분리해 실제 삭제 반응 안정성이 올라갔다.
- 무한 스크롤 `loadMore` 경로에는 `catch`를 추가해 비동기 실패가 화면 전체 에러로 번질 가능성을 줄였다.

---

# 🚀 Next

## Chapter 8 — 서버 검색(제목/태그) + 인덱스/정렬 안정화 + 섹션 점프 고도화

- Supabase 서버 검색(`title ilike`, `tags` 조건 조합)
- 인덱스 추가
  - `(pet_id, created_at desc)`
  - `tags` GIN
  - `title` trigram(옵션)
- “월 점프” 고도화
  - 아직 로드되지 않은 과거 월을 선택하면 **auto loadMore 반복**으로 목표 월까지 당겨오기

---

## Final Statement

> **NURI는 감정을 저장하는 서비스가 아니라, 감정을 구조화하는 시스템입니다.**
> **Private Founder Build**
