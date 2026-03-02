# 🌈 NURI

### _Emotion-Driven Digital Memory Archive Platform_

> **기억은 사라지지 않습니다. 우리는 아이를 잊지 않습니다.**

---

## 0. Why NURI?

NURI는 창업자의 개인적인 상실 경험에서 시작되었습니다.

사랑하는 반려견을 떠나보낸 이후, 가족이 깊은 슬픔 속에서 감정을 정리하지 못하는 모습을 보며  
**감정을 구조화할 수 있는 디지털 공간의 필요성**을 느꼈습니다.

NURI는 단순한 추모 앱이 아닙니다.  
누구나 사용할 수 있는 앱이며,  
**사랑하는 반려동물의 매 순간을 기억하고 기록하는**  
**감정 데이터를 기반으로 기억을 구조화하는 플랫폼**입니다.

---

# 1. 서비스 개요

NURI는 반려동물을 떠나보낸 보호자, 또는 아이의 추억을 체계적으로 기록하고 싶은 보호자를 위한  
**디지털 메모리얼 & 감정 기록 플랫폼**입니다.

## 1.1 핵심 가치

| 핵심 개념               | 설명                                                     |
| :---------------------- | :------------------------------------------------------- |
| **🧩 기억 구조화**      | 감정 태그 기반의 체계적 기억 아카이빙                    |
| **📊 감정 데이터 축적** | AI 기반 감정 분석 및 히스토리 누적                       |
| **🔄 회상 알고리즘**    | 서버 고정 방식의 일관된 Daily Recall 시스템              |
| **🏗 확장성**            | 커뮤니티, 유료 구독 모델(AI), 위치 기반 서비스 확장 구조 |

---

## 1.2 상세 기능 기획

### ① 개인화된 사용자 경험 (Supabase 연동)

- **사용자 맞춤형 인사말:** 로그인 시 Supabase Auth + `profiles.nickname` 연동으로  
  `"{닉네임}님, 반가워요!"` 개인화 문구를 노출합니다.  
  (nickname이 없으면 기본 문구 `"반가워요!"`만 노출)
- **프로필 이미지 동기화:** 반려동물 등록 시 업로드한 이미지는 Supabase Storage에 저장되며,  
  메인 카드/헤더 미니 프로필 등 앱 전역에서 실시간으로 동기화됩니다.  
  (Global State + fetch 후 UI 전체 반영)

### ② 반려동물 프로필 & 스마트 데이터

- **반려동물 정보 관리:** 이름, 생년월일, 몸무게, 좋아하는 것(#태그), (옵션) 싫어하는 것, 취미 등을 기록합니다.
- **D-Day 자동 계산:** 등록된 날짜(입양일/함께하기 시작한 날 등)와 현재 날짜를 비교하여  
  **"우리가 함께한 시간 · 500일째"**처럼 자동 계산된 시간을 제공합니다. (KST 기준)
- **추모 확장 대비:** `death_date`(사망일) 필드(Nullable)로 추모 UI/기념일 로직을 확장합니다.

### ③ 아카이빙 시스템 (기록 및 타임라인)

- **기록하기:** 카메라/앨범 접근 → 사진 업로드 + 제목 + 설명 + 감정 태그 선택 → 기록 저장
- **최근 기록(홈 위젯):** 최신 기록 썸네일/요약을 홈에서 빠르게 확인합니다.
- **추억보기(타임라인):** 기록하기로 생성한 모든 기록을 최신순으로 확인합니다.
- **상세 보기:** 모달보다 **상세 화면**을 추천합니다.  
  (뒤로가기/공유/수정/삭제/스크롤 등 UX 확장에 유리)

### ④ 정서적 교감 서비스 (AI Guestbook)

- **글 남기기(방명록):** 아이에게 전하고 싶은 마음/그리움/하루의 기록을 편지 형태로 남깁니다.
- **AI 코멘트 (유료 모델):** 유료 구독(또는 결제)을 통해,  
  반려동물 정보 + 기록/편지 내용을 기반으로 “따뜻한 답장”을 자동 생성합니다.  
  (Edge Function + 구독 상태 + AI 메시지 저장 구조로 확장)

### ⑤ 멀티 반려동물 지원 (스와이프보다 “미니 프로필 전환” 우선)

- **핵심 UX:** 헤더 우측에 **작은 원형 미니 프로필(썸네일)**이 있고, 그 옆에 **회색 원형(＋)** 버튼이 있습니다.
- **동작:**
  - (＋) 클릭 → **반려동물 추가 등록 플로우**로 진입
  - 미니 프로필(썸네일) 클릭 → **다른 아이 프로필로 즉시 전환**
- **원칙:** 레이아웃은 유지하고, **선택된 아이 데이터만 교체**합니다.  
  (전역 상태: `pets[]`, `selectedPetId`)

---

## 1.3 UI/UX 및 네비게이션 설계

- **하단 네비게이션 구조:** `[홈]` - `[추억보기(타임라인)]` - `[방명록(글 남기기)]` - `[더보기]`
- **기록하기(CTA) 배치:**  
  초기에는 홈 내 주요 CTA로 유지하고, 추후 접근성을 위해  
  하단 중앙 버튼 또는 FAB(플로팅 액션 버튼)로 고정 배치하는 것을 목표로 합니다.
- **더보기(메뉴):**  
  고객센터 / 반려동물 정보 수정 / 계정 설정 등 확장 가능한 메뉴를 여기에 배치합니다.

---

## 1.4 서비스 구조 요약

| 구분              | 주요 기능 및 특징                              | 구현 포인트                                 |
| :---------------- | :--------------------------------------------- | :------------------------------------------ |
| **로그인/프로필** | 닉네임 인사말, 세션 유지, 프로필 전역 동기화   | Supabase Auth, AsyncStorage, Global State   |
| **데이터 관리**   | 반려동물/기록 CRUD, D-Day 계산, 추모 확장 대비 | RLS 기반 CRUD, 날짜 로직(KST)               |
| **피드/타임라인** | 최신 기록 위젯, 전체 타임라인, 상세 화면 확장  | Storage 업로드, 리스트/상세 라우팅          |
| **AI 교감**       | 유료 멤버십 기반 AI 자동 답장                  | Edge Functions, 구독 상태, AI 메시지 테이블 |
| **멀티펫 UX**     | 미니 프로필 전환 + (＋)로 추가 등록            | selectedPetId 전역 상태 + UI 데이터 교체    |

---

# 2. Problem Definition

| #   | 문제                                     |
| --- | ---------------------------------------- |
| 1   | 장례 이후 장기적 기억을 관리할 공간 부족 |
| 2   | 감정 정리를 도와주는 구조 부재           |
| 3   | 체계적인 타임라인 관리 부족              |
| 4   | 기일 관리 시스템 부재                    |
| 5   | 감정 데이터를 축적·분석하는 서비스 부족  |

> **문제의 본질은 사진 저장이 아닌, 감정 관리 구조의 부재입니다.**

---

# 3. Core Value

- **보호자 중심 UX**
- **감정 기반 AI 시스템**
- **서버 고정 회상 알고리즘**
- **자동 기일 대응**
- **데이터 중심 아카이빙 구조**

---

# 4. Tech Stack

| 영역        | 기술                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------- |
| **Mobile**  | React Native CLI · TypeScript · React Navigation · Zustand · styled-components                  |
| **Backend** | Supabase (Auth · PostgreSQL · Storage · RLS) · Edge Functions                                   |
| **Infra**   | Gradle 8.13 · AGP 8.6 · Kotlin 2.1 · AsyncStorage v3                                            |
| **Utils**   | react-native-url-polyfill · react-native-get-random-values · buffer (Supabase RN polyfill 세트) |

---

# 5. 아키텍처 원칙

- 기능 단위 분리 (Feature-based)
- 서버 상태 / UI 상태 분리
- 도메인 확장 대비 설계
- 1인 개발 유지보수 가능 구조
- IAP 기반 수익화 확장 고려

---

# 6. MVP Scope

```
Phase 1
  Auth · Pet Profile · Record CRUD · Daily Recall · Timeline

Phase 2
  Emotion Tracking · AI Chat · Push · IAP

Phase 3
  Community Feed · Comments · Likes · Notifications
```

---

# 7. Core Features Architecture

## 7.1 Record System (기록)

```
records
├── pet_id
├── title
├── description
├── image_url
├── emotion_tag
└── occurred_at
```

---

## 7.2 Daily Recall Engine

```
daily_recall
├── pet_id
├── date
├── record_id
└── mode (anniversary | random | emotion_based)
```

---

## 7.3 Emotion Analysis Pipeline

```
User Input
  → AI Emotion Scoring
  → emotions 저장
  → 응답 톤 조절
  → 히스토리 누적
```

---

## 7.4 Subscription Architecture

```
subscriptions
├── user_id
├── tier
├── started_at
├── expires_at
└── store_receipt
```

---

# 8. Supabase Database Schema (Production Draft)

> ✅ **스키마 + RLS + Storage까지 “뼈대” 확정 완료**  
> 앞으로 기능을 추가해도 DB를 갈아엎지 않도록 기반을 먼저 고정했습니다.

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

---

# 9. Storage / RLS Policy Strategy

## 9.1 Storage 버킷

- `pet-avatars/`
- `record-images/`

## 9.2 기본 원칙

- 모든 테이블은 **RLS 활성화**
- 사용자 본인 데이터만 접근 가능
- `auth.uid()` 기반 접근 제어

예시:

```sql
CREATE POLICY "Users can access own pets"
ON pets
FOR ALL
USING (user_id = auth.uid());
```

---

# 10. Supabase Auth 구현 현황

## ✅ 구현 완료

- Email/Password 로그인 연동
- `signInWithPassword()` 정상 동작
- 세션 발급 확인
- `email_confirmed_at` 정상 확인
- 비밀번호 재설정 후 재로그인 검증 완료
- RN 환경 polyfill 적용 완료

---

# 11. Android 빌드 안정화 기록

## 해결된 이슈

- Gradle 8.13 요구사항 충돌 해결
- AGP 8.6 / Kotlin 2.1 버전 정합성 맞춤
- AsyncStorage v3 로컬 maven repo 설정
- settings.gradle / build.gradle repository 충돌 해결
- RepositoriesMode 정책 정리
- 빌드 성공 및 Emulator 설치 정상 확인

## 최종 상태

- BUILD SUCCESSFUL
- Emulator 설치 정상
- Supabase Auth 연결 정상

---

# 12. 앱 실행 구조 (부팅 순서)

## 12.1 앱 구동 흐름(정확한 순서)

```
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

## 12.2 index.js의 역할

- RN에서 Supabase 사용 시 필요한 polyfill을 **가장 먼저** 로드
- `global.Buffer` 주입(타입은 `src/types/global.d.ts`에서 보강)

---

# 13. 앱 구현 현황 (React Native)

## 13.1 기본 파일 역할

| 파일          | 역할                                   |
| ------------- | -------------------------------------- |
| index.js      | AppRegistry 등록 + polyfill            |
| App.tsx       | SafeAreaProvider + NavigationContainer |
| RootNavigator | Splash → Main (+ DevTest는 dev-only)   |

---

## 13.2 Splash (HomeScreen)

- 이중 배경 레이어
- 페이드 인 애니메이션
- 브랜드 감성 강조
- 자동 이동 주석 처리(UX 흐름 유지)

---

## 13.3 Main 화면 (현재 단계)

### 상태 기반 분기(정책)

- guest / logged_in 상태에 따라 홈 UX가 달라짐
- nickname 정책:
  - 로그인 + nickname 존재 → `"{nickname}님, 반가워요!"`
  - 그 외 → `"반가워요!"`

### UI 구성(현재)

- 함께한 시간(D-Day)
- 태그
- 오늘의 메시지(아침/점심/오후)
- 오늘의 아이 사진(당일 랜덤 컨셉 placeholder)
- 기록하기 CTA
- 최근 기록(placeholder)

---

# 14. 전역 상태 (Zustand) 도입 완료

## 14.1 Auth Store (`src/store/authStore.ts`)

- `guest / logged_in` 상태 관리
- Supabase session을 AsyncStorage에 저장/복원(hydrate) → 자동 로그인 기반
- nickname은 optional (없으면 기본 인사만 출력)

## 14.2 Pet Store (`src/store/petStore.ts`)

- `pets[] + selectedPetId` 전역 관리
- 멀티 반려동물 전환(헤더 미니 프로필) 구현의 기반
- pets가 비면 selectedPetId는 null로 유지

---

# 15. 필수 설치 패키지 (현재 프로젝트 기준)

> ✅ “지금 단계에서 반드시 필요한 것들”만 설치하고, 나머지는 필요한 시점에 추가합니다.

## 15.1 Core (이미 설치됨)

- `@supabase/supabase-js`
- `@react-native-async-storage/async-storage`
- `react-native-url-polyfill`
- `react-native-get-random-values`
- `buffer`
- `zustand`

## 15.2 Navigation (이미 설치됨)

- `@react-navigation/native`
- `@react-navigation/native-stack`
- `react-native-screens`
- `react-native-safe-area-context`
- `react-native-gesture-handler`

## 15.3 Media (이미 설치됨)

- `react-native-image-picker`

---

# 16. 상태관리(Zustand) + 메인 홈(UI) 연결 현황

## 16.1 App 시작 구조(안정화 포함)

- `SafeAreaProvider` + `NavigationContainer` 조합으로 루트 안정화
- `react-native-gesture-handler`는 `index.js`에서 가장 먼저 import하여 초기 부팅 안정화

## 16.2 MainScreen 구조(현재 단계)

- 레이아웃은 고정하고, 상태에 따라 분기 렌더링만 수행
- 펫 미등록 시:
  - 메인/헤더는 placeholder(+) 유지
  - 등록 CTA 중심

## 16.3 Multi-Pet UX 최종 결정(스와이프 대신)

- 헤더 우측에 작은 프로필(썸네일) 리스트 + `(+ )` 추가 버튼 배치
- 썸네일 탭 → `selectedPetId` 전환 → 메인 화면 데이터가 교체되는 구조
- `(+ )` 탭 → 반려동물 추가 플로우로 이동(예정)

## 16.4 다음 연결 목표(실데이터)

1. Supabase에서 pets fetch → `petStore.setPets()` 주입
2. 선택된 `selectedPetId` 기반으로 홈 데이터(오늘사진/최근기록/타임라인) 쿼리 연결
3. 가드 라우팅(게스트면 AuthLanding) 적용

---

# 17. Auth 설계(다음 단계 준비)

NURI는 **게스트 우선 전략**을 유지하면서, 필요 시 **로그인/회원가입/닉네임 설정**으로 자연스럽게 진입할 수 있도록 Auth 플로우를 확장합니다.

## 17.1 라우팅 구조(목표)

- `Splash → Main` 기본 흐름 유지
- 게스트가 “로그인/기록/등록” 등 인증이 필요한 액션을 누르면 `AuthLanding`으로 이동
- 로그인/회원가입 성공 시 session 저장 후 `Main`으로 reset 처리

라우트(예정):

- `AuthLanding` : 로그인/회원가입 선택 + 게스트로 계속
- `SignIn` : 이메일/비밀번호 로그인
- `SignUp` : 이메일/비밀번호 회원가입
- `NicknameSetup` : nickname 없을 때 1회 설정

## 17.2 닉네임 정책

ㅇㅇ

- 로그인 상태 + nickname 존재 시: `"{nickname}님, 반가워요!"`
- nickname이 없으면: 기본 문구 `"반가워요!"`
- nickname은 `profiles` 테이블에 저장/조회

---

# 18. 홈 레이아웃 분기 정책 (Guest / Logged-in)

NURI의 홈(Main)은 로그인 상태에 따라 **완전히 다른 레이아웃**을 사용할 수 있도록 설계합니다.

- `guest` 상태: **GuestHome** (로그인 전용 홈 레이아웃)
- `logged_in` 상태: **LoggedInHome** (실제 홈 레이아웃)

- MainScreen은 분기만 담당하며, 각 레이아웃은 컴포넌트/스타일 파일로 분리하여
- UI 수정(디자인 싱크)을 빠르게 반복할 수 있도록 구성합니다.

- “Auth + Home 분기 구현 현황”
- • 홈(Main)은 guest / logged_in 상태에 따라 완전히 다른 레이아웃을 렌더링
- • GuestHome: 로그인 전 랜딩 홈(왼쪽 UI), 모든 주요 액션은 AuthLanding 유도
- • LoggedInHome: 실제 홈(오른쪽 UI), 멀티펫 썸네일 스위처 + (+) 추가 유지
- • Auth 라우팅 추가
- • AuthLanding → SignIn/SignUp → NicknameSetup → Main(reset)
- • 앱 부팅 동기화(AppProviders)
- • authStore.hydrate()로 로컬 세션 복원
- • supabase.auth.getSession()로 실제 세션 정렬
- • 로그인 상태면 profiles.nickname fetch하여 전역 상태 주입
- • onAuthStateChange로 로그인/로그아웃 이벤트를 store와 동기화

---

# 19. 다음 단계 (정확한 실행 순서)

> 현재는 **“게스트/미등록 UI 하드코딩 + 전역 상태 기반”**이 안정화된 단계입니다.  
> 다음은 **실데이터 연결 + Auth 라우팅 고정** 순서로 진행합니다.

## Next Chapter: Pet 등록 → Storage 업로드 → 홈 실데이터 반영 ✅

### 목표

- 로그인 후 **등록된 펫이 없으면 PetCreate로 자동 유도**
- 펫 등록 시 **프로필 사진 업로드(Storage) → pets.profile_image_url 저장**
- 로그인/메인 진입 시 **fetchMyPets() → petStore.setPets(pets)**
- Logged-in 홈에서 selectedPet 기반으로 **name/avatar/weight/tags/birth/adoption** 실데이터 표시

### DB/Storage 기준

- `profiles` PK: `user_id` (auth.uid())
- `pets.profile_image_url`: Storage 경로(path) 저장 권장
  - 예: `userId/petId/avatar.jpg`
- Storage는 기본 `private` 권장 → 화면에서는 signed URL로 렌더링

### 흐름

1. Auth 성공(AppProviders)

- auth hydrate → session sync
- session 존재 시 nickname fetch → pets fetch → petStore 주입

2. Main(Logged-in)

- pets가 0마리면 PetCreate로 자동 이동
- 헤더 `+` 버튼 / Guest CTA 모두 PetCreate로 연결

3. PetCreate

- 이미지 선택 → Storage 업로드 → (path) 저장
- pets insert 후 fetchMyPets()로 리프레시 → 홈 반영

1. **Auth 흐름 고정 (가드 라우팅)**

   - guest 상태에서 기록/등록/상세 접근 시 → AuthLanding 유도
   - 로그인 성공 시 → session 저장 + nickname 반영

2. **Pet CRUD 연결 (실데이터 첫 연결)**

   - PetCreateScreen → Storage 업로드(pet-avatars) → pets insert
   - pets fetch → `petStore.setPets(pets)`
   - `selectedPetId` 기반으로 Main 홈 데이터 교체

3. **멀티펫 UX (미니 프로필 + (＋))**

   - 헤더 미니 프로필 영역을 “전환 UI”로 고정
   - (＋) 클릭 → 추가 등록
   - 썸네일 탭 → `selectedPetId` 변경 → 메인 UI 데이터 교체

4. **Record CRUD 연결**

   - RecordCreateScreen → 앨범/카메라 → Storage 업로드(record-images) → records insert
   - 홈 “최근 기록” 위젯 연결(최신 3~5개)

5. **Daily Recall / AI 메시지 확장**
   - “오늘의 아이 사진(랜덤)” 서버 고정 방식으로 확장
   - “오늘의 메시지(아침/점심/오후)” 시간대별 고정 메시지 + AI 생성으로 확장

---

# 20. Engineering Focus

- 성능 최적화
- 이미지 압축 전략
- 세션 안정성
- 서버 고정 로직 설계
- 확장 가능한 도메인 모델

---

# 21. Production Architecture Status (Final Confirmation)

NURI는 단순 MVP 단계를 넘어, **Production 전환을 고려한 구조적 기반이
이미 완성된 상태**입니다.

현재 아키텍처는 다음을 만족합니다:

- Supabase Auth + RLS 기반 보안 구조 확정
- profiles 자동 생성 트리거 적용
- update-first 전략으로 nickname 저장 안정화
- Storage private 정책 + owner 기반 접근 제어 확정
- Guest / Logged-in 홈 완전 분리 구조
- Zustand 기반 세션 hydrate + 동기화 설계 완료
- Multi-Pet 전환 구조(selectedPetId) 확정
- Future-proof DB Master Setup 완료

이 구조는 기능이 추가되어도 DB를 갈아엎지 않는 설계를 목표로 합니다.

---

# 22. Engineering Philosophy (확정 원칙)

## 서버 기준 설계

- 클라이언트는 단순하게
- 데이터 일관성은 서버 기준 고정
- Daily Recall / AI 메시지는 서버 고정 캐싱 전략

## 상태 관리 원칙

- 서버 상태 (Supabase) / UI 상태 (Zustand) 분리
- hydrate → session sync → nickname fetch → pets fetch 순서 고정
- selectedPetId는 전역 상태에서만 관리

## 확장 대비 설계

- death_date nullable 설계 → 추모 UI 확장 가능
- subscription 테이블 사전 설계 → IAP 확장 가능
- community 구조 사전 설계 → Phase 3 확장 대비

---

# 23. Security Model

## Database

- 모든 테이블 RLS 활성화
- auth.uid() 기반 접근 통제
- 본인 데이터만 CRUD 가능

## Storage

- 모든 파일 private
- owner 기반 접근 정책
- 화면에서는 signed URL 사용

보안 철학은 일관성입니다. DB와 Storage는 동일한 owner 기준 정책을
따릅니다.

---

# 24. 현재 기술 수준 평가

이 프로젝트는:

- 단순 CRUD 앱이 아님
- 감정 데이터 기반 구조적 플랫폼
- SaaS 확장을 고려한 DB 설계
- 구독 모델을 고려한 Billing 구조
- AI 확장을 고려한 메시지 캐싱 구조

현재 단계는:

Architecture Stable (기반 완성 단계)

---

# 25. Next Chapter (정확한 실행 순서)

이제부터는 설계가 아니라 실데이터 연결 단계입니다.

## Step 1 --- Pet CRUD 실데이터 연결

- fetchMyPets() 구현
- petStore.setPets() 주입
- 로그인 시 pets 자동 fetch
- pets 0마리 → PetCreate 자동 유도

## Step 2 --- Storage 업로드 안정화

- pet-avatars 업로드
- record-images 업로드
- 업로드 후 path 저장
- signed URL 변환 유틸 정리

## Step 3 --- Record CRUD 연결

- RecordCreateScreen 구현
- 이미지 업로드 → records insert
- 홈 최근 기록 위젯 연결
- Timeline Screen 구현

## Step 4 --- Daily Recall 고정 알고리즘

- 하루 1회 서버 결정
- daily_recall 테이블 캐싱
- 앱은 조회만 수행

## Step 5 --- AI Guestbook 확장

- Edge Function 설계
- 구독 상태 확인
- ai_messages 캐싱 전략 적용

---

# 21. Production Architecture Status (Final Confirmation)

NURI는 단순 MVP 단계를 넘어, **Production 전환을 고려한 구조적 기반이
이미 완성된 상태**입니다.

현재 아키텍처는 다음을 만족합니다:

- Supabase Auth + RLS 기반 보안 구조 확정
- profiles 자동 생성 트리거 적용
- update-first 전략으로 nickname 저장 안정화
- Storage private 정책 + owner 기반 접근 제어 확정
- Guest / Logged-in 홈 완전 분리 구조
- Zustand 기반 세션 hydrate + 동기화 설계 완료
- Multi-Pet 전환 구조(selectedPetId) 확정
- Future-proof DB Master Setup 완료

이 구조는 기능이 추가되어도 DB를 갈아엎지 않는 설계를 목표로 합니다.

---

# 22. Engineering Philosophy (확정 원칙)

## 서버 기준 설계

- 클라이언트는 단순하게
- 데이터 일관성은 서버 기준 고정
- Daily Recall / AI 메시지는 서버 고정 캐싱 전략

## 상태 관리 원칙

- 서버 상태 (Supabase) / UI 상태 (Zustand) 분리
- hydrate → session sync → nickname fetch → pets fetch 순서 고정
- selectedPetId는 전역 상태에서만 관리

## 확장 대비 설계

- death_date nullable 설계 → 추모 UI 확장 가능
- subscription 테이블 사전 설계 → IAP 확장 가능
- community 구조 사전 설계 → Phase 3 확장 대비

---

# 23. Security Model

## Database

- 모든 테이블 RLS 활성화
- auth.uid() 기반 접근 통제
- 본인 데이터만 CRUD 가능

## Storage

- 모든 파일 private
- owner 기반 접근 정책
- 화면에서는 signed URL 사용

보안 철학은 일관성입니다. DB와 Storage는 동일한 owner 기준 정책을
따릅니다.

---

# 24. 현재 기술 수준 평가

이 프로젝트는:

- 단순 CRUD 앱이 아님
- 감정 데이터 기반 구조적 플랫폼
- SaaS 확장을 고려한 DB 설계
- 구독 모델을 고려한 Billing 구조
- AI 확장을 고려한 메시지 캐싱 구조

현재 단계는:

Architecture Stable (기반 완성 단계)

---

# 25. Next Chapter (정확한 실행 순서)

이제부터는 설계가 아니라 실데이터 연결 단계입니다.

## Step 1 --- Pet CRUD 실데이터 연결

- fetchMyPets() 구현
- petStore.setPets() 주입
- 로그인 시 pets 자동 fetch
- pets 0마리 → PetCreate 자동 유도

## Step 2 --- Storage 업로드 안정화

- pet-avatars 업로드
- record-images 업로드
- 업로드 후 path 저장
- signed URL 변환 유틸 정리

## Step 3 --- Record CRUD 연결

- RecordCreateScreen 구현
- 이미지 업로드 → records insert
- 홈 최근 기록 위젯 연결
- Timeline Screen 구현

## Step 4 --- Daily Recall 고정 알고리즘

- 하루 1회 서버 결정
- daily_recall 테이블 캐싱
- 앱은 조회만 수행

## Step 5 --- AI Guestbook 확장

- Edge Function 설계
- 구독 상태 확인
- ai_messages 캐싱 전략 적용

---

# 26. Final Statement

NURI는 감정을 저장하는 서비스가 아니라, 감정을 구조화하는 시스템입니다.

이제 다음 단계는 구조가 아니라, 실데이터 연결과 사용자 경험 완성입니다.

---

_Private Founder Build_

---

# ✅ Chapter 1 — Pet CRUD (실데이터 연결 시작)

> **이제부터는 설계가 아니라 “실데이터 연결” 단계입니다.**  
> 목표는 딱 하나: **펫 등록 → Storage 업로드 → 홈 실데이터 반영**까지 끊김 없이 이어지게 만들기 ✅

---

## 1) Pet 데이터 모델/컬럼 매핑 (DB row → 앱 타입)

**DB(`pets`) → App(`Pet`) 매핑 원칙**

- DB: `profile_image_url`에는 **full URL 저장 금지**
- DB에는 **Storage path만 저장** (예: `userId/petId/avatar.jpg`)
- 앱 렌더링 시에는 **signed URL**로 변환해서 보여줌
- `text[]`는 그대로 `string[]`로 매핑
- `numeric`는 RN에서 string으로 내려올 수 있으니 **number 변환 유틸**로 방어

**핵심 파일**

- `src/store/petStore.ts`
- `src/services/supabase/pets.ts`

---

## 2) Storage 업로드(avatar) 먼저 연결

**정책**

- Storage: `private` 유지 (보안/owner 정책 일관성)
- 업로드: `pet-avatars` 버킷
- 조회: `createSignedUrl()`로 signed URL 발급 → Image 렌더링

**핵심 파일**

- `src/services/supabase/storage.ts` (공용 업로드/서명URL/삭제)
- `src/services/supabase/storagePets.ts` (pet avatar 전용 wrapper)

---

## 3) PetCreateScreen(온보딩) + 라우팅 연결

**UX**

- 로그인 직후 **펫이 0마리면 자동으로 PetCreate로 유도**
- 홈 헤더의 `(＋)` 버튼도 PetCreate로 연결
- 등록 성공하면:
  - `pets insert` → (이미지 있으면) 업로드 → `profile_image_url(path)` 업데이트
  - `fetchMyPets()` → `petStore.setPets()` 주입
  - `Main reset`

**핵심 파일**

- `src/screens/Pets/PetCreateScreen.tsx`
- `src/navigation/RootNavigator.tsx`
- `src/screens/Main/components/LoggedInHome/LoggedInHome.tsx`

---

## 4) 앱 부팅 시 pets fetch → petStore 주입

**부팅 순서(고정)**

```
hydrate → getSession → setSession
  → (session 있으면) nickname fetch → pets fetch → petStore.setPets
  → auth 이벤트(onAuthStateChange)에서도 동일하게 동기화
```

**핵심 파일**

- `src/app/providers/AppProviders.tsx`

---

## 5) 홈 UI에서 selectedPet 실데이터 노출

- 이미 `selectedPet`은 `useMemo`로 잡혀있으므로
- 앞으로는 placeholder 대신 아래 값으로 교체하면 됨:

`selectedPet.name / avatarUrl / weightKg / tags / birthDate / adoptionDate ...`

---

## ✅ Chapter 1 Done 체크리스트

- [x] pets row → Pet 타입 매핑(숫자/배열 방어 포함)
- [x] Storage private 업로드 + signed URL 렌더링
- [x] PetCreate 온보딩(이미지 선택/업로드/DB path 저장/리프레시)
- [x] AppProviders 부팅 시 pets 자동 fetch + auth 이벤트 동기화
- [x] Logged-in 홈: pets 0마리면 PetCreate 자동 유도 + (＋) 버튼 연결

---

# ✅ Chapter 2 — Android Storage 업로드 안정화 (BlobUtil 기반)

이 챕터는 **Android에서 이미지 업로드가 실제로 끊김 없이 동작하도록 고정하는 안정화 단계**입니다.  
목표는 단 하나입니다.

> 갤러리(content://) → Storage 업로드 → DB path 저장 → 홈/헤더 즉시 반영  
> 이 흐름을 완전히 연결하고 끊김 없이 동작하도록 만드는 것

---

## 1. Android 업로드 실패 원인 확정 (content:// + fetch/blob 한계)

### 🔎 현상

- 이미지 선택은 되지만 업로드 실패
- 업로드 후 DB 반영이 끊겨 목록에 표시되지 않음
- 네이티브 모듈 에러로 업로드 코드가 런타임에서 중단됨

### 🧠 핵심 결론

Android의 `content://` URI는 `fetch(uri).blob()` 방식이 불안정합니다.

#### ❌ includeBase64 방식의 문제점

- 환경/설정에 따라 base64 값이 없을 수 있음
- 메모리 사용량이 큼
- 대용량 이미지에서 크래시 위험
- 장기적으로 안정적인 구조가 아님

### ✅ 해결 전략

> Android 업로드 파이프라인은 BlobUtil 기반으로 고정

---

## 2. 업로드 전략 통일 (BlobUtil 기준)

### 📌 원칙

- Android 이미지 업로드는 항상 BlobUtil 사용
- DB에는 full URL 저장 금지
- DB에는 Storage path만 저장
- UI 렌더링 시 signed URL 변환 후 사용
- Storage 버킷은 private 유지

### 📁 핵심 파일

- src/services/supabase/storage.ts
- src/services/supabase/storagePets.ts

---

## 3. Storage 버킷명 최종 확정 (정합성 통일)

### 🎯 최종 버킷명

- `pet-profiles`
- `memory-images`

### ❌ 기존 혼용 제거

| 기존 이름     | 통일 이름     |
| ------------- | ------------- |
| pet-avatars   | pet-profiles  |
| record-images | memory-images |

> DB / 코드 / 정책 / README 전부 동일한 명칭으로 통일

---

## 4. Android 권한 설정 정리 (Manifest 안정화)

### 📜 적용 권한

- Android 14+ → `READ_MEDIA_VISUAL_USER_SELECTED`
- Android 13+ → `READ_MEDIA_IMAGES`
- Android 12 이하 → `READ_EXTERNAL_STORAGE (maxSdkVersion="32")`
- 필요 시 → `WRITE_EXTERNAL_STORAGE (maxSdkVersion="32")`

### 📂 파일 위치

- android/app/src/main/AndroidManifest.xml

이 설정으로 갤러리 접근 → 파일 읽기 → 업로드 흐름이 안정화됨.

---

## 5. 업로드 → DB → UI 반영 플로우 완성

### 🔄 최종 성공 흐름

1. PetCreate에서 이미지 선택
2. BlobUtil 기반 Storage 업로드 성공
3. `pets.profile_image_url`에 path 저장
4. `fetchMyPets()` 재조회
5. 홈 헤더 / 카드 썸네일 즉시 반영

---

# ✅ Chapter 2 Done 체크리스트

- [x] Android content:// 업로드 이슈 BlobUtil 방식으로 해결
- [x] includeBase64 의존 제거
- [x] Storage 버킷명 최종 확정
  - `pet-profiles`
  - `memory-images`
- [x] AndroidManifest 권한 정리 완료
- [x] 이미지 포함 펫 등록 end-to-end 성공

## Chapter 3.5 — Records “완전체” 마무리 (Edit + Delete Storage Cleanup)

### 목표

- Record 수정(Edit) 완성
- Record 삭제 시 DB row 삭제 + Storage 파일까지 함께 제거 (완전체)

### 구현 내용

#### 1) Record 수정(Edit)

- `updateMemoryFields({ title, content, tags, emotion, occurredAt })`로 필드 수정 지원
- `RecordEditScreen` 추가 및 라우팅 연결
- 저장 후 `recordStore.refresh(petId)`로 즉시 동기화

#### 2) Record 삭제 시 Storage 파일 정리(완전체)

- 기존: DB row만 삭제
- 개선: `deleteMemoryWithFile({ memoryId, imagePath })`로
  - `memory-images` 버킷 파일 삭제
  - 이후 `memories` row 삭제
- Detail 화면에서 삭제 시 `optimistic remove → refresh`로 UX/정합성 모두 보장

### 변경 파일

- `src/navigation/RootNavigator.tsx`
- `src/store/recordStore.ts`
- `src/services/supabase/memories.ts`
- `src/screens/Records/TimelineScreen.tsx`
- `src/screens/Records/RecordCreateScreen.tsx`
- `src/screens/Records/RecordDetailScreen.tsx`
- `src/screens/Records/RecordEditScreen.tsx`

### 결과

- Records CRUD (Create/Read/Edit/Delete) + 이미지 업로드/렌더링 + 삭제 시 스토리지 정리까지 포함한 **Chapter 3 완전체** 완료 ✅

## Chapter X. LoggedInHome 안정화 (Hooks order fix) + Public Avatar 렌더링 경로 정리

### 배경

LoggedInHome 수정 이후 화면 전환 시 다음 오류가 반복 발생했다.

- `React has detected a change in the order of Hooks called by LoggedInHome`
- `Rendered more hooks than during the previous render`

이는 **조건부로 zustand hook/selector를 호출하거나, 렌더마다 hook 호출 순서/개수가 달라질 때** 발생한다.

---

### 해결

#### 1) Hooks 호출 순서/개수 고정

- LoggedInHome에서 `useRecordStore` 등 zustand hook은 **항상 동일한 순서로 호출**되도록 정리했다.
- `activePetId`가 없을 때도 hook 자체는 호출하되, selector 내부에서만 `undefined`를 반환하도록 구성했다.
- `getPetState()` 같은 store 함수 호출 기반 selector는 제거하고, `byPetId[activePetId]` 직접 구독 방식으로 단순화했다.

#### 2) Public bucket 기준 avatar 렌더링 경로 정리

- UI에서 avatar 표시 시 우선순위를 명확히 했다.
  - `avatarUrl`(이미 확보된 URL) 우선 사용
  - 없으면 `avatarPath(profile_image_url)`를 `public url`로 변환하여 렌더링

---

### 현재 상태

- LoggedInHome hooks 에러는 구조적으로 재발하지 않도록 안정화했다.
- 다만 “다른 반려동물 썸네일이 안 보이는 문제”는 별도 원인(데이터 매핑/스토어 필드/URL 생성 방식 등)으로 판단되어 다음 챕터에서 해결한다.

---

### 다음 작업(예정)

- 썸네일 미노출 이슈 원인 확정 및 수정:
  - `pets.ts` 매핑에서 `profile_image_url` → `avatarPath` 저장 여부 점검
  - public url 생성 함수/버킷 설정 일치 여부 점검
  - petStore/LoggedInHome에서 사용하는 필드 스키마 정합성 맞추기

### Fix: 멀티펫 헤더 썸네일 Active 표시 누락

- 문제: 멀티펫 헤더에서 선택된 펫(active) 표시가 보이지 않아 썸네일이 정상 노출되지 않는 것처럼 보였음
- 원인: `petChipActive`에 `borderColor`만 적용되고 `borderWidth`가 없어 테두리가 실제로 렌더링되지 않았음
- 해결: `petChipActive`에 `borderWidth`를 추가(필요 시 기본 `petChip`에도 얇은 테두리 적용)하여 활성 상태가 확실히 구분되도록 수정

---

## 🧭 Navigation Architecture Refactor (2026-03-02)

### 1. 구조 개편

기존 단일 Stack 기반 구조에서  
**RootStack + AppTabs (BottomTab) 구조**로 전면 리팩토링 완료.

### 🔹 RootStack

- Splash (단독)
- AppTabs (공통 하단 네비게이션 영역)
- Auth Screens
- PetCreate
- RecordDetail / RecordEdit (몰입 화면)

### 🔹 AppTabs

- Home (MainScreen)
- Timeline (추억보기)
- RecordCreate (기록하기)
- More (placeholder)

> Splash를 제외한 모든 메인 화면에 하단 탭이 항상 노출되는 구조로 통일.

---

### 2. petId 안정화 전략

탭 구조 도입으로 인해  
Timeline / RecordCreate가 route params 없이 진입하는 케이스 발생.

해결 전략:
route.params?.petId → 없으면
selectedPetId(store) → 없으면
pets[0]?.id

store fallback 로직으로 안정화 완료.

---

### 3. PetCreate 완료 후 라우팅 수정

기존:navigation.reset({ name: ‘Main’ })
변경:navigation.reset({ name: ‘AppTabs’ })

RootStack 구조 변경에 맞춰 정상 복귀 처리.

---

### 4. Header 전략 통일

- Native Stack 기본 headerTitle 제거
- headerBackTitle 제거
- 화면 내부 커스텀 헤더 사용 전략으로 통일

---

### 5. 디자인 1차 정리

- 전체 배경 흰색 기반
- 주요 액션 버튼 검정색
- borderColor: #EAEAEA 통일
- paddingBottom 과다 제거 (전역 탭 대응)

---

### 현재 상태

- 멀티펫 헤더 썸네일 정상 노출
- Record CRUD 정상 동작
- Navigation 구조 안정화 완료
- 전역 BottomTab 적용 완료

### Chapter 4 — Global Navigation & Layout Stabilization

- BottomTab을 AppTabsNavigator에서 전역 관리하도록 구조 정리
- GuestHome 내부 중복 탭/FAB 제거
- SafeAreaInsets 기반 상단 간격 처리로 상태바 영역 안정화
- 오른쪽 슬라이드 MoreDrawer 오버레이 적용
- spring 기반 애니메이션으로 UX 부드럽게 개선
- 전체 UI를 흰/검 베이스로 1차 통일 완료

### Chapter — 홈 상단 SafeArea + 전환 애니메이션 고도화

- Screen 공용 레이아웃 래퍼 추가로 SafeArea(top inset) 처리 표준화
- LoggedInHome 루트에 Screen 적용하여 상태바(시간/아이콘) 영역과 UI 간격 안정화
- 펫 전환 애니메이션을 Reanimated 기반(UI thread)으로 업그레이드하여 버벅임을 감소
- 전환 타이밍을 runOnJS로 고정하고 연타 방지로 중첩 렌더/끊김 방지

# 🚀 NURI Roadmap (Phase 2 – Productization Strategy)

> 목적: CRUD 중심 MVP에서 "제품 완성도" 중심 아키텍처로 전환  
> 기준: React Native + Supabase + Zustand 구조 유지

---

# Chapter 4. 로그인 유지 + 부트 전략 고도화

## 🎯 목표

앱 재실행 시:

- Splash 0.8~1초 고정
- Supabase getSession()
- nickname fetch
- pets fetch
- selectedPetId 자동 복원
- 화면 깜빡임 0
- 완전한 “앱 같다” 느낌 구현

---

## 🧠 설계 철학

앱의 첫 1초는 신뢰도를 결정한다.

- 깜빡임 X
- 로그인 화면 튀어나옴 X
- 데이터 늦게 변경 X
- 상태 뒤틀림 X

---

## 🔄 부트 시퀀스 설계

App Launch  
↓  
Splash (0.8~1.0s 고정)  
↓  
authStore.hydrate()  
↓  
supabase.auth.getSession()  
↓  
if session:  
 fetchProfile()  
 fetchPets()  
 restoreSelectedPet()  
↓  
AppTabs 진입

---

## 📦 상태 구조

### authStore

- status: 'guest' | 'logged_in'
- session
- profile
- booted: boolean

### petStore

- pets[]
- selectedPetId
- booted: boolean

---

## 🔐 핵심 전략

1. booted === false 동안 화면 전환 금지
2. Splash에서 모든 초기 fetch 처리
3. selectedPetId 복원 전략
   - pets.length > 0 → 첫 번째 pet 자동 선택
   - pets.length === 0 → PetCreate 유도

---

## 🎯 기대 효과

- 앱 재실행 UX 완성도 상승
- 데이터 동기화 안정화
- 이후 기능 확장 기반 강화

---

# Chapter 5. 홈 화면 감성 강화 (NURI 정체성 시작점)

## 🎯 목표

CRUD 중심 화면 → 감정 중심 홈으로 전환

---

## 1️⃣ D-Day 계산

목적: 함께한 시간을 수치로 시각화

계산 방식:

- dayjs 기준
- today - pet.birthDate

예시:
함께한지 1,284일

---

## 2️⃣ 오늘의 한 줄 추억

목적:

- 감성적 재방문 유도
- 홈에서 즉시 감정 자극

로직:

- 해당 pet의 memories 중 랜덤 1개
- 하루 1회 고정 (Daily Recall과 연동 예정)

---

## 3️⃣ 최근 기록 위젯 정제

- 썸네일 + 날짜 + 짧은 본문
- 3~5개 제한
- signedUrl 캐싱 최적화

---

## 4️⃣ 감정 태그 시각화

memory.emotion 기반 비율 계산

예시:
행복 40%  
그리움 25%  
평온 20%  
기타 15%

---

## 🎯 기대 효과

- NURI 브랜드 정체성 강화
- 단순 기록 앱과 차별화
- 감정 기반 플랫폼 방향 확립

---

# Chapter 6. Daily Recall 서버 고정 로직

## 🎯 목표

하루 1회 랜덤 추억 고정

---

## 📦 Supabase 테이블 설계

### daily_recall

- id (uuid)
- user_id (uuid)
- pet_id (uuid)
- memory_id (uuid)
- recall_date (date)
- created_at (timestamp)

Unique Constraint:
(pet_id, recall_date)

---

## 🔄 동작 흐름

1. 오늘 날짜 기준 recall 존재 여부 조회
2. 없으면 memories 중 랜덤 선택 후 insert
3. 있으면 해당 memory 반환

---

## 🧠 캐시 전략

- 하루 동안 Zustand 캐싱
- 앱 재시작 시 서버 기준 재검증

---

## 🎯 기대 효과

- 감성적 반복 방문 유도
- AI 확장 기반 데이터 축적
- 구독 모델 연결 가능

---

# Chapter 7. 구독/결제 아키텍처 설계 (설계 단계)

> 실제 결제 연동은 추후 진행  
> 현재는 구조 설계만 정의

---

## 🎯 목표

- 무료/유료 기능 분리
- Feature Gating 구조 확립

---

## 📦 subscriptions 테이블

- id (uuid)
- user_id (uuid)
- plan (free / plus / pro)
- status
- expires_at (timestamp)

---

## 🧠 Feature Gating 예시

free:

- dailyRecallLimit = 1
- aiMessages = 0

plus:

- dailyRecallLimit = unlimited
- aiMessages = 10/month

---

## 🧱 확장 가능 구조

- AI 위로 메시지 유료화
- AR 추억 공간
- 커뮤니티 프리미엄 기능
- 감정 리포트 제공

---

# 📌 전체 로드맵 흐름

Chapter 4 → 부트 전략 완성  
Chapter 5 → 감성 홈 강화  
Chapter 6 → Daily Recall 서버화  
Chapter 7 → 구독 구조 설계

---

# 🏁 방향성 요약

NURI는 단순 기록 앱이 아니다.

- 감정 데이터를 구조화하고
- 기억을 재해석하며
- 반복 방문을 유도하는 플랫폼

Phase 2는 기능 구현이 아니라  
제품 완성도를 끌어올리는 단계다.

# 26. Final Statement

NURI는 감정을 저장하는 서비스가 아니라, 감정을 구조화하는 시스템입니다.

이제 다음 단계는 구조가 아니라, 실데이터 연결과 사용자 경험 완성입니다.

---

_Private Founder Build_

_Private Project — Founder Build_

> NURI는 개인적인 상실 경험에서 시작되었습니다.  
> 목표는 **감정을 구조화하는 기술 플랫폼**을 만드는 것입니다.
