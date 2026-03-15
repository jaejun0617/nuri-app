# 🌈 NURI : Emotion-Driven Digital Memory Archive Platform

> **기억은 사라지지 않습니다. 우리는 아이를 잊지 않습니다.**

NURI는 반려동물과의 시간을 사진 몇 장으로 흘려보내지 않기 위해 만든 앱입니다.  
단순히 기록을 저장하는 도구가 아니라, 보호자가 아이의 하루와 감정을 오래 붙잡아 둘 수 있도록 기억을 구조화하는 디지털 아카이브를 지향합니다.

지금의 NURI는 추모만을 위한 앱이 아닙니다.  
함께하는 오늘을 기록하는 앱이면서, 언젠가 다시 돌아보게 될 시간을 위해 감정과 기억을 정리하는 서비스입니다.

---

## 1. Why NURI

NURI는 반려동물과의 시간을 장기적으로 관리할 구조가 부족하다는 문제에서 시작되었습니다.

- 사진, 메모, 일정이 흩어져 기억의 맥락이 끊깁니다.
- 감정과 일상이 데이터로 쌓이지 않아 다시 돌아보기 어렵습니다.
- 기록이 늘어날수록 찾기 쉬운 구조와 운영 가능한 시스템이 더 중요해집니다.

### NURI의 핵심 가치

| 핵심 개념 | 설명 |
| --- | --- |
| 기억 구조화 | 사진, 텍스트, 태그, 날짜를 하나의 기록 단위로 묶습니다 |
| 감정 데이터 축적 | 감정/카테고리/활동 데이터를 쌓아 회상과 분석의 기반을 만듭니다 |
| 보호자 중심 UX | 빠르게 기록하고 자연스럽게 다시 꺼내볼 수 있는 흐름을 우선합니다 |
| 운영 가능한 구조 | 단발성 MVP가 아니라 멀티펫, 콘텐츠 운영, 검색, 위젯, 추후 AI/구독까지 확장 가능한 설계를 유지합니다 |

---

## 2. 현재 프로젝트 상태

NURI는 현재 **기록 중심 MVP를 넘어 운영 구조와 실기기 안정화까지 정리된 상태**입니다.

### 현재 기준 핵심 기능

- 인증 / 세션 복원 / 닉네임 설정
- 멀티펫 관리와 전역 선택 상태 유지
- 기록 생성 / 수정 / 삭제 / 다중 이미지 업로드
- 홈 요약 화면
- 타임라인 탐색 / 필터 / 월 이동 / 히트맵
- 기록 상세 / 편집 / 삭제
- 일정 생성 / 수정 / 조회
- 날씨 카드 / 날씨 상세 / 실내 활동 추천
- Android 홈 위젯
- 이미지 업로드 실패 복구 큐
- `memory_images` 기반 다중 이미지 구조
- 집사 꿀팁 가이드 추천 / 목록 / 상세 / 검색
- 집사 꿀팁 가이드 최근 검색어 / 인기 검색어 / 서버 검색 RPC 계약
- 관리자용 가이드 운영 목록 / 등록 / 수정 / 상태 변경
- Sentry / Maestro / 릴리즈 전 운영 점검 기반

### 진행 상태

- 기록/이미지 파이프라인 1차 안정화 완료
- `memory_images` 구조 전환 완료
- create/edit/delete 정합성 보강 완료
- 홈/상세/타임라인/날씨 체감 최적화 1차 완료
- 집사 꿀팁 가이드 챕터 1 완료
- 집사 꿀팁 가이드 챕터 2-1 완료
- 집사 꿀팁 가이드 챕터 2-2 1차 완료
- 가이드 검색 고도화 앱 구현 완료
- 현재는 **출시 전 운영 리스크 축소와 남은 확장 포인트 정리 단계**에 가깝습니다

---

## 3. 서비스 구조

### 3.1 인증 / 온보딩

- Supabase Auth 기반 로그인/세션 유지
- 앱 부팅 시 AsyncStorage hydrate 후 서버 세션 동기화
- `profiles.nickname`, `profiles.role` 기준 사용자 상태 복원
- 로그인 직후 / 앱 재실행 / 로그아웃 직후 상태 전환을 보수적으로 정리

### 3.2 멀티펫

- `pets[]`, `selectedPetId`를 전역 상태로 관리
- 홈에서 즉시 펫 전환 가능
- `species_group`, `species_detail_key`, `species_display_name` 기준으로 종 정보를 정식화
- stale cache보다 서버 truth를 우선하는 방향 유지

### 3.3 기록(Memories)

- 제목, 본문, 날짜, 감정, 태그, 카테고리, 이미지 다중 첨부 지원
- create/edit/delete 이후 즉시 반영 흐름 유지
- local URI 즉시 반영과 queue 복구 구조 유지

### 3.4 타임라인

- 홈 요약과 분리된 전체 탐색 화면
- 카테고리 / 월 / 히트맵 / 상세 진입 구조 유지
- `memory_images` 기반 대표 이미지 해석과 preload 최적화 반영
- 상세 / 수정 / 복귀 시 하단 탭 구조를 깨지 않도록 Timeline stack 유지

### 3.5 홈

- 오늘의 사진 / 오늘의 기록 / 주간 요약 / 일정 / 최근 활동 / 월간 다이어리
- `우리 아이를 위한 추천 팁`은 별도 가이드 서비스 레이어를 통해 노출
- 멀티펫 전환과 기록 갱신 시 섹션 단위로 렌더 범위를 줄이는 방향 유지

### 3.6 집사 꿀팁 가이드

- 홈 추천 2건, 목록, 상세를 별도 콘텐츠 도메인으로 분리
- Supabase `pet_care_guides` 우선, 로컬 seed fallback 유지
- `species/common/agePolicy` 기반 개인화
- 목록 검색은 서버 RPC 우선, 클라이언트 검색 폴백 유지
- 최근 검색어 / 인기 검색어 UX 추가
- `pet_care_guide_events`로 노출/클릭/상세 이벤트 적재
- `profiles.role` 기반 관리자 전용 운영 경로 제공

---

## 4. 핵심 구조와 운영 기준

### 4.1 `memory_images` 기반 이미지 구조

기록 이미지는 현재 `memory_images`를 중심으로 관리합니다.

- `memory_images`가 다중 이미지의 실질적인 source of truth입니다.
- `memories.image_url`, `memories.image_urls`는 fallback / 호환 목적의 mirror입니다.
- 읽기 경로는 `memory_images` 우선, legacy는 운영 안전망으로만 사용합니다.
- 쓰기 경로는 `memory_images`를 먼저 맞춘 뒤 legacy를 동기화합니다.

현재 구조는 다음을 전제로 합니다.

- 여러 장 이미지를 순서대로 보관할 수 있어야 한다
- 원본과 썸네일을 분리할 수 있어야 한다
- worker/backfill이 가능해야 한다
- queue/복구/운영 관찰까지 버틸 수 있어야 한다

### 4.2 집사 꿀팁 가이드 구조

가이드 도메인은 현재 아래 축으로 정리돼 있습니다.

- 공개 조회: 추천 / 목록 / 상세
- 운영 구조: 관리자 목록 / 등록 / 수정 / 상태 변경
- 데이터 구조: `pet_care_guides`, `pet_care_guide_events`
- 개인화 기준: `species_group`, `species_detail_key`, `agePolicy`
- 검색 구조: `search_document`, `search_keywords`, RPC 검색, 최근/인기 검색어

### 4.3 서버 truth 우선

- 인증, 프로필, 펫, 가이드 공개 데이터는 가능한 서버 응답을 truth로 봅니다.
- 캐시는 UX 완충 장치이지 source of truth가 아닙니다.
- fallback은 유지하되, 무엇이 진짜 기준 데이터인지 코드와 문서에서 명확히 맞춥니다.

---

## 5. 기술 스택

| 영역 | 기술 |
| --- | --- |
| Mobile | React Native CLI, TypeScript |
| Navigation | React Navigation |
| State | Zustand, TanStack Query |
| Backend | Supabase Auth, PostgreSQL, Storage, RLS |
| Cache / Persistence | AsyncStorage |
| Styling | styled-components |
| Monitoring | Sentry, Firebase Crashlytics 연동 진행 |
| QA | Maestro E2E smoke, 수동 QA 체크리스트 |

### 프로젝트 디렉터리 요약

```text
src
├── app
├── components
├── hooks
├── navigation
├── screens
│   ├── Auth
│   ├── Guides
│   ├── Home
│   ├── Main
│   ├── More
│   ├── Pets
│   ├── Records
│   ├── Schedules
│   └── Weather
├── services
│   ├── app
│   ├── guides
│   ├── home
│   ├── local
│   ├── memories
│   ├── pets
│   ├── schedules
│   ├── supabase
│   └── weather
└── store
```

---

## 6. 최근 핵심 정리 사항

### 6.1 타임라인 / 이미지

- `memory_images` read 우선 구조 정리
- `timeline-thumb` / `original` variant 분리
- signed URL 생성은 fetch 경로가 아니라 idle/preload 경로로 이동
- 홈/타임라인/상세 preload 구조를 보수적으로 정리
- fallback 이유를 운영 이벤트로 구분해 추적

### 6.2 집사 꿀팁 가이드

- 1단계: 홈/목록/상세 도입 완료
- 2단계: Supabase 이관, species 정식화, 이벤트 구조 완료
- 3단계: 앱 관리자 브릿지 1차 흐름 완료
- 4단계: 최근 검색어 / 인기 검색어 / 서버 RPC 계약 / 개발 테스트용 공개 seed fallback 완료
- 현재 위치: 4단계 완료
- 남은 단계: 5단계 운영 완성
- 최종 운영 기준: 웹 관리자 페이지(CMS)
- 웹 CMS 챕터 1 시작: `nuri-web` 별도 Next.js 프로젝트 생성, 로그인/가이드 목록/가이드 상세 읽기 구조 개방
- 웹 CMS 챕터 2 시작: 등록 / 수정 / status / is_active / 운영 메타 저장 구조 추가
- 웹 CMS 챕터 3 시작: 썸네일 / 커버 이미지 업로드, 미리보기, 실무형 CMS UI 정리
- 웹 CMS 대시보드 정리: 관리자 제외 회원 수 / 펫 등록 수 / 삭제 / 반응형 CMS UI 반영
- 현재 앱 관리자 화면: 중간 운영 수단
- 앱 역할: 사용자 소비 중심
- SQL 역할: seed / QA / 보정용

### 6.3 부트 / 세션 / 멀티펫

- 세션 전환 시 사용자 스코프 캐시 정리 강화
- 잘못된 stale state 노출 가능성 축소
- hydrate 데이터 shape 가정 보수화

---

## 7. 현재 기준 문서

### 집사 꿀팁 가이드

- 통합 문서: `docs/집사-꿀팁-가이드/집사-꿀팁-가이드-통합-완성본.md`
- SQL 최종본: `docs/sql/도메인/집사-꿀팁-가이드/집사-꿀팁-가이드-운영-스키마-최종.sql`
- 개발/테스트 공개 seed: `docs/sql/도메인/집사-꿀팁-가이드/개발-테스트용-공개-가이드-seed.sql`

### 타임라인 / 메모리 이미지

- 통합 문서: `docs/타임라인-메모리-이미지-시스템/타임라인-메모리-이미지-통합-완성본.md`
- SQL 최종본: `docs/sql/도메인/타임라인-메모리-이미지-시스템/타임라인-메모리-이미지-운영-스키마-최종.sql`

---

## 8. 현재 남은 작업 방향

### 출시 전 우선순위

1. 최종 QA와 운영 회귀 점검
2. Crashlytics 실수집 확인
3. `memory_images` fallback 장기 분포 관찰
4. 가이드 검색 RPC migration 운영 반영
5. 가이드 운영 DB 공개 row / RLS / published 조건 점검
6. 출시 빌드 기준 실기기 검증

### 이후 확장 후보

- 가이드 운영 리포트
- 웹 CMS
- 웹 CMS 이미지 업로드
- 앱 관리자 브릿지 축소
- Daily Recall 서버 고정 로직
- AI 메시지 / 구독 / 결제
- 커뮤니티 / 알림 / 회상 자동화

---

## 9. 개발 원칙

NURI는 다음 원칙을 지키며 개발합니다.

- 보호자 중심 UX를 최우선으로 봅니다.
- 서버와 스토리지 정합성을 가볍게 타협하지 않습니다.
- 실기기 체감 성능이 개선되지 않으면 최적화가 끝난 것이 아닙니다.
- 조용히 실패하는 흐름을 허용하지 않습니다.
- 임시방편보다 운영 가능한 구조를 우선합니다.

---

## 10. 한 줄로 정리하면

NURI는 반려동물과의 시간을 사진첩이 아닌 **구조화된 기억**으로 남기기 위한 앱입니다.  
지금의 NURI는 그 기억이 사라지지 않도록, 기록과 이미지와 콘텐츠 운영 구조를 실제 서비스 기준으로 다듬어 가는 단계에 있습니다.
