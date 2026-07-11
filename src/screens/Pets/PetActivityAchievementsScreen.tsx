import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import {
  loadActivityDashboard,
  type ActivityAchievement,
  type ActivityDashboardData,
  type CommonActivityDashboardSummary,
  type PetActivityDashboardSummary,
} from '../../services/activity/activityDashboard';
import { LEVEL_THRESHOLDS } from '../../services/activity/progressPolicy';
import { TIMELINE_MAIN_CATEGORY_OPTIONS } from '../../services/memories/categoryMeta';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { openMoreDrawer, showToast } from '../../store/uiStore';
import { usePetStore } from '../../store/petStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PetActivityAchievements'>;
type Route = RootScreenRoute<'PetActivityAchievements'>;

type MetricCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: string;
  tint: string;
};

const DEFAULT_LEVEL = {
  totalXp: 0,
  level: 1,
  currentLevelXp: 0,
  nextLevelXp: 100,
  updatedAt: null,
};

const MetricCard = memo(function MetricCard({
  label,
  value,
  helper,
  icon,
  tint,
}: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: `${tint}18` }]}>
        <Feather name={icon} size={16} color={tint} />
      </View>
      <AppText preset="caption" style={styles.metricLabel}>
        {label}
      </AppText>
      <AppText preset="headline" style={styles.metricValue}>
        {value}
      </AppText>
      <AppText preset="caption" style={styles.metricHelper} numberOfLines={2}>
        {helper}
      </AppText>
    </View>
  );
});

const SectionCard = memo(function SectionCard({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      {eyebrow ? (
        <AppText preset="caption" style={styles.sectionEyebrow}>
          {eyebrow}
        </AppText>
      ) : null}
      <AppText preset="headline" style={styles.sectionTitle}>
        {title}
      </AppText>
      {children}
    </View>
  );
});

function formatXp(value: number) {
  return `${Math.max(0, Math.floor(value)).toLocaleString('ko-KR')} XP`;
}

function getAchievementTone(achievement: ActivityAchievement) {
  if (achievement.achieved) return '#20D34A';
  if (achievement.domain === 'health') return '#7C8EA6';
  if (achievement.domain === 'community' || achievement.domain === 'comment') {
    return '#8A7BFF';
  }
  return '#4FA7FF';
}

function getNextLevelLabel(input: ActivityDashboardData) {
  const { levelSummary, maxLevel } = input;
  if (levelSummary.level >= maxLevel) return '최고 레벨 달성';
  const remaining = Math.max(0, levelSummary.nextLevelXp - levelSummary.totalXp);
  return `다음 레벨까지 ${remaining.toLocaleString('ko-KR')} XP`;
}

const DashboardSkeleton = memo(function DashboardSkeleton({
  accentColor,
}: {
  accentColor: string;
}) {
  return (
    <>
      <View style={[styles.growthCard, { borderColor: `${accentColor}25` }]}>
        <View style={styles.skeletonLineShort} />
        <View style={styles.skeletonLineLarge} />
        <View style={styles.skeletonProgressTrack}>
          <View style={[styles.skeletonProgressFill, { backgroundColor: `${accentColor}35` }]} />
        </View>
        <View style={styles.skeletonMetaRow}>
          <View style={styles.skeletonLineTiny} />
          <View style={styles.skeletonLineTiny} />
        </View>
      </View>

      <SectionCard title="아이별 성장 기록" eyebrow="멀티펫 분리">
        <View style={styles.skeletonPetRow}>
          <View style={styles.skeletonPetCard} />
          <View style={styles.skeletonPetCard} />
        </View>
      </SectionCard>

      <SectionCard title="활동 요약" eyebrow="카드별 정리 중">
        <View style={styles.metricGrid}>
          {[0, 1, 2, 3].map(index => (
            <View key={index} style={styles.metricCard}>
              <View style={styles.skeletonIcon} />
              <View style={styles.skeletonLineShort} />
              <View style={styles.skeletonLineTiny} />
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="칭호·훈장 보관함" eyebrow="달성/잠금">
        <View style={styles.achievementGrid}>
          {[0, 1, 2].map(index => (
            <View key={index} style={styles.achievementCard}>
              <View style={styles.skeletonIcon} />
              <View style={styles.achievementTextWrap}>
                <View style={styles.skeletonLineShort} />
                <View style={styles.skeletonLineWide} />
              </View>
            </View>
          ))}
        </View>
      </SectionCard>
    </>
  );
});

function GrowthCard({
  dashboard,
  accentColor,
}: {
  dashboard: ActivityDashboardData;
  accentColor: string;
}) {
  const progressPercent = Math.round(dashboard.levelProgress * 100);
  const levelSummary = dashboard.levelSummary ?? DEFAULT_LEVEL;

  return (
    <View style={[styles.growthCard, { borderColor: `${accentColor}28` }]}>
      <View style={styles.growthTopRow}>
        <View>
          <AppText preset="caption" style={styles.growthEyebrow}>
            나의 활동 성장
          </AppText>
          <AppText preset="display" style={styles.growthTitle}>
            Lv.{levelSummary.level}
          </AppText>
        </View>
        <View style={[styles.titlePill, { backgroundColor: `${accentColor}16` }]}>
          <AppText preset="caption" style={[styles.titlePillText, { color: accentColor }]}>
            {dashboard.representativeTitle}
          </AppText>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${progressPercent}%`, backgroundColor: accentColor },
          ]}
        />
      </View>
      <View style={styles.growthBottomRow}>
        <AppText preset="caption" style={styles.growthMeta}>
          {formatXp(levelSummary.totalXp)}
        </AppText>
        <AppText preset="caption" style={styles.growthMeta}>
          {getNextLevelLabel(dashboard)}
        </AppText>
      </View>
      <AppText preset="caption" style={styles.levelPolicyNote}>
        Lv.1~{LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]?.level ?? 30}
        까지 열려 있어요. 높은 레벨일수록 더 오래 쌓아야 해요.
      </AppText>
    </View>
  );
}

function PetSelector({
  pets,
  selectedPetId,
  onSelect,
  accentColor,
}: {
  pets: PetActivityDashboardSummary[];
  selectedPetId: string | null;
  onSelect: (petId: string) => void;
  accentColor: string;
}) {
  if (pets.length === 0) {
    return (
      <View style={styles.emptyPetsCard}>
        <AppText preset="headline" style={styles.emptyTitle}>
          아직 연결된 아이가 없어요
        </AppText>
        <AppText preset="body" style={styles.emptyBody}>
          아이를 등록하면 펫별 산책, 타임라인, 건강 기록을 따로 볼 수 있어요.
        </AppText>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.petSelectorContent}
    >
      {pets.map(pet => {
        const active = pet.petId === selectedPetId;
        return (
          <TouchableOpacity
            key={pet.petId}
            activeOpacity={0.9}
            style={[
              styles.petSelectorCard,
              active ? { borderColor: accentColor, backgroundColor: `${accentColor}10` } : null,
            ]}
            onPress={() => onSelect(pet.petId)}
          >
            <AppText preset="headline" style={styles.petSelectorName} numberOfLines={1}>
              {pet.petName}
            </AppText>
            <AppText preset="caption" style={styles.petSelectorMeta}>
              {formatXp(pet.xp)} · 훈장 {pet.achievements.filter(item => item.achieved).length}개
            </AppText>
            <AppText preset="caption" style={styles.petSelectorMeta}>
              최고 산책 {pet.streak?.bestStreak ?? 0}일
            </AppText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function PetActivityCards({
  pet,
  accentColor,
}: {
  pet: PetActivityDashboardSummary | null;
  accentColor: string;
}) {
  if (!pet) return null;

  const categoryLabels = TIMELINE_MAIN_CATEGORY_OPTIONS.map(item => ({
    key: item.key,
    label: item.label,
    count: pet.timelineCategoryCounts[item.key] ?? 0,
  }));

  return (
    <>
      <SectionCard title={`${pet.petName} 활동 요약`} eyebrow="펫별 활동">
        <View style={styles.metricGrid}>
          <MetricCard
            label="산책"
            value={`${pet.walk.eventCount}회`}
            helper={`${formatXp(pet.walk.xp)} · 현재 ${pet.streak?.currentStreak ?? 0}일`}
            icon="activity"
            tint={accentColor}
          />
          <MetricCard
            label="타임라인"
            value={`${pet.timelineCategoryCounts.all ?? pet.timeline.eventCount}개`}
            helper={`${formatXp(pet.timeline.xp)} · 카테고리별 분리`}
            icon="book-open"
            tint="#4FA7FF"
          />
          <MetricCard
            label="건강관리"
            value={`${pet.health.recordCount}개`}
            helper={`${formatXp(pet.health.xp)} · 건강 기록 기준`}
            icon="heart"
            tint="#7C8EA6"
          />
        </View>
      </SectionCard>

      <SectionCard title="타임라인 카테고리" eyebrow="선택한 아이 기준">
        <View style={styles.categoryGrid}>
          {categoryLabels.map(item => (
            <View key={item.key} style={styles.categoryPill}>
              <AppText preset="caption" style={styles.categoryLabel}>
                {item.label}
              </AppText>
              <AppText preset="headline" style={styles.categoryCount}>
                {item.count}
              </AppText>
            </View>
          ))}
        </View>
      </SectionCard>
    </>
  );
}

function CommonActivityCard({
  summary,
}: {
  summary: CommonActivityDashboardSummary;
}) {
  return (
    <SectionCard title="공통 활동" eyebrow="사용자 전체 기준">
      <AppText preset="body" style={styles.commonDescription}>
        커뮤니티 글과 댓글은 특정 아이에게 중복 합산하지 않고 내 활동으로만 보여줘요.
      </AppText>
      <View style={styles.metricGrid}>
        <MetricCard
          label="커뮤니티 글"
          value={`${summary.communityPosts.postCount}개`}
          helper={`${formatXp(summary.communityPosts.xp)} · 공통 활동`}
          icon="message-circle"
          tint="#8A7BFF"
        />
        <MetricCard
          label="댓글"
          value={`${summary.comments.commentCount}개`}
          helper={`${formatXp(summary.comments.xp)} · 공통 활동`}
          icon="send"
          tint="#8A7BFF"
        />
      </View>
    </SectionCard>
  );
}

function AchievementVault({
  achievements,
}: {
  achievements: ActivityAchievement[];
}) {
  const sorted = [...achievements].sort((left, right) => {
    if (left.achieved !== right.achieved) return left.achieved ? -1 : 1;
    return left.threshold - right.threshold || left.name.localeCompare(right.name);
  });

  return (
    <SectionCard title="칭호·훈장 보관함" eyebrow="달성/잠금">
      <View style={styles.achievementGrid}>
        {sorted.slice(0, 18).map(item => {
          const tint = getAchievementTone(item);
          return (
            <View
              key={`${item.scope}:${item.ownerId}:${item.key}`}
              style={[
                styles.achievementCard,
                item.achieved
                  ? { borderColor: `${tint}50`, backgroundColor: `${tint}10` }
                  : null,
              ]}
            >
              <View style={[styles.achievementIcon, { backgroundColor: `${tint}18` }]}>
                <Feather
                  name={item.achieved ? 'award' : 'lock'}
                  size={15}
                  color={item.achieved ? tint : '#9AA4B3'}
                />
              </View>
              <View style={styles.achievementTextWrap}>
                <AppText preset="body" style={styles.achievementName} numberOfLines={1}>
                  {item.name}
                </AppText>
                <AppText preset="caption" style={styles.achievementCondition} numberOfLines={2}>
                  {item.ownerLabel} · {item.conditionLabel} · {item.currentValue}/{item.threshold}
                </AppText>
              </View>
            </View>
          );
        })}
      </View>
    </SectionCard>
  );
}

export default function PetActivityAchievementsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const pets = usePetStore(state => state.pets);
  const selectedPetId = usePetStore(state => state.selectedPetId);
  const [selectedDashboardPetId, setSelectedDashboardPetId] =
    useState<string | null>(selectedPetId);
  const [dashboard, setDashboard] = useState<ActivityDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const selectedPet = useMemo(
    () => pets.find(pet => pet.id === (selectedDashboardPetId ?? selectedPetId)) ?? pets[0] ?? null,
    [pets, selectedDashboardPetId, selectedPetId],
  );
  const accentPalette = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );

  const selectedPetSummary = useMemo(() => {
    if (!dashboard) return null;
    const targetId = selectedDashboardPetId ?? selectedPetId ?? dashboard.petSummaries[0]?.petId;
    return dashboard.petSummaries.find(pet => pet.petId === targetId) ?? dashboard.petSummaries[0] ?? null;
  }, [dashboard, selectedDashboardPetId, selectedPetId]);

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

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        const nextDashboard = await loadActivityDashboard(
          pets.map(pet => ({
            id: pet.id,
            name: pet.name,
            themeColor: pet.themeColor ?? null,
          })),
        );
        setDashboard(nextDashboard);
        setSelectedDashboardPetId(current =>
          current ?? selectedPetId ?? nextDashboard.petSummaries[0]?.petId ?? null,
        );
      } catch {
        showToast({
          tone: 'error',
          title: '활동 기록을 불러오지 못했어요',
          message: '잠시 뒤 다시 열어 주세요.',
          durationMs: 3000,
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pets, selectedPetId],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  const onRefresh = useCallback(() => {
    load('refresh');
  }, [load]);

  const activePetId = selectedPetSummary?.petId ?? selectedDashboardPetId;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top + 8, 18),
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.backButton}
          onPress={onPressBack}
        >
          <Feather name="arrow-left" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <AppText preset="headline" style={[styles.title, { color: theme.colors.textPrimary }]}>
            활동·칭호
          </AppText>
          <AppText preset="caption" style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            아이별 활동과 내 공통 활동을 분리해서 보여줘요.
          </AppText>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom + 104, 132) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentPalette.primary}
          />
        }
      >
        {loading && !dashboard ? (
          <DashboardSkeleton accentColor={accentPalette.primary} />
        ) : dashboard ? (
          <>
            <GrowthCard dashboard={dashboard} accentColor={accentPalette.primary} />

            <SectionCard title="아이별 성장 기록" eyebrow="멀티펫 분리">
              <PetSelector
                pets={dashboard.petSummaries}
                selectedPetId={activePetId}
                onSelect={setSelectedDashboardPetId}
                accentColor={accentPalette.primary}
              />
            </SectionCard>

            <PetActivityCards
              pet={selectedPetSummary}
              accentColor={accentPalette.primary}
            />
            <CommonActivityCard summary={dashboard.commonSummary} />
            <AchievementVault achievements={dashboard.allAchievements} />

            {dashboard.ledgerLimitReached ? (
              <AppText preset="caption" style={styles.limitNotice}>
                최근 1,000개 XP ledger 기준으로 표시 중이에요. 장기 통계는 후속 summary RPC에서
                확장합니다.
              </AppText>
            ) : null}
          </>
        ) : (
          <View style={styles.emptyPetsCard}>
            <AppText preset="headline" style={styles.emptyTitle}>
              활동 기록을 불러오지 못했어요
            </AppText>
            <AppText preset="body" style={styles.emptyBody}>
              네트워크 상태를 확인한 뒤 다시 시도해 주세요.
            </AppText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    gap: 6,
    paddingTop: 3,
  },
  title: {
    fontWeight: '900',
  },
  subtitle: {
    lineHeight: 18,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#7C889A',
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 4,
    gap: 14,
  },
  growthCard: {
    borderWidth: 1,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 20,
    shadowColor: '#101828',
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 5,
  },
  growthTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  growthEyebrow: {
    color: '#7C889A',
    fontWeight: '800',
  },
  growthTitle: {
    color: '#172033',
    fontWeight: '900',
    marginTop: 4,
  },
  titlePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 158,
  },
  titlePillText: {
    fontWeight: '900',
  },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#EEF2F7',
    overflow: 'hidden',
    marginTop: 18,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  growthBottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  growthMeta: {
    color: '#5E6B7A',
    fontWeight: '800',
  },
  levelPolicyNote: {
    marginTop: 12,
    color: '#8A95A6',
    lineHeight: 18,
  },
  sectionCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 1,
    borderColor: '#EDF1F6',
    shadowColor: '#101828',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  sectionEyebrow: {
    color: '#8A95A6',
    fontWeight: '800',
    marginBottom: 5,
  },
  sectionTitle: {
    color: '#172033',
    fontWeight: '900',
    marginBottom: 14,
  },
  petSelectorContent: {
    gap: 10,
    paddingRight: 2,
  },
  petSelectorCard: {
    width: 172,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6EBF2',
    backgroundColor: '#FAFBFD',
    padding: 14,
  },
  petSelectorName: {
    color: '#172033',
    fontWeight: '900',
  },
  petSelectorMeta: {
    color: '#687486',
    fontWeight: '700',
    marginTop: 6,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 130,
    borderRadius: 20,
    backgroundColor: '#FAFBFD',
    borderWidth: 1,
    borderColor: '#EDF1F6',
    padding: 14,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricLabel: {
    color: '#7C889A',
    fontWeight: '800',
  },
  metricValue: {
    color: '#172033',
    fontWeight: '900',
    marginTop: 4,
  },
  metricHelper: {
    color: '#687486',
    lineHeight: 17,
    marginTop: 5,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    minWidth: 92,
    flexGrow: 1,
    borderRadius: 18,
    backgroundColor: '#F6F8FB',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  categoryLabel: {
    color: '#7C889A',
    fontWeight: '800',
  },
  categoryCount: {
    color: '#172033',
    fontWeight: '900',
    marginTop: 4,
  },
  commonDescription: {
    color: '#5E6B7A',
    lineHeight: 22,
    marginBottom: 14,
  },
  achievementGrid: {
    gap: 10,
  },
  achievementCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EDF1F6',
    backgroundColor: '#FAFBFD',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  achievementIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementTextWrap: {
    flex: 1,
  },
  achievementName: {
    color: '#172033',
    fontWeight: '900',
  },
  achievementCondition: {
    color: '#687486',
    lineHeight: 17,
    marginTop: 3,
  },
  emptyPetsCard: {
    borderRadius: 22,
    backgroundColor: '#FAFBFD',
    borderWidth: 1,
    borderColor: '#EDF1F6',
    padding: 18,
  },
  emptyTitle: {
    color: '#172033',
    fontWeight: '900',
  },
  emptyBody: {
    color: '#687486',
    lineHeight: 22,
    marginTop: 8,
  },
  limitNotice: {
    color: '#8A95A6',
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  skeletonLineLarge: {
    width: '62%',
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2F7',
    marginTop: 8,
  },
  skeletonLineWide: {
    width: '86%',
    height: 13,
    borderRadius: 7,
    backgroundColor: '#EEF2F7',
    marginTop: 8,
  },
  skeletonLineShort: {
    width: '48%',
    height: 15,
    borderRadius: 8,
    backgroundColor: '#EEF2F7',
  },
  skeletonLineTiny: {
    width: 82,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EEF2F7',
  },
  skeletonProgressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#EEF2F7',
    overflow: 'hidden',
    marginTop: 20,
  },
  skeletonProgressFill: {
    width: '46%',
    height: '100%',
    borderRadius: 999,
  },
  skeletonMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  skeletonPetRow: {
    flexDirection: 'row',
    gap: 10,
  },
  skeletonPetCard: {
    width: 172,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#F2F5F9',
  },
  skeletonIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EEF2F7',
    marginBottom: 10,
  },
});
