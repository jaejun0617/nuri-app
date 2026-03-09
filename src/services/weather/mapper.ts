// 파일: src/services/weather/mapper.ts
// 역할:
// - Open-Meteo 응답을 현재 앱의 WeatherGuideBundle 모델로 변환
// - 화면 공통 번들 구조에 실제 API 데이터를 일관되게 매핑하는 계층

import type { DeviceCoordinates } from '../location/currentPosition';
import type {
  OpenMeteoAirQualityResponse,
  OpenMeteoForecastResponse,
} from './api';
import { safeYmd } from '../../utils/date';
import { getCurrentWeatherIsDaytime } from './dayPhase';
import {
  buildWeatherGuideBundleForScenario,
  type AirQualityMetric,
  type AirQualityTone,
  type WeatherGuideBundle,
  type WeatherIconKey,
  type WeatherScenario,
  type WeeklyWeatherItem,
} from './guide';

function getAirTone(value: number, badThreshold: number, moderateThreshold: number): AirQualityTone {
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
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
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

function mapScenarioFromData(input: {
  weatherCode: number;
}): WeatherScenario {
  if ([71, 73, 75, 77, 85, 86].includes(input.weatherCode)) {
    return 'snow';
  }
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(input.weatherCode)) {
    return 'rain';
  }
  return 'fresh';
}

function buildWeeklyItems(
  daily: OpenMeteoForecastResponse['daily'],
  isDay: boolean,
): WeeklyWeatherItem[] {
  const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

  return (daily?.time ?? []).slice(0, 7).map((_, index) => {
    const weatherCode = daily?.weather_code?.[index] ?? 1;
    const dateString = safeYmd(daily?.time?.[index]);
    const date = dateString ? new Date(`${dateString}T12:00:00+09:00`) : null;
    const dayLabel =
      index === 0
        ? '오늘'
        : index === 1
          ? '내일'
          : date
            ? weekdayLabels[date.getDay()] ?? `${index + 1}일`
            : `${index + 1}일`;

    return {
      key: `day:${index}`,
      label: dayLabel,
      icon: mapWeatherCodeToIcon(weatherCode, isDay),
      temperature: Math.round(daily?.temperature_2m_max?.[index] ?? 0),
      lowTemperature: Math.round(daily?.temperature_2m_min?.[index] ?? 0),
      precipitationChance: Math.round(
        daily?.precipitation_probability_max?.[index] ?? 0,
      ),
    };
  });
}

function formatKoreanTime(iso: string | undefined): string | null {
  if (!iso) return null;

  const date = new Date(iso);
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
  air: OpenMeteoAirQualityResponse['current'],
): AirQualityMetric[] {
  const pm10 = Math.max(0, air?.pm10 ?? 0);
  const pm25 = Math.max(0, air?.pm2_5 ?? 0);
  const ozone = Math.max(0, air?.ozone ?? 0);

  return [
    {
      key: 'pm10',
      label: '미세먼지',
      valueLabel: `${getAirTone(pm10, 81, 31) === 'good' ? '좋음' : getAirTone(pm10, 81, 31) === 'moderate' ? '보통' : '나쁨'} (${Math.round(pm10)}ug/m³)`,
      tone: getAirTone(pm10, 81, 31),
      progress: getProgress(pm10, 120),
    },
    {
      key: 'pm25',
      label: '초미세먼지',
      valueLabel:
        getAirTone(pm25, 36, 16) === 'good'
          ? '좋음'
          : getAirTone(pm25, 36, 16) === 'moderate'
            ? '보통'
            : '나쁨',
      tone: getAirTone(pm25, 36, 16),
      progress: getProgress(pm25, 60),
    },
    {
      key: 'ozone',
      label: '오존',
      valueLabel:
        getAirTone(ozone, 0.091, 0.031) === 'good'
          ? '좋음'
          : getAirTone(ozone, 0.091, 0.031) === 'moderate'
            ? '보통'
            : '나쁨',
      tone: getAirTone(ozone, 0.091, 0.031),
      progress: getProgress(ozone, 0.12),
    },
  ];
}

export function buildWeatherGuideBundleFromApi(input: {
  district: string;
  coords: DeviceCoordinates;
  forecast: OpenMeteoForecastResponse;
  airQuality: OpenMeteoAirQualityResponse;
}): WeatherGuideBundle {
  const current = input.forecast.current ?? {};
  const daily = input.forecast.daily ?? {};
  const air = input.airQuality.current ?? {};

  const weatherCode = current.weather_code ?? 1;
  const isDaytime = getCurrentWeatherIsDaytime();
  const airQualityConcern = (air.pm10 ?? 0) >= 81 || (air.pm2_5 ?? 0) > 36;
  const scenario = mapScenarioFromData({
    weatherCode,
  });
  const base = buildWeatherGuideBundleForScenario(scenario, input.district, {
    isDaytime,
  });
  const airGuide =
    airQualityConcern && scenario === 'fresh'
      ? buildWeatherGuideBundleForScenario('dusty', input.district, {
          isDaytime,
        })
      : null;

  return {
    ...base,
    district: input.district,
    scenario,
    dataSource: 'live',
    airQualityConcern,
    weatherIcon: mapWeatherCodeToIcon(weatherCode, isDaytime),
    isDaytime,
    currentTemperature: Math.round(current.temperature_2m ?? base.currentTemperature),
    apparentTemperature: Math.round(
      current.apparent_temperature ?? base.apparentTemperature,
    ),
    highTemperature: Math.round(daily.temperature_2m_max?.[0] ?? base.highTemperature),
    lowTemperature: Math.round(daily.temperature_2m_min?.[0] ?? base.lowTemperature),
    humidity: Math.round(current.relative_humidity_2m ?? base.humidity),
    windSpeed: Math.round((current.wind_speed_10m ?? base.windSpeed) * 10) / 10,
    cloudCover: Math.round(current.cloud_cover ?? base.cloudCover),
    uvIndex: Math.round(daily.uv_index_max?.[0] ?? base.uvIndex),
    sunriseTime: formatKoreanTime(daily.sunrise?.[0]) ?? base.sunriseTime,
    sunsetTime: formatKoreanTime(daily.sunset?.[0]) ?? base.sunsetTime,
    weekly:
      buildWeeklyItems(daily, isDaytime).length > 0
        ? buildWeeklyItems(daily, isDaytime)
        : base.weekly,
    airQualityMetrics: buildAirQualityMetrics(air),
    homeMessage: airGuide?.homeMessage ?? base.homeMessage,
    homeCaption: airGuide?.homeCaption ?? base.homeCaption,
    detailStatus: airGuide?.detailStatus ?? base.detailStatus,
    detailHeadline: airGuide?.detailHeadline ?? base.detailHeadline,
    activityCardTitle: airGuide?.activityCardTitle ?? base.activityCardTitle,
    activityCardBody: airGuide?.activityCardBody ?? base.activityCardBody,
    activityButtonLabel:
      airGuide?.activityButtonLabel ?? base.activityButtonLabel,
    recommendedGuideKeys:
      airGuide?.recommendedGuideKeys ?? base.recommendedGuideKeys,
  };
}
