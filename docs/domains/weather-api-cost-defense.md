# 날씨 API 비용 방어 구조
<!-- NURI_WEATHER_UX_PO_CLOSEOUT_20261005_BEGIN -->
## 2026-10-05 Weather UX PO 승인 및 API 작업 분리

- PO가 Home Weather, 상세 화면, 시간대별 강수 UI와 현재 데이터 계약을 승인했다. 기존 아래 후보 기록의 승인 대기는 이 결정으로 종료한다.
- 승인 설치 후보 `6bf9ebf5`와 동일한 Weather runtime, 테스트, 기존 배포 v5 source를 선별 closeout한다. 무관한 dirty, QA, 계절 자산, AUTH, 빌드 산출물은 유지한다. 이번 Git closeout을 위해 재빌드·재설치·재배포하지 않는다.
- 다음은 별도 NURI Weather API v1 canonical 계약이다. NURI-owned 계약·provider adapter·분산 캐시/lease·비용 방어·관측성·앱 전환·remote 배포/검증을 수행하되 승인된 UI는 유지한다. 자격증명 없는 국내 provider는 READY_INACTIVE이며 외부 결제·키 발급·Store 작업은 하지 않는다.
- UX 증적: `/private/tmp/nuri-weather-ux-simplification-20261005`. 선별 Git 증적: `/private/tmp/nuri-weather-po-closeout-20261005`. 타입·lint·14 suites/128 tests 및 설치/화면 증적을 재사용한다. Full suite는 기존 167 suites/1544 tests 결과를 재사용한다.
- Store는 HOLD이며 상용 이용 자격·국내 provider 운영 자격·장기 예측 정확도는 별도 운영 게이트다.
<!-- NURI_WEATHER_UX_PO_CLOSEOUT_20261005_END -->

<!-- NURI_WEATHER_UX_20261005_BEGIN -->
## 2026-10-05 UI 정리와 상용 운영 확대의 분리

- 이번 작업은 presentation/copy만 변경한다. linked v5, 15분 fresh/1시간 stale, 현재 v8 namespace, 원본 시간/위치/단위/취소/동시 요청 합치기/visible 5분 확인은 그대로다. 새 서버 배포·키 발급·DB 정책 변경은 없다.
- fresh 사용자 화면의 반복 technical metadata를 제거해도 내부 시간을 새 값으로 덮어쓰거나 모델을 관측으로 승격하지 않는다. 최근/실패 재시도와 하단 예측 출처는 유지한다.
- 출시 전 P0 제안은 상용 provider 권리/예산 확인, 분산 quota 보호·cache·circuit breaker, 운영 dashboard/alert와 위치 품질/개인정보 경계다. 현재 same-isolate coalescing을 distributed protection으로 주장하지 않는다.
- 디자인 동결 이후 P1: OBSERVED/FORECAST/WARNING/AIR_QUALITY/NOWCAST 필드별 소유권과 공급시각·유효시각·조회시각·만료를 갖는 Edge Aggregator. 공식 국내 관측/특보, AirKorea 관측, radar/nowcast를 순차 검토하고 적법한 기존 예측→안전 cache→미제공으로 fallback한다. 모델을 관측 fallback으로 위장하지 않는다.
- P2: 장기간 사전 예보와 후속 관측을 비교해 강수 확률 calibration·기온/풍속 오차를 평가한다. 테스트 PASS는 적중률 증명이 아니다. 로드맵의 실제 자격/비용/난이도/acceptance는 `/private/tmp/nuri-weather-ux-simplification-20261005/FINAL_REPORT.md`에 기록했다. 모두 제안이며 자동 착수하지 않는다.
<!-- NURI_WEATHER_UX_20261005_END -->

<!-- NURI_WEATHER_RELIABILITY_20261005_BEGIN -->
## 2026-10-05 최신 갱신 계약

- 아래 과거 60분 fresh/6시간 stale 정책은 weather-cache v5의 15분 fresh/1시간 stale로 대체됐다. DB schema/RLS/Storage/Auth는 변경하지 않았다. payload contractVersion=2가 없는 기존 fresh row는 새 provider 조회를 수행하며 기존 row를 일괄 삭제하지 않는다.
- Open-Meteo 지역 좌표 bucket/best-match/7일/KST 경계를 유지하고 시간대별 강수 확률·강수량을 추가한다. 섭씨/m/s/mm/ISO 시각을 명시적으로 요청한다. 확률의 모델 해상도와 bucket 크기는 다르다.
- forecast current time·WMO code·온도 검증, provider timeout6.5s, 응답 no-store, 동일 Edge isolate의 동시 miss 합치기를 적용한다. 앱은 visible/active 5분 확인과 원본 시각 기반 만료를 사용한다. 분산 rate limit은 아직 별도 운영 게이트다.
- 실제 remote ACTIVE v5, local source match, regional response hourly168, DB TTL900/3600·RLS PASS. 현재 providerMode=free; 상용 계약과 KMA 관측/특보/AirKorea 연계는 미확보다. 무료 endpoint 운영 확인을 상용 승인으로 보지 않는다.
- 원본 v4 rollback evidence 및 v5 deployment/catalog/live evidence는 `/private/tmp/nuri-weather-reliability-20261005`에 보존한다. QA row 변경·credential 이전·cleanup 없음.
<!-- NURI_WEATHER_RELIABILITY_20261005_END -->


## 2026-07-19 Release Gate 상태

- Android Home에서 실제 날씨, stale preview, focus refresh 및 활동 추천 진입을 확인했다.
- provider 오류 시 cache/fallback으로 화면이 유지되고 반복 network loop가 없음을 코드·tests·logcat으로 확인했다.
- 날씨 활동 기록 title/note 입력의 keyboard/back을 실기기에서 확인했다.
- Edge Function cache 확장은 별도 성능 고도화이며 현재 release 완료율 분모에 포함하지 않는다.

문서 상태: v1.0 close, remote 적용/Android QA 완료
최종 업데이트: 2026-04-30
적용 범위: 날씨 홈 카드, 날씨 상세, 실내 활동 추천의 날씨 bundle 조회

## 1. 기존 구조

- 앱 클라이언트가 Open-Meteo Forecast endpoint를 직접 호출했다.
- 앱 클라이언트가 Open-Meteo Air Quality endpoint를 직접 호출했다.
- React Query staleTime은 2분, gcTime은 10분이었다.
- zustand/AsyncStorage preview TTL은 3분이었다.
- focus refresh는 60초 기준이었다.
- 동일 지역 다수 사용자를 30분~1시간 단위로 묶는 서버 cache가 없었다.

## 2. 리스크

- Open-Meteo Free/Open API는 non-commercial 사용 조건을 기준으로 보아야 한다.
- production commercial path에서는 customer API/API key 사용 여부를 운영 판단으로 분리해야 한다.
- 무료 endpoint를 앱 번들 direct call로 고정하면 호출량 급증, upstream 차단, 운영 불안정 리스크가 남는다.
- 앱에 API key를 넣으면 key 회수와 오남용 방어가 어렵다.
- raw 좌표 단위 cache key는 사용자의 정밀 위치를 불필요하게 오래 남기고, 미세 위치 변화마다 provider 호출을 유발할 수 있다.

## 3. 변경 구조

- 앱은 Supabase Edge Function `weather-cache`만 호출한다.
- `weather-cache`가 Open-Meteo forecast와 air quality를 서버에서 호출한다.
- cache table은 `public.nuri_weather_cache`다.
- RLS는 enable 상태이며 앱 클라이언트 public select/insert/update policy는 열지 않는다.
- Edge Function은 service role로 cache table을 읽고 쓴다.
- API key와 customer endpoint는 서버 환경변수로만 관리한다.

## 4. Cache Contract

- cache key: `provider + coord_bucket + locale`
- coord bucket: 0.02도 단위
- locale key: `locale|timezone`
- fresh TTL: 60분
- stale fallback: 6시간
- forecast와 air quality는 같은 TTL의 bundle로 묶는다.
- provider 실패 시 fresh cache가 없고 stale cache가 있으면 `source=stale_cache`로 반환한다.
- provider 실패와 stale cache 부재가 겹치면 stable error code를 반환한다.

## 5. Edge Function Request

```json
{
  "latitude": 37.674,
  "longitude": 126.769,
  "locale": "ko-KR",
  "timezone": "Asia/Seoul"
}
```

## 6. Edge Function Response

```json
{
  "ok": true,
  "data": {
    "forecast": {},
    "airQuality": {},
    "provider": "open-meteo",
    "coordBucket": "v1:37.68:126.76:d0.02",
    "coordBucketSizeDegrees": 0.02,
    "timezone": "Asia/Seoul",
    "attribution": {
      "label": "Open-Meteo",
      "url": "https://open-meteo.com/"
    }
  },
  "source": "fresh_cache",
  "fetchedAt": "2026-04-29T03:00:00.000Z",
  "expiresAt": "2026-04-29T04:00:00.000Z",
  "staleUntil": "2026-04-29T09:00:00.000Z",
  "coordBucket": "v1:37.68:126.76:d0.02",
  "attribution": {
    "label": "Open-Meteo",
    "url": "https://open-meteo.com/"
  }
}
```

## 7. Stable Error Codes

- `invalid_coordinates`
- `weather_cache_unconfigured`
- `weather_cache_read_failed`
- `weather_cache_write_failed`
- `weather_provider_unconfigured`
- `weather_forecast_provider_failed`
- `weather_air_quality_provider_failed`
- `weather_provider_unavailable`
- `method_not_allowed`

## 8. 환경변수

- `OPEN_METEO_BASE_URL`
- `OPEN_METEO_AIR_QUALITY_BASE_URL`
- `OPEN_METEO_API_KEY`
- `OPEN_METEO_PROVIDER_MODE`

`OPEN_METEO_PROVIDER_MODE=customer`일 때는 API key가 필수다. API key 값은 앱 코드, public config, 문서, 로그에 남기지 않는다.

## 9. 개인정보와 로그 정책

- cache table에는 raw latitude/longitude를 저장하지 않는다.
- cache key는 0.02도 bucket만 저장한다.
- user id와 좌표를 함께 저장하지 않는다.
- debug 로그는 `source`, `coordBucket`, `resultStatus`, `elapsedMs`, `hasAirQuality`만 허용한다.
- raw 좌표, user id, API key, provider full URL, provider full payload는 로그 금지다.

## 10. Production 적용 결과

- [x] `20260429130000_weather_cache_proxy.sql` remote apply
- [x] `public.nuri_weather_cache` table 존재, RLS enabled, public policy 0개, `service_role` 권한 구조 확인
- [x] `OPEN_METEO_BASE_URL`, `OPEN_METEO_AIR_QUALITY_BASE_URL`, `OPEN_METEO_PROVIDER_MODE` Supabase secret 설정
- [x] `weather-cache` Edge Function `--no-verify-jwt` deploy, `ACTIVE` v2 확인
- [x] remote function smoke
  - 1차 호출: HTTP 200, `source=provider`, forecast/airQuality/attribution/`expiresAt`/`staleUntil` 포함
  - 2차 동일 호출: HTTP 200, `source=fresh_cache`
- [x] Android 홈 날씨 카드와 날씨 상세 smoke
  - `SM_S937N` 기준 홈 카드, 상세 `오늘의 날씨`, 미세먼지, 주간 예보, 대기 질 정보 렌더링 확인
  - 홈/상세 `날씨 데이터: Open-Meteo` attribution 확인
- [x] Android logcat 비용 방어 검증
  - `weather-cache completed` 1건, `source=fresh_cache`, `hasAirQuality=true`
  - `api.open-meteo`, `air-quality-api.open-meteo`, `openmeteo` 직접 호출 0건

## 11. Closeout 판정

- 현재 완성도: 96%
- v1.0 판정: close
- PO Lock-in: 2026-04-30
- 감점/후행 항목
  - Open-Meteo customer API key/계약 확인은 v1.0 blocker는 아니나 운영 고도화 항목이며, v1.1 기술 부채로 이관한다.
  - `weather-cache` public endpoint abuse throttle/rate limit은 v1.0 blocker는 아니나 운영 고도화 항목이며, v1.1 기술 부채로 이관한다.
  - RC 빌드 최종 스크린샷은 release asset/smoke lane에서 별도 확보한다.
