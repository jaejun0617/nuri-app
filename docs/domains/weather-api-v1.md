# NURI Weather API v1

최종 확인: 2026-10-06. 이 문서는 API 코드/배포 계약의 source of truth다. 기존 Weather UX PO 승인과 Store 상용 운영 승인은 별개다.

## 2026-10-06 PO 30분 갱신 변경

PO가 기존 15분 계약을 30분으로 명시적으로 변경했다. 기존 API v1 완료 승인은 유지하며 이번 예외는 최신 유효시간·자동 확인과 이전 앱 호환 응답에 한정한다. provider·단위·원본 시각·KST·비용 방어·인증·DB 구조는 변경하지 않는다.

- shared cache fresh TTL과 새 앱 live 상한, visible/active 자동 확인은 30분이다. 30분 경계는 exclusive이며 1시간 safe stale 상한·30초 상태 재평가·진입/복귀의 기존 필요성 검사·수동 재확인은 유지한다. 화면 이탈/백그라운드에서는 주기 요청하지 않는다. 위치 이동 확인은 별도 위치 계약이며 필요한 새 지역 조회를 지연하지 않는다.
- 새 앱은 `x-nuri-weather-fresh-minutes: 30`으로 30분 응답을 요청한다. 헤더 없는 v1/legacy 앱에는 기존 15분 wire 상한을 유지한다. 기존 15분 row/응답을 읽어서 30분으로 연장하지 않으며 old client에 긴 TTL을 강요하지 않는다. 캐시 row는 일괄 삭제하지 않고 자연 교체한다.
- 응답 view는 `min(row.expiresAt, row.fetchedAt + client window)`만 적용한다. 원본 조회 시각·staleUntil은 유지하며 구 앱 view가 만료되면 field metadata도 STALE다. shared fresh cache를 재사용해 provider 폭주를 만들지 않는다. 새 앱은 이전 서버의 짧은 TTL도 수용한다.
- unsupported freshness header는 400이다. CORS에 해당 헤더만 추가하며 JWT 설정과 no-store는 유지한다. health는 shared fresh 30분과 default response 15분을 구분한다.
- 두 Edge의 shared source를 함께 배포/대조한다. 실제 배포·smoke·설치 결과는 `/private/tmp/nuri-weather-seasons-20261006/FINAL_REPORT.md`를 따른다. 아래 최초 v1의 900초 증적은 과거 검증값이며 새로운 1,800초 운영 확인과 혼동하지 않는다.

## 범위

- 자체 기상 예측 모델이 아니라 수집·검증·정규화·캐시·freshness·비용 방어를 소유하는 NURI 서버 경계다.
- 앱 production 경로는 `useWeatherGuide` → `fetchNuriWeatherV1` → 정규화 mapper다. 외부 provider 형태를 해석하지 않는다.
- Home/detail/시간대별 강수/7일/AQ/일출·일몰/외출 안내의 승인된 UI, 이미지, 아이콘, 계절, glass, 간격은 변경하지 않는다.
- AUTH, 기존 QA 사용자 데이터, 계절 검토 control, Store HOLD를 유지한다. 일괄 캐시 삭제와 신규 외부 계약/결제/키 발급은 하지 않는다.

## API 계약

실제 endpoint: Supabase Edge `nuri-weather-v1`. `POST` JSON과 `GET` query를 지원한다. 응답 version은 `nuri.weather.v1`이다. URL 2,048자/JSON 1,024bytes 상한, 숫자 좌표 범위, KO/KST context, 허용하지 않은 input key를 검사한다. 과도한 정밀도는 저장하지 않고 즉시 0.02도 bucket으로 정규화한다.

입력: `latitude`, `longitude`, optional `locale=ko-KR`, `timezone=Asia/Seoul`. 출력 envelope는 `ok`, `data`, 실패 시 stable `error.code`다. `data`는 `location/current/hourly/daily/airQuality/warnings/nowcast/sun/freshness/sources`를 소유한다. `GET` without query는 민감정보 없는 health다. 모든 JSON 응답은 `no-store`다.

새 endpoint는 gateway JWT 검증을 사용한다. 현재 날씨는 public 정보이므로 기존 앱 anon JWT도 허용한다. 사용자 소유 DB/Storage 접근을 여는 API가 아니다. 기존 `weather-cache`는 기존 gateway 설정을 유지하지만 동일한 분산 비용 방어를 거친다.

## 출처와 단위

필드 metadata: `source/kind/unit/issuedAt/validAt/retrievedAt/expiresAt/locationKey/quality`. Open-Meteo 조회 시각을 예보 발행 시각으로 위조하지 않아 `issuedAt=null`이다. source별 시각은 독립적으로 검증한다.

- 온도 °C, 풍속 m/s, 강수량 mm, 확률 %, PM/오존 μg/m³, 시각 UTC ISO8601을 사용한다.
- provider의 timezone 없는 시간은 KST로 정규화한다. 달력 오류/중복 hourly/잘못된 수치/지원하지 않는 WMO를 검증한다.
- 시간별 강수량은 `startsAt`부터 `endsAt`까지의 1시간 구간이다. 확률과 강수량, 0과 누락은 구분한다.
- 모델 AQ는 `AIR_QUALITY_FORECAST`다. μg/m³ 오존을 ppm 등급으로 변환해 주장하지 않는다.
- 관측과 예보는 평균하지 않는다. 검증된 OBSERVED → FORECAST, AQ OBSERVED → AQ FORECAST 우선순위 인터페이스를 둔다.
- optional 누락은 null/UNAVAILABLE이며 유효한 현재 날씨까지 버리지 않는다. 필수 현재 온도·WMO·시각이 유효하지 않으면 unavailable이다.

## Provider 활성화

| 역할 | 상태 | 실제 데이터 |
| --- | --- | --- |
| Open-Meteo Forecast | ACTIVE | current model/hourly/daily/sun |
| Open-Meteo AQ | ACTIVE | 모델 AQ |
| KMA Observation | READY_INACTIVE | 제공하지 않음 |
| KMA Warning | READY_INACTIVE | 제공하지 않음 |
| AirKorea | READY_INACTIVE | 제공하지 않음 |
| KMA Nowcast | READY_INACTIVE | 제공하지 않음 |

기존 서버 secret 이름을 확인했지만 국내 provider 자격증명은 확보돼 있지 않다. `weather-provider-registry.js`는 역할별 주입·schema 검증·출처 우선순위를 제공한다. live parser, coverage, quota, 운영 자격 검증과 실제 필드 연결은 별도 활성화 단계다. 비활성 warning/nowcast는 unavailable/빈 배열이며 정상 특보 상태를 만들어내지 않는다.

## 캐시와 분산 방어

- 기존 `nuri_weather_cache`와 raw payload contractVersion=2, 앱 v8/current namespace, cross-region 거부 계약을 재사용한다. 이전 row는 정상 만료되며 mass delete하지 않는다.
- fetchedAt부터 30분 fresh, 1시간 safe stale. 읽기로 시간/TTL을 연장하지 않는다. 실패 시 usable fresh → usable stale → unavailable이다. 이전 앱 응답은 위 호환 계약의 15분 상한을 따른다.
- process 내 coalescing과 별도로 DB lease를 사용한다. coarse bucket/context당 20초, UUID owner, 원자적 expired takeover, owner-only release다.
- follower는 안전한 stale 또는 0.1/0.2/0.4/0.8/1.6/2.4초 bounded wait를 사용한다. 실패한 lease를 우회해 provider를 호출하지 않는다.
- upstream timeout 6.5초, DB request timeout 2.5초, 앱 timeout 15초, retry 0회다. 무한 재시도하지 않는다. 취소 신호를 전달한다.
- provider별 원자적 예약 상한: 90/minute, 1,000/hour, 4,500/UTC day. forecast와 AQ 합계 일일 최대 9,000 예약이다. 실패도 예약에 포함한다. 실제 호출은 별도 metric이다.
- caller당 60/minute, 전체 1,200/minute. caller key는 서버 secret으로 salt한 일일 회전 hash다. IP 자체나 token을 저장/기록하지 않는다.
- provider 연속 실패 3회부터 60초 suppression. 성공하면 해제한다. cache fallback과 unavailable은 유지한다.
- 운영 DB가 접근 불가하면 비용 방어를 우회하지 않는다. 검증 가능한 기존 캐시 밖으로 새 provider 호출을 하지 않는 fail-closed 정책이다.

## 보안과 데이터

migration `20261005145511_nuri_weather_api_v1_operations.sql`은 weather 전용 4개 테이블/5개 RPC만 추가한다. 원본 migration remote MD5는 `7113e08aba57e739990d1b2b110e1404`다.

새 테이블 RLS ON, public/anon/authenticated 접근 없음, service_role만 허용한다. 새 RPC는 SECURITY INVOKER, 고정 empty search_path, service_role EXECUTE 전용이다. 기존 Auth/RLS/Storage/user row 정책은 바꾸지 않는다. service role/provider key는 Edge 환경에만 있다.

캐시와 metric은 coarse key만 소유한다. 좌표 원본·이메일·반려동물 이름·token을 로그에 남기지 않는다. budget/caller row는 만료 후 bounded purge, metric은 14일 이후 bounded purge한다. 트래픽이 없으면 만료 row의 물리 삭제가 다음 요청까지 지연될 수 있다.

## 운영 관측

일별 `nuri_weather_metrics`: requests, provider_request/success/failure, timeout, cache_hit/miss, fresh_cache/stale_cache, unavailable, location_mismatch, missing_fields, response_latency/provider_latency, rate_limited.

`cache_hit`는 실제 cache 재사용, `fresh_cache`는 provider 포함 fresh 응답 상태다. latency metric은 core 처리 시간이며 최종 metric flush/network 시간을 제외한다. Wire latency는 smoke 증적에서 별도 측정한다. 총합/samples로 평균을 계산한다. percentiles·외부 alert owner·장기 SLA는 이 baseline에 포함하지 않는다.

```sql
select day,provider,metric,sum(total) as total,sum(samples) as samples
from public.nuri_weather_metrics
group by day,provider,metric order by day,provider,metric;
```

이 조회는 운영 service/admin 경계에서만 수행한다. 사용자 계정에 metric 접근 정책을 열지 않는다.

## 검증과 배포

- local 타입/lint, 170 suites/1,595 tests PASS. 처음 전체 검사에서 이전 고정 높이 assertion 12개가 승인된 UX의 minHeight 계약과 달라 테스트만 바로잡았다. runtime UI 변경은 없다.
- fixture: timeout/429/5xx/malformed/partial/cancellation/KST/null-zero/stale-expired/location/lease/role 경계. 독립 in-flight map 16개가 공유 lease로 provider bundle 1회.
- remote DB transaction drill: 중복 owner 거부, wrong-owner release 거부, 올바른 release, atomic budget 초과 거부. 테스트는 rollback했다.
- remote smoke 17회, 동시 상한 8. cold bucket 요청 8개 → forecast 1회 + AQ 1회, 7회 cache hit. TTL 900/3600초, active lease 0. 실제 서로 다른 Edge isolate 개수는 측정하지 않았다.
- remote `nuri-weather-v1` ACTIVE v1, `weather-cache` ACTIVE v6. 각각 배포 8개 파일이 로컬 SHA-256과 일치한다.
- 실기기 설치/QA와 최종 Git 결과는 `/private/tmp/nuri-weather-api-v1-20261005/FINAL_REPORT.md`를 따른다.

공식 배포는 linked project `grmekesqoydylqmyvfke`에 shared 7개 파일과 endpoint entry를 함께 배포한다. migration 적용 → versioned endpoint → backward-compatible endpoint → live smoke → 앱 release candidate 순서다. 다른 프로젝트/기능은 배포하지 않는다.

## Rollback

기존 client/mapper는 `legacy.ts`, `legacyMapper.ts`에 명시적으로 남긴다. 자동 legacy 재시도는 하지 않아 비용 방어를 우회하지 않는다. provider 교체는 normalized 계약 뒤에서 수행한다. breaking API 변경은 새 version을 사용한다.

문제 시 기존 정상 APK로 `install -r` 복귀 또는 hook을 명시적으로 legacy client/mapper로 전환하는 검증된 corrective를 별도 수행한다. DB 운영 테이블을 삭제할 필요가 없다. legacy v6는 동일 분산 보호를 받는다. 이전 Edge v5 source는 evidence의 `remote-rollback-v5.json`에 보존한다. v5 재배포는 분산 보호까지 되돌리므로 최후 수단으로만 검토한다. 모든 rollback은 실제 원인과 provider 비용 영향을 보고한 뒤 수행한다.

## 남은 운영 게이트

API v1 core 완료와 별개로 PRE_STORE에는 Open-Meteo commercial eligibility, provider budget/quota, 국내 API 운영 자격, alert owner, 장기간 신뢰성, full fault drill이 필요하다. 상용 예측 권리나 예보 적중률이 이번 테스트로 증명된 것은 아니다.

P1: 디자인 동결 이후 KMA observation/warning, AirKorea observed AQ, nowcast/radar live 활성화. P2: 출시 이후 30~90일 calibration/기온·풍속 오차/지역 편향/비용 측정. 기존 roadmap은 폐기하지 않는다.

빌드/QA 산출물과 캐시는 사용자 삭제 지시 전까지 유지한다. Store upload와 다음 디자인은 자동 시작하지 않는다.
