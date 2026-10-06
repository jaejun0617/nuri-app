import React, { memo } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AppText from '../../app/ui/AppText';
import { ASSETS } from '../../assets';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';
import {
  TIMELINE_MAIN_CATEGORY_OPTIONS,
  type MemoryMainCategory,
} from '../../services/memories/categoryMeta';
import type { TimelineCategoryCounts } from '../../services/timeline/query';
import type {
  UserLevelSummary,
  UserTitle,
} from '../../services/activity/xpProgress';
import {
  getProgressWithinLevel,
  MAX_ACTIVITY_LEVEL,
} from '../../services/activity/progressPolicy';
import type { TotalSummary } from '../../services/home/weeklySummary';
import type { DailyStreakStatus } from '../../services/activity/dailyStreak';
import type { SeasonKey } from '../../theme/seasonal/season';
import {
  TIMELINE_HERO_ASPECT_RATIO,
  TIMELINE_HERO_IMAGES,
  TIMELINE_SEASON_COLORS,
  TIMELINE_STATS_ANCHOR,
} from '../../theme/seasonal/timeline';
import { appendKoreanParticle } from '../../utils/koreanParticle';

export const TimelineSeasonalControls = memo(
  function TimelineSeasonalControlsView({
    season,
    sortLabel,
    monthLabel,
    mainCategory,
    categoryLabel,
    counts,
    transitioning,
    onToggleSort,
    onOpenMonth,
    onPressCategory,
  }: {
    season: SeasonKey;
    sortLabel: string;
    monthLabel: string;
    mainCategory: MemoryMainCategory;
    categoryLabel: string;
    counts: TimelineCategoryCounts;
    transitioning: boolean;
    onToggleSort: () => void;
    onOpenMonth: () => void;
    onPressCategory: (category: MemoryMainCategory) => void;
  }) {
    const colors = TIMELINE_SEASON_COLORS[season];
    return (
      <View style={s.controls} testID="timeline-seasonal-controls">
        <View style={s.controlRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`기록 월 선택, ${monthLabel}`}
            onPress={onOpenMonth}
            style={s.controlTouch}
          >
            <View testID="timeline-month-control-surface" style={s.control}>
              <AppText
                preset="unifiedMeta"
                styleOverridesPreset
                style={s.controlText}
              >
                {monthLabel}
              </AppText>
              <NuriSemanticIcon
                family="feather"
                name="chevron-down"
                size={16}
                color="#748096"
                preserveOriginal
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`정렬 변경, ${sortLabel}`}
            onPress={onToggleSort}
            style={s.controlTouch}
          >
            <View testID="timeline-sort-control-surface" style={s.control}>
              <AppText
                preset="unifiedMeta"
                styleOverridesPreset
                style={s.controlText}
              >
                {sortLabel}
              </AppText>
              <NuriSemanticIcon
                family="feather"
                name="chevron-down"
                size={16}
                color="#748096"
                preserveOriginal
              />
            </View>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.categories}
        >
          {TIMELINE_MAIN_CATEGORY_OPTIONS.map(option => {
            const active = option.key === mainCategory;
            const textColor = active ? '#FFFFFF' : '#748096';
            const label =
              option.key === 'other' && active ? categoryLabel : option.label;
            return (
              <TouchableOpacity
                key={option.key}
                testID={`timeline-category-${option.key}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${label}, ${
                  transitioning ? '집계 중' : `${counts[option.key]}개의 기록`
                }`}
                onPress={() => onPressCategory(option.key)}
                activeOpacity={0.85}
                style={s.categoryTouch}
              >
                <View
                  testID={`timeline-category-surface-${option.key}`}
                  style={[
                    s.category,
                    active
                      ? {
                          backgroundColor: colors.selectedCategory,
                          borderColor: colors.selectedCategory,
                        }
                      : null,
                  ]}
                >
                  {option.key === 'all' ? (
                    <NuriSemanticIcon
                      family="material"
                      name="view-grid"
                      size={16}
                      color={textColor}
                      preserveOriginal
                    />
                  ) : null}
                  <AppText
                    preset="unifiedMeta"
                    styleOverridesPreset
                    style={[s.categoryText, { color: textColor }]}
                  >
                    {label}
                  </AppText>
                  <AppText
                    preset="unifiedMeta"
                    styleOverridesPreset
                    style={[s.categoryCount, { color: textColor }]}
                  >
                    {transitioning ? '—' : counts[option.key]}
                  </AppText>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  },
);

export default memo(function TimelineSeasonalHeader({
  season,
  width,
  fontScale,
  level,
  titles,
  summary,
  dailyStatus,
  petName,
  showWalkStatus,
  onPressBack,
  children,
}: React.PropsWithChildren<{
  season: SeasonKey;
  width: number;
  fontScale: number;
  level: UserLevelSummary | null;
  titles: UserTitle[];
  summary: TotalSummary | null;
  dailyStatus: DailyStreakStatus | null;
  petName: string | null;
  showWalkStatus: boolean;
  onPressBack: () => void;
}>) {
  const colors = TIMELINE_SEASON_COLORS[season];
  const heroHeight = width / TIMELINE_HERO_ASPECT_RATIO;
  const stack = width < 380 || fontScale >= 1.3;
  const progress = level ? getProgressWithinLevel(level) : 0;
  const maxLevel = level !== null && level.level >= MAX_ACTIVITY_LEVEL;
  return (
    <View testID="timeline-seasonal-header">
      <View
        style={[
          s.hero,
          {
            width,
            height: heroHeight,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Image
          testID="timeline-seasonal-hero"
          source={TIMELINE_HERO_IMAGES[season]}
          resizeMode="contain"
          accessible
          accessibilityRole="image"
          accessibilityLabel="타임라인, 소중한 순간을 모으는 기록"
          style={{ width, height: heroHeight }}
        />
        <View style={s.heroNavigation} pointerEvents="box-none">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="타임라인 뒤로가기"
            onPress={onPressBack}
            style={s.heroBack}
          >
            <NuriSemanticIcon
              family="feather"
              name="arrow-left"
              size={18}
              color={colors.heroText}
              preserveOriginal
            />
          </TouchableOpacity>
        </View>
      </View>
      <View
        testID="timeline-statistics"
        style={[
          s.stats,
          { marginTop: -heroHeight * (1 - TIMELINE_STATS_ANCHOR[season]) },
          stack ? s.statsStack : null,
        ]}
      >
        <View style={s.growth}>
          <View style={s.growthTop}>
            <AppText preset="unifiedTitle" styleOverridesPreset style={s.level}>
              {level ? `Lv.${level.level}` : 'Lv.—'}
            </AppText>
            <View testID="timeline-title-xp-row" style={s.titleXpRow}>
              <AppText
                preset="unifiedMeta"
                styleOverridesPreset
                style={s.title}
              >
                {level
                  ? titles[0]?.titleName ?? '첫 추억 기록 준비 중'
                  : '활동 정보를 확인하고 있어요'}
              </AppText>
              <AppText
                testID="timeline-xp"
                preset="unifiedMeta"
                styleOverridesPreset
                style={s.xp}
              >
                <AppText
                  preset="unifiedMeta"
                  styleOverridesPreset
                  style={[s.xp, { color: colors.statsValue }]}
                >
                  {level ? level.totalXp.toLocaleString() : '—'}
                </AppText>
                {level
                  ? maxLevel
                    ? ' XP · 최고 레벨'
                    : ` / ${level.nextLevelXp.toLocaleString()} XP`
                  : ' XP'}
              </AppText>
            </View>
          </View>
          <View
            testID="timeline-progress-track"
            style={s.track}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={
              level ? '현재 레벨 성장' : '활동 성장 정보 확인 중'
            }
            accessibilityValue={
              level
                ? { min: 0, max: 100, now: Math.round(progress * 100) }
                : undefined
            }
          >
            <LinearGradient
              testID="timeline-progress-gradient"
              colors={[colors.statsGradientStart, colors.statsGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[s.fill, { width: `${Math.round(progress * 100)}%` }]}
            />
          </View>
        </View>
        <View style={[s.recordStats, stack ? s.recordStatsStack : null]}>
          <View style={s.recordStatText}>
            <AppText
              preset="unifiedBody"
              styleOverridesPreset
              style={s.recordTotal}
            >
              {summary
                ? `${summary.totalRecords.toLocaleString()}개의 기록`
                : '기록 집계 중'}
            </AppText>
            <AppText
              preset="unifiedMeta"
              styleOverridesPreset
              style={s.recordDays}
            >
              {summary
                ? `기록한 날 ${summary.recordDays.toLocaleString()}일`
                : '기록한 날 확인 중'}
            </AppText>
          </View>
        </View>
      </View>
      {children}
      {showWalkStatus ? (
        <View style={s.walkStatus}>
          <Image
            testID="timeline-walk-brand"
            source={ASSETS.logo}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="NURI"
            style={s.walkBrand}
          />
          <AppText preset="unifiedMeta" styleOverridesPreset style={s.walkText}>
            {dailyStatus?.todayCompleted
              ? `오늘 산책 완료 · ${dailyStatus.currentStreak}일 연속`
              : `${appendKoreanParticle(
                  petName?.trim() || '우리 아이',
                  '와의',
                  '과의',
                )} 오늘 산책을 기록해 보세요.`}
          </AppText>
        </View>
      ) : null}
    </View>
  );
});

const s = StyleSheet.create({
  hero: { position: 'relative' },
  heroNavigation: { position: 'absolute', left: 12, top: 4 },
  heroBack: { width: 44, minHeight: 44, justifyContent: 'center' },
  stats: {
    marginHorizontal: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    flexDirection: 'row',
    gap: 12,
  },
  statsStack: { flexDirection: 'column', gap: 10 },
  growth: { flex: 1, minWidth: 0, gap: 6 },
  growthTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  titleXpRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walkBrand: { width: 20, height: 20 },
  level: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: '#182233',
    letterSpacing: 0,
  },
  title: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 16,
    color: '#243042',
    fontWeight: '600',
    letterSpacing: 0,
  },
  xp: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 16,
    color: '#243042',
    fontWeight: '600',
    letterSpacing: 0,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#E8EBF0',
  },
  fill: { height: '100%' },
  recordStats: {
    minWidth: 0,
    flexShrink: 1,
    maxWidth: '42%',
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderColor: '#E4E8EE',
    paddingLeft: 12,
    gap: 8,
  },
  recordStatsStack: {
    maxWidth: '100%',
    borderLeftWidth: 0,
    borderTopWidth: 1,
    paddingLeft: 0,
    paddingTop: 10,
  },
  recordStatText: { minWidth: 0, flexShrink: 1, gap: 3 },
  recordTotal: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '700',
    color: '#182233',
    letterSpacing: 0,
  },
  recordDays: {
    fontSize: 10,
    lineHeight: 16,
    color: '#748096',
    letterSpacing: 0,
  },
  controls: { paddingTop: 10, paddingBottom: 10, gap: 8 },
  controlRow: {
    marginHorizontal: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  // Keep the tap area independent from the compact visible chip.
  controlTouch: {
    minHeight: 44,
    minWidth: 44,
    maxWidth: '100%',
    justifyContent: 'center',
  },
  control: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E9EF',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: '100%',
  },
  controlText: {
    color: '#243042',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    flexShrink: 1,
    letterSpacing: 0,
  },
  categories: { paddingHorizontal: 18, gap: 8 },
  categoryTouch: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  category: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E9EF',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  categoryText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    letterSpacing: 0,
  },
  categoryCount: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    letterSpacing: 0,
  },
  walkStatus: {
    marginHorizontal: 18,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#F5F7FA',
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  walkText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#4D596B',
    letterSpacing: 0,
  },
});
