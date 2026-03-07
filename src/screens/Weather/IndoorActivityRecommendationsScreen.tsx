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
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  ALL_INDOOR_ACTIVITY_KEYS,
  getIndoorActivityGuide,
  getWeatherGuideBundle,
  type IndoorActivityKey,
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
      params?: { district?: string };
    }>();

  const weather = useMemo(
    () => getWeatherGuideBundle(route.params?.district),
    [route.params?.district],
  );
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
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="chevron-left" size={24} color="#1B2434" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>실내놀이추천</Text>
        <View style={styles.headerSpace} />
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
          <Text style={styles.heroTitle}>밖은 위험해요!{'\n'}집에서 즐겁게 놀아요 🏠</Text>
          <Text style={styles.heroBody}>
            {weather.detailStatus}인 날엔 산책보다 아이와 함께하는 실내 활동이 더
            편안할 수 있어요.
          </Text>
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
    fontSize: 18,
    lineHeight: 26,
    color: '#1B2434',
    fontWeight: '700',
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 21,
    color: '#7D879A',
    fontWeight: '400',
  },
  sectionHeader: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: '#1B2434',
    fontWeight: '700',
  },
  list: {
    gap: 14,
  },
});
