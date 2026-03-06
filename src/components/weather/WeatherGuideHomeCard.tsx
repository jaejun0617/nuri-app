// 파일: src/components/weather/WeatherGuideHomeCard.tsx
// 역할:
// - 홈 화면 상단에 들어가는 지능형 날씨 가이드 요약 카드
// - 현재 위치, 기온, 간단한 추천 문구를 재사용 가능한 형태로 렌더링

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getWeatherIconName,
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
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name={getWeatherIconName(weather.weatherIcon)}
            size={30}
            color="#F4B400"
          />
        </View>
        <View style={styles.textWrap}>
          <View style={styles.tempRow}>
            <Text style={styles.tempText}>{weather.currentTemperature}°C</Text>
            <Text style={styles.locationText}>{weather.district}</Text>
          </View>
          <Text style={styles.title}>{weather.homeMessage}</Text>
          <Text style={styles.caption}>{weather.homeCaption}</Text>
        </View>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color="#B9C1D0"
      />
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
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
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
  locationText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#9BA5B6',
    fontWeight: '500',
  },
  title: {
    fontSize: 14,
    lineHeight: 19,
    color: '#1E293B',
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    lineHeight: 17,
    color: '#8B96AA',
    fontWeight: '400',
  },
});
