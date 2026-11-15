import { ResponsiveNativeText as Text } from '../../app/ui/ResponsiveNativeText';
import React from 'react';
import { StyleSheet, Text as WeatherGlyph, View, useWindowDimensions } from 'react-native';

import { getWeatherEmoji, type WeatherIconKey, type WeeklyWeatherItem } from '../../services/weather/guide';

const CONDITION_LABEL: Record<WeatherIconKey, string> = {
  'weather-pouring': '비',
  'weather-cloudy': '흐림',
  'weather-sunny': '맑음',
  'weather-partly-cloudy': '구름 조금',
  'weather-night-partly-cloudy': '구름 조금',
  'weather-windy': '바람',
  'weather-lightning': '뇌우',
  'weather-snowy': '눈',
  'weather-fog': '안개',
};

type Props = {
  items: WeeklyWeatherItem[];
  labelColor?: string;
  precipitationColor?: string;
  temperatureColor?: string;
  lowTemperatureColor?: string;
};

export default React.memo(function WeatherForecastStrip({
  items,
  labelColor = '#F8FBFF',
  precipitationColor = 'rgba(234,242,255,0.76)',
  temperatureColor = '#FFFFFF',
  lowTemperatureColor = 'rgba(226,236,248,0.74)',
}: Props) {
  const { width, fontScale } = useWindowDimensions();
  const compact = width <= 360;
  const enlarged = !compact && fontScale > 1.2;
  if (items.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyText, { color: labelColor }]}>
          예보 정보를 확인하지 못했어요.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.table}>
      {items.map((item, index) => (
        <View
          key={item.key}
          accessible
          accessibilityLabel={`${item.label}, ${CONDITION_LABEL[item.icon]}, 강수 확률 ${item.precipitationChance === undefined ? '미제공' : `${item.precipitationChance}%`}, 최고 ${item.temperature}도, 최저 ${item.lowTemperature}도`}
          style={[
            styles.row,
            index === items.length - 1 ? styles.rowLast : null,
          ]}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={[
              styles.label,
              enlarged ? styles.labelEnlarged : null,
              { color: labelColor },
            ]}
          >
            {item.label}
          </Text>

          <View
            style={[styles.precipWrap, compact && styles.precipCompact, enlarged && styles.precipEnlarged]}
          >
            <WeatherGlyph allowFontScaling={false} style={styles.precipGlyph}>💧</WeatherGlyph>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}
              style={[styles.precipText, { color: precipitationColor }]}>
              {item.precipitationChance === undefined
                ? '—'
                : `${item.precipitationChance}%`}
            </Text>
          </View>

          <View style={styles.iconGroup}>
            <WeatherGlyph testID="weather-forecast-condition" allowFontScaling={false} style={styles.conditionGlyph}>
              {getWeatherEmoji(item.icon)}
            </WeatherGlyph>
          </View>

          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={[
              styles.tempText,
              enlarged ? styles.tempEnlarged : null,
              { color: temperatureColor },
            ]}
          >
            {item.temperature}°{' '}
            <Text style={[styles.lowText, { color: lowTemperatureColor }]}>
              {item.lowTemperature}°
            </Text>
          </Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  table: {
    gap: 0,
  },
  emptyWrap: {
    paddingVertical: 18,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    width: 36,
    flexShrink: 0,
    fontSize: 14,
    lineHeight: 18,
    color: '#F8FBFF',
    fontWeight: '700',
  },
  labelEnlarged: { width: 48 },
  precipEnlarged: { width: 78 },
  precipCompact: { width: 49 },
  tempEnlarged: { width: 108 },
  precipWrap: {
    width: 58,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  precipText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(234,242,255,0.76)',
    fontWeight: '600',
  },
  precipGlyph: { fontSize: 13, flexShrink: 0 },
  conditionGlyph: { fontSize: 21 },
  iconGroup: {
    flex: 1,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempText: {
    width: 74,
    flexShrink: 0,
    textAlign: 'right',
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  lowText: {
    color: 'rgba(226,236,248,0.74)',
    fontWeight: '600',
  },
});
