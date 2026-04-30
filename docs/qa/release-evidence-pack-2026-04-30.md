# NURI V1.0 Release Evidence Pack

작성일: 2026-04-30
문서 상태: Release Evidence Pack hard-close
범위: 현재까지 확보된 RC smoke, linked remote, 도메인 closeout evidence를 하나의 출시 판단 문서로 고정한다.

## 1. RC 기준 상태

### 기준 날짜

- 기준 날짜: 2026-04-30 KST
- 기준 명령: `git status --short`, `git diff --stat`, `adb devices -l`, `adb shell dumpsys package com.nuri.app | grep version`, `supabase migration list --linked`, `supabase db lint --linked --schema public --fail-on error`, `supabase functions list --project-ref grmekesqoydylqmyvfke`

### 앱 package

- package: `com.nuri.app`
- installed app: Android device에 설치된 앱 기준

### versionName/versionCode

- `versionName=1.0`
- `versionCode=1`
- `minSdk=24`
- `targetSdk=36`

### Android device

- device serial: `R5CY613NMSY`
- model: `SM_S937N`
- connection: `device usb:0-1 product:psqksx model:SM_S937N device:psq`

### dirty working tree 여부

- dirty working tree: 예
- 이 release evidence pack은 clean commit artifact가 아니라, 현재 working tree와 설치된 `com.nuri.app` v1.0 기준 RC smoke 결과를 고정한다.
- 이 상태를 숨기지 않고 release blocker 분류에 `clean RC artifact 기준 evidence 고정 필요`로 남긴다.

### dirty working tree manifest 요약

`git status --short` 기준:

- 문서 변경 파일
  - `docs/project-memory/다음-작업-우선순위.md`
  - `docs/project-memory/최근-작업-로그.md`
  - `docs/project-memory/핵심-결정사항.md`
  - `docs/project-memory/현재-프로젝트-상태.md`
  - `docs/qa/release-checklist.md`
- 앱 코드 변경 파일
  - `src/components/maps/NativeLiteMapPreview.tsx`
  - `src/components/weather/WeatherGuideHomeCard.tsx`
  - `src/hooks/useWeatherGuide.ts`
  - `src/screens/AnimalHospital/AnimalHospitalDetailScreen.tsx`
  - `src/screens/Weather/WeatherInsightScreen.tsx`
  - `src/services/animalHospital/repository.ts`
  - `src/services/animalHospital/service.ts`
  - `src/services/locationDiscovery/service.ts`
  - `src/services/supabase/animalHospitals.ts`
  - `src/services/weather/api.ts`
  - `src/services/weather/cache.ts`
  - `src/services/weather/guide.ts`
  - `src/services/weather/mapper.ts`
  - `src/services/weather/policy.ts`
  - `src/store/weatherStore.ts`
- migration 변경 파일
  - tracked 수정 없음
  - untracked: `supabase/migrations/20260428120000_animal_hospital_public_search_rpc_v1.sql`
  - untracked: `supabase/migrations/20260428123000_fix_existing_rpc_ambiguous_columns.sql`
  - untracked: `supabase/migrations/20260429130000_weather_cache_proxy.sql`
- Edge Function 변경 파일
  - tracked 수정 없음
  - untracked: `supabase/functions/_shared/weather-cache-core.js`
  - untracked: `supabase/functions/weather-cache/index.js`
  - untracked: `supabase/functions/weather-cache/index.ts`
- test 변경 파일
  - `__tests__/animalHospitalProjection.test.ts`
  - `__tests__/animalHospitalService.test.ts`
  - `__tests__/useWeatherGuide.test.tsx`
  - untracked: `__tests__/animalHospitalSupabaseRepository.test.ts`
  - untracked: `__tests__/locationDiscoveryFanout.test.ts`
  - untracked: `__tests__/weatherCacheCore.test.js`
  - untracked: `__tests__/weatherCacheService.test.ts`
- 기타 변경
  - `supabase/.temp/cli-latest`
  - untracked: `.tmp/`
  - untracked: `docs/domains/weather-api-cost-defense.md`
  - untracked: `docs/qa/admin-qa-backlog.md`
  - untracked: `docs/qa/animal-hospital-v1-evidence-pack-2026-04-28.md`
  - untracked: `src/services/weather/coordBucket.ts`

`git diff --stat` 기준:

- tracked 24 files changed
- 1443 insertions
- 368 deletions

## 2. Android RC Smoke Evidence

아래 항목은 2026-04-30 Android RC smoke 결과로 통과 처리한다.

### 홈

- 통과
- 확인: 로그인 세션 상태에서 홈 렌더링, `test님, 반가워요`, `오늘의 메시지` 노출

### 타임라인

- 통과
- 확인: `타임라인`, `기록` 화면 진입

### 건강관리

- 통과
- 확인: `건강관리`, `체중`, `건강 기록` 화면 진입

### 산책

- 통과
- 확인: 산책 리스트와 장소 카드 렌더링

### 동물병원

- 통과
- 확인: `우리동네 동물병원`, 병원 리스트, 전화 CTA 텍스트 렌더링

### 날씨

- 통과
- 확인: 홈 날씨 카드와 날씨 상세 진입
- 확인: 홈 카드 `날씨 데이터: Open-Meteo`
- 확인: 상세 `오늘의 날씨`, `일산3동`, `미세먼지`, `온도`
- logcat 확인: `weather-cache completed`, `source=provider` 이후 `source=fresh_cache`
- logcat 확인: Open-Meteo direct URL 0건

### 커뮤니티

- 통과
- 확인: `커뮤니티`, `게시글` 화면 진입

### 재실행/복귀

- 통과
- 확인: cold start 직후 일시 로딩 후 홈 정상 복귀

### crash/ANR 여부

- `FATAL EXCEPTION`: 0건
- `ANR`: 0건
- React Native fatal pattern: 0건

## 3. Remote Backend Evidence

### supabase migration list

- `supabase migration list --linked` 실행 결과 local/remote가 `20260429130000`까지 일치한다.
- latest matched migration: `20260429130000`
- weather cache migration `20260429130000_weather_cache_proxy.sql`은 linked remote 반영 상태다.

### linked lint result

- `supabase db lint --linked --schema public --fail-on error` 통과
- error 없음
- `public.delete_my_account`의 unused parameter `p_request_id` warning만 확인됐다.

### functions list

`supabase functions list --project-ref grmekesqoydylqmyvfke` 기준 ACTIVE 함수:

- `timeline-thumbnail-worker` v16
- `account-deletion-worker` v7
- `place-enrichment-demand` v9
- `place-enrichment-worker` v6
- `location-discovery-seed` v7
- `weather-cache` v2

### weather-cache ACTIVE

- `weather-cache`: ACTIVE
- version: 2
- updated at: 2026-04-29 15:06:13 UTC

### delete_my_account warning은 error가 아님

- linked lint의 `public.delete_my_account` unused parameter warning은 release blocker가 아니다.
- `--fail-on error` 기준 error가 아니며, 이번 release evidence pack에서는 P0/P1로 분류하지 않는다.

## 4. Domain Closeout Evidence

### 동물병원

- 유저 서비스 기준 close
- public search RPC, linked remote migration, linked lint, Android list/search/filter/detail smoke, `NURI-RPC-SUCCESS` logcat이 확보됐다.
- 운영자 검수 UI approve/reject/held 실계정 QA는 동물병원 도메인 재오픈 항목이 아니라 전역 operator final gate로 이관한다.
- evidence: `docs/qa/animal-hospital-v1-evidence-pack-2026-04-28.md`
- admin final gate: `docs/qa/admin-qa-backlog.md`

### 날씨

- v1.0 close
- client direct Open-Meteo call 제거 완료
- `weather-cache` proxy/cache 구조 적용 완료
- `public.nuri_weather_cache` linked remote apply 완료
- `weather-cache` Edge Function ACTIVE 완료
- Android 실기기 홈/상세 QA 완료
- Open-Meteo customer API key/계약 확인과 `weather-cache` abuse throttle/rate limit은 v1.0 blocker가 아니라 운영 고도화 항목이다.
- evidence: `docs/domains/weather-api-cost-defense.md`

### 산책

- Kakao fan-out 최소 안정화 완료
- `location-discovery-seed` Edge Function을 통해 Kakao Local 호출을 서버 경계로 이동했다.
- 이번 release evidence pack에서는 산책 도메인을 재감사하지 않고, RC smoke 진입 통과만 고정한다.

### 건강관리

- Phase 1 close
- repo 구현, linked remote migration, row-level 검증, Android 핵심 QA evidence가 존재한다.
- 이번 release evidence pack에서는 건강관리 도메인을 재감사하지 않고, RC smoke 진입 통과만 고정한다.

### 커뮤니티

- moderation baseline evidence 존재
- write-path rate limit, blocked-term, stable error contract, 신고 duplicate/self-report 차단, auto-hide, moderation queue/action log baseline이 확보됐다.
- row-level 보관본 부족은 P1로 재상승시키지 않고 accepted existing evidence 또는 final gate 판단 대상으로 둔다.

### 계정/인증

- 정책 문서 public 연결과 앱 복귀 evidence 존재
- 비밀번호 재설정 recovery flow evidence 존재
- 계정 탈퇴 7일 유예와 자동 파기 worker baseline evidence 존재
- 파괴적 플로우는 이번 hard-close 턴에서 재수행하지 않는다.

## 5. Evidence Gap Classification

### A. Release blocker

1. clean RC artifact 기준 evidence 고정 필요
   - 현재 smoke는 dirty working tree와 설치된 `com.nuri.app` v1.0 기준이다.
   - 최종 release evidence에는 clean RC build artifact, commit/branch 상태, 설치 APK provenance, version manifest를 별도로 고정해야 한다.
   - 이번 턴에서는 커밋, 정리, reset, build 재수행을 하지 않고 현재 dirty manifest를 그대로 기록했다.

### B. Accepted existing evidence

- Android RC smoke 통과
- linked remote migration local/remote 일치
- linked lint error 없음
- `weather-cache` ACTIVE
- weather-cache `source=provider` 이후 `source=fresh_cache`
- logcat 기준 Open-Meteo direct URL 0건
- 동물병원 유저 서비스 closeout evidence
- 날씨 비용 방어 closeout evidence
- 건강관리 Phase 1 row-level/Android evidence
- 커뮤니티 moderation baseline evidence
- 계정 탈퇴 7일 유예와 자동 파기 worker baseline evidence
- 비밀번호 재설정 recovery flow evidence
- 정책 문서 public link/app return evidence

### C. Final gate / Backlog

- 운영자 QA approve/reject/held 실계정 evidence
- 스토어 출시 자산
- 스토어 제출 직전 최종 캡처/메타데이터
- Open-Meteo customer API key/계약 확인
- `weather-cache` public endpoint abuse throttle/rate limit
- v1.1 운영 고도화 항목

## 6. Release Decision

- RC smoke: 조건부 통과
- P0: 없음
- P1: 있음. 단일 항목이며 `clean RC artifact 기준 evidence 고정 필요`로 제한한다.
- 이번 hard-close 결과: release checklist 후행 캡처/RC smoke evidence는 현재 확보분 기준으로 묶었다.
- 다음 액션: social login 계약 정리 턴
