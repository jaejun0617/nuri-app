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

- **사용자 맞춤형 인사말:** 로그인 시 Supabase Auth의 `user_metadata` 혹은 별도의 `profiles` 테이블과 연동하여 `"{닉네임}님, 반가워요!"`라는 개인화된 문구를 노출합니다.
- **프로필 이미지 동기화:** 반려동물 등록 시 업로드한 이미지는 Supabase Storage에 저장되며, 메인 카드와 우측 상단 미니 프로필 등 앱 전역에서 실시간으로 동기화됩니다. (Global State 관리 활용)

#### ② 반려동물 프로필 & 스마트 데이터

- **반려견 정보 관리:** 이름, 생년월일, 몸무게, 좋아하는 것(#태그), 싫어하는 것, 취미 등을 상세히 기록합니다.
- **D-Day 자동 계산:** 등록된 기념일(생일/입양일/이별일)과 현재 날짜를 비교하여 **"누리와 함께한 지 500일째"**와 같은 시간 데이터를 자동으로 제공합니다.
- **건강 관리 모듈:** 마지막 접종일, 사료 교체 시기 등 건강 관련 기록 기능을 제공하여 실질적인 양육 편의성을 높입니다.

#### ③ 아카이빙 시스템 (기록 및 타임라인)

- **멀티미디어 기록하기:** 카메라 및 앨범 접근 권한을 통해 사진을 업로드하고, 제목과 상세 내용을 기록합니다. '최근 기록' 피드에서 썸네일과 요약 글을 확인할 수 있습니다.
- **추억보기 (타임라인):** 모든 기록을 역순(최신순)으로 나열합니다. 단순 리스트 외에도 그리드 뷰나 **캘린더 뷰**를 도입하여 특정 날짜의 기억을 손쉽게 탐색할 수 있습니다.
- **상세 보기 확장:** 단순 모달 창을 넘어, 개별 상세 페이지를 통해 '공유하기' 및 '수정/삭제' 기능을 제공하여 콘텐츠 관리의 편의성을 강화합니다.

#### ④ 정서적 교감 서비스 (AI Guestbook)

- **마음 남기기:** 아이에게 전하는 편지나 그리움을 담은 글을 방명록 형태로 작성합니다.
- **AI 코멘트 (유료 모델):** 작성된 글과 반려동물의 특성(성격, 별명 등)을 LLM(ChatGPT 등) API에 전달하여, **반려동물이 하늘나라에서 대답해 주는 듯한 따뜻한 코멘트**를 자동 생성합니다. 이는 펫로스 증후군 완화와 정서적 위로에 핵심적인 가치를 제공합니다.

#### 5번

**반려동물이 여러마리일때 . 헤더에 작은 프로필 옆에 회색동그라밍 안에 + 있고 이거를 클릭하면 다른 반려동물을 추가 할 수 있음 그리고 클릭하면 그 동물로 넘어가고 , 처음 등록한 작은 아이 프로필을 누르면 다시 이동**

---

### 1.3 UI/UX 및 네비게이션 설계

- **하단 네비게이션 구조:** `[홈]` - `[추억보기(타임라인)]` - `[방명록(글 남기기)]` - `[더보기]`
- **접근성 최적화:** '기록하기' 버튼은 화면 하단까지 내려야 하는 불편함을 없애기 위해, 하단 네비게이션 바 중앙에 크게 배치하거나 화면 우측 하단의 **플로팅 액션 버튼(FAB)**으로 고정 배치합니다.
- **유연한 정보 수정:** '더보기' 메뉴 내 슬라이드 메뉴를 통해 고객센터 연결 및 언제든지 반려동물의 정보를 수정(몸무게 업데이트 등)할 수 있는 관리 기능을 제공합니다.

---

### 1.4 서비스 구조 요약

| 구분              | 주요 기능 및 특징                  | 구현 포인트                        |
| :---------------- | :--------------------------------- | :--------------------------------- |
| **로그인/프로필** | 닉네임 인사말, 프로필 전역 동기화  | Supabase Auth, Global State        |
| **데이터 관리**   | 상세 프로필, D-Day 계산, 건강 기록 | Date logic, CRUD                   |
| **포스팅/피드**   | 사진+제목+본문, 상세 페이지 연동   | Image Storage, Dynamic Routing     |
| **AI 교감**       | 유료 멤버십 기반 AI 자동 답장      | OpenAI API, IAP 결제               |
| **UX 최적화**     | 중앙 탭 버튼/FAB, 캘린더 뷰        | 커스텀 네비게이션, 라이브러리 활용 |

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

| 영역        | 기술                                                                              |
| ----------- | --------------------------------------------------------------------------------- |
| **Mobile**  | React Native CLI · TypeScript · React Navigation · TanStack Query · Zustand · IAP |
| **Backend** | Supabase (Auth · PostgreSQL · Storage · RLS) · Edge Functions                     |
| **Infra**   | Gradle 8.13 · AGP 8.6 · Kotlin 2.1 · AsyncStorage v3                              |

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

```sql
profiles        id (auth.uid) · owner_name · created_at

pets            id · user_id · pet_name · birth_date
                memorial_date · personality · theme_id · accent_color

memories        id · pet_id · content · image_url
                emotion_tag · occurred_at

daily_recall    id · pet_id · date · memory_id · mode

emotions        id · pet_id · score · primary_emotion · analyzed_at

subscriptions   id · user_id · tier · expires_at
```

---

## 9. RLS Policy Strategy

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
- AsyncStorage 기반 세션 유지 구조 준비

### 테스트 결과

```
LOGIN DATA: { user, session }
LOGIN ERROR: null
```

→ 로그인 성공 검증 완료

---

## 11. Android 빌드 안정화 기록

### 해결된 이슈

- Gradle 8.13 요구사항 충돌 해결
- AGP 8.6 버전 정합성 맞춤
- AsyncStorage v3 로컬 maven repo 설정
- settings.gradle repository 충돌 해결
- RepositoriesMode 정책 조정
- android bugreport zip gitignore 처리

### 최종 상태

- BUILD SUCCESSFUL
- Emulator 설치 정상
- Supabase Auth 연결 정상

---

## 12. 앱 구현 현황 (React Native)

### 1) 기본 실행 구조

| 파일          | 역할                |
| ------------- | ------------------- |
| index.js      | AppRegistry 등록    |
| App.tsx       | NavigationContainer |
| RootNavigator | Splash → Main       |

---

### 2) Splash (HomeScreen)

- 이중 배경 레이어
- 페이드 인 애니메이션
- 브랜드 감성 강조
- 자동 이동 주석 처리

---

### 3) Main 화면 방향

- 프로필 중심 홈 구조
- Guest / Logged-in 분기 구조 설계 완료
- 다중 반려동물 스와이프 설계 확정

---

### 4) Multi-Pet 구조

```
pets: Pet[]
selectedPetId: string
```

- 레이아웃 고정
- 데이터만 교체
- 페이지 인디케이터 예정

---

### 5) 인증 전략

| 단계 | 내용          |
| ---- | ------------- |
| 1차  | 게스트 체험   |
| 2차  | Google 로그인 |
| 3차  | Kakao/Naver   |

---

## 13. 현재 인프라 안정화 상태

| 항목          | 상태         |
| ------------- | ------------ |
| Android 빌드  | ✅ 안정      |
| Gradle 충돌   | ✅ 해결      |
| AsyncStorage  | ✅ 정상      |
| Supabase Auth | ✅ 성공      |
| 세션 발급     | ✅ 검증 완료 |
| RLS 설계      | ✅ 초안 완료 |

---

## 14. 다음 단계

- Zustand Auth Store 연결
- 로그인 기반 가드 라우팅
- pets CRUD 실제 DB 연결
- Storage 업로드 검증
- Daily Recall 서버 고정 로직 구현

---

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
