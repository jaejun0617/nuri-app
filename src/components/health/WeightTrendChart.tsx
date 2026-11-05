import React, { memo, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import LinearGradient from 'react-native-linear-gradient';
import AppText from '../../app/ui/AppText';
import { healthReportColors as colors } from '../../app/theme/tokens/healthReport';
import {
  buildWeightChartModel,
  type WeightChartSample,
} from './weightChartModel';

const HORIZONTAL_INSET = 20;
type MaskProps = React.ComponentProps<typeof View> & {
  maskElement: React.ReactElement;
};
const NativeMask = MaskedView as unknown as React.ComponentType<MaskProps>;
const chartDate = (day: number) => {
  const date = new Date(day * 86_400_000);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
};

export default memo(function WeightTrendChart({
  logs,
  accentColor,
  compact = false,
}: {
  logs: readonly WeightChartSample[];
  accentColor: string;
  compact?: boolean;
}) {
  const { fontScale } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const scale = Math.max(1, fontScale);
  const axisWidth = compact ? 0 : 29 * scale;
  const inset = HORIZONTAL_INSET * scale;
  const width = Math.max(1, measuredWidth - axisWidth - inset * 2);
  const height = (compact ? 54 : 90) * scale;
  const top = (compact ? 19 : 12) * scale;
  const bottom = top + height;
  const { points, ticks, dateTicks } = useMemo(
    () =>
      buildWeightChartModel(
        logs,
        width,
        height,
        top,
        compact ? 2 : width >= 205 * scale ? 4 : 2,
      ),
    [logs, width, height, top, compact, scale],
  );
  if (!points.length) return null;
  const last = points[points.length - 1];
  const segments = points.slice(1).map((point, index) => {
    const start = points[index];
    const dx = point.x - start.x;
    const dy = point.y - start.y;
    return {
      id: point.id,
      x: inset + start.x,
      dx,
      centerY: (start.y + point.y) / 2,
      length: Math.hypot(dx, dy),
      angle: Math.atan2(dy, dx),
    };
  });

  return (
    <View
      testID="health-weight-trend"
      style={[styles.root, compact && styles.compact]}
      onLayout={event => setMeasuredWidth(event.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={points
        .map(point => `${point.measuredOn}, ${point.weightKg}킬로그램`)
        .join(' · ')}
    >
      {!compact ? (
        <View style={{ width: axisWidth, height: bottom + 22 * scale }}>
          <AppText
            preset="caption"
            color={colors.muted}
            style={styles.axisUnit}
          >
            kg
          </AppText>
          {ticks.map(tick => (
            <AppText
              key={tick.value}
              preset="caption"
              color={colors.muted}
              style={[styles.axisTick, { top: tick.y - 8 * scale }]}
            >
              {tick.value}
            </AppText>
          ))}
        </View>
      ) : null}
      <View
        style={{ flex: 1, height: bottom + 24 * scale }}
        importantForAccessibility="no-hide-descendants"
      >
        {measuredWidth > 0 ? (
          <>
            {!compact
              ? ticks.map(tick => (
                  <View
                    key={tick.value}
                    testID="health-chart-grid"
                    style={[
                      styles.grid,
                      {
                        top: tick.y,
                        borderStyle: tick.y === bottom ? 'solid' : 'dashed',
                      },
                    ]}
                  />
                ))
              : null}
            {dateTicks.map(tick => (
              <React.Fragment key={tick.day}>
                {!compact ? (
                  <View
                    style={[
                      styles.guide,
                      { left: inset + tick.x, top, height },
                    ]}
                  />
                ) : null}
                <AppText
                  preset="caption"
                  color={colors.muted}
                  style={[
                    styles.date,
                    {
                      top: bottom + 2,
                      left: inset + tick.x - inset,
                      width: inset * 2,
                    },
                  ]}
                >
                  {chartDate(tick.day)}
                </AppText>
              </React.Fragment>
            ))}
            {segments.some(segment => segment.dx > 0) ? (
              <NativeMask
                style={[styles.fill, { height: bottom }]}
                maskElement={
                  <View style={StyleSheet.absoluteFill}>
                    {segments
                      .filter(segment => segment.dx > 0)
                      .map(segment => {
                        // Clip a rotated half-plane to each interval, leaving only the area below its line.
                        const reach = bottom * 2;
                        const rectWidth = segment.length + reach * 2;
                        return (
                          <View
                            key={segment.id}
                            style={[
                              styles.fillClip,
                              {
                                left: segment.x,
                                width: segment.dx + 0.5,
                                height: bottom,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.mask,
                                {
                                  width: rectWidth,
                                  height: reach * 2,
                                  left:
                                    segment.dx / 2 -
                                    Math.sin(segment.angle) * reach -
                                    rectWidth / 2,
                                  top:
                                    segment.centerY +
                                    (Math.cos(segment.angle) - 1) * reach,
                                  transform: [
                                    { rotate: `${segment.angle}rad` },
                                  ],
                                },
                              ]}
                            />
                          </View>
                        );
                      })}
                  </View>
                }
              >
                <LinearGradient
                  colors={['rgba(130,73,246,0.30)', 'rgba(130,73,246,0.02)']}
                  style={StyleSheet.absoluteFill}
                />
              </NativeMask>
            ) : null}
            {segments.map(segment => (
              <View
                key={segment.id}
                style={[
                  styles.segment,
                  {
                    width: segment.length,
                    left: segment.x + (segment.dx - segment.length) / 2,
                    top: segment.centerY - 0.75,
                    transform: [{ rotate: `${segment.angle}rad` }],
                    backgroundColor: accentColor,
                  },
                ]}
              />
            ))}
            {points.map(point => (
              <View
                key={point.id}
                style={[
                  styles.dot,
                  {
                    left: inset + point.x - 4.5,
                    top: point.y - 4.5,
                    backgroundColor: accentColor,
                  },
                ]}
              />
            ))}
            <View
              testID="health-chart-active-guide"
              style={[
                styles.guide,
                {
                  left: inset + last.x,
                  top: last.y + 4,
                  height: Math.max(0, bottom - last.y - 4),
                },
              ]}
            />
            {compact
              ? [points[0], ...(points.length > 1 ? [last] : [])].map(point => (
                  <AppText
                    key={point.id}
                    preset="caption"
                    color={colors.ink}
                    numberOfLines={1}
                    style={[
                      styles.date,
                      {
                        width: inset * 2 + 10,
                        left: point.x - 5,
                        top: Math.max(0, point.y - 18 * scale),
                      },
                    ]}
                  >
                    {point.weightKg}kg
                  </AppText>
                ))
              : null}
          </>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flexDirection: 'row', paddingTop: 3, minWidth: 0 },
  compact: { paddingTop: 0 },
  axisUnit: { position: 'absolute', top: -3, left: 0, fontSize: 10 },
  axisTick: { position: 'absolute', right: 4, fontSize: 11 },
  date: { position: 'absolute', textAlign: 'center', fontSize: 11 },
  grid: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  guide: {
    position: 'absolute',
    borderLeftWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0 },
  fillClip: { position: 'absolute', top: 0, overflow: 'hidden' },
  mask: { position: 'absolute', backgroundColor: '#000000' },
  segment: { position: 'absolute', height: 1.5 },
  dot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
