import { APP_HEADER } from '../../components/navigation/headerAppearance';
import { AppHeaderLayout } from '../../components/navigation/AppHeaderLayout';
import { HeaderHelpButton } from '../../components/navigation/HeaderHelpButton';
import { PRODUCT_ACCENT } from '../../app/theme/tokens/productAccent';
import { MenuGlassSurface } from '../../components/common/MenuGlassSurface';
import React, { memo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AppText from '../../app/ui/AppText';
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
import type { SeasonKey } from '../../theme/seasonal/season';

const GALLERY_SURFACE_RADIUS = 6;

export const TimelineSeasonalControls = memo(
  function TimelineSeasonalControlsView({
    sortLabel,
    monthLabel,
    mainCategory,
    categoryLabel,
    counts,
    monthScoped = false,
    sortActive = false,
    transitioning,
    onToggleSort,
    onOpenMonth,
    onShowAllRecords,
    onPressCategory,
  }: {
    season: SeasonKey;
    sortLabel: string;
    monthLabel: string;
    mainCategory: MemoryMainCategory;
    categoryLabel: string;
    counts: TimelineCategoryCounts;
    monthScoped?: boolean;
    sortActive?: boolean;
    transitioning: boolean;
    onToggleSort: () => void;
    onOpenMonth?: () => void;
    onShowAllRecords?: () => void;
    onPressCategory: (category: MemoryMainCategory) => void;
  }) {
    const inline = Boolean(onShowAllRecords);
    return (
      <View style={[s.controls, onShowAllRecords && s.inlineControls]} testID="timeline-seasonal-controls">
        {onShowAllRecords ? (
          <View style={[s.controlRow, s.pairedActionRow]} testID="timeline-record-action-row">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="전체 기록 보기"
              testID="timeline-month-show-all"
              onPress={onShowAllRecords}
              style={[s.pairedAction, s.galleryAction]}
            >
              {({ pressed }) => (
                <View
                  testID="timeline-gallery-action-surface"
                  style={[s.category, s.pairedSurface, s.gallerySurface, pressed && s.pressedGallerySurface]}
                >
                  <MenuGlassSurface radius={GALLERY_SURFACE_RADIUS} testID="timeline-gallery-action-glass" />
                  <AppText preset="unifiedMeta" styleOverridesPreset style={[s.categoryText, s.pairedActionText, pressed && s.pressedGalleryText]}>
                    전체 기록 보기
                  </AppText>
                  <NuriSemanticIcon
                    family="feather"
                    name="chevron-right"
                    size={14}
                    color={pressed ? PRODUCT_ACCENT.pressed : '#566277'}
                    preserveOriginal
                    accessible={false}
                  />
                </View>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: sortActive }}
              testID="timeline-sort-action"
              accessibilityLabel={`정렬 변경, ${sortLabel}`}
              onPress={onToggleSort}
              style={s.pairedAction}
            >
              {({ pressed }) => {
                const highlighted = pressed || sortActive;
                return (
                  <View style={[s.category, s.pairedSurface, s.trailingSurface, highlighted && s.activeChip]}>
                    <AppText preset="unifiedMeta" styleOverridesPreset style={[s.categoryText, s.pairedActionText, highlighted && s.activeChipText]}>
                      {sortLabel}
                    </AppText>
                    <NuriSemanticIcon family="feather" name="chevron-down" size={12} color={highlighted ? '#FFFFFF' : '#748096'} preserveOriginal accessible={false} />
                  </View>
                );
              }}
            </Pressable>
          </View>
        ) : null}
        {!onShowAllRecords ? <View style={[s.controlRow, !onOpenMonth && s.sortOnlyRow]}>
          {onOpenMonth ? <TouchableOpacity
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
          </TouchableOpacity> : null}
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
        </View> : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[s.categories, onShowAllRecords && s.inlineCategories]}
        >
          {TIMELINE_MAIN_CATEGORY_OPTIONS.map(option => {
            const active = option.key === mainCategory;
            const showCount = !inline || option.key === 'all';
            const wideMonthCount = monthScoped && option.key === 'all' && !transitioning && counts.all >= 100;
            const textColor = inline
              ? (active ? PRODUCT_ACCENT.pressed : '#566277')
              : (active ? '#FFFFFF' : '#748096');
            const label = option.key === 'all' && monthScoped
              ? '이달 전체'
              : option.key === 'other' && active ? categoryLabel : option.label;
            return (
              <TouchableOpacity
                key={option.key}
                testID={`timeline-category-${option.key}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={showCount ? `${label}, ${
                  transitioning ? '집계 중' : `${counts[option.key]}개의 기록`
                }` : label}
                onPress={() => onPressCategory(option.key)}
                activeOpacity={0.85}
                style={s.categoryTouch}
              >
                <View
                  testID={`timeline-category-surface-${option.key}`}
                  style={[
                    s.category,
                    inline && s.inlineTextSurface,
                    inline && s.inlineCategory,
                    wideMonthCount && s.wideCountChip,
                    !inline && active && s.activeChip,
                  ]}
                >
                  {option.key === 'all' && !monthScoped ? (
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
                    style={[s.categoryText, inline && s.inlineChipText, { color: textColor }]}
                  >
                    {label}
                  </AppText>
                  {showCount ? <AppText
                    preset="unifiedMeta"
                    styleOverridesPreset
                    style={[s.categoryCount, inline && s.inlineChipText, { color: textColor }]}
                  >
                    {transitioning ? '—' : counts[option.key].toLocaleString('ko-KR')}
                  </AppText> : null}
                  {inline && active ? (
                    <View
                      testID="timeline-category-indicator"
                      pointerEvents="none"
                      style={s.selectionIndicator}
                    />
                  ) : null}
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
  width,
  fontScale,
  level,
  titles,
  summary,
  onPressBack,
  children,
}: React.PropsWithChildren<{
  season: SeasonKey;
  width: number;
  fontScale: number;
  level: UserLevelSummary | null;
  titles: UserTitle[];
  summary: TotalSummary | null;
  onPressBack: () => void;
}>) {
  const stack = width < 380 || fontScale >= 1.3;
  const progress = level ? getProgressWithinLevel(level) : 0;
  const maxLevel = level !== null && level.level >= MAX_ACTIVITY_LEVEL;
  return (
    <View testID="timeline-seasonal-header">
      <AppHeaderLayout subtitle="아이와 함께한 순간을 차곡차곡 모아요" style={s.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="타임라인 뒤로가기"
            onPress={onPressBack}
            style={s.headerTool}
          >
            <NuriSemanticIcon
              family="feather"
              name="chevron-left"
              size={APP_HEADER.backIconSize}
              color={APP_HEADER.titleColor}
              preserveOriginal
            />
          </TouchableOpacity>
          <AppText preset="unifiedTitle" styleOverridesPreset style={s.headerTitle}>타임라인</AppText>
          <HeaderHelpButton topic="timeline" />
      </AppHeaderLayout>
      <View
        testID="timeline-statistics"
        style={[
          s.stats,
          stack ? s.statsStack : null,
        ]}
      >
        <MenuGlassSurface radius={8} testID="timeline-statistics-glass" />
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
                  style={[s.xp, { color: PRODUCT_ACCENT.ink }]}
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
              colors={[PRODUCT_ACCENT.primary, PRODUCT_ACCENT.primary]}
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
    </View>
  );
});

const s = StyleSheet.create({
  header: { paddingTop: APP_HEADER.topGap },
  headerTool: { width: APP_HEADER.targetSize, minHeight: APP_HEADER.targetSize, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', ...APP_HEADER.title },
  stats: {
    marginTop: 12,
    marginBottom: 4,
    marginHorizontal: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
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
  inlineControls: { paddingTop: 0, paddingBottom: 4, gap: 2 },
  controlRow: {
    marginHorizontal: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  sortOnlyRow: { justifyContent: 'flex-end' },
  pairedActionRow: { flexWrap: 'nowrap', alignItems: 'stretch', marginHorizontal: 8 },
  pairedAction: { width: '36%', minWidth: 90, minHeight: 44, justifyContent: 'center' },
  galleryAction: { width: 'auto', maxWidth: '60%' },
  pairedSurface: {
    alignSelf: 'flex-start',
    minWidth: 68,
    minHeight: 30,
    maxWidth: '100%',
    paddingHorizontal: 4,
    paddingVertical: 5,
    borderRadius: 100,
    gap: 3,
  },
  trailingSurface: { alignSelf: 'flex-end' },
  gallerySurface: {
    borderRadius: GALLERY_SURFACE_RADIUS,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    gap: 4,
  },
  pressedGallerySurface: {
    backgroundColor: PRODUCT_ACCENT.marker,
  },
  wideCountChip: { paddingHorizontal: 12 },
  pairedActionText: { color: '#243042', fontSize: 13, lineHeight: 18, flexShrink: 1, textAlign: 'center' },
  pressedGalleryText: { color: PRODUCT_ACCENT.pressed },
  activeChip: { backgroundColor: PRODUCT_ACCENT.primary, borderColor: PRODUCT_ACCENT.primary },
  activeChipText: { color: '#FFFFFF' },
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
    paddingVertical: 4,
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
  inlineCategories: { paddingHorizontal: 8 },
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
  inlineTextSurface: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  inlineCategory: { paddingHorizontal: 9, paddingVertical: 5 },
  selectionIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: PRODUCT_ACCENT.primary,
  },
  inlineChipText: { fontSize: 13, lineHeight: 18 },
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
});
