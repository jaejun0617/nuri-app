// 파일: src/screens/Weather/ActivityGuideScreen.tsx
// 역할:
// - 실내 활동 상세 가이드를 공통 화면 구조로 렌더링
// - 단계별 안내 후 기록 화면으로 자연스럽게 이동

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import ActivityGuideHeroCard from '../../components/weather/ActivityGuideHeroCard';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getIndoorActivityGuide } from '../../services/weather/guide';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ActivityGuide'>;

export default function ActivityGuideScreen() {
  const navigation = useNavigation<Nav>();
  const route =
    useRoute<{
      key: string;
      name: 'ActivityGuide';
      params: {
        guideKey: 'nosework' | 'tug' | 'training' | 'massage';
        district?: string;
      };
    }>();

  const guide = useMemo(
    () => getIndoorActivityGuide(route.params.guideKey),
    [route.params.guideKey],
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
        <Text style={styles.headerTitle}>{guide.title} 가이드</Text>
        <View style={styles.headerSpace} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ActivityGuideHeroCard guide={guide} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>놀이 순서</Text>
          <View style={styles.stepList}>
            {guide.steps.map((step, index) => (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.stepIconColumn}>
                  <View style={styles.stepIconCircle}>
                    <MaterialCommunityIcons
                      name={step.icon as never}
                      size={20}
                      color="#8B5CF6"
                    />
                  </View>
                  {index < guide.steps.length - 1 ? (
                    <View style={styles.stepLine} />
                  ) : null}
                </View>

                <View style={styles.stepTextWrap}>
                  <Text style={styles.stepLabel}>STEP {index + 1}</Text>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.primaryButton}
          onPress={() =>
            navigation.navigate('WeatherActivityRecord', {
              guideKey: guide.key,
              district: route.params.district,
            })
          }
        >
          <MaterialCommunityIcons
            name="check-circle-outline"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.primaryButtonText}>활동 완료하고 기록하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAF9FD',
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
    paddingBottom: 130,
    gap: 26,
  },
  section: {
    gap: 18,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    color: '#1B2434',
    fontWeight: '700',
  },
  stepList: {
    gap: 18,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 14,
  },
  stepIconColumn: {
    alignItems: 'center',
  },
  stepIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E4DEF1',
    marginTop: 8,
  },
  stepTextWrap: {
    flex: 1,
    paddingTop: 4,
    gap: 4,
  },
  stepLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#B18EFF',
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: '#1B2434',
    fontWeight: '700',
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: '#7C879A',
    fontWeight: '400',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: 'rgba(250,249,253,0.96)',
  },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7A45F4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
