# NURI 전체 프로젝트 현황 보고서

기준일: 2026-06-19
최종 정합성 검수일: 2026-06-19
문서 목적: ChatGPT, Codex, 운영자, 후속 개발 세션이 현재 NURI 앱의 전체 맥락을 한 번에 파악하기 위한 source of truth 문서

최신 갱신: 2026-06-20 Kakao Local runtime closeout 1단계로 Ready 권역에서 POI RPC 정상 응답 시 Kakao fallback 호출을 차단했다. 총 approved/public/active POI는 685건으로 유지하며, Kakao Local fallback path hard delete는 하지 않았다. gate 밖, feature flag off, RPC error, 좌표 없음, detail missing은 Keep Fallback 조건으로 유지한다.

## 1. 문서 목적

이 문서는 V1.0 closeout 이후 NURI 앱이 어디까지 완성됐고, V1.1에서 무엇을 진행 중이며, 앞으로 어떤 작업이 남았는지 한 번에 공유하기 위해 작성한다.

이 문서의 기준은 실제 코드, 현재 git 이력, Supabase migration 상태, project-memory, QA 문서, V1.1 산책 POI 문서다. 문서와 코드가 충돌할 경우 실제 코드와 실제 remote 동작을 우선한다.

## 2. 프로젝트 개요

- 프로젝트명: NURI
- 서비스 설명: 반려동물의 기억, 일상, 건강, 추억을 기록하고 관리하는 디지털 메모리얼 앱
- 핵심 가치: 반려동물과 보호자의 기록을 안전하게 보존하고, 일상 기록과 생활 정보를 신뢰 가능한 방식으로 제공한다.
- 대상 사용자: 반려동물을 키우거나 떠나보낸 보호자, 가족과 추억을 공유하고 싶은 사용자
- 출시 전략: Android 우선 개발과 실기기 QA를 기준으로 V1.0을 안정화하고, V1.1부터 위치/운영/데이터 기반 기능을 확장한다.

주요 기술 스택:

- React Native
- TypeScript
- Supabase Auth / Database / RLS / RPC / Edge Functions
- PostGIS / pg_trgm
- styled-components 기반 theme 구조
- Android 실기기 QA
- 외부 지도 앱 deep link
- 자체 POI DB 기반 location discovery 전환

## 3. 현재 전체 진행률

진행률은 기능 구현, 운영 QA, 보안 gate, 데이터 coverage, 제출 준비를 분리해 산정했다. V1.0은 기능/QA 기준으로 닫혔지만 Play Store 제출 자산은 최종 제출 직전 준비 단계로 별도 분리돼 있다.

| 구분 | 진행률 | 근거 |
| --- | ---: | --- |
| V1.0 기능 개발 | 100% | P0/P1 0건, 필수 기능 closeout, Code Freeze 유지 |
| V1.0 QA/출시 준비 | 약 96% | release APK exact install smoke, 일반 사용자 smoke, admin/super_admin 서버 계약 확인, P0 corrective 회귀 완료. Play Store 제출 자산만 최종 제출 직전 준비로 남음 |
| V1.1 산책 POI 전환 트랙 | 약 94% | remote DB 기준 approved/public/active POI 685건, PostGIS foundation, 앱 POI RPC read path, admin import/review, admin read/write UI, 고양/서울/수도권/전국 주요 도시 coverage, 한글 표시값 기준 유지, Ready 권역 Kakao 호출 차단 focused test와 Android smoke 완료. Kakao hard delete와 전국 3차 coverage가 남음 |
| V1.1 전체 | 약 45% | 산책 POI 트랙은 closeout 단계에 접근했지만 결제, AI, 편지함, Typography, Apple, Naver cleanup, Weather 운영 고도화 등 별도 V1.1 후보가 남음 |
| 전체 제품 로드맵 | 약 85% | V1.0 release-ready 기준선은 닫혔고 V1.1 location foundation, 전국 seed 2차 coverage, Ready 권역 Kakao 호출 차단까지 진행됐다. 장기 유료화/AI/전국 데이터 운영은 아직 남음 |
| 최종 제출 준비 | 약 20% | release artifact/provenance와 정책 URL 기준은 정리됐지만 Play Store 스크린샷, 설명문, Console 입력, store listing package는 아직 최종 제출 직전 준비로 남음 |

남은 작업의 성격:

- 기능 개발: V1.1 admin UI 고도화, 결제/AI/편지함/Apple 등 신규 업데이트
- 운영 QA: 지역별 Android smoke, admin action evidence, public projection safety 반복 확인
- 데이터 확장: 수도권 3차, 광역시, 전국 POI seed coverage
- 스토어 제출 준비: Play Store 스크린샷, 설명문, 정책 URL, 문의처, store listing package
- 장기 고도화: 자체 지도 스택, Premium AI, subscription entitlement, moderation/admin 운영 고도화

## 4. V1.0 완료 내역

### Auth / Social Login

- 이메일 로그인/회원가입 흐름 구현
- 비밀번호 재설정 deep link 복귀 구현
- 인증 callback과 password reset deep link 분리
- Google OAuth V1.0 성공 smoke 완료
- Kakao OAuth V1.0 성공 smoke 및 신규 사용자 온보딩 확인 완료
- V1.0 소셜 로그인 provider는 Google + Kakao로 확정
- Naver는 V1.0 public surface에서 soft disable
- Supabase `custom:naver` provider와 app-side Naver 코드는 hard delete하지 않음
- Apple 로그인은 Android-first V1.0 범위에서 제외
- 소셜 신규 사용자도 이메일 가입과 동일하게 NicknameSetup -> PetCreate 흐름을 탄다.
- provider metadata nickname/avatar/email은 NURI 확정 profile source of truth가 아니다.

### Profile / Pet / Onboarding

- 닉네임 정책은 `2..10` 기준으로 정렬
- 닉네임 중복확인과 저장 흐름 구현
- 신규 사용자 펫 등록 흐름 구현
- 펫 프로필 수정 흐름 구현
- PetCreate / PetProfileEdit 날짜 모달에 `YYYY-MM-DD` 직접 입력 추가
- 과거 날짜 `2010-05-12` 입력 및 저장 payload 반영 확인
- 잘못된 날짜와 미래 날짜 validation 차단
- Android 키보드 대응 확인

### Account / Policy

- 이용약관/개인정보처리방침 public 문서 연결
- 계정 삭제 안내 연결
- 탈퇴 7일 유예 구조 적용
- 자동 최종 삭제 worker와 storage cleanup 흐름 적용
- `profiles.role self-escalation` P0 corrective migration 완료
- 일반 사용자 role update 차단, 일반 profile update 유지
- 악성 role update 후 admin RPC 권한 거부 확인

### Community

- 게시글/댓글 write-path 방어선 구현
- rate limit, dedupe, blocked-term 처리
- 신고 정책, self-report 차단, duplicate 차단
- auto-hide와 moderation queue/action log 구조 구현
- confirmed nickname 기반 author 표시
- hidden 이미지 public 비노출
- 커뮤니티 인앱 정책 notice와 글쓰기 helper 적용

### Health

- 건강관리 Phase 1 구현
- 체중관리, 건강기록, 인사이트 탭 구성
- 월 단위 조회
- `pet_weight_logs`와 `pets.weight_kg` snapshot 동기화
- 체중 insert/update/delete/fallback 회귀 확인
- Android 실기기 QA 완료

### Weather

- Open-Meteo 클라이언트 직접 호출 제거
- Supabase `weather-cache` Edge Function 경유
- 60분 cache와 stale fallback 적용
- Android smoke 완료
- public endpoint abuse/rate limit 고도화는 V1.1 운영 후보

### Animal Hospital

- Localdata canonical source 기반 동물병원 DB 구축
- public projection 분리
- 리스트 주소 미노출, 상세에서 주소/전화/길찾기 제공
- Google Places/Photos runtime 차단
- approved thumbnail/phone/coordinates gate 적용
- admin/super_admin 운영자 QA 서버 계약 확인
- approve/reject/held/action log/public projection 서버 계약 확인

### Walk / Location Discovery V1.0

- Kakao REST key 클라이언트 직접 호출 제거
- `location-discovery-seed` Edge Function 서버 경유 구조 적용
- client cache / in-flight dedupe / Edge Function URL cache / fan-out 제한
- V1.0에서는 provider-zero가 아니라 controlled-server-call 상태로 close

### Map / API Cost Defense

- Google Places runtime 차단
- Google Place Photos 차단
- `NURI_PLACE_ENRICHMENT_HARD_CAP=0`
- `place-enrichment-worker` no-op
- production Google Places key 제거
- 길찾기 / Routes API는 외부 지도 앱 deep link로 위임
- 지도/API 비용 폭탄 gate close

## 5. V1.1 현재 진행 내역

V1.1 1순위 트랙은 산책/location discovery를 자체 POI DB + Supabase PostGIS 기반으로 전환하는 작업이다.

### DB / RPC Foundation

- migration: `20260604110000_walk_poi_postgis_foundation.sql`
- canonical table: `walk_pois`
- source/import table: `walk_poi_source_records`, `walk_poi_import_batches`
- review/audit table: `walk_poi_reviews`, `walk_poi_audit_logs`
- alias table: `walk_poi_search_aliases`
- PostGIS radius/distance 기반 검색 구조 적용
- `pg_trgm` 기반 검색 확장 가능 구조 적용

Public RPC:

- `walk_poi_public_nearby_v1`
- `walk_poi_public_search_v1`
- `walk_poi_public_detail_v1`

Admin RPC:

- `walk_poi_admin_import_dry_run_v1`
- `walk_poi_admin_import_commit_v1`
- `walk_poi_admin_review_v1`
- `walk_poi_admin_read_summary_v1`
- `walk_poi_admin_audit_detail_v1`

### App Read Path

- 앱 산책/location discovery read path를 자체 POI RPC 우선 구조로 전환
- POI 결과가 있으면 `walk_poi` canonical 카드로 표시
- POI 결과 0건, RPC error, feature flag off, 좌표 없음 등에서는 기존 Kakao fallback 유지
- Kakao Local runtime은 아직 삭제하지 않음
- fallback reason marker:
  - `poi_disabled`
  - `coordinate_missing`
  - `poi_empty`
  - `poi_rpc_error`
  - `detail_not_found`

### Admin Import / Review / Audit

- admin import commit workflow 구현
- approve / reject / held review workflow 구현
- approved + public + active만 public RPC 노출
- pending / rejected / held public 미노출
- audit log 기록
- anon direct table SELECT 차단 유지
- 비관리자 admin RPC `WALK_POI_ADMIN_REQUIRED` 확인
- admin read-only UI 구현
- admin write UI 최소 구현
- 실제 admin/super_admin 세션에서 approve/reject/held button tap e2e와 action log drill-down 확인

### Seed Coverage

- Android smoke starter seed: 3건
- 일산/주엽/호수공원 생활권: approved POI 20건 확보
- 고양시 1차 batch: 신규 33건 승인
- 서울 주요 산책 권역 1차 batch: 신규 33건 승인
- 서울 주요 산책 권역 2차 batch: 신규 44건 승인
- 서울 보류 권역 보강 batch: 신규 67건 승인
- seed 한글화 정규화 + 북서울꿈의숲/수도권 1차 batch: 신규 48건 승인
- 현재 총 approved/public/active POI: 245건

Coverage/fallback gate:

- 적용 지역:
  - 일산 / 주엽 / 호수공원
  - 백석 / 마두 / 정발산
  - 월드컵공원 / 난지 / 망원
  - 반포 / 잠원 / 이촌
  - 뚝섬 / 서울숲
  - 송파 / 올림픽공원 / 석촌호수
  - 양재천 / 탄천
  - 중랑천
  - 안양천
  - 보라매 / 도림천
- 보류 지역:
  - 화정 / 행신 / 삼송 / 원당
  - 서울 전체
  - 수도권 전체
  - 전국 전체
- 보류 사유:
  - 수도권 전체와 전국 전체는 아직 단일 gate를 적용할 coverage 단위가 아니다.

Android 실기기 smoke:

- 고양시 대표 좌표 리스트/검색/상세 확인
- 서울 월드컵공원 대표 좌표 리스트/상세 확인
- pending/rejected/held 앱 미노출 확인
- logcat fatal / ANR / unhandled promise 0건 확인

### 2026-06-15 정합성 검수 근거

이번 보고서의 서울 1차 seed와 admin e2e 항목은 2026-06-15 linked remote read-only query와 실제 코드 기준으로 재확인했다.

- approved/public/active POI count: 86건
- 고양시 1차 seed batch: `1d6bf293-c51d-4c6b-bdb8-74eec00989d6`, source provider `osm`, createdCount 33, reviewCount 33
- 서울 1차 seed batch: `eff5b9af-3fba-447b-8c93-1d48dedc923c`, source provider `osm`, createdCount 33, reviewCount 33
- public search evidence:
  - `seoul0606`: 33건
  - `hangang0606`: 9건
  - `worldcup0606`: 4건
  - `goyang0606`: 32건
- `walk_poi_admin_audit_detail_v1`: remote function 존재 확인
- admin e2e QA source: `v1.1_admin_ui_e2e_2026_06_06` 3건 확인
- admin QA audit action count:
  - `review_approve`: 1건
  - `review_reject`: 1건
  - `review_held`: 2건
- public projection safety: non-approved public active count 0건
- app code evidence:
  - `src/services/locationDiscovery/walkPoiAdmin.ts`에서 `walk_poi_admin_audit_detail_v1` 호출
  - `src/screens/LocationDiscovery/WalkPoiAdminReadOnlyScreen.tsx`에 approve/reject/held action area와 audit detail modal 존재

따라서 2026-06-15 정합성 검수 당시의 “서울 1차 coverage 완료”, “총 approved/public/active POI 86건”, “admin write UI e2e/action log drill-down 완료”, “다음 액션 서울 2차 coverage” 표기는 맞는 것으로 확인됐다. 이후 같은 날 서울 2차 coverage를 반영해 현재 수치는 아래 기준으로 갱신한다.

### 2026-06-15 서울 2차 확장 근거

- 서울 2차 seed batch: `f2e96855-43af-4da9-98da-f182ab030129`
- source provider: `operator-seed`
- 신규 approved seed: 44건
- 총 approved/public/active POI: 130건
- public search evidence:
  - `seoul0615`: 44건
  - `worldcup0615`: 4건
  - `banpo0615`: 6건
  - `seoulforest0615`: 7건
- public detail evidence: `하늘공원 억새 산책로` 1건 반환
- public projection safety: non-approved public active count 0건
- anon direct table SELECT: permission denied
- 비관리자 admin import RPC: `WALK_POI_ADMIN_REQUIRED`
- fallback gate 추가 적용:
  - `seoul_worldcup_nanji_mangwon`
  - `seoul_banpo_jamwon_ichon`
  - `seoul_ttukseom_seoulforest`
- Android 실기기 evidence:
  - `SM_S937N` / Galaxy 멀티윈도우 보존
  - `서울 월드컵공원·난지·망원 권역` route에서 `하늘공원` 리스트 카드와 상세 진입 확인
  - `9999` 검색 empty state와 `poi_empty`, `gateLimited: true`, `gateRegionId: seoul_worldcup_nanji_mangwon` logcat 확인
  - fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건

### 2026-06-15 서울 보류 권역 보강 근거

- 서울 보류 권역 batch: `b4a09762-dfff-4191-b93e-e8debdf63eac`
- source provider: `operator-seed`
- 신규 approved seed: 67건
- 총 approved/public/active POI: 197건
- public search evidence:
  - `seoulheld0615`: 67건
  - `songpaheld0615`: 10건
  - `yangjaeheld0615`: 11건
  - `jungnangheld0615`: 9건
  - `anyangcheonheld0615`: 10건
  - `dreamforestheld0615`: 10건
  - `boramaeheld0615`: 12건
- public nearby/detail evidence: 송파/올림픽공원/석촌호수 5km nearby 27건, detail RPC 1건 반환
- public projection safety: non-approved public active count 0건
- anon direct table SELECT: permission denied
- 비관리자 admin import RPC: `WALK_POI_ADMIN_REQUIRED`
- fallback gate 추가 적용:
  - `seoul_songpa_olympic_lake`
  - `seoul_yangjae_tancheon`
  - `seoul_jungnangcheon`
  - `seoul_anyangcheon`
  - `seoul_boramae_dorimcheon`
- fallback gate 보류:
  - 서울 전체
  - 북서울꿈의숲: 3km 12건, 5km 19건으로 5km 기준 미달
  - 수도권 전체: 다음 별도 batch에서 착수
- Android 실기기 evidence:
  - `SM_S937N` / Galaxy 멀티윈도우 보존
  - `서울 송파·올림픽공원·석촌호수 권역` route에서 `몽촌호 산책로` 리스트 카드와 상세 진입 확인
  - `poi_empty`, `gateLimited: true`, `gateRegionId: seoul_songpa_olympic_lake` logcat 확인
  - POI RPC timeout 조건에서 기존 `location-discovery-seed` fallback 호출 유지 확인
  - fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건

### 2026-06-15 seed 한글화 정규화 / 북서울꿈의숲 / 수도권 1차 근거

- seed/alias normalization SQL: `docs/sql/산책-위치기반-기능/v1.1-walk-poi-korean-normalization-bukseoul-metro-seed-coverage-2026-06-15.sql`
- rollback SQL: `docs/sql/산책-위치기반-기능/v1.1-walk-poi-korean-normalization-bukseoul-metro-seed-rollback-2026-06-15.sql`
- import batch: `b6764de4-6a8c-4fb6-a1dd-998e6195379b`
- 신규 approved seed: 48건
- 총 approved/public/active POI: 245건
- public 표시 필드 영어 노출: 0건
- alias normalization audit: `alias_localization` 173건
- public RPC smoke:
  - 북서울꿈의숲 nearby 5km: 27건
  - `북서울꿈의숲 산책` search: 18건
  - 성남·분당·판교·탄천 nearby 5km: 40건
  - `성남·분당·판교·탄천 권역` search: 40건
  - `수도권 1차 0615` search: 40건
  - detail sample `구미동 탄천 산책로`: 1건
- public projection safety:
  - pending/rejected/held public active leak: 0건
  - anon direct table SELECT: permission denied
  - 비관리자 admin import RPC: `WALK_POI_ADMIN_REQUIRED`
- Android smoke:
  - release APK update install 후 `서울 북서울꿈의숲 권역` 신규 seed 리스트, `석계역문화공원` 상세, `성남·분당·판교·탄천 권역` 리스트를 확인했다.
  - Galaxy 멀티윈도우를 보존했고 NURI 외 앱을 종료하지 않았다.
  - NURI PID 한정 logcat fatal / ANR / unhandled promise / ReactNativeJS fatal pattern은 0건이다.
- fallback gate 추가 적용:
  - 북서울꿈의숲: 3km 20건, 5km 27건
  - 성남·분당·판교·탄천: 3km 29건, 5km 40건
- fallback gate 보류:
  - 서울 전체
  - 수도권 전체
  - 전국 전체

### 2026-06-16 수도권 2차 coverage / gate 적용 권역 empty UX 검증 근거

- 추가 seed: 60건
- 대상 권역:
  - 하남·미사한강공원
  - 수원·광교호수공원
  - 과천·서울대공원
- import batch: `d03e7cef-fb93-4b45-9e61-ec0c926952da`
- source provider: `operator-seed`
- source/attribution: `누리 운영자 검수 자료 · 수도권 2차 산책 권역 · 2026-06-16`
- 총 approved/public/active POI: 305건
- import summary: requested 60, created 60, review 60, duplicate 0, conflict 0, skipped 0
- rollback SQL: `docs/sql/산책-위치기반-기능/v1.1-walk-poi-metro-2nd-seed-rollback-2026-06-16.sql`

coverage 측정:

| 권역 | 3km | 5km | search | 판정 |
| --- | ---: | ---: | ---: | --- |
| 하남·미사한강공원 | 17건 | 21건 | 20건 | gate 적용 |
| 수원·광교호수공원 | 20건 | 20건 | 20건 | gate 적용 |
| 과천·서울대공원 | 20건 | 23건 | 20건 | gate 적용 |

검증:

- focused Jest `__tests__/locationDiscoveryFanout.test.ts`: 11개 통과
- gate 내부 POI 0건: Kakao fallback 제한
- gate 밖 POI 0건: 기존 Kakao fallback 유지
- POI RPC error: 기존 Kakao fallback 유지
- Android 실기기 smoke:
  - 하남·미사한강공원 권역 deep link 리스트 표시 확인
  - `0616` 검색 결과 확인
  - `9999` 검색 empty state와 `poi_empty`, `gateLimited: true`, `gateRegionId: metro_hanam_misa_hangang` logcat 확인
  - `미사한강공원 중앙 산책로` 상세 진입 확인
  - 수원·광교호수공원 권역 리스트 표시 확인
  - 과천·서울대공원 권역 리스트 표시 확인
  - NURI PID 기준 fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건
- 신규 seed public 표시 필드 영문 노출: 0건
- pending/rejected/held public active leak: 0건
- anon direct table SELECT: `42501 permission denied`
- 비관리자 admin RPC: `WALK_POI_ADMIN_REQUIRED`
- Kakao Local runtime: 삭제하지 않음

## 2026-06-17 V1.1 수도권 3차 / 전국 주요 도시 1차 업데이트

- 수도권 3차 seed: 80건 승인
- 수도권 3차 import batch: `ee62c190-595e-4e42-a50c-56301b8dcfb2`
- 수도권 3차 대상: 인천 송도 센트럴파크, 부천 상동호수공원, 안양·학의천·안양천, 남양주·다산·왕숙천
- 전국 주요 도시 1차 seed: 80건 승인
- 전국 주요 도시 1차 import batch: `88910305-736c-4e9c-bb09-3d0d735e4be9`
- 전국 주요 도시 1차 대상: 부산 해운대·동백섬, 대구 수성못, 대전 갑천·엑스포, 울산 태화강 국가정원
- 총 approved/public/active POI: 465건
- admin workflow: `walk_poi_admin_import_commit_v1` -> `walk_poi_admin_review_v1(approve)`
- public projection safety: pending/rejected/held leak 0건, raw/source/review/audit public RPC 미노출
- 권한 safety: anon direct table SELECT `42501 permission denied`, 비관리자 admin RPC `WALK_POI_ADMIN_REQUIRED`
- fallback gate 신규 적용: 인천 송도, 부천 상동, 안양·학의천·안양천, 남양주·다산·왕숙천, 부산 해운대·동백섬, 대구 수성못, 대전 갑천·엑스포, 울산 태화강 국가정원
- fallback gate 보류: 서울 전체, 수도권 전체, 전국 전체, 미처리 광역 권역
- Android smoke: `SM_S937N`에서 Galaxy 멀티윈도우를 보존한 채 송도 리스트/상세, 부산 리스트, `9999` empty UX와 `gateLimited: true` logcat을 확인했다.
- logcat: fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건
- Kakao Local runtime: 삭제하지 않음

## 2026-06-19 V1.1 전국 seed 2차 / 수도권 잔여 / Kakao runtime readiness 업데이트

- 전국 seed 2차: 140건 승인
- 전국 seed 2차 import batch: `77bd70bd-58b7-45e7-a068-b13afac1628e`
- 전국 seed 2차 대상: 광주 광주천·영산강, 세종호수공원·금강, 청주 무심천·문암생태공원, 천안 천호지·불당천, 춘천 공지천·의암호, 강릉 경포호·남대천, 제주 이호테우·탑동해안
- 수도권 잔여 seed: 80건 승인
- 수도권 잔여 import batch: `4ed823a2-4a4c-48eb-8174-76a52ed4a203`
- 수도권 잔여 대상: 용인·기흥호수공원, 군포 초막골생태공원, 시흥 갯골생태공원, 김포 한강신도시 호수공원
- 총 approved/public/active POI: 685건
- admin workflow: `walk_poi_admin_import_commit_v1` -> `walk_poi_admin_review_v1(approve)`
- public projection safety: pending/rejected/held leak 0건, raw/source/review/audit public RPC 미노출
- 권한 safety: anon direct table SELECT `42501 permission denied`, 비관리자 admin RPC `WALK_POI_ADMIN_REQUIRED`
- 한글화 safety: 신규 220건 기준 한글 alias 누락 0건, public 영어 지역명 노출 0건
- fallback gate 신규 적용: 광주, 세종, 청주, 천안, 춘천, 강릉, 제주, 용인·기흥, 군포 초막골, 시흥 갯골, 김포 한강신도시
- fallback gate 보류: 서울 전체, 수도권 전체, 전국 전체, 도시 전체 broad gate, 미처리 광역 권역
- Kakao runtime readiness: gate 적용 권역은 Ready 후보로 분류하되 code delete 대상은 아니며, gate 밖/좌표 없음/RPC error/detail missing/feature flag off 조건에서는 fallback을 유지한다.
- Android smoke: `SM_S937N`에서 Galaxy 멀티윈도우를 보존한 채 광주 리스트/상세, 시흥 리스트/empty UX, `gateLimited: true` logcat을 확인했다.
- logcat: fatal / ANR / unhandled promise / ReactNativeJS fatal pattern 0건
- Kakao Local runtime: 삭제하지 않음

현재 진행률 요약:

| 구분 | 진행률 | 근거 |
| --- | ---: | --- |
| V1.0 기능 개발 | 100% | P0/P1 0건, 기능 Code Freeze 유지 |
| V1.0 QA/출시 준비 | 약 96% | release/Android smoke와 주요 서버 gate 완료, Play Store 제출 자산은 최종 제출 직전 준비 |
| V1.1 산책 POI 트랙 | 약 94% | PostGIS/RPC/admin workflow/admin UI/read path/fallback gate, POI 685건, Ready 권역 Kakao 호출 차단까지 진행. Kakao hard delete와 전국 3차 coverage가 남음 |
| V1.1 전체 | 약 45% | 산책 POI 트랙은 closeout 단계에 접근했지만 결제/AI/편지함/타이포/지도 스택 등 장기 후보가 남음 |
| 전체 제품 로드맵 | 약 85% | V1.0 closeout + V1.1 핵심 POI 운영 확장 + Ready 권역 Kakao 호출 차단 진행 기준 |
| 최종 제출 준비 | 약 20% | Play Store 스크린샷, 설명문, Console 입력은 아직 별도 단계 |

## 6. 현재 남은 작업

### V1.0

- 필수 남은 작업 없음
- P0: 0건
- P1: 0건
- V1.0 기능 재오픈 금지

### 최종 제출 직전 준비

Play Store 제출 자산은 V1.0 기능/QA blocker가 아니며, NURI 앱 개발과 QA가 완전히 끝난 뒤 최종 제출 직전 준비 단계에서 진행한다.

남은 제출 준비:

- Play Store 스크린샷 캡처
- Play Store 짧은 설명 작성
- Play Store 전체 설명 작성
- Play Console 입력
- 문의처 최종 입력
- 개인정보처리방침 URL 제출 화면 입력
- 이용약관 URL 제출 화면 입력
- store listing asset pack 생성
- 최종 제출용 점검

### V1.1

- Kakao Local hard delete 가능 여부 판단
- 전국 seed 3차 확대
- gate 적용 권역의 fallback 비율/empty UX 지속 검증
- admin write UI queue filtering / batch drill-down 고도화
- coverage 충족 권역 fallback gate 추가 적용
- 수도권 주요 산책 권역 확장
- 광역시/전국 seed coverage 확장
- Kakao Local 사용자 runtime 점진 제거
- admin import/review UI 고도화
- MapLibre / PMTiles / 자체 지도 스택 검토
- Naver OAuth cleanup
- Apple 로그인
- 결제/구독 foundation
- Premium AI reply
- Guestbook private letters 확장
- Typography foundation rollout
- Weather 운영 고도화
- P2 evidence archive

## 7. 주요 리스크

- POI coverage 부족: coverage가 부족한 지역에서 Kakao fallback을 줄이면 empty UX가 늘 수 있다.
- source/attribution 불명확: 공공데이터/OSM/운영자 seed 출처와 라이선스 기록이 필요하다.
- 좌표 오류: 잘못된 좌표는 사용자 신뢰를 바로 떨어뜨린다.
- public projection 누수: pending/rejected/held 또는 raw payload가 public으로 새면 trust boundary가 깨진다.
- admin 권한 관리: admin/super_admin gate와 audit log가 계속 유지돼야 한다.
- Kakao fallback 축소 UX 저하: coverage 미충족 지역에서는 fallback을 유지해야 한다.
- Supabase 비용 증가: POI 데이터와 RPC 호출량 증가 시 DB/compute 비용 관찰이 필요하다.
- Play Store 제출 전 자산 준비: 기능 blocker는 아니지만 제출 직전에는 누락되면 배포가 지연된다.
- 결제/AI 정책 리스크: 유료 기능과 AI reply는 정책, 동의, 비용 통제가 먼저다.
- 장기 운영 비용: 데이터 검수, admin workflow, 서버 비용을 지속적으로 관리해야 한다.

## 8. 다음 액션

1. Kakao Local hard delete 가능 여부 판단
2. 전국 seed 3차 확대
3. gate 적용 권역의 fallback 비율/empty UX 지속 검증
4. admin write UI queue filtering / batch drill-down 고도화
5. Play Store 제출 자산은 전체 개발/QA 종료 후 최종 제출 직전 준비

## 2026-06-20 V1.1 Kakao Local runtime closeout 1단계 업데이트

- 코드 변경: Ready 권역에서 POI RPC 정상 응답 + 결과 있음이면 `poi_ready`, `kakaoBlocked: true` 로그를 남기고 Kakao fallback을 호출하지 않는다.
- 기존 gate 내부 + POI RPC 정상 + 결과 0건은 `poi_empty`, `gateLimited: true`로 empty UX를 표시하고 Kakao fallback을 호출하지 않는다.
- Keep Fallback 유지: feature flag off, POI RPC disabled, gate 밖 좌표, POI RPC error, 좌표 없음, detail missing.
- Kakao Local fallback path hard delete: 하지 않음.
- focused test: `__tests__/locationDiscoveryFanout.test.ts` 16개 통과. Ready result 있음 Kakao 호출 0, Ready empty Kakao 호출 0, gate 밖 fallback 유지, RPC error fallback 유지, 좌표 없음 fallback 유지, feature flag off fallback 유지를 포함한다.
- public RPC smoke: approved/public/active 685건, non-approved public active leak 0건, public detail RPC internal key leak 0건.
- Android smoke: `SM_S937N`에서 Galaxy 멀티윈도우를 유지하고 광주/시흥/고양 Ready 리스트, Ready empty UX, gate 밖 Keep Fallback을 확인했다. logcat fatal / ANR / unhandled promise / ReactNativeJS fatal pattern은 0건이다.
- 상세 화면: Android 실기기에서 고양 `문화공원 오거리공원`, 수도권 `미사한강공원 중앙 산책로`, 전국 `치평동 공원 산책지점` 카드 tap 후 `산책 장소 상세` 진입을 확인했다.
- 전국 seed 3차: 이번 턴은 runtime closeout 우선으로 문서화만 진행. 신규 seed import 없음.

## 2026-06-20 V1.1 Kakao Local hard delete closeout 판정

Kakao Local hard delete는 이번 턴에서 보류한다.

근거:

- 산책 Ready 권역에서는 이미 Kakao 호출이 차단됐다. focused test 16개 통과, Android logcat `kakaoBlocked: true`로 확인했다.
- 그러나 Kakao Local provider와 `location-discovery-seed`는 산책 fallback 전용이 아니다. pet-friendly 장소 검색, 동물병원 provider matching, 행정동 조회에도 연결되어 있다.
- Keep Fallback 조건인 feature flag off, gate 밖 좌표, POI RPC error, 좌표 없음, detail missing은 아직 Kakao fallback 또는 safe fallback 설계가 필요하다.
- Kakao Login/OAuth와 Kakao Local은 분리 확인했으며 Kakao Login은 수정하지 않았다.

Android detail tap 증적:

- 고양 Ready 권역: `문화공원 오거리공원` 카드 tap -> `산책 장소 상세`
- 수도권 Ready 권역: `미사한강공원 중앙 산책로` 카드 tap -> `산책 장소 상세`
- 전국 Ready 권역: `치평동 공원 산책지점` 카드 tap -> `산책 장소 상세`
- empty UX: `검색 결과가 없어요`
- NURI PID 기준 fatal / ANR / unhandled promise / ReactNativeJS fatal pattern: 0건

현재 진행률:

| 구분 | 진행률 | 근거 |
| --- | ---: | --- |
| V1.0 기능 개발 | 100% | P0/P1 0건, 필수 기능 closeout |
| V1.0 QA/출시 준비 | 약 96% | release smoke 완료, Play Store 자산은 최종 제출 직전 준비 |
| V1.1 산책 POI 트랙 | 약 94% | POI 685건, Ready 권역 Kakao 호출 차단과 detail tap 증적 보강 완료. hard delete는 shared dependency 때문에 보류 |
| V1.1 전체 | 약 45% | 산책 POI 외 billing/AI/letters/typography/admin 고도화 잔여 |
| 전체 제품 로드맵 | 약 85% | V1.0 완료 + V1.1 주요 비용 방어/POI 전환 진척 기준 |

다음 액션:

1. Kakao Local hard delete 최종 잔여 정리: pet-friendly, 동물병원, 행정동 조회와 산책 fallback의 provider 분리 설계
2. 전국 seed 3차/4차 확대: 전주, 창원, 포항, 김해, 여수 우선
