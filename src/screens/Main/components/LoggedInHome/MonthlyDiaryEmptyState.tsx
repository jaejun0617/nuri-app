import React, { memo } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from 'react-native';

import AppText from '../../../../app/ui/AppText';
import type { PetRecordsState } from '../../../../store/recordStore';
import type { SeasonKey } from '../../../../theme/seasonal/season';
import { styles as homeStyles } from './LoggedInHome.styles';

// Use the background season, not the shared Autumn foreground material.
export const MONTHLY_DIARY_EMPTY_ART: Readonly<
  Record<SeasonKey, ImageSourcePropType>
> = {
  autumn: require('../../../../assets/seasonal/home/diary/autumn-empty-v1.png'),
  winter: require('../../../../assets/seasonal/home/diary/winter-empty-v1.png'),
  spring: require('../../../../assets/seasonal/home/diary/spring-empty-v1.png'),
  summer: require('../../../../assets/seasonal/home/diary/summer-empty-v1.png'),
};

type Props = {
  season: SeasonKey;
  recordStatus: PetRecordsState['status'];
  accentDeepColor: string;
  onPressRecord: () => void;
};

export const MonthlyDiaryEmptyState = memo(function MonthlyDiaryEmptyStateView({
  season,
  recordStatus,
  accentDeepColor,
  onPressRecord,
}: Props) {
  // An unavailable list is not evidence that this month's diary is empty.
  if (recordStatus !== 'ready') {
    const failed = recordStatus === 'error';
    return (
      <View
        testID={failed ? 'monthly-diary-error' : 'monthly-diary-loading'}
        style={styles.pending}
        accessibilityLiveRegion="polite"
      >
        {!failed ? <ActivityIndicator color={accentDeepColor} /> : null}
        <AppText preset="unifiedBody" style={styles.description}>
          {failed
            ? '일기를 불러오지 못했어요.\n전체 보기에서 다시 확인해주세요.'
            : '이번 달 일기를 불러오고 있어요.'}
        </AppText>
      </View>
    );
  }

  return (
    <View testID="monthly-diary-empty" style={styles.content}>
      <View
        testID="monthly-diary-illustration-frame"
        style={styles.illustrationFrame}
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Image
          testID="monthly-diary-empty-illustration"
          source={MONTHLY_DIARY_EMPTY_ART[season]}
          style={styles.illustration}
          resizeMode="contain"
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
      <View style={styles.copy}>
        <AppText
          typographyRole="celebration"
          preset="unifiedTitle"
          styleOverridesPreset
          style={styles.title}
        >
          이번 달 일기가 아직 없어요
        </AppText>
        <AppText
          preset="unifiedBody"
          styleOverridesPreset
          style={styles.description}
        >
          {
            '산책, 식사, 놀이, 소소한 일상까지\n우리 아이의 소중한 순간을 기록해보세요.'
          }
        </AppText>
      </View>
      <TouchableOpacity
        testID="monthly-diary-record-action"
        accessibilityRole="button"
        accessibilityLabel="기록하기, 기록 작성 화면 열기"
        activeOpacity={0.9}
        style={[
          homeStyles.recordBtn,
          styles.recordAction,
          {
            backgroundColor: accentDeepColor,
            shadowColor: accentDeepColor,
          },
        ]}
        onPress={onPressRecord}
      >
        <AppText
          preset="unifiedLabel"
          style={[homeStyles.recordBtnText, styles.recordActionText]}
        >
          기록하기
        </AppText>
      </TouchableOpacity>
    </View>
  );
});

export const styles = StyleSheet.create({
  content: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
    paddingBottom: 2,
  },
  // RN gives static images their source height; only the frame owns geometry.
  illustrationFrame: {
    width: '72%',
    maxWidth: 200,
    maxHeight: 200,
    aspectRatio: 1,
    alignSelf: 'center',
  },
  illustration: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  copy: { width: '100%', gap: 8 },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    color: '#344354',
    textAlign: 'center',
    letterSpacing: 0,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
    color: '#647183',
    textAlign: 'center',
    letterSpacing: 0,
    flexShrink: 1,
  },
  recordAction: { marginTop: 2 },
  recordActionText: { alignSelf: 'stretch', textAlign: 'center' },
  pending: {
    minHeight: 160,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});
