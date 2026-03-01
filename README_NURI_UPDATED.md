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
| **🏗 확장성**            | 커뮤니티, 유료 구독 모델(AI), 알림/푸시 확장 구조        |

---

## 1.2 상세 기능 기획

### ① 개인화된 사용자 경험 (Supabase 연동)

- **사용자 맞춤형 인사말:** 로그인 시 Supabase Auth + `profiles.nickname` 연동으로  
  `"{닉네임}님, 반가워요!"` 개인화 문구를 노출합니다.  
  (nickname이 없으면 기본 문구 `"반가워요!"`만 노출)
- **프로필 이미지 동기화:** 반려동물 등록 시 업로드한 이미지는 Supabase Storage에 저장되며,  
  메인 카드/헤더 미니 프로필 등 앱 전역에서 실시간으로 동기화됩니다.  
  (`petStore` 주입 + fetch 후 UI 전체 반영)

### ② 반려동물 프로필 & 스마트 데이터

- **반려동물 정보 관리:** 이름, 생년월일, 몸무게, 좋아하는 것(#태그), (옵션) 싫어하는 것, 취미 등을 기록합니다.
- **D-Day 자동 계산:** 등록된 날짜(입양일 등)와 현재 날짜를 비교하여  
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

```txt
Phase 1
  Auth · Pet Profile · Memory(Record) CRUD · Daily Recall · Timeline

Phase 2
  Emotion Tracking · AI Chat · Push · IAP

Phase 3
  Community Feed · Comments · Likes · Notifications
```

---

# 7. Core Features Architecture

## 7.1 Memory System (기록)

> 테이블명은 컨셉에 맞게 `memories` 로 통일합니다. (records → memories)

```txt
memories
├── pet_id
├── title
├── content
├── image_url (Storage path)
├── emotion (emotion_tag)
└── occurred_at
```

## 7.2 Daily Recall Engine

```txt
daily_recall
├── pet_id
├── date
├── memory_id
└── mode (anniversary | random | emotion_based)
```

## 7.3 Emotion Analysis Pipeline

```txt
User Input
  → AI Emotion Scoring
  → emotions 저장
  → 응답 톤 조절
  → 히스토리 누적
```

## 7.4 Subscription Architecture

```txt
subscriptions
├── user_id
├── tier
├── started_at
├── expires_at
└── store_receipt
```

---

# 8. Supabase Database / Storage (Final Draft)

> ✅ **DB 스키마 + RLS + Storage 정책까지 “뼈대” 확정 완료**  
> 앞으로 기능을 추가해도 DB를 갈아엎지 않도록 기반을 먼저 고정했습니다.

## 8.1 DB 핵심 테이블 (요약)

```sql
profiles        user_id(PK=auth.users.id) · email · nickname · avatar_url · created_at

pets            id · user_id · name · birth_date · adoption_date · weight_kg
                profile_image_url(path) · likes/dislikes/hobbies/tags(text[])
                death_date(nullable) · created_at

memories         id · user_id · pet_id · image_url(path) · title · content
                emotion(emotion_tag) · tags(text[]) · occurred_at · created_at

letters         id · user_id · pet_id · content · is_ai_generated · created_at

daily_recall    id · user_id · pet_id · date · memory_id · mode

emotions        id · user_id · pet_id · memory_id(optional) · score · primary_emotion · analyzed_at

subscriptions   id · user_id · tier · expires_at · store_receipt · created_at
```

## 8.2 Storage 버킷 (최종)

- `pet-profiles` (private)
- `memory-images` (private)

**원칙**
- DB에는 **full URL 저장 금지**
- DB에는 **Storage path만 저장**
- UI 렌더링은 **signed URL**로 변환해서 사용

---

# 9. Security Model (RLS / Storage)

## 9.1 DB (RLS)

- 모든 테이블 RLS 활성화
- `auth.uid()` 기반 접근 통제
- 본인 데이터만 CRUD 가능

예시:

```sql
CREATE POLICY "pets_crud_own"
ON public.pets
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

## 9.2 Storage (private + owner)

- 버킷은 private 유지
- 업로드/수정/삭제는 `storage.objects.owner = auth.uid()` 기반
- 조회는 기본적으로 막고, 화면은 **signed URL** 사용

---

# 10. Android 빌드/권한 안정화 기록

## 해결된 이슈

- Gradle 8.13 요구사항 충돌 해결
- AGP 8.6 / Kotlin 2.1 버전 정합성 맞춤
- AsyncStorage v3 로컬 maven repo 설정
- settings.gradle / build.gradle repository 충돌 해결
- RepositoriesMode 정책 정리
- Emulator 설치/실행 정상 확인

## AndroidManifest 권한(사진 접근)

```xml
<uses-permission android:name="android.permission.INTERNET" />

<!-- Android 13+ -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />

<!-- Android 14+ (기기/픽커에 따라 필요) -->
<uses-permission android:name="android.permission.READ_MEDIA_VISUAL_USER_SELECTED" />

<!-- Android 12 이하 -->
<uses-permission
  android:name="android.permission.READ_EXTERNAL_STORAGE"
  android:maxSdkVersion="32" />

<uses-permission
  android:name="android.permission.WRITE_EXTERNAL_STORAGE"
  android:maxSdkVersion="32" />
```

---

# 11. 앱 실행 구조 (부팅 순서)

```txt
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

`index.js` 역할:
- Supabase RN polyfill을 가장 먼저 로드
- `global.Buffer` 주입 (`src/types/global.d.ts` 에서 보강)

---

# 12. 앱 구현 현황 (React Native)

## 12.1 전역 상태 (Zustand)

### Auth Store (`src/store/authStore.ts`)
- `guest / logged_in` 상태 관리
- 세션 AsyncStorage hydrate → getSession sync
- nickname은 optional (없으면 기본 인사만 출력)

### Pet Store (`src/store/petStore.ts`)
- `pets[] + selectedPetId` 전역 관리
- 멀티펫 전환(헤더 미니 프로필) 기반
- pets가 비면 selectedPetId는 null 유지

## 12.2 홈 레이아웃 분기 (Guest / Logged-in)

- `guest` 상태: **GuestHome**
- `logged_in` 상태: **LoggedInHome**

MainScreen은 분기만 담당하고, 각 레이아웃은 컴포넌트로 분리합니다.

---

# ✅ Chapter 1 — Pet CRUD (실데이터 연결)

> 목표: **펫 등록 → Storage 업로드 → 홈 실데이터 반영**까지 끊김 없이 이어지게 만들기

## Done
- pets row → App 타입 매핑(숫자/배열 방어 포함)
- Storage private 업로드 + signed URL 렌더링
- PetCreateScreen(이미지 선택/업로드/DB path 저장/리프레시)
- AppProviders 부팅 시 pets 자동 fetch + auth 이벤트 동기화
- Logged-in 홈: pets 0마리면 PetCreate 자동 유도 + (＋) 버튼 연결

---

# ✅ Chapter 2 — Storage 업로드 안정화 (Android)

> 문제: Android에서 `content://` URI 기반 업로드가 환경별로 실패하거나, base64 옵션이 누락되는 케이스가 발생  
> 해결: **BlobUtil 기반 업로드**로 고정하여 안정화

## 핵심 정리

- `react-native-image-picker`의 `includeBase64`는 **옵션**이며, 환경/설정에 따라 `asset.base64`가 없을 수 있습니다.
- Android에서는 `content://` 를 그대로 `fetch(uri).blob()`로 처리하면 실패하는 경우가 많습니다.
- 따라서 업로드 파이프라인은 **BlobUtil(react-native-blob-util) 기반**으로 일관되게 처리합니다.

## 결과

- 펫 등록 시 이미지 포함 업로드 성공
- 홈 헤더 썸네일 / 프로필 카드 이미지 렌더링 정상화
- Storage 버킷명 최종 정합성 확정: `pet-profiles` / `memory-images`

---

# 13. 다음 단계 (Next Chapter)

## ✅ Chapter 3 — Memory(기록) CRUD 연결

### 목표

- `memories` 테이블 기반으로 **기록 생성/목록/상세/삭제**까지 최소 루프 완성
- Storage 업로드는 `memory-images` 로 통일
- 홈 “최근 기록” 위젯을 실데이터로 교체
- Timeline(추억보기) 화면 연결

### 실행 순서(권장)

1. `MemoryCreateScreen` (이미지 선택 → 업로드 → DB insert)
2. `TimelineScreen` (selectedPetId 기준 목록)
3. `MemoryDetailScreen` (상세 + 삭제)
4. 홈 최근 기록 위젯(최신 N개)

---

# 14. Final Statement

NURI는 감정을 저장하는 서비스가 아니라, 감정을 구조화하는 시스템입니다.  
이제 다음 단계는 구조가 아니라, 실데이터 연결과 사용자 경험 완성입니다.

---

_Private Founder Build_
