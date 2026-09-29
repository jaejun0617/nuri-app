import { resolveWeatherToHomeBridgeHeight } from '../src/services/home/weatherToHomeTransition';

describe('weather-to-home transition', () => {
  it('uses a responsive bridge inside the approved range', () => {
    expect(resolveWeatherToHomeBridgeHeight(832)).toBe(158);
  });

  it('clamps short and tall viewports without device-specific branches', () => {
    expect(resolveWeatherToHomeBridgeHeight(600)).toBe(140);
    expect(resolveWeatherToHomeBridgeHeight(1200)).toBe(180);
  });

  it('falls back safely for invalid viewport values', () => {
    expect(resolveWeatherToHomeBridgeHeight(Number.NaN)).toBe(140);
  });
});
