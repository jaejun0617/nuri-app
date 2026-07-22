import {
  buildWeatherPrecipitationSafety,
  buildWeatherTemperatureSafety,
  buildWeatherGuideBundleForScenario,
  formatWeatherPetText,
} from '../src/services/weather/guide';

describe('buildWeatherTemperatureSafety', () => {
  it('marks 33 degrees or higher as heat-wave caution', () => {
    expect(buildWeatherTemperatureSafety(33, 34)).toMatchObject({
      tone: 'hot',
      label: '폭염 주의',
    });
  });

  it('marks 30 degrees as hot-weather caution', () => {
    expect(buildWeatherTemperatureSafety(30, 29)).toMatchObject({
      tone: 'hot',
      label: '더위 주의',
    });
  });

  it('warns before the hot threshold when the temperature reaches 27 degrees', () => {
    expect(buildWeatherTemperatureSafety(27, 26)).toMatchObject({
      tone: 'caution',
      label: '더위에 대비해요',
    });
  });

  it('handles freezing and sub-zero temperatures separately', () => {
    expect(buildWeatherTemperatureSafety(0, -1)).toMatchObject({
      tone: 'caution',
      label: '추운 날씨예요',
    });
    expect(buildWeatherTemperatureSafety(-5, -4)).toMatchObject({
      tone: 'cold',
      label: '추위 주의',
    });
  });

  it('returns a neutral message for mild temperatures', () => {
    expect(buildWeatherTemperatureSafety(22, 23)).toMatchObject({
      tone: 'normal',
      label: '기온이 무난해요',
    });
  });

  it('does not invent a safety level when temperature data is unavailable', () => {
    expect(buildWeatherTemperatureSafety(null, null)).toMatchObject({
      tone: 'unknown',
      label: '기온 확인 필요',
    });
  });

  it('adds rain-specific guidance without relying on an icon', () => {
    expect(buildWeatherPrecipitationSafety('rain', 'weather-pouring')).toMatchObject({
      kind: 'rain',
      label: '비 오는 날 주의',
      message: '미끄러운 길과 젖은 발을 살피며 짧게 산책해 주세요',
    });
  });

  it('adds stronger guidance for snow and thunder', () => {
    expect(buildWeatherPrecipitationSafety('snow', 'weather-snowy')?.kind).toBe(
      'snow',
    );
    expect(
      buildWeatherPrecipitationSafety('fresh', 'weather-lightning')?.kind,
    ).toBe('storm');
  });

  it('does not show precipitation guidance for a dry fresh scenario', () => {
    expect(buildWeatherPrecipitationSafety('fresh', 'weather-sunny')).toBeNull();
  });

  it('does not hardcode the NURI brand as a pet name in rain guidance', () => {
    const bundle = buildWeatherGuideBundleForScenario('rain', '일산3동');

    expect(bundle.homeCaption).toBe('오늘은 아이와 집 안에서 더 깊은 시간을 보내요');
    expect(bundle.homeCaption).not.toContain('누리와');
  });

  it('keeps weather walking copy concise without the filler word 딱', () => {
    expect(buildWeatherGuideBundleForScenario('rain', '일산3동').homeMessage).toBe(
      '산책하기 좋은 날씨는 아니에요',
    );
    expect(buildWeatherGuideBundleForScenario('fresh', '일산3동').homeMessage).toBe(
      '산책하기 좋은 날씨예요',
    );
  });

  it('personalizes pet-facing copy with the selected pet name', () => {
    expect(
      formatWeatherPetText('오늘은 아이와 집 안에서 더 깊은 시간을 보내요', '초코'),
    ).toBe('오늘은 초코와 집 안에서 더 깊은 시간을 보내요');
    expect(formatWeatherPetText('비 안내만 있어요', null)).toBe('비 안내만 있어요');
  });
});
