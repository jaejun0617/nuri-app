import { getKstYmd } from '../../utils/date';
import type { WeatherForecastResponse } from './legacy';
import {
  createPreviewWeatherGuideBundle,
  createUnavailableWeatherGuideBundle,
  type HourlyWeatherItem,
  type WeatherGuideBundle,
} from './guide';
import {
  WEATHER_CURRENT_MAX_AGE_MS,
  WEATHER_LIVE_MAX_AGE_MS,
  WEATHER_PREVIEW_MAX_AGE_MS,
} from './policy';

/** Offset-free provider times belong to the requested Korea timezone, never the device zone. */
export function parseWeatherTime(value: string | undefined): number | null {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(
      value,
    )
  )
    return null;
  const calendar = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (
    !Number.isFinite(calendar.getTime()) ||
    calendar.toISOString().slice(0, 10) !== value.slice(0, 10) ||
    Number(value.slice(11, 13)) > 23 ||
    Number(value.slice(14, 16)) > 59 ||
    (value.length >= 19 &&
      /^\d{2}$/.test(value.slice(17, 19)) &&
      Number(value.slice(17, 19)) > 59)
  )
    return null;
  const time = Date.parse(
    /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}+09:00`,
  );
  return Number.isFinite(time) ? time : null;
}

export function getWeatherOriginTime(
  bundle: WeatherGuideBundle,
): number | null {
  return parseWeatherTime(bundle.fetchedAt);
}

export function buildHourlyWeather(
  forecast: WeatherForecastResponse,
): HourlyWeatherItem[] {
  const seen = new Set<number>();
  const times = forecast.hourly?.time;
  return (Array.isArray(times) ? times : [])
    .flatMap((time, index): HourlyWeatherItem[] => {
      const stamp = parseWeatherTime(time);
      if (stamp === null || seen.has(stamp)) return [];
      seen.add(stamp);
      const chance = forecast.hourly?.precipitation_probability?.[index];
      const amount = forecast.hourly?.precipitation?.[index];
      return [
        {
          endsAt: new Date(stamp).toISOString(),
          precipitationChance:
            forecast.hourly_units?.precipitation_probability === '%' &&
            typeof chance === 'number' &&
            Number.isFinite(chance) &&
            chance >= 0 &&
            chance <= 100
              ? Math.round(chance)
              : null,
          precipitationMm:
            forecast.hourly_units?.precipitation === 'mm' &&
            typeof amount === 'number' &&
            Number.isFinite(amount) &&
            amount >= 0
              ? Math.round(amount * 10) / 10
              : null,
        },
      ];
    })
    .sort((a, b) => Date.parse(a.endsAt) - Date.parse(b.endsAt));
}

export function getUpcomingWeatherHours(
  weather: WeatherGuideBundle,
  now = Date.now(),
) {
  return (weather.hourly ?? [])
    .filter(item => {
      const end = parseWeatherTime(item.endsAt);
      return end !== null && end > now && end <= now + 12 * 60 * 60 * 1000;
    })
    .slice(0, 12);
}

export function formatWeatherHourRange(item: HourlyWeatherItem) {
  const end = parseWeatherTime(item.endsAt);
  if (end === null) return '시각 확인 중';
  const hour = (stamp: number) =>
    String(new Date(stamp + 9 * 60 * 60 * 1000).getUTCHours()).padStart(2, '0');
  const midnight = hour(end) === '00';
  return `${hour(end - 60 * 60 * 1000)}–${midnight ? '24' : hour(end)}시`;
}

/** A successful cache read must not extend the original provider freshness. */
export function resolveWeatherFreshness(
  bundle: WeatherGuideBundle,
  now = Date.now(),
): WeatherGuideBundle {
  if (bundle.dataSource === 'unavailable') return bundle;
  const fetched = getWeatherOriginTime(bundle);
  const valid = parseWeatherTime(bundle.forecastValidAt);
  const expires = parseWeatherTime(bundle.expiresAt);
  const stale = parseWeatherTime(bundle.staleUntil);
  if (
    fetched === null ||
    valid === null ||
    fetched > now + 2 * 60 * 1000 ||
    valid > now + 5 * 60 * 1000 ||
    now - fetched >= WEATHER_PREVIEW_MAX_AGE_MS ||
    (stale !== null && now >= stale)
  ) {
    return createUnavailableWeatherGuideBundle(bundle.district);
  }
  const isLive =
    bundle.dataSource === 'live' &&
    expires !== null &&
    now < expires &&
    now - fetched < WEATHER_LIVE_MAX_AGE_MS &&
    now - valid < WEATHER_CURRENT_MAX_AGE_MS;
  const result = isLive ? bundle : createPreviewWeatherGuideBundle(bundle);
  const today = getKstYmd(new Date(now));
  const weekly = result.weekly
    .filter(item => item.key >= today)
    .map(item => ({
      ...item,
      label:
        item.key === today
          ? '오늘'
          : item.label === '오늘'
          ? '이전 예보'
          : item.label,
    }));
  return {
    ...result,
    weekly,
    ...(parseWeatherTime(result.airQualityValidAt) === null ||
    now - (parseWeatherTime(result.airQualityValidAt) ?? 0) >=
      2 * 60 * 60 * 1000
      ? {
          airQualityConcern: false,
          airQualityValidAt: undefined,
          airQualityMetrics: result.airQualityMetrics.map(metric => ({
            ...metric,
            tone: 'unknown' as const,
            valueLabel: '확인 중',
            progress: 0,
          })),
        }
      : {}),
    ...(result.forecastDate !== today
      ? {
          sunriseTime: null,
          sunsetTime: null,
          missingMeasurements: [
            ...new Set([
              ...(result.missingMeasurements ?? []),
              'highTemperature',
              'lowTemperature',
              'uvIndex',
            ] as const),
          ],
        }
      : {}),
  };
}
