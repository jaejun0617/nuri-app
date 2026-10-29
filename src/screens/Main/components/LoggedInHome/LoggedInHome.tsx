import { usePetDisplayName } from '../../../../hooks/usePetDisplayName';
import { formatPetCopy } from '../../../../utils/petDisplayName';
// 파일: src/screens/Main/components/LoggedInHome/LoggedInHome.tsx
// 목적:
// - 로그인 홈 (LoggedInHome)
// - 홈 허브에서 프로필/날씨/최근 기록/건강관리/일정/가이드를 한 번에 소비한다.
// - 최근 기록은 홈 전용 세로 프리뷰 섹션으로, 최신 3개만 압축 노출한다.

import AppText from '../../../../app/ui/AppText';
import { FixedTypographyBoundary } from '../../../../app/providers/AppFontPreferenceProvider';
import React, {
  useEffect,
  useContext,
  useMemo,
  useCallback,
  useRef,
  useState,
} from 'react';
import {
  Animated as RNAnimated,
  Easing as RNEasing,
  Image,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  useBottomTabBarHeight,
  type BottomTabNavigationProp,
} from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import {
  useIsFocused,
  useNavigation,
  useScrollToTop,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadHomeTitleSelection } from '../../../../services/activity/homeTitleSelection';
import Feather from '../../../../components/icons/NuriFeatherIcon';
import MaterialCommunityIcons from '../../../../components/icons/NuriMaterialIcon';
import NuriSemanticIcon from '../../../../components/icons/NuriSemanticIcon';
import NuriIcon from '../../../../components/icons/NuriIcon';
import LinearGradient from 'react-native-linear-gradient';
import Animated from 'react-native-reanimated';

import Screen from '../../../../components/layout/Screen';
import { ToolbarHeightContext } from '../../../../components/navigation/ToolbarHeightContext';
import { HomeSectionGlass } from '../../../../components/home/HomeSectionGlass';
import { useHealthVisualQa } from '../../../../components/health/healthVisualQa';
import { HomeScheduleCalendar } from '../../../../components/home/HomeScheduleCalendar';
import { HomeSeasonProvider, useHomeContentTextStyle } from '../../../../components/home/HomeSeasonContext';
import {
  HomeSectionHeader,
  isHomeSectionConfirmedEmpty,
} from '../../../../components/home/HomeSectionHeader';
import {
  HOME_AMBIENT_SECTION_ZONES,
  updateHomeAmbientSectionLayout,
  type HomeAmbientBubbleZone,
  type HomeAmbientSectionLayouts,
} from '../../../../theme/home/ambientMesh';
import { FrequentRecordsSection } from '../../../../components/records/FrequentRecordsSection';
import { WalkHomeFooter, WalkProgressionRow } from '../../../../components/records/WalkProductSummary';
import { useQuery } from '@tanstack/react-query';
import GuideRecommendationCard from '../../../../components/guides/GuideRecommendationCard';
import { useWeatherGuide } from '../../../../hooks/useWeatherGuide';
import { useHomePetCareGuides } from '../../../../hooks/useHomePetCareGuides';
import { useSignedMemoryImage } from '../../../../hooks/useSignedMemoryImage';
import type { AppTabParamList } from '../../../../navigation/AppTabsNavigator';
import type { TimelineStackParamList } from '../../../../navigation/TimelineStackNavigator';
import type { RootStackParamList } from '../../../../navigation/RootNavigator';
import {
  normalizeCategoryKey,
  getMemoryCategoryChipLabel,
  getRecordCategoryMeta,
  getMemoryCategoryChipTone,
  readRecordCategoryRaw,
} from '../../../../services/memories/categoryMeta';
import { getPrimaryMemoryImageRef } from '../../../../services/records/imageSources';
import { useAuthStore } from '../../../../store/authStore';
import { usePetStore } from '../../../../store/petStore';
import {
  useRecordStore,
  type PetRecordsState,
} from '../../../../store/recordStore';
import { useScheduleStore } from '../../../../store/scheduleStore';
import { useActiveScheduleAlarms } from '../../../../hooks/useActiveScheduleAlarms';
import HomeActiveAlarmNotice from './HomeActiveAlarmNotice';
import { MonthlyDiaryEmptyState } from './MonthlyDiaryEmptyState';
import {
  HomeEmptySectionState,
  type HomeEmptyDataState,
} from './HomeEmptySectionState';
import { HomeHealthActivityList } from './HomePopulatedLists';
import { TotalSummarySection } from './TotalSummarySection';
import {
  RecentRecordsEmptyState,
  TodayHomeTipSection,
  getRecentEmptyDataState,
} from './HomeEditorialStates';
import { HomeAmbientBubbleCanvas } from './HomeAmbientBubbleCanvas';
import { HomeHeroPhotoBackground, type HomeHeroPhotoStatus } from './HomeHeroPhotoBackground';
import { HomeNotificationBadge } from './HomeNotificationBadge';
import { useHomePetSwitchTransition } from './useHomePetSwitchTransition';
import {
  HomeHeroContentSheet,
  HomeHeroInfoPanel,
} from './HomeHeroInfoPanel';
import { HOME_HERO_COLORS, getHomeHeroColors, getHomeHeroMinimumHeight, getHomeHeroSeasonCopy } from '../../../../theme/home/heroLayout';
import { HomePetSelectionSheet } from './HomePetSelectionSheet';
import { HomePetSheetHeader } from './HomePetSheetHeader';
import {
  HomePetBasicInfoSection,
  type HomePetBasicInfoValues,
} from './HomePetBasicInfoSection';
import {
  HOME_FOREGROUND_UI_SEASON,
} from '../../../../theme/home/seasonalAmbient';
import {
  AutumnLeafOrnament,
} from './SeasonalHomeAutumn';
import {
  WinterOrnament,
  type WinterOrnamentVariant,
} from './SeasonalHomeWinter';
import {
  SeasonalProfileSheetOrnament,
  type SeasonalProfileSheetOrnamentSeason,
  type SeasonalProfileSheetOrnamentVariant,
} from './SeasonalProfileSheetOrnament';
import {
  getSeasonalHomeVisual,
  type SeasonalHomeVisual,
} from '../../../../theme/seasonal/home';
import type { SeasonKey } from '../../../../theme/seasonal/season';
import { useSeasonPreference } from '../../../../app/providers/SeasonPreferenceProvider';
import { getSeasonalWeatherVisualTheme } from '../../../../theme/seasonal/weather';

import {
  fetchMemorySummaryRecordsByPet,
  type MemoryRecord,
} from '../../../../services/supabase/memories';
import type { PetSchedule } from '../../../../services/supabase/schedules';
import { buildHomeWidgetSnapshot } from '../../../../services/home/widgetSnapshot';
import { syncHomeWidgetSnapshot } from '../../../../services/home/widgetBridge';
import {
  completeTotalSummaryLoad,
  createTotalSummaryState,
  failTotalSummaryLoad,
  startTotalSummaryLoad,
  type TotalSummaryState,
} from '../../../../services/home/weeklySummary';
import {
  formatRecordCreatedTime,
  formatRecordDisplayDate,
  getRecordDisplayYmd,
  getRecordSortTimestamp,
} from '../../../../services/records/date';
import {
  buildHealthActivityItems,
  isHealthSchedule,
  type HealthActivityItem,
} from '../../../../services/health-report/viewModel';
import { buildPetThemePalette, NEUTRAL_UI_PALETTE } from '../../../../services/pets/themePalette';
import {
  buildFrequentRecordSummary,
  type FrequentRecordCategory,
} from '../../../../services/home/frequentRecords';
import {
  createTimelineEntryRequestId,
  HOME_TOTAL_SUMMARY_ENTRY_SOURCE,
  publishTimelineEntryRequest,
} from '../../../Records/timelineEntry';
import { formatPetAgeLabelFromBirthDate } from '../../../../services/pets/age';
import {
  formatMemorialPetName,
  isMemorialPet,
} from '../../../../services/pets/memorial';
import {
  fetchHomePetTitleBadgeIdentity,
  loadCachedHomePetTitleBadgeIdentity,
  saveCachedHomePetTitleBadge,
  type HomeTitleBadgeIdentity,
} from '../../../../services/activity/homeTitleBadge';
import {
  loadHomeRecordScheduleCache,
  saveHomeRecordScheduleCache,
} from '../../../../services/local/homeRecordScheduleCache';
import { useNotificationUnreadCount } from '../../../../hooks/useNotificationInbox';
import { resolveWeatherToHomeBridgeHeight } from '../../../../services/home/weatherToHomeTransition';
import { getAgeInMonthsFromBirthDate } from '../../../../services/guides/agePolicy';
import { buildGuideEventMetadata } from '../../../../services/guides/analytics';
import {
  getGuideDataSourceDescription,
} from '../../../../services/guides/source';
import { isLocalGuideSeedGuide } from '../../../../services/guides/seed';
import { getGuideRotationWindowKey } from '../../../../services/guides/rotation';
import { recordPetCareGuideEvents } from '../../../../services/guides/service';
import {
  diffDaysFromKst,
  formatYmdWithWeekday,
  getMonthKeyFromYmd,
  getMonthKeyInKst,
} from '../../../../utils/date';
import { scheduleIdleTask } from '../../../../utils/scheduleIdleTask';
import WeatherGuideHomeCard from '../../../../components/weather/WeatherGuideHomeCard';
import type { PetCareGuide } from '../../../../services/guides/types';
import { HOME_BASE_BACKGROUND_COLOR, styles } from './LoggedInHome.styles';
import CommunitySection from './CommunitySection';

type HomeTabNav = BottomTabNavigationProp<AppTabParamList, 'HomeTab'>;
type Nav = CompositeNavigationProp<
  HomeTabNav,
  NativeStackNavigationProp<RootStackParamList>
>;

const HOME_SCROLL_OFFSET_BY_KEY = new Map<string, number>();
const AUTUMN_PROFILE_SHEET_BOTTOM_WAVE = require('../../../../assets/seasonal/home/autumn/profile-sheet-bottom-wave.png');
// Temporary PO review: keep the edit target and layout, but do not draw the ring.



type TimelineMainCategory = NonNullable<
  TimelineStackParamList['TimelineMain']
>['mainCategory'];
type TimelineOtherSubCategory = NonNullable<
  TimelineStackParamList['TimelineMain']
>['otherSubCategory'];
type ProfileAccordionKey = 'hobby' | 'like' | 'dislike' | 'tag';

type HomeRecentPreviewItem = {
  record: MemoryRecord;
};



/* ---------------------------------------------------------
 * 1) helpers
 * -------------------------------------------------------- */
function getRecordYmdDots(item: MemoryRecord): string {
  return (
    formatYmdWithWeekday(getRecordDisplayYmd(item), {
      separator: '.',
    }) ?? formatRecordDisplayDate(item)
  );
}




function formatGender(
  g: 'male' | 'female' | 'unknown' | null | undefined,
): string | null {
  if (!g || g === 'unknown') return null;
  return g === 'male' ? '남아' : '여아';
}

function formatWeightKg(v: number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}kg`;
}

function clampList(list: string[] | null | undefined, max = 2) {
  const arr = Array.isArray(list) ? list : [];
  return arr
    .map(s => (s ?? '').trim())
    .filter(Boolean)
    .slice(0, max);
}

function buildHomeRecentPreviewItems(
  records: MemoryRecord[],
): HomeRecentPreviewItem[] {
  const selectedRecords = [...records]
    .sort(
      (lhs, rhs) => getRecordSortTimestamp(rhs) - getRecordSortTimestamp(lhs),
    )
    .slice(0, HOME_RECENT_RECORDS_MAX);

  return selectedRecords.map(record => {
    return { record };
  });
}

function getHomeRecentSummary(record: MemoryRecord): string {
  const categoryLabel = getMemoryCategoryChipLabel(record);
  const summaryCategory: FrequentRecordCategory | null =
    categoryLabel === '산책'
      ? 'walk'
      : categoryLabel === '식사'
      ? 'meal'
      : categoryLabel === '건강'
      ? 'health'
      : categoryLabel === '미용'
      ? 'grooming'
      : null;

  if (summaryCategory) {
    return buildFrequentRecordSummary(summaryCategory, record);
  }

  const source = `${record.title ?? ''} ${record.content ?? ''}`
    .replace(/\s+/g, ' ')
    .trim();
  if (source.length <= 42) return source || '기록을 남겼어요';
  return `${source.slice(0, 41).trimEnd()}…`;
}

function getHomeRecentIcon(record: MemoryRecord): string {
  switch (getMemoryCategoryChipLabel(record)) {
    case '산책':
      return 'walk';
    case '식사':
      return 'silverware-fork-knife';
    case '건강':
      return 'heart-pulse';
    case '미용':
      return 'content-cut';
    default:
      return getRecordCategoryMeta(record).icon;
  }
}

const HomeRecentRecordRow = React.memo(function HomeRecentRecordRow({
  item,
  onPress,
  showDivider,
}: {
  item: MemoryRecord;
  onPress: (item: MemoryRecord) => void;
  showDivider: boolean;
}) {
  const categoryLabel = getMemoryCategoryChipLabel(item);
  const contentTextStyle = useHomeContentTextStyle();
  const categoryTone = getMemoryCategoryChipTone(item);
  const isGrooming = categoryLabel === '미용';
  const summary = getHomeRecentSummary(item);
  const createdTime = formatRecordCreatedTime(item);
  const iconColor = isGrooming ? '#684CD3' : categoryTone.textColor;
  const iconBackground = isGrooming ? '#F3EEFF' : categoryTone.placeholderColor;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={styles.recentRecordRow}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${categoryLabel} 기록, ${summary}${
        createdTime ? `, ${createdTime}` : ''
      }`}
    >
      <View
        style={[
          styles.recentRecordIconBox,
          { backgroundColor: iconBackground },
        ]}
      >
        <NuriSemanticIcon
          family="material"
          name={getHomeRecentIcon(item)}
          size={25}
          color={iconColor}
        />
      </View>

      <View style={styles.recentRecordBody}>
        <AppText
          preset="unifiedLabel"
          style={[styles.recentRecordCategory, contentTextStyle]}
          numberOfLines={1}
        >
          {categoryLabel}
        </AppText>
        <AppText
          preset="unifiedBody"
          style={styles.recentRecordSummary}
          numberOfLines={1}
        >
          {summary}
        </AppText>
      </View>

      <View style={styles.recentRecordMeta}>
        <AppText
          preset="unifiedBody"
          style={styles.recentRecordTime}
          numberOfLines={1}
        >
          {createdTime || '기록 시각 없음'}
        </AppText>
        <MaterialCommunityIcons
          name="chevron-right"
          size={18}
          color="#7D8798"
        />
      </View>
      {showDivider ? <View style={styles.recentRecordDivider} /> : null}
    </TouchableOpacity>
  );
});

const EMPTY_RECORD_ITEMS: MemoryRecord[] = [];
Object.freeze(EMPTY_RECORD_ITEMS);
const EMPTY_SCHEDULE_ITEMS: PetSchedule[] = [];
Object.freeze(EMPTY_SCHEDULE_ITEMS);

const HOME_RECENT_RECORDS_MAX = 3;

/* ---------------------------------------------------------
 * 3) sub components (hooks-safe)
 * -------------------------------------------------------- */
const MonthlyDiaryCard = React.memo(function MonthlyDiaryCard({
  item,
  onPress,
}: {
  item: MemoryRecord;
  onPress: (memoryId: string) => void;
}) {
  const imageRef = getPrimaryMemoryImageRef(item);
  const contentTextStyle = useHomeContentTextStyle();
  const { signedUrl } = useSignedMemoryImage(imageRef);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={styles.monthDiaryCard}
      onPress={() => onPress(item.id)}
    >
      <View style={styles.monthDiaryCover}>
        {signedUrl ? (
          <Image source={{ uri: signedUrl }} style={styles.monthDiaryImage} />
        ) : (
          <View style={styles.monthDiaryFallback}>
            <Feather name="image" size={20} color="rgba(85,96,112,0.55)" />
          </View>
        )}
      </View>
      <AppText
        typographyRole="sectionTitle"
        preset="unifiedLabel"
        style={[styles.monthDiaryTitle, contentTextStyle]}
        numberOfLines={1}
      >
        {item.title?.trim() || '기록'}
      </AppText>
      <AppText
        preset="unifiedBody"
        style={styles.monthDiaryMeta}
        numberOfLines={1}
      >
        {getRecordYmdDots(item)}
      </AppText>
    </TouchableOpacity>
  );
});

const HomeWeatherSection = React.memo(function HomeWeatherSection({
  weather,
  locationLabel,
  petName,
  accentColor,
  season,
  hideSeasonalBackgroundImage = false,
  connectedToHero = false,
  onPress,
}: {
  weather: ReturnType<typeof useWeatherGuide>['bundle'];
  locationLabel: ReturnType<typeof useWeatherGuide>['locationLabel'];
  petName?: string | null;
  accentColor: string;
  season: SeasonalHomeVisual['season'] | null;
  hideSeasonalBackgroundImage?: boolean;
  connectedToHero?: boolean;
  onPress: () => void;
}) {
  const visualTheme = getSeasonalWeatherVisualTheme(season);
  const { fontScale } = useWindowDimensions();

  if (!visualTheme) {
    return (
      <View style={styles.weatherGuideWrap}>
        <WeatherGuideHomeCard
          weather={weather}
          locationLabel={locationLabel}
          petName={petName}
          accentColor={accentColor}
          onPress={onPress}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.seasonalWeatherSection,
        fontScale > 1 ? { marginTop: 0 } : null,
        connectedToHero ? styles.heroConnectedWeatherSection : null,
      ]}
      pointerEvents="box-none"
    >
      {!hideSeasonalBackgroundImage ? (
        <LinearGradient
          pointerEvents="none"
          colors={[...visualTheme.bottomFinishColors]}
          locations={[...visualTheme.bottomFinishLocations]}
          style={styles.weatherSectionBottomFinish}
        />
      ) : null}
      <WeatherGuideHomeCard
        weather={weather}
        locationLabel={locationLabel}
        petName={petName}
        accentColor={accentColor}
        visualTheme={visualTheme.card}
        hideSeasonalBackgroundImage={hideSeasonalBackgroundImage}
        onPress={onPress}
      />
    </View>
  );
});

const WeatherToLowerHomeBridge = React.memo(
  ({
    season,
    height,
    hidden = false,
  }: {
    season: SeasonalHomeVisual['season'] | null;
    height: number;
    hidden?: boolean;
  }) => {
    if (hidden) return null;

    const visualTheme = getSeasonalWeatherVisualTheme(season);
    if (!visualTheme) return null;

    const finishColors = visualTheme.bottomFinishColors;
    const weatherBottomColor = finishColors[finishColors.length - 1];
    const weatherGlowColor = finishColors[finishColors.length - 2];
    return (
      <View
        pointerEvents="none"
        accessible={false}
        style={styles.weatherToHomeBridgeHost}
      >
        <LinearGradient
          colors={[
            weatherBottomColor,
            weatherGlowColor,
            HOME_BASE_BACKGROUND_COLOR,
          ]}
          locations={[0, 0.18, 1]}
          style={[styles.weatherToHomeBridge, { height }]}
        />
      </View>
    );
  },
);



const HomeHeaderSection = React.memo(function HomeHeaderSection({
  season,
  petName,
  onPressNotifications,
  notificationUnreadCount,
  photoReady,
}: {
  season: SeasonalHomeVisual['season'] | null;
  petName: string;
  onPressNotifications: () => void;
  notificationUnreadCount: number;
  photoReady: boolean;
}) {
  const foreground = photoReady ? '#FFFFFF' : HOME_HERO_COLORS.ink;
  const isAutumn = season === 'autumn';
  const isWinter = season === 'winter';
  const isSpring = season === 'spring';
  const isSummer = season === 'summer';
  const notificationAccessibilityLabel =
    notificationUnreadCount > 0
      ? `알림 목록 열기, 읽지 않은 알림 ${notificationUnreadCount}개`
      : '알림 목록 열기';

  return (
    <View style={[
      styles.header,
      isAutumn || isWinter || isSpring || isSummer ? styles.seasonalHeader : null,
    ]}>
      <View style={styles.brandContentStack}>
        <AppText
          testID="home-hero-season-copy"
          preset="unifiedLabel"
          styleOverridesPreset
          numberOfLines={2}
          style={[styles.heroSeasonCopy, { color: foreground }]}
        >
          {getHomeHeroSeasonCopy(petName, season ?? 'autumn')}
        </AppText>
      </View>

      <View style={styles.notificationAnchor}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.headerIconBtn}
          onPress={onPressNotifications}
          accessibilityLabel={notificationAccessibilityLabel}
          accessibilityRole="button"
        >
          <NuriIcon
            testID="home-notification-icon"
            name="bell"
            size={26}
            color={foreground}
            colorMode="theme"
            variant="outline"
          />
          <HomeNotificationBadge count={notificationUnreadCount} />
        </TouchableOpacity>
      </View>

    </View>
  );
});


const HeroProfileAccordion = React.memo(function HeroProfileAccordion({
  petTheme,
  hobbies,
  likes,
  dislikes,
  tags,
  allExpanded,
  acc,
  onToggleAll,
  onToggleOne,
  season,
  seasonalOrnamentSheet,
  presentation = 'accordion',
}: {
  petTheme: ReturnType<typeof buildPetThemePalette>;
  hobbies: string[];
  likes: string[];
  dislikes: string[];
  tags: string[];
  allExpanded: boolean;
  acc: Record<ProfileAccordionKey, boolean>;
  onToggleAll: () => void;
  onToggleOne: (key: ProfileAccordionKey) => void;
  season: SeasonalHomeVisual['season'] | null;
  seasonalOrnamentSheet: ImageSourcePropType | null;
  presentation?: 'accordion' | 'sheet';
}) {
  const petName = usePetDisplayName();
  const isAutumn = season === 'autumn';
  const isWinter = season === 'winter';
  const isSpring = season === 'spring';
  const isSummer = season === 'summer';
  const natureSeason: SeasonalProfileSheetOrnamentSeason | null = isSpring
    ? 'spring'
    : isSummer
    ? 'summer'
    : null;

  if (presentation === 'sheet') {
    const profileRows = [
      {
        key: 'hobby',
        label: '취미',
        iconName: 'sparkles',
        iconStyle: styles.iconCircleBlue,
        titleStyle: styles.accTitleBlue,
        chipStyle: styles.profileSheetValueChipBlue,
        chipTextStyle: styles.profileSheetValueChipTextBlue,
        ornamentVariant: 'sprig',
        winterOrnamentVariant: 'snowflake',
        winterOrnamentSize: 26,
        natureOrnamentVariant: 'sparkle',
        natureOrnamentSize: 25,
        ornamentStyle: styles.profileSheetRowOrnamentHobby,
        description: '즐거워하는 활동이에요',
        values: hobbies,
        empty: '등록된 취미가 없어요',
      },
      {
        key: 'like',
        label: '좋아하는 것',
        iconName: 'heart',
        iconStyle: styles.iconCircleOrange,
        titleStyle: styles.accTitleOrange,
        chipStyle: styles.profileSheetValueChipOrange,
        chipTextStyle: styles.profileSheetValueChipTextOrange,
        ornamentVariant: 'berries',
        winterOrnamentVariant: 'berryBranch',
        winterOrnamentSize: 39,
        natureOrnamentVariant: 'primary',
        natureOrnamentSize: 36,
        ornamentStyle: styles.profileSheetRowOrnamentLike,
        description: '마음을 편하게 해주는 것들이에요',
        values: likes,
        empty: '등록된 좋아하는 것이 없어요',
      },
      {
        key: 'dislike',
        label: '싫어하는 것',
        iconName: 'broken-heart',
        iconStyle: styles.iconCirclePink,
        titleStyle: styles.accTitlePink,
        chipStyle: styles.profileSheetValueChipPink,
        chipTextStyle: styles.profileSheetValueChipTextPink,
        ornamentVariant: 'singleLeaf',
        winterOrnamentVariant: 'frostedTwig',
        winterOrnamentSize: 35,
        natureOrnamentVariant: 'secondary',
        natureOrnamentSize: 35,
        ornamentStyle: styles.profileSheetRowOrnamentDislike,
        description: '조금 불편해하는 것들이에요',
        values: dislikes,
        empty: '등록된 싫어하는 것이 없어요',
      },
      {
        key: 'tag',
        label: '#태그',
        iconName: 'tag',
        iconStyle: styles.iconCirclePurple,
        titleStyle: styles.accTitlePurple,
        chipStyle: styles.profileSheetValueChipPurple,
        chipTextStyle: styles.profileSheetValueChipTextPurple,
        ornamentVariant: 'ginkgo',
        winterOrnamentVariant: 'sparkle',
        winterOrnamentSize: 28,
        natureOrnamentVariant: 'branch',
        natureOrnamentSize: 34,
        ornamentStyle: styles.profileSheetRowOrnamentTag,
        description: formatPetCopy('우리 아이를 표현하는 특별한 키워드예요', petName),
        values: tags,
        empty: '등록된 태그가 없어요',
      },
    ] as const;

    return (
      <View style={styles.profileSheetRows}>
        {profileRows.map(row => {
          return (
            <View
              key={row.key}
              style={[
                styles.profileSheetRow,
                isWinter ? styles.winterProfileSheetRow : null,
                isSpring ? styles.springProfileSheetRow : null,
                isSummer ? styles.summerProfileSheetRow : null,
              ]}
            >
              <View style={[styles.profileSheetIconCircle, row.iconStyle]}>
                <NuriIcon name={row.iconName} size={16} />
              </View>
              <View style={styles.profileSheetRowContent}>
                <View style={styles.profileSheetCategoryLine}>
                  <AppText
                    style={[styles.profileSheetRowLabel, row.titleStyle]}
                  >
                    {row.label}
                  </AppText>
                  <AppText
                    style={[
                      styles.profileSheetRowDescription,
                      isWinter ? styles.winterProfileSheetRowDescription : null,
                      isSpring ? styles.springProfileSheetRowDescription : null,
                      isSummer ? styles.summerProfileSheetRowDescription : null,
                    ]}
                  >
                    {' · '}
                    {row.description}
                  </AppText>
                </View>
                {row.values.length > 0 ? (
                  <View style={styles.profileSheetValueWrap}>
                    {row.values.map((value, index) => (
                      <View
                        key={`${row.key}-${index}-${value}`}
                        style={[styles.profileSheetValueChip, row.chipStyle]}
                      >
                        <AppText
                          style={[
                            styles.profileSheetValueChipText,
                            row.chipTextStyle,
                          ]}
                        >
                          {value}
                        </AppText>
                      </View>
                    ))}
                  </View>
                ) : (
                  <AppText
                    style={[
                      styles.profileSheetEmptyValue,
                      isWinter ? styles.winterProfileSheetEmptyValue : null,
                      isSpring ? styles.springProfileSheetEmptyValue : null,
                      isSummer ? styles.summerProfileSheetEmptyValue : null,
                    ]}
                  >
                    {row.empty}
                  </AppText>
                )}
              </View>
              {seasonalOrnamentSheet || natureSeason ? (
                <View
                  pointerEvents="none"
                  accessible={false}
                  style={[styles.profileSheetRowOrnament, row.ornamentStyle]}
                >
                  {isWinter ? (
                    <WinterOrnament
                      variant={
                        row.winterOrnamentVariant as WinterOrnamentVariant
                      }
                      size={row.winterOrnamentSize}
                    />
                  ) : natureSeason ? (
                    <SeasonalProfileSheetOrnament
                      season={natureSeason}
                      variant={
                        row.natureOrnamentVariant as SeasonalProfileSheetOrnamentVariant
                      }
                      size={row.natureOrnamentSize}
                    />
                  ) : seasonalOrnamentSheet ? (
                    <AutumnLeafOrnament
                      source={seasonalOrnamentSheet}
                      variant={row.ornamentVariant}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.accordionWrap,
        isAutumn ? styles.autumnAccordionWrap : null,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.accordionAllRow,
          isAutumn ? styles.autumnAccordionAllRow : null,
        ]}
        onPress={onToggleAll}
      >
        <AppText
          preset="unifiedLabel"
          style={[styles.accordionAllLabel, { color: petTheme.primary }]}
        >
          모두펼치기
        </AppText>
        <Feather
          name={allExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={petTheme.primary}
        />
      </TouchableOpacity>

      <View
        style={[
          styles.accordionItem,
          isAutumn ? styles.autumnAccordionItem : null,
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.accordionHeaderRow}
          onPress={() => onToggleOne('hobby')}
        >
          <View style={styles.accordionLeft}>
            <View style={[styles.accordionIconCircle, styles.iconCircleBlue]}>
              <NuriIcon name="sparkles" size={16} />
            </View>
            <AppText
              typographyRole="sectionTitle"
              preset="unifiedLabel"
              style={[styles.accordionTitle, styles.accTitleBlue]}
            >
              취미
            </AppText>
          </View>
          <Feather
            name={acc.hobby ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={petTheme.primary}
          />
        </TouchableOpacity>

        {acc.hobby ? (
          <View style={styles.accordionBody}>
            {hobbies.length > 0 ? (
              hobbies.map(v => (
                <AppText
                  preset="unifiedLabel"
                  key={v}
                  style={styles.accordionBullet}
                >
                  • {v}
                </AppText>
              ))
            ) : (
              <AppText preset="unifiedLabel" style={styles.accordionEmpty}>
                • 아직 없어요
              </AppText>
            )}
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.accordionItem,
          isAutumn ? styles.autumnAccordionItem : null,
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.accordionHeaderRow}
          onPress={() => onToggleOne('like')}
        >
          <View style={styles.accordionLeft}>
            <View style={[styles.accordionIconCircle, styles.iconCircleOrange]}>
              <NuriIcon name="heart" size={16} />
            </View>
            <AppText
              typographyRole="sectionTitle"
              preset="unifiedLabel"
              style={[styles.accordionTitle, styles.accTitleOrange]}
            >
              좋아하는 것
            </AppText>
          </View>
          <Feather
            name={acc.like ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={petTheme.primary}
          />
        </TouchableOpacity>

        {acc.like ? (
          <View style={styles.accordionBody}>
            {likes.length > 0 ? (
              likes.map(v => (
                <AppText
                  preset="unifiedLabel"
                  key={v}
                  style={styles.accordionBullet}
                >
                  • {v}
                </AppText>
              ))
            ) : (
              <AppText preset="unifiedLabel" style={styles.accordionEmpty}>
                • 아직 없어요
              </AppText>
            )}
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.accordionItem,
          isAutumn ? styles.autumnAccordionItem : null,
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.accordionHeaderRow}
          onPress={() => onToggleOne('dislike')}
        >
          <View style={styles.accordionLeft}>
            <View style={[styles.accordionIconCircle, styles.iconCirclePink]}>
              <NuriIcon name="broken-heart" size={16} />
            </View>
            <AppText
              typographyRole="sectionTitle"
              preset="unifiedLabel"
              style={[styles.accordionTitle, styles.accTitlePink]}
            >
              싫어하는 것
            </AppText>
          </View>
          <Feather
            name={acc.dislike ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={petTheme.primary}
          />
        </TouchableOpacity>

        {acc.dislike ? (
          <View style={styles.accordionBody}>
            {dislikes.length > 0 ? (
              dislikes.map(v => (
                <AppText
                  preset="unifiedLabel"
                  key={v}
                  style={styles.accordionBullet}
                >
                  • {v}
                </AppText>
              ))
            ) : (
              <AppText preset="unifiedLabel" style={styles.accordionEmpty}>
                • 아직 없어요
              </AppText>
            )}
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.accordionItem,
          isAutumn ? styles.autumnAccordionItem : null,
          { borderBottomWidth: 0 },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.accordionHeaderRow}
          onPress={() => onToggleOne('tag')}
        >
          <View style={styles.accordionLeft}>
            <View style={[styles.accordionIconCircle, styles.iconCirclePurple]}>
              <Feather name="hash" size={16} color={petTheme.primary} />
            </View>
            <AppText
              typographyRole="sectionTitle"
              preset="unifiedLabel"
              style={[styles.accordionTitle, styles.accTitlePurple]}
            >
              #태그
            </AppText>
          </View>
          <Feather
            name={acc.tag ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={petTheme.primary}
          />
        </TouchableOpacity>

        {acc.tag ? (
          <View style={styles.accordionBody}>
            <View style={styles.tagsRow}>
              {tags.map(t => (
                <View
                  key={t}
                  style={[
                    styles.tagChip,
                    {
                      borderColor: petTheme.border,
                      backgroundColor: petTheme.tint,
                    },
                  ]}
                >
                  <AppText
                    preset="unifiedLabel"
                    style={[styles.tagText, { color: petTheme.deep }]}
                  >
                    {t}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
});

const ProfileInfoBottomSheet = React.memo(function ProfileInfoBottomSheet({
  petId,
  visible,
  profilePetName,
  basicInfo,
  hobbies,
  likes,
  dislikes,
  tags,
  season,
  seasonalOrnamentSheet,
  profileSheetBackground,
  onCloseComplete,
}: {
  petId: string | null;
  visible: boolean;
  profilePetName: string;
  basicInfo: HomePetBasicInfoValues;
  hobbies: string[];
  likes: string[];
  dislikes: string[];
  tags: string[];
  season: SeasonalHomeVisual['season'] | null;
  seasonalOrnamentSheet: ImageSourcePropType | null;
  profileSheetBackground: ImageSourcePropType | null;
  onCloseComplete: () => void;
}) {
  const isWinter = season === 'winter';
  const isSpring = season === 'spring';
  const isSummer = season === 'summer';
  const isNatureSeason = isSpring || isSummer;
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const contentHorizontalInset = windowWidth <= 360 ? 18 : 20;
  const translateY = useRef(new RNAnimated.Value(windowHeight)).current;
  const backdropOpacity = useRef(new RNAnimated.Value(0)).current;
  const closingRef = useRef(false);

  useEffect(() => {
    if (!visible) return;

    closingRef.current = false;
    translateY.setValue(windowHeight);
    backdropOpacity.setValue(0);
    RNAnimated.parallel([
      RNAnimated.timing(translateY, {
        toValue: 0,
        duration: 320,
        easing: RNEasing.out(RNEasing.cubic),
        useNativeDriver: true,
      }),
      RNAnimated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        easing: RNEasing.out(RNEasing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, translateY, visible, windowHeight]);

  const requestClose = useCallback(() => {
    if (!visible || closingRef.current) return;

    closingRef.current = true;
    RNAnimated.parallel([
      RNAnimated.timing(translateY, {
        toValue: windowHeight,
        duration: 270,
        easing: RNEasing.in(RNEasing.cubic),
        useNativeDriver: true,
      }),
      RNAnimated.timing(backdropOpacity, {
        toValue: 0,
        duration: 240,
        easing: RNEasing.in(RNEasing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onCloseComplete();
    });
  }, [backdropOpacity, onCloseComplete, translateY, visible, windowHeight]);

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={() => requestClose()}
    >
      <View style={styles.profileSheetRoot}>
        <Pressable
          accessibilityLabel="프로필 상세 바깥 영역 닫기"
          accessibilityRole="button"
          style={styles.profileSheetBackdropPressable}
          onPress={() => requestClose()}
        >
          <RNAnimated.View
            style={[styles.profileSheetBackdrop, { opacity: backdropOpacity }]}
          />
        </Pressable>

        <RNAnimated.View
          accessibilityViewIsModal
          style={[
            styles.profileSheet,
            isWinter ? styles.winterProfileSheet : null,
            isSpring ? styles.springProfileSheet : null,
            isSummer ? styles.summerProfileSheet : null,
            { transform: [{ translateY }] },
          ]}
        >
          <View
            pointerEvents="none"
            accessible={false}
            style={styles.profileSheetBackgroundLayer}
          >
            {isNatureSeason && profileSheetBackground ? (
              <>
                <LinearGradient
                  colors={
                    isSpring
                      ? ['#F7FBFF', '#FCFDFF', '#F7FBF2']
                      : ['#F4FBFF', '#FAFDFF', '#F5FBEF']
                  }
                  locations={[0, 0.58, 1]}
                  style={styles.profileSheetBackgroundBase}
                />
                <Image
                  source={profileSheetBackground}
                  resizeMode="stretch"
                  style={styles.winterProfileSheetBackground}
                />
              </>
            ) : isWinter && profileSheetBackground ? (
              <>
                <LinearGradient
                  colors={['#F8FBFF', '#F4F8FF', '#EDF4FF']}
                  locations={[0, 0.58, 1]}
                  style={styles.profileSheetBackgroundBase}
                />
                <Image
                  source={profileSheetBackground}
                  resizeMode="stretch"
                  style={styles.winterProfileSheetBackground}
                />
              </>
            ) : (
              <>
                <LinearGradient
                  colors={['#FFFDF8', '#FFF9F1', '#FFF4E6']}
                  locations={[0, 0.58, 1]}
                  style={styles.profileSheetBackgroundBase}
                />
                <Image
                  source={AUTUMN_PROFILE_SHEET_BOTTOM_WAVE}
                  resizeMode="stretch"
                  style={styles.profileSheetBottomWave}
                />
              </>
            )}
          </View>
          {seasonalOrnamentSheet ? (
            <View
              pointerEvents="none"
              accessible={false}
              style={styles.profileSheetFrameOrnaments}
            >
              {isWinter ? (
                <>
                  <WinterOrnament
                    variant="snowflake"
                    size={42}
                    style={styles.profileSheetOrnamentLeft}
                  />
                  <WinterOrnament
                    variant="sparkle"
                    size={28}
                    style={styles.profileSheetOrnamentLeftTrail}
                  />
                  <WinterOrnament
                    variant="berrySprig"
                    size={48}
                    style={styles.profileSheetFallingLeafRightUpper}
                  />
                  <WinterOrnament
                    variant="pineSprig"
                    size={64}
                    style={styles.profileSheetFallingLeafLeftMiddle}
                  />
                  <WinterOrnament
                    variant="frostedTwig"
                    size={54}
                    style={styles.profileSheetFallingLeafRightLower}
                  />
                </>
              ) : (
                <>
                  <View style={styles.profileSheetOrnamentLeft}>
                    <AutumnLeafOrnament source={seasonalOrnamentSheet} />
                  </View>
                  <View style={styles.profileSheetOrnamentLeftTrail}>
                    <AutumnLeafOrnament
                      source={seasonalOrnamentSheet}
                      variant="singleLeaf"
                    />
                  </View>
                  <View style={styles.profileSheetOrnamentRight}>
                    <AutumnLeafOrnament
                      source={seasonalOrnamentSheet}
                      variant="ginkgo"
                    />
                  </View>
                  <View style={styles.profileSheetOrnamentRightTrail}>
                    <AutumnLeafOrnament
                      source={seasonalOrnamentSheet}
                      variant="berries"
                    />
                  </View>
                  <View style={styles.profileSheetFallingLeafLeftUpper}>
                    <AutumnLeafOrnament
                      source={seasonalOrnamentSheet}
                      variant="singleLeaf"
                    />
                  </View>
                  <View style={styles.profileSheetFallingLeafRightUpper}>
                    <AutumnLeafOrnament
                      source={seasonalOrnamentSheet}
                      variant="berries"
                    />
                  </View>
                  <View style={styles.profileSheetFallingLeafLeftMiddle}>
                    <AutumnLeafOrnament
                      source={seasonalOrnamentSheet}
                      variant="ginkgo"
                    />
                  </View>
                  <View style={styles.profileSheetFallingLeafRightMiddle}>
                    <AutumnLeafOrnament
                      source={seasonalOrnamentSheet}
                      variant="sprig"
                    />
                  </View>
                  <View style={styles.profileSheetFallingLeafLeftLower}>
                    <AutumnLeafOrnament source={seasonalOrnamentSheet} />
                  </View>
                  <View style={styles.profileSheetFallingLeafRightLower}>
                    <AutumnLeafOrnament
                      source={seasonalOrnamentSheet}
                      variant="singleLeaf"
                    />
                  </View>
                </>
              )}
            </View>
          ) : null}
          <View
            style={[
              styles.profileSheetHandle,
              isWinter ? styles.winterProfileSheetHandle : null,
              isSpring ? styles.springProfileSheetHandle : null,
              isSummer ? styles.summerProfileSheetHandle : null,
            ]}
          />
          <View style={{ marginHorizontal: contentHorizontalInset }}>
            <HomePetSheetHeader
              title={`${profilePetName}의 소개와 취향`}
              titleColor={
                isWinter ? styles.winterProfileSheetTitle.color
                  : isSpring ? styles.springProfileSheetTitle.color
                  : isSummer ? styles.summerProfileSheetTitle.color
                  : styles.profileSheetTitle.color
              }
              closeLabel="프로필 상세 닫기"
              onClose={() => requestClose()}
            />
          </View>

          <ScrollView
            style={styles.profileSheetScroll}
            contentContainerStyle={[
              styles.profileSheetScrollContent,
              { paddingHorizontal: contentHorizontalInset },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <HomePetBasicInfoSection info={basicInfo} season={season} />
            {visible && <WalkProgressionRow petId={petId} enabled={visible} expanded />}
            <HeroProfileAccordion
              petTheme={NEUTRAL_UI_PALETTE}
              hobbies={hobbies}
              likes={likes}
              dislikes={dislikes}
              tags={tags}
              allExpanded
              acc={{ hobby: true, like: true, dislike: true, tag: true }}
              onToggleAll={() => {}}
              onToggleOne={() => {}}
              season={season}
              seasonalOrnamentSheet={seasonalOrnamentSheet}
              presentation="sheet"
            />
            <View
              style={[
                styles.profileSheetFooter,
                { paddingBottom: Math.max(24, insets.bottom + 16) },
              ]}
            >
              <AppText
                style={[
                  styles.profileSheetFooterCopy,
                  isWinter ? styles.winterProfileSheetFooterCopy : null,
                  isSpring ? styles.springProfileSheetFooterCopy : null,
                  isSummer ? styles.summerProfileSheetFooterCopy : null,
                ]}
              >
                {formatPetCopy('언제나 우리 아이와 함께 ♡', profilePetName)}
              </AppText>
            </View>
          </ScrollView>
        </RNAnimated.View>
      </View>
    </Modal>
  );
});


const RecommendationTipsSection = React.memo(
  function RecommendationTipsSection({
    guides,
    loading,
    error,
    isMemorial,
    source,
    sourceReason,
    petTheme,
    onPressGuide,
    onPressMore,
  }: {
    guides: PetCareGuide[];
    loading: boolean;
    error: string | null;
    isMemorial: boolean;
    source: 'remote' | 'local-seed' | 'remote-empty';
    sourceReason: 'published' | 'empty-success' | 'remote-error';
    petTheme: ReturnType<typeof buildPetThemePalette>;
    onPressGuide: (guideId: string) => void;
    onPressMore: () => void;
  }) {
    const petName = usePetDisplayName();
    const contentTextStyle = useHomeContentTextStyle();

    return (
      <HomeSectionGlass
        testID="home-glass-recommendation-tips"
        style={styles.section}
      >
        <HomeSectionHeader
          title={isMemorial ? '함께한 시간을 돌아보는 홈' : formatPetCopy('우리 아이를 위한', petName)}
          color={petTheme.deep}
          emphasis={
            isMemorial
              ? undefined
              : { title: '추천 팁', color: petTheme.primary }
          }
          description={
            isMemorial
              ? undefined
              : '아이의 건강한 하루를 위한\n맞춤형 팁을 확인해보세요.'
          }
          action={
            isMemorial
              ? undefined
              : {
                  onPress: onPressMore,
                  accessibilityLabel: '추천 팁 전체 보기',
                }
          }
        />

        {isMemorial ? (
          <View style={styles.emptyBox}>
            <AppText
              typographyRole="celebration"
              preset="unifiedTitle"
              style={[styles.emptyTitle, contentTextStyle]}
            >
              케어 추천은 잠시 쉬어둘게요
            </AppText>
            <AppText preset="unifiedBody" style={styles.emptyDesc}>
              함께한 시간을 조용히 돌아볼 수 있도록, 일반 케어 팁 대신 기록과
              추억을 중심으로 홈을 보여드릴게요.
            </AppText>
          </View>
        ) : loading ? (
          <View style={styles.emptyBox}>
            <AppText
              typographyRole="celebration"
              preset="unifiedTitle"
              style={[styles.emptyTitle, contentTextStyle]}
            >
              추천 팁을 불러오는 중이에요
            </AppText>
            <AppText preset="unifiedBody" style={styles.emptyDesc}>
              {formatPetCopy('우리 아이 기준으로 먼저 보여드릴 가이드를 정리하고 있어요.', petName)}
            </AppText>
          </View>
        ) : error ? (
          <View style={styles.emptyBox}>
            <AppText
              typographyRole="celebration"
              preset="unifiedTitle"
              style={[styles.emptyTitle, contentTextStyle]}
            >
              추천 팁을 불러오지 못했어요
            </AppText>
            <AppText preset="unifiedBody" style={styles.emptyDesc}>
              {error}
            </AppText>
          </View>
        ) : guides.length === 0 ? (
          <View style={styles.emptyBox}>
            <AppText
              typographyRole="celebration"
              preset="unifiedTitle"
              style={[styles.emptyTitle, contentTextStyle]}
            >
              추천 가능한 공개 가이드가 아직 없어요
            </AppText>
            <AppText preset="unifiedBody" style={styles.emptyDesc}>
              {getGuideDataSourceDescription({
                source,
                reason: sourceReason,
              })}
            </AppText>
          </View>
        ) : (
          <View style={styles.tipList}>
            {guides.map(guide => (
              <GuideRecommendationCard
                key={guide.id}
                guide={guide}
                accentColor={NEUTRAL_UI_PALETTE.primary}
                accentDeepColor={petTheme.deep}
                tintColor={petTheme.tint}
                onPress={onPressGuide}
                debugBadgeText={
                  __DEV__ &&
                  source === 'local-seed' &&
                  isLocalGuideSeedGuide(guide)
                    ? '테스트 seed'
                    : null
                }
              />
            ))}
          </View>
        )}
      </HomeSectionGlass>
    );
  },
);

const TodayRecordsSection = React.memo(function TodayRecordsSection({
  recordItems,
  recordStatus,
  onPressTimeline,
  onPressRecord,
  onPressRecordItem,
  accentDeepColor,
  season,
}: {
  recordItems: MemoryRecord[];
  recordStatus:
    | 'idle'
    | 'loading'
    | 'ready'
    | 'refreshing'
    | 'loadingMore'
    | 'error';
  onPressTimeline: () => void;
  onPressRecord: () => void;
  onPressRecordItem: (memoryId: string) => void;
  accentDeepColor: string;
  season: SeasonKey;
}) {
  const todayRecords = useMemo(() => recordItems, [recordItems]);
  const previewItems = useMemo(
    () => buildHomeRecentPreviewItems(todayRecords),
    [todayRecords],
  );
  return (
    <HomeSectionGlass
      testID="home-glass-recent-records"
      style={[styles.section, styles.recentSection]}
    >
      <HomeSectionHeader
        title="최근 기록"
        color={accentDeepColor}
        hideAction={isHomeSectionConfirmedEmpty(
          recordStatus === 'ready',
          previewItems.length,
        )}
        action={{
          onPress: onPressTimeline,
          accessibilityLabel: '최근 기록 전체 보기',
        }}
      />
      {previewItems.length === 0 ? (
        <RecentRecordsEmptyState
          season={season}
          dataState={getRecentEmptyDataState(recordStatus)}
          accentColor={accentDeepColor}
          onPressRecord={onPressRecord}
        />
      ) : (
        <View style={styles.recentPreviewWrap}>
          <View style={styles.recentPreviewList}>
            {previewItems.map((previewItem, index) => (
              <HomeRecentRecordRow
                key={previewItem.record.id}
                item={previewItem.record}
                showDivider={index < previewItems.length - 1}
                onPress={record => onPressRecordItem(record.id)}
              />
            ))}
          </View>
        </View>
      )}
    </HomeSectionGlass>
  );
});

const ScheduleSection = React.memo(function ScheduleSection({
  petId,
  scheduleItems,
  isFocused,
  dataState,
  season,
  activeScheduleIds,
  onPressScheduleList,
  onPressScheduleDetail,
  accentColor,
  accentDeepColor,
}: {
  petId: string | null;
  scheduleItems: PetSchedule[];
  isFocused: boolean;
  dataState: HomeEmptyDataState;
  season: SeasonKey;
  activeScheduleIds: ReadonlySet<string>;
  onPressScheduleList: () => void;
  onPressScheduleDetail: (id: string) => void;
  accentColor: string;
  accentDeepColor: string;
}) {
  if (!petId) return null;
  return (
    <HomeScheduleCalendar
      petId={petId}
      items={scheduleItems}
      dataState={dataState}
      season={season}
      isFocused={isFocused}
      activeScheduleIds={activeScheduleIds}
      onPressAll={onPressScheduleList}
      onPressDetail={onPressScheduleDetail}
      accentColor={accentColor}
      accentDeepColor={accentDeepColor}
    />
  );
});

const HealthRecentActivitiesSection = React.memo(
  function HealthRecentActivitiesSection({
    activityItems,
    isReady,
    dataState,
    season,
    onPressHealthReport,
    onPressActivityItem,
    accentColor,
    accentDeepColor,
  }: {
    activityItems: HealthActivityItem[];
    isReady: boolean;
    dataState: HomeEmptyDataState;
    season: SeasonKey;
    onPressHealthReport: () => void;
    onPressActivityItem: (ymd: string) => void;
    accentColor: string;
    accentDeepColor: string;
  }) {
    const visualQa = useHealthVisualQa();
    const recentActivities = useMemo(
      () => {
        const samples = visualQa.data?.activityItems;
        return samples
          ? [4, 7, 9, 12, 17].map(index => samples[index])
          : activityItems.slice(0, 5);
      },
      [activityItems, visualQa.data],
    );

    return (
      <HomeSectionGlass testID="home-glass-health" style={styles.section}>
        {visualQa.enabled ? (
          <AppText preset="caption" color="#475569">QA 샘플 · 읽기 전용</AppText>
        ) : null}
        <HomeSectionHeader
          title="건강관리 최근 활동"
          color={accentDeepColor}
          hideAction={isHomeSectionConfirmedEmpty(
            isReady,
            recentActivities.length,
          )}
          action={{
            onPress: onPressHealthReport,
            accessibilityLabel: '건강관리 전체 보기',
          }}
        />

        {recentActivities.length === 0 ? (
          <HomeEmptySectionState
            kind="health"
            season={season}
            dataState={dataState}
            accentDeepColor={accentDeepColor}
            onPressAction={onPressHealthReport}
          />
        ) : (
          <HomeHealthActivityList
            items={recentActivities}
            accentColor={accentColor}
            onPress={onPressActivityItem}
          />
        )}
      </HomeSectionGlass>
    );
  },
);

const MonthlyDiarySection = React.memo(function MonthlyDiarySection({
  petName,
  recordItems,
  recordStatus,
  season,
  onPressTimelineCategory,
  onPressRecord,
  onPressRecordItem,
  accentDeepColor,
}: {
  petName: string;
  recordItems: MemoryRecord[];
  recordStatus: PetRecordsState['status'];
  season: SeasonKey;
  onPressTimelineCategory: (
    mainCategory: Exclude<TimelineMainCategory, undefined>,
    otherSubCategory?: Exclude<TimelineOtherSubCategory, undefined>,
  ) => void;
  onPressRecord: () => void;
  onPressRecordItem: (memoryId: string) => void;
  accentDeepColor: string;
}) {
  const currentMonthDiaryEntries = useMemo(() => {
    const currentMonthKey = getMonthKeyInKst(new Date());

    return recordItems
      .filter(item => {
        if (normalizeCategoryKey(readRecordCategoryRaw(item)) !== 'diary') {
          return false;
        }
        return (
          getMonthKeyFromYmd(getRecordDisplayYmd(item)) === currentMonthKey
        );
      })
      .slice(0, 7);
  }, [recordItems]);

  return (
    <HomeSectionGlass testID="home-glass-monthly-diary" style={styles.section}>
      <HomeSectionHeader
        title={`이번 달 ${petName} 일기`}
        color={accentDeepColor}
        hideAction={isHomeSectionConfirmedEmpty(
          recordStatus === 'ready',
          currentMonthDiaryEntries.length,
        )}
        action={{
          onPress: () => onPressTimelineCategory('diary'),
          accessibilityLabel: '이번 달 일기 전체 보기',
        }}
      />

      {currentMonthDiaryEntries.length === 0 ? (
        <MonthlyDiaryEmptyState
          season={season}
          recordStatus={recordStatus}
          accentDeepColor={accentDeepColor}
          onPressRecord={onPressRecord}
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthDiaryList}
        >
          {currentMonthDiaryEntries.map(item => (
            <MonthlyDiaryCard
              key={item.id}
              item={item}
              onPress={onPressRecordItem}
            />
          ))}
        </ScrollView>
      )}
    </HomeSectionGlass>
  );
});

export default function LoggedInHome() {
  // ---------------------------------------------------------
  // 0) navigation
  // ---------------------------------------------------------
  const insets = useSafeAreaInsets();
  const fallbackTabBarHeight = useBottomTabBarHeight();
  const bottomTabBarHeight = useContext(ToolbarHeightContext) ?? fallbackTabBarHeight;
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [heroFrameWidth, setHeroFrameWidth] = useState(windowWidth);
  const { season: ambientSeason } =
    useSeasonPreference();
  const heroColors = getHomeHeroColors(ambientSeason);
  // Seasonal content stays independent of the fixed, viewport-sized sky canvas.
  const seasonalHomeVisual = useMemo(
    () => getSeasonalHomeVisual(HOME_FOREGROUND_UI_SEASON),
    [],
  );
  const profileSheetVisual = useMemo(
    () => getSeasonalHomeVisual(ambientSeason),
    [ambientSeason],
  );
  const navigation = useNavigation<Nav>();
  const isScreenFocused = useIsFocused();
  const homeScrollRef = useRef<React.ComponentRef<typeof ScrollView> | null>(
    null,
  );
  const shouldRestoreHomeScrollRef = useRef(true);
  useScrollToTop(homeScrollRef);

  // ---------------------------------------------------------
  // 1) auth
  // ---------------------------------------------------------
  const sessionUserId = useAuthStore(s => s.session?.user.id ?? null);
  const notificationUnread = useNotificationUnreadCount();
  const refetchNotificationUnread = notificationUnread.refetch;

  // ---------------------------------------------------------
  // 1.5) notifications
  // ---------------------------------------------------------
  const [profileSheetVisible, setProfileSheetVisible] = useState(false);
  const [petSelectionOwnerId, setPetSelectionOwnerId] = useState<string | null>(null);
  const [homeViewportHeight, setHomeViewportHeight] = useState(0);
  const [ambientSectionLayouts, setAmbientSectionLayouts] =
    useState<HomeAmbientSectionLayouts>({});
  const [ambientContentY, setAmbientContentY] = useState(0);
  const [ambientLowerY, setAmbientLowerY] = useState(0);
  const seasonalHeroViewportHeight = Math.max(
    0,
    homeViewportHeight - bottomTabBarHeight,
  );


  useEffect(() => {
    if (!isScreenFocused) return;
    refetchNotificationUnread().catch(()=>{});
  }, [isScreenFocused, refetchNotificationUnread]);

  const openHomeNotifications = useCallback(() => {
    navigation.navigate('HomeQuickNotifications');
  }, [navigation]);


  const openProfileInfoSheet = useCallback(() => {
    setPetSelectionOwnerId(null);
    setProfileSheetVisible(true);
  }, []);

  const closeProfileInfoSheet = useCallback(() => {
    setProfileSheetVisible(false);
  }, []);







  // ---------------------------------------------------------
  // 2) pets
  // ---------------------------------------------------------
  const pets = usePetStore(s => s.pets);
  const activeAlarms = useActiveScheduleAlarms(
    sessionUserId,
    pets,
    isScreenFocused,
  );
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const petLoading = usePetStore(s => s.loading);
  const selectPet = usePetStore(s => s.selectPet);

  // ---------------------------------------------------------
  // 3) derived
  // ---------------------------------------------------------
  const selectedPet = useMemo(() => {
    if (pets.length === 0) return null;
    if (!selectedPetId) return pets[0];
    return pets.find(p => p.id === selectedPetId) ?? pets[0];
  }, [pets, selectedPetId]);
  const hasPets = pets.length > 0;

  const activePetId = selectedPet?.id ?? null;
  const walkMemoryRevision = useQuery<number>({ queryKey: ['walk', sessionUserId, activePetId, 'memory-revision'], queryFn: () => 0, enabled: false }).data ?? 0;
  const [homeTitleBadge, setHomeTitleBadge] = useState<(HomeTitleBadgeIdentity & { petId: string; ownerId: string }) | null>(null);
  const activeHomeTitleBadge = homeTitleBadge?.petId === activePetId && homeTitleBadge?.ownerId === sessionUserId ? homeTitleBadge : null;
  const homeScrollStorageKey = useMemo(
    () => activePetId ?? 'logged-in-home-default',
    [activePetId],
  );
  const initialHomeScrollOffset = useMemo(
    () => HOME_SCROLL_OFFSET_BY_KEY.get(homeScrollStorageKey) ?? 0,
    [homeScrollStorageKey],
  );

  // ---------------------------------------------------------
  // 3.5) pet switch presentation follows the committed selection
  // ---------------------------------------------------------
  const selectedAvatarUri = useMemo(
    () => selectedPet?.avatarUrl?.trim() || null,
    [selectedPet?.avatarUrl],
  );
  const petSwitchTransition = useHomePetSwitchTransition(activePetId, isScreenFocused, selectedAvatarUri);
  const [heroPhotoStatus, setHeroPhotoStatus] = useState<HomeHeroPhotoStatus>({ uri: null, status: 'missing' });
  const handleHeroPhotoStatusChange = useCallback((next: HomeHeroPhotoStatus) => {
    setHeroPhotoStatus(previous => previous.uri === next.uri && previous.status === next.status ? previous : next);
  }, []);
  const heroPhotoReady = !!selectedAvatarUri && heroPhotoStatus.uri === selectedAvatarUri && heroPhotoStatus.status === 'ready';
  const [deferredHomeDataReady, setDeferredHomeDataReady] = useState(false);

  // ---------------------------------------------------------
  // 4) records
  // ---------------------------------------------------------
  const bootstrapRecords = useRecordStore(s => s.bootstrap);
  const refreshRecords = useRecordStore(s => s.refresh);
  const restoreCachedRecords = useRecordStore(s => s.restoreFromCache);
  const bootstrapSchedules = useScheduleStore(s => s.bootstrap);
  const restoreCachedSchedules = useScheduleStore(s => s.restoreFromCache);

  const recordItems = useRecordStore(s =>
    activePetId
      ? s.byPetId[activePetId]?.items ?? EMPTY_RECORD_ITEMS
      : EMPTY_RECORD_ITEMS,
  );
  const recordStatus = useRecordStore(s =>
    activePetId ? s.byPetId[activePetId]?.status ?? 'idle' : 'idle',
  );
  const [totalSummaryState, setTotalSummaryState] = useState<TotalSummaryState>(
    () => createTotalSummaryState(),
  );
  const totalSummaryRequestIdRef = useRef(0);
  const timelineEntryRequestIdRef = useRef(0);
  const recordStatusRef = useRef(recordStatus);
  recordStatusRef.current = recordStatus;
  const scheduleItems = useScheduleStore(s =>
    activePetId
      ? s.byPetId[activePetId]?.items ?? EMPTY_SCHEDULE_ITEMS
      : EMPTY_SCHEDULE_ITEMS,
  );
  const scheduleStatus = useScheduleStore(s =>
    activePetId ? s.byPetId[activePetId]?.status ?? 'idle' : 'idle',
  );
  const visibleScheduleItems = useMemo(
    () => scheduleItems.filter(schedule => !isHealthSchedule(schedule)),
    [scheduleItems],
  );

  useEffect(() => {
    if (!activePetId) {
      const requestId = ++totalSummaryRequestIdRef.current;
      setTotalSummaryState(() => ({
        ...createTotalSummaryState(),
        requestId,
      }));
      return undefined;
    }

    if (!isScreenFocused) {
      return undefined;
    }

    const requestId = ++totalSummaryRequestIdRef.current;
    let cancelled = false;
    setTotalSummaryState(previous =>
      startTotalSummaryLoad(previous, activePetId, requestId),
    );

    fetchMemorySummaryRecordsByPet(activePetId)
      .then(records => {
        if (cancelled) return;
        setTotalSummaryState(previous =>
          completeTotalSummaryLoad(previous, {
            petId: activePetId,
            requestId,
            records,
          }),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setTotalSummaryState(previous =>
          failTotalSummaryLoad(previous, {
            petId: activePetId,
            requestId,
          }),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [activePetId, isScreenFocused, sessionUserId, walkMemoryRevision]);
  const healthActivityItems = useMemo(
    () => buildHealthActivityItems(recordItems, scheduleItems),
    [recordItems, scheduleItems],
  );

  useEffect(() => {
    if (!activePetId) return;
    const task = scheduleIdleTask(() => {
      bootstrapRecords(activePetId).catch(() => {});
    });
    return () => {
      task.cancel();
    };
  }, [bootstrapRecords, activePetId]);

  useEffect(() => {
    if (!isScreenFocused || !activePetId) return;
    if (recordStatusRef.current !== 'ready') return;

    const task = scheduleIdleTask(() => {
      refreshRecords(activePetId).catch(() => {});
    });

    return () => {
      task.cancel();
    };
  }, [activePetId, isScreenFocused, refreshRecords]);

  useEffect(() => {
    if (!activePetId) return;
    const task = scheduleIdleTask(() => {
      bootstrapSchedules(activePetId).catch(() => {});
    });
    return () => {
      task.cancel();
    };
  }, [activePetId, bootstrapSchedules]);

  useEffect(() => {
    if (!activePetId || !sessionUserId) return;
    let cancelled = false;

    loadHomeRecordScheduleCache({
      userId: sessionUserId,
      petId: activePetId,
    })
      .then(cache => {
        if (cancelled || !cache) return;

        restoreCachedRecords(activePetId, cache.records);
        restoreCachedSchedules(activePetId, cache.schedules);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [activePetId, restoreCachedRecords, restoreCachedSchedules, sessionUserId]);

  useEffect(() => {
    if (!activePetId || !sessionUserId) return;
    if (recordStatus !== 'ready' || scheduleStatus !== 'ready') return;
    saveHomeRecordScheduleCache({
      userId: sessionUserId,
      petId: activePetId,
      records: recordItems,
      schedules: scheduleItems,
    }).catch(() => {});
  }, [
    activePetId,
    recordItems,
    recordStatus,
    scheduleItems,
    scheduleStatus,
    sessionUserId,
  ]);

  useEffect(() => {
    if (!isScreenFocused) {
      setDeferredHomeDataReady(false);
      return undefined;
    }

    const task = scheduleIdleTask(() => {
      setDeferredHomeDataReady(true);
    });

    return () => {
      task.cancel();
    };
  }, [isScreenFocused]);

  useEffect(() => {
    let cancelled = false;

    if (!isScreenFocused || !activePetId || !sessionUserId) {
      setHomeTitleBadge(null);
      return () => {
        cancelled = true;
      };
    }

    let fetched = false;
    const selection = loadHomeTitleSelection({ userId: sessionUserId, petId: activePetId }).catch(() => null);
    loadCachedHomePetTitleBadgeIdentity({ userId: sessionUserId, petId: activePetId })
      .then(async cachedTitle => {
        const chosen = await selection;
        if (!cancelled && !fetched && cachedTitle) {
          setHomeTitleBadge({ ...(chosen ?? cachedTitle), petId: activePetId, ownerId: sessionUserId });
        } else if (!cancelled && !fetched && chosen) {
          setHomeTitleBadge({ ...chosen, petId: activePetId, ownerId: sessionUserId });
        }
      })
      .catch(() => {});

    const task = scheduleIdleTask(() => {
      fetchHomePetTitleBadgeIdentity(activePetId)
        .then(async title => {
          const chosen = await selection;
          if (cancelled) return;
          fetched = true;
          const visibleTitle = chosen ?? title;
          setHomeTitleBadge(visibleTitle ? { ...visibleTitle, petId: activePetId, ownerId: sessionUserId } : null);
          saveCachedHomePetTitleBadge({
            userId: sessionUserId,
            petId: activePetId,
            title: title?.titleName ?? null,
            titleKey: title?.titleKey ?? null,
          }).catch(() => {});
        })
        .catch(async () => {
          const chosen = await selection;
          if (!cancelled) setHomeTitleBadge(chosen ? { ...chosen, petId: activePetId, ownerId: sessionUserId } : null);
        });
    });

    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [activePetId, isScreenFocused, sessionUserId, walkMemoryRevision]);

  // ---------------------------------------------------------
  // 5) HERO derived
  // ---------------------------------------------------------
  const plainPetName = useMemo(
    () =>
      selectedPet?.name?.trim() ||
      (petLoading && !hasPets ? '반려동물' : '반려동물'),
    [hasPets, petLoading, selectedPet?.name],
  );

  const profilePetName = useMemo(
    () =>
      formatMemorialPetName(
        selectedPet?.name ?? '반려동물',
        selectedPet?.deathDate ?? null,
      ),
    [selectedPet?.deathDate, selectedPet?.name],
  );

  const breed = useMemo(
    () => (selectedPet?.breed ?? '').trim() || null,
    [selectedPet?.breed],
  );

  const birthYmd = useMemo(
    () => (selectedPet?.birthDate ?? '').trim() || null,
    [selectedPet?.birthDate],
  );

  const ageText = useMemo(() => {
    return formatPetAgeLabelFromBirthDate(birthYmd);
  }, [birthYmd]);

  const genderText = useMemo(
    () => formatGender(selectedPet?.gender ?? null),
    [selectedPet?.gender],
  );

  const weightText = useMemo(
    () => formatWeightKg(selectedPet?.weightKg ?? null),
    [selectedPet?.weightKg],
  );

  const profileBasicInfo = useMemo<HomePetBasicInfoValues>(
    () => ({ breed, age: ageText, weight: weightText, gender: genderText }),
    [breed, ageText, genderText, weightText],
  );

  const togetherDays = useMemo(
    () => diffDaysFromKst(selectedPet?.adoptionDate ?? ''),
    [selectedPet?.adoptionDate],
  );

  const hobbies = useMemo(
    () => clampList(selectedPet?.hobbies, 2),
    [selectedPet?.hobbies],
  );
  const likes = useMemo(
    () => clampList(selectedPet?.likes, 2),
    [selectedPet?.likes],
  );
  const dislikes = useMemo(
    () => clampList(selectedPet?.dislikes, 2),
    [selectedPet?.dislikes],
  );

  const tags = useMemo(() => {
    const arr = Array.isArray(selectedPet?.tags)
      ? (selectedPet?.tags as string[])
      : [];
    const normalized = arr
      .map(t => (t ?? '').trim())
      .filter(Boolean)
      .slice(0, 10);
    return normalized;
  }, [selectedPet?.tags]);

  const hasMultiplePets = pets.length > 1;
  const petSelectionVisible = hasMultiplePets && isScreenFocused &&
    petSelectionOwnerId !== null && petSelectionOwnerId === sessionUserId;
  useEffect(() => {
    if (!hasMultiplePets || !isScreenFocused || petSelectionOwnerId !== sessionUserId) {
      setPetSelectionOwnerId(null);
    }
  }, [hasMultiplePets, isScreenFocused, petSelectionOwnerId, sessionUserId]);
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );
  const weatherGuideState = useWeatherGuide('현재 위치', undefined, {
    autoRefreshOnMount: deferredHomeDataReady,
    autoRefreshOnFocus: deferredHomeDataReady,
    autoRefreshOnActive: deferredHomeDataReady,
  });
  const weatherGuide = weatherGuideState.bundle;
  const weatherInsightParams = useMemo(
    () => ({
      district: weatherGuide.district,
      initialBundle: weatherGuide,
      initialCoordinates: weatherGuideState.coordinates ?? undefined,
    }),
    [weatherGuide, weatherGuideState.coordinates],
  );

  const homeWidgetSnapshot = useMemo(
    () =>
      buildHomeWidgetSnapshot({
        petName: plainPetName,
        themeColor: petTheme.primary,
        nextSchedule: visibleScheduleItems[0] ?? null,
        recentRecord: recordItems[0] ?? null,
        recordCount: recordItems.length,
      }),
    [plainPetName, petTheme.primary, recordItems, visibleScheduleItems],
  );

  useEffect(() => {
    syncHomeWidgetSnapshot(homeWidgetSnapshot);
  }, [homeWidgetSnapshot]);

  // ---------------------------------------------------------
  // 7) actions
  // ---------------------------------------------------------
  const onPressManagePets = useCallback(() => {
    navigation.navigate('PetManagement', { entrySource: 'home' });
  }, [navigation]);

  const openPetSelectionSheet = useCallback(() => {
    if (!hasMultiplePets || !sessionUserId) return;
    setProfileSheetVisible(false);
    setPetSelectionOwnerId(sessionUserId);
  }, [hasMultiplePets, sessionUserId]);

  const closePetSelectionSheet = useCallback(() => {
    setPetSelectionOwnerId(null);
  }, []);

  const onPressTimeline = useCallback(() => {
    navigation.navigate('TimelineTab', {
      screen: 'TimelineMain',
      params: {
        petId: activePetId ?? undefined,
        mainCategory: 'all',
        entrySource: 'home',
      },
    });
  }, [navigation, activePetId]);

  const onPressCommunityPost = useCallback(
    (postId: string) => {
      navigation.navigate('CommunityDetail', { postId });
    },
    [navigation],
  );

  const onPressCommunityAll = useCallback(() => {
    navigation.navigate('CommunityList', { entrySource: 'home' });
  }, [navigation]);

  const onPressHealthReport = useCallback(
    (focusYmd?: string) => {
      navigation.navigate('HealthReport', {
        petId: activePetId ?? undefined,
        initialTab: 'records',
        focusYmd,
        entrySource: 'home',
      });
    },
    [activePetId, navigation],
  );

  const onPressScheduleList = useCallback(() => {
    navigation.navigate('ScheduleList', {
      petId: activePetId ?? undefined,
      entrySource: 'home',
    });
  }, [activePetId, navigation]);

  const onPressScheduleDetail = useCallback(
    (scheduleId: string) => {
      navigation.navigate('ScheduleDetail', {
        petId: activePetId ?? undefined,
        entrySource: 'home',
        scheduleId,
      });
    },
    [activePetId, navigation],
  );

  const onPressPetProfileEdit = useCallback(() => {
    if (!activePetId) return;
    navigation.navigate('PetProfileEdit', {
      petId: activePetId,
      entrySource: 'home',
    });
  }, [activePetId, navigation]);

  const onPressWeatherInsight = useCallback(() => {
    navigation.navigate('WeatherInsight', weatherInsightParams);
  }, [navigation, weatherInsightParams]);

  const onPressTimelineCategory = useCallback(
    (
      mainCategory: Exclude<TimelineMainCategory, undefined>,
      otherSubCategory?: Exclude<TimelineOtherSubCategory, undefined>,
    ) => {
      navigation.navigate('TimelineTab', {
        screen: 'TimelineMain',
        params: {
          petId: activePetId ?? undefined,
          mainCategory,
          otherSubCategory,
          entrySource: 'home',
        },
      });
    },
    [navigation, activePetId],
  );

  const createHomeTotalSummaryEntryRequestId = useCallback(() => {
    const nextRequestId = createTimelineEntryRequestId(
      timelineEntryRequestIdRef.current,
    );
    timelineEntryRequestIdRef.current = nextRequestId;
    return nextRequestId;
  }, []);

  const onPressTotalSummaryTimeline = useCallback(
    (
      mainCategory: Exclude<TimelineMainCategory, undefined>,
      otherSubCategory?: Exclude<TimelineOtherSubCategory, undefined>,
    ) => {
      if (!activePetId) return;

      const entryRequestId = createHomeTotalSummaryEntryRequestId();
      const entryRequest = {
        entryRequestId,
        entrySource: HOME_TOTAL_SUMMARY_ENTRY_SOURCE,
        petId: activePetId,
        mainCategory,
        otherSubCategory: otherSubCategory ?? null,
        ymFilter: null,
        createdAt: Date.now(),
      } as const;
      publishTimelineEntryRequest(entryRequest);

      navigation.navigate('TimelineTab', {
        screen: 'TimelineEntryGate',
        params: entryRequest,
      });
    },
    [activePetId, createHomeTotalSummaryEntryRequestId, navigation],
  );

  const onPressTotalSummaryAllRecords = useCallback(
    () => onPressTotalSummaryTimeline('all'),
    [onPressTotalSummaryTimeline],
  );

  const onPressTotalWalk = useCallback(
    () => onPressTotalSummaryTimeline('walk'),
    [onPressTotalSummaryTimeline],
  );
  const onPressTotalMeal = useCallback(
    () => onPressTotalSummaryTimeline('meal'),
    [onPressTotalSummaryTimeline],
  );
  const onPressTotalLife = useCallback(
    () => onPressTotalSummaryTimeline('other'),
    [onPressTotalSummaryTimeline],
  );

  const onPressFrequentRecord = useCallback(
    (category: FrequentRecordCategory) => {
      if (category === 'walk') {
        if (activePetId) navigation.navigate('WalkProduct', { petId: activePetId });
        else navigation.navigate('PetCreate', { from: 'cta' });
        return;
      }
      const initialMainCategory = category === 'grooming' ? 'other' : category;
      navigation.navigate('RecordCreate', {
        petId: activePetId ?? undefined,
        initialMainCategory,
        initialOtherSubCategory: category === 'grooming' ? 'grooming' : null,
        returnTo: { tab: 'HomeTab', afterCreate: 'home' },
      });
    },
    [activePetId, navigation],
  );

  const onPressRecord = useCallback(() => {
    navigation.navigate('RecordCreate', {
      petId: activePetId ?? undefined,
      returnTo: { tab: 'HomeTab' },
    });
  }, [navigation, activePetId]);

  const onPressRecordItem = useCallback(
    (memoryId: string) => {
      if (!activePetId) return;
      navigation.navigate('TimelineTab', {
        screen: 'RecordDetail',
        params: {
          petId: activePetId,
          memoryId,
          entrySource: 'home',
        },
      });
    },
    [navigation, activePetId],
  );

  const handleHomeScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: { y: number };
      };
    }) => {
      const offsetY = Math.max(0, event.nativeEvent.contentOffset.y);

      HOME_SCROLL_OFFSET_BY_KEY.set(homeScrollStorageKey, offsetY);
    },
    [homeScrollStorageKey],
  );

  const restoreHomeScrollPosition = useCallback(() => {
    if (!shouldRestoreHomeScrollRef.current) return;
    const nextOffset = HOME_SCROLL_OFFSET_BY_KEY.get(homeScrollStorageKey) ?? 0;
    homeScrollRef.current?.scrollTo({ x: 0, y: nextOffset, animated: false });
    shouldRestoreHomeScrollRef.current = false;
  }, [homeScrollStorageKey]);

  useEffect(() => {
    shouldRestoreHomeScrollRef.current = true;
  }, [homeScrollStorageKey]);

  useEffect(() => {
    if (!isScreenFocused) return;

    const frame = requestAnimationFrame(() => {
      restoreHomeScrollPosition();
    });

    return () => cancelAnimationFrame(frame);
  }, [isScreenFocused, restoreHomeScrollPosition]);

  const onPressPetChip = useCallback(
    (petId: string) => {
      if (petId === activePetId || !pets.some(pet => pet.id === petId)) return;

      bootstrapRecords(petId).catch(() => {});
      bootstrapSchedules(petId).catch(() => {});
      selectPet(petId);
    },
    [
      activePetId,
      pets,
      bootstrapRecords,
      bootstrapSchedules,
      selectPet,
    ],
  );

  const homeGuideContext = useMemo(
    () => ({
      userId: sessionUserId,
      petId: activePetId,
      species: selectedPet?.species ?? null,
      speciesDetailKey: selectedPet?.speciesDetailKey ?? null,
      speciesDisplayName: selectedPet?.speciesDisplayName ?? null,
      birthDate: selectedPet?.birthDate ?? null,
      deathDate: selectedPet?.deathDate ?? null,
    }),
    [
      activePetId,
      selectedPet?.birthDate,
      selectedPet?.deathDate,
      selectedPet?.species,
      selectedPet?.speciesDetailKey,
      selectedPet?.speciesDisplayName,
      sessionUserId,
    ],
  );
  const homeGuideState = useHomePetCareGuides(homeGuideContext, {
    enabled: deferredHomeDataReady,
  });
  const homeGuideExposureSignatureRef = useRef('');

  const onPressGuideList = useCallback(() => {
    navigation.navigate('GuideList', { entrySource: 'home' });
  }, [navigation]);

  const onPressGuideDetail = useCallback(
    (guideId: string) => {
      const selectedGuide =
        homeGuideState.guides.find(guide => guide.id === guideId) ?? null;

      recordPetCareGuideEvents([
        {
          userId: sessionUserId,
          petId: activePetId,
          guideId,
          eventType: 'list_click',
          placement: 'logged-in-home',
          rotationWindowKey: getGuideRotationWindowKey(),
          contextSpeciesGroup: selectedPet?.species ?? null,
          contextSpeciesDetailKey: selectedPet?.speciesDetailKey ?? null,
          contextAgeInMonths: getAgeInMonthsFromBirthDate(
            selectedPet?.birthDate ?? null,
          ),
          metadata: selectedGuide
            ? buildGuideEventMetadata({
                guide: selectedGuide,
                source: 'home-recommendation',
                context: {
                  species: selectedPet?.species ?? null,
                  speciesDetailKey: selectedPet?.speciesDetailKey ?? null,
                  speciesDisplayName: selectedPet?.speciesDisplayName ?? null,
                  birthDate: selectedPet?.birthDate ?? null,
                  deathDate: selectedPet?.deathDate ?? null,
                },
              })
            : { source: 'home-recommendation' },
        },
      ]).catch(() => {});
      navigation.navigate('GuideDetail', { guideId });
    },
    [
      activePetId,
      homeGuideState.guides,
      navigation,
      selectedPet?.birthDate,
      selectedPet?.deathDate,
      selectedPet?.species,
      selectedPet?.speciesDetailKey,
      selectedPet?.speciesDisplayName,
      sessionUserId,
    ],
  );

  useEffect(() => {
    if (homeGuideState.loading) return;
    if (homeGuideState.guides.length === 0) return;

    const rotationWindowKey = getGuideRotationWindowKey();
    const signature = [
      sessionUserId ?? 'guest',
      activePetId ?? 'no-pet',
      rotationWindowKey,
      ...homeGuideState.guides.map(guide => guide.id),
    ].join(':');

    if (homeGuideExposureSignatureRef.current === signature) return;
    homeGuideExposureSignatureRef.current = signature;

    recordPetCareGuideEvents(
      homeGuideState.guides.map(guide => ({
        userId: sessionUserId,
        petId: activePetId,
        guideId: guide.id,
        eventType: 'home_impression',
        placement: 'logged-in-home',
        rotationWindowKey,
        contextSpeciesGroup: selectedPet?.species ?? null,
        contextSpeciesDetailKey: selectedPet?.speciesDetailKey ?? null,
        contextAgeInMonths: getAgeInMonthsFromBirthDate(
          selectedPet?.birthDate ?? null,
        ),
        metadata: buildGuideEventMetadata({
          guide,
          source: 'home-recommendation',
          context: {
            species: selectedPet?.species ?? null,
            speciesDetailKey: selectedPet?.speciesDetailKey ?? null,
            speciesDisplayName: selectedPet?.speciesDisplayName ?? null,
            birthDate: selectedPet?.birthDate ?? null,
            deathDate: selectedPet?.deathDate ?? null,
          },
        }),
      })),
    ).catch(() => {});
  }, [
    activePetId,
    homeGuideState.guides,
    homeGuideState.loading,
    selectedPet?.birthDate,
    selectedPet?.deathDate,
    selectedPet?.species,
    selectedPet?.speciesDetailKey,
    selectedPet?.speciesDisplayName,
    sessionUserId,
  ]);
  const weatherToHomeBridgeHeight = useMemo(
    () => resolveWeatherToHomeBridgeHeight(windowHeight),
    [windowHeight],
  );
  const handleHomeViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth > 0) setHeroFrameWidth(previous => previous === nextWidth ? previous : nextWidth);
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (nextHeight > 0) {
      setHomeViewportHeight(currentHeight =>
        currentHeight === nextHeight ? currentHeight : nextHeight,
      );
    }
  }, []);

  const ambientBubbleCanvasEnabled = seasonalHomeVisual !== null;
  const handleAmbientContentLayout = useCallback((event: LayoutChangeEvent) => {
    const y = Math.round(event.nativeEvent.layout.y * 2) / 2;
    setAmbientContentY(previous => (previous === y ? previous : y));
  }, []);
  const handleAmbientLowerLayout = useCallback((event: LayoutChangeEvent) => {
    const y = Math.round(event.nativeEvent.layout.y * 2) / 2;
    setAmbientLowerY(previous => (previous === y ? previous : y));
  }, []);
  // Passive layout updates keep decoration anchored without scroll-time state.
  const ambientSectionLayoutHandlers = useMemo(() => {
    const handlers: Partial<
      Record<HomeAmbientBubbleZone, (event: LayoutChangeEvent) => void>
    > = {};
    for (const zone of HOME_AMBIENT_SECTION_ZONES) {
      handlers[zone] = (event: LayoutChangeEvent) => {
        const { y, height } = event.nativeEvent.layout;
        setAmbientSectionLayouts(previous =>
          updateHomeAmbientSectionLayout(previous, zone, { y, height }),
        );
      };
    }
    return handlers;
  }, []);
  const homeHeader = (
    <HomeHeaderSection
      season={ambientSeason}
      petName={profilePetName}
      onPressNotifications={openHomeNotifications}
      notificationUnreadCount={notificationUnread.data ?? 0}
      photoReady={heroPhotoReady}
    />
  );
  const activeAlarmNotice = (
    <HomeActiveAlarmNotice
      alarms={activeAlarms.alarms}
      error={activeAlarms.error}
      stoppingKeys={activeAlarms.stoppingKeys}
      onStop={activeAlarms.stop}
      onRefresh={activeAlarms.refresh}
    />
  );
  const frequentRecordsSection = (
    <FrequentRecordsSection
      walkStartsGps
      petTheme={NEUTRAL_UI_PALETTE}
      records={recordItems}
      recordStatus={recordStatus}
      onPressCategory={onPressFrequentRecord}
      onPressAll={onPressTimeline}
      footer={<WalkHomeFooter petId={activePetId} enabled={deferredHomeDataReady && isScreenFocused && !!sessionUserId} />}
    />
  );
  const lowerHomeSections = (
    <View
      onLayout={handleAmbientLowerLayout}
      style={[
        styles.lowerHomeRoot,
        ambientBubbleCanvasEnabled ? styles.ambientBackgroundTransparent : null,
      ]}
    >
      <WeatherToLowerHomeBridge
        season={seasonalHomeVisual?.season ?? null}
        height={weatherToHomeBridgeHeight}
        hidden={ambientBubbleCanvasEnabled}
      />

      <View testID="home-section-list"
        style={[styles.lowerHomeSectionList, styles.heroConnectedLowerSectionList]}>
        <View onLayout={ambientSectionLayoutHandlers.frequent}>
          {frequentRecordsSection}
        </View>
        <View onLayout={ambientSectionLayoutHandlers.summary}>
          <TotalSummarySection
            season={ambientSeason}
            records={
              totalSummaryState.petId === activePetId
                ? totalSummaryState.records
                : null
            }
            accentDeepColor={NEUTRAL_UI_PALETTE.deep}
            isReady={
              totalSummaryState.petId === activePetId &&
              totalSummaryState.status === 'ready' &&
              !totalSummaryState.hasError
            }
            isLoading={
              activePetId !== null &&
              (totalSummaryState.petId !== activePetId ||
                (totalSummaryState.records === null &&
                  totalSummaryState.status === 'loading'))
            }
            onPressWalk={onPressTotalWalk}
            onPressMeal={onPressTotalMeal}
            onPressLife={onPressTotalLife}
            onPressAllRecords={onPressTotalSummaryAllRecords}
          />
        </View>
        <View onLayout={ambientSectionLayoutHandlers.recent}>
          <TodayRecordsSection
            recordItems={recordItems}
            recordStatus={recordStatus}
            onPressTimeline={onPressTimeline}
            onPressRecord={onPressRecord}
            onPressRecordItem={onPressRecordItem}
            accentDeepColor={NEUTRAL_UI_PALETTE.deep}
            season={ambientSeason}
          />
        </View>
        <View onLayout={ambientSectionLayoutHandlers.community}>
          <CommunitySection
            isFocused={isScreenFocused}
            season={ambientSeason}
            accentColor={NEUTRAL_UI_PALETTE.primary}
            accentTint={NEUTRAL_UI_PALETTE.tint}
            accentBorder={NEUTRAL_UI_PALETTE.border}
            onPressPost={onPressCommunityPost}
            onPressAll={onPressCommunityAll}
          />
        </View>
        <View onLayout={ambientSectionLayoutHandlers.recommendation}>
          <RecommendationTipsSection
            guides={homeGuideState.guides}
            loading={homeGuideState.loading}
            error={homeGuideState.error}
            isMemorial={isMemorialPet(selectedPet?.deathDate)}
            source={homeGuideState.source}
            sourceReason={homeGuideState.sourceReason}
            petTheme={NEUTRAL_UI_PALETTE}
            onPressGuide={onPressGuideDetail}
            onPressMore={onPressGuideList}
          />
        </View>
        <View onLayout={ambientSectionLayoutHandlers.schedule}>
          <ScheduleSection
            petId={activePetId}
            scheduleItems={visibleScheduleItems}
            isFocused={isScreenFocused}
            dataState={
              scheduleStatus === 'ready'
                ? 'ready'
                : scheduleStatus === 'error'
                ? 'error'
                : 'loading'
            }
            season={ambientSeason}
            activeScheduleIds={activeAlarms.activeScheduleIds}
            onPressScheduleList={onPressScheduleList}
            onPressScheduleDetail={onPressScheduleDetail}
            accentColor={NEUTRAL_UI_PALETTE.primary}
            accentDeepColor={NEUTRAL_UI_PALETTE.deep}
          />
        </View>
        <View onLayout={ambientSectionLayoutHandlers.health}>
          <HealthRecentActivitiesSection
            activityItems={healthActivityItems}
            isReady={recordStatus === 'ready' && scheduleStatus === 'ready'}
            dataState={
              recordStatus === 'error' || scheduleStatus === 'error'
                ? 'error'
                : recordStatus === 'ready' && scheduleStatus === 'ready'
                ? 'ready'
                : 'loading'
            }
            season={ambientSeason}
            onPressHealthReport={() => onPressHealthReport()}
            onPressActivityItem={onPressHealthReport}
            accentColor={NEUTRAL_UI_PALETTE.primary}
            accentDeepColor={NEUTRAL_UI_PALETTE.deep}
          />
        </View>
        <View onLayout={ambientSectionLayoutHandlers['today-tip']}>
          <TodayHomeTipSection
            season={ambientSeason}
            accentColor={NEUTRAL_UI_PALETTE.primary}
          />
        </View>
        <View onLayout={ambientSectionLayoutHandlers.diary}>
          <MonthlyDiarySection
            petName={plainPetName}
            recordItems={recordItems}
            recordStatus={recordStatus}
            season={ambientSeason}
            onPressTimelineCategory={onPressTimelineCategory}
            onPressRecord={onPressRecord}
            onPressRecordItem={onPressRecordItem}
            accentDeepColor={NEUTRAL_UI_PALETTE.deep}
          />
        </View>
      </View>
    </View>
  );

  // ---------------------------------------------------------
  // 10) render
  // ---------------------------------------------------------
  return (
    <HomeSeasonProvider
      season={HOME_FOREGROUND_UI_SEASON}
      headingSeason={ambientSeason}
    >
      <Screen style={[styles.screen, { backgroundColor: heroColors.statusBar }]}>
        {isScreenFocused ? <StatusBar barStyle="dark-content" /> : null}
        <View style={{ flex: 1 }} importantForAccessibility={isScreenFocused ? 'auto' : 'no-hide-descendants'}>
        {seasonalHomeVisual ? (
          <HomeAmbientBubbleCanvas
            backgroundMode="homePalette"
            season={ambientSeason}
            heroHeight={seasonalHeroViewportHeight}
            sectionLayouts={ambientSectionLayouts}
            sectionOrigin={ambientContentY + ambientLowerY}
          />
        ) : null}
        <ScrollView
          ref={homeScrollRef}
          keyboardShouldPersistTaps="handled"
          style={[styles.scroll, { backgroundColor: 'transparent' }]}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(132, insets.bottom + 108),
              paddingHorizontal: 0,
              paddingTop: 0,
              gap: 0,
            },
          ]}
          contentOffset={{ x: 0, y: initialHomeScrollOffset }}
          onContentSizeChange={restoreHomeScrollPosition}
          onLayout={handleHomeViewportLayout}
          onScroll={handleHomeScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <View
            testID="home-hero-fold"
            style={{
              width: '100%',
              minHeight: getHomeHeroMinimumHeight(
                homeViewportHeight || windowHeight - insets.top,
                bottomTabBarHeight,
              ),
              backgroundColor: 'transparent',
            }}
          >
            <View style={{ position: 'relative' }}>
              <Animated.View testID="home-hero-photo-transition" style={petSwitchTransition.photoStyle}>
                <HomeHeroPhotoBackground uri={selectedAvatarUri} frameWidth={heroFrameWidth} colors={heroColors} onPhotoSettled={petSwitchTransition.onPhotoSettled} onPhotoStatusChange={handleHeroPhotoStatusChange} />
              </Animated.View>
              <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                {homeHeader}
                {activeAlarmNotice}
              </View>
            </View>
            <Animated.View testID="home-hero-info-transition" style={petSwitchTransition.contentStyle}>
              <HomeHeroInfoPanel
                colors={heroColors}
                containerWidth={heroFrameWidth}
                petTheme={petTheme}
                profilePetName={profilePetName}
                titleBadge={activeHomeTitleBadge?.titleName ?? null}
                titleBadgeKey={activeHomeTitleBadge?.titleKey ?? null}
                togetherDays={togetherDays}
                hasMultiplePets={hasMultiplePets}
                onPressPetSelect={openPetSelectionSheet}
                onPressProfileInfo={openProfileInfoSheet}
                onPressPetProfileEdit={onPressPetProfileEdit}
              />
            </Animated.View>
          </View>

          <View
            onLayout={handleAmbientContentLayout}
            pointerEvents="box-none"
          >
            <HomeHeroContentSheet season={ambientSeason}>
              <FixedTypographyBoundary>
                <HomeWeatherSection
                  weather={weatherGuide}
                  locationLabel={weatherGuideState.locationLabel}
                  petName={selectedPet?.name}
                  accentColor={NEUTRAL_UI_PALETTE.primary}
                  season={seasonalHomeVisual?.season ?? null}
                  hideSeasonalBackgroundImage={ambientBubbleCanvasEnabled}
                  connectedToHero
                  onPress={onPressWeatherInsight}
                />
              </FixedTypographyBoundary>

              {lowerHomeSections}
            </HomeHeroContentSheet>
          </View>
        </ScrollView>

        <HomePetSelectionSheet
          key={sessionUserId ?? 'guest'}
          visible={petSelectionVisible}
          pets={pets}
          selectedPetId={activePetId}
          season={ambientSeason}
          accentColor={petTheme.primary}
          onClose={closePetSelectionSheet}
          onSelect={onPressPetChip}
          onManage={onPressManagePets}
        />

        <ProfileInfoBottomSheet
          petId={activePetId}
          visible={profileSheetVisible}
          profilePetName={profilePetName}
          basicInfo={profileBasicInfo}
          hobbies={hobbies}
          likes={likes}
          dislikes={dislikes}
          tags={tags}
          season={ambientSeason}
          seasonalOrnamentSheet={profileSheetVisual?.ornamentSheet ?? null}
          profileSheetBackground={
            profileSheetVisual?.profileSheetBackground ?? null
          }
          onCloseComplete={closeProfileInfoSheet}
        />

        </View>
      </Screen>
    </HomeSeasonProvider>
  );
}
