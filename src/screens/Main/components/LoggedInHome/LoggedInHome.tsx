// 파일: src/screens/Main/components/LoggedInHome/LoggedInHome.tsx
// 목적:
// - 로그인 홈 (LoggedInHome)
// - 홈 허브에서 프로필/날씨/최근 기록/건강관리/일정/가이드를 한 번에 소비한다.
// - 최근 기록은 홈 전용 세로 프리뷰 섹션으로, 최신 3개만 압축 노출한다.

import AppText from '../../../../app/ui/AppText';
import React, {
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated as RNAnimated,
  BackHandler,
  Image,
  InteractionManager,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import Screen from '../../../../components/layout/Screen';
import { FrequentRecordsSection } from '../../../../components/records/FrequentRecordsSection';
import { SectionHeaderAction } from '../../../../app/ui/SectionHeaderAction';
import GuideRecommendationCard from '../../../../components/guides/GuideRecommendationCard';
import { useWeatherGuide } from '../../../../hooks/useWeatherGuide';
import { useHomePetCareGuides } from '../../../../hooks/useHomePetCareGuides';
import { useSignedMemoryImage } from '../../../../hooks/useSignedMemoryImage';
import type { AppTabParamList } from '../../../../navigation/AppTabsNavigator';
import type { TimelineStackParamList } from '../../../../navigation/TimelineStackNavigator';
import type { RootStackParamList } from '../../../../navigation/RootNavigator';
import { createLatestRequestController } from '../../../../services/app/async';
import {
  normalizeCategoryKey,
  getMemoryCategoryChipLabel,
  getRecordCategoryMeta,
  getMemoryCategoryChipTone,
  readRecordCategoryRaw,
  type MemoryMainCategory,
  type MemoryOtherSubCategory,
} from '../../../../services/memories/categoryMeta';
import {
  getPrimaryMemoryImageRef,
  hasMemoryImage,
} from '../../../../services/records/imageSources';
import { useAuthStore } from '../../../../store/authStore';
import { usePetStore, type Pet } from '../../../../store/petStore';
import { useRecordStore } from '../../../../store/recordStore';
import { useScheduleStore } from '../../../../store/scheduleStore';

import {
  fetchMemorySummaryRecordsByPet,
  type MemoryRecord,
} from '../../../../services/supabase/memories';
import type { PetSchedule } from '../../../../services/supabase/schedules';
import {
  pickTodayPhoto,
} from '../../../../services/home/homeRecall';
import { buildHomeWidgetSnapshot } from '../../../../services/home/widgetSnapshot';
import { syncHomeWidgetSnapshot } from '../../../../services/home/widgetBridge';
import {
  buildTotalSummary,
  buildTotalSummaryLine,
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
import {
  formatScheduleDateLabel,
  getScheduleColorPalette,
  mapScheduleIconName,
  mapScheduleToMemoryCategory,
} from '../../../../services/schedules/presentation';
import { buildPetThemePalette } from '../../../../services/pets/themePalette';
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
  fetchHomePetTitleBadge,
  loadCachedHomePetTitleBadge,
  saveCachedHomePetTitleBadge,
} from '../../../../services/activity/homeTitleBadge';
import {
  loadHomeRecordScheduleCache,
  saveHomeRecordScheduleCache,
} from '../../../../services/local/homeRecordScheduleCache';
import { getBrandedErrorMeta } from '../../../../services/app/errors';
import {
  fetchUserNotificationUnreadCount,
  fetchUserNotifications,
  markUserNotificationRead,
  type UserNotificationItem,
} from '../../../../services/notifications/userNotifications';
import {
  dismissHomeNotification,
  dismissHomeNotifications,
  filterHomeVisibleNotifications,
  loadHomeNotificationDismissedKeys,
} from '../../../../services/notifications/homeQuickDismiss';
import {
  getNotificationCardGestureIntent,
  shouldCaptureNotificationCardGesture,
} from '../../../../services/notifications/gesturePolicy';
import { showToast } from '../../../../store/uiStore';
import { getAgeInMonthsFromBirthDate } from '../../../../services/guides/agePolicy';
import { buildGuideEventMetadata } from '../../../../services/guides/analytics';
import {
  getGuideDataSourceDescription,
  getGuideDataSourceLabel,
} from '../../../../services/guides/source';
import { isLocalGuideSeedGuide } from '../../../../services/guides/seed';
import { getGuideRotationWindowKey } from '../../../../services/guides/rotation';
import { recordPetCareGuideEvents } from '../../../../services/guides/service';
import {
  diffDaysFromKst,
  formatYmdToDots,
  formatYmdWithWeekday,
  getMonthKeyFromYmd,
  getMonthKeyInKst,
} from '../../../../utils/date';
import WeatherGuideHomeCard, {
  WEATHER_DAY_BORDER_COLORS,
} from '../../../../components/weather/WeatherGuideHomeCard';
import type { PetCareGuide } from '../../../../services/guides/types';
import { styles } from './LoggedInHome.styles';
import CommunitySection from './CommunitySection';

type HomeTabNav = BottomTabNavigationProp<AppTabParamList, 'HomeTab'>;
type Nav = CompositeNavigationProp<
  HomeTabNav,
  NativeStackNavigationProp<RootStackParamList>
>;

const HOME_SCROLL_OFFSET_BY_KEY = new Map<string, number>();

const WEEKLY_SUMMARY_COUNT_FONT_SIZE = 24;
const WEEKLY_SUMMARY_UNIT_FONT_SIZE = 14;

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const NOTIFICATION_CARD_LAYOUT_ANIMATION = {
  duration: 190,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

type TimelineMainCategory = NonNullable<
  TimelineStackParamList['TimelineMain']
>['mainCategory'];
type TimelineOtherSubCategory = NonNullable<
  TimelineStackParamList['TimelineMain']
>['otherSubCategory'];
type HomeMainCategory = Exclude<MemoryMainCategory, 'all'>;
type HomeOtherSubCategory = MemoryOtherSubCategory;
type ProfileAccordionKey = 'hobby' | 'like' | 'dislike' | 'tag';

type WeeklyScheduleItem = {
  key: string;
  dateLabel: string;
  title: string;
  subtitle: string;
  icon: string;
  tint: string;
  mainCategory: HomeMainCategory;
  otherSubCategory?: HomeOtherSubCategory;
};

type HomeRecentPreviewItem = {
  record: MemoryRecord;
};

type HomeNotificationOverlayProps = {
  visible: boolean;
  items: UserNotificationItem[];
  loading: boolean;
  errorMessage: string | null;
  topInset: number;
  maxHeight: number;
  onClose: () => void;
  onRefresh: () => void;
  onPressItem: (item: UserNotificationItem) => void;
  onDismissItem: (item: UserNotificationItem) => void;
  onDismissAll: () => void;
  expandedItemKeys: ReadonlySet<string>;
  onToggleExpandedItem: (item: UserNotificationItem) => void;
  onSetExpandedItem: (item: UserNotificationItem, expanded: boolean) => void;
};

type HomeNotificationSwipeItemProps = {
  item: UserNotificationItem;
  onPressItem: (item: UserNotificationItem) => void;
  onDismissItem: (item: UserNotificationItem) => void;
  expanded: boolean;
  onToggleExpanded: (item: UserNotificationItem) => void;
  onSetExpanded: (item: UserNotificationItem, expanded: boolean) => void;
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

function formatHomeNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getHomeNotificationKey(item: UserNotificationItem): string {
  return `${item.source}:${item.id}`;
}

function animateNotificationCardLayout() {
  LayoutAnimation.configureNext(NOTIFICATION_CARD_LAYOUT_ANIMATION);
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
      <View style={[styles.recentRecordIconBox, { backgroundColor: iconBackground }]}>
        <MaterialCommunityIcons
          name={getHomeRecentIcon(item)}
          size={25}
          color={iconColor}
        />
      </View>

      <View style={styles.recentRecordBody}>
        <AppText preset="unifiedLabel" style={styles.recentRecordCategory} numberOfLines={1}>
          {categoryLabel}
        </AppText>
        <AppText preset="unifiedBody" style={styles.recentRecordSummary} numberOfLines={1}>
          {summary}
        </AppText>
      </View>

      <View style={styles.recentRecordMeta}>
        <AppText preset="unifiedBody" style={styles.recentRecordTime} numberOfLines={1}>
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

function buildScheduleCard(schedule: PetSchedule): WeeklyScheduleItem {
  const category = mapScheduleToMemoryCategory(schedule);
  const palette = getScheduleColorPalette(schedule.colorKey);
  return {
    key: schedule.id,
    dateLabel: formatScheduleDateLabel(schedule),
    title: schedule.title,
    subtitle:
      schedule.note?.trim() ||
      (schedule.allDay
        ? '하루 일정으로 저장된 항목이에요'
        : '예정된 일정이에요'),
    icon: mapScheduleIconName(schedule.iconKey),
    tint: palette.tint,
    mainCategory: category.mainCategory,
    otherSubCategory: category.otherSubCategory,
  };
}

const EMPTY_RECORD_ITEMS: MemoryRecord[] = [];
Object.freeze(EMPTY_RECORD_ITEMS);
const EMPTY_SCHEDULE_ITEMS: PetSchedule[] = [];
Object.freeze(EMPTY_SCHEDULE_ITEMS);

const HOME_RECENT_RECORDS_MAX = 3;

const TODAY_HOME_TIP = {
  badge: '오늘의 팁',
  title:
    '반려동물의 평소 소리를 기억해두면 작은 변화도 더 빨리 알아챌 수 있어요.',
  description:
    '산책 후 숨소리, 잠든 뒤 호흡, 식사 직후의 반응처럼 평소의 기준을 남겨두면 컨디션 변화를 더 빨리 알아차릴 수 있어요.',
};

const HOME_TOP_BUTTON_SHOW_OFFSET = 96;
const HOME_TOP_BUTTON_FALLBACK_SHOW_OFFSET = 300;
const HOME_TOP_BUTTON_BOTTOM_OFFSET = 90;
const HOME_TOP_BUTTON_MIN_BOTTOM = 104;

function resolveHomeTopButtonThreshold(
  scheduleSectionOffset: number | null,
): number {
  if (scheduleSectionOffset === null) {
    return HOME_TOP_BUTTON_FALLBACK_SHOW_OFFSET;
  }

  return Math.max(0, scheduleSectionOffset - HOME_TOP_BUTTON_SHOW_OFFSET);
}

/* ---------------------------------------------------------
 * 3) sub components (hooks-safe)
 * -------------------------------------------------------- */
const PetChipButton = React.memo(function PetChipButton({
  petId,
  isActive,
  imageUri,
  petThemePrimary,
  onPress,
}: {
  petId: string;
  isActive: boolean;
  imageUri: string | null;
  petThemePrimary: string;
  onPress: (petId: string) => void;
}) {
  const handlePress = useCallback(() => {
    onPress(petId);
  }, [onPress, petId]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.petChip,
        isActive
          ? [
              styles.petChipActive,
              {
                borderColor: petThemePrimary,
                shadowColor: petThemePrimary,
              },
            ]
          : null,
      ]}
      onPress={handlePress}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.petChipImage} />
      ) : (
        <View style={styles.petChipPlaceholder} />
      )}
    </TouchableOpacity>
  );
});

const MonthlyDiaryCard = React.memo(function MonthlyDiaryCard({
  item,
  onPress,
}: {
  item: MemoryRecord;
  onPress: (memoryId: string) => void;
}) {
  const imageRef = getPrimaryMemoryImageRef(item);
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
      <AppText preset="unifiedLabel" style={styles.monthDiaryTitle} numberOfLines={1}>
        {item.title?.trim() || '기록'}
      </AppText>
      <AppText preset="unifiedBody" style={styles.monthDiaryMeta} numberOfLines={1}>
        {getRecordYmdDots(item)}
      </AppText>
    </TouchableOpacity>
  );
});

const TodayPhotoSection = React.memo(function TodayPhotoSection({
  activePetId,
  recordItems,
  recordStatus,
  onPressRecordItem,
  onPressRecord,
  accentColor,
}: {
  activePetId: string | null;
  recordItems: MemoryRecord[];
  recordStatus:
    | 'idle'
    | 'loading'
    | 'ready'
    | 'refreshing'
    | 'loadingMore'
    | 'error';
  onPressRecordItem: (memoryId: string) => void;
  onPressRecord: () => void;
  accentColor: string;
}) {
  const [todayPhoto, setTodayPhoto] = useState<{
    record: MemoryRecord | null;
    mode: 'anniversary' | 'random' | 'none';
  }>({ record: null, mode: 'none' });

  useEffect(() => {
    setTodayPhoto({ record: null, mode: 'none' });
  }, [activePetId]);

  useEffect(() => {
    const request = createLatestRequestController();

    async function run() {
      const requestId = request.begin();
      if (!activePetId) {
        if (request.isCurrent(requestId)) {
          setTodayPhoto({ record: null, mode: 'none' });
        }
        return;
      }
      const picked = await pickTodayPhoto(activePetId, recordItems);
      if (request.isCurrent(requestId)) {
        setTodayPhoto(picked);
      }
    }

    run();
    return () => {
      request.cancel();
    };
  }, [activePetId, recordItems]);

  const { signedUrl: todayPhotoUrl, loading: isTodayPhotoLoading } =
    useSignedMemoryImage(
      todayPhoto.record ? getPrimaryMemoryImageRef(todayPhoto.record) : null,
    );

  const isRecordBootstrapPending =
    (recordStatus === 'idle' || recordStatus === 'loading') &&
    recordItems.length === 0 &&
    !todayPhoto.record;
  const photoDateLabel = useMemo(() => {
    if (!todayPhoto.record) return '';
    return (
      formatYmdWithWeekday(getRecordDisplayYmd(todayPhoto.record), {
        separator: '.',
        suffix: true,
      }) ?? formatRecordDisplayDate(todayPhoto.record)
    );
  }, [todayPhoto.record]);

  return (
    <View style={[styles.section, styles.todayPhotoSection]}>
      <View style={styles.sectionHeaderRow}>
        <AppText preset="unifiedTitle" style={[styles.sectionTitle, { color: accentColor }]}>
          오늘 한장
        </AppText>
      </View>

      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.photoCard}
        onPress={() =>
          todayPhoto.record
            ? onPressRecordItem(todayPhoto.record.id)
            : onPressRecord()
        }
      >
        {isRecordBootstrapPending ? (
          <View
            style={[
              styles.photoPlaceholder,
              { justifyContent: 'center', alignItems: 'center' },
            ]}
          >
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : !todayPhoto.record || !hasMemoryImage(todayPhoto.record) ? (
          <View style={styles.photoPlaceholder} />
        ) : isTodayPhotoLoading ? (
          <View
            style={[
              styles.photoPlaceholder,
              { justifyContent: 'center', alignItems: 'center' },
            ]}
          >
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : todayPhotoUrl ? (
          <Image
            source={{ uri: todayPhotoUrl }}
            style={styles.photoImage}
            fadeDuration={250}
          />
        ) : (
          <View style={styles.photoPlaceholder} />
        )}

        <View style={styles.photoOverlay}>
          <AppText preset="unifiedDate" style={styles.photoOverlayDate} numberOfLines={1}>
            {photoDateLabel}
          </AppText>
        </View>
      </TouchableOpacity>
    </View>
  );
});

const HomeWeatherSection = React.memo(function HomeWeatherSection({
  weather,
  locationLabel,
  petName,
  accentColor,
  onPress,
}: {
  weather: ReturnType<typeof useWeatherGuide>['bundle'];
  locationLabel: ReturnType<typeof useWeatherGuide>['locationLabel'];
  petName?: string | null;
  accentColor: string;
  onPress: () => void;
}) {
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
});

const HomeNotificationSwipeItem = React.memo(function HomeNotificationSwipeItem({
  item,
  onPressItem,
  onDismissItem,
  expanded,
  onToggleExpanded,
  onSetExpanded,
}: HomeNotificationSwipeItemProps) {
  const unread = !item.readAt;
  const dismissItem = useCallback(() => {
    onDismissItem(item);
  }, [item, onDismissItem]);
  const toggleExpanded = useCallback(() => {
    onToggleExpanded(item);
  }, [item, onToggleExpanded]);
  const setExpanded = useCallback(
    (nextExpanded: boolean) => {
      onSetExpanded(item, nextExpanded);
    },
    [item, onSetExpanded],
  );
  const swipeTranslateX = useRef(new RNAnimated.Value(0)).current;
  const resetSwipePosition = useCallback(() => {
    RNAnimated.spring(swipeTranslateX, {
      toValue: 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 0,
    }).start();
  }, [swipeTranslateX]);
  const dismissWithSwipeAnimation = useCallback(
    (dx: number) => {
      const exitX = dx < 0 ? -460 : 460;
      RNAnimated.timing(swipeTranslateX, {
        toValue: exitX,
        duration: 150,
        useNativeDriver: true,
      }).start(({ finished }) => {
        swipeTranslateX.setValue(0);
        if (finished) {
          dismissItem();
          return;
        }
        resetSwipePosition();
      });
    },
    [dismissItem, resetSwipePosition, swipeTranslateX],
  );
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
          shouldCaptureNotificationCardGesture({
            dx: gestureState.dx,
            dy: gestureState.dy,
          }),
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          shouldCaptureNotificationCardGesture({
            dx: gestureState.dx,
            dy: gestureState.dy,
          }),
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_event, gestureState) => {
          const absDx = Math.abs(gestureState.dx);
          const absDy = Math.abs(gestureState.dy);
          if (absDx > 8 && absDx > absDy * 1.15) {
            swipeTranslateX.setValue(gestureState.dx);
          }
        },
        onPanResponderRelease: (_event, gestureState) => {
          const intent = getNotificationCardGestureIntent({
            dx: gestureState.dx,
            dy: gestureState.dy,
            expanded,
          });

          if (intent === 'dismiss') {
            dismissWithSwipeAnimation(gestureState.dx);
            return;
          }
          resetSwipePosition();
          if (intent === 'expand') {
            setExpanded(true);
            return;
          }
          if (intent === 'collapse') {
            setExpanded(false);
          }
        },
        onPanResponderTerminate: resetSwipePosition,
      }),
    [
      dismissWithSwipeAnimation,
      expanded,
      resetSwipePosition,
      setExpanded,
      swipeTranslateX,
    ],
  );

  return (
    <View style={styles.notificationModalSwipeRow} {...panResponder.panHandlers}>
      <RNAnimated.View
        style={[
          styles.notificationModalSwipeCard,
          { transform: [{ translateX: swipeTranslateX }] },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.notificationModalItem,
            unread ? styles.notificationModalItemUnread : null,
            expanded ? styles.notificationModalItemExpanded : null,
          ]}
          onPress={() => onPressItem(item)}
        >
          <View style={styles.notificationModalItemMainRow}>
            <View style={styles.notificationModalItemIconWrap}>
              <Feather
                name={item.actionTarget ? 'message-circle' : 'bell'}
                size={14}
                color="rgba(85,96,112,0.72)"
              />
            </View>
            <View style={styles.notificationModalItemContent}>
              <View style={styles.notificationModalItemTopRow}>
                <View style={styles.notificationModalItemTitleWrap}>
                  {unread ? <View style={styles.notificationModalUnreadDot} /> : null}
                  <AppText preset="unifiedLabel" style={styles.notificationModalItemTitle} numberOfLines={1}>
                    {item.title}
                  </AppText>
                </View>
              </View>
              <AppText preset="unifiedBody"
                style={[
                  styles.notificationModalItemBody,
                  expanded
                    ? styles.notificationModalItemBodyExpanded
                    : styles.notificationModalItemBodyCollapsed,
                ]}
                numberOfLines={expanded ? undefined : 1}
              >
                {item.body}
              </AppText>
              <View style={styles.notificationModalItemFooterRow}>
                <AppText preset="unifiedDate" style={styles.notificationModalItemDate}>
                  {formatHomeNotificationDate(item.createdAt)}
                </AppText>
                <TouchableOpacity
                  activeOpacity={0.84}
                  accessibilityLabel={expanded ? '알림 접기' : '알림 펼치기'}
                  accessibilityRole="button"
                  style={styles.notificationModalExpandButton}
                  onPress={toggleExpanded}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="rgba(85,96,112,0.72)"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </RNAnimated.View>
    </View>
  );
});

const HomeNotificationOverlay = React.memo(function HomeNotificationOverlay({
  visible,
  items,
  loading,
  errorMessage,
  topInset,
  maxHeight,
  onClose,
  onRefresh,
  onPressItem,
  onDismissItem,
  onDismissAll,
  expandedItemKeys,
  onToggleExpandedItem,
  onSetExpandedItem,
}: HomeNotificationOverlayProps) {
  const unreadCount = useMemo(
    () => items.filter(item => !item.readAt).length,
    [items],
  );
  const shouldShowScrollHint = items.length >= 4;
  const [rendered, setRendered] = useState(visible);
  const overlayProgress = useSharedValue(0);
  const finishClose = useCallback(() => {
    setRendered(false);
  }, []);
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(overlayProgress.value, [0, 1], [0, 1]),
  }));
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayProgress.value,
    transform: [
      {
        translateY: interpolate(overlayProgress.value, [0, 1], [-32, 0]),
      },
      {
        scale: interpolate(overlayProgress.value, [0, 1], [0.98, 1]),
      },
    ],
  }));
  const panelTopOffset = Math.max(topInset + 78, 92);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      overlayProgress.value = 0;
      overlayProgress.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    overlayProgress.value = withTiming(
      0,
      {
        duration: 160,
        easing: Easing.in(Easing.cubic),
      },
      finished => {
        if (finished) {
          runOnJS(finishClose)();
        }
      },
    );
  }, [finishClose, overlayProgress, visible]);

  if (!rendered) return null;

  return (
    <Modal
      visible={rendered}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.notificationOverlayRoot}>
        <Pressable
          accessibilityLabel="알림 목록 바깥 영역 닫기"
          accessibilityRole="button"
          style={styles.notificationOverlayBackdropPressable}
          onPress={onClose}
        >
          <Animated.View
            style={[
              styles.notificationOverlayBackdrop,
              backdropAnimatedStyle,
            ]}
          />
        </Pressable>

        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.notificationOverlayPanel,
            { marginTop: panelTopOffset, maxHeight },
            sheetAnimatedStyle,
          ]}
        >
          <View style={styles.notificationModalHeader}>
            <View style={styles.notificationModalTitleWrap}>
              <AppText preset="unifiedTitle" style={styles.notificationModalTitle}>알림</AppText>
              <AppText preset="unifiedBody" style={styles.notificationModalSubtitle}>
                읽지 않은 알림 {unreadCount}개
              </AppText>
            </View>
            {items.length > 0 && !loading && !errorMessage ? (
              <TouchableOpacity
                activeOpacity={0.86}
                accessibilityLabel="홈 알림 모두 치우기"
                accessibilityRole="button"
                style={styles.notificationModalClearAllButton}
                onPress={onDismissAll}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AppText preset="unifiedLabel" style={styles.notificationModalClearAllText}>
                  모두 치우기
                </AppText>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              activeOpacity={0.85}
              accessibilityLabel="알림 목록 닫기"
              accessibilityRole="button"
              style={styles.notificationModalCloseButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={18} color="rgba(11,18,32,0.82)" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.notificationModalState}>
              <ActivityIndicator />
              <AppText preset="unifiedLabel" style={styles.notificationModalStateText}>
                알림을 불러오는 중이에요.
              </AppText>
            </View>
          ) : errorMessage ? (
            <View style={styles.notificationModalState}>
              <AppText preset="unifiedTitle" style={styles.notificationModalStateTitle}>
                알림을 불러오지 못했어요
              </AppText>
              <AppText preset="unifiedLabel" style={styles.notificationModalStateText}>
                {errorMessage}
              </AppText>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.notificationModalRetryButton}
                onPress={onRefresh}
              >
                <AppText preset="unifiedLabel" style={styles.notificationModalRetryText}>
                  다시 불러오기
                </AppText>
              </TouchableOpacity>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.notificationModalState}>
              <View style={styles.notificationModalEmptyIcon}>
                <Feather name="bell" size={22} color="rgba(85,96,112,0.72)" />
              </View>
              <AppText preset="unifiedTitle" style={styles.notificationModalStateTitle}>
                아직 새 알림이 없어요
              </AppText>
              <AppText preset="unifiedLabel" style={styles.notificationModalStateText}>
                우리 아이 소식이 도착하면 여기에 알려드릴게요.
              </AppText>
            </View>
          ) : (
            <ScrollView
              style={styles.notificationModalList}
              contentContainerStyle={styles.notificationModalListContent}
              showsVerticalScrollIndicator={shouldShowScrollHint}
              persistentScrollbar={shouldShowScrollHint}
            >
              {items.map(item => (
                <HomeNotificationSwipeItem
                  key={getHomeNotificationKey(item)}
                  item={item}
                  expanded={expandedItemKeys.has(getHomeNotificationKey(item))}
                  onPressItem={onPressItem}
                  onDismissItem={onDismissItem}
                  onToggleExpanded={onToggleExpandedItem}
                  onSetExpanded={onSetExpandedItem}
                />
              ))}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
});

const HomeHeaderSection = React.memo(function HomeHeaderSection({
  greetingTitle,
  visiblePets,
  activePetId,
  petThemePrimary,
  onPressPetChip,
  onPressAddPet,
  onPressSearch,
  onPressNotifications,
  notificationUnreadCount,
}: {
  greetingTitle: string;
  visiblePets: Pet[];
  activePetId: string | null;
  petThemePrimary: string;
  onPressPetChip: (petId: string) => void;
  onPressAddPet: () => void;
  onPressSearch: () => void;
  onPressNotifications: () => void;
  notificationUnreadCount: number;
}) {
  const notificationAccessibilityLabel =
    notificationUnreadCount > 0
      ? `알림 목록 열기, 읽지 않은 알림 ${notificationUnreadCount}개`
      : '알림 목록 열기';

  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.brandLockup}>
          <AppText
            preset="unifiedTitle"
            styleOverridesPreset
            style={[styles.brandWordmark, { color: petThemePrimary }]}
          >
            NURI
          </AppText>
          <MaterialCommunityIcons
            name="paw"
            size={12}
            color={petThemePrimary}
            style={styles.brandPaw}
          />
        </View>
      </View>

      <View style={styles.headerTopRow}>
        <View style={styles.headerTextArea}>
          <AppText preset="unifiedTitle" style={[styles.title, { color: petThemePrimary }]}>
            {greetingTitle}
          </AppText>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.headerIconBtn}
            onPress={onPressSearch}
            accessibilityLabel="홈 검색"
            accessibilityRole="button"
          >
            <Feather name="search" size={18} color="rgba(11,18,32,0.75)" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.headerIconBtn}
            onPress={onPressNotifications}
            accessibilityLabel={notificationAccessibilityLabel}
            accessibilityRole="button"
          >
            <Feather name="bell" size={18} color="rgba(11,18,32,0.75)" />
            {notificationUnreadCount > 0 ? (
              <View style={styles.headerNotificationBadge}>
                <AppText preset="unifiedLabel" style={styles.headerNotificationBadgeText}>
                  {notificationUnreadCount > 99
                    ? '99+'
                    : notificationUnreadCount}
                </AppText>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.petSwitcherRow}>
        {visiblePets.map(p => (
          <PetChipButton
            key={p.id}
            petId={p.id}
            isActive={p.id === activePetId}
            imageUri={p.avatarUrl?.trim() || null}
            petThemePrimary={petThemePrimary}
            onPress={onPressPetChip}
          />
        ))}

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.petAddChip}
          onPress={onPressAddPet}
        >
          <Feather name="plus" size={20} color={petThemePrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const HeroProfileIdentity = React.memo(function HeroProfileIdentity({
  petTheme,
  selectedAvatarUri,
  profilePetName,
  titleBadge,
  topMetaLine,
  togetherDays,
  onPressPetProfileEdit,
}: {
  petTheme: ReturnType<typeof buildPetThemePalette>;
  selectedAvatarUri: string | null;
  profilePetName: string;
  titleBadge: string | null;
  topMetaLine: string | null;
  togetherDays: number | null;
  onPressPetProfileEdit: () => void;
}) {
  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.heroGearBtn}
        onPress={onPressPetProfileEdit}
      >
        <MaterialCommunityIcons
          name="cog-outline"
          size={22}
          color={petTheme.deep}
        />
      </TouchableOpacity>

      <View style={styles.heroCenter}>
        <View style={styles.heroAvatarOuter}>
          <View
            style={[
              styles.heroAvatarGlow,
              {
                backgroundColor: petTheme.glow,
                shadowColor: petTheme.primary,
              },
            ]}
          />
          <LinearGradient
            colors={petTheme.ringGradient}
            locations={[0, 0.55, 1]}
            start={{ x: 0.18, y: 0.12 }}
            end={{ x: 0.82, y: 0.9 }}
            style={[styles.heroAvatarRing, { shadowColor: petTheme.primary }]}
          >
            <View style={styles.heroAvatarRingInner}>
              <View style={styles.heroAvatarWrap}>
                {selectedAvatarUri ? (
                  <Image
                    source={{ uri: selectedAvatarUri }}
                    style={styles.heroAvatarImg}
                  />
                ) : (
                  <View style={styles.heroAvatarPlaceholder} />
                )}
              </View>
            </View>
          </LinearGradient>
        </View>

        {titleBadge ? (
          <View
            style={[
              styles.heroTitleBadge,
              {
                backgroundColor: petTheme.soft,
                borderColor: petTheme.border,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="medal-outline"
              size={14}
              color={petTheme.deep}
            />
            <AppText preset="unifiedTitle"
              styleOverridesPreset
              style={[styles.heroTitleBadgeText, { color: petTheme.deep }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {titleBadge}
            </AppText>
          </View>
        ) : null}

        <AppText
          preset="unifiedTitle"
          styleOverridesPreset
          style={[styles.heroName, { color: petTheme.deep }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {profilePetName}
        </AppText>

        {topMetaLine ? (
          <AppText
            preset="unifiedBody"
            styleOverridesPreset
            style={styles.heroMetaLine}
            numberOfLines={1}
          >
            {topMetaLine}
          </AppText>
        ) : (
          <AppText
            preset="unifiedBody"
            styleOverridesPreset
            style={styles.heroMetaMuted}
            numberOfLines={1}
          >
            아이 정보를 채우면 더 예쁘게 보여요
          </AppText>
        )}

        {togetherDays !== null ? (
          <View
            style={[
              styles.heroTogetherPill,
              { backgroundColor: petTheme.deep },
            ]}
          >
            <View style={styles.heroTogetherRow}>
              <Text style={styles.heroTogetherHeart}>
                {petTheme.heartEmoji}
              </Text>
              <AppText
                preset="unifiedBody"
                styleOverridesPreset
                style={[styles.heroTogetherText, { color: petTheme.onDeep }]}
              >
                함께한 시간{' '}
                <AppText
                  preset="unifiedBody"
                  styleOverridesPreset
                  style={[
                    styles.heroTogetherStrong,
                    { color: petTheme.onDeep },
                  ]}
                >
                  {togetherDays}
                </AppText>{' '}
                일
              </AppText>
              <Text style={styles.heroTogetherHeart}>
                {petTheme.heartEmoji}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </>
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
}) {
  return (
    <View style={styles.accordionWrap}>
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.accordionAllRow}
        onPress={onToggleAll}
      >
        <AppText preset="unifiedLabel" style={[styles.accordionAllLabel, { color: petTheme.primary }]}>
          모두펼치기
        </AppText>
        <Feather
          name={allExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={petTheme.primary}
        />
      </TouchableOpacity>

      <View style={styles.accordionItem}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.accordionHeaderRow}
          onPress={() => onToggleOne('hobby')}
        >
          <View style={styles.accordionLeft}>
            <View style={[styles.accordionIconCircle, styles.iconCircleBlue]}>
              <Text style={styles.accordionIconText}>🐾</Text>
            </View>
            <AppText preset="unifiedLabel" style={[styles.accordionTitle, styles.accTitleBlue]}>
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
                <AppText preset="unifiedLabel" key={v} style={styles.accordionBullet}>
                  • {v}
                </AppText>
              ))
            ) : (
              <AppText preset="unifiedLabel" style={styles.accordionEmpty}>• 아직 없어요</AppText>
            )}
          </View>
        ) : null}
      </View>

      <View style={styles.accordionItem}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.accordionHeaderRow}
          onPress={() => onToggleOne('like')}
        >
          <View style={styles.accordionLeft}>
            <View style={[styles.accordionIconCircle, styles.iconCircleOrange]}>
              <Text style={styles.accordionIconText}>💛</Text>
            </View>
            <AppText preset="unifiedLabel" style={[styles.accordionTitle, styles.accTitleOrange]}>
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
                <AppText preset="unifiedLabel" key={v} style={styles.accordionBullet}>
                  • {v}
                </AppText>
              ))
            ) : (
              <AppText preset="unifiedLabel" style={styles.accordionEmpty}>• 아직 없어요</AppText>
            )}
          </View>
        ) : null}
      </View>

      <View style={styles.accordionItem}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.accordionHeaderRow}
          onPress={() => onToggleOne('dislike')}
        >
          <View style={styles.accordionLeft}>
            <View style={[styles.accordionIconCircle, styles.iconCirclePink]}>
              <Text style={styles.accordionIconText}>💔</Text>
            </View>
            <AppText preset="unifiedLabel" style={[styles.accordionTitle, styles.accTitlePink]}>
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
                <AppText preset="unifiedLabel" key={v} style={styles.accordionBullet}>
                  • {v}
                </AppText>
              ))
            ) : (
              <AppText preset="unifiedLabel" style={styles.accordionEmpty}>• 아직 없어요</AppText>
            )}
          </View>
        ) : null}
      </View>

      <View style={[styles.accordionItem, { borderBottomWidth: 0 }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.accordionHeaderRow}
          onPress={() => onToggleOne('tag')}
        >
          <View style={styles.accordionLeft}>
            <View style={[styles.accordionIconCircle, styles.iconCirclePurple]}>
              <Feather name="hash" size={16} color={petTheme.primary} />
            </View>
            <AppText preset="unifiedLabel" style={[styles.accordionTitle, styles.accTitlePurple]}>
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
                  <AppText preset="unifiedLabel" style={[styles.tagText, { color: petTheme.deep }]}>
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

const HeroProfileSection = React.memo(function HeroProfileSection({
  petTheme,
  selectedAvatarUri,
  profilePetName,
  titleBadge,
  topMetaLine,
  togetherDays,
  hobbies,
  likes,
  dislikes,
  tags,
  allExpanded,
  acc,
  onPressPetProfileEdit,
  onToggleAll,
  onToggleOne,
}: {
  petTheme: ReturnType<typeof buildPetThemePalette>;
  selectedAvatarUri: string | null;
  profilePetName: string;
  titleBadge: string | null;
  topMetaLine: string | null;
  togetherDays: number | null;
  hobbies: string[];
  likes: string[];
  dislikes: string[];
  tags: string[];
  allExpanded: boolean;
  acc: Record<ProfileAccordionKey, boolean>;
  onPressPetProfileEdit: () => void;
  onToggleAll: () => void;
  onToggleOne: (key: ProfileAccordionKey) => void;
}) {
  return (
    <View style={styles.heroCard}>
      <HeroProfileIdentity
        petTheme={petTheme}
        selectedAvatarUri={selectedAvatarUri}
        profilePetName={profilePetName}
        titleBadge={titleBadge}
        topMetaLine={topMetaLine}
        togetherDays={togetherDays}
        onPressPetProfileEdit={onPressPetProfileEdit}
      />
      <HeroProfileAccordion
        petTheme={petTheme}
        hobbies={hobbies}
        likes={likes}
        dislikes={dislikes}
        tags={tags}
        allExpanded={allExpanded}
        acc={acc}
        onToggleAll={onToggleAll}
        onToggleOne={onToggleOne}
      />
    </View>
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
    const debugSourceLabel = getGuideDataSourceLabel(source);

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.tipSectionHeading}>
            <AppText preset="unifiedTitle" style={[styles.tipSectionTitle, { color: petTheme.deep }]}>
              {isMemorial
                ? '함께한 시간을 돌아보는 홈'
                : '우리 아이를 위한 추천 팁'}
            </AppText>
            {__DEV__ ? (
              <View
                style={[
                  styles.guideDebugBadge,
                  source === 'local-seed'
                    ? styles.guideDebugBadgeSeed
                    : source === 'remote'
                    ? styles.guideDebugBadgeRemote
                    : styles.guideDebugBadgeEmpty,
                ]}
              >
                <AppText preset="unifiedLabel" style={styles.guideDebugBadgeText}>
                  {debugSourceLabel}
                </AppText>
              </View>
            ) : null}
          </View>
          {!isMemorial ? (
            <TouchableOpacity activeOpacity={0.85} onPress={onPressMore}>
              <AppText preset="unifiedBody" style={[styles.sectionLink, { color: petTheme.deep }]}>
                더보기
              </AppText>
            </TouchableOpacity>
          ) : null}
        </View>

        {isMemorial ? (
          <View style={styles.emptyBox}>
            <AppText preset="unifiedTitle" style={styles.emptyTitle}>케어 추천은 잠시 쉬어둘게요</AppText>
            <AppText preset="unifiedBody" style={styles.emptyDesc}>
              함께한 시간을 조용히 돌아볼 수 있도록, 일반 케어 팁 대신 기록과
              추억을 중심으로 홈을 보여드릴게요.
            </AppText>
          </View>
        ) : loading ? (
          <View style={styles.emptyBox}>
            <AppText preset="unifiedTitle" style={styles.emptyTitle}>추천 팁을 불러오는 중이에요</AppText>
            <AppText preset="unifiedBody" style={styles.emptyDesc}>
              우리 아이 기준으로 먼저 보여드릴 가이드를 정리하고 있어요.
            </AppText>
          </View>
        ) : error ? (
          <View style={styles.emptyBox}>
            <AppText preset="unifiedTitle" style={styles.emptyTitle}>추천 팁을 불러오지 못했어요</AppText>
            <AppText preset="unifiedBody" style={styles.emptyDesc}>{error}</AppText>
          </View>
        ) : guides.length === 0 ? (
          <View style={styles.emptyBox}>
            <AppText preset="unifiedTitle" style={styles.emptyTitle}>
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
                accentColor={petTheme.primary}
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
      </View>
    );
  },
);

const TodayHomeTipSection = React.memo(function TodayHomeTipSection({
  petTheme,
}: {
  petTheme: ReturnType<typeof buildPetThemePalette>;
}) {
  return (
    <View style={styles.section}>
      <View style={[styles.todayTipCard, { backgroundColor: petTheme.tint }]}>
        <View style={styles.todayTipBadge}>
          <Feather name="map-pin" size={12} color={petTheme.primary} />
          <AppText preset="unifiedDate" style={[styles.todayTipBadgeText, { color: petTheme.primary }]}>
            {TODAY_HOME_TIP.badge}
          </AppText>
        </View>
        <AppText preset="unifiedDate" style={styles.todayTipTitle}>{TODAY_HOME_TIP.title}</AppText>
        <AppText preset="unifiedDate" style={styles.todayTipDesc}>{TODAY_HOME_TIP.description}</AppText>
      </View>
    </View>
  );
});

const TodayRecordsSection = React.memo(function TodayRecordsSection({
  recordItems,
  recordStatus,
  onPressTimeline,
  onPressRecord,
  onPressRecordItem,
  accentColor,
  accentDeepColor,
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
  accentColor: string;
  accentDeepColor: string;
}) {
  const todayRecords = useMemo(() => recordItems, [recordItems]);
  const previewItems = useMemo(
    () => buildHomeRecentPreviewItems(todayRecords),
    [todayRecords],
  );
  const isRecordBootstrapPending =
    (recordStatus === 'idle' || recordStatus === 'loading') &&
    recordItems.length === 0;

  return (
    <View style={[styles.section, styles.recentSection]}>
      <View style={styles.recentPreviewBorder}>
        <View style={styles.recentPreviewCard}>
          <View style={[styles.sectionHeaderRow, styles.recentSectionHeaderRow]}>
            <View style={styles.recentSectionTitleRow}>
              <MaterialCommunityIcons
                name="history"
                size={18}
                color={accentDeepColor}
              />
              <AppText preset="unifiedTitle" style={[styles.sectionTitle, { color: accentDeepColor }]}>
                최근 기록
              </AppText>
            </View>
            <SectionHeaderAction
              color={accentColor}
              onPress={onPressTimeline}
              accessibilityLabel="전체 기록 보기"
              textPreset="unifiedMicro"
              size="compact"
            />
          </View>
          {isRecordBootstrapPending ? (
            <View style={styles.recentEmptyState}>
              <ActivityIndicator size="small" color={accentDeepColor} />
              <AppText preset="unifiedBody" style={[styles.emptyDesc, styles.recentEmptyDesc]}>
                기록을 불러오는 중이에요.
              </AppText>
            </View>
          ) : previewItems.length === 0 ? (
            <View style={styles.recentEmptyState}>
              <AppText preset="unifiedTitle" style={styles.emptyTitle}>아직 기록이 없어요</AppText>
              <AppText preset="unifiedBody" style={[styles.emptyDesc, styles.recentEmptyDesc]}>
                첫 번째 추억을 남겨보세요.
              </AppText>

              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.recordBtn,
                  {
                    backgroundColor: accentDeepColor,
                    shadowColor: accentDeepColor,
                  },
                ]}
                onPress={onPressRecord}
              >
                <AppText preset="unifiedLabel" style={styles.recordBtnText}>기록하기</AppText>
              </TouchableOpacity>
            </View>
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
        </View>
      </View>
    </View>
  );
});

type WeeklySummaryIconName = React.ComponentProps<
  typeof MaterialCommunityIcons
>['name'];

const WeeklySummaryMetricCard = React.memo(function WeeklySummaryMetricCard({
  label,
  value,
  unit,
  icon,
  accentColor,
  iconBackground,
  onPress,
  isLoading = false,
}: {
  label: string;
  value: number | null;
  unit: string;
  icon: WeeklySummaryIconName;
  accentColor: string;
  iconBackground: string;
  onPress: () => void;
  isLoading?: boolean;
}) {
  const valueLabel =
    value === null ? (isLoading ? '불러오는 중' : '확인 필요') : `${value}${unit}`;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.weeklySummaryMetricCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${valueLabel}`}
    >
      <View style={styles.weeklySummaryMetricTopRow}>
        <View
          style={[
            styles.weeklySummaryMetricIcon,
            { backgroundColor: iconBackground },
          ]}
        >
          <MaterialCommunityIcons name={icon} size={22} color={accentColor} />
        </View>
        <View style={styles.weeklySummaryChevron}>
          <MaterialCommunityIcons
            name="chevron-right"
            size={18}
            color="#9A92AE"
          />
        </View>
      </View>

      <AppText
        preset="unifiedBody"
        styleOverridesPreset
        style={styles.weeklySummaryMetricLabel}
        numberOfLines={1}
      >
        {label}
      </AppText>
      <View style={styles.weeklySummaryMetricValueRow}>
        {value === null ? (
          isLoading ? (
            <View
              style={{
                width: 26,
                height: 14,
                borderRadius: 4,
                backgroundColor: '#F0ECF7',
              }}
            />
          ) : (
            <AppText
              preset="unifiedBody"
              styleOverridesPreset
              style={[styles.weeklySummaryMetricValue, { color: accentColor }]}
            >
              —
            </AppText>
          )
        ) : (
          <AppText
            preset="unifiedBody"
            styleOverridesPreset
            style={[
              styles.weeklySummaryMetricValue,
              {
                color: accentColor,
                fontSize: WEEKLY_SUMMARY_COUNT_FONT_SIZE,
                lineHeight: WEEKLY_SUMMARY_COUNT_FONT_SIZE + 4,
              },
            ]}
          >
            {value}
          </AppText>
        )}
        <AppText
          preset="unifiedBody"
          styleOverridesPreset
          style={[
            styles.weeklySummaryMetricUnit,
            {
              color: accentColor,
              fontSize: WEEKLY_SUMMARY_UNIT_FONT_SIZE,
              lineHeight: WEEKLY_SUMMARY_UNIT_FONT_SIZE + 5,
            },
          ]}
        >
          {unit}
        </AppText>
      </View>
    </TouchableOpacity>
  );
});

const TotalSummarySection = React.memo(function TotalSummarySection({
  records,
  accentDeepColor,
  isLoading,
  onPressWalk,
  onPressMeal,
  onPressLife,
  onPressAllRecords,
}: {
  records: MemoryRecord[] | null;
  accentDeepColor: string;
  isLoading: boolean;
  onPressWalk: () => void;
  onPressMeal: () => void;
  onPressLife: () => void;
  onPressAllRecords: () => void;
}) {
  const totalSummary = useMemo(
    () => (records ? buildTotalSummary(records) : null),
    [records],
  );
  const summaryLine = useMemo(
    () =>
      totalSummary
        ? buildTotalSummaryLine(totalSummary)
        : isLoading
          ? '전체 기록을 불러오는 중이에요.'
          : '전체 기록을 확인할 수 없어요.',
    [isLoading, totalSummary],
  );

  return (
    <View style={[styles.section, styles.weeklySummarySection]}>
      <LinearGradient
        colors={WEATHER_DAY_BORDER_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.weeklySummaryBorder}
      >
        <View style={[styles.weeklySummaryCard, { shadowColor: accentDeepColor }]}>
        <View style={styles.weeklySummaryHeader}>
          <View style={styles.weeklySummaryHeaderIcon}>
            <MaterialCommunityIcons
              name="chart-bar"
              size={22}
              color={accentDeepColor}
            />
          </View>
          <View style={styles.weeklySummaryHeaderText}>
            <AppText preset="unifiedTitle" style={[styles.weeklySummaryTitle, { color: accentDeepColor }]}>
              전체 요약
            </AppText>
            <AppText preset="unifiedBody" style={styles.weeklySummarySubtitle}>
              지금까지 남긴 기록을 한눈에 확인해보세요
            </AppText>
          </View>
        </View>

        <View style={styles.weeklySummaryGrid}>
          <View style={styles.weeklySummaryRow}>
            <WeeklySummaryMetricCard
              label="산책 기록"
              value={totalSummary?.walkCount ?? null}
              unit="기록"
              icon="paw"
              accentColor={accentDeepColor}
              iconBackground="#F4EEFF"
              onPress={onPressWalk}
              isLoading={isLoading}
            />
            <WeeklySummaryMetricCard
              label="식사 기록"
              value={totalSummary?.mealCount ?? null}
              unit="기록"
              icon="silverware-fork-knife"
              accentColor="#FF4FA3"
              iconBackground="#FFEAF3"
              onPress={onPressMeal}
              isLoading={isLoading}
            />
          </View>
          <View style={styles.weeklySummaryRow}>
            <WeeklySummaryMetricCard
              label="생활 기록"
              value={totalSummary?.lifeCount ?? null}
              unit="기록"
              icon="notebook-outline"
              accentColor="#18BFA7"
              iconBackground="#EAF9F6"
              onPress={onPressLife}
              isLoading={isLoading}
            />
            <WeeklySummaryMetricCard
              label="기록한 날"
              value={totalSummary?.recordDays ?? null}
              unit="일"
              icon="calendar-month-outline"
              accentColor="#FF8A24"
              iconBackground="#FFF3E8"
              onPress={onPressAllRecords}
              isLoading={isLoading}
            />
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.weeklySummaryInsight}
          onPress={onPressAllRecords}
          accessibilityRole="button"
          accessibilityLabel={`전체 기록 한 줄 요약, ${summaryLine}`}
        >
          <View style={styles.weeklySummaryInsightIcon}>
            <MaterialCommunityIcons
              name="creation"
              size={20}
              color="#9B6BFF"
            />
          </View>
          <View style={styles.weeklySummaryInsightText}>
            <AppText preset="unifiedLabel" style={styles.weeklySummaryInsightTitle}>
              전체 기록 한 줄 요약
            </AppText>
            <AppText preset="unifiedBody" style={styles.weeklySummaryInsightBody} numberOfLines={2}>
              {summaryLine}
            </AppText>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color="#B1A8C8"
          />
        </TouchableOpacity>

        <View style={styles.weeklySummaryFooterDivider} />
        <View style={styles.weeklySummaryFooter}>
          <View style={styles.weeklySummaryFooterItem}>
            <MaterialCommunityIcons
              name="calendar-check-outline"
              size={17}
              color={accentDeepColor}
            />
            <AppText preset="unifiedBody" style={styles.weeklySummaryFooterText} numberOfLines={1}>
              {totalSummary ? (
                <>
                  전체 기록{' '}
                  <AppText
                    preset="unifiedBody"
                    style={[
                      styles.weeklySummaryFooterValue,
                      { color: accentDeepColor },
                    ]}
                  >
                    {totalSummary.totalRecords}
                  </AppText>
                  개
                </>
              ) : isLoading ? (
                '확인 중'
              ) : (
                '확인 필요'
              )}
            </AppText>
          </View>
          <View style={styles.weeklySummaryFooterDividerVertical} />
          <View style={styles.weeklySummaryFooterItem}>
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={17}
              color={accentDeepColor}
            />
            <AppText preset="unifiedBody" style={styles.weeklySummaryFooterText} numberOfLines={1}>
              {totalSummary ? (
                <>
                  기록한 날{' '}
                  <AppText
                    preset="unifiedBody"
                    style={[
                      styles.weeklySummaryFooterValue,
                      { color: accentDeepColor },
                    ]}
                  >
                    {totalSummary.recordDays}
                  </AppText>
                  일
                </>
              ) : isLoading ? (
                '확인 중'
              ) : (
                '확인 필요'
              )}
            </AppText>
          </View>
        </View>
        </View>
      </LinearGradient>
    </View>
  );
});

const ScheduleSection = React.memo(function ScheduleSection({
  scheduleItems,
  onPressScheduleList,
  onPressScheduleCreate,
  accentColor,
  accentDeepColor,
  accentTint,
  accentBorder,
}: {
  scheduleItems: PetSchedule[];
  onPressScheduleList: () => void;
  onPressScheduleCreate: () => void;
  accentColor: string;
  accentDeepColor: string;
  accentTint: string;
  accentBorder: string;
}) {
  const weekScheduleItems = useMemo<WeeklyScheduleItem[]>(() => {
    return scheduleItems.slice(0, 7).map(buildScheduleCard);
  }, [scheduleItems]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <AppText preset="unifiedTitle" style={[styles.tipSectionTitle, { color: accentDeepColor }]}>
          일정 보기
        </AppText>
        <TouchableOpacity activeOpacity={0.85} onPress={onPressScheduleList}>
          <AppText preset="unifiedBody" style={[styles.sectionLink, { color: accentColor }]}>
            더보기
          </AppText>
        </TouchableOpacity>
      </View>

      {weekScheduleItems.length === 0 ? (
        <View style={styles.emptyBox}>
          <AppText preset="unifiedTitle" style={styles.emptyTitle}>등록된 일정이 아직 없어요</AppText>
          <AppText preset="unifiedBody" style={styles.emptyDesc}>
            오래 남겨둘 일정도 한곳에 모아두고 홈에서 가볍게 꺼내볼 수 있어요.
          </AppText>
        </View>
      ) : (
        <View style={styles.scheduleList}>
          {weekScheduleItems.map(item => (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.92}
              style={styles.scheduleCard}
              onPress={onPressScheduleList}
            >
              <View
                style={[
                  styles.scheduleDateBadge,
                  { backgroundColor: accentTint },
                ]}
              >
                <AppText preset="unifiedDate" style={styles.scheduleDateText}>{item.dateLabel}</AppText>
              </View>

              <View style={styles.scheduleBody}>
                <View
                  style={[
                    styles.scheduleIconWrap,
                    {
                      backgroundColor: accentColor,
                      borderColor: accentBorder,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={18}
                    color="#FFFFFF"
                  />
                </View>

                <View style={styles.scheduleTextCol}>
                  <AppText preset="unifiedLabel" style={styles.scheduleTitle}>{item.title}</AppText>
                  <AppText preset="unifiedBody" style={styles.scheduleSub} numberOfLines={2}>
                    {item.subtitle}
                  </AppText>
                </View>

                <Feather
                  name="chevron-right"
                  size={18}
                  color="rgba(85,96,112,0.48)"
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.recordBtn,
          { backgroundColor: accentDeepColor, shadowColor: accentDeepColor },
        ]}
        onPress={onPressScheduleCreate}
      >
        <AppText preset="unifiedLabel" style={styles.recordBtnText}>일정 추가하기</AppText>
      </TouchableOpacity>
    </View>
  );
});

function getHealthActivityKindLabel(kind: HealthActivityItem['kind']) {
  switch (kind) {
    case 'hospital':
      return '병원';
    case 'medicine':
      return '약';
    case 'checkup':
      return '검진';
    case 'vaccine':
      return '접종';
    case 'symptom':
      return '증상';
    case 'health':
    default:
      return '건강';
  }
}

const HealthRecentActivitiesSection = React.memo(
  function HealthRecentActivitiesSection({
    activityItems,
    onPressHealthReport,
    onPressActivityItem,
    accentColor,
    accentDeepColor,
  }: {
    activityItems: HealthActivityItem[];
    onPressHealthReport: () => void;
    onPressActivityItem: (ymd: string) => void;
    accentColor: string;
    accentDeepColor: string;
  }) {
    const recentActivities = useMemo(
      () => activityItems.slice(0, 5),
      [activityItems],
    );

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <AppText preset="unifiedTitle" style={[styles.tipSectionTitle, { color: accentDeepColor }]}>
            건강관리 최근 활동
          </AppText>
          <TouchableOpacity activeOpacity={0.85} onPress={onPressHealthReport}>
            <AppText preset="unifiedBody" style={[styles.sectionLink, { color: accentColor }]}>
              건강관리 열기
            </AppText>
          </TouchableOpacity>
        </View>

        {recentActivities.length === 0 ? (
          <View style={styles.emptyBox}>
            <AppText preset="unifiedTitle" style={styles.emptyTitle}>건강관리 기록이 아직 없어요</AppText>
            <AppText preset="unifiedBody" style={styles.emptyDesc}>
              병원, 약, 증상, 체중 기록은 건강관리에서 차분히 모아볼 수 있어요.
            </AppText>
          </View>
        ) : (
          <View style={styles.activityList}>
            {recentActivities.map(item => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.92}
                style={styles.activityRow}
                onPress={() => onPressActivityItem(item.ymd)}
              >
                <View
                  style={[
                    styles.activityIconWrap,
                    { backgroundColor: `${accentColor}14` },
                  ]}
                >
                  <Feather
                    name={item.iconName as never}
                    size={17}
                    color={accentColor}
                  />
                </View>

                <View style={styles.activityTextCol}>
                  <AppText preset="unifiedLabel" style={styles.activityTitle} numberOfLines={1}>
                    {item.title?.trim() ||
                      getHealthActivityKindLabel(item.kind)}
                  </AppText>
                  <AppText preset="unifiedBody" style={styles.activitySub} numberOfLines={1}>
                    {getHealthActivityKindLabel(item.kind)} · {item.subtitle}
                  </AppText>
                </View>

                <AppText preset="unifiedBody" style={styles.activityTime}>
                  {formatYmdToDots(item.ymd) ?? item.ymd}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  },
);

const MonthlyDiarySection = React.memo(function MonthlyDiarySection({
  petName,
  recordItems,
  onPressTimelineCategory,
  onPressRecord,
  onPressRecordItem,
  accentColor,
  accentDeepColor,
}: {
  petName: string;
  recordItems: MemoryRecord[];
  onPressTimelineCategory: (
    mainCategory: Exclude<TimelineMainCategory, undefined>,
    otherSubCategory?: Exclude<TimelineOtherSubCategory, undefined>,
  ) => void;
  onPressRecord: () => void;
  onPressRecordItem: (memoryId: string) => void;
  accentColor: string;
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
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <AppText preset="unifiedTitle" style={[styles.tipSectionTitle, { color: accentDeepColor }]}>
          이번 달 {petName} 일기
        </AppText>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onPressTimelineCategory('diary')}
        >
          <AppText preset="unifiedBody" style={[styles.sectionLink, { color: accentColor }]}>
            더보기
          </AppText>
        </TouchableOpacity>
      </View>

      {currentMonthDiaryEntries.length === 0 ? (
        <View style={styles.emptyBox}>
          <AppText preset="unifiedTitle" style={styles.emptyTitle}>이번 달 일기가 아직 없어요</AppText>
          <AppText preset="unifiedBody" style={styles.emptyDesc}>첫 번째 일기를 남겨보세요.</AppText>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.recordBtn,
              {
                backgroundColor: accentDeepColor,
                shadowColor: accentDeepColor,
              },
            ]}
            onPress={onPressRecord}
          >
            <AppText preset="unifiedLabel" style={styles.recordBtnText}>기록하기</AppText>
          </TouchableOpacity>
        </View>
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
    </View>
  );
});

export default function LoggedInHome() {
  // ---------------------------------------------------------
  // 0) navigation
  // ---------------------------------------------------------
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const navigation = useNavigation<Nav>();
  const isScreenFocused = useIsFocused();
  const homeScrollRef = useRef<ScrollView | null>(null);
  const shouldRestoreHomeScrollRef = useRef(true);
  const scheduleSectionOffsetRef = useRef<number | null>(null);
  const showTopButtonRef = useRef(false);
  const isReturningToTopRef = useRef(false);

  // ---------------------------------------------------------
  // 1) auth
  // ---------------------------------------------------------
  const nicknameRaw = useAuthStore(s => s.profile.nickname);
  const sessionUserId = useAuthStore(s => s.session?.user.id ?? null);

  // ---------------------------------------------------------
  // 1.5) notifications
  // ---------------------------------------------------------
  const [notificationModalVisible, setNotificationModalVisible] =
    useState(false);
  const [homeNotificationItems, setHomeNotificationItems] = useState<
    UserNotificationItem[]
  >([]);
  const [homeNotificationUnreadCount, setHomeNotificationUnreadCount] =
    useState(0);
  const [expandedHomeNotificationKeys, setExpandedHomeNotificationKeys] =
    useState<ReadonlySet<string>>(() => new Set());
  const [homeNotificationLoading, setHomeNotificationLoading] = useState(false);
  const [homeNotificationError, setHomeNotificationError] = useState<
    string | null
  >(null);

  const refreshHomeNotificationUnreadCount = useCallback(async () => {
    if (!sessionUserId) {
      setHomeNotificationUnreadCount(0);
      return;
    }

    try {
      const unreadCount = await fetchUserNotificationUnreadCount();
      setHomeNotificationUnreadCount(unreadCount);
    } catch {
      // 알림 배지는 보조 정보다. Home 본문 렌더를 실패시키지 않는다.
    }
  }, [sessionUserId]);

  const loadHomeNotifications = useCallback(async () => {
    setHomeNotificationLoading(true);
    setHomeNotificationError(null);
    try {
      if (!sessionUserId) {
        setHomeNotificationItems([]);
        setHomeNotificationUnreadCount(0);
        return;
      }
      const [items, unreadCount] = await Promise.all([
        fetchUserNotifications(30),
        fetchUserNotificationUnreadCount(),
      ]);
      const dismissedKeys = await loadHomeNotificationDismissedKeys(sessionUserId);
      setHomeNotificationItems(filterHomeVisibleNotifications(items, dismissedKeys));
      setHomeNotificationUnreadCount(unreadCount);
    } catch (error) {
      const meta = getBrandedErrorMeta(error, 'generic');
      setHomeNotificationError(meta.message);
    } finally {
      setHomeNotificationLoading(false);
    }
  }, [sessionUserId]);

  useEffect(() => {
    if (!isScreenFocused) return;
    refreshHomeNotificationUnreadCount().catch(() => {});
  }, [isScreenFocused, refreshHomeNotificationUnreadCount]);

  const openHomeNotifications = useCallback(() => {
    setExpandedHomeNotificationKeys(new Set());
    setNotificationModalVisible(true);
    loadHomeNotifications().catch(() => {});
  }, [loadHomeNotifications]);

  const closeHomeNotifications = useCallback(() => {
    setExpandedHomeNotificationKeys(new Set());
    setNotificationModalVisible(false);
  }, []);

  useEffect(() => {
    if (!notificationModalVisible) return undefined;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        closeHomeNotifications();
        return true;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [closeHomeNotifications, notificationModalVisible]);

  const onPressHomeNotificationItem = useCallback(
    async (item: UserNotificationItem) => {
      if (item.actionTarget?.kind === 'community_comment') {
        closeHomeNotifications();
        navigation.navigate('CommunityDetail', {
          postId: item.actionTarget.postId,
          commentId: item.actionTarget.commentId,
        });
      }

      if (item.readAt) return;
      const optimisticReadAt = new Date().toISOString();
      setHomeNotificationItems(prev =>
        prev.map(current =>
          current.id === item.id && current.source === item.source
            ? { ...current, readAt: optimisticReadAt }
            : current,
        ),
      );

      try {
        const unreadCount = await markUserNotificationRead({
          id: item.id,
          source: item.source,
        });
        setHomeNotificationUnreadCount(unreadCount);
      } catch (error) {
        const meta = getBrandedErrorMeta(error, 'generic');
        setHomeNotificationError(meta.message);
        setHomeNotificationItems(prev =>
          prev.map(current =>
            current.id === item.id && current.source === item.source
              ? { ...current, readAt: null }
              : current,
          ),
        );
      }
    },
    [closeHomeNotifications, navigation],
  );

  const onDismissHomeNotificationItem = useCallback(
    async (item: UserNotificationItem) => {
      if (!sessionUserId) return;
      setExpandedHomeNotificationKeys(prev => {
        const next = new Set(prev);
        next.delete(getHomeNotificationKey(item));
        return next;
      });
      setHomeNotificationItems(prev =>
        prev.filter(
          current =>
            !(current.id === item.id && current.source === item.source),
        ),
      );

      try {
        await dismissHomeNotification({
          userId: sessionUserId,
          notification: { id: item.id, source: item.source },
        });
      } catch (error) {
        const meta = getBrandedErrorMeta(error, 'generic');
        setHomeNotificationError(meta.message);
        setHomeNotificationItems(prev => {
          const exists = prev.some(
            current =>
              current.id === item.id && current.source === item.source,
          );
          return exists ? prev : [item, ...prev];
        });
        showToast({ tone: 'error', title: meta.title, message: meta.message });
      }
    },
    [sessionUserId],
  );

  const onDismissAllHomeNotifications = useCallback(async () => {
    if (!sessionUserId) return;
    if (homeNotificationItems.length === 0) return;
    const previousItems = homeNotificationItems;
    setExpandedHomeNotificationKeys(new Set());
    setHomeNotificationItems([]);
    setHomeNotificationError(null);

    try {
      await dismissHomeNotifications({
        userId: sessionUserId,
        notifications: homeNotificationItems.map(item => ({
          id: item.id,
          source: item.source,
        })),
      });
    } catch (error) {
      const meta = getBrandedErrorMeta(error, 'generic');
      setHomeNotificationError(meta.message);
      setHomeNotificationItems(previousItems);
      showToast({ tone: 'error', title: meta.title, message: meta.message });
    }
  }, [homeNotificationItems, sessionUserId]);

  const onToggleHomeNotificationExpanded = useCallback(
    (item: UserNotificationItem) => {
      animateNotificationCardLayout();
      setExpandedHomeNotificationKeys(prev => {
        const key = getHomeNotificationKey(item);
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    },
    [],
  );

  const onSetHomeNotificationExpanded = useCallback(
    (item: UserNotificationItem, expanded: boolean) => {
      animateNotificationCardLayout();
      setExpandedHomeNotificationKeys(prev => {
        const key = getHomeNotificationKey(item);
        const next = new Set(prev);
        if (expanded) {
          next.add(key);
        } else {
          next.delete(key);
        }
        return next;
      });
    },
    [],
  );

  // ---------------------------------------------------------
  // 2) pets
  // ---------------------------------------------------------
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const petLoading = usePetStore(s => s.loading);
  const selectPet = usePetStore(s => s.selectPet);

  // ---------------------------------------------------------
  // 3) derived
  // ---------------------------------------------------------
  const nickname = useMemo(() => nicknameRaw?.trim() || null, [nicknameRaw]);

  const selectedPet = useMemo(() => {
    if (pets.length === 0) return null;
    if (!selectedPetId) return pets[0];
    return pets.find(p => p.id === selectedPetId) ?? pets[0];
  }, [pets, selectedPetId]);
  const hasPets = pets.length > 0;

  const activePetId = selectedPet?.id ?? null;
  const [homeTitleBadge, setHomeTitleBadge] = useState<string | null>(null);
  const homeScrollStorageKey = useMemo(
    () => activePetId ?? 'logged-in-home-default',
    [activePetId],
  );
  const initialHomeScrollOffset = useMemo(
    () => HOME_SCROLL_OFFSET_BY_KEY.get(homeScrollStorageKey) ?? 0,
    [homeScrollStorageKey],
  );

  // ---------------------------------------------------------
  // 3.5) pet switch transition (fade + lift)
  // ---------------------------------------------------------
  const [switching, setSwitching] = useState(false);

  const OUT_OPACITY = 0.92;
  const OUT_LIFT_PX = 0.1;

  const svOpacity = useSharedValue(1);
  const svTranslateY = useSharedValue(0);

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      opacity: svOpacity.value,
      transform: [{ translateY: svTranslateY.value }],
    };
  }, []);
  const topButtonVisibility = useSharedValue(0);
  const [showTopButton, setShowTopButton] = useState(false);
  const [deferredHomeDataReady, setDeferredHomeDataReady] = useState(false);
  const topButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: topButtonVisibility.value,
    transform: [
      {
        translateY: interpolate(topButtonVisibility.value, [0, 1], [10, 0]),
      },
      {
        scale: interpolate(topButtonVisibility.value, [0, 1], [0.96, 1]),
      },
    ],
  }));

  // ---------------------------------------------------------
  // 4) records
  // ---------------------------------------------------------
  const bootstrapRecords = useRecordStore(s => s.bootstrap);
  const refreshRecords = useRecordStore(s => s.refresh);
  const replaceAllRecords = useRecordStore(s => s.replaceAll);
  const bootstrapSchedules = useScheduleStore(s => s.bootstrap);
  const replaceAllSchedules = useScheduleStore(s => s.replaceAll);

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
  }, [activePetId, isScreenFocused]);
  const healthActivityItems = useMemo(
    () => buildHealthActivityItems(recordItems, scheduleItems),
    [recordItems, scheduleItems],
  );

  useEffect(() => {
    if (!activePetId) return;
    const task = InteractionManager.runAfterInteractions(() => {
      bootstrapRecords(activePetId).catch(() => {});
    });
    return () => {
      task.cancel();
    };
  }, [bootstrapRecords, activePetId]);

  useEffect(() => {
    if (!isScreenFocused || !activePetId) return;
    if (recordStatusRef.current !== 'ready') return;

    const task = InteractionManager.runAfterInteractions(() => {
      refreshRecords(activePetId).catch(() => {});
    });

    return () => {
      task.cancel();
    };
  }, [activePetId, isScreenFocused, refreshRecords]);

  useEffect(() => {
    if (!activePetId) return;
    const task = InteractionManager.runAfterInteractions(() => {
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

        const recordState = useRecordStore.getState().getPetState(activePetId);
        if (cache.records.length > 0 && recordState.items.length === 0) {
          replaceAllRecords(activePetId, cache.records);
        }

        const scheduleState = useScheduleStore.getState().getPetState(activePetId);
        if (cache.schedules.length > 0 && scheduleState.items.length === 0) {
          replaceAllSchedules(activePetId, cache.schedules);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [activePetId, replaceAllRecords, replaceAllSchedules, sessionUserId]);

  useEffect(() => {
    if (!activePetId || !sessionUserId) return;
    if (recordStatus !== 'ready' || scheduleStatus !== 'ready') return;
    if (recordItems.length === 0 && scheduleItems.length === 0) return;

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

    const task = InteractionManager.runAfterInteractions(() => {
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

    loadCachedHomePetTitleBadge({ userId: sessionUserId, petId: activePetId })
      .then(cachedTitle => {
        if (!cancelled && cachedTitle) {
          setHomeTitleBadge(cachedTitle);
        }
      })
      .catch(() => {});

    const task = InteractionManager.runAfterInteractions(() => {
      fetchHomePetTitleBadge(activePetId)
      .then(title => {
        if (cancelled) return;
        setHomeTitleBadge(title);
        saveCachedHomePetTitleBadge({
          userId: sessionUserId,
          petId: activePetId,
          title,
        }).catch(() => {});
      })
      .catch(() => {
        if (!cancelled) setHomeTitleBadge(null);
      });
    });

    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [activePetId, isScreenFocused, sessionUserId]);

  // ---------------------------------------------------------
  // 5) HERO derived
  // ---------------------------------------------------------
  const plainPetName = useMemo(
    () =>
      selectedPet?.name?.trim() ||
      (petLoading && !hasPets ? '반려동물' : '우리 아이'),
    [hasPets, petLoading, selectedPet?.name],
  );

  const profilePetName = useMemo(
    () =>
      formatMemorialPetName(
        selectedPet?.name ?? '우리 아이',
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

  const topMetaLine = useMemo(() => {
    const parts: string[] = [];
    if (breed) parts.push(breed);
    if (ageText) parts.push(ageText);
    if (weightText) parts.push(weightText);
    if (genderText) parts.push(genderText);
    if (parts.length === 0) return null;
    return parts.join(' · ');
  }, [breed, ageText, genderText, weightText]);

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
    if (normalized.length > 0) return normalized;
    return ['#산책러버', '#간식최애', '#주인바라기'];
  }, [selectedPet?.tags]);

  const selectedAvatarUri = useMemo(
    () => selectedPet?.avatarUrl?.trim() || null,
    [selectedPet?.avatarUrl],
  );
  const visiblePets = useMemo(() => pets.slice(0, 4), [pets]);
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

  // ---------------------------------------------------------
  // 6) header text
  // ---------------------------------------------------------
  const greetingTitle = useMemo(
    () => (nickname ? `${nickname}님, 반가워요!` : '반가워요!'),
    [nickname],
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
  const onPressAddPet = useCallback(() => {
    navigation.navigate('PetCreate', { from: 'header_plus' });
  }, [navigation]);

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

  const onPressScheduleCreate = useCallback(() => {
    navigation.navigate('ScheduleCreate', {
      petId: activePetId ?? undefined,
      entrySource: 'home',
    });
  }, [activePetId, navigation]);

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
      const initialMainCategory =
        category === 'grooming' ? 'other' : category;
      navigation.navigate('RecordCreate', {
        petId: activePetId ?? undefined,
        initialMainCategory,
        initialOtherSubCategory:
          category === 'grooming' ? 'grooming' : null,
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

      if (isReturningToTopRef.current) {
        if (offsetY <= 1) {
          isReturningToTopRef.current = false;
        } else {
          if (showTopButtonRef.current) {
            showTopButtonRef.current = false;
            setShowTopButton(false);
          }
          return;
        }
      }

      HOME_SCROLL_OFFSET_BY_KEY.set(homeScrollStorageKey, offsetY);

      const shouldShow =
        offsetY >=
        resolveHomeTopButtonThreshold(scheduleSectionOffsetRef.current);
      if (showTopButtonRef.current === shouldShow) return;

      showTopButtonRef.current = shouldShow;
      setShowTopButton(shouldShow);
    },
    [homeScrollStorageKey],
  );

  const handleHomeScrollMomentumEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      isReturningToTopRef.current = false;
      const offsetY = Math.max(0, event.nativeEvent.contentOffset.y);
      const shouldShow =
        offsetY >=
        resolveHomeTopButtonThreshold(scheduleSectionOffsetRef.current);
      if (showTopButtonRef.current === shouldShow) return;

      showTopButtonRef.current = shouldShow;
      setShowTopButton(shouldShow);
    },
    [],
  );

  const restoreHomeScrollPosition = useCallback(() => {
    if (!shouldRestoreHomeScrollRef.current) return;
    const nextOffset = HOME_SCROLL_OFFSET_BY_KEY.get(homeScrollStorageKey) ?? 0;
    homeScrollRef.current?.scrollTo({ x: 0, y: nextOffset, animated: false });
    const shouldShow =
      nextOffset >=
      resolveHomeTopButtonThreshold(scheduleSectionOffsetRef.current);
    showTopButtonRef.current = shouldShow;
    setShowTopButton(shouldShow);
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
      if (switching) return;
      if (petId === activePetId) return;

      bootstrapRecords(petId).catch(() => {});
      bootstrapSchedules(petId).catch(() => {});

      setSwitching(true);

      svOpacity.value = withTiming(OUT_OPACITY, {
        duration: 140,
        easing: Easing.out(Easing.cubic),
      });

      svTranslateY.value = withTiming(
        OUT_LIFT_PX,
        { duration: 140, easing: Easing.out(Easing.cubic) },
        finished => {
          if (!finished) {
            runOnJS(setSwitching)(false);
            return;
          }

          runOnJS(selectPet)(petId);

          svOpacity.value = withTiming(1, {
            duration: 180,
            easing: Easing.out(Easing.cubic),
          });
          svTranslateY.value = withTiming(
            0,
            { duration: 180, easing: Easing.out(Easing.cubic) },
            () => runOnJS(setSwitching)(false),
          );
        },
      );
    },
    [
      switching,
      activePetId,
      bootstrapRecords,
      bootstrapSchedules,
      selectPet,
      svOpacity,
      svTranslateY,
      OUT_OPACITY,
      OUT_LIFT_PX,
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

  // ---------------------------------------------------------
  // 8) Accordion state (pet 변경 시 초기화)
  // ---------------------------------------------------------
  const [acc, setAcc] = useState<Record<ProfileAccordionKey, boolean>>({
    hobby: false,
    like: false,
    dislike: false,
    tag: false,
  });

  useEffect(() => {
    setAcc({ hobby: false, like: false, dislike: false, tag: false });
  }, [activePetId]);

  const allExpanded = useMemo(
    () => acc.hobby && acc.like && acc.dislike && acc.tag,
    [acc.hobby, acc.like, acc.dislike, acc.tag],
  );

  const onToggleAll = useCallback(() => {
    setAcc(prev => {
      const next = !(prev.hobby && prev.like && prev.dislike && prev.tag);
      return { hobby: next, like: next, dislike: next, tag: next };
    });
  }, []);

  const onToggleOne = useCallback((key: ProfileAccordionKey) => {
    setAcc(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const noopSearchHeaderAction = useCallback(() => {
    // 검색 헤더는 아직 홈 구조 정리 트랙에서 연결할 기능이므로 layout만 유지한다.
  }, []);

  const onPressGuideList = useCallback(() => {
    navigation.navigate('GuideList', { entrySource: 'home' });
  }, [navigation]);

  const handleScheduleSectionLayout = useCallback(
    (event: { nativeEvent: { layout: { y: number } } }) => {
      scheduleSectionOffsetRef.current = event.nativeEvent.layout.y;
      const restoredOffset =
        HOME_SCROLL_OFFSET_BY_KEY.get(homeScrollStorageKey) ?? 0;
      const shouldShow =
        restoredOffset >=
        resolveHomeTopButtonThreshold(event.nativeEvent.layout.y);
      showTopButtonRef.current = shouldShow;
      setShowTopButton(shouldShow);
    },
    [homeScrollStorageKey],
  );

  const handlePressTop = useCallback(() => {
    isReturningToTopRef.current = true;
    HOME_SCROLL_OFFSET_BY_KEY.set(homeScrollStorageKey, 0);
    showTopButtonRef.current = false;
    setShowTopButton(false);
    cancelAnimation(topButtonVisibility);
    topButtonVisibility.value = 0;
    homeScrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
  }, [homeScrollStorageKey, topButtonVisibility]);

  useEffect(() => {
    cancelAnimation(topButtonVisibility);
    topButtonVisibility.value = withTiming(showTopButton ? 1 : 0, {
      duration: showTopButton ? 220 : 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [showTopButton, topButtonVisibility]);

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
  const topButtonBottom = useMemo(
    () =>
      Math.max(
        insets.bottom + HOME_TOP_BUTTON_BOTTOM_OFFSET,
        HOME_TOP_BUTTON_MIN_BOTTOM,
      ),
    [insets.bottom],
  );
  const notificationOverlayMaxHeight = useMemo(
    () => Math.round(windowHeight * 0.74),
    [windowHeight],
  );

  // ---------------------------------------------------------
  // 10) render
  // ---------------------------------------------------------
  return (
    <Screen style={styles.screen}>
      <ScrollView
        ref={homeScrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(132, insets.bottom + 108) },
        ]}
        contentOffset={{ x: 0, y: initialHomeScrollOffset }}
        onContentSizeChange={restoreHomeScrollPosition}
        onScroll={handleHomeScroll}
        onMomentumScrollEnd={handleHomeScrollMomentumEnd}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeaderSection
          greetingTitle={greetingTitle}
          visiblePets={visiblePets}
          activePetId={activePetId}
          petThemePrimary={petTheme.primary}
          onPressPetChip={onPressPetChip}
          onPressAddPet={onPressAddPet}
          onPressSearch={noopSearchHeaderAction}
          onPressNotifications={openHomeNotifications}
          notificationUnreadCount={homeNotificationUnreadCount}
        />

        {/* Fade container */}
        <Animated.View style={animatedContentStyle}>
          <HomeWeatherSection
            weather={weatherGuide}
            locationLabel={weatherGuideState.locationLabel}
            petName={selectedPet?.name}
            accentColor={petTheme.primary}
            onPress={onPressWeatherInsight}
          />

          <HeroProfileSection
            petTheme={petTheme}
            selectedAvatarUri={selectedAvatarUri}
            profilePetName={profilePetName}
            titleBadge={homeTitleBadge}
            topMetaLine={topMetaLine}
            togetherDays={togetherDays}
            hobbies={hobbies}
            likes={likes}
            dislikes={dislikes}
            tags={tags}
            allExpanded={allExpanded}
            acc={acc}
            onPressPetProfileEdit={onPressPetProfileEdit}
            onToggleAll={onToggleAll}
            onToggleOne={onToggleOne}
          />

          <FrequentRecordsSection
            petTheme={petTheme}
            records={recordItems}
            recordStatus={recordStatus}
            onPressCategory={onPressFrequentRecord}
            onPressAll={onPressTimeline}
          />

          <TodayPhotoSection
            activePetId={activePetId}
            recordItems={recordItems}
            recordStatus={recordStatus}
            onPressRecordItem={onPressRecordItem}
            onPressRecord={onPressRecord}
            accentColor={petTheme.deep}
          />

          <CommunitySection
            isFocused={isScreenFocused}
            accentColor={petTheme.primary}
            accentTint={petTheme.tint}
            accentBorder={petTheme.border}
            onPressPost={onPressCommunityPost}
            onPressAll={onPressCommunityAll}
          />

          <TodayRecordsSection
            recordItems={recordItems}
            recordStatus={recordStatus}
            onPressTimeline={onPressTimeline}
            onPressRecord={onPressRecord}
            onPressRecordItem={onPressRecordItem}
            accentColor={petTheme.primary}
            accentDeepColor={petTheme.deep}
          />

          <TotalSummarySection
            records={
              totalSummaryState.petId === activePetId
                ? totalSummaryState.records
                : null
            }
            accentDeepColor={petTheme.deep}
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

          <RecommendationTipsSection
            guides={homeGuideState.guides}
            loading={homeGuideState.loading}
            error={homeGuideState.error}
            isMemorial={isMemorialPet(selectedPet?.deathDate)}
            source={homeGuideState.source}
            sourceReason={homeGuideState.sourceReason}
            petTheme={petTheme}
            onPressGuide={onPressGuideDetail}
            onPressMore={onPressGuideList}
          />

          <View onLayout={handleScheduleSectionLayout}>
            <ScheduleSection
              scheduleItems={visibleScheduleItems}
              onPressScheduleList={onPressScheduleList}
              onPressScheduleCreate={onPressScheduleCreate}
              accentColor={petTheme.primary}
              accentDeepColor={petTheme.deep}
              accentTint={petTheme.tint}
              accentBorder={petTheme.border}
            />
          </View>

          <HealthRecentActivitiesSection
            activityItems={healthActivityItems}
            onPressHealthReport={() => onPressHealthReport()}
            onPressActivityItem={onPressHealthReport}
            accentColor={petTheme.primary}
            accentDeepColor={petTheme.deep}
          />

          <TodayHomeTipSection petTheme={petTheme} />

          <MonthlyDiarySection
            petName={plainPetName}
            recordItems={recordItems}
            onPressTimelineCategory={onPressTimelineCategory}
            onPressRecord={onPressRecord}
            onPressRecordItem={onPressRecordItem}
            accentColor={petTheme.primary}
            accentDeepColor={petTheme.deep}
          />
        </Animated.View>
      </ScrollView>

      <Animated.View
        pointerEvents={showTopButton ? 'auto' : 'none'}
        style={[
          styles.topButtonWrap,
          {
            bottom: topButtonBottom,
          },
          topButtonAnimatedStyle,
        ]}
      >
        <Pressable
          android_ripple={{ color: `${petTheme.onPrimary}18` }}
          style={[
            styles.topButton,
            {
              backgroundColor: '#FFFFFF',
              borderColor: petTheme.border,
            },
          ]}
          onPress={handlePressTop}
          accessibilityLabel="맨 위로"
          accessibilityRole="button"
        >
          <Feather name="arrow-up" size={18} color={petTheme.primary} />
        </Pressable>
      </Animated.View>

      <HomeNotificationOverlay
        visible={notificationModalVisible}
        items={homeNotificationItems}
        loading={homeNotificationLoading}
        errorMessage={homeNotificationError}
        topInset={insets.top}
        maxHeight={notificationOverlayMaxHeight}
        onClose={closeHomeNotifications}
        onRefresh={loadHomeNotifications}
        onPressItem={onPressHomeNotificationItem}
        onDismissItem={onDismissHomeNotificationItem}
        onDismissAll={onDismissAllHomeNotifications}
        expandedItemKeys={expandedHomeNotificationKeys}
        onToggleExpandedItem={onToggleHomeNotificationExpanded}
        onSetExpandedItem={onSetHomeNotificationExpanded}
      />
    </Screen>
  );
}
