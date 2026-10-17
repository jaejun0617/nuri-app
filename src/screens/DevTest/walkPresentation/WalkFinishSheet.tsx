import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import AppText from '../../../app/ui/AppText';
import { lightColors } from '../../../app/theme/tokens/colors';
import type { SeasonKey } from '../../../theme/seasonal/season';
import WalkActionSheet from './WalkActionSheet';
import WalkSummaryMetrics from './WalkSummaryMetrics';
import { finishArtwork } from './finishArtwork';
import { walkCopyAccent } from './walkAccent';

type Props = {
  visible: boolean;
  season: SeasonKey;
  insetTop: number;
  insetBottom: number;
  distanceM: string | null;
  activeMs: string;
  sessionKey?: string | null;
  running: boolean;
  busy: boolean;
  error: boolean;
  onDismiss: () => void;
  onFinish: () => void;
};
export default function WalkFinishSheet(props: Props) {
  return (
    <WalkActionSheet
      {...props}
      paper
      testIDPrefix="walk-finish"
      announcement="오늘 산책, 기분 좋게 마칠까요? 산책 마치기 또는 계속 걷기를 선택해 주세요."
      dismissLabel="종료 확인 닫기"
      dismissHint="산책을 종료하지 않고 이전 화면으로 돌아가요."
      primaryLabel="산책 마치기"
      secondaryLabel="계속 걷기"
      primaryRole="destructiveConfirm"
      primaryTestID="walk-finish-confirm"
      secondaryTestID="walk-finish-cancel"
      errorMessage="산책을 마치지 못했어요. 기록은 유지되니 다시 시도해 주세요."
      onPrimary={props.onFinish}
    >
      <View testID="walk-finish-artwork-frame" style={styles.artFrame}>
        <Image
          source={finishArtwork(props.season, true)}
          resizeMode="contain"
          testID="walk-finish-artwork"
          accessible={false}
          importantForAccessibility="no"
          style={styles.art}
        />
      </View>
      <AppText
        testID="walk-finish-title"
        preset="titleSm"
        accessibilityRole="header"
        style={[styles.title, { color: walkCopyAccent(props.season) }]}
      >
        오늘 산책, 기분 좋게 마칠까요?
      </AppText>
      <WalkSummaryMetrics
        distanceM={props.distanceM}
        activeMs={props.activeMs}
        sessionKey={props.sessionKey}
        running={props.running}
        accent={walkCopyAccent(props.season)}
      />
    </WalkActionSheet>
  );
}
const styles = StyleSheet.create({
  artFrame: {
    width: '100%',
    maxWidth: 264,
    aspectRatio: 2,
    alignSelf: 'center',
    marginBottom: 6,
  },
  art: { width: '100%', height: '100%' },
  title: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: lightColors.textPrimary,
  },
});
