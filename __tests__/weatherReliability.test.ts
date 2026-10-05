import { buildWeatherGuideBundleForScenario } from '../src/services/weather/guide';
import {
  buildHourlyWeather,
  formatWeatherHourRange,
  getUpcomingWeatherHours,
  parseWeatherTime,
  resolveWeatherFreshness,
} from '../src/services/weather/reliability';
import { getWeatherAdvice } from '../src/services/weather/presentation';
import { useWeatherStore } from '../src/store/weatherStore';

const now = Date.parse('2026-10-05T21:20:00+09:00');
function current() {
  return {
    ...buildWeatherGuideBundleForScenario('fresh'),
    fetchedAt: new Date(now).toISOString(),
    forecastValidAt: '2026-10-05T21:15',
    forecastDate: '2026-10-05',
    expiresAt: new Date(now + 15 * 60000).toISOString(),
    staleUntil: new Date(now + 60 * 60000).toISOString(),
  };
}
describe('weather reliability', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });
  afterEach(() => jest.useRealTimers());
  it('uses KST for offset-free model timestamps', () => {
    expect(parseWeatherTime('2026-10-05T21:15')).toBe(
      Date.parse('2026-10-05T12:15Z'),
    );
    expect(parseWeatherTime('not a time')).toBeNull();
    expect(parseWeatherTime('2026-02-30T21:15')).toBeNull();
  });
  it('ages live to preview to unavailable without a network result', () => {
    expect(resolveWeatherFreshness(current(), now).dataSource).toBe('live');
    expect(
      resolveWeatherFreshness(current(), now + 15 * 60000).dataSource,
    ).toBe('preview');
    expect(
      resolveWeatherFreshness(current(), now + 60 * 60000).dataSource,
    ).toBe('unavailable');
  });
  it('does not trust future or missing original times', () => {
    expect(
      resolveWeatherFreshness({ ...current(), fetchedAt: undefined })
        .dataSource,
    ).toBe('unavailable');
    expect(
      resolveWeatherFreshness({
        ...current(),
        forecastValidAt: '2026-10-05T21:30',
      }).dataSource,
    ).toBe('unavailable');
    expect(
      resolveWeatherFreshness({
        ...current(),
        forecastValidAt: '2026-10-05T20:00',
      }).dataSource,
    ).toBe('preview');
  });
  it('does not refresh freshness by reading and saving the same cache again', () => {
    const coords = { latitude: 37.68, longitude: 126.76, accuracy: 10 };
    useWeatherStore.setState({ byCoordsKey: {}, currentSnapshot: null });
    useWeatherStore.getState().saveBundle(coords, current());
    jest.setSystemTime(now + 59 * 60000);
    useWeatherStore.getState().saveBundle(coords, current());
    jest.setSystemTime(now + 61 * 60000);
    expect(useWeatherStore.getState().getFreshEntry(coords)).toBeNull();
  });
  it('keeps zero distinct from missing, invalid values, and unrecognized units', () => {
    const hours = buildHourlyWeather({
      hourly_units: { precipitation_probability: '%', precipitation: 'mm' },
      hourly: {
        time: ['2026-10-05T22:00', '2026-10-05T23:00', '2026-10-06T00:00'],
        precipitation_probability: [0, null, 101],
        precipitation: [0, null, -1],
      },
    });
    expect(hours.map(h => h.precipitationChance)).toEqual([0, null, null]);
    expect(hours.map(h => h.precipitationMm)).toEqual([0, null, null]);
    expect(
      buildHourlyWeather({
        hourly: { time: ['2026-10-05T22:00'], precipitation_probability: [80] },
      })[0].precipitationChance,
    ).toBeNull();
  });
  it('uses preceding-hour intervals and excludes elapsed hours', () => {
    const hourly = buildHourlyWeather({
      hourly_units: { precipitation_probability: '%' },
      hourly: {
        time: ['2026-10-05T21:00', '2026-10-05T22:00', '2026-10-06T00:00'],
        precipitation_probability: [95, 0, 70],
      },
    });
    const upcoming = getUpcomingWeatherHours({ ...current(), hourly }, now);
    expect(upcoming).toHaveLength(2);
    expect(formatWeatherHourRange(upcoming[0])).toBe('21–22시');
    expect(formatWeatherHourRange(upcoming[1])).toBe('23–24시');
    expect(getWeatherAdvice({ ...current(), hourly }).message).toContain('70%');
  });
  it('never uses a daily maximum to promise rain or fabricate a near-term probability', () => {
    const weather = {
      ...current(),
      weekly: [
        { ...current().weekly[0], label: '오늘', precipitationChance: 95 },
      ],
      hourly: [],
    };
    expect(getWeatherAdvice(weather).headline).not.toContain('비 예보');
    expect(getWeatherAdvice(weather).message).not.toContain('95%');
  });
  it('invalidates yesterday UV and min/max at the KST midnight boundary', () => {
    const stamp = Date.parse('2026-10-05T23:55:00+09:00');
    const bundle = {
      ...current(),
      fetchedAt: new Date(stamp).toISOString(),
      forecastValidAt: '2026-10-05T23:45',
      expiresAt: new Date(stamp + 15 * 60000).toISOString(),
      staleUntil: new Date(stamp + 60 * 60000).toISOString(),
    };
    const result = resolveWeatherFreshness(bundle, stamp + 10 * 60000);
    expect(result.missingMeasurements).toEqual(
      expect.arrayContaining(['uvIndex', 'highTemperature', 'lowTemperature']),
    );
    expect(result.sunriseTime).toBeNull();
  });
  it('independently expires air quality model values', () => {
    const bundle = {
      ...current(),
      airQualityValidAt: new Date(now - 119 * 60000).toISOString(),
      airQualityConcern: true,
    };
    const result = resolveWeatherFreshness(bundle, now + 2 * 60000);
    expect(result.dataSource).toBe('live');
    expect(result.airQualityConcern).toBe(false);
    expect(
      result.airQualityMetrics.every(metric => metric.tone === 'unknown'),
    ).toBe(true);
  });
});
