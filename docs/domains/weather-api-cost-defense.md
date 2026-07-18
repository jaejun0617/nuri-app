# 날씨 API 비용 방어 구조

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
