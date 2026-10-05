import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Feather from '../icons/NuriFeatherIcon';
import type { HourlyWeatherItem } from '../../services/weather/guide';
import { formatWeatherHourRange } from '../../services/weather/reliability';
import WeatherGlassCard from './WeatherGlassCard';

type Props = {
  items: HourlyWeatherItem[];
  textColor: string;
  secondaryColor: string;
};

export default React.memo(function WeatherHourlyPrecipitation({
  items,
  textColor,
  secondaryColor,
}: Props) {
  const { width, fontScale } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const availableWidth = measuredWidth ?? Math.max(1, width - 72);
  // Measure the inner panel; larger fonts get wider slots, never smaller text.
  const minimumWidth = 88 * Math.max(1, fontScale);
  const visibleSlots = Math.max(
    1,
    Math.min(4, Math.floor(availableWidth / minimumWidth)),
  );
  const scrolling = items.length > visibleSlots;
  const slotWidth = scrolling
    ? Math.max(minimumWidth, availableWidth / visibleSlots)
    : availableWidth / Math.max(1, items.length);

  return (
    <WeatherGlassCard frosted>
      <Text style={[styles.title, { color: textColor }]}>시간대별 강수</Text>
      <View
        testID="weather-hourly-viewport"
        onLayout={event => {
          const nextWidth = event.nativeEvent.layout.width;
          if (nextWidth > 0) setMeasuredWidth(nextWidth);
        }}
      >
        {items.length ? (
          <ScrollView
            testID="weather-hourly-timeline"
            horizontal
            scrollEnabled={scrolling}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timeline}
          >
            {items.map((item, index) => {
              const probability =
                item.precipitationChance === null
                  ? '—'
                  : `${item.precipitationChance}%`;
              const amount =
                item.precipitationMm === null
                  ? '—'
                  : `${item.precipitationMm}mm`;
              const hour = formatWeatherHourRange(item);
              return (
                <View
                  key={item.endsAt}
                  testID="weather-hourly-slot"
                  accessible
                  accessibilityLabel={`${hour}, 강수 확률 ${
                    item.precipitationChance === null ? '미제공' : probability
                  }, 예상 강수량 ${
                    item.precipitationMm === null ? '미제공' : amount
                  }`}
                  style={[styles.slot, { width: slotWidth }]}
                >
                  <Text style={[styles.time, { color: secondaryColor }]}>
                    {hour}
                  </Text>
                  <Feather name="droplet" size={16} color={secondaryColor} />
                  <Text style={[styles.probability, { color: textColor }]}>
                    {probability}
                  </Text>
                  <Text style={[styles.amount, { color: secondaryColor }]}>
                    {amount}
                  </Text>
                  <View
                    style={[
                      styles.nearestMark,
                      {
                        backgroundColor:
                          index === 0 ? secondaryColor : 'transparent',
                      },
                    ]}
                  />
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={[styles.empty, { color: secondaryColor }]}>
            시간대별 강수 정보를 확인하지 못했어요.
          </Text>
        )}
      </View>
    </WeatherGlassCard>
  );
});

const styles = StyleSheet.create({
  title: { fontSize: 16, lineHeight: 22, fontWeight: '700', marginBottom: 18 },
  timeline: { alignItems: 'stretch' },
  slot: { alignItems: 'center', paddingHorizontal: 6, gap: 10 },
  time: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  probability: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  amount: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  nearestMark: {
    width: 20,
    height: 2,
    borderRadius: 1,
    marginTop: 2,
    opacity: 0.55,
  },
  empty: { fontSize: 13, lineHeight: 20 },
});
