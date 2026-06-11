# NURI 전체 프로젝트 현황 보고서

기준일: 2026-06-11
문서 목적: ChatGPT, Codex, 운영자, 후속 개발 세션이 현재 NURI 앱의 전체 맥락을 한 번에 파악하기 위한 source of truth 문서

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
| V1.1 산책 POI 전환 트랙 | 약 65% | PostGIS foundation, 앱 POI RPC read path, admin import/review, admin read/write UI, 고양시/서울 1차 seed 완료. 서울 2차, 수도권/전국 coverage, fallback 축소, Kakao runtime 제거가 남음 |
| V1.1 전체 | 약 30% | 산책 POI 트랙은 진행 중이나 결제, AI, 편지함, Typography, Apple, Naver cleanup, Weather 운영 고도화 등 별도 V1.1 후보가 남음 |
| 전체 제품 로드맵 | 약 72% | V1.0 release-ready 기준선은 닫혔고 V1.1 핵심 location foundation은 진행 중. 장기 유료화/AI/전국 데이터 운영은 아직 남음 |

남은 작업의 성격:

- 기능 개발: V1.1 admin UI 고도화, 결제/AI/편지함/Apple 등 신규 업데이트
- 운영 QA: 지역별 Android smoke, admin action evidence, public projection safety 반복 확인
- 데이터 확장: 서울 2차, 수도권, 광역시, 전국 POI seed coverage
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
- 현재 총 approved/public/active POI: 86건

Coverage/fallback gate:

- 적용 지역:
  - 일산 / 주엽 / 호수공원
  - 백석 / 마두 / 정발산
- 보류 지역:
  - 화정 / 행신 / 삼송 / 원당
  - 서울 전체 및 서울 개별 권역
- 보류 사유:
  - 3km approved 10건, 5km approved 20건 기준을 아직 충족하지 못한 권역이 있음

Android 실기기 smoke:

- 고양시 대표 좌표 리스트/검색/상세 확인
- 서울 월드컵공원 대표 좌표 리스트/상세 확인
- pending/rejected/held 앱 미노출 확인
- logcat fatal / ANR / unhandled promise 0건 확인

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

- 서울 주요 산책 권역 seed coverage 2차 확장
- admin write UI e2e/action log drill-down 유지 증적 고도화
- fallback gate 추가 적용
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

1. 서울 주요 산책 권역 seed coverage 2차 확장
2. admin write UI e2e/action log drill-down 운영 증적 보강
3. coverage 충족 권역 fallback gate 추가 적용
4. 수도권 주요 산책 권역 확장 계획 수립
5. Play Store 제출 자산은 전체 개발/QA 종료 후 최종 제출 직전 준비
