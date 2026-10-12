import React, { memo, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import AppText from '../../app/ui/AppText';
import { healthGraphForeground, healthGraphTypography } from '../../app/theme/tokens/healthGraph';
import {
  buildWeightChartModel,
  type WeightChartSample,
} from './weightChartModel';

export default memo(function WeightTrendChart({
  logs,
  accentColor,
}: {
  logs: readonly WeightChartSample[];
  accentColor: string;
}) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const foreground = healthGraphForeground[theme.mode];
  const plotScale = Math.max(1, Math.min(2, fontScale));
  const axisWidth = Math.ceil(48 * Math.max(1, fontScale));
  const [availableWidth, setAvailableWidth] = useState(0);
  const pointWidth = Math.ceil(64 * Math.max(1, fontScale));
  const chartWidth = Math.max(
    availableWidth - axisWidth,
    logs.length * pointWidth,
    160,
  );
  const { ceiling, points: basePoints } = useMemo(
    () => buildWeightChartModel(logs, chartWidth),
    [logs, chartWidth],
  );
  const points = useMemo(() => basePoints.map(point => ({ ...point, y: point.y * plotScale })), [basePoints, plotScale]);
  if (points.length === 0) return null;
  const minimum = Math.min(...points.map(point => point.weightKg));
  const maximum = Math.max(...points.map(point => point.weightKg));
  const last = points[points.length - 1];

  return (
    <View
      testID="health-weight-trend"
      style={styles.root}
      onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)}
    >
      <View style={styles.summary}>
        <AppText preset="caption" style={healthGraphTypography.caption} color={foreground.secondary}>
          {points.length}회 측정 · 최저 {Number(minimum.toFixed(2))}kg · 최고 {Number(maximum.toFixed(2))}kg
        </AppText>
        <AppText preset="caption" style={healthGraphTypography.caption} color={foreground.meta}>최근 측정 {last.measuredOn}</AppText>
      </View>
      <View style={styles.chartRow}>
      <View
        style={[styles.axis, { width: axisWidth }]}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {[ceiling, ceiling * 0.75, ceiling / 2, ceiling * 0.25, 0].map((tick, index) => (
          <AppText
            key={tick}
            preset="caption"
            style={[healthGraphTypography.caption, styles.tick, { top: (24 + index * 28) * plotScale - healthGraphTypography.caption.lineHeight * Math.min(2, fontScale) / 2 }]}
            color={foreground.meta}
          >
            {Number(tick.toFixed(2))}
          </AppText>
        ))}
        <AppText
          preset="caption"
          style={[healthGraphTypography.caption, styles.unit, { marginTop: 154 * plotScale }]}
          color={foreground.meta}
        >
          kg
        </AppText>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={{ width: chartWidth }}>
          <View
            style={[styles.plot, { height: 152 * plotScale }]}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            {[24, 52, 80, 108, 136].map(top => (
              <View
                key={top}
                testID="health-chart-grid"
                style={[styles.grid, { top: top * plotScale, borderColor: foreground.grid }]}
              />
            ))}
            {points.map((point, index) => {
              const previous = points[index - 1];
              const dx = previous ? point.x - previous.x : 0;
              const dy = previous ? point.y - previous.y : 0;
              const length = Math.hypot(dx, dy);
              return (
                <React.Fragment key={point.id}>
                  {point.id === last.id ? (
                    <View testID="health-chart-active-guide" style={[styles.latestGuide, { left: point.x, top: 16 * plotScale, height: 120 * plotScale, borderColor: accentColor }]} />
                  ) : null}
                  {previous ? (
                    <View
                      style={[
                        styles.segment,
                        {
                          backgroundColor: accentColor,
                          width: length,
                          left: (previous.x + point.x - length) / 2,
                          top: (previous.y + point.y) / 2 - 1.5,
                          transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                        },
                      ]}
                    />
                  ) : null}
                  <View
                    style={[
                      styles.point,
                      {
                        left: point.x - (point.id === last.id ? 6 : 4),
                        top: point.y - (point.id === last.id ? 6 : 4),
                        width: point.id === last.id ? 12 : 8,
                        height: point.id === last.id ? 12 : 8,
                        borderRadius: point.id === last.id ? 6 : 4,
                        backgroundColor: accentColor,
                        borderWidth: point.id === last.id ? 2 : 0,
                        borderColor: '#FFFFFF',
                      },
                    ]}
                  />
                </React.Fragment>
              );
            })}
          </View>
          <View style={styles.labels}>
            {points.map(point => (
              <View
                key={point.id}
                style={styles.label}
                accessible
                accessibilityLabel={`${point.measuredOn}, ${point.weightKg}킬로그램`}
              >
                <AppText
                  preset="caption"
                  style={healthGraphTypography.caption}
                  weight="600"
                  color={theme.colors.textPrimary}
                >
                  {Number(point.weightKg.toFixed(2))}kg
                </AppText>
                <AppText preset="caption" style={healthGraphTypography.caption} color={foreground.meta}>
                  {Number(point.measuredOn.slice(5, 7))}/
                  {Number(point.measuredOn.slice(8, 10))}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { paddingVertical: 12, minWidth: 0, gap: 12 },
  chartRow: { flexDirection: 'row', minWidth: 0 },
  summary: { gap: 4 },
  latestGuide: { position: 'absolute', top: 16, height: 120, borderLeftWidth: 1, borderStyle: 'dashed', opacity: 0.32 },
  axis: { width: 48, flexShrink: 0, position: 'relative' },
  tick: { position: 'absolute', right: 8 },
  unit: { marginTop: 154 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 4 },
  plot: { height: 152, position: 'relative' },
  grid: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    opacity: 0.7,
  },
  segment: { height: 3, position: 'absolute' },
  point: { width: 8, height: 8, borderRadius: 4, position: 'absolute' },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { flex: 1, alignItems: 'center', gap: 3 },
});
