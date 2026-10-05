// Presentation mapping consumes the NURI schema, never a provider-specific payload.
import { addDaysToYmd, getKstYmd } from '../../utils/date';
import type { WeatherApiV1, WeatherMetric } from './domain';
import { getCurrentWeatherIsDaytime } from './dayPhase';
import {
  buildWeatherGuideBundleForScenario,
  buildWeatherPrecipitationSafety,
  buildWeatherTemperatureSafety,
  type WeatherGuideBundle,
  type WeatherIconKey,
  type WeatherMeasurement,
  type AirQualityMetric,
} from './guide';
import { getWeatherAdvice } from './presentation';
import { parseWeatherTime } from './reliability';
// Explicit compatibility export for rollback tests; the production hook uses only the v1 mapper.
export { buildWeatherGuideBundleFromApi } from './legacyMapper';

function icon(code: number, isDay: boolean): WeatherIconKey {
  if ([95, 96, 99].includes(code)) return 'weather-lightning';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'weather-snowy';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return 'weather-pouring';
  if ([45, 48].includes(code)) return 'weather-fog';
  if ([1, 2].includes(code))
    return isDay ? 'weather-partly-cloudy' : 'weather-night-partly-cloudy';
  if (code === 0)
    return isDay ? 'weather-sunny' : 'weather-night-partly-cloudy';
  return 'weather-cloudy';
}
function airMetrics(data: WeatherApiV1): AirQualityMetric[] {
  return (['pm10', 'pm25', 'ozone'] as const).map(key => {
    const metric = data.airQuality[key];
    const stamp = parseWeatherTime(metric.meta.validAt ?? undefined);
    const value = metric.value;
    const label =
      key === 'pm10' ? '미세먼지' : key === 'pm25' ? '초미세먼지' : '오존';
    if (
      value === null ||
      stamp === null ||
      Date.now() - stamp >= 7200000 ||
      stamp > Date.now() + 300000
    )
      return {
        key,
        label,
        tone: 'unknown',
        progress: 0,
        valueLabel: '확인 중',
      };
    const suffix =
      metric.meta.kind === 'AIR_QUALITY_OBSERVED' ? '관측 농도' : '예측 농도';
    if (key === 'ozone')
      return {
        key,
        label,
        tone: 'unknown',
        progress: 0,
        valueLabel: `${Math.round(value)} μg/m³ · ${suffix}`,
      };
    const rounded = Math.round(value),
      bad = key === 'pm10' ? 81 : 36,
      moderate = key === 'pm10' ? 31 : 16;
    const tone =
      rounded >= bad ? 'bad' : rounded >= moderate ? 'moderate' : 'good';
    const grade =
      rounded >= (key === 'pm10' ? 151 : 76)
        ? '매우 나쁨'
        : tone === 'bad'
        ? '나쁨'
        : tone === 'moderate'
        ? '보통'
        : '좋음';
    return {
      key,
      label,
      tone,
      progress: Math.max(
        0.08,
        Math.min(1, value / (key === 'pm10' ? 150 : 75)),
      ),
      valueLabel: `${grade} · ${rounded} μg/m³`,
    };
  });
}
const koreanTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('ko-KR', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Seoul',
      }).format(new Date(value))
    : null;

export function buildWeatherGuideBundleFromNuri(input: {
  district: string;
  weather: WeatherApiV1;
}): WeatherGuideBundle {
  const { weather } = input,
    current = weather.current,
    today = getKstYmd();
  if (
    current.temperature.value === null ||
    current.weatherCode.value === null
  ) {
    throw new Error('weather_current_required');
  }
  const code = current.weatherCode.value,
    isDay = getCurrentWeatherIsDaytime();
  const weatherIcon = icon(code, isDay);
  const scenario =
    weatherIcon === 'weather-snowy'
      ? 'snow'
      : weatherIcon === 'weather-pouring'
      ? 'rain'
      : 'fresh';
  const base = buildWeatherGuideBundleForScenario(scenario, input.district, {
    isDaytime: isDay,
  });
  const missing: WeatherMeasurement[] = [];
  const read = (
    key: WeatherMeasurement,
    metric: WeatherMetric | undefined,
    precision = 0,
  ) => {
    if (metric?.value === null || metric?.value === undefined) {
      missing.push(key);
      return 0;
    }
    return Math.round(metric.value * 10 ** precision) / 10 ** precision;
  };
  const day = weather.daily.find(d => d.date === today);
  const temperature = Math.round(current.temperature.value),
    apparent = read('apparentTemperature', current.apparentTemperature);
  const airQualityMetrics = airMetrics(weather),
    airQualityConcern = airQualityMetrics.some(
      m => m.key !== 'ozone' && m.tone === 'bad',
    );
  const weekday = new Intl.DateTimeFormat('ko-KR', {
    weekday: 'short',
    timeZone: 'Asia/Seoul',
  });
  const weekly = weather.daily
    .filter(
      d =>
        d.date >= today &&
        d.weatherCode.value !== null &&
        d.highTemperature.value !== null &&
        d.lowTemperature.value !== null,
    )
    .map(d => ({
      key: d.date,
      label:
        d.date === today
          ? '오늘'
          : d.date === addDaysToYmd(today, 1)
          ? '내일'
          : weekday.format(new Date(`${d.date}T12:00:00+09:00`)),
      icon: icon(d.weatherCode.value ?? 0, isDay),
      temperature: Math.round(d.highTemperature.value ?? 0),
      lowTemperature: Math.round(d.lowTemperature.value ?? 0),
      precipitationChance:
        d.precipitationProbability.value === null
          ? undefined
          : Math.round(d.precipitationProbability.value),
    }));
  const attribution =
    weather.sources.find(s => s.state === 'ACTIVE' && s.kind === 'FORECAST')
      ?.attribution ?? undefined;
  const bundle: WeatherGuideBundle = {
    ...base,
    district: input.district,
    scenario,
    dataSource: weather.freshness.state === 'STALE_SAFE' ? 'preview' : 'live',
    attribution,
    fetchedAt: weather.freshness.retrievedAt,
    expiresAt: weather.freshness.expiresAt,
    staleUntil: weather.freshness.staleUntil,
    coordBucket: weather.location.key,
    forecastValidAt: current.temperature.meta.validAt ?? undefined,
    forecastDate: today,
    airQualityValidAt: weather.airQuality.pm10.meta.validAt ?? undefined,
    hourly: weather.hourly.map(h => ({
      endsAt: h.endsAt,
      precipitationChance:
        h.precipitationProbability.value === null
          ? null
          : Math.round(h.precipitationProbability.value),
      precipitationMm:
        h.precipitationAmount.value === null
          ? null
          : Math.round(h.precipitationAmount.value * 10) / 10,
    })),
    missingMeasurements: missing,
    airQualityConcern,
    weatherIcon,
    isDaytime: isDay,
    currentTemperature: temperature,
    apparentTemperature: apparent,
    temperatureSafety: buildWeatherTemperatureSafety(
      temperature,
      missing.includes('apparentTemperature') ? null : apparent,
    ),
    precipitationSafety: buildWeatherPrecipitationSafety(scenario, weatherIcon),
    highTemperature: read('highTemperature', day?.highTemperature),
    lowTemperature: read('lowTemperature', day?.lowTemperature),
    humidity: read('humidity', current.humidity),
    windSpeed: read('windSpeed', current.windSpeed, 1),
    cloudCover: read('cloudCover', current.cloudCover),
    uvIndex: read('uvIndex', day?.uvIndex, 1),
    sunriseTime: koreanTime(day?.sunrise.value ?? null),
    sunsetTime: koreanTime(day?.sunset.value ?? null),
    weekly,
    airQualityMetrics,
    detailStatus:
      weatherIcon === 'weather-lightning'
        ? '천둥·번개'
        : weatherIcon === 'weather-pouring'
        ? '비'
        : weatherIcon === 'weather-snowy'
        ? '눈'
        : weatherIcon === 'weather-fog'
        ? '안개'
        : code === 3
        ? '흐림'
        : code === 2
        ? '구름 많음'
        : code === 0
        ? '맑음'
        : '구름 조금',
    recommendedGuideKeys:
      airQualityConcern && scenario === 'fresh'
        ? buildWeatherGuideBundleForScenario('dusty', input.district, {
            isDaytime: isDay,
          }).recommendedGuideKeys
        : base.recommendedGuideKeys,
  };
  const advice = getWeatherAdvice(bundle);
  return {
    ...bundle,
    homeMessage: advice.headline,
    homeCaption: advice.caption,
    detailHeadline: advice.headline,
    activityCardTitle: advice.label,
    activityCardBody: advice.detail,
    activityButtonLabel: advice.caution
      ? '실내 활동 살펴보기'
      : '산책 기록 보기',
  };
}
