// 파일: src/screens/Ranking/NuriRankingScreen.tsx
// 역할:
// - 전체메뉴에서 진입하는 V1.1.1 NURI 랭킹 1차 MVP 화면.
// - 서버 RPC가 마스킹한 제한 필드만 렌더링해 cross-user privacy를 지킨다.

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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import {
  ACTIVITY_RANKING_CATEGORIES,
  buildRankingBars,
  fetchActivityRanking,
  type ActivityRankingBar,
  type ActivityRankingCategoryKey,
} from '../../services/ranking/activityRanking';
import {
  ACTIVITY_RANKING_QUERY_GC_TIME_MS,
  ACTIVITY_RANKING_QUERY_STALE_TIME_MS,
  buildActivityRankingQueryKey,
} from '../../services/ranking/activityRankingQuery';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { openMoreDrawer, showToast } from '../../store/uiStore';
import { usePetStore } from '../../store/petStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'NuriRanking'>;
type Route = RootScreenRoute<'NuriRanking'>;

function formatTotalXp(value: number) {
  return `${Math.max(0, value).toLocaleString('ko-KR')} XP`;
}

const RankingRow = memo(function RankingRow({
  row,
  accentColor,
}: {
  row: ActivityRankingBar;
  accentColor: string;
}) {
  const theme = useTheme();
  const podiumColor =
    row.rankNo === 1 ? '#E5B84E' : row.rankNo === 2 ? '#A7B0C3' : row.rankNo === 3 ? '#C98B5C' : accentColor;

  return (
    <View
      style={[
        styles.rankCard,
        row.isCurrentUser ? { borderColor: `${accentColor}66` } : null,
      ]}
    >
      <View style={[styles.rankBadge, { backgroundColor: `${podiumColor}18` }]}>
        <AppText preset="caption" style={[styles.rankBadgeText, { color: podiumColor }]}>
          {row.rankNo}
        </AppText>
      </View>

      <View style={styles.rankBody}>
        <View style={styles.rankTopRow}>
          <AppText preset="headline" style={styles.rankName} numberOfLines={1}>
            {row.displayName}
          </AppText>
          <AppText preset="caption" style={styles.rankLevel}>
            Lv.{row.level}
          </AppText>
        </View>

        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.round(row.barRatio * 100)}%`,
                backgroundColor: row.isCurrentUser ? accentColor : podiumColor,
              },
            ]}
          />
        </View>

        <View style={styles.rankBottomRow}>
          <AppText preset="caption" style={styles.rankScore}>
            {row.scoreLabel}
          </AppText>
          <AppText preset="caption" style={[styles.rankTotal, { color: theme.colors.textMuted }]}>
            누적 {formatTotalXp(row.totalXp)}
          </AppText>
        </View>
      </View>
    </View>
  );
});

const RankingSkeletonRows = memo(function RankingSkeletonRows({
  accentColor,
}: {
  accentColor: string;
}) {
  return (
    <>
      {[0, 1, 2].map(index => (
        <View key={index} style={styles.rankCard}>
          <View style={[styles.rankBadge, { backgroundColor: `${accentColor}14` }]} />
          <View style={styles.rankBody}>
            <View style={styles.rankTopRow}>
              <View style={styles.skeletonNameLine} />
              <View style={styles.skeletonLevelPill} />
            </View>
            <View style={styles.skeletonBarTrack}>
              <View
                style={[
                  styles.skeletonBarFill,
                  {
                    width: `${64 - index * 14}%`,
                    backgroundColor: `${accentColor}30`,
                  },
                ]}
              />
            </View>
            <View style={styles.rankBottomRow}>
              <View style={styles.skeletonScoreLine} />
              <View style={styles.skeletonTotalLine} />
            </View>
          </View>
        </View>
      ))}
    </>
  );
});

export default function NuriRankingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const selectedPet = useMemo(
    () => pets.find(candidate => candidate.id === selectedPetId) ?? pets[0] ?? null,
    [pets, selectedPetId],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor ?? theme.colors.brand),
    [selectedPet?.themeColor, theme.colors.brand],
  );
  const [selectedCategory, setSelectedCategory] = useState<ActivityRankingCategoryKey>('overall');
  const rankingQueryKey = useMemo(
    () =>
      buildActivityRankingQueryKey({
        category: selectedCategory,
        includeQaFixture: true,
      }),
    [selectedCategory],
  );
  const cachedRows = queryClient.getQueryData<ActivityRankingBar[]>(rankingQueryKey) ?? [];
  const rankingQuery = useQuery<ActivityRankingBar[], Error>({
    queryKey: rankingQueryKey,
    queryFn: async () => {
      const rows = await fetchActivityRanking({
        category: selectedCategory,
        limit: 20,
        includeQaFixture: true,
      });
      return buildRankingBars(rows);
    },
    staleTime: ACTIVITY_RANKING_QUERY_STALE_TIME_MS,
    gcTime: ACTIVITY_RANKING_QUERY_GC_TIME_MS,
    retry: 1,
    placeholderData: () => (cachedRows.length > 0 ? cachedRows : undefined),
  });
  const rows = rankingQuery.data ?? cachedRows;
  const isInitialLoading = rankingQuery.isPending && rows.length === 0;
  const rankingErrorMessage =
    rankingQuery.error?.message ?? '랭킹을 불러오지 못했어요.';

  const backAction = useEntryAwareBackAction({
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
    onFallback: () => navigation.goBack(),
  });

  const selectedMeta =
    ACTIVITY_RANKING_CATEGORIES.find(item => item.key === selectedCategory) ??
    ACTIVITY_RANKING_CATEGORIES[0];

  useEffect(() => {
    if (!rankingQuery.isError) return;
    showToast({
      tone: 'error',
      title: '랭킹 확인 실패',
      message: '잠시 뒤 다시 확인해 주세요.',
      durationMs: 2600,
    });
  }, [rankingQuery.errorUpdatedAt, rankingQuery.isError]);

  const onRefresh = useCallback(() => {
    rankingQuery.refetch().catch(() => undefined);
  }, [rankingQuery]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="랭킹 화면 닫기"
          style={[styles.headerIconButton, { backgroundColor: theme.colors.surfaceElevated }]}
          onPress={backAction}
        >
          <Feather name="chevron-left" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <AppText preset="caption" style={[styles.headerEyebrow, { color: petTheme.primary }]}>
            NURI RANKING
          </AppText>
          <AppText preset="title1" style={styles.headerTitle}>
            누리 랭킹
          </AppText>
        </View>
        <TouchableOpacity
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="전체메뉴 열기"
          style={[styles.headerIconButton, { backgroundColor: theme.colors.surfaceElevated }]}
          onPress={openMoreDrawer}
        >
          <Feather name="menu" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={rankingQuery.isRefetching && !rankingQuery.isPending}
            onRefresh={onRefresh}
            tintColor={petTheme.primary}
            colors={[petTheme.primary]}
          />
        }
      >
        <View style={[styles.heroCard, { borderColor: `${petTheme.primary}25` }]}>
          <View style={[styles.heroIcon, { backgroundColor: petTheme.soft }]}>
            <Feather name="bar-chart-2" size={23} color={petTheme.primary} />
          </View>
          <View style={styles.heroTextWrap}>
            <AppText preset="headline" style={styles.heroTitle}>
              서로의 활동을 가볍게 응원해요
            </AppText>
            <AppText preset="body" style={styles.heroBody}>
              개인정보는 숨기고, 활동 점수만 차분하게 보여주는 성장형 랭킹이에요.
            </AppText>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabContent}
        >
          {ACTIVITY_RANKING_CATEGORIES.map(item => {
            const active = item.key === selectedCategory;
            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.88}
                style={[
                  styles.tabButton,
                  active
                    ? { backgroundColor: petTheme.primary, borderColor: petTheme.primary }
                    : { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
                ]}
                onPress={() => setSelectedCategory(item.key)}
              >
                <AppText
                  preset="caption"
                  style={[
                    styles.tabText,
                    { color: active ? '#FFFFFF' : theme.colors.textSecondary },
                  ]}
                >
                  {item.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <View>
            <AppText preset="headline" style={styles.sectionTitle}>
              {selectedMeta.label} 랭킹
            </AppText>
            <AppText preset="caption" style={styles.sectionHelper}>
              {selectedMeta.helper}
            </AppText>
          </View>
          <View style={[styles.privacyPill, { backgroundColor: petTheme.soft }]}>
            <Feather name="shield" size={13} color={petTheme.primary} />
            <AppText preset="caption" style={[styles.privacyText, { color: petTheme.primary }]}>
              마스킹
            </AppText>
          </View>
        </View>

        {isInitialLoading ? (
          <RankingSkeletonRows accentColor={petTheme.primary} />
        ) : null}

        {rankingQuery.isError && rows.length === 0 ? (
          <View style={styles.stateCard}>
            <Feather name="alert-circle" size={24} color={theme.colors.textMuted} />
            <AppText preset="headline" style={styles.stateTitle}>
              랭킹을 준비 중이에요
            </AppText>
            <AppText preset="body" style={styles.stateText}>
              {rankingErrorMessage}
            </AppText>
          </View>
        ) : null}

        {!isInitialLoading && !rankingQuery.isError && rows.length === 0 ? (
          <View style={styles.stateCard}>
            <Feather name="bar-chart" size={24} color={theme.colors.textMuted} />
            <AppText preset="headline" style={styles.stateTitle}>
              아직 쌓인 활동이 없어요
            </AppText>
            <AppText preset="body" style={styles.stateText}>
              기록과 댓글이 쌓이면 이곳에 예쁜 막대 랭킹으로 표시돼요.
            </AppText>
          </View>
        ) : null}

        {rows.map(row => (
          <RankingRow key={`${row.rowSource}-${row.rankNo}-${row.displayName}`} row={row} accentColor={petTheme.primary} />
        ))}
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
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerEyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  headerTitle: {
    marginTop: 2,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
    letterSpacing: 0,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    gap: 14,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#FFFFFF',
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
    letterSpacing: 0,
  },
  heroBody: {
    marginTop: 5,
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0,
  },
  tabContent: {
    gap: 8,
    paddingVertical: 2,
  },
  tabButton: {
    minHeight: 38,
    borderRadius: 19,
    borderWidth: 1,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    letterSpacing: 0,
  },
  sectionHeader: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: 0,
  },
  sectionHelper: {
    marginTop: 2,
    color: '#7B8494',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0,
  },
  privacyPill: {
    minHeight: 30,
    borderRadius: 15,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  privacyText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  stateCard: {
    minHeight: 160,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  stateTitle: {
    marginTop: 10,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
    letterSpacing: 0,
  },
  stateText: {
    marginTop: 8,
    color: '#7B8494',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0,
  },
  rankCard: {
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.95)',
    borderRadius: 24,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  rankBadge: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: 0,
  },
  rankBody: {
    flex: 1,
  },
  rankTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rankName: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: 0,
  },
  rankLevel: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  barTrack: {
    marginTop: 11,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EEF2F7',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  rankBottomRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rankScore: {
    color: '#111827',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    letterSpacing: 0,
  },
  rankTotal: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 0,
  },
  skeletonNameLine: {
    flex: 1,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EEF2F7',
  },
  skeletonLevelPill: {
    width: 44,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EEF2F7',
  },
  skeletonBarTrack: {
    marginTop: 11,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EEF2F7',
    overflow: 'hidden',
  },
  skeletonBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  skeletonScoreLine: {
    width: 74,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#EEF2F7',
  },
  skeletonTotalLine: {
    width: 96,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#EEF2F7',
  },
});
