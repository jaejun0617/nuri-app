// 파일: src/components/weather/AirQualityInsightCard.tsx
// 역할:
// - 미세먼지/초미세먼지/오존 상태를 공통 카드 규칙으로 렌더링

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { AirQualityMetric } from '../../services/weather/guide';
import WeatherGlassCard from './WeatherGlassCard';

type Props = {
  metrics: AirQualityMetric[];
  headerHint?: string;
  titleColor?: string;
  hintColor?: string;
  metricLabelColor?: string;
  valueColor?: string;
  trackColor?: string;
  progressColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  frosted?: boolean;
};

function getToneColor(tone: AirQualityMetric['tone']) {
  switch (tone) {
    case 'unknown':
      return '#94A3B8';
    case 'bad':
      return '#F08B7D';
    case 'moderate':
      return '#A6B4C9';
    case 'good':
    default:
      return '#65C88A';
  }
}

function getToneLabelColor(tone: AirQualityMetric['tone']) {
  switch (tone) {
    case 'unknown':
      return '#7A89A4';
    case 'bad':
      return '#D97745';
    case 'moderate':
      return '#7A89A4';
    case 'good':
    default:
      return '#34A56B';
  }
}

export default React.memo(function AirQualityInsightCard({
  metrics,
  headerHint,
  titleColor = '#F8FBFF',
  hintColor = 'rgba(230,238,248,0.72)',
  metricLabelColor = '#E8EEF6',
  valueColor,
  trackColor = 'rgba(255,255,255,0.18)',
  progressColor,
  backgroundColor,
  borderColor,
  frosted = false,
}: Props) {
  return (
    <WeatherGlassCard
      frosted={frosted}
      style={[
        styles.card,
        backgroundColor ? { backgroundColor } : null,
        borderColor ? { borderColor } : null,
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: titleColor }]}>대기질</Text>
        {headerHint ? (
          <Text style={[styles.headerHint, { color: hintColor }]}>
            {headerHint}
          </Text>
        ) : null}
      </View>

      <View style={styles.metricList}>
        {metrics.length === 0 ? (
          <Text style={[styles.emptyText, { color: hintColor }]}>
            대기질 정보를 확인하지 못했어요.
          </Text>
        ) : null}

        {metrics.map(item => {
          const barColor = getToneColor(item.tone);
          const toneLabelColor = getToneLabelColor(item.tone);

          return (
            <View key={item.key} style={styles.metricRow}>
              <View style={styles.metricLabelRow}>
                <Text style={[styles.metricLabel, { color: metricLabelColor }]}>
                  {item.label}
                </Text>
                <Text
                  style={[
                    styles.metricValue,
                    { color: valueColor ?? toneLabelColor },
                  ]}
                >
                  {item.valueLabel}
                </Text>
              </View>
              {item.tone !== 'unknown' ? (
                <View
                  style={[
                    styles.progressTrack,
                    { backgroundColor: trackColor },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.max(
                          10,
                          Math.round(item.progress * 100),
                        )}%`,
                        backgroundColor: progressColor ?? barColor,
                      },
                    ]}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </WeatherGlassCard>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  title: {
    fontSize: 16,
    lineHeight: 20,
    color: '#F8FBFF',
    fontWeight: '700',
  },
  headerHint: {
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(230,238,248,0.72)',
    fontWeight: '600',
  },
  metricList: {
    gap: 16,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  metricRow: {
    gap: 8,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  metricLabel: {
    fontSize: 13,
    lineHeight: 17,
    color: '#E8EEF6',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 999,
  },
});
