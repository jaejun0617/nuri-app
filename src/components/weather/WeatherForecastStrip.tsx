import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  getWeatherEmoji,
  type WeeklyWeatherItem,
} from '../../services/weather/guide';

type Props = {
  items: WeeklyWeatherItem[];
  accentColor: string;
  labelColor?: string;
  precipitationColor?: string;
  temperatureColor?: string;
  lowTemperatureColor?: string;
};

export default React.memo(function WeatherForecastStrip({
  items,
  accentColor,
  labelColor = '#F8FBFF',
  precipitationColor = 'rgba(234,242,255,0.76)',
  temperatureColor = '#FFFFFF',
  lowTemperatureColor = 'rgba(226,236,248,0.74)',
}: Props) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyText, { color: labelColor }]}>
          주간 예보를 아직 받아오지 못했어요.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.table}>
      {items.map((item, index) => (
        <View
          key={item.key}
          style={[styles.row, index === items.length - 1 ? styles.rowLast : null]}
        >
          <Text style={[styles.label, { color: labelColor }]}>{item.label}</Text>

          <View style={styles.precipWrap}>
            <Text style={styles.precipEmoji}>💧</Text>
            <Text style={[styles.precipText, { color: precipitationColor }]}>
              {item.precipitationChance ?? 0}%
            </Text>
          </View>

          <View style={styles.iconGroup}>
            <Text style={[styles.emoji, { color: accentColor }]}>
              {getWeatherEmoji(item.icon)}
            </Text>
          </View>

          <Text style={[styles.tempText, { color: temperatureColor }]}>
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
    fontSize: 14,
    lineHeight: 18,
    color: '#F8FBFF',
    fontWeight: '700',
  },
  precipWrap: {
    width: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  precipEmoji: {
    fontSize: 11,
    lineHeight: 14,
    opacity: 0.8,
  },
  precipText: {
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(234,242,255,0.76)',
    fontWeight: '600',
  },
  iconGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 21,
    lineHeight: 24,
  },
  tempText: {
    width: 74,
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
