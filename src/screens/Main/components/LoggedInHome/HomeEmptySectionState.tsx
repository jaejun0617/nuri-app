import React, { memo } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';

import AppText from '../../../../app/ui/AppText';
import type { SeasonKey } from '../../../../theme/seasonal/season';
import { styles as homeStyles } from './LoggedInHome.styles';

export type HomeEmptySectionKind = 'health' | 'schedule' | 'photo';
export type HomeEmptyDataState = 'ready' | 'loading' | 'error';

export const HOME_EMPTY_SECTION_ART: Readonly<
  Record<HomeEmptySectionKind, Readonly<Record<SeasonKey, ImageSourcePropType>>>
> = {
  health: {
    autumn: require('../../../../assets/seasonal/home/empty-sections/health-autumn-v1.png'),
    winter: require('../../../../assets/seasonal/home/empty-sections/health-winter-v1.png'),
    spring: require('../../../../assets/seasonal/home/empty-sections/health-spring-v1.png'),
    summer: require('../../../../assets/seasonal/home/empty-sections/health-summer-v1.png'),
  },
  schedule: {
    autumn: require('../../../../assets/seasonal/home/empty-sections/schedule-autumn-v1.png'),
    winter: require('../../../../assets/seasonal/home/empty-sections/schedule-winter-v1.png'),
    spring: require('../../../../assets/seasonal/home/empty-sections/schedule-spring-v1.png'),
    summer: require('../../../../assets/seasonal/home/empty-sections/schedule-summer-v1.png'),
  },
  photo: {
    autumn: require('../../../../assets/seasonal/home/empty-sections/photo-autumn-v1.png'),
    winter: require('../../../../assets/seasonal/home/empty-sections/photo-winter-v1.png'),
    spring: require('../../../../assets/seasonal/home/empty-sections/photo-spring-v1.png'),
    summer: require('../../../../assets/seasonal/home/empty-sections/photo-summer-v1.png'),
  },
};

export const HOME_EMPTY_SECTION_COPY = {
  health: {
    title: '아직 건강 기록이 없어요',
    description:
      '병원 방문부터 체중 변화까지, 우리 아이의 건강을 차근차근 남겨보세요.',
    action: '건강관리 시작하기',
    accessibilityLabel: '건강관리 시작하기, 건강관리 화면 열기',
    loading: '건강 기록을 불러오고 있어요.',
    error: '건강 기록을 불러오지 못했어요. 전체 보기에서 다시 확인해주세요.',
  },
  schedule: {
    title: '아직 등록된 일정이 없어요',
    description: '산책과 병원 방문, 소중한 약속을 한곳에 모아두세요.',
    action: '일정 추가하기',
    accessibilityLabel: '일정 추가하기, 일정 작성 화면 열기',
    loading: '일정을 불러오고 있어요.',
    error: '일정을 불러오지 못했어요. 전체 보기에서 다시 확인해주세요.',
  },
  photo: {
    title: '오늘의 순간을 남겨보세요',
    description: '평범한 하루도 우리 아이의 소중한 추억이 될 수 있어요.',
    action: '사진 기록하기',
    accessibilityLabel: '사진 기록하기, 기록 작성 화면 열기',
    loading: '오늘의 사진을 불러오고 있어요.',
    error: '사진을 불러오지 못했어요. 잠시 후 다시 시도해주세요.',
  },
} as const;

export function shouldStackHealthEmptyState(width: number, fontScale: number) {
  return width < 350 || fontScale >= 1.3;
}

type Props = {
  kind: HomeEmptySectionKind;
  season: SeasonKey;
  dataState: HomeEmptyDataState;
  accentDeepColor: string;
  onPressAction: () => void;
};

/** Only ready, empty data receives artwork; unavailable data stays honest. */
export const HomeEmptySectionState = memo(function HomeEmptySectionStateView({
  kind,
  season,
  dataState,
  accentDeepColor,
  onPressAction,
}: Props) {
  const { width, fontScale } = useWindowDimensions();
  const copy = HOME_EMPTY_SECTION_COPY[kind];
  const horizontal =
    kind === 'health' && !shouldStackHealthEmptyState(width, fontScale);

  if (dataState !== 'ready') {
    return (
      <View
        testID={`home-${kind}-${dataState}`}
        style={styles.pending}
        accessibilityLiveRegion="polite"
      >
        {dataState === 'loading' ? (
          <ActivityIndicator color={accentDeepColor} />
        ) : null}
        <AppText preset="unifiedBody" style={styles.pendingCopy}>
          {dataState === 'error' ? copy.error : copy.loading}
        </AppText>
      </View>
    );
  }

  return (
    <View testID={`home-${kind}-empty`} style={styles.content}>
      <View style={[styles.composition, horizontal ? styles.horizontal : null]}>
        <View
          testID={`home-${kind}-art-frame`}
          style={[
            styles.artFrame,
            kind === 'health'
              ? styles.healthArt
              : kind === 'schedule'
              ? styles.scheduleArt
              : styles.photoArt,
          ]}
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View
            testID={`home-${kind}-art-viewport`}
            style={[
              styles.artViewport,
              kind !== 'health' ? styles.enlargedArtViewport : null,
            ]}
          >
            <Image
              testID={`home-${kind}-art`}
              source={HOME_EMPTY_SECTION_ART[kind][season]}
              resizeMode="contain"
              style={[
                styles.art,
                kind !== 'health' ? styles.enlargedArt : null,
              ]}
              pointerEvents="none"
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </View>
        </View>
        <View style={[styles.copy, horizontal ? styles.horizontalCopy : null]}>
          <AppText
            typographyRole="celebration"
            preset="unifiedTitle"
            styleOverridesPreset
            style={[styles.title, kind === 'schedule' ? styles.centered : null]}
          >
            {copy.title}
          </AppText>
          <AppText
            preset="unifiedBody"
            styleOverridesPreset
            style={[
              styles.description,
              kind === 'schedule' ? styles.centered : null,
            ]}
          >
            {copy.description}
          </AppText>
        </View>
      </View>
      <TouchableOpacity
        testID={`home-${kind}-empty-action`}
        accessibilityRole="button"
        accessibilityLabel={copy.accessibilityLabel}
        activeOpacity={0.9}
        style={[
          homeStyles.recordBtn,
          styles.action,
          { backgroundColor: accentDeepColor, shadowColor: accentDeepColor },
        ]}
        onPress={onPressAction}
      >
        <AppText
          preset="unifiedLabel"
          style={[homeStyles.recordBtnText, styles.actionText]}
        >
          {copy.action}
        </AppText>
      </TouchableOpacity>
    </View>
  );
});

export const styles = StyleSheet.create({
  content: { width: '100%', gap: 12 },
  composition: { width: '100%', alignItems: 'center', gap: 12 },
  horizontal: { flexDirection: 'row', alignItems: 'center' },
  // Static bitmap dimensions never own layout, including on native Android.
  artFrame: { aspectRatio: 1, alignSelf: 'center', flexShrink: 0 },
  healthArt: { width: '38%', maxWidth: 128, maxHeight: 128 },
  scheduleArt: { width: '56%', maxWidth: 136, maxHeight: 136 },
  photoArt: { width: '72%', maxWidth: 168, maxHeight: 168 },
  artViewport: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  // Fill transparent PNG margins without increasing the slot or painting into copy.
  enlargedArtViewport: { left: '-17.5%', right: '-17.5%' },
  art: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  enlargedArt: { top: '-17.5%', height: '135%' },
  copy: { width: '100%', gap: 8 },
  horizontalCopy: { flex: 1, width: undefined, minWidth: 0 },
  title: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    color: '#344354',
    letterSpacing: 0,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: '#647183',
    fontWeight: '400',
    letterSpacing: 0,
  },
  centered: { textAlign: 'center' },
  action: {
    height: undefined,
    minHeight: 46,
    paddingVertical: 12,
    marginTop: 0,
  },
  actionText: { alignSelf: 'stretch', textAlign: 'center', flexShrink: 1 },
  pending: {
    minHeight: 120,
    padding: 16,
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingCopy: { color: '#647183', textAlign: 'center' },
});
