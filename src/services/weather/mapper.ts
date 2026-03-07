// 파일: src/services/weather/mapper.ts
// 역할:
// - Open-Meteo 응답을 현재 앱의 WeatherGuideBundle 모델로 변환
// - mock 구조를 유지한 채 실제 API 데이터를 자연스럽게 끼워넣기 위한 매핑 계층

import type { DeviceCoordinates } from '../location/currentPosition';
import type {
  OpenMeteoAirQualityResponse,
  OpenMeteoForecastResponse,
} from './api';
import {
  getWeatherGuideBundle,
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
  pm10: number;
  pm25: number;
  usAqi: number;
}): WeatherScenario {
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(input.weatherCode)) {
    return 'rain';
  }
  if (input.usAqi >= 101 || input.pm10 >= 81 || input.pm25 >= 36) {
    return 'dusty';
  }
  return 'fresh';
}

function buildWeeklyItems(
  daily: OpenMeteoForecastResponse['daily'],
  isDay: boolean,
): WeeklyWeatherItem[] {
  const labels = ['오늘', '내일', '수', '목', '금', '토', '일'];

  return (daily?.time ?? []).slice(0, 7).map((_, index) => {
    const weatherCode = daily?.weather_code?.[index] ?? 1;
    return {
      key: `day:${index}`,
      label: labels[index] ?? `${index + 1}일`,
      icon: mapWeatherCodeToIcon(weatherCode, isDay),
      temperature: Math.round(daily?.temperature_2m_max?.[index] ?? 0),
      lowTemperature: Math.round(daily?.temperature_2m_min?.[index] ?? 0),
    };
  });
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
  const isDay = (current.is_day ?? 1) === 1;
  const scenario = mapScenarioFromData({
    weatherCode,
    pm10: air.pm10 ?? 0,
    pm25: air.pm2_5 ?? 0,
    usAqi: air.us_aqi ?? 0,
  });
  const base = getWeatherGuideBundle(input.district);

  return {
    ...base,
    district: input.district,
    scenario,
    weatherIcon: mapWeatherCodeToIcon(weatherCode, isDay),
    currentTemperature: Math.round(current.temperature_2m ?? base.currentTemperature),
    highTemperature: Math.round(daily.temperature_2m_max?.[0] ?? base.highTemperature),
    lowTemperature: Math.round(daily.temperature_2m_min?.[0] ?? base.lowTemperature),
    weekly: buildWeeklyItems(daily, isDay).length > 0 ? buildWeeklyItems(daily, isDay) : base.weekly,
    airQualityMetrics: buildAirQualityMetrics(air),
  };
}
