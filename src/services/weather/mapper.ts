// 파일: src/services/weather/mapper.ts
// 역할:
// - weather-cache provider 응답을 현재 앱의 WeatherGuideBundle 모델로 변환
// - 화면 공통 번들 구조에 실제 API 데이터를 일관되게 매핑하는 계층

import type { DeviceCoordinates } from '../location/currentPosition';
import type {
  WeatherAirQualityResponse,
  WeatherDataAttribution,
  WeatherForecastResponse,
} from './api';
import { addDaysToYmd, getKstYmd, safeYmd } from '../../utils/date';
import { getCurrentWeatherIsDaytime } from './dayPhase';
import {
  buildWeatherGuideBundleForScenario,
  buildWeatherPrecipitationSafety,
  buildWeatherTemperatureSafety,
  createUnavailableWeatherGuideBundle,
  type AirQualityMetric,
  type AirQualityTone,
  type WeatherDataSource,
  type WeatherGuideBundle,
  type WeatherIconKey,
  type WeatherScenario,
  type WeeklyWeatherItem,
  type WeatherMeasurement,
} from './guide';
import { getWeatherAdvice } from './presentation';
import { buildHourlyWeather, parseWeatherTime } from './reliability';

function getAirTone(
  value: number,
  badThreshold: number,
  moderateThreshold: number,
): AirQualityTone {
  if (value >= badThreshold) return 'bad';
  if (value >= moderateThreshold) return 'moderate';
  return 'good';
}

function getProgress(value: number, max: number) {
  return Math.max(0.08, Math.min(1, value / max));
}

function mapWeatherCodeToIcon(code: number, isDay: boolean): WeatherIconKey {
  if ([95, 96, 99].includes(code)) {
    return 'weather-lightning';
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return 'weather-snowy';
  }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return 'weather-pouring';
  }
  if ([45, 48].includes(code)) {
    return 'weather-fog';
  }
  if ([1, 2].includes(code)) {
    return isDay ? 'weather-partly-cloudy' : 'weather-night-partly-cloudy';
  }
  if (code === 3) {
    return 'weather-cloudy';
  }
  if (code === 0) {
    return isDay ? 'weather-sunny' : 'weather-night-partly-cloudy';
  }
  return 'weather-cloudy';
}

function mapScenarioFromData(input: { weatherCode: number }): WeatherScenario {
  if ([71, 73, 75, 77, 85, 86].includes(input.weatherCode)) {
    return 'snow';
  }
  if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(
      input.weatherCode,
    )
  ) {
    return 'rain';
  }
  return 'fresh';
}

function buildWeeklyItems(
  daily: WeatherForecastResponse['daily'],
  isDay: boolean,
): WeeklyWeatherItem[] {
  const weekday = new Intl.DateTimeFormat('ko-KR', {
    weekday: 'short',
    timeZone: 'Asia/Seoul',
  });

  const today = getKstYmd();
  return (daily?.time ?? [])
    .flatMap((_, index): WeeklyWeatherItem[] => {
      const weatherCode = daily?.weather_code?.[index];
      const dateString = safeYmd(daily?.time?.[index]);
      const date = dateString ? new Date(`${dateString}T12:00:00+09:00`) : null;
      const high = daily?.temperature_2m_max?.[index];
      const low = daily?.temperature_2m_min?.[index];
      if (
        !dateString ||
        dateString < today ||
        !date ||
        !isFiniteNumber(high) ||
        !isFiniteNumber(low) ||
        !isFiniteNumber(weatherCode)
      )
        return [];
      const dayLabel =
        dateString === today
          ? '오늘'
          : dateString === addDaysToYmd(today, 1)
          ? '내일'
          : weekday.format(date);

      const chance = daily?.precipitation_probability_max?.[index];
      return [
        {
          key: dateString,
          label: dayLabel,
          icon: mapWeatherCodeToIcon(weatherCode, isDay),
          temperature: Math.round(high),
          lowTemperature: Math.round(low),
          precipitationChance:
            isFiniteNumber(chance) && chance >= 0 && chance <= 100
              ? Math.round(chance)
              : undefined,
        },
      ];
    })
    .slice(0, 7);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatKoreanTime(iso: string | undefined): string | null {
  if (!iso) return null;

  // Provider timestamps without an offset are local to the requested KST zone.
  const date = new Date(
    /(?:Z|[+-]\d{2}:\d{2})$/.test(iso) ? iso : `${iso}+09:00`,
  );
  if (Number.isNaN(date.getTime())) return null;

  const formatter = new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Seoul',
  });

  return formatter.format(date);
}

function buildAirQualityMetrics(
  response: WeatherAirQualityResponse | null | undefined,
): AirQualityMetric[] {
  const air = response?.current;
  return (['pm10', 'pm25', 'ozone'] as const).map(key => {
    const field = key === 'pm25' ? 'pm2_5' : key;
    const value = air?.[field];
    const label =
      key === 'pm10' ? '미세먼지' : key === 'pm25' ? '초미세먼지' : '오존';
    const units = response?.current_units?.[field] ?? 'μg/m³';
    if (
      !isFiniteNumber(value) ||
      value < 0 ||
      !['μg/m³', 'µg/m³', 'ug/m³'].includes(units)
    ) {
      return {
        key,
        label,
        valueLabel: '확인 중',
        tone: 'unknown',
        progress: 0,
      };
    }
    // Ozone mass concentration cannot be compared directly with Korean ppm bands.
    if (key === 'ozone')
      return {
        key,
        label,
        valueLabel: `${Math.round(value)} μg/m³ · 예측 농도`,
        tone: 'unknown',
        progress: 0,
      };
    const rounded = Math.round(value);
    const tone = getAirTone(
      rounded,
      key === 'pm10' ? 81 : 36,
      key === 'pm10' ? 31 : 16,
    );
    const veryBad = rounded >= (key === 'pm10' ? 151 : 76);
    const grade = veryBad
      ? '매우 나쁨'
      : tone === 'bad'
      ? '나쁨'
      : tone === 'moderate'
      ? '보통'
      : '좋음';
    return {
      key,
      label,
      valueLabel: `${grade} · ${rounded} μg/m³`,
      tone,
      progress: getProgress(value, key === 'pm10' ? 150 : 75),
    };
  });
}

export function buildWeatherGuideBundleFromApi(input: {
  district: string;
  coords: DeviceCoordinates;
  forecast: WeatherForecastResponse;
  airQuality?: WeatherAirQualityResponse | null;
  dataSource?: Extract<WeatherDataSource, 'live' | 'preview'>;
  attribution?: WeatherDataAttribution;
  fetchedAt?: string;
  expiresAt?: string;
  staleUntil?: string;
  coordBucket?: string;
  fallbackAirQualityMetrics?: AirQualityMetric[];
  fallbackAirQualityConcern?: boolean;
}): WeatherGuideBundle {
  const current = input.forecast.current ?? {};
  const daily = input.forecast.daily ?? {};
  const air = input.airQuality?.current ?? null;

  if (
    !isFiniteNumber(current.temperature_2m) ||
    !isFiniteNumber(current.weather_code)
  ) {
    return createUnavailableWeatherGuideBundle(input.district);
  }

  const weatherCode = current.weather_code ?? 1;
  const isDaytime = getCurrentWeatherIsDaytime();
  const airValidAt = parseWeatherTime(air?.time);
  const usableAir =
    airValidAt !== null &&
    Date.now() - airValidAt < 2 * 60 * 60 * 1000 &&
    airValidAt <= Date.now() + 5 * 60 * 1000;
  const airQualityMetrics = buildAirQualityMetrics(
    usableAir ? input.airQuality : null,
  );
  const airQualityConcern = airQualityMetrics.some(
    metric => metric.key !== 'ozone' && metric.tone === 'bad',
  );
  const scenario = mapScenarioFromData({
    weatherCode,
  });
  const base = buildWeatherGuideBundleForScenario(scenario, input.district, {
    isDaytime,
  });
  const missingMeasurements: WeatherMeasurement[] = [];
  const reading = (
    key: WeatherMeasurement,
    value: unknown,
    min = -Infinity,
    max = Infinity,
    precision = 0,
  ) => {
    if (!isFiniteNumber(value) || value < min || value > max) {
      missingMeasurements.push(key);
      return 0;
    }
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
  };
  const currentTemperature = Math.round(current.temperature_2m);
  const apparentTemperature = reading(
    'apparentTemperature',
    current.apparent_temperature,
  );
  const weatherIcon = mapWeatherCodeToIcon(weatherCode, isDaytime);
  const todayIndex = daily.time?.findIndex(date => date === getKstYmd()) ?? -1;
  const windUnit = input.forecast.current_units?.wind_speed_10m ?? 'km/h';
  const windFactor =
    windUnit === 'km/h'
      ? 1 / 3.6
      : windUnit === 'm/s'
      ? 1
      : windUnit === 'mp/h' || windUnit === 'mph'
      ? 0.44704
      : windUnit === 'kn' || windUnit === 'knots'
      ? 0.514444
      : null;
  const rawWind = current.wind_speed_10m;
  let windSpeed = 0;
  if (isFiniteNumber(rawWind) && rawWind >= 0 && windFactor !== null) {
    windSpeed = Math.round(rawWind * windFactor * 10) / 10;
  } else {
    missingMeasurements.push('windSpeed');
  }
  const weekly = buildWeeklyItems(daily, isDaytime);

  const bundle: WeatherGuideBundle = {
    ...base,
    district: input.district,
    scenario,
    dataSource: input.dataSource ?? 'live',
    attribution: input.attribution,
    fetchedAt: input.fetchedAt,
    expiresAt: input.expiresAt,
    staleUntil: input.staleUntil,
    coordBucket: input.coordBucket,
    forecastValidAt: current.time,
    forecastDate: getKstYmd(),
    airQualityValidAt: usableAir ? air?.time : undefined,
    hourly: buildHourlyWeather(input.forecast),
    missingMeasurements,
    airQualityConcern,
    weatherIcon,
    isDaytime,
    currentTemperature,
    apparentTemperature,
    temperatureSafety: buildWeatherTemperatureSafety(
      currentTemperature,
      missingMeasurements.includes('apparentTemperature')
        ? null
        : apparentTemperature,
    ),
    precipitationSafety: buildWeatherPrecipitationSafety(scenario, weatherIcon),
    highTemperature: reading(
      'highTemperature',
      daily.temperature_2m_max?.[todayIndex],
    ),
    lowTemperature: reading(
      'lowTemperature',
      daily.temperature_2m_min?.[todayIndex],
    ),
    humidity: reading('humidity', current.relative_humidity_2m, 0, 100),
    windSpeed,
    cloudCover: reading('cloudCover', current.cloud_cover, 0, 100),
    uvIndex: reading(
      'uvIndex',
      daily.uv_index_max?.[todayIndex],
      0,
      Infinity,
      1,
    ),
    sunriseTime: formatKoreanTime(daily.sunrise?.[todayIndex]),
    sunsetTime: formatKoreanTime(daily.sunset?.[todayIndex]),
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
        : weatherCode === 3
        ? '흐림'
        : weatherCode === 2
        ? '구름 많음'
        : weatherCode === 0
        ? '맑음'
        : '구름 조금',
    recommendedGuideKeys:
      airQualityConcern && scenario === 'fresh'
        ? buildWeatherGuideBundleForScenario('dusty', input.district, {
            isDaytime,
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
