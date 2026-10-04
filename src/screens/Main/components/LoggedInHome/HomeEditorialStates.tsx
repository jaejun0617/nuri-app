import React, { memo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import AppText from '../../../../app/ui/AppText';
import { HomeSectionGlass } from '../../../../components/home/HomeSectionGlass';
import { HomeSectionHeader } from '../../../../components/home/HomeSectionHeader';
import type { HomeCommunityTab } from '../../../../services/home/communityHighlights';
import type { SeasonKey } from '../../../../theme/seasonal/season';
import { HomeEditorialArtwork } from './HomeEditorialArtwork';
import type { HomeEmptyDataState } from './HomeEmptySectionState';
import { styles as homeStyles } from './LoggedInHome.styles';

export const TODAY_HOME_TIP = {
  badge: '오늘의 팁',
  title:
    '반려동물의 평소 소리를 기억해두면 작은 변화도 더 빨리 알아챌 수 있어요.',
  description:
    '산책 후 숨소리, 잠든 뒤 호흡, 식사 직후의 반응처럼 평소의 기준을 남겨두면 컨디션 변화를 더 빨리 알아차릴 수 있어요.',
} as const;

export const HOME_COMMUNITY_EMPTY_COPY: Readonly<
  Record<HomeCommunityTab, string>
> = {
  popular: '반려인들의 공감을 모은 이야기를 기다리고 있어요.',
  question: '작은 궁금증도 함께 나누면 답에 가까워져요.',
  info: '서로의 경험이 반려생활의 좋은 길잡이가 돼요.',
  daily: '아이와 나눈 평범한 하루도 소중한 이야기가 돼요.',
  free: '정해진 주제 없이, 마음을 담은 이야기를 기다려요.',
};

export function shouldStackEditorialCopy(width: number, fontScale: number) {
  return width < 350 || fontScale >= 1.3;
}

export function getRecentEmptyDataState(
  status: 'idle' | 'loading' | 'ready' | 'refreshing' | 'loadingMore' | 'error',
): HomeEmptyDataState {
  if (status === 'ready') return 'ready';
  return status === 'error' ? 'error' : 'loading';
}

export const TodayHomeTipSection = memo(function TodayHomeTipSectionView({
  season,
  accentColor,
}: {
  season: SeasonKey;
  accentColor: string;
}) {
  const { width, fontScale } = useWindowDimensions();
  const stack = shouldStackEditorialCopy(width, fontScale);
  return (
    <HomeSectionGlass testID="home-glass-today-tip" style={homeStyles.section}>
      <HomeSectionHeader title={TODAY_HOME_TIP.badge} color={accentColor} />
      <View style={styles.content}>
        <View style={[styles.row, stack ? styles.stacked : null]}>
          <View style={[styles.copy, stack ? styles.stackedCopy : null]}>
            <AppText
              preset="unifiedTitle"
              styleOverridesPreset
              style={styles.tipTitle}
            >
              {TODAY_HOME_TIP.title}
            </AppText>
          </View>
          <HomeEditorialArtwork kind="today-tip" season={season} />
        </View>
        <View style={styles.divider} pointerEvents="none" />
        <AppText
          preset="unifiedBody"
          styleOverridesPreset
          style={styles.description}
        >
          {TODAY_HOME_TIP.description}
        </AppText>
      </View>
    </HomeSectionGlass>
  );
});

export const RecentRecordsEmptyState = memo(
  function RecentRecordsEmptyStateView({
    season,
    dataState,
    accentColor,
    onPressRecord,
  }: {
    season: SeasonKey;
    dataState: HomeEmptyDataState;
    accentColor: string;
    onPressRecord: () => void;
  }) {
    const { width, fontScale } = useWindowDimensions();
    const stack = shouldStackEditorialCopy(width, fontScale);

    if (dataState !== 'ready') {
      return (
        <View
          testID={`home-recent-${dataState}`}
          style={styles.pending}
          accessibilityLiveRegion="polite"
        >
          {dataState === 'loading' ? (
            <ActivityIndicator color={accentColor} />
          ) : null}
          <AppText preset="unifiedBody" style={styles.pendingCopy}>
            {dataState === 'error'
              ? '기록을 불러오지 못했어요. 전체 보기에서 다시 확인해주세요.'
              : '기록을 불러오는 중이에요.'}
          </AppText>
        </View>
      );
    }

    return (
      <View testID="home-recent-empty" style={styles.content}>
        <View style={[styles.row, stack ? styles.stacked : null]}>
          <View style={[styles.copy, stack ? styles.stackedCopy : null]}>
            <AppText
              typographyRole="celebration"
              preset="unifiedTitle"
              styleOverridesPreset
              style={styles.emptyTitle}
            >
              아직 기록이 없어요
            </AppText>
            <AppText
              preset="unifiedBody"
              styleOverridesPreset
              style={styles.description}
            >
              첫 번째 추억을 남겨보세요.
            </AppText>
          </View>
          <HomeEditorialArtwork kind="recent" season={season} />
        </View>
        <TouchableOpacity
          testID="home-recent-empty-action"
          accessibilityRole="button"
          accessibilityLabel="기록하기, 기록 작성 화면 열기"
          activeOpacity={0.9}
          style={[
            homeStyles.recordBtn,
            styles.action,
            { backgroundColor: accentColor, shadowColor: accentColor },
          ]}
          onPress={onPressRecord}
        >
          <AppText
            preset="unifiedLabel"
            style={[homeStyles.recordBtnText, styles.actionText]}
          >
            기록하기
          </AppText>
        </TouchableOpacity>
      </View>
    );
  },
);

export const CommunityEmptyState = memo(function CommunityEmptyStateView({
  season,
  tab,
}: {
  season: SeasonKey;
  tab: HomeCommunityTab;
}) {
  return (
    <View testID="home-community-empty" style={styles.community}>
      <HomeEditorialArtwork kind={`community-${tab}`} season={season} />
      <AppText
        preset="unifiedBody"
        styleOverridesPreset
        style={[styles.description, styles.communityCopy]}
      >
        {HOME_COMMUNITY_EMPTY_COPY[tab]}
      </AppText>
    </View>
  );
});

export const styles = StyleSheet.create({
  content: { width: '100%', gap: 14 },
  row: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12 },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  copy: { flex: 1, minWidth: 0, gap: 8 },
  stackedCopy: { flex: 0, width: '100%' },
  tipTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: '#243044',
    letterSpacing: 0,
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    color: '#344354',
    letterSpacing: 0,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
    color: '#586575',
    letterSpacing: 0,
  },
  divider: { height: 1, backgroundColor: 'rgba(134,145,174,0.14)' },
  action: {
    height: undefined,
    minHeight: 46,
    paddingVertical: 12,
    marginTop: 0,
  },
  actionText: {
    alignSelf: 'stretch',
    textAlign: 'center',
    flexShrink: 1,
  },
  pending: { paddingVertical: 18, gap: 10, alignItems: 'center' },
  pendingCopy: { color: '#586575', textAlign: 'center' },
  community: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  communityCopy: { textAlign: 'center', maxWidth: 300 },
});
