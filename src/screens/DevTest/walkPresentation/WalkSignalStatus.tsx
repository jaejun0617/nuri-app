import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  AppState,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import AppText from '../../../app/ui/AppText';
import Feather from '../../../components/icons/NuriFeatherIcon';
import type { SeasonKey } from '../../../theme/seasonal/season';
import { walkCopyAccent } from './walkAccent';

type Props = {
  state: 'GPS_ACQUIRING' | 'GPS_WEAK' | 'GPS_LOST';
  season: SeasonKey;
};
const COPY = {
  GPS_ACQUIRING: [
    '첫 위치를 확인하고 있어요.',
    '하늘이 잘 보이는 곳에서 잠시 기다려 주세요.',
  ],
  GPS_WEAK: ['위치 신호가 조금 약해요.', '정확한 지점만 골라 기록해요.'],
  GPS_LOST: [
    '위치 신호를 다시 찾고 있어요.',
    '신호가 없는 구간은 거리로 더하지 않아요.',
  ],
} as const;
export default function WalkSignalStatus({ state, season }: Props) {
  const theme = useTheme();
  const [reduceMotion, setReduceMotion] = useState(true);
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  );
  useEffect(() => {
    let alive = true;
    const update = (enabled: boolean) => {
      if (alive) setReduceMotion(enabled);
    };
    const motion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      update,
    );
    const app = AppState.addEventListener('change', value =>
      setForeground(value === 'active'),
    );
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled())
      .then(value => update(value !== false))
      .catch(() => update(true));
    return () => {
      alive = false;
      motion.remove();
      app.remove();
    };
  }, []);
  const accent = walkCopyAccent(season, theme.mode === 'dark');
  return (
    <View testID="walk-signal-status" style={styles.row}>
      <View
        testID="walk-signal-progress"
        style={styles.progress}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {reduceMotion || !foreground ? (
          <Feather
            testID="walk-signal-progress-static"
            name="radio"
            size={22}
            color={accent}
          />
        ) : (
          <ActivityIndicator
            testID="walk-signal-progress-animated"
            size="small"
            color={accent}
          />
        )}
      </View>
      <View style={styles.copy} accessibilityLiveRegion="polite">
        <AppText preset="bodySm" style={[styles.title, { color: accent }]}>
          {COPY[state][0]}
        </AppText>
        <AppText
          preset="caption"
          style={[styles.body, { color: theme.colors.textSecondary }]}
        >
          {COPY[state][1]}
        </AppText>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  progress: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontSize: 13, lineHeight: 20 },
  body: { fontSize: 12, lineHeight: 19 },
});
