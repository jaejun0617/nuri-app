import {
  createCoordBucket,
  WeatherCacheHttpError,
} from './weather-cache-core.js';

export const WEATHER_API_VERSION = 'nuri.weather.v1';
const codes = new Set([
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77,
  80, 81, 82, 85, 86, 95, 96, 99,
]);
export function validForecastCurrent(value, now = Date.now()) {
  const time = weatherTimestamp(value?.current?.time);
  return (
    time !== null &&
    Date.parse(time) <= now + 300000 &&
    now - Date.parse(time) < 3600000 &&
    weatherNumber(value?.current?.temperature_2m, -100, 70) !== null &&
    codes.has(value?.current?.weather_code)
  );
}
export const PROVIDER_CAPABILITIES = Object.freeze([
  { source: 'open-meteo-forecast', kind: 'FORECAST', state: 'ACTIVE' },
  { source: 'open-meteo-aq', kind: 'AIR_QUALITY_FORECAST', state: 'ACTIVE' },
  { source: 'kma-observation', kind: 'OBSERVED', state: 'READY_INACTIVE' },
  { source: 'kma-warning', kind: 'WARNING', state: 'READY_INACTIVE' },
  { source: 'airkorea', kind: 'AIR_QUALITY_OBSERVED', state: 'READY_INACTIVE' },
  { source: 'kma-nowcast', kind: 'NOWCAST', state: 'READY_INACTIVE' },
]);

export function weatherTimestamp(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(
      value,
    )
  )
    return null;
  const day = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (
    !Number.isFinite(day.getTime()) ||
    day.toISOString().slice(0, 10) !== value.slice(0, 10) ||
    Number(value.slice(11, 13)) > 23 ||
    Number(value.slice(14, 16)) > 59 ||
    (/^\d{2}$/.test(value.slice(17, 19)) && Number(value.slice(17, 19)) > 59)
  )
    return null;
  const date = new Date(
    /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}+09:00`,
  );
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
export function weatherNumber(value, min = -Infinity, max = Infinity) {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
    ? value
    : null;
}

export function normalizeApiRequest(body) {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).some(
      k => !['latitude', 'longitude', 'locale', 'timezone'].includes(k),
    )
  )
    throw new WeatherCacheHttpError(
      400,
      'invalid_weather_request',
      'invalid weather request',
    );
  if (
    (body.locale ?? 'ko-KR') !== 'ko-KR' ||
    (body.timezone ?? 'Asia/Seoul') !== 'Asia/Seoul'
  )
    throw new WeatherCacheHttpError(
      400,
      'invalid_weather_locale',
      'invalid locale',
    );
  if (
    ['latitude', 'longitude'].some(
      k => typeof body[k] !== 'number' || !Number.isFinite(body[k]),
    )
  )
    throw new WeatherCacheHttpError(
      400,
      'invalid_coordinates',
      'invalid coordinates',
    );
  // Precise coordinates are accepted transiently; only the coarse bucket is retained/sent upstream.
  const bucket = createCoordBucket(body);
  return {
    body: {
      latitude: bucket.latitude,
      longitude: bucket.longitude,
      locale: 'ko-KR',
      timezone: 'Asia/Seoul',
    },
    bucket,
  };
}

export function measurement(value, unit, context) {
  const available = value !== null;
  return {
    value,
    meta: {
      ...context,
      unit,
      quality: available ? context.quality : 'UNAVAILABLE',
    },
  };
}

// Domestic adapters supply already validated measurements. Never average observation and model data.
export function selectMeasurement(candidates, kindPriority, now = Date.now()) {
  for (const kind of kindPriority) {
    const found = candidates.find(
      c =>
        c?.meta?.kind === kind &&
        weatherNumber(c.value) !== null &&
        ['VALID', 'PARTIAL'].includes(c.meta.quality) &&
        weatherTimestamp(c.meta.validAt) &&
        weatherTimestamp(c.meta.retrievedAt) &&
        weatherTimestamp(c.meta.expiresAt) &&
        Date.parse(c.meta.retrievedAt) <= now + 120000 &&
        Date.parse(c.meta.expiresAt) > now &&
        Date.parse(c.meta.validAt) <= now + 300000,
    );
    if (found) return found;
  }
  return null;
}

export function validateWarning(value) {
  return Boolean(
    value &&
      typeof value.id === 'string' &&
      typeof value.title === 'string' &&
      value.meta?.kind === 'WARNING' &&
      value.meta.source === 'kma-warning' &&
      weatherTimestamp(value.meta.issuedAt) &&
      weatherTimestamp(value.meta.validAt) &&
      weatherTimestamp(value.meta.expiresAt) &&
      typeof value.regionCode === 'string',
  );
}
export function validateNowcast(value) {
  return Boolean(
    value &&
      value.meta?.kind === 'NOWCAST' &&
      value.meta.source === 'kma-nowcast' &&
      weatherTimestamp(value.meta.validAt) &&
      weatherTimestamp(value.meta.retrievedAt) &&
      weatherTimestamp(value.meta.expiresAt) &&
      weatherNumber(value.precipitationMm, 0) !== null,
  );
}

export function projectWeatherV1(response, now = Date.now()) {
  const forecast = response?.data?.forecast;
  const current = forecast?.current;
  const retrievedAt = weatherTimestamp(response?.fetchedAt);
  const expiresAt = weatherTimestamp(response?.expiresAt);
  const staleUntil = weatherTimestamp(response?.staleUntil);
  const validAt = weatherTimestamp(current?.time);
  if (
    !retrievedAt ||
    !expiresAt ||
    !staleUntil ||
    !validAt ||
    now - Date.parse(retrievedAt) >= 3600000 ||
    Date.parse(retrievedAt) > now + 120000 ||
    Date.parse(staleUntil) <= now ||
    Date.parse(validAt) > now + 300000 ||
    weatherNumber(current?.temperature_2m, -100, 70) === null ||
    !codes.has(current?.weather_code)
  )
    throw new WeatherCacheHttpError(
      503,
      'weather_data_unavailable',
      'weather data unavailable',
    );
  const stale =
    response.source === 'stale_cache' ||
    Date.parse(expiresAt) <= now ||
    now - Date.parse(validAt) >= 3600000;
  const quality = stale ? 'STALE' : 'VALID';
  const context = {
    source: 'open-meteo-forecast',
    kind: 'FORECAST',
    issuedAt: null,
    validAt,
    retrievedAt,
    expiresAt,
    locationKey: response.coordBucket,
    quality,
  };
  const metric = (v, u, min = -Infinity, max = Infinity, ctx = context) =>
    measurement(weatherNumber(v, min, max), u, ctx);
  const windUnit = forecast?.current_units?.wind_speed_10m;
  const windFactor = {
    'm/s': 1,
    'km/h': 1 / 3.6,
    mph: 0.44704,
    'mp/h': 0.44704,
    kn: 0.514444,
    knots: 0.514444,
  }[windUnit ?? 'km/h'];
  const wind = weatherNumber(current.wind_speed_10m, 0);
  const resultCurrent = {
    temperature: metric(current.temperature_2m, '°C', -100, 70),
    apparentTemperature: metric(current.apparent_temperature, '°C', -120, 90),
    weatherCode: metric(current.weather_code, 'WMO'),
    humidity: metric(current.relative_humidity_2m, '%', 0, 100),
    windSpeed: metric(
      wind !== null && windFactor !== undefined ? wind * windFactor : null,
      'm/s',
      0,
    ),
    cloudCover: metric(current.cloud_cover, '%', 0, 100),
  };
  const seen = new Set();
  const hourly = (
    Array.isArray(forecast?.hourly?.time) ? forecast.hourly.time : []
  )
    .slice(0, 192)
    .flatMap((time, i) => {
      const endsAt = weatherTimestamp(time);
      if (!endsAt || seen.has(endsAt)) return [];
      seen.add(endsAt);
      const ctx = { ...context, validAt: endsAt };
      return [
        {
          endsAt,
          startsAt: new Date(Date.parse(endsAt) - 3600000).toISOString(),
          precipitationProbability: metric(
            forecast.hourly_units?.precipitation_probability === '%'
              ? forecast.hourly?.precipitation_probability?.[i]
              : null,
            '%',
            0,
            100,
            ctx,
          ),
          precipitationAmount: metric(
            forecast.hourly_units?.precipitation === 'mm'
              ? forecast.hourly?.precipitation?.[i]
              : null,
            'mm',
            0,
            Infinity,
            ctx,
          ),
        },
      ];
    })
    .sort((a, b) => a.endsAt.localeCompare(b.endsAt))
    .slice(0, 192);
  const seenDays = new Set();
  const daily = (
    Array.isArray(forecast?.daily?.time) ? forecast.daily.time : []
  )
    .slice(0, 16)
    .flatMap((date, i) => {
      const stamp = weatherTimestamp(`${date}T00:00:00+09:00`);
      if (!stamp || seenDays.has(date)) return [];
      seenDays.add(date);
      const ctx = { ...context, validAt: stamp };
      const raw = forecast.daily;
      return [
        {
          date,
          weatherCode: metric(
            codes.has(raw.weather_code?.[i]) ? raw.weather_code[i] : null,
            'WMO',
            0,
            99,
            ctx,
          ),
          highTemperature: metric(
            raw.temperature_2m_max?.[i],
            '°C',
            -100,
            70,
            ctx,
          ),
          lowTemperature: metric(
            raw.temperature_2m_min?.[i],
            '°C',
            -100,
            70,
            ctx,
          ),
          uvIndex: metric(raw.uv_index_max?.[i], 'index', 0, 30, ctx),
          precipitationProbability: metric(
            raw.precipitation_probability_max?.[i],
            '%',
            0,
            100,
            ctx,
          ),
          sunrise: measurement(
            weatherTimestamp(raw.sunrise?.[i]),
            'ISO8601',
            ctx,
          ),
          sunset: measurement(
            weatherTimestamp(raw.sunset?.[i]),
            'ISO8601',
            ctx,
          ),
        },
      ];
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 7);
  const air = response.data?.airQuality;
  const airTime = weatherTimestamp(air?.current?.time);
  const usableAir =
    airTime &&
    now - Date.parse(airTime) < 7200000 &&
    Date.parse(airTime) <= now + 300000;
  const airContext = {
    ...context,
    source: 'open-meteo-aq',
    kind: 'AIR_QUALITY_FORECAST',
    validAt: airTime,
  };
  const airMetric = key =>
    metric(
      usableAir &&
        ['μg/m³', 'µg/m³', 'ug/m³'].includes(air?.current_units?.[key])
        ? air.current?.[key]
        : null,
      'μg/m³',
      0,
      Infinity,
      airContext,
    );
  const airQuality = {
    availability: usableAir ? 'available' : 'unavailable',
    pm10: airMetric('pm10'),
    pm25: airMetric('pm2_5'),
    ozone: airMetric('ozone'),
  };
  const missing =
    Object.values(resultCurrent).filter(m => m.value === null).length +
    Object.values(airQuality).filter(m => m?.value === null).length;
  return {
    apiVersion: WEATHER_API_VERSION,
    location: {
      key: response.coordBucket,
      bucketSizeDegrees: 0.02,
      timezone: 'Asia/Seoul',
      locale: 'ko-KR',
    },
    current: resultCurrent,
    hourly,
    daily,
    airQuality,
    warnings: { availability: 'unavailable', items: [] },
    nowcast: { availability: 'unavailable', items: [] },
    sun: daily.map(day => ({
      date: day.date,
      sunrise: day.sunrise,
      sunset: day.sunset,
    })),
    freshness: {
      state: stale ? 'STALE_SAFE' : 'FRESH',
      retrievedAt,
      expiresAt,
      staleUntil,
      cache: response.source,
      quality: stale ? 'STALE' : missing ? 'PARTIAL' : 'VALID',
      fallbackReason: response.fallbackReason ?? null,
    },
    sources: PROVIDER_CAPABILITIES.map(s => ({
      ...s,
      attribution:
        s.state === 'ACTIVE'
          ? { label: 'Open-Meteo', url: 'https://open-meteo.com/' }
          : null,
    })),
    missingFields: missing,
  };
}

export function unavailableWeatherV1(bucket, code) {
  return {
    apiVersion: WEATHER_API_VERSION,
    location: {
      key: bucket.key,
      bucketSizeDegrees: 0.02,
      timezone: 'Asia/Seoul',
      locale: 'ko-KR',
    },
    current: null,
    hourly: [],
    daily: [],
    airQuality: { availability: 'unavailable' },
    warnings: { availability: 'unavailable', items: [] },
    nowcast: { availability: 'unavailable', items: [] },
    sun: [],
    freshness: {
      state: 'UNAVAILABLE',
      quality: 'UNAVAILABLE',
      fallbackReason: code,
    },
    sources: PROVIDER_CAPABILITIES,
  };
}
