// 파일: src/screens/Weather/IndoorActivityRecommendationsScreen.tsx
// 역할:
// - 날씨가 좋지 않을 때 추천하는 실내 놀이 목록 화면
// - 활동 카드와 다음 가이드 진입 흐름을 한 화면에서 정리

import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';

import IndoorActivityCard from '../../components/weather/IndoorActivityCard';
import { useWeatherGuide } from '../../hooks/useWeatherGuide';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { DeviceCoordinates } from '../../services/location/currentPosition';
import {
  ALL_INDOOR_ACTIVITY_KEYS,
  getIndoorActivityGuide,
  type IndoorActivityKey,
  type WeatherGuideBundle,
} from '../../services/weather/guide';

type Nav = NativeStackNavigationProp<
  RootStackParamList,
  'IndoorActivityRecommendations'
>;

export default function IndoorActivityRecommendationsScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const route =
    useRoute<{
      key: string;
      name: 'IndoorActivityRecommendations';
      params?: {
        district?: string;
        initialBundle?: WeatherGuideBundle;
        initialCoordinates?: DeviceCoordinates;
      };
    }>();
  const district = route.params?.district?.trim() || '현재 위치';
  const weatherState = useWeatherGuide(district, route.params?.initialBundle, {
    initialCoordinates: route.params?.initialCoordinates,
    autoRefreshOnMount: !route.params?.initialBundle,
    autoRefreshOnFocus: false,
    autoRefreshOnActive: false,
  });
  const weather = weatherState.bundle;
  const heroTitle = weatherState.isUnavailable
    ? '실시간 날씨 연결이 필요해요'
    : weatherState.isPreview
      ? '최근 확인한 날씨 기준 추천이에요'
      : '밖은 위험해요!\n집에서 즐겁게 놀아요 🏠';
  const heroBody = weatherState.isUnavailable
    ? '위치 권한과 네트워크가 확인되면 실제 날씨 기준으로 추천이 다시 맞춰집니다.'
    : weatherState.isPreview
      ? `${weather.detailStatus} 기준의 최근 추천을 잠시 보여주고 있어요. 연결되면 실시간 정보로 갱신됩니다.`
      : `${weather.detailStatus}인 날엔 산책보다 아이와 함께하는 실내 활동이 더 편안할 수 있어요.`;
  const guides = useMemo(
    () => {
      const orderedKeys = [
        ...weather.recommendedGuideKeys,
        ...ALL_INDOOR_ACTIVITY_KEYS,
      ].filter(
        (key, index, list) => list.indexOf(key) === index,
      );

      return orderedKeys.map(getIndoorActivityGuide);
    },
    [weather.recommendedGuideKeys],
  );
  const onPressGuide = useCallback(
    (guideKey: IndoorActivityKey) => {
      try {
        navigation.navigate('ActivityGuide', {
          guideKey,
          district: weather.district,
        });
      } catch {
        // noop
      }
    },
    [navigation, weather.district],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerSideSlot}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>실내놀이추천</Text>
        <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom + 28, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroBadge}>TODAY&apos;S GUIDE</Text>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroBody}>{heroBody}</Text>
          {weatherState.error ? (
            <Text style={styles.heroHint}>{weatherState.error}</Text>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>추천 활동 리스트</Text>
        </View>

        <View style={styles.list}>
          {guides.map(item => (
            <IndoorActivityCard
              key={item.key}
              item={item}
              onPress={() => onPressGuide(item.key)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  header: {
    minHeight: 56,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerSideSlot: {
    width: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSideSlotRight: {
    alignItems: 'flex-end',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 22,
    color: '#0B1220',
    fontWeight: '900',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 20,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: '#EFE8FA',
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(122,69,244,0.12)',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    color: '#8B5CF6',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1B2434',
    fontWeight: '700',
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 21,
    color: '#7D879A',
    fontWeight: '400',
  },
  heroHint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 20,
    color: '#1B2434',
    fontWeight: '700',
  },
  list: {
    gap: 14,
  },
});
