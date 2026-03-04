# 🌈 NURI : Emotion-Driven Digital Memory Archive Platform

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
- RecordDetail/Edit는 “몰입 화면”으로 탭 밖(Stack)에서 표시

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
