# 🌈 NURI : Emotion-Driven Digital Memory Archive Platform

> **기억은 사라지지 않습니다. 우리는 아이를 잊지 않습니다.**

<br/>

## 0. Why NURI?

NURI는 창업자의 개인적인 상실 경험에서 시작되었습니다.

사랑하는 반려견을 떠나보낸 이후, 가족이 깊은 슬픔 속에서 감정을 정리하지 못하는 모습을 보며 감정을 구조화할 수 있는 디지털 공간의 필요성을 느꼈습니다.

**NURI는 단순한 추모 앱이 아닙니다.**  
누구나 사용할 수 있는 앱이며, 사랑하는 반려동물의 매 순간을 기억하고 기록하는 **감정 데이터를 기반으로 기억을 구조화하는 플랫폼**입니다.

---

## 1. 서비스 개요

NURI는 반려동물을 떠나보낸 보호자, 또는 아이의 추억을 체계적으로 기록하고 싶은 보호자를 위한 **디지털 메모리얼 & 감정 기록 플랫폼**입니다.

### 1.1 핵심 가치

| 핵심 개념               | 설명                                                     |
| ----------------------- | -------------------------------------------------------- |
| 🧩 **기억 구조화**      | 감정 태그 기반의 체계적 기억 아카이빙                    |
| 📊 **감정 데이터 축적** | AI 기반 감정 분석 및 히스토리 누적                       |
| 🔄 **회상 알고리즘**    | 서버 고정 방식의 일관된 Daily Recall 시스템              |
| 🏗 **확장성**            | 커뮤니티, 유료 구독 모델(AI), 위치 기반 서비스 확장 구조 |

### 1.2 상세 기능 기획

**① 개인화된 사용자 경험 (Supabase 연동)**

- **사용자 맞춤형 인사말:** 로그인 시 Supabase Auth + `profiles.nickname` 연동으로 `"{닉네임}님, 반가워요!"` 개인화 문구를 노출합니다. (nickname이 없으면 기본 문구 "반가워요!"만 노출)
- **프로필 이미지 동기화:** 반려동물 등록 시 업로드한 이미지는 Supabase Storage에 저장되며, 메인 카드/헤더 미니 프로필 등 앱 전역에서 실시간으로 동기화됩니다. (Global State + fetch 후 UI 전체 반영)

**② 반려동물 프로필 & 스마트 데이터**

- **반려동물 정보 관리:** 이름, 생년월일, 몸무게, 좋아하는 것(#태그), (옵션) 싫어하는 것, 취미 등을 기록합니다.
- **D-Day 자동 계산:** 등록된 날짜(입양일/함께하기 시작한 날 등)와 현재 날짜를 비교하여 **"우리가 함께한 시간 · 500일째"**처럼 자동 계산된 시간을 제공합니다. (KST 기준)
- **추모 확장 대비:** `death_date`(사망일) 필드(Nullable)로 추모 UI/기념일 로직을 확장합니다.

**③ 아카이빙 시스템 (기록 및 타임라인)**

- **기록하기:** 카메라/앨범 접근 → 사진 업로드 + 제목 + 설명 + 감정 태그 선택 → 기록 저장
- **최근 기록(홈 위젯):** 최신 기록 썸네일/요약을 홈에서 빠르게 확인합니다.
- **추억보기(타임라인):** 기록하기로 생성한 모든 기록을 최신순으로 확인합니다.
- **상세 보기:** 모달보다 상세 화면을 추천합니다. (뒤로가기/공유/수정/삭제/스크롤 등 UX 확장에 유리)

**④ 정서적 교감 서비스 (AI Guestbook)**

- **글 남기기(방명록):** 아이에게 전하고 싶은 마음/그리움/하루의 기록을 편지 형태로 남깁니다.
- **AI 코멘트 (유료 모델):** 유료 구독(또는 결제)을 통해, 반려동물 정보 + 기록/편지 내용을 기반으로 “따뜻한 답장”을 자동 생성합니다. (Edge Function + 구독 상태 + AI 메시지 저장 구조로 확장)

**⑤ 멀티 반려동물 지원 (스와이프보다 “미니 프로필 전환” 우선)**

- **핵심 UX:** 헤더 우측에 **작은 원형 미니 프로필(썸네일)**이 있고, 그 옆에 원형(＋) 버튼이 있습니다.
- **동작:**
  - (＋) 클릭 → 반려동물 추가 등록 플로우로 진입
  - 미니 프로필(썸네일) 클릭 → 다른 아이 프로필로 즉시 전환
- **원칙:** 레이아웃은 유지하고, 선택된 아이 데이터만 교체합니다. (전역 상태: `pets[]`, `selectedPetId`)

### 1.3 UI/UX 및 네비게이션 설계

- **하단 네비게이션 구조:** [홈] - [추억보기(타임라인)] - [기록하기] - [더보기]
- **기록하기(CTA) 배치:** 초기에는 홈 내 주요 CTA로 유지하고, 추후 접근성을 위해 하단 중앙 버튼 또는 FAB(플로팅 액션 버튼)로 고정 배치하는 것을 목표로 합니다.
- **더보기(메뉴):** 고객센터 / 반려동물 정보 수정 / 계정 설정 등 확장 가능한 메뉴를 여기에 배치합니다.

### 1.4 서비스 구조 요약

| 구분              | 주요 기능 및 특징                              | 구현 포인트                                 |
| ----------------- | ---------------------------------------------- | ------------------------------------------- |
| **로그인/프로필** | 닉네임 인사말, 세션 유지, 프로필 전역 동기화   | Supabase Auth, AsyncStorage, Global State   |
| **데이터 관리**   | 반려동물/기록 CRUD, D-Day 계산, 추모 확장 대비 | RLS 기반 CRUD, 날짜 로직(KST)               |
| **피드/타임라인** | 최신 기록 위젯, 전체 타임라인, 상세 화면 확장  | Storage 업로드, 리스트/상세 라우팅          |
| **AI 교감**       | 유료 멤버십 기반 AI 자동 답장                  | Edge Functions, 구독 상태, AI 메시지 테이블 |
| **멀티펫 UX**     | 미니 프로필 전환 + (＋)로 추가 등록            | `selectedPetId` 전역 상태 + UI 데이터 교체  |

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
- 감정 기반 AI 시스템
- 서버 고정 회상 알고리즘
- 자동 기일 대응
- 데이터 중심 아카이빙 구조

---

## 4. Tech Stack

| 영역        | 기술                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| **Mobile**  | React Native CLI · TypeScript · React Navigation · Zustand · styled-components                        |
| **Backend** | Supabase (Auth · PostgreSQL · Storage · RLS) · Edge Functions                                         |
| **Infra**   | Gradle 8.13 · AGP 8.6 · Kotlin 2.1 · AsyncStorage v3                                                  |
| **Utils**   | `react-native-url-polyfill` · `react-native-get-random-values` · `buffer` (Supabase RN polyfill 세트) |

---

## 5. 아키텍처 원칙

- 기능 단위 분리 (Feature-based)
- 서버 상태 / UI 상태 분리
- 도메인 확장 대비 설계
- 1인 개발 유지보수 가능 구조
- IAP 기반 수익화 확장 고려

---

## 6. MVP Scope

- **Phase 1:** Auth · Pet Profile · Record CRUD · Daily Recall · Timeline
- **Phase 2:** Emotion Tracking · AI Chat · Push · IAP
- **Phase 3:** Community Feed · Comments · Likes · Notifications

---

## 7. Core Features Architecture

### 7.1 Record System (기록)

```text
records
├── pet_id
├── title
├── description
├── image_url
├── emotion_tag
└── occurred_at
```

### 7.2 Daily Recall Engine

```text
daily_recall
├── pet_id
├── date
├── record_id
└── mode (anniversary | random | emotion_based)
```

### 7.3 Emotion Analysis Pipeline

```text
User Input
  → AI Emotion Scoring
  → emotions 저장
  → 응답 톤 조절
  → 히스토리 누적
```

### 7.4 Subscription Architecture

```text
subscriptions
├── user_id
├── tier
├── started_at
├── expires_at
└── store_receipt
```

---

## 8. Supabase Database Schema (Production Draft)

✅ **스키마 + RLS + Storage까지 “뼈대” 확정 완료**  
앞으로 기능을 추가해도 DB를 갈아엎지 않도록 기반을 먼저 고정했습니다.

```sql
profiles        id (auth.uid) · nickname · avatar_url · created_at

pets            id · user_id · name · birth_date · adoption_date · weight_kg
                tags(text[]) · death_date(nullable) · created_at

records         id · pet_id · image_url · title · description · emotion_tag
                occurred_at · created_at

letters         id · pet_id · content · is_ai_generated · created_at

daily_recall    id · pet_id · date · record_id · mode

emotions        id · pet_id · score · primary_emotion · analyzed_at

subscriptions   id · user_id · tier · expires_at · store_receipt · created_at
```

> 참고: 앱 구현에서는 `records` 대신 `memories` 명칭으로도 사용됩니다. (도메인 명은 추후 통일)

---

## 9. Storage / RLS Policy Strategy

### 9.1 Storage 버킷 (최종 확정)

- `pet-profiles/` (public)
- `memory-images/` (private)

> 과거 문서/코드에서 `pet-avatars`, `record-images`가 등장했으나 최종적으로 위 이름으로 통일했습니다.

### 9.2 기본 원칙

- 모든 테이블은 RLS 활성화
- 사용자 본인 데이터만 접근 가능
- `auth.uid()` 기반 접근 제어

**예시:**

```sql
CREATE POLICY "Users can access own pets"
ON pets
FOR ALL
USING (user_id = auth.uid());
```

---

## 10. Supabase Auth 구현 현황

✅ **구현 완료**

- Email/Password 로그인 연동
- `signInWithPassword()` 정상 동작
- 세션 발급 확인
- `email_confirmed_at` 정상 확인
- 비밀번호 재설정 후 재로그인 검증 완료
- RN 환경 polyfill 적용 완료

---

## 11. Android 빌드 안정화 기록

**해결된 이슈**

- Gradle 8.13 요구사항 충돌 해결
- AGP 8.6 / Kotlin 2.1 버전 정합성 맞춤
- AsyncStorage v3 로컬 maven repo 설정
- `settings.gradle` / `build.gradle` repository 충돌 해결
- RepositoriesMode 정책 정리
- 빌드 성공 및 Emulator 설치 정상 확인

**최종 상태**

- BUILD SUCCESSFUL
- Emulator 설치 정상
- Supabase Auth 연결 정상

---

## 12. 앱 실행 구조 (부팅 순서)

### 12.1 앱 구동 흐름(정확한 순서)

```text
(네이티브) Android MainActivity / iOS AppDelegate
  → JS 엔트리 로딩
  → index.js 실행
  → AppRegistry.registerComponent(appName, () => App)
  → App.tsx 렌더 시작
  → NavigationContainer 컨텍스트 생성
  → RootNavigator 마운트
  → Splash(HomeScreen)
  → Main(MainScreen)
```

### 12.2 index.js의 역할

- RN에서 Supabase 사용 시 필요한 polyfill을 가장 먼저 로드
- `global.Buffer` 주입(타입은 `src/types/global.d.ts`에서 보강)

---

## 13. 앱 구현 현황 (React Native)

### 13.1 기본 파일 역할

| 파일            | 역할                                   |
| --------------- | -------------------------------------- |
| `index.js`      | AppRegistry 등록 + polyfill            |
| `App.tsx`       | SafeAreaProvider + NavigationContainer |
| `RootNavigator` | Splash → Main (+ DevTest는 dev-only)   |

### 13.2 Splash (HomeScreen)

- 이중 배경 레이어
- 페이드 인 애니메이션
- 브랜드 감성 강조
- 자동 이동 주석 처리(UX 흐름 유지)

### 13.3 Main 화면 (정책)

- **상태 기반 분기:** `guest` / `logged_in` 상태에 따라 홈 UX가 달라짐
- **nickname 정책**
  - 로그인 + nickname 존재 → `"{nickname}님, 반가워요!"`
  - 그 외 → `"반가워요!"`

---

## 14. 전역 상태 (Zustand) 도입 완료

### 14.1 Auth Store (`src/store/authStore.ts`)

- `guest` / `logged_in` 상태 관리
- Supabase session을 AsyncStorage에 저장/복원(hydrate) → 자동 로그인 기반
- nickname은 optional (없으면 기본 인사만 출력)

### 14.2 Pet Store (`src/store/petStore.ts`)

- `pets[]` + `selectedPetId` 전역 관리
- 멀티 반려동물 전환(헤더 미니 프로필) 구현의 기반
- `pets`가 비면 `selectedPetId`는 null로 유지

---

## 15. 필수 설치 패키지 (현재 프로젝트 기준)

✅ “지금 단계에서 반드시 필요한 것들”만 설치하고, 나머지는 필요한 시점에 추가합니다.

- **15.1 Core (이미 설치됨)**
  - `@supabase/supabase-js`
  - `@react-native-async-storage/async-storage`
  - `react-native-url-polyfill`
  - `react-native-get-random-values`
  - `buffer`
  - `zustand`
- **15.2 Navigation (이미 설치됨)**
  - `@react-navigation/native`
  - `@react-navigation/native-stack`
  - `react-native-screens`
  - `react-native-safe-area-context`
  - `react-native-gesture-handler`
- **15.3 Media (이미 설치됨)**
  - `react-native-image-picker`

---

## 16. Auth 설계

NURI는 게스트 우선 전략을 유지하면서, 필요 시 로그인/회원가입/닉네임 설정으로 자연스럽게 진입할 수 있도록 Auth 플로우를 확장합니다.

### 16.1 라우팅 구조(목표)

- Splash → Main 기본 흐름 유지
- 게스트가 “로그인/기록/등록” 등 인증이 필요한 액션을 누르면 AuthLanding으로 이동
- 로그인/회원가입 성공 시 session 저장 후 Main으로 reset 처리

**라우트:**

- `AuthLanding` : 로그인/회원가입 선택 + 게스트로 계속
- `SignIn` : 이메일/비밀번호 로그인
- `SignUp` : 이메일/비밀번호 회원가입
- `NicknameSetup` : nickname 없을 때 1회 설정

### 16.2 닉네임 정책

- 로그인 상태 + nickname 존재 시: `"{nickname}님, 반가워요!"`
- nickname이 없으면: 기본 문구 `"반가워요!"`
- nickname은 `profiles` 테이블에 저장/조회

---

## 17. 홈 레이아웃 분기 정책 (Guest / Logged-in)

NURI의 홈(Main)은 로그인 상태에 따라 완전히 다른 레이아웃을 사용할 수 있도록 설계합니다.

- **guest 상태**: `GuestHome`
- **logged_in 상태**: `LoggedInHome`

MainScreen은 분기만 담당하며, 각 레이아웃은 컴포넌트/스타일 파일로 분리하여 UI 수정(디자인 싱크)을 빠르게 반복할 수 있도록 구성합니다.

**AppProviders 부팅 동기화**

- `authStore.hydrate()`로 로컬 세션 복원
- `supabase.auth.getSession()`로 실제 세션 정렬
- 로그인 상태면 `profiles.nickname` fetch하여 전역 상태 주입
- `onAuthStateChange`로 로그인/로그아웃 이벤트를 store와 동기화

---

## 18. Security Model

**Database**

- 모든 테이블 RLS 활성화
- `auth.uid()` 기반 접근 통제
- 본인 데이터만 CRUD 가능

**Storage**

- 원칙: private + signed URL (정합성/보안)
- 단, pet avatar는 UX/비용 고려로 public 버킷(`pet-profiles`)을 사용 중
- 화면에서는 signed/public URL을 상황에 맞게 사용

> 💡 **보안 철학은 일관성입니다. DB와 Storage는 동일한 owner 기준 정책을 따릅니다.**

---

## 19. Engineering Focus

- 성능 최적화
- 이미지 압축 전략
- 세션 안정성
- 서버 고정 로직 설계
- 확장 가능한 도메인 모델

---

## 20. Engineering Philosophy (확정 원칙)

- **서버 기준 설계**: 클라이언트는 단순하게, 데이터 일관성은 서버 기준 고정
- **Daily Recall / AI 메시지**: 서버 고정 캐싱 전략
- **상태 관리 원칙**
  - 서버 상태(Supabase) / UI 상태(Zustand) 분리
  - `hydrate → session sync → nickname fetch → pets fetch` 순서 고정
  - `selectedPetId`는 전역 상태에서만 관리
- **확장 대비 설계**
  - `death_date` nullable → 추모 UI 확장 가능
  - `subscriptions` 사전 설계 → IAP 확장 가능
  - `community` 사전 설계 → Phase 3 확장 대비

---

# 🛠 Development Logs & Progress Updates

## ✅ Chapter 1 — Pet CRUD (실데이터 연결)

목표: **펫 등록 → Storage 업로드 → 홈 실데이터 반영까지 끊김 없이 이어지게 만들기** ✅

**1) Pet 데이터 모델/컬럼 매핑 (DB row → 앱 타입)**

- DB(pets) → App(Pet) 매핑 원칙
- DB: `profile_image_url`에는 full URL 저장 금지
- DB에는 Storage path만 저장 (예: `userId/petId/avatar.jpg`)
- 앱 렌더링 시에는 URL 변환(public or signed) 후 렌더링
- `text[]` → `string[]`
- `numeric`는 RN에서 string으로 내려올 수 있으니 number 변환 유틸로 방어
- 핵심 파일
  - `src/store/petStore.ts`
  - `src/services/supabase/pets.ts`

**2) Storage 업로드(avatar) 연결**

- 업로드: `pet-profiles` 버킷
- 조회: public url(또는 필요 시 signed url) → Image 렌더링
- 핵심 파일
  - `src/services/supabase/storage.ts`
  - `src/services/supabase/storagePets.ts`

**3) PetCreateScreen(온보딩) + 라우팅 연결**

- 로그인 직후 펫이 0마리면 PetCreate로 자동 유도
- 홈 헤더의 (＋) 버튼도 PetCreate로 연결
- 등록 성공 시
  - pets insert → (이미지 있으면) 업로드 → `profile_image_url`(path) 업데이트
  - `fetchMyPets()` → `petStore.setPets()` 주입
  - Main(AppTabs) reset

**4) 앱 부팅 시 pets fetch → petStore 주입**

- 부팅 순서(고정): `hydrate → getSession → setSession → (session) nickname fetch → pets fetch → petStore 주입 → onAuthStateChange 동기화`

**5) 홈 UI에서 selectedPet 실데이터 노출**

- `selectedPet.name / avatarUrl / weightKg / tags / birthDate / adoptionDate ...` 기반으로 홈 데이터 교체

**Chapter 1 Done 체크리스트**

- [x] pets row → Pet 타입 매핑(숫자/배열 방어 포함)
- [x] Storage 업로드 + URL 변환 렌더링
- [x] PetCreate 온보딩(이미지 선택/업로드/DB path 저장/리프레시)
- [x] AppProviders 부팅 시 pets 자동 fetch + auth 이벤트 동기화
- [x] Logged-in 홈: pets 0마리면 PetCreate 자동 유도 + (＋) 버튼 연결

---

## ✅ Chapter 2 — Android Storage 업로드 안정화 (BlobUtil 기반)

목표: `content://` → 업로드 → DB path 저장 → 홈/헤더 즉시 반영을 **완전히 고정**

**1) 원인 확정**

- Android의 `content://` URI는 `fetch(uri).blob()` 방식이 불안정
- includeBase64는 환경/메모리/대용량에서 리스크가 큼

**2) 해결 전략**

- Android 업로드 파이프라인을 BlobUtil 기반(base64 → bytes)으로 통일
- DB에는 full URL 저장 금지, path만 저장
- 렌더링에서 URL 변환 후 사용

**3) Storage 버킷명 최종 통일**

- `pet-profiles`
- `memory-images`

**4) Android 권한 정리**

- Android 14+: `READ_MEDIA_VISUAL_USER_SELECTED`
- Android 13+: `READ_MEDIA_IMAGES`
- Android 12 이하: `READ_EXTERNAL_STORAGE` (`maxSdkVersion="32"`)
- 필요 시: `WRITE_EXTERNAL_STORAGE` (`maxSdkVersion="32"`)

**5) end-to-end 성공 흐름**

1. PetCreate에서 이미지 선택  
2. BlobUtil 기반 Storage 업로드 성공  
3. pets.profile_image_url에 path 저장  
4. fetchMyPets 재조회  
5. 홈 헤더/카드 즉시 반영  

**Chapter 2 Done 체크리스트**

- [x] Android `content://` 업로드 이슈 해결
- [x] includeBase64 의존 제거
- [x] Storage 버킷명 통일
- [x] AndroidManifest 권한 정리
- [x] 이미지 포함 펫 등록 end-to-end 성공

---

## ✅ Chapter 3 — Record CRUD 완전체 (Create/Read/Edit/Delete + Storage Cleanup)

**목표**

- Record 수정(Edit) 완성
- Record 삭제 시 DB row 삭제 + Storage 파일까지 함께 제거

**구현 내용**

- `updateMemoryFields({ title, content, tags, emotion, occurredAt })`로 필드 수정
- RecordEditScreen 추가 및 라우팅 연결
- 저장 후 `recordStore.refresh(petId)`로 즉시 동기화
- 삭제 시 `deleteMemoryWithFile({ memoryId, imagePath })`로 `memory-images` 파일 삭제 후 DB row 삭제
- Detail에서 삭제: optimistic remove → refresh로 UX/정합성 보장

---

## ✅ Navigation Architecture Refactor (2026-03-02)

**구조 개편**

단일 Stack → `RootStack` + `AppTabs`(BottomTab) 구조로 리팩토링 완료.

**RootStack**

- Splash(단독)
- AppTabs(공통 하단 네비 영역)
- Auth Screens
- PetCreate
- RecordDetail / RecordEdit(몰입 화면)

**AppTabs**

- Home(MainScreen)
- Timeline(추억보기)
- RecordCreate(기록하기)
- More(placeholder)

**탭 구조 petId 안정화**

- `route.params?.petId` → 없으면 `selectedPetId` → 없으면 `pets[0]?.id`

---

## ✅ Home UI — Hero Card(프로필~오늘의 메시지) 사진 레이아웃 적용

- LoggedInHome 상단을 “큰 카드 1장” 구조로 재정렬(프로필 카드)
- heroCard 구성: 이름/메타/생일/함께한 시간/3컬럼/태그/오늘의 메시지
- null-safe + fallback 처리로 안정화

---

## 📘 Chapter 4 — Home 동기화 안정화 & 최근기록 정책 확정

- 홈 최근기록: **조건 없이 최신 7개 고정**
- recordStore: `byPetId[activePetId]` 직접 구독
- pet 변경 시 bootstrap 재정렬(즉시 로딩)
- 홈/타임라인 데이터 소스 정합성 강화

---

# 🚀 NURI Roadmap (Phase 2 – Productization Strategy)

## Chapter 4. 로그인 유지 + 부트 전략 고도화 (No Flicker Boot)

- Splash 최소 0.8~1.0초 고정
- getSession 기반 세션 복원
- nickname/pets/selectedPetId 정렬
- booted gate로 깜빡임 제거

## Chapter 5. 홈 화면 감성 강화

- D-Day 계산
- 오늘의 한 줄 추억(하루 1회 고정)
- 최근 기록 위젯 정제 + signedUrl 캐싱 최적화
- 감정 태그 시각화

## Chapter 6. Daily Recall 서버 고정 로직

- Supabase `daily_recall`로 하루 1회 고정
- 여러 기기 동기화 + AI/구독 확장 기반

## Chapter 7. 구독/결제 아키텍처 설계

- Feature gating 구조 확립
- `subscriptions` 기반 확장

---

## 26. Final Statement

> **NURI는 감정을 저장하는 서비스가 아니라, 감정을 구조화하는 시스템입니다.**  
> **Private Founder Build**

<br/>

### Private Project — Founder Build

**NURI는 개인적인 상실 경험에서 시작되었습니다.**  
**목표는 감정을 구조화하는 기술 플랫폼을 만드는 것입니다.**
