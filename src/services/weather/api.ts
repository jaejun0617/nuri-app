// 파일: src/services/weather/api.ts
// 역할:
// - Open-Meteo forecast / air quality API 호출 계층
// - 위치 좌표 기준의 날씨/대기질 응답을 화면과 분리해서 가져오도록 중앙화

import type { DeviceCoordinates } from '../location/currentPosition';

export type OpenMeteoForecastResponse = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    is_day?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
};

export type OpenMeteoAirQualityResponse = {
  current?: {
    pm10?: number;
    pm2_5?: number;
    ozone?: number;
    us_aqi?: number;
  };
};

export async function fetchOpenMeteoForecast(
  coords: DeviceCoordinates,
): Promise<OpenMeteoForecastResponse> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${coords.latitude}` +
    `&longitude=${coords.longitude}` +
    `&current=temperature_2m,apparent_temperature,weather_code,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&timezone=Asia%2FSeoul` +
    `&forecast_days=7`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('날씨 정보를 불러오지 못했어요.');
  }

  return (await response.json()) as OpenMeteoForecastResponse;
}

export async function fetchOpenMeteoAirQuality(
  coords: DeviceCoordinates,
): Promise<OpenMeteoAirQualityResponse> {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${coords.latitude}` +
    `&longitude=${coords.longitude}` +
    `&current=pm10,pm2_5,ozone,us_aqi` +
    `&timezone=Asia%2FSeoul`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('대기질 정보를 불러오지 못했어요.');
  }

  return (await response.json()) as OpenMeteoAirQualityResponse;
}
