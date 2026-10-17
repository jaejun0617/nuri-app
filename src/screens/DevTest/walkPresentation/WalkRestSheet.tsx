import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from 'styled-components/native';
import AppText from '../../../app/ui/AppText';
import type { SeasonKey } from '../../../theme/seasonal/season';
import WalkActionSheet from './WalkActionSheet';
import { walkCopyAccent } from './walkAccent';

type Props = {
  visible: boolean;
  season: SeasonKey;
  insetTop: number;
  insetBottom: number;
  busy: boolean;
  error: boolean;
  onDismiss: () => void;
  onResume: () => void;
};
export default function WalkRestSheet(props: Props) {
  const theme = useTheme();
  return (
    <WalkActionSheet
      {...props}
      testIDPrefix="walk-rest"
      announcement="잠깐 쉬어가도 괜찮아요. 언제든 다시 함께 걸어요. 시간과 거리는 잠시 멈춰둘게요."
      dismissLabel="쉬기 안내 닫기"
      dismissHint="산책은 일시정지 상태로 유지돼요."
      primaryLabel="산책 계속하기"
      secondaryLabel="조금 더 쉬기"
      primaryTestID="walk-rest-resume"
      secondaryTestID="walk-rest-later"
      errorMessage="다시 이어가지 못했어요. 잠시 후 다시 시도해 주세요."
      onPrimary={props.onResume}
    >
      <AppText
        testID="walk-rest-title"
        preset="titleSm"
        accessibilityRole="header"
        style={[
          styles.title,
          { color: walkCopyAccent(props.season, theme.mode === 'dark') },
        ]}
      >
        잠깐 쉬어가도 괜찮아요.
      </AppText>
      <AppText
        testID="walk-rest-invitation"
        preset="bodySm"
        style={[styles.body, { color: theme.colors.textPrimary }]}
      >
        언제든 다시 함께 걸어요.
      </AppText>
      <AppText
        testID="walk-rest-note"
        preset="caption"
        style={[styles.note, { color: theme.colors.textSecondary }]}
      >
        시간과 거리는 잠시 멈춰둘게요.
      </AppText>
    </WalkActionSheet>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  body: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  note: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
