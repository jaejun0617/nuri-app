import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '../../../app/ui/AppText';
import { lightColors } from '../../../app/theme/tokens/colors';
import { metricDistance } from './model';
import WalkElapsedMetric from './WalkElapsedMetric';

type Props = {
  distanceM: string | null;
  activeMs: string;
  sessionKey?: string | null;
  running?: boolean;
  accent?: string;
};
export default function WalkSummaryMetrics(props: Props) {
  return (
    <View style={styles.row}>
      <View testID="walk-distance-group" style={styles.column}>
        <AppText
          testID="walk-distance-label"
          preset="caption"
          style={styles.label}
        >
          함께 걸은 거리
        </AppText>
        <AppText
          testID="walk-distance-value"
          preset="display"
          fontModeOverride="pretendard"
          style={[
            styles.value,
            props.accent ? { color: props.accent } : undefined,
          ]}
        >
          {metricDistance(props.distanceM)}
          <AppText
            preset="bodySm"
            style={[
              styles.unit,
              props.accent ? { color: props.accent } : undefined,
            ]}
          >
            {' '}
            km
          </AppText>
        </AppText>
      </View>
      <View style={styles.divider} />
      <View testID="walk-time-group" style={styles.column}>
        <AppText testID="walk-time-label" preset="caption" style={styles.label}>
          산책 시간
        </AppText>
        <WalkElapsedMetric
          activeMs={props.activeMs}
          sessionKey={props.sessionKey}
          running={!!props.running}
          style={[
            styles.value,
            props.accent ? { color: props.accent } : undefined,
          ]}
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 12,
  },
  column: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4 },
  label: {
    fontSize: 11,
    lineHeight: 17,
    color: lightColors.textSecondary,
    textAlign: 'center',
  },
  value: {
    fontSize: 22,
    lineHeight: 30,
    color: lightColors.textPrimary,
    textAlign: 'center',
  },
  unit: { fontSize: 16, lineHeight: 24, color: lightColors.textPrimary },
  divider: { width: 1, height: 34, backgroundColor: lightColors.border },
});
