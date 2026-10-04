import { resolveWeatherMetricLayout } from '../src/components/weather/weatherMetricLayout';

describe('complete weather value width budget', () => {
  it.each([360, 384, 400, 430])('keeps 13.5m/s in four columns at %s dp without reducing typography', width => {
    expect(resolveWeatherMetricLayout({ width, fontScale: 1, values: ['24°', '75%', '13.5m/s', '매우 높음'] }).columns).toBe(4);
  });
  it.each([1.3, 1.5])('preserves canonical 2x2 at font scale %s', fontScale => {
    expect(resolveWeatherMetricLayout({ width: 430, fontScale, values: ['24°', '75%', '13.5m/s', '높음'] }).columns).toBe(2);
  });
  it('uses two columns only when a complete unusual value cannot fit', () => {
    expect(resolveWeatherMetricLayout({ width: 360, fontScale: 1, values: ['12345.67m/s'] }).columns).toBe(2);
  });
});
