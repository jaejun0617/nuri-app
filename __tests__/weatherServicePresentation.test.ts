import { buildWeatherGuideBundleFromApi } from '../src/services/weather/mapper';
import {
  buildWeatherGuideBundleForScenario,
  createPreviewWeatherGuideBundle,
  createUnavailableWeatherGuideBundle,
} from '../src/services/weather/guide';
import {
  formatWeatherMeasurement,
  getUvLabel,
  getWeatherAdvice,
  getWeatherUpdatedLabel,
} from '../src/services/weather/presentation';
import type { WeatherForecastResponse } from '../src/services/weather/legacy';

const coords = { latitude: 37.68, longitude: 126.76, accuracy: 10 };
const forecast: WeatherForecastResponse = {
  current_units: { wind_speed_10m: 'km/h' },
  current: {
    temperature_2m: 15,
    apparent_temperature: 13,
    relative_humidity_2m: 68,
    wind_speed_10m: 14.4,
    weather_code: 1,
    cloud_cover: 20,
  },
  daily: {
    time: ['2026-10-05', '2026-10-06'],
    weather_code: [1, 0],
    temperature_2m_max: [19, 20],
    temperature_2m_min: [11, 9],
    sunrise: ['2026-10-05T06:32'],
    sunset: ['2026-10-05T18:12'],
    uv_index_max: [0, 3],
    precipitation_probability_max: [0, 40],
  },
};
const build = (data = forecast) =>
  buildWeatherGuideBundleFromApi({
    district: '일산3동',
    coords,
    forecast: data,
    fetchedAt: '2026-10-05T09:00:00Z',
    airQuality: {
      current_units: { ozone: 'μg/m³' },
      current: { time: '2026-10-05T19:00', pm10: 18, pm2_5: 36, ozone: 70 },
    },
  });

describe('production weather display contract', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-05T19:00:00+09:00'));
  });
  afterEach(() => jest.useRealTimers());

  it('converts the verified provider km/h contract to m/s', () => {
    expect(build().windSpeed).toBe(4);
    expect(
      build({ ...forecast, current_units: { wind_speed_10m: 'm/s' } })
        .windSpeed,
    ).toBe(14.4);
  });
  it('does not invent a value for an unknown wind unit', () => {
    expect(
      formatWeatherMeasurement(
        build({ ...forecast, current_units: { wind_speed_10m: 'unknown' } }),
        'windSpeed',
        'm/s',
      ),
    ).toBe('확인 중');
  });
  it('does not compare ozone mass concentration to Korean ppm bands', () => {
    expect(
      build().airQualityMetrics.find(item => item.key === 'ozone'),
    ).toMatchObject({ tone: 'unknown', valueLabel: '70 μg/m³ · 예측 농도' });
  });
  it('uses the PM2.5 boundary at 36 and displays both numeric values', () => {
    expect(build().airQualityConcern).toBe(true);
    expect(
      build().airQualityMetrics.find(item => item.key === 'pm25')?.valueLabel,
    ).toBe('나쁨 · 36 μg/m³');
  });
  it('preserves low and extreme UV levels, including zero', () => {
    expect([0, 2, 3, 6, 8, 11].map(getUvLabel)).toEqual([
      '낮음',
      '낮음',
      '보통',
      '높음',
      '매우 높음',
      '위험',
    ]);
    expect(getUvLabel(null)).toBe('확인 중');
  });
  it('parses offset-free sunrise/sunset as KST, not the device timezone', () => {
    expect(build().sunriseTime).toContain('6:32');
    expect(build().sunsetTime).toContain('6:12');
    expect(getWeatherUpdatedLabel(build())).toContain('18:00');
  });
  it('does not round UV into a different advisory band', () => {
    const bundle = build({
      ...forecast,
      daily: { ...forecast.daily, uv_index_max: [5.9, 3] },
    });
    expect(bundle.uvIndex).toBe(5.9);
    expect(getUvLabel(bundle.uvIndex)).toBe('보통');
  });
  it('does not use demonstration weather for missing readings', () => {
    const bundle = build({
      current: { temperature_2m: 15, weather_code: 1 },
      daily: { time: ['2026-10-05'] },
    });
    expect(formatWeatherMeasurement(bundle, 'humidity', '%')).toBe('확인 중');
    expect(bundle.weekly).toEqual([]);
    expect(bundle.sunriseTime).toBeNull();
    expect(build({ current: {} }).dataSource).toBe('unavailable');
  });
  it('does not fabricate clean air when the air request fails', () => {
    const bundle = buildWeatherGuideBundleFromApi({
      district: '일산3동',
      coords,
      forecast,
      airQuality: null,
    });
    expect(
      bundle.airQualityMetrics.every(
        item => item.tone === 'unknown' && item.valueLabel === '확인 중',
      ),
    ).toBe(true);
    expect(bundle.detailStatus).not.toContain('미세먼지 좋음');
  });
  it('labels forecasts by the actual KST date rather than array position', () => {
    jest.setSystemTime(new Date('2026-10-06T00:05:00+09:00'));
    expect(build().weekly).toHaveLength(1);
    expect(build().weekly[0].label).toBe('오늘');
    expect(build().highTemperature).toBe(20);
  });
  it('does not present missing probability as zero', () => {
    expect(
      build({
        ...forecast,
        daily: { ...forecast.daily, precipitation_probability_max: undefined },
      }).weekly[0].precipitationChance,
    ).toBeUndefined();
  });
  it.each([56, 57, 66, 67])(
    'recognizes freezing precipitation code %i',
    code => {
      expect(
        build({
          ...forecast,
          current: { ...forecast.current, weather_code: code },
        }).scenario,
      ).toBe('rain');
    },
  );
  it('prioritizes hazardous conditions without promising safe exercise for every species', () => {
    const weather = buildWeatherGuideBundleForScenario('fresh');
    expect(getWeatherAdvice({ ...weather, windSpeed: 10 }).headline).toContain(
      '강한 바람',
    );
    expect(
      getWeatherAdvice({
        ...weather,
        weekly: [
          { ...weather.weekly[0], label: '오늘', precipitationChance: 80 },
        ],
      }).headline,
    ).not.toContain('비 예보');
    expect(
      getWeatherAdvice({ ...weather, isDaytime: true, uvIndex: 8 }).headline,
    ).toContain('햇볕');
    expect(getWeatherAdvice(weather).detail).toContain('모든 반려동물');
  });
  it('keeps cached and unavailable guidance explicit', () => {
    expect(
      getWeatherAdvice(createPreviewWeatherGuideBundle(build())).headline,
    ).toBe('최근 날씨를 보여드려요');
    expect(
      getWeatherAdvice(createUnavailableWeatherGuideBundle()).headline,
    ).toBe('날씨를 확인해 주세요');
  });
  it('uses the PO generic copy without changing condition-specific advice', () => {
    const weather = buildWeatherGuideBundleForScenario('fresh');
    expect(getWeatherAdvice(weather).message).toBe(
      '우리 아이의 컨디션에 맞춰 외출을 준비해 주세요.',
    );
    expect(getWeatherAdvice({ ...weather, windSpeed: 10 })).toMatchObject({
      caution: true,
      message: '노출된 장소를 피하고 외출을 줄여 주세요.',
    });
  });
});
