// 파일: src/components/weather/WeatherForecastStrip.tsx
// 역할:
// - 날씨 상세에서 주간 예보 카드 스트립을 재사용

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  getWeatherEmoji,
  type WeeklyWeatherItem,
} from '../../services/weather/guide';

type Props = {
  items: WeeklyWeatherItem[];
  accentColor: string;
};

export default React.memo(function WeatherForecastStrip({
  items,
  accentColor,
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map((item, index) => (
        <View key={item.key} style={[styles.card, index === 0 ? styles.cardActive : null]}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={[styles.emoji, { color: accentColor }]}>
            {getWeatherEmoji(item.icon)}
          </Text>
          <Text style={styles.temp}>{item.temperature}°</Text>
          <Text style={styles.low}>{item.lowTemperature}°</Text>
        </View>
      ))}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  row: {
    gap: 10,
  },
  card: {
    width: 76,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.74)',
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.05)',
  },
  cardActive: {
    backgroundColor: '#FFFFFF',
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    color: '#A0A8B8',
    fontWeight: '600',
  },
  emoji: {
    fontSize: 20,
    lineHeight: 24,
  },
  temp: {
    fontSize: 22,
    lineHeight: 26,
    color: '#1B2434',
    fontWeight: '700',
  },
  low: {
    fontSize: 11,
    lineHeight: 14,
    color: '#A0A8B8',
    fontWeight: '500',
  },
});
