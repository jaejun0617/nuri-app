import React, { memo, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import AppText from '../../app/ui/AppText';
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
  const [availableWidth, setAvailableWidth] = useState(0);
  const pointWidth = Math.ceil(64 * Math.max(1, fontScale));
  const chartWidth = Math.max(
    availableWidth - 48,
    logs.length * pointWidth,
    160,
  );
  const { ceiling, points } = useMemo(
    () => buildWeightChartModel(logs, chartWidth),
    [logs, chartWidth],
  );
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
        <AppText preset="caption" color={theme.colors.textSecondary}>
          {points.length}회 측정 · 최저 {Number(minimum.toFixed(2))}kg · 최고 {Number(maximum.toFixed(2))}kg
        </AppText>
        <AppText preset="caption" color={theme.colors.textMuted}>최근 측정 {last.measuredOn}</AppText>
      </View>
      <View style={styles.chartRow}>
      <View
        style={styles.axis}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {[ceiling, ceiling * 0.75, ceiling / 2, ceiling * 0.25, 0].map((tick, index) => (
          <AppText
            key={tick}
            preset="caption"
            style={[styles.tick, { top: 16 + index * 28 }]}
            color={theme.colors.textMuted}
          >
            {Number(tick.toFixed(2))}
          </AppText>
        ))}
        <AppText
          preset="caption"
          style={styles.unit}
          color={theme.colors.textMuted}
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
            style={styles.plot}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            {[24, 52, 80, 108, 136].map(top => (
              <View
                key={top}
                style={[styles.grid, { top, borderColor: theme.colors.border }]}
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
                    <View style={[styles.latestGuide, { left: point.x, borderColor: theme.colors.textMuted }]} />
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
                        left: point.x - 4,
                        top: point.y - 4,
                        backgroundColor: accentColor,
                        borderWidth: point.id === last.id ? 2 : 0,
                        borderColor: theme.colors.surface,
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
                  weight="600"
                  color={theme.colors.textPrimary}
                >
                  {Number(point.weightKg.toFixed(2))}kg
                </AppText>
                <AppText preset="caption" color={theme.colors.textMuted}>
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
  latestGuide: { position: 'absolute', top: 16, height: 120, borderLeftWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed', opacity: 0.45 },
  axis: { width: 48, flexShrink: 0, position: 'relative' },
  tick: { position: 'absolute', right: 8, fontSize: 11, lineHeight: 16 },
  unit: { marginTop: 154, fontSize: 11, lineHeight: 16 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 4 },
  plot: { height: 152, position: 'relative' },
  grid: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  segment: { height: 3, position: 'absolute' },
  point: { width: 8, height: 8, borderRadius: 4, position: 'absolute' },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { flex: 1, alignItems: 'center', gap: 3 },
});
