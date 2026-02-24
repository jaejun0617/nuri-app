# 🌈 NURI

### _Emotion-Driven Digital Memory Archive Platform_

> **기억은 사라지지 않습니다. 우리는 아이를 잊지 않습니다.**

---

## 0. Why NURI?

NURI는 창업자의 개인적인 상실 경험에서 시작되었습니다.

사랑하는 반려견을 떠나보낸 이후, 가족이 깊은 슬픔 속에서 감정을 정리하지 못하는 모습을 보며 **감정을 구조화할 수 있는 디지털 공간의 필요성**을 느꼈습니다.

NURI는 단순한 추모 앱이 아닙니다.
**감정 데이터를 기반으로 기억을 구조화하는 플랫폼입니다.**

---

## 1. 서비스 개요

NURI는 반려동물을 떠나보낸 보호자, 또는 아이의 추억을 체계적으로 기록하고 싶은 보호자를 위한 **디지털 메모리얼 & 감정 기록 플랫폼**입니다.

| 핵심 개념            | 설명                                  |
| -------------------- | ------------------------------------- |
| 🧩 기억 구조화       | 감정 태그 기반의 체계적 기억 아카이빙 |
| 📊 감정 데이터 축적  | AI 기반 감정 분석 및 히스토리 누적    |
| 🔄 회상 알고리즘     | 서버 고정 방식의 일관된 Daily Recall  |
| 🏗 확장 가능한 플랫폼 | 커뮤니티·구독·AI로 단계적 확장        |

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

- **보호자 중심 UX** — 사용자의 감정 흐름에 맞춘 인터페이스
- **감정 기반 AI 시스템** — 입력 내용에서 감정을 분석해 응답 톤 조절
- **서버 고정 회상 알고리즘** — UX 일관성을 위한 서버 주도 Daily Recall
- **자동 기일 대응** — 기일 전후 자동 알림 및 특별 화면 전환
- **데이터 중심 아카이빙 구조** — 확장 가능한 감정·기억 DB 설계

---

## 4. Tech Stack

| 영역        | 기술                                                                              |
| ----------- | --------------------------------------------------------------------------------- |
| **Mobile**  | React Native CLI · TypeScript · React Navigation · TanStack Query · Zustand · IAP |
| **Backend** | Supabase (Auth · PostgreSQL · Storage · RLS) · Edge Functions (AI / Billing)      |

---

## 5. 아키텍처 원칙

- **기능 단위 분리** (Feature-based structure)
- **서버 상태 / UI 상태 분리**
- **도메인 확장 대비 구조 설계**
- **1인 개발 유지보수 가능 아키텍처**
- **IAP 기반 수익화 확장 고려**

---

## 6. MVP Scope

```
Phase 1  ─────────────────────────────────────────────
  Auth · Pet Profile · Memory CRUD · Daily Recall
  Timeline · D-Day

Phase 2  ─────────────────────────────────────────────
  Emotion Tracking · AI Chat
  Push Notification · IAP Subscription

Phase 3  ─────────────────────────────────────────────
  Community Feed · Comments · Likes
  Notification System
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

감정 태그 기반 데이터 축적 → 리포트 및 추천 알고리즘 확장 기반

---

### 7.2 Daily Recall Engine

```
daily_recall
├── pet_id
├── date
├── memory_id
└── mode  (anniversary | random | emotion_based)
```

**원칙:** 서버에서 하루 1회 결정 → 클라이언트는 조회만 수행 → 데이터 고정으로 UX 일관성 유지

---

### 7.3 Emotion Analysis Pipeline

```
User Input
  → AI Emotion Scoring
  → emotions 테이블 저장
  → 응답 톤 조절
  → 감정 히스토리 누적
```

**확장:** 감정 그래프 · 연간 리포트 PDF · 감정 기반 추억 추천

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

**Flow:** IAP 요청 → 서버 영수증 검증 → DB 상태 업데이트 → 기능 Unlock

---

## 8. Database Schema (Simplified)

```sql
users         id · owner_name · created_at

pets          id · user_id · pet_name · birth_date
              memorial_date · personality · theme_id · accent_color

memories      id · pet_id · content · image_url
              emotion_tag · occurred_at

emotions      id · pet_id · score · primary_emotion · analyzed_at
(future)

daily_recall  id · pet_id · date · memory_id · mode

subscriptions id · user_id · tier · expires_at
```

---

## 9. Community Expansion Architecture

```sql
posts          id · user_id · content · image_url
               visibility (public | private) · created_at

comments       id · post_id · user_id · content · created_at

likes          id · post_id · user_id

notifications  id · user_id · type · reference_id · created_at

reports        id · target_id · reason · status
```

**설계 방향:** RLS 기반 접근 제어 · Public/Private 분리 · Moderation 시스템 · 확장 가능한 피드 구조

---

## 10. Scalability Strategy

```
1단계  Memory Archive          기억·감정 기록의 안정화
2단계  Emotion Tracking        AI 기반 감정 분석 확장
3단계  Community Platform      보호자 간 공감·연결
4단계  Emotion Data Driven     감정 데이터 기반 케어 플랫폼
       Care Platform
```

---

## 11. 앱 구현 현황 (React Native)

> **NURI App** — 반려동물과의 시간을 "기록"으로 남기는 모바일 앱 (구현 단계)

### 🎯 서비스 방향

NURI는 단순 기록 앱이 아니라 **"아이와의 시간을 구조적으로 남기는 감정 기반 기록 플랫폼"**을 목표로 한다.

- 게스트 체험 우선 → 이후 소셜 로그인 확장 (1차: Google → 2차: Kakao/Naver)
- 프로필 중심 홈 구조
- 감정/기억/시간 중심 UX 설계

---

### 🏗 현재 구현 상태

#### 1) 기본 실행/부팅 구조

| 파일            | 역할                                             |
| --------------- | ------------------------------------------------ |
| `index.js`      | `AppRegistry.registerComponent()`로 앱 부팅      |
| `App.tsx`       | `NavigationContainer`로 네비게이션 컨텍스트 제공 |
| `RootNavigator` | Native Stack 기반 라우팅 (Splash → Main)         |

---

#### 2) Splash (HomeScreen)

**역할:** 앱 최초 진입 브랜딩 화면 — 감정 톤 전달 및 브랜드 인상 형성

**구현 내용:**

- 배경 이중 레이어 구조
  - `home__blur.png` → cover (화면 꽉 채움)
  - `home__bg.png` → contain (원본 전체 노출, 절대 잘리지 않음)
- 카드 페이드 인 애니메이션
- 로고/타이틀 등장 애니메이션 (opacity + translateY + scale)
- 밝은 배경 대비를 위한 텍스트 섀도우 적용
- 자동 이동 기능 현재 주석 처리 (저장 시 자동 전환 불편 방지 → 버튼 이동만 허용)

---

#### 3) Main 화면 UX 방향 — "프로필 중심 홈"

**핵심 컨셉:** 앱의 주인공은 사용자 → **아이(반려동물)**. 프로필은 단순 정보가 아니라 "기록의 출발점"

**Guest 상태 (비로그인 / 미등록)**

- 상단: "반가워요!" + 로그인 CTA
- 본문: 큰 원형 placeholder + 안내 문구
- CTA: `+ 반려동물 등록하기`
- 주요 기능 버튼 노출 → 클릭 시 로그인 유도 (가드)

**Logged-in 상태 (로그인 / 등록 완료)**

- 상단: 인사 문구 + 작은 원형 프로필
- 메인: 큰 원형 프로필 이미지
- 정보: 이름 + 생년월일 + 몸무게 + 성격/취미
- 태그: `#산책러버` `#간식최애` ... 형태로 확장 가능
- 퀵 액션: 기록하기 / 추억보기 / 글 남기기
- 최근 기록: 카드형 리스트 (썸네일 + 요약)

---

#### 4) Multi-pet 지원 — 스와이프/슬라이드 전환

NURI는 여러 반려동물 등록을 지원하며, 메인 프로필 영역은 **스와이프(슬라이드)** 방식으로 전환한다.

| 항목            | 내용                                       |
| --------------- | ------------------------------------------ |
| **전환 방식**   | 좌/우 스와이프로 `selectedPet` 변경        |
| **전환 대상**   | 원형 프로필 + 이름/정보 + 태그 + 최근 기록 |
| **전환 피드백** | 페이지 인디케이터(점) 또는 썸네일 스트립   |
| **상태 모델**   | `pets: Pet[]` + `selectedPetId: string`    |

**UX 원칙:** 레이아웃은 유지하고 데이터만 교체 → 사용자가 "내가 보고 있는 아이"를 즉시 인지  
아이가 0마리면 Guest/미등록 UI로 자연스럽게 fallback

---

#### 5) 공통 UI — AppText (Typography)

- preset 기반 타이포 시스템
- 화면별 스타일 분산 방지 → 공통 텍스트 컴포넌트로 통일
- 필요 시 `style` prop으로 최소한의 오버라이드만 허용

---

### 🔐 인증(로그인) 전략

**결정된 방향: 게스트 체험 우선 → 소셜 로그인 단계적 확장**

| 단계    | 내용                                             |
| ------- | ------------------------------------------------ |
| **1차** | 게스트 경험 — 로그인 없이 UI/기능 흐름 체험 가능 |
| **2차** | Google 로그인 1개 (구현 리스크 낮음)             |
| **3차** | Kakao / Naver 확장                               |

**로그인 UX 흐름:**

1. 프로필/등록/저장 기능 클릭
2. `AuthLanding` (로그인 안내)으로 이동
3. 로그인 성공 → Main에서 Logged-in UI로 자연스럽게 전환
4. 세션/토큰 저장 → 앱 재실행 시 자동 로그인 복원 (`AsyncStorage`)

---

### 🧱 폴더 구조

```
src/
├── app/
│   └── ui/
│       ├── AppText.tsx
│       └── AppText.styles.ts
├── navigation/
│   └── RootNavigator.tsx
├── screens/
│   ├── Home/
│   │   ├── HomeScreen.tsx
│   │   └── HomeScreen.styles.ts
│   └── Main/
│       ├── MainScreen.tsx
│       └── MainScreen.styles.ts
├── components/
│   ├── profile/
│   └── records/
├── services/
├── store/
└── assets/
    ├── logo/
    └── home/
```

---

### ✅ 다음 구현 단계 (To-do)

- [ ] `MainScreen` UI 하드코딩 버전 구현
- [ ] Guest / Logged-in 화면을 한 화면에서 분기 처리
- [ ] Multi-pet 스와이프 기반 선택 구조 추가
- [ ] `pets[]` + `selectedPetId` 상태 모델 확정
- [ ] 프로필 영역 스와이프 가능 UI 구성 (인디케이터 포함)
- [ ] "프로필 클릭 → 로그인 유도" 가드 라우팅 추가
- [ ] 사진 변경 UX 설계 (권한 요청 → 기기 앨범 → 업로드/저장)
- [ ] 인증 1차(게스트) 안정화 후 Google 로그인 추가
- [ ] 세션 저장/복원 (자동 로그인) 구현

---

### 📌 현재 단계 요약

| 항목                                   | 상태         |
| -------------------------------------- | ------------ |
| Splash (브랜딩/애니메이션/배경 레이어) | ✅ 안정화    |
| Main 화면 컨셉 (프로필 중심)           | ✅ 확정      |
| Multi-pet 스와이프 전환 방식           | ✅ 확정      |
| 인증 전략 (게스트 우선 → Google)       | ✅ 확정      |
| Main UI 하드코딩 구현                  | 🔜 다음 단계 |

---

## 12. Engineering Focus

- 성능 최적화
- 이미지 압축 및 캐싱 전략
- 서버 고정 로직 설계
- 확장 가능한 도메인 구조
- 1인 개발 유지보수성

---

_Private Project — Founder Build_

> NURI는 개인적인 상실 경험에서 시작되었습니다.
> 목표는 **감정을 구조화하는 기술 플랫폼**을 만드는 것입니다.
