// 파일: src/screens/Weather/WeatherInsightScreen.tsx
// 역할:
// - 현재 위치 기준 날씨/대기질 요약과 맞춤 추천을 보여주는 상세 페이지
// - 날씨 API 연결 전에는 mock 데이터를 사용해 레이아웃과 흐름을 먼저 고정

import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AirQualityInsightCard from '../../components/weather/AirQualityInsightCard';
import WeatherForecastStrip from '../../components/weather/WeatherForecastStrip';
import { useWeatherGuide } from '../../hooks/useWeatherGuide';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getWeatherIconName } from '../../services/weather/guide';

type Nav = NativeStackNavigationProp<RootStackParamList, 'WeatherInsight'>;

export default function WeatherInsightScreen() {
  const navigation = useNavigation<Nav>();
  const route =
    useRoute<{
      key: string;
      name: 'WeatherInsight';
      params?: { district?: string };
    }>();
  const weatherState = useWeatherGuide(route.params?.district ?? '현재 위치');
  const weather = weatherState.bundle;

  const onPressPrimary = useCallback(() => {
    if (weather.scenario === 'fresh') {
      navigation.navigate('AppTabs', {
        screen: 'TimelineTab',
        params: {
          screen: 'TimelineMain',
          params: { mainCategory: 'walk' },
        },
      });
      return;
    }

    navigation.navigate('IndoorActivityRecommendations', {
      district: weather.district,
    });
  }, [navigation, weather.district, weather.scenario]);

  const accentColor = weather.scenario === 'fresh' ? '#1D8DDB' : '#8C7A62';

  return (
    <LinearGradient
      colors={[weather.background.top, weather.background.bottom]}
      style={styles.screen}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="chevron-left" size={24} color="#1B2434" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>오늘의 날씨</Text>
          <View style={styles.headerSpace} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroWrap}>
            <Text style={styles.locationStatus}>
              {weatherState.loading
                ? '현재 위치와 날씨를 확인하고 있어요'
                : weatherState.error
                  ? `${weather.district} 기준`
                  : `${weather.district} 기준`}
            </Text>
            <MaterialCommunityIcons
              name={getWeatherIconName(weather.weatherIcon)}
              size={82}
              color={weather.scenario === 'fresh' ? '#F4B400' : '#8C7A62'}
            />
            <Text style={styles.heroTemp}>{weather.currentTemperature}°</Text>
            <Text style={[styles.heroStatus, { color: accentColor }]}>
              {weather.detailStatus}
            </Text>
            <Text style={styles.heroRange}>
              최고 {weather.highTemperature}° · 최저 {weather.lowTemperature}°
            </Text>
            <Text style={styles.heroHeadline}>{weather.detailHeadline}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>주간 예보</Text>
              <Text style={styles.sectionHint}>7일간의 날씨</Text>
            </View>
            <WeatherForecastStrip
              items={weather.weekly}
              accentColor={weather.scenario === 'fresh' ? '#F4B400' : '#6796E6'}
            />
          </View>

          <AirQualityInsightCard metrics={weather.airQualityMetrics} />

          <View style={styles.recommendCard}>
            <View style={styles.recommendIconWrap}>
              <MaterialCommunityIcons name="paw" size={20} color="#7A45F4" />
            </View>
            <View style={styles.recommendTextWrap}>
              <Text style={styles.recommendTitle}>{weather.activityCardTitle}</Text>
              <Text style={styles.recommendBody}>{weather.activityCardBody}</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.primaryButton}
              onPress={onPressPrimary}
            >
              <Text style={styles.primaryButtonText}>
                {weather.activityButtonLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: '#1B2434',
    fontWeight: '700',
  },
  headerSpace: {
    width: 34,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 36,
    gap: 22,
  },
  heroWrap: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 14,
  },
  locationStatus: {
    fontSize: 12,
    lineHeight: 17,
    color: '#8B96AA',
    fontWeight: '500',
  },
  heroTemp: {
    fontSize: 62,
    lineHeight: 68,
    color: '#182133',
    fontWeight: '700',
  },
  heroStatus: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700',
  },
  heroRange: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8B96AA',
    fontWeight: '500',
  },
  heroHeadline: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    color: '#5C687C',
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 12,
  },
  section: {
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    color: '#1B2434',
    fontWeight: '700',
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 16,
    color: '#B1B9C8',
    fontWeight: '500',
  },
  recommendCard: {
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.06)',
    gap: 14,
  },
  recommendIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFE6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendTextWrap: {
    gap: 6,
  },
  recommendTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: '#5D3EC8',
    fontWeight: '700',
  },
  recommendBody: {
    fontSize: 14,
    lineHeight: 21,
    color: '#6E788A',
    fontWeight: '400',
  },
  primaryButton: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#7A45F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
