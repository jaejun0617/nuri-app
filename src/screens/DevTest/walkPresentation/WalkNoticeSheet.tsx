import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import AppText from '../../../app/ui/AppText';
import Feather from '../../../components/icons/NuriFeatherIcon';
import type { SeasonKey } from '../../../theme/seasonal/season';
import WalkActionSheet from './WalkActionSheet';
import { walkCopyAccent } from './walkAccent';
import { WALK_NOTICE_COPY, type WalkNoticeKind } from './noticeModel';

type Props = {
  kind: WalkNoticeKind;
  visible: boolean;
  season: SeasonKey;
  insetTop: number;
  insetBottom: number;
  busy: boolean;
  onDismiss: () => void;
  onPrimary: () => void;
};

export default function WalkNoticeSheet(props: Props) {
  const theme = useTheme();
  const copy = WALK_NOTICE_COPY[props.kind];
  const accent = walkCopyAccent(props.season, theme.mode === 'dark');
  return (
    <WalkActionSheet
      {...props}
      error={false}
      testIDPrefix="walk-notice"
      announcement={`${copy.title}. ${copy.body.replace('\n', ' ')}`}
      dismissLabel="안내 닫기"
      dismissHint="현재 산책 상태를 바꾸지 않고 안내만 닫아요."
      primaryLabel={copy.primary}
      secondaryLabel={copy.secondary}
      primaryTestID={
        props.kind.startsWith('MINIMIZE_')
          ? 'walk-minimize-confirm'
          : 'walk-notice-primary'
      }
      secondaryTestID="walk-notice-secondary"
      errorMessage=""
    >
      <View
        style={styles.symbol}
        accessible={false}
        importantForAccessibility="no"
      >
        <Feather name={copy.icon} size={30} color={accent} />
      </View>
      <AppText
        testID="walk-notice-title"
        accessibilityRole="header"
        preset="titleSm"
        style={[styles.title, { color: accent }]}
      >
        {copy.title}
      </AppText>
      <AppText
        testID="walk-notice-body"
        preset="bodySm"
        style={[styles.body, { color: theme.colors.textPrimary }]}
      >
        {copy.body}
      </AppText>
    </WalkActionSheet>
  );
}
const styles = StyleSheet.create({
  symbol: { alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  body: { fontSize: 13, lineHeight: 21, textAlign: 'center' },
});
