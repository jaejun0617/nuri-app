// 파일: src/components/weather/AirQualityInsightCard.tsx
// 역할:
// - 미세먼지/초미세먼지/오존 상태를 공통 카드 규칙으로 렌더링

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { AirQualityMetric } from '../../services/weather/guide';

type Props = {
  metrics: AirQualityMetric[];
};

function getToneColor(tone: AirQualityMetric['tone']) {
  switch (tone) {
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
    case 'bad':
      return '#D97745';
    case 'moderate':
      return '#7A89A4';
    case 'good':
    default:
      return '#34A56B';
  }
}

export default React.memo(function AirQualityInsightCard({ metrics }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>대기 질 정보</Text>
        <Text style={styles.headerHint}>오늘 기준</Text>
      </View>

      <View style={styles.metricList}>
        {metrics.map(item => {
          const barColor = getToneColor(item.tone);
          const labelColor = getToneLabelColor(item.tone);

          return (
            <View key={item.key} style={styles.metricRow}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricLabel}>{item.label}</Text>
                <Text style={[styles.metricValue, { color: labelColor }]}>
                  {item.valueLabel}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.max(10, Math.round(item.progress * 100))}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 19,
    lineHeight: 24,
    color: '#1B2434',
    fontWeight: '700',
  },
  headerHint: {
    fontSize: 12,
    lineHeight: 16,
    color: '#C39C6B',
    fontWeight: '600',
  },
  metricList: {
    gap: 16,
  },
  metricRow: {
    gap: 8,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  metricLabel: {
    fontSize: 14,
    lineHeight: 18,
    color: '#455066',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2F6',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 999,
  },
});
