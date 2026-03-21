// 파일: src/screens/Weather/ActivityGuideScreen.tsx
// 역할:
// - 실내 활동 상세 가이드를 공통 화면 구조로 렌더링
// - 단계별 안내 후 기록 화면으로 자연스럽게 이동

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import ActivityGuideHeroCard from '../../components/weather/ActivityGuideHeroCard';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import {
  getIndoorActivityGuide,
  type IndoorActivityKey,
} from '../../services/weather/guide';
import { usePetStore } from '../../store/petStore';
import { openMoreDrawer } from '../../store/uiStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ActivityGuide'>;

export default function ActivityGuideScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const route =
    useRoute<{
      key: string;
      name: 'ActivityGuide';
      params: {
        guideKey: IndoorActivityKey;
        district?: string;
        entrySource?: 'home' | 'more';
      };
    }>();
  const guideKey = route.params?.guideKey ?? 'nosework';
  const district = route.params?.district?.trim() || '현재 위치';
  const guide = useMemo(() => getIndoorActivityGuide(guideKey), [guideKey]);
  const selectedPet = usePetStore(s => {
    if (s.pets.length === 0) return null;
    if (!s.selectedPetId) return s.pets[0];
    return s.pets.find(pet => pet.id === s.selectedPetId) ?? s.pets[0];
  });
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );
  const onPressBack = useEntryAwareBackAction({
    entrySource: route.params?.entrySource,
    onHome: () => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
      });
    },
    onMore: () => {
      navigation.goBack();
      requestAnimationFrame(() => {
        openMoreDrawer();
      });
    },
    onFallback: () => {
      navigation.goBack();
    },
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerSideSlot}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.backButton}
            onPress={onPressBack}
          >
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>{guide.title} 가이드</Text>
        <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 96 + Math.max(insets.bottom, 18) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ActivityGuideHeroCard guide={guide} accentColor={petTheme.primary} />

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
                      color={petTheme.primary}
                    />
                  </View>
                  {index < guide.steps.length - 1 ? (
                    <View
                      style={[
                        styles.stepLine,
                        { backgroundColor: petTheme.border },
                      ]}
                    />
                  ) : null}
                </View>

                <View style={styles.stepTextWrap}>
                  <Text style={[styles.stepLabel, { color: petTheme.primary }]}>
                    STEP {index + 1}
                  </Text>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 18) },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.92}
          style={[styles.primaryButton, { backgroundColor: petTheme.primary }]}
          onPress={() => {
            try {
              navigation.navigate('WeatherActivityRecord', {
                guideKey: guide.key,
                district,
                entrySource: route.params?.entrySource,
              });
            } catch {
              // noop
            }
          }}
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
    gap: 26,
  },
  section: {
    gap: 18,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
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
    fontSize: 16,
    lineHeight: 22,
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
    paddingTop: 6,
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
