import React, { useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import AppText from '../../../app/ui/AppText';
import { useWeatherStore } from '../../../store/weatherStore';
import { getWeatherEmoji } from '../../../services/weather/guide';
import { resolveWeatherFreshness } from '../../../services/weather/reliability';
import { formatWeatherMeasurement } from '../../../services/weather/presentation';
import { WEATHER_CLOCK_INTERVAL_MS } from '../../../services/weather/policy';
import { WALK_TEXT } from './visuals';

/** Read the Home card's cache only; never start a second location or network request. */
const WalkWeatherChip = React.memo(function WalkWeatherChipView() {
  const theme = useTheme();
  const cached = useWeatherStore(s => s.currentSnapshot?.bundle ?? null);
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    if (!cached) return;
    setClock(Date.now());
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') setClock(Date.now());
    }, WEATHER_CLOCK_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setClock(Date.now());
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [cached]);
  const weather = useMemo(
    () => (cached ? resolveWeatherFreshness(cached, clock) : null),
    [cached, clock],
  );
  const available = weather && weather.dataSource !== 'unavailable';
  const temperature = available
    ? formatWeatherMeasurement(weather, 'currentTemperature', '°')
    : '—';
  const label = available
    ? `${weather.dataSource === 'preview' ? '최근 ' : ''}${
        weather.detailStatus
      }`
    : '날씨 확인 중';
  return (
    <View
      testID="walk-weather-chip"
      accessible
      accessibilityRole="text"
      accessibilityLabel={`날씨, ${temperature}, ${label}`}
      style={styles.chip}
    >
      {available ? (
        <Text
          testID="walk-weather-icon"
          accessible={false}
          style={styles.emoji}
        >
          {getWeatherEmoji(weather.weatherIcon)}
        </Text>
      ) : null}
      <AppText
        preset="bodySm"
        fontModeOverride="pretendard"
        style={[WALK_TEXT.state, { color: theme.colors.textPrimary }]}
      >
        {temperature}
      </AppText>
      <AppText
        preset="caption"
        style={[
          WALK_TEXT.caption,
          styles.label,
          { color: theme.colors.textSecondary },
        ]}
      >
        {label}
      </AppText>
    </View>
  );
});
export default WalkWeatherChip;
const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: '100%',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  emoji: { fontSize: 20, lineHeight: 26, includeFontPadding: false },
  label: { flexShrink: 1 },
});
