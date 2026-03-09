// 파일: src/components/weather/WeatherGuideHomeCard.tsx
// 역할:
// - 홈 화면 상단에 들어가는 지능형 날씨 가이드 요약 카드
// - 현재 위치, 기온, 간단한 추천 문구를 재사용 가능한 형태로 렌더링

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  getWeatherEmoji,
  type WeatherGuideBundle,
} from '../../services/weather/guide';

type Props = {
  weather: WeatherGuideBundle;
  onPress: () => void;
};

export default React.memo(function WeatherGuideHomeCard({
  weather,
  onPress,
}: Props) {
  const hasLiveData = weather.dataSource === 'live';
  const isPreview = weather.dataSource === 'preview';
  const isNightCard = hasLiveData && !weather.isDaytime;
  const textPrimary = isNightCard ? '#F8FBFF' : '#1B2434';
  const textSecondary = isNightCard ? 'rgba(226,236,248,0.74)' : '#8B96AA';
  const locationColor = isNightCard ? 'rgba(208,220,238,0.72)' : '#9BA5B6';
  const chevronColor = isNightCard ? '#F8FBFF' : '#000000';
  const iconWrapBackground = isNightCard
    ? 'rgba(255,255,255,0.12)'
    : 'rgba(255,255,255,0.72)';

  return (
    <TouchableOpacity
      activeOpacity={0.94}
      style={[
        styles.card,
        {
          backgroundColor: weather.background.card,
          borderColor: weather.background.cardBorder,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.left}>
        <View style={[styles.iconWrap, { backgroundColor: iconWrapBackground }]}>
          <Text style={styles.iconEmoji}>{getWeatherEmoji(weather.weatherIcon)}</Text>
        </View>
        <View style={styles.textWrap}>
          <View style={styles.tempRow}>
            <Text
              style={[
                styles.tempText,
                hasLiveData ? null : styles.tempTextFallback,
                { color: textPrimary },
              ]}
            >
              {hasLiveData
                ? `${weather.currentTemperature}°C`
                : isPreview
                  ? `최근 확인 ${weather.currentTemperature}°C`
                  : '실시간 확인 필요'}
            </Text>
            <Text style={[styles.locationText, { color: locationColor }]}>
              {weather.district}
            </Text>
          </View>
          <Text style={[styles.title, { color: textPrimary }]}>{weather.homeMessage}</Text>
          <Text style={[styles.caption, { color: textSecondary }]}>
            {isPreview
              ? '최근 확인한 날씨를 잠시 보여주고 있어요. 연결되면 실시간 정보로 바뀝니다.'
              : weather.homeCaption}
          </Text>
        </View>
      </View>
      <Text style={[styles.chevron, { color: chevronColor }]}>{'>'}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tempText: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    color: '#1B2434',
  },
  tempTextFallback: {
    fontSize: 18,
    lineHeight: 24,
  },
  locationText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
  },
  chevron: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '500',
  },
});
