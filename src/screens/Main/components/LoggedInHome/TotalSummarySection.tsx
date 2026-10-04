import React, { memo, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import MaterialCommunityIcons from '../../../../components/icons/NuriMaterialIcon';
import NuriSemanticIcon from '../../../../components/icons/NuriSemanticIcon';

import AppText from '../../../../app/ui/AppText';
import { HomeSectionGlass } from '../../../../components/home/HomeSectionGlass';
import {
  HomeSectionHeader,
  isHomeSectionConfirmedEmpty,
} from '../../../../components/home/HomeSectionHeader';
import {
  HOME_FLOATING_WIDGET_MATERIAL,
  HomeFloatingWidgetSurface,
} from '../../../../components/home/HomeWidgetMaterial';
import {
  buildTotalSummary,
  buildTotalSummaryLine,
} from '../../../../services/home/weeklySummary';
import type { MemoryRecord } from '../../../../services/supabase/memories';
import type { SeasonKey } from '../../../../theme/seasonal/season';

export const HOME_SUMMARY_ART: Readonly<
  Record<SeasonKey, ImageSourcePropType>
> = {
  autumn: require('../../../../assets/seasonal/home/summary/keepsake-autumn-v1.png'),
  winter: require('../../../../assets/seasonal/home/summary/keepsake-winter-v1.png'),
  spring: require('../../../../assets/seasonal/home/summary/keepsake-spring-v1.png'),
  summer: require('../../../../assets/seasonal/home/summary/keepsake-summer-v1.png'),
};

export function shouldStackSummary(width: number, fontScale: number): boolean {
  return width < 350 || fontScale >= 1.3;
}

export function resolveSummaryCountFontSize(value: number | null): number {
  const length = value === null ? 1 : String(value).length;
  if (length <= 2) return 62;
  if (length === 3) return 46;
  if (length === 4) return 34;
  return 24;
}

type Props = {
  records: MemoryRecord[] | null;
  season: SeasonKey;
  accentDeepColor: string;
  isLoading: boolean;
  isReady: boolean;
  onPressWalk: () => void;
  onPressMeal: () => void;
  onPressLife: () => void;
  onPressAllRecords: () => void;
};

/** Material and season changes preserve canonical totals and category destinations. */
export const TotalSummarySection = memo(function TotalSummarySectionView({
  records,
  season,
  accentDeepColor,
  isLoading,
  isReady,
  onPressWalk,
  onPressMeal,
  onPressLife,
  onPressAllRecords,
}: Props) {
  const { width, fontScale } = useWindowDimensions();
  const summary = useMemo(
    () => (records === null ? null : buildTotalSummary(records)),
    [records],
  );
  const summaryLine = summary
    ? buildTotalSummaryLine(summary)
    : isLoading
    ? '전체 기록을 불러오는 중이에요.'
    : '전체 기록을 확인할 수 없어요.';
  const stack = shouldStackSummary(width, fontScale);
  const stackOverview = stack || String(summary?.totalRecords ?? '').length > 6;
  const countFontSize = resolveSummaryCountFontSize(
    summary?.totalRecords ?? null,
  );
  const metrics = [
    {
      key: 'walk',
      label: '산책',
      icon: 'walk',
      color: accentDeepColor,
      value: summary?.walkCount ?? null,
      onPress: onPressWalk,
    },
    {
      key: 'meal',
      label: '식사',
      icon: 'silverware-fork-knife',
      color: '#FF6380',
      value: summary?.mealCount ?? null,
      onPress: onPressMeal,
    },
    {
      key: 'life',
      label: '생활',
      icon: 'notebook-outline',
      color: '#18BFA7',
      value: summary?.lifeCount ?? null,
      onPress: onPressLife,
    },
  ] as const;

  return (
    <HomeSectionGlass testID="home-glass-total-summary" style={styles.section}>
      <HomeSectionHeader
        title="전체 요약"
        color={accentDeepColor}
        hideAction={isHomeSectionConfirmedEmpty(
          isReady,
          summary?.totalRecords ?? null,
        )}
        action={{
          onPress: onPressAllRecords,
          accessibilityLabel: '전체 요약 기록 전체 보기',
        }}
      />
      <AppText preset="unifiedBody" style={styles.description}>
        지금까지 남긴 기록을 한눈에 확인해보세요
      </AppText>

      <View
        testID="home-summary-overview"
        style={[styles.overview, stackOverview ? styles.overviewStacked : null]}
      >
        <View style={styles.overviewCopy}>
          <AppText
            preset="unifiedLabel"
            styleOverridesPreset
            style={styles.totalLabel}
          >
            전체 기록
          </AppText>
          <View
            testID="home-summary-total"
            style={styles.totalRow}
            accessibilityLiveRegion="polite"
          >
            {summary ? (
              <AppText
                testID="home-summary-total-value"
                preset="unifiedTitle"
                typographyRole="celebration"
                styleOverridesPreset
                style={[
                  styles.totalValue,
                  {
                    color: accentDeepColor,
                    fontSize: countFontSize,
                    lineHeight: countFontSize + 10,
                  },
                ]}
              >
                {summary.totalRecords}
                <AppText
                  preset="unifiedBody"
                  styleOverridesPreset
                  style={styles.totalUnit}
                >
                  {' '}
                  개
                </AppText>
              </AppText>
            ) : (
              <View style={styles.pending}>
                {isLoading ? (
                  <ActivityIndicator color={accentDeepColor} />
                ) : null}
                <AppText
                  testID="home-summary-pending"
                  preset="unifiedBody"
                  style={styles.pendingText}
                >
                  {isLoading ? '확인 중' : '확인 필요'}
                </AppText>
              </View>
            )}
          </View>
          <TouchableOpacity
            testID="home-summary-days"
            onPress={onPressAllRecords}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={
              summary
                ? `기록한 날 ${summary.recordDays}일, 전체 기록 보기`
                : '전체 기록 보기'
            }
            style={styles.days}
          >
            <NuriSemanticIcon
              family="material"
              name="calendar-month-outline"
              size={19}
              color={accentDeepColor}
            />
            <AppText
              preset="unifiedBody"
              styleOverridesPreset
              style={styles.daysText}
            >
              기록한 날{' '}
              <AppText
                testID="home-summary-days-value"
                preset="unifiedBody"
                styleOverridesPreset
                style={[styles.daysValue, { color: accentDeepColor }]}
              >
                {summary
                  ? `${summary.recordDays}일`
                  : isLoading
                  ? '확인 중'
                  : '확인 필요'}
              </AppText>
            </AppText>
          </TouchableOpacity>
        </View>
        <View
          testID="home-summary-art-frame"
          style={[styles.artFrame, stackOverview ? styles.artStacked : null]}
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Image
            testID="home-summary-art"
            source={HOME_SUMMARY_ART[season]}
            resizeMode="contain"
            style={styles.art}
            fadeDuration={0}
          />
        </View>
      </View>

      <View
        testID="home-summary-metrics"
        style={[styles.metrics, stack ? styles.metricsStacked : null]}
      >
        {metrics.map(metric => (
          <TouchableOpacity
            key={metric.key}
            testID={`home-summary-${metric.key}`}
            style={[styles.metric, stack ? styles.metricStacked : null]}
            onPress={metric.onPress}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={`${metric.label} 기록 ${
              metric.value === null
                ? isLoading
                  ? '확인 중'
                  : '확인 필요'
                : `${metric.value}개`
            }, 기록 보기`}
          >
            <HomeFloatingWidgetSurface
              radius={18}
              testIDPrefix="home-summary-glass"
            />
            <NuriSemanticIcon
              family="material"
              name={metric.icon}
              size={30}
              color={metric.color}
            />
            <AppText
              preset="unifiedLabel"
              styleOverridesPreset
              style={styles.metricLabel}
            >
              {metric.label}
            </AppText>
            <AppText
              testID={`home-summary-${metric.key}-value`}
              preset="unifiedTitle"
              typographyRole="celebration"
              styleOverridesPreset
              style={[
                styles.metricValue,
                { color: accentDeepColor },
                metric.value !== null && String(metric.value).length > 3
                  ? styles.longMetricValue
                  : null,
              ]}
            >
              {metric.value ?? '-'}
              <AppText
                preset="unifiedBody"
                styleOverridesPreset
                style={styles.metricUnit}
              >
                {' '}
                기록
              </AppText>
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        testID="home-summary-insight"
        style={styles.insight}
        onPress={onPressAllRecords}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`전체 기록 한 줄 요약, ${summaryLine}`}
      >
        <HomeFloatingWidgetSurface
          radius={18}
          testIDPrefix="home-summary-glass"
        />
        <MaterialCommunityIcons
          name="star-four-points"
          size={30}
          color="#A57AF4"
        />
        <View style={styles.insightCopy}>
          <AppText
            preset="unifiedLabel"
            styleOverridesPreset
            style={styles.insightTitle}
          >
            전체 기록 한 줄 요약
          </AppText>
          <AppText
            testID="home-summary-line"
            preset="unifiedBody"
            styleOverridesPreset
            style={styles.insightBody}
          >
            {summaryLine}
          </AppText>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={accentDeepColor}
        />
      </TouchableOpacity>
    </HomeSectionGlass>
  );
});

export const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 18,
    gap: 14,
  },
  description: { color: '#697386', marginTop: -8 },
  overview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 154,
  },
  overviewStacked: { flexDirection: 'column', alignItems: 'stretch' },
  overviewCopy: { flex: 1, minWidth: 0, gap: 4 },
  totalLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: '#16243C',
    letterSpacing: 0,
  },
  totalRow: { minHeight: 72, justifyContent: 'center' },
  totalValue: { fontWeight: '700', letterSpacing: 0 },
  totalUnit: {
    fontSize: 17,
    lineHeight: 24,
    color: '#16243C',
    fontWeight: '600',
    letterSpacing: 0,
  },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingText: { color: '#697386' },
  days: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 5 },
  daysText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    lineHeight: 18,
    color: '#25364D',
    letterSpacing: 0,
  },
  daysValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0,
  },
  // The bitmap cannot contribute its intrinsic pixel height to native layout.
  artFrame: {
    width: '49%',
    maxWidth: 176,
    maxHeight: 176,
    aspectRatio: 1,
    flexShrink: 0,
  },
  artStacked: { alignSelf: 'center', width: '62%' },
  art: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  metrics: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  metricsStacked: { flexDirection: 'column' },
  metric: {
    ...HOME_FLOATING_WIDGET_MATERIAL,
    flex: 1,
    minWidth: 0,
    minHeight: 108,
    borderRadius: 18,
    paddingHorizontal: 6,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  metricStacked: { flex: 0, minHeight: 76 },
  metricLabel: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    color: '#16243C',
    letterSpacing: 0,
  },
  metricValue: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0,
  },
  longMetricValue: { fontSize: 16, lineHeight: 24 },
  metricUnit: {
    fontSize: 10,
    lineHeight: 16,
    fontWeight: '500',
    color: '#16243C',
    letterSpacing: 0,
  },
  insight: {
    ...HOME_FLOATING_WIDGET_MATERIAL,
    minHeight: 70,
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  insightCopy: { flex: 1, minWidth: 0, gap: 4 },
  insightTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#16243C',
    letterSpacing: 0,
  },
  insightBody: {
    fontSize: 11,
    lineHeight: 17,
    color: '#647183',
    letterSpacing: 0,
  },
});
