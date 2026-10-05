export type WeatherKind =
  | 'OBSERVED'
  | 'FORECAST'
  | 'WARNING'
  | 'AIR_QUALITY_OBSERVED'
  | 'AIR_QUALITY_FORECAST'
  | 'NOWCAST';
export type WeatherQuality = 'VALID' | 'PARTIAL' | 'STALE' | 'UNAVAILABLE';
export type WeatherMetric<T = number> = {
  value: T | null;
  meta: {
    source: string;
    kind: WeatherKind;
    unit: string;
    issuedAt: string | null;
    validAt: string | null;
    retrievedAt: string;
    expiresAt: string;
    locationKey: string;
    quality: WeatherQuality;
  };
};
export type WeatherApiDay = {
  date: string;
  weatherCode: WeatherMetric;
  highTemperature: WeatherMetric;
  lowTemperature: WeatherMetric;
  uvIndex: WeatherMetric;
  precipitationProbability: WeatherMetric;
  sunrise: WeatherMetric<string>;
  sunset: WeatherMetric<string>;
};
export type WeatherApiHour = {
  startsAt: string;
  endsAt: string;
  precipitationProbability: WeatherMetric;
  precipitationAmount: WeatherMetric;
};
export type WeatherApiV1 = {
  apiVersion: 'nuri.weather.v1';
  location: {
    key: string;
    bucketSizeDegrees: number;
    timezone: 'Asia/Seoul';
    locale: 'ko-KR';
  };
  current: {
    temperature: WeatherMetric;
    apparentTemperature: WeatherMetric;
    weatherCode: WeatherMetric;
    humidity: WeatherMetric;
    windSpeed: WeatherMetric;
    cloudCover: WeatherMetric;
  };
  hourly: WeatherApiHour[];
  daily: WeatherApiDay[];
  airQuality: {
    availability: 'available' | 'unavailable';
    pm10: WeatherMetric;
    pm25: WeatherMetric;
    ozone: WeatherMetric;
  };
  warnings: {
    availability: 'available' | 'unavailable';
    items: {
      id: string;
      title: string;
      regionCode: string;
      meta: WeatherMetric['meta'];
    }[];
  };
  nowcast: {
    availability: 'available' | 'unavailable';
    items: { precipitationMm: number; meta: WeatherMetric['meta'] }[];
  };
  freshness: {
    state: 'FRESH' | 'STALE_SAFE';
    quality: WeatherQuality;
    retrievedAt: string;
    expiresAt: string;
    staleUntil: string;
    cache: 'provider' | 'fresh_cache' | 'stale_cache';
    fallbackReason: string | null;
  };
  sources: {
    source: string;
    kind: WeatherKind;
    state: 'ACTIVE' | 'READY_INACTIVE';
    attribution: { label: string; url?: string } | null;
  }[];
};
