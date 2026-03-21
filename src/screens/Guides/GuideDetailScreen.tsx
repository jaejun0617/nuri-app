import React, { useEffect, useRef } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import OptimizedImage from '../../components/images/OptimizedImage';
import { usePetCareGuideDetail } from '../../hooks/usePetCareGuideDetail';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { getAgeInMonthsFromBirthDate } from '../../services/guides/agePolicy';
import { buildGuideEventMetadata } from '../../services/guides/analytics';
import {
  formatGuideAgePolicyLabel,
  formatGuideTargetSpeciesLabel,
  getGuideCategoryLabel,
} from '../../services/guides/presentation';
import { recordPetCareGuideEvents } from '../../services/guides/service';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { styles } from './GuideDetailScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'GuideDetail'>;
type Route = RootScreenRoute<'GuideDetail'>;

export default function GuideDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const selectedPet = usePetStore(s => {
    if (s.pets.length === 0) return null;
    if (!s.selectedPetId) return s.pets[0];
    return s.pets.find(pet => pet.id === s.selectedPetId) ?? s.pets[0];
  });
  const sessionUserId = useAuthStore(s => s.session?.user.id ?? null);
  const viewedSignatureRef = useRef('');
  const guideState = usePetCareGuideDetail(route.params.guideId);
  const headerTopInset = Math.max(insets.top, 12);
  const ageInMonths = getAgeInMonthsFromBirthDate(selectedPet?.birthDate ?? null);

  useEffect(() => {
    if (!guideState.guide) return;
    const signature = `${sessionUserId ?? 'guest'}:${selectedPet?.id ?? 'no-pet'}:${guideState.guide.id}`;
    if (viewedSignatureRef.current === signature) return;
    viewedSignatureRef.current = signature;

    recordPetCareGuideEvents([
      {
        userId: sessionUserId,
        petId: selectedPet?.id ?? null,
        guideId: guideState.guide.id,
        eventType: 'detail_view',
        placement: 'guide-detail',
        contextSpeciesGroup: selectedPet?.species ?? null,
        contextSpeciesDetailKey: selectedPet?.speciesDetailKey ?? null,
        contextAgeInMonths: ageInMonths,
        metadata: buildGuideEventMetadata({
          guide: guideState.guide,
          source: 'guide-detail',
          context: {
            species: selectedPet?.species ?? null,
            speciesDetailKey: selectedPet?.speciesDetailKey ?? null,
            speciesDisplayName: selectedPet?.speciesDisplayName ?? null,
            birthDate: selectedPet?.birthDate ?? null,
            deathDate: selectedPet?.deathDate ?? null,
          },
        }),
      },
    ]).catch(() => {});
  }, [
    ageInMonths,
    guideState.guide,
    selectedPet?.birthDate,
    selectedPet?.deathDate,
    selectedPet?.id,
    selectedPet?.species,
    selectedPet?.speciesDetailKey,
    selectedPet?.speciesDisplayName,
    sessionUserId,
  ]);

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      {guideState.loading ? (
        <View style={styles.emptyCard}>
          <Feather name="loader" size={28} color="#6D6AF8" />
          <AppText preset="headline" style={styles.emptyTitle}>
            가이드를 불러오는 중이에요
          </AppText>
          <AppText preset="body" style={styles.emptyDesc}>
            상세 콘텐츠를 차분히 정리하고 있어요.
          </AppText>
        </View>
      ) : !guideState.guide ? (
        <View style={styles.emptyCard}>
          <Feather name="alert-circle" size={28} color="#6D6AF8" />
          <AppText preset="headline" style={styles.emptyTitle}>
            가이드를 찾지 못했어요
          </AppText>
          <AppText preset="body" style={styles.emptyDesc}>
            {guideState.error ?? '비활성화되었거나 더 이상 제공되지 않는 콘텐츠일 수 있어요.'}
          </AppText>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: headerTopInset + 4 },
          ]}
        >
          <View style={styles.topBar}>
            <View style={styles.headerSideSlot}>
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.headerBackButton}
                onPress={() => navigation.goBack()}
              >
                <Feather name="arrow-left" size={20} color="#102033" />
              </TouchableOpacity>
            </View>

            <View style={styles.topBarTitleWrap}>
              <AppText preset="headline" style={styles.headerTitle}>
                집사 꿀팁 가이드
              </AppText>
            </View>

            <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
          </View>

          <View style={styles.heroCard}>
            {guideState.guide.image?.sourceUri ? (
              <OptimizedImage
                uri={guideState.guide.image.sourceUri}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Feather name="book-open" size={28} color="#6D6AF8" />
                <AppText preset="body" style={styles.heroPlaceholderText}>
                  이미지가 준비되면 여기에 노출됩니다
                </AppText>
              </View>
            )}

            <View style={styles.heroBody}>
              <View style={styles.categoryBadge}>
                <AppText preset="caption" style={styles.categoryText}>
                  {getGuideCategoryLabel(guideState.guide.category)}
                </AppText>
              </View>
              <AppText preset="title2" style={styles.title}>
                {guideState.guide.title}
              </AppText>
              <AppText preset="body" style={styles.summary}>
                {guideState.guide.summary}
              </AppText>
            </View>
          </View>

          <View style={styles.metaCard}>
            <AppText preset="headline" style={styles.sectionTitle}>
              대상 정보
            </AppText>
            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <AppText preset="caption" style={styles.metaChipText}>
                  {formatGuideTargetSpeciesLabel(guideState.guide.targetSpecies)}
                </AppText>
              </View>
              <View style={styles.metaChip}>
                <AppText preset="caption" style={styles.metaChipText}>
                  {formatGuideAgePolicyLabel(guideState.guide.agePolicy)}
                </AppText>
              </View>
              {guideState.guide.tags.map(tag => (
                <View key={tag} style={styles.metaChip}>
                  <AppText preset="caption" style={styles.metaChipText}>
                    #{tag}
                  </AppText>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.bodyCard}>
            <AppText preset="headline" style={styles.sectionTitle}>
              상세 가이드
            </AppText>
            <AppText preset="body" style={styles.bodyText}>
              {guideState.guide.body ?? guideState.guide.bodyPreview}
            </AppText>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
