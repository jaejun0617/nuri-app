import { getCurrentWeatherIsDaytime, isWeatherDaytimeAt } from '../src/services/weather/dayPhase';
import { buildWeatherGuideBundleFromApi } from '../src/services/weather/mapper';

describe('weather day phase', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('오전 6시 이상 오후 6시 미만은 낮으로 본다', () => {
    expect(isWeatherDaytimeAt(new Date('2026-03-09T06:00:00+09:00'))).toBe(true);
    expect(isWeatherDaytimeAt(new Date('2026-03-09T17:59:59+09:00'))).toBe(true);
  });

  it('오후 6시 이상 다음날 오전 6시 미만은 밤으로 본다', () => {
    expect(isWeatherDaytimeAt(new Date('2026-03-09T05:59:59+09:00'))).toBe(false);
    expect(isWeatherDaytimeAt(new Date('2026-03-09T18:00:00+09:00'))).toBe(false);
    expect(isWeatherDaytimeAt(new Date('2026-03-09T23:59:59+09:00'))).toBe(false);
  });

  it('mapper는 API is_day 대신 현재 로컬 시간을 기준으로 isDaytime을 결정한다', () => {
    jest.setSystemTime(new Date('2026-03-09T20:00:00+09:00'));

    const bundle = buildWeatherGuideBundleFromApi({
      district: '일산3동',
      coords: { latitude: 37.674, longitude: 126.769, accuracy: 10 },
      forecast: {
        current: {
          temperature_2m: 11,
          apparent_temperature: 9,
          weather_code: 0,
          relative_humidity_2m: 40,
          wind_speed_10m: 1.8,
          cloud_cover: 10,
        },
        daily: {
          time: ['2026-03-09'],
          weather_code: [0],
          temperature_2m_max: [13],
          temperature_2m_min: [4],
          sunrise: ['2026-03-09T06:30:00+09:00'],
          sunset: ['2026-03-09T18:20:00+09:00'],
          uv_index_max: [4],
          precipitation_probability_max: [0],
        },
      },
      airQuality: {
        current: {
          pm10: 12,
          pm2_5: 8,
          ozone: 0.02,
        },
      },
    });

    expect(getCurrentWeatherIsDaytime()).toBe(false);
    expect(bundle.isDaytime).toBe(false);
    expect(bundle.weatherIcon).toBe('weather-night-partly-cloudy');
    expect(bundle.background.card).not.toBe('#FFFFFF');
  });
});
