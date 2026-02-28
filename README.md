# 🌈 NURI

### _Emotion-Driven Digital Memory Archive Platform_

> **기억은 사라지지 않습니다. 우리는 아이를 잊지 않습니다.**

---

## 0. Why NURI?

NURI는 창업자의 개인적인 상실 경험에서 시작되었습니다.

사랑하는 반려견을 떠나보낸 이후, 가족이 깊은 슬픔 속에서 감정을 정리하지 못하는 모습을 보며 **감정을 구조화할 수 있는 디지털 공간의 필요성**을 느꼈습니다.

NURI는 단순한 추모 앱이 아닙니다.  
누구나 사용 할 수 있는 앱 입니다.  
**사랑하는 반려동물 매 순간 기억하고 기록하는**  
**감정 데이터를 기반으로 기억을 구조화하는 플랫폼입니다.**

---

# 1. 서비스 개요

NURI는 반려동물을 떠나보낸 보호자, 또는 아이의 추억을 체계적으로 기록하고 싶은 보호자를 위한 **디지털 메모리얼 & 감정 기록 플랫폼**입니다.

### 1.1 핵심 가치 및 기술 스택

| 핵심 개념               | 설명                                                     |
| :---------------------- | :------------------------------------------------------- |
| **🧩 기억 구조화**      | 감정 태그 기반의 체계적 기억 아카이빙                    |
| **📊 감정 데이터 축적** | AI 기반 감정 분석 및 히스토리 누적                       |
| **🔄 회상 알고리즘**    | 서버 고정 방식의 일관된 Daily Recall 시스템              |
| **🏗 확장성**            | 커뮤니티, 유료 구독 모델(AI), 위치 기반 서비스 확장 구조 |

---

### 1.2 상세 기능 기획

#### ① 개인화된 사용자 경험 (Supabase 연동)

- **사용자 맞춤형 인사말:** 로그인 시 Supabase Auth + `profiles.nickname` 연동으로  
  `"{닉네임}님, 반가워요!"` 개인화 문구를 노출합니다.  
  (nickname이 없으면 기본 문구인 `"반가워요!"`만 노출)
- **프로필 이미지 동기화:** 반려동물 등록 시 업로드한 이미지는 Supabase Storage에 저장되며,  
  메인 카드/헤더 미니 프로필 등 앱 전역에서 실시간으로 동기화됩니다.  
  (Global State + fetch 후 UI 전체 반영)

#### ② 반려동물 프로필 & 스마트 데이터

- **반려동물 정보 관리:** 이름, 생년월일, 몸무게, 좋아하는 것(#태그), 싫어하는 것(옵션), 취미 등을 기록합니다.
- **D-Day 자동 계산:** 등록된 날짜(입양일/함께하기 시작한 날 등)과 현재 날짜를 비교하여  
  **"우리가 함께한 시간 · 500일째"**처럼 자동 계산된 시간을 제공합니다. (KST 기준)
- **추모 확장 대비:** `death_date`(사망일) 필드(Nullable)로 추모 UI/기념일 로직을 확장합니다.

#### ③ 아카이빙 시스템 (기록 및 타임라인)

- **기록하기:** 카메라/앨범 접근 → 사진 업로드 + 제목 + 설명 + 감정 태그 선택 → 기록 저장
- **최근 기록(홈 위젯):** 최신 기록 썸네일/요약을 홈에서 빠르게 확인합니다.
- **추억보기(타임라인):** 기록하기로 생성한 모든 기록을 최신순으로 확인합니다.
- **상세 보기:** 모달보다 “상세 화면”을 추천합니다.  
  (뒤로가기/공유/수정/삭제/스크롤 등 UX 확장에 유리)

#### ④ 정서적 교감 서비스 (AI Guestbook)

- **글 남기기(방명록):** 아이에게 전하고 싶은 마음/그리움/하루의 기록을 편지 형태로 남깁니다.
- **AI 코멘트 (유료 모델):** 유료 구독(또는 결제)을 통해,  
  반려동물 정보 + 기록/편지 내용을 기반으로 “따뜻한 답장”을 자동 생성합니다.  
  (Edge Function + 구독 상태 + AI 메시지 저장 구조로 확장)

#### ⑤ 멀티 반려동물 지원 (스와이프보다 “미니 프로필 전환” 우선)

- **핵심 UX:** 헤더 우측에 **작은 원형 미니 프로필**이 있고, 그 옆에 **회색 원형(＋)** 버튼이 있습니다.
- **동작:**
  - (＋) 클릭 → **반려동물 추가 등록 플로우**로 진입
  - 미니 프로필(썸네일) 클릭 → **다른 아이 프로필로 즉시 전환**
- **원칙:** 레이아웃은 유지하고, **선택된 아이 데이터만 교체**합니다.

---

### 1.3 UI/UX 및 네비게이션 설계

- **하단 네비게이션 구조:** `[홈]` - `[추억보기(타임라인)]` - `[방명록(글 남기기)]` - `[더보기]`
- **기록하기(CTA) 배치:**  
  초기에는 홈 내 주요 CTA로 유지하고, 추후 접근성을 위해  
  하단 중앙 버튼 또는 FAB(플로팅 액션 버튼)로 고정 배치하는 것을 목표로 합니다.
- **더보기(슬라이드 메뉴):**  
  고객센터 / 반려동물 정보 수정 / 계정 설정 등 확장 가능한 메뉴를 여기에 배치합니다.

---

### 1.4 서비스 구조 요약

| 구분              | 주요 기능 및 특징                              | 구현 포인트                                 |
| :---------------- | :--------------------------------------------- | :------------------------------------------ |
| **로그인/프로필** | 닉네임 인사말, 세션 유지, 프로필 전역 동기화   | Supabase Auth, AsyncStorage, Global State   |
| **데이터 관리**   | 반려동물/기록 CRUD, D-Day 계산, 추모 확장 대비 | RLS 기반 CRUD, 날짜 로직(KST)               |
| **피드/타임라인** | 최신 기록 위젯, 전체 타임라인, 상세 화면 확장  | Storage 업로드, 리스트/상세 라우팅          |
| **AI 교감**       | 유료 멤버십 기반 AI 자동 답장                  | Edge Functions, 구독 상태, AI 메시지 테이블 |
| **멀티펫 UX**     | 미니 프로필 전환 + (＋)로 추가 등록            | selectedPetId 전역 상태 + UI 데이터 교체    |

---

## 2. Problem Definition

| #   | 문제                                     |
| --- | ---------------------------------------- |
| 1   | 장례 이후 장기적 기억을 관리할 공간 부족 |
| 2   | 감정 정리를 도와주는 구조 부재           |
| 3   | 체계적인 타임라인 관리 부족              |
| 4   | 기일 관리 시스템 부재                    |
| 5   | 감정 데이터를 축적·분석하는 서비스 부족  |

> **문제의 본질은 사진 저장이 아닌, 감정 관리 구조의 부재입니다.**

---

## 3. Core Value

- **보호자 중심 UX**
- **감정 기반 AI 시스템**
- **서버 고정 회상 알고리즘**
- **자동 기일 대응**
- **데이터 중심 아카이빙 구조**

---

## 4. Tech Stack

| 영역        | 기술                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------- |
| **Mobile**  | React Native CLI · TypeScript · React Navigation · Zustand · styled-components                  |
| **Backend** | Supabase (Auth · PostgreSQL · Storage · RLS) · Edge Functions                                   |
| **Infra**   | Gradle 8.13 · AGP 8.6 · Kotlin 2.1 · AsyncStorage v3                                            |
| **Utils**   | react-native-url-polyfill · react-native-get-random-values · buffer (Supabase RN polyfill 세트) |

---

## 5. 아키텍처 원칙

- 기능 단위 분리 (Feature-based)
- 서버 상태 / UI 상태 분리
- 도메인 확장 대비 설계
- 1인 개발 유지보수 가능 구조
- IAP 기반 수익화 확장 고려

---

## 6. MVP Scope

```
Phase 1
  Auth · Pet Profile · Memory CRUD · Daily Recall · Timeline

Phase 2
  Emotion Tracking · AI Chat · Push · IAP

Phase 3
  Community Feed · Comments · Likes · Notifications
```

---

## 7. Core Features Architecture

### 7.1 Memory System

```
memories
├── pet_id
├── content
├── image_url
├── emotion_tag
└── occurred_at
```

---

### 7.2 Daily Recall Engine

```
daily_recall
├── pet_id
├── date
├── memory_id
└── mode (anniversary | random | emotion_based)
```

---

### 7.3 Emotion Analysis Pipeline

```
User Input
  → AI Emotion Scoring
  → emotions 저장
  → 응답 톤 조절
  → 히스토리 누적
```

---

### 7.4 Subscription Architecture

```
subscriptions
├── user_id
├── tier
├── started_at
├── expires_at
└── store_receipt
```

---

## 8. Supabase Database Schema (Production Draft)

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

## 9. Storage / RLS Policy Strategy

### Storage 버킷

- `pet-avatars/`
- `record-images/`

### 기본 원칙

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

## 10. Supabase Auth 구현 현황

### ✅ 구현 완료

- Email/Password 로그인 연동
- `signInWithPassword()` 정상 동작
- 세션 발급 확인
- `email_confirmed_at` 정상 확인
- 비밀번호 재설정 후 재로그인 검증 완료
- RN 환경 polyfill 적용 완료

---

## 11. Android 빌드 안정화 기록

### 해결된 이슈

- Gradle 8.13 요구사항 충돌 해결
- AGP 8.6 / Kotlin 2.1 버전 정합성 맞춤
- AsyncStorage v3 로컬 maven repo 설정
- settings.gradle / build.gradle repository 충돌 해결
- RepositoriesMode 정책 정리
- 빌드 성공 및 Emulator 설치 정상 확인

### 최종 상태

- BUILD SUCCESSFUL
- Emulator 설치 정상
- Supabase Auth 연결 정상

---

## 12. 앱 구현 현황 (React Native)

### 1) 기본 실행 구조

| 파일          | 역할                                 |
| ------------- | ------------------------------------ |
| index.js      | AppRegistry 등록 + polyfill          |
| App.tsx       | NavigationContainer                  |
| RootNavigator | Splash → Main (+ DevTest는 dev-only) |

---

### 2) Splash (HomeScreen)

- 이중 배경 레이어
- 페이드 인 애니메이션
- 브랜드 감성 강조
- 자동 이동 주석 처리(UX 흐름 유지)

---

### 3) Main 화면 (현재 단계: “게스트/미등록 UI” 하드코딩)

- **게스트 / 로그인 / 펫 등록 여부에 따른 분기 렌더링**
- nickname이 존재하면: `"{nickname}님, 반가워요!"`
- 펫이 없으면: 헤더 미니 프로필도 (＋) placeholder가 정상
- 섹션 구성:
  - 함께한 시간(D-Day)
  - 태그
  - 오늘의 메시지(아침/점심/오후)
  - 오늘의 아이 사진(당일 랜덤 컨셉 placeholder)
  - 기록하기 CTA
  - 최근 기록(placeholder)

---

### 4) 전역 상태 (Zustand) 도입 완료

#### Auth Store (`src/store/authStore.ts`)

- `guest / logged_in` 상태 관리
- Supabase session을 AsyncStorage에 저장/복원(hydrate)하여 자동 로그인 기반 마련
- nickname은 optional (없으면 기본 인사만 출력)

#### Pet Store (`src/store/petStore.ts`)

- `pets[] + selectedPetId` 전역 관리
- 멀티 반려동물 전환(미니 프로필 탭) 구현의 기반
- pets가 비면 selectedPetId는 null로 유지

---

## ✅ 16. 상태관리(Zustand) + 메인 홈(UI) 연결 현황

### 16.1 설치된 핵심 패키지(현재 필수)

- Navigation
  - `@react-navigation/native`
  - `@react-navigation/native-stack`
  - `react-native-screens`
  - `react-native-safe-area-context`
  - `react-native-gesture-handler`
- State
  - `zustand`
  - `@react-native-async-storage/async-storage`
- Supabase
  - `@supabase/supabase-js`
  - `react-native-url-polyfill`
  - `react-native-get-random-values`
  - `buffer`

### 16.2 App 시작 구조(안정화 포함)

- `GestureHandlerRootView` + `SafeAreaProvider` + `NavigationContainer` 조합으로 루트 안정화
- `enableScreens(true)` 적용 (네비 성능/안정 최적화)

### 16.3 MainScreen 구조(현재 단계)

- 레이아웃은 고정하고, 상태에 따라 분기 렌더링만 수행
- 닉네임 정책:
  - 로그인 + nickname 존재 → `"{nickname}님, 반가워요!"`
  - 그 외 → `"반가워요!"`
- 펫 미등록 시:
  - 메인/헤더는 placeholder(+) 유지
  - 등록 CTA 중심

### 16.4 Multi-Pet UX 최종 결정(스와이프 대신)

- 헤더 우측에 작은 프로필(썸네일) 리스트 + `(+ )` 추가 버튼을 배치
- 썸네일 탭 → `selectedPetId` 전환 → 메인 화면 데이터가 교체되는 구조
- `(+ )` 탭 → 반려동물 추가 플로우로 이동(예정)

### 16.5 다음 연결 목표

1. Supabase에서 pets fetch → `petStore.setPets()` 주입
2. 선택된 `selectedPetId` 기반으로 홈 데이터(추억/오늘사진/최근기록) 쿼리 연결
3. 가드 라우팅(게스트면 AuthLanding) 적용

---

---

## ✅ Auth 구현 현황 (React Native + Supabase)

NURI는 **게스트 우선 전략**을 유지하면서, 필요 시 **로그인/회원가입/닉네임 설정**으로 자연스럽게 진입할 수 있도록 Auth 플로우를 추가했습니다.

### 1) 라우팅 구조

- `Splash → Main` 기본 흐름 유지
- 게스트가 “로그인하고 시작하기”를 누르면 `AuthLanding`으로 이동
- 로그인/회원가입 성공 시 `Main`으로 reset 처리

라우트:

- `AuthLanding` : 로그인/회원가입 선택 + 게스트로 계속
- `SignIn` : 이메일/비밀번호 로그인
- `SignUp` : 이메일/비밀번호 회원가입
- `NicknameSetup` : nickname 없을 때 1회 설정

### 2) 닉네임 정책

- 로그인 상태 + nickname 존재 시: `"{nickname}님, 반가워요!"`
- nickname이 없으면: 기본 문구 `"반가워요!"`
- nickname은 `profiles` 테이블에 저장/조회

### 3) 전역 상태(Zustand)

- `authStore`
  - session 저장/복원(AsyncStorage)
  - `isLoggedIn` 값을 boolean으로 제공(화면에서 함수 호출 금지)
  - nickname은 profiles fetch 후 주입
- `petStore`
  - `pets[]`, `selectedPetId`
  - 멀티펫 선택 기반으로 홈 데이터 교체 (UI는 유지, 데이터만 스위칭)

---

### Multi-Pet UX 확정 (Header Switcher)

- 스와이프 방식은 제외
- 헤더 우측에 **작은 썸네일 리스트 + (+) 추가 버튼** 배치
- 썸네일 탭 시 `selectedPetId`만 변경 → **홈 레이아웃은 유지, 데이터만 교체**

## 13. 필수 설치 패키지 (현재 프로젝트 기준)

> ✅ “지금 단계에서 반드시 필요한 것들”만 설치하고, 나머지는 필요한 시점에 추가합니다.

### Core (이미 설치됨)

- `@supabase/supabase-js`
- `@react-native-async-storage/async-storage`
- `react-native-url-polyfill`
- `react-native-get-random-values`
- `buffer`
- `zustand`

### Navigation (이미 설치됨)

- `@react-navigation/native`
- `@react-navigation/native-stack`
- `react-native-screens`
- `react-native-safe-area-context`
- `react-native-gesture-handler`

### Media (이미 설치됨)

- `react-native-image-picker`

---

## 14. 다음 단계 (정확한 실행 순서)

> 현재는 **“게스트/미등록 UI 하드코딩” 완료 단계**입니다.  
> 다음은 “실데이터 연결”을 위한 순서로 진행합니다.

1. **DevTestScreen은 유지하되, Dev 라우트로만 보관**

- RootNavigator에서 dev-only로만 등록 (필요할 때만 진입)

2. **Auth 흐름 고정 (가드 라우팅)**

- guest 상태에서 기록/등록/상세 접근 시 → AuthLanding 유도
- 로그인 성공 시 → session 저장 + nickname 반영

3. **Pet CRUD 연결 (실데이터 첫 연결)**

- PetCreateScreen → Storage 업로드(pet-avatars) → pets insert
- pets fetch → store.setPets(pets)
- selectedPetId 기반으로 Main 화면 데이터 교체

4. **멀티펫 UX (미니 프로필 + (＋))**

- 헤더 미니 프로필 영역을 “전환 UI”로 고정
- (＋) 클릭 → 추가 등록
- 프로필 탭 클릭 → selectedPetId 변경 → 메인 UI 데이터 교체

5. **Record CRUD 연결**

- RecordCreateScreen → 앨범/카메라 → Storage 업로드(record-images) → records insert
- 홈 “최근 기록” 위젯 연결(최신 3~5개)

6. **Daily Recall / AI 메시지 확장**

- “오늘의 아이 사진(랜덤)” 서버 고정 방식으로 확장
- “오늘의 메시지(아침/점심/오후)” 시간대별 고정 메시지 + AI 생성으로 확장

---

## ✅ 홈 레이아웃 분기 정책 (Guest / Logged-in)

NURI의 홈(Main)은 로그인 상태에 따라 **완전히 다른 레이아웃**을 사용합니다.

- `guest` 상태: GuestHome(로그인 전용 홈 레이아웃)
- `logged_in` 상태: LoggedInHome(실제 홈 레이아웃)

MainScreen은 분기만 담당하며, 각 레이아웃은 컴포넌트/스타일 파일로 분리하여
UI 수정(디자인 싱크)을 빠르게 반복할 수 있도록 구성했습니다.

## 15. Engineering Focus

- 성능 최적화
- 이미지 압축 전략
- 세션 안정성
- 서버 고정 로직 설계
- 확장 가능한 도메인 모델

---

_Private Project — Founder Build_

> NURI는 개인적인 상실 경험에서 시작되었습니다.  
> 목표는 **감정을 구조화하는 기술 플랫폼**을 만드는 것입니다.
