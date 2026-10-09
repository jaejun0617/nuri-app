import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Feather from '../../components/icons/NuriFeatherIcon';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import { SEASON_CTA } from '../../app/theme/ctaPalette';
import { SectionHeaderAction } from '../../app/ui/SectionHeaderAction';
import WeightTrendChart from '../../components/health/WeightTrendChart';
import HealthVisualQaControl from '../../components/health/HealthVisualQaControl';
import SeasonalAmbientBackground from '../../components/common/SeasonalAmbientBackground';
import { HomeFrostedGlass } from '../../components/home/HomeFrostedGlass';
import {
  blockHealthVisualQaMutation,
  useHealthVisualQa,
} from '../../components/health/healthVisualQa';
import WeightLogEntrySheet from '../../components/health/WeightLogEntrySheet';
import AppNavigationToolbar from '../../components/navigation/AppNavigationToolbar';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import { useHealthReportMonth } from '../../hooks/useHealthReportMonth';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  addMonthsToHealthReportMonthKey,
  normalizeHealthReportMonthKey,
} from '../../services/health-report/month';
import {
  buildWeightSummary,
  buildWeightTimelineItems,
  groupHealthActivitiesByYmd,
  type HealthActivityItem,
  type HealthReportTabKey,
  type WeightDeltaDirection,
  type WeightTimelineItem,
} from '../../services/health-report/viewModel';
import {
  buildQuickToggleReminderMinutes,
  formatReminderMinutesSummary,
} from '../../services/schedules/form';
import {
  captureScheduleNotificationLifecycle,
  clearScheduleNotification,
  getScheduleNotificationSyncFeedback,
  upsertScheduleNotification,
} from '../../services/schedules/notifications';
import type {
  PetWeightLog,
  PetWeightLogMutationResult,
} from '../../services/supabase/petWeightLogs';
import {
  fetchScheduleById,
  updateSchedule,
} from '../../services/supabase/schedules';
import { useAuthStore } from '../../store/authStore';
import {
  resolveSelectedPetId,
  usePetStore,
  type Pet,
} from '../../store/petStore';
import { formatPetAgeLabelFromBirthDate } from '../../services/pets/age';
import {
  deriveCanonicalPetSpeciesKey,
  getPetSpeciesDefinition,
} from '../../services/pets/species';
import { useScheduleStore } from '../../store/scheduleStore';
import { openMoreDrawer, showToast } from '../../store/uiStore';
import { getKstYmd, humanizeMonthKey } from '../../utils/date';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'HealthReport'>;
type HealthReportRoute = RouteProp<RootStackParamList, 'HealthReport'>;

const TAB_ITEMS: Array<{
  key: HealthReportTabKey;
  label: string;
}> = [
  { key: 'records', label: '기록' },
  { key: 'weight', label: '체중' },
  { key: 'report', label: '인사이트' },
];

const DATE_ITEM_WIDTH = 56;

function getPetContextDetail(pet: Pet): string {
  const species = getPetSpeciesDefinition(
    deriveCanonicalPetSpeciesKey({ ...pet, species: pet.species }),
  );
  const generalLabels = [
    species.defaultDisplayName,
    species.defaultSubtypeKey,
    species.speciesLabel,
    ...species.aliases,
  ].map(label => label.toLowerCase());
  // Prefer the saved display label, with the legacy breed as a non-generic fallback.
  const breed = [pet.speciesDisplayName, pet.breed]
    .map(value => value?.trim())
    .find(value => value && !generalLabels.includes(value.toLowerCase()));
  return [formatPetAgeLabelFromBirthDate(pet.birthDate), breed]
    .filter(Boolean)
    .join(' · ');
}

function HealthText({
  preset = 'unifiedBody',
  style,
  ...props
}: React.ComponentProps<typeof AppText>) {
  const compact = preset === 'unifiedMeta' || preset === 'unifiedMicro';
  const title = preset === 'unifiedTitle';
  return (
    <AppText
      {...props}
      preset={preset}
      styleOverridesPreset
      style={[
        {
          fontSize: compact ? 13 : title ? 18 : preset === 'display' ? 36 : 16,
          lineHeight: compact
            ? 19
            : title
            ? 26
            : preset === 'display'
            ? 44
            : 24,
          letterSpacing: 0,
        },
        style,
      ]}
    />
  );
}

type HealthWriteActionKey = 'hospital-record' | 'medicine-record' | 'hospital' | 'medicine' | 'symptom' | 'weight';

const HEALTH_WRITE_ACTIONS: Array<{
  key: HealthWriteActionKey;
  title: string;
  description: string;
  icon: string;
}> = [
  { key: 'hospital-record', title: '병원·진단 기록', description: '진료 내용과 병원비를 기록해요', icon: 'file-text' },
  { key: 'medicine-record', title: '약·복약 기록', description: '복약 내용과 약값을 기록해요', icon: 'file-text' },
  {
    key: 'hospital',
    title: '병원·검진 일정',
    description: '진료, 검진, 접종처럼 날짜가 중요한 건강 일정을 남겨요',
    icon: 'calendar',
  },
  {
    key: 'medicine',
    title: '투약·복약 알림',
    description: '챙겨야 할 약 시간을 건강관리 일정으로 남겨요',
    icon: 'clock',
  },
  {
    key: 'symptom',
    title: '증상/컨디션',
    description: '기침, 식욕, 컨디션처럼 오늘의 변화를 기록해요',
    icon: 'activity',
  },
  {
    key: 'weight',
    title: '체중',
    description: '몸무게와 메모를 같은 기준으로 저장해요',
    icon: 'trending-up',
  },
];

type HealthReportMonthData = NonNullable<
  ReturnType<typeof useHealthReportMonth>['data']
>;
type InsightDensityItem = {
  id: string;
  ymd: string;
};
type InsightMetricKey = 'activity' | 'activeDays' | 'weight' | 'topKind';
type InsightDetailRow = {
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
};

function formatWeightKg(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--';
  }
  return `${Number(value.toFixed(2))}kg`;
}

function formatDeltaText(
  direction: WeightDeltaDirection,
  deltaKg: number | null,
  deltaRate: number | null,
) {
  if (deltaKg === null || deltaRate === null) {
    return '비교 기준이 아직 충분하지 않아요';
  }

  const prefix = direction === 'up' ? '+' : direction === 'down' ? '-' : '';
  const icon =
    direction === 'up'
      ? 'arrow-up'
      : direction === 'down'
      ? 'arrow-down'
      : 'minus';
  const verb =
    direction === 'up'
      ? '늘었어요'
      : direction === 'down'
      ? '줄었어요'
      : '유지됐어요';

  return {
    icon,
    text: `${prefix}${Number(Math.abs(deltaKg).toFixed(2))}kg (${Math.abs(
      deltaRate,
    ).toFixed(1)}%) ${verb}`,
  };
}

function getDeltaColor(
  _direction: WeightDeltaDirection,
  theme: ReturnType<typeof useTheme>,
) {
  // A change in weight is a measurement, not a health judgment.
  return theme.colors.textMuted;
}

function compareWeightLogs(lhs: PetWeightLog, rhs: PetWeightLog) {
  const measuredCompare = lhs.measuredOn.localeCompare(rhs.measuredOn);
  if (measuredCompare !== 0) return measuredCompare;

  const createdCompare = lhs.createdAt.localeCompare(rhs.createdAt);
  if (createdCompare !== 0) return createdCompare;

  return lhs.id.localeCompare(rhs.id);
}

function isLogInMonth(
  log: PetWeightLog,
  month: HealthReportMonthData['bounds'],
) {
  return (
    log.measuredOn >= month.startYmd && log.measuredOn < month.endExclusiveYmd
  );
}

function applyCommittedWeightMutation(
  current: HealthReportMonthData,
  result: PetWeightLogMutationResult,
): HealthReportMonthData {
  const changedLog = result.changedLog;
  let weightLogs = current.weightLogs;

  if (changedLog) {
    if (
      result.action === 'upsert' &&
      isLogInMonth(changedLog, current.bounds)
    ) {
      weightLogs = [
        ...weightLogs.filter(log => log.id !== changedLog.id),
        changedLog,
      ].sort(compareWeightLogs);
    }

    if (result.action === 'delete') {
      weightLogs = weightLogs.filter(log => log.id !== changedLog.id);
    }
  }

  const weightTimeline = buildWeightTimelineItems({
    logs: weightLogs,
    previousLog: current.previousWeightLog,
  });
  const weightSummary = buildWeightSummary({
    logs: weightLogs,
    previousLog: current.previousWeightLog,
    latestSnapshot: result.latestSnapshot,
    fallbackLatestWeightKg: result.latestSnapshot?.latestWeightKg ?? null,
  });

  return {
    ...current,
    weightLogs,
    latestWeightSnapshot: result.latestSnapshot,
    weightTimeline,
    weightSummary,
  };
}

function applyCommittedScheduleMutation(
  current: HealthReportMonthData,
  input: {
    scheduleId: string;
    reminderMinutes?: number[];
    completedAt?: string | null;
    remove?: boolean;
  },
): HealthReportMonthData {
  const activityItems = input.remove
    ? current.activityItems.filter(
        item =>
          !(item.source === 'schedule' && item.scheduleId === input.scheduleId),
      )
    : current.activityItems.map(item =>
        item.source === 'schedule' && item.scheduleId === input.scheduleId
          ? {
              ...item,
              reminderMinutes: input.reminderMinutes ?? item.reminderMinutes,
              completedAt:
                input.completedAt !== undefined
                  ? input.completedAt
                  : item.completedAt,
            }
          : item,
      );

  return {
    ...current,
    activityItems,
    groupedActivities: groupHealthActivitiesByYmd(activityItems),
    latestActivityYmd: activityItems[0]?.ymd ?? null,
  };
}

function ActivityCard({
  item,
  accentColor,
  onPress,
  onToggleReminder,
  reminderBusy,
}: {
  item: HealthActivityItem;
  accentColor: string;
  onPress: () => void;
  onToggleReminder?: (item: HealthActivityItem) => void;
  reminderBusy?: boolean;
}) {
  const theme = useTheme();
  const reminderEnabled =
    item.source === 'schedule' && (item.reminderMinutes?.length ?? 0) > 0;
  const toggleAnimation = useRef(
    new Animated.Value(reminderEnabled ? 1 : 0),
  ).current;

  useEffect(() => {
    Animated.timing(toggleAnimation, {
      toValue: reminderEnabled ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reminderEnabled, toggleAnimation]);

  const translateX = toggleAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 26],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.subtitle}, 상세 보기`}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: 'transparent',
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.iconWrap}>
        <NuriSemanticIcon
          family="feather"
          color={accentColor}
          name={item.iconName}
          size={16}
        />
      </View>
      <View style={styles.cardTextWrap}>
        <HealthText preset="unifiedBody" weight="600">
          {item.title}
        </HealthText>
        <HealthText
          preset="unifiedMeta"
          color={theme.colors.textMuted}
          numberOfLines={1}
        >
          {item.subtitle}
        </HealthText>
        {item.source === 'schedule' ? (
          <HealthText
            preset="unifiedMeta"
            color={theme.colors.textMuted}
            numberOfLines={1}
          >
            {formatReminderMinutesSummary(item.reminderMinutes)}
          </HealthText>
        ) : null}
      </View>
      <View style={styles.activityRightColumn}>
        {item.source === 'schedule' && onToggleReminder ? (
          <Pressable
            accessibilityRole="switch"
            hitSlop={{ top: 9, bottom: 9, left: 4, right: 4 }}
            accessibilityLabel={reminderEnabled ? '알림 끄기' : '알림 켜기'}
            accessibilityState={{
              checked: reminderEnabled,
              disabled: reminderBusy,
            }}
            disabled={reminderBusy}
            onPress={event => {
              event.stopPropagation();
              onToggleReminder(item);
            }}
            style={[
              styles.reminderToggleButton,
              reminderEnabled
                ? {
                    backgroundColor: `${accentColor}18`,
                    borderColor: `${accentColor}30`,
                    opacity: reminderBusy ? 0.5 : 1,
                  }
                : {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                    opacity: reminderBusy ? 0.5 : 1,
                  },
            ]}
          >
            <Animated.View
              style={[
                styles.reminderToggleThumb,
                {
                  backgroundColor: reminderEnabled
                    ? accentColor
                    : theme.colors.textMuted,
                  transform: [{ translateX }],
                },
              ]}
            >
              <Feather
                color="#FFFFFF"
                name={reminderEnabled ? 'bell' : 'bell-off'}
                size={12}
              />
            </Animated.View>
          </Pressable>
        ) : null}
        {item.completedAt ? (
          <View style={styles.activityStatusBadge}>
            <HealthText preset="unifiedMeta" style={styles.activityStatusText}>
              완료됨
            </HealthText>
          </View>
        ) : null}
      </View>
      <Feather color={theme.colors.textMuted} name="chevron-right" size={18} />
    </TouchableOpacity>
  );
}

function getKindLabel(kind: HealthActivityItem['kind']) {
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

function buildTopKindLabel(items: HealthActivityItem[]) {
  if (items.length === 0) return '아직 기록 없음';

  const counts = items.reduce<Record<HealthActivityItem['kind'], number>>(
    (acc, item) => ({
      ...acc,
      [item.kind]: (acc[item.kind] ?? 0) + 1,
    }),
    {
      symptom: 0,
      hospital: 0,
      medicine: 0,
      checkup: 0,
      vaccine: 0,
      health: 0,
    },
  );
  const [topKind, topCount] = Object.entries(counts).sort(
    ([, left], [, right]) => right - left,
  )[0] as [HealthActivityItem['kind'], number];

  return `${getKindLabel(topKind)} ${topCount}건`;
}

function getTopKind(items: HealthActivityItem[]) {
  if (items.length === 0) return null;

  const counts = items.reduce<Record<HealthActivityItem['kind'], number>>(
    (acc, item) => {
      acc[item.kind] = (acc[item.kind] ?? 0) + 1;
      return acc;
    },
    {
      symptom: 0,
      hospital: 0,
      medicine: 0,
      checkup: 0,
      vaccine: 0,
      health: 0,
    },
  );
  return Object.entries(counts).sort(
    ([, left], [, right]) => right - left,
  )[0]?.[0] as HealthActivityItem['kind'] | undefined;
}

function buildInsightDensityItems(
  activityItems: HealthActivityItem[],
  weightTimeline: WeightTimelineItem[],
): InsightDensityItem[] {
  return [
    ...activityItems.map(item => ({
      id: item.id,
      ymd: item.ymd,
    })),
    ...weightTimeline.map(item => ({
      id: `weight:${item.id}`,
      ymd: item.measuredOn,
    })),
  ].filter(item => item.ymd.length > 0);
}

function InsightMetricCard({
  label,
  value,
  helper,
  accentColor,
  onPress,
}: {
  label: string;
  value: string;
  helper: string;
  accentColor: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}, 상세 보기`}
      onPress={onPress}
      style={[
        styles.insightMetricCard,
        fontScale >= 1.3 ? styles.metricFullWidth : null,
        {
          backgroundColor: 'transparent',
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.insightMetricLabelRow}>
        <HealthText
          preset="unifiedBody"
          color={theme.colors.textMuted}
          style={styles.cardTextWrap}
        >
          {label}
        </HealthText>
        <View
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <Feather
            name="chevron-right"
            size={16}
            color={theme.colors.textMuted}
          />
        </View>
      </View>
      <HealthText preset="unifiedTitle" color={accentColor}>
        {value}
      </HealthText>
      <HealthText preset="unifiedMeta" color={theme.colors.textMuted}>
        {helper}
      </HealthText>
    </TouchableOpacity>
  );
}

function ActivityDensityGraph({
  dateItems,
  densityItems,
  accentColor,
  focusYmd,
}: {
  dateItems: string[];
  densityItems: InsightDensityItem[];
  accentColor: string;
  focusYmd: string;
}) {
  const theme = useTheme();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const countsByYmd = useMemo(
    () =>
      densityItems.reduce<Record<string, number>>((acc, item) => {
        acc[item.ymd] = (acc[item.ymd] ?? 0) + 1;
        return acc;
      }, {}),
    [densityItems],
  );
  const maxCount = useMemo(
    () =>
      dateItems.reduce((acc, ymd) => Math.max(acc, countsByYmd[ymd] ?? 0), 0),
    [countsByYmd, dateItems],
  );

  useEffect(() => {
    const focusIndex = dateItems.indexOf(focusYmd);
    if (focusIndex < 0) return;

    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        x: Math.max(0, focusIndex * 29 - 120),
        animated: true,
      });
    }, 80);

    return () => clearTimeout(timer);
  }, [dateItems, focusYmd]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.insightGraphContent}
    >
      {dateItems.map(ymd => {
        const count = countsByYmd[ymd] ?? 0;
        const ratio = maxCount <= 0 ? 0 : count / maxCount;
        const barHeight = ratio * 76;
        return (
          <View
            key={ymd}
            style={styles.insightGraphItem}
            accessibilityLabel={`${ymd.slice(
              8,
              10,
            )}일 건강관리 기록 ${count}건`}
          >
            <View style={styles.insightGraphTrack}>
              <HealthText preset="unifiedMeta" color={theme.colors.textMuted}>
                {count || ''}
              </HealthText>
              <View
                style={[
                  styles.insightGraphBar,
                  {
                    height: barHeight,
                    backgroundColor:
                      count > 0 ? accentColor : theme.colors.border,
                    opacity: count > 0 ? 1 : 0.62,
                  },
                ]}
              />
            </View>
            <HealthText preset="unifiedMeta" color={theme.colors.textMuted}>
              {ymd.slice(8, 10)}
            </HealthText>
          </View>
        );
      })}
    </ScrollView>
  );
}

export default function HealthReportScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<HealthReportRoute>();
  const theme = useTheme();
  const season = useEffectiveSeason();
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const upsertPet = usePetStore(s => s.upsertPet);
  const sessionUserId = useAuthStore(s => s.session?.user?.id ?? null);
  const dateStripRef = useRef<FlatList<string> | null>(null);

  const resolvedPetId = useMemo(
    () => resolveSelectedPetId(pets, selectedPetId, route.params?.petId),
    [pets, route.params?.petId, selectedPetId],
  );
  const pet = useMemo(
    () => pets.find(item => item.id === resolvedPetId) ?? null,
    [pets, resolvedPetId],
  );
  const healthPalette = SEASON_CTA[season];
  const onPressBack = useEntryAwareBackAction({
    entrySource: route.params?.entrySource,
    onHome: () => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
      });
    },
    onMore: () => {
      navigation.goBack();
      requestAnimationFrame(() => {
        openMoreDrawer();
      });
    },
    onFallback: () => {
      navigation.goBack();
    },
  });
  const todayYmd = getKstYmd();
  const currentMonthKey = normalizeHealthReportMonthKey(undefined);
  const focusYmd = route.params?.focusYmd;
  const [activeTab, setActiveTab] = useState<HealthReportTabKey>(
    route.params?.initialTab ?? 'records',
  );
  const [monthKey, setMonthKey] = useState(
    focusYmd
      ? normalizeHealthReportMonthKey(focusYmd.slice(0, 7))
      : currentMonthKey,
  );
  const [selectedYmd, setSelectedYmd] = useState(focusYmd ?? todayYmd);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingLog, setEditingLog] = useState<PetWeightLog | null>(null);
  const [writeActionSheetVisible, setWriteActionSheetVisible] = useState(false);
  const [selectedInsightMetric, setSelectedInsightMetric] =
    useState<InsightMetricKey | null>(null);
  const [togglingReminderIds, setTogglingReminderIds] = useState<string[]>([]);

  const realMonthQuery = useHealthReportMonth({
    petId: pet?.id ?? null,
    monthKey,
    fallbackLatestWeightKg: pet?.weightKg ?? null,
  });
  const visualQa = useHealthVisualQa(monthKey);
  const monthQuery = visualQa.data
    ? { ...realMonthQuery, data: visualQa.data, loading: false, error: null }
    : realMonthQuery;
  const dateItems = useMemo(
    () => monthQuery.data?.dateItems ?? [],
    [monthQuery.data?.dateItems],
  );
  const isCurrentMonth = monthKey === currentMonthKey;
  const selectedActivities =
    monthQuery.data?.groupedActivities[selectedYmd] ?? [];

  useEffect(() => {
    if (!focusYmd) return;
    setMonthKey(normalizeHealthReportMonthKey(focusYmd.slice(0, 7)));
    setSelectedYmd(focusYmd);
  }, [focusYmd]);

  useEffect(() => {
    if (!dateItems.length) return;

    const nextSelected =
      focusYmd && dateItems.includes(focusYmd)
        ? focusYmd
        : isCurrentMonth && dateItems.includes(todayYmd)
        ? todayYmd
        : monthQuery.data?.latestActivityYmd ?? dateItems[dateItems.length - 1];
    setSelectedYmd(nextSelected);
  }, [
    dateItems,
    focusYmd,
    isCurrentMonth,
    monthQuery.data?.latestActivityYmd,
    todayYmd,
  ]);

  useEffect(() => {
    if (!dateItems.length || activeTab !== 'records') return;
    const selectedIndex = Math.max(0, dateItems.indexOf(selectedYmd));
    const timer = setTimeout(() => {
      dateStripRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }, 60);

    return () => clearTimeout(timer);
  }, [activeTab, dateItems, selectedYmd]);

  const openWeightCreate = useCallback(() => {
    if (blockHealthVisualQaMutation()) return;
    setEditingLog(null);
    setSheetVisible(true);
  }, []);

  const openHealthWriteActions = useCallback(() => {
    setWriteActionSheetVisible(true);
  }, []);

  const closeHealthWriteActions = useCallback(() => {
    setWriteActionSheetVisible(false);
  }, []);

  const handleBottomNavigationStart = useCallback(() => {
    setWriteActionSheetVisible(false);
    setSheetVisible(false);
    setEditingLog(null);
  }, []);

  const handleOpenMoreFromBottomNavigation = useCallback(() => {
    navigation.navigate('AppTabs', { screen: 'HomeTab' });
    requestAnimationFrame(() => {
      openMoreDrawer();
    });
  }, [navigation]);

  const handleHealthWriteAction = useCallback(
    (action: HealthWriteActionKey) => {
      if (blockHealthVisualQaMutation()) return;
      if (!pet) return;
      setWriteActionSheetVisible(false);

      if (action === 'weight') {
        requestAnimationFrame(openWeightCreate);
        return;
      }

      if (action === 'symptom' || action === 'hospital-record' || action === 'medicine-record') {
        navigation.navigate('RecordCreate', {
          petId: pet.id,
          initialMainCategory: 'health',
          initialHealthRecordKind: action === 'hospital-record' ? 'hospital' : action === 'medicine-record' ? 'medicine' : 'condition',
          returnTo: {
            tab: 'HealthReport',
            petId: pet.id,
            initialTab: 'records',
          },
        });
        return;
      }

      const medicineAction = action === 'medicine';
      navigation.navigate('ScheduleCreate', {
        petId: pet.id,
        entrySource: 'health_report',
        initialTitle: medicineAction ? '투약/복약 기록' : '병원/검진 기록',
        initialCategory: 'health',
        initialHealthSubCategory: medicineAction ? 'medicine' : 'hospital',
        initialIconKey: medicineAction ? 'pill' : 'medical-bag',
        returnTo: {
          screen: 'HealthReport',
          initialTab: 'records',
          entrySource: route.params?.entrySource,
        },
      });
    },
    [navigation, openWeightCreate, pet, route.params?.entrySource],
  );

  const handleWeightCommitted = useCallback(
    (result: PetWeightLogMutationResult) => {
      if (pet && sessionUserId) {
        upsertPet(
          {
            ...pet,
            weightKg: result.latestSnapshot?.latestWeightKg ?? null,
          },
          { userId: sessionUserId },
        );
      }

      if (pet) {
        const activeMonthQueryKey = [
          'health-report',
          'month',
          pet.id,
          monthQuery.monthKey,
        ] as const;

        queryClient.setQueryData<HealthReportMonthData>(
          activeMonthQueryKey,
          current =>
            current ? applyCommittedWeightMutation(current, result) : current,
        );
        queryClient
          .invalidateQueries({
            queryKey: ['health-report', 'month', pet.id],
          })
          .catch(() => {});
      }
      setEditingLog(null);
    },
    [monthQuery.monthKey, pet, queryClient, sessionUserId, upsertPet],
  );

  const handleActivityPress = useCallback(
    (item: HealthActivityItem) => {
      if (blockHealthVisualQaMutation(item.id)) return;
      if (!pet) return;

      if (item.source === 'memory' && item.memoryId) {
        navigation.navigate('AppTabs', {
          screen: 'TimelineTab',
          params: {
            screen: 'RecordDetail',
            params: {
              petId: pet.id,
              memoryId: item.memoryId,
              entrySource: 'health_report',
            },
          },
        });
        return;
      }

      if (item.source === 'schedule' && item.scheduleId) {
        navigation.navigate('ScheduleDetail', {
          petId: pet.id,
          scheduleId: item.scheduleId,
          entrySource: 'health_report',
          returnTo: {
            screen: 'HealthReport',
            initialTab: 'records',
            entrySource: route.params?.entrySource,
          },
        });
      }
    },
    [navigation, pet, route.params?.entrySource],
  );

  const handleToggleScheduleReminder = useCallback(
    async (item: HealthActivityItem) => {
      if (blockHealthVisualQaMutation(item.id)) return;
      if (!pet || item.source !== 'schedule' || !item.scheduleId) return;

      const notificationLifecycle = captureScheduleNotificationLifecycle();
      const busyId = item.scheduleId;
      setTogglingReminderIds(current => [...current, busyId]);

      try {
        const schedule = await fetchScheduleById(item.scheduleId);
        const nextReminderMinutes =
          (schedule.reminderMinutes?.length ?? 0) > 0
            ? []
            : buildQuickToggleReminderMinutes(schedule.startsAt);

        if (
          nextReminderMinutes.length === 0 &&
          (schedule.reminderMinutes?.length ?? 0) === 0
        ) {
          Alert.alert(
            '알림을 바로 켤 수 없어요',
            '일정 시간이 너무 가까워 기본 알림 시점을 만들 수 없어요. 일정 상세에서 더 짧은 간격으로 다시 설정해 주세요.',
          );
          return;
        }
        await updateSchedule({
          scheduleId: schedule.id,
          petId: schedule.petId,
          title: schedule.title,
          note: schedule.note,
          startsAt: schedule.startsAt,
          endsAt: schedule.endsAt,
          allDay: schedule.allDay,
          category: schedule.category,
          subCategory: schedule.subCategory,
          iconKey: schedule.iconKey,
          colorKey: schedule.colorKey,
          reminderMinutes: nextReminderMinutes,
          repeatRule: schedule.repeatRule,
          repeatInterval: schedule.repeatInterval,
          repeatUntil: schedule.repeatUntil,
          linkedMemoryId: schedule.linkedMemoryId,
          completedAt: schedule.completedAt,
          source: schedule.source,
          externalCalendarId: schedule.externalCalendarId,
          externalEventId: schedule.externalEventId,
          syncStatus: schedule.syncStatus,
        });

        if (nextReminderMinutes.length === 0) {
          const notificationResult = clearScheduleNotification(schedule.id);
          const notificationFeedback =
            getScheduleNotificationSyncFeedback(notificationResult);
          if (notificationFeedback) showToast(notificationFeedback);
        } else {
          const notificationResult = await upsertScheduleNotification(
            {
              id: schedule.id,
              petId: schedule.petId,
              title: schedule.title,
              note: schedule.note,
              startsAt: schedule.startsAt,
              repeatRule: schedule.repeatRule,
              reminderMinutes: nextReminderMinutes,
              completedAt: schedule.completedAt,
            },
            notificationLifecycle,
          );
          const notificationFeedback =
            getScheduleNotificationSyncFeedback(notificationResult);
          if (notificationFeedback) showToast(notificationFeedback);
        }

        if (Platform.OS === 'android') {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        queryClient.setQueryData<HealthReportMonthData>(
          ['health-report', 'month', pet.id, monthQuery.monthKey],
          current =>
            current
              ? applyCommittedScheduleMutation(current, {
                  scheduleId: schedule.id,
                  reminderMinutes: nextReminderMinutes,
                })
              : current,
        );
        useScheduleStore
          .getState()
          .refresh(pet.id)
          .catch(() => {});
      } catch (error) {
        Alert.alert(
          '알림 설정 실패',
          error instanceof Error
            ? error.message
            : '알림 설정을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.',
        );
      } finally {
        setTogglingReminderIds(current =>
          current.filter(candidate => candidate !== busyId),
        );
      }
    },
    [monthQuery.monthKey, pet, queryClient],
  );

  const insightActivityItems = useMemo(
    () => monthQuery.data?.activityItems ?? [],
    [monthQuery.data?.activityItems],
  );
  const insightWeightTimeline = useMemo(
    () => monthQuery.data?.weightTimeline ?? [],
    [monthQuery.data?.weightTimeline],
  );
  const insightDensityItems = useMemo(
    () => buildInsightDensityItems(insightActivityItems, insightWeightTimeline),
    [insightActivityItems, insightWeightTimeline],
  );
  const insightActiveDays = useMemo(
    () => new Set(insightDensityItems.map(item => item.ymd)).size,
    [insightDensityItems],
  );
  const topInsightKind = useMemo(
    () => getTopKind(insightActivityItems),
    [insightActivityItems],
  );
  const selectedInsightDetail = useMemo(() => {
    if (!selectedInsightMetric) return null;

    if (selectedInsightMetric === 'activity') {
      return {
        title: '건강 이벤트',
        helper: '이번 달 병원, 약, 증상 기록',
        rows: insightActivityItems.map<InsightDetailRow>(item => ({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          meta: item.completedAt
            ? `완료됨 · ${item.ymd.replace(/-/g, '.')}`
            : item.ymd.replace(/-/g, '.'),
        })),
      };
    }

    if (selectedInsightMetric === 'activeDays') {
      const countsByYmd = insightDensityItems.reduce<Record<string, number>>(
        (acc, item) => {
          acc[item.ymd] = (acc[item.ymd] ?? 0) + 1;
          return acc;
        },
        {},
      );
      return {
        title: '기록한 날',
        helper: '건강 이벤트와 체중 기록이 남은 날짜',
        rows: Object.entries(countsByYmd)
          .sort(([left], [right]) => right.localeCompare(left))
          .map<InsightDetailRow>(([ymd, count]) => ({
            id: ymd,
            title: ymd.replace(/-/g, '.'),
            subtitle: `${count}건의 건강관리 기록`,
          })),
      };
    }

    if (selectedInsightMetric === 'weight') {
      return {
        title: '체중 기록',
        helper: '이번 달 체중 체크 내역',
        rows: insightWeightTimeline
          .slice()
          .reverse()
          .map<InsightDetailRow>(item => ({
            id: item.id,
            title: formatWeightKg(item.weightKg),
            subtitle: item.note?.trim() || '메모 없이 저장된 체중 기록',
            meta: item.measuredOn.replace(/-/g, '.'),
          })),
      };
    }

    const topKind = topInsightKind;
    return {
      title: '자주 남긴 기록',
      helper: topKind
        ? `${getKindLabel(topKind)} 기록 모아보기`
        : '이번 달 중심 이벤트',
      rows: topKind
        ? insightActivityItems
            .filter(item => item.kind === topKind)
            .map<InsightDetailRow>(item => ({
              id: item.id,
              title: item.title,
              subtitle: item.subtitle,
              meta: item.ymd.replace(/-/g, '.'),
            }))
        : [],
    };
  }, [
    insightActivityItems,
    insightDensityItems,
    insightWeightTimeline,
    selectedInsightMetric,
    topInsightKind,
  ]);

  if (!pet) {
    return (
      <SafeAreaView
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        edges={['top']}
      >
        <SeasonalAmbientBackground season={season} />
        <View style={styles.header}>
          <View style={styles.headerSideSlot}>
            <TouchableOpacity
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="뒤로가기"
              onPress={onPressBack}
              style={styles.headerBackButton}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Feather color="#102033" name="arrow-left" size={20} />
            </TouchableOpacity>
          </View>
          <HealthText
            typographyRole="screenTitle"
            preset="unifiedTitle"
            style={styles.headerTitle}
          >
            건강관리
          </HealthText>
          <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
        </View>

        <View style={styles.centerEmpty}>
          <HealthText preset="unifiedTitle">
            먼저 아이 프로필이 필요해요
          </HealthText>
          <HealthText
            preset="unifiedBody"
            color={theme.colors.textMuted}
            style={styles.centerEmptyText}
          >
            건강 기록과 체중 리포트는 아이 프로필을 기준으로 묶어 보여줍니다.
          </HealthText>
          <CtaButton
            role="primary"
            activeOpacity={0.9}
            onPress={() => navigation.navigate('PetCreate', { from: 'cta' })}
            style={styles.primaryCta}
          >
            <CtaText preset="unifiedLabel">아이 프로필 등록하기</CtaText>
          </CtaButton>
        </View>
        <AppNavigationToolbar
          activeKey="more"
          onBeforeNavigate={handleBottomNavigationStart}
          onPressMore={handleOpenMoreFromBottomNavigation}
        />
      </SafeAreaView>
    );
  }

  const deltaMeta = formatDeltaText(
    monthQuery.data?.weightSummary.direction ?? 'same',
    monthQuery.data?.weightSummary.deltaKg ?? null,
    monthQuery.data?.weightSummary.deltaRate ?? null,
  );
  const petContextDetail = getPetContextDetail(pet);

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <SeasonalAmbientBackground season={season} />
      <View style={styles.header}>
        <View style={styles.headerSideSlot}>
          <TouchableOpacity
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            onPress={onPressBack}
            style={styles.headerBackButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Feather color="#102033" name="arrow-left" size={20} />
          </TouchableOpacity>
        </View>

        <HealthText
          typographyRole="screenTitle"
          preset="unifiedTitle"
          style={styles.headerTitle}
        >
          건강관리
        </HealthText>

        <View style={[styles.headerSideSlot, styles.headerSideSlotRight]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="건강 기록하기"
            activeOpacity={0.7}
            onPress={openHealthWriteActions}
            style={styles.headerActionButton}
          >
            <HealthText
              preset="unifiedBody"
              weight="600"
              color={healthPalette.primary}
            >
              기록하기
            </HealthText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.petContext}>
        <NuriSemanticIcon
          family="feather"
          name="heart"
          size={18}
          color={healthPalette.primary}
        />
        <View style={styles.petIdentity}>
          <HealthText weight="600" style={styles.petName}>
            {pet.name}
          </HealthText>
          {petContextDetail ? (
            <HealthText
              testID="health-pet-detail"
              preset="unifiedMeta"
              color={theme.colors.textSecondary}
              style={styles.petDetail}
            >
              {petContextDetail}
            </HealthText>
          ) : null}
        </View>
        <HealthVisualQaControl />
      </View>

      <View
        style={[styles.tabRow, { borderColor: theme.colors.border }]}
        accessibilityRole="tablist"
      >
        {TAB_ITEMS.map(item => {
          const active = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              testID={`health-tab-${item.key}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setActiveTab(item.key)}
              activeOpacity={0.7}
              style={[
                styles.tabButton,
                { borderColor: active ? healthPalette.primary : 'transparent' },
              ]}
            >
              <HealthText
                weight={active ? '700' : '500'}
                color={active ? healthPalette.primary : theme.colors.textMuted}
              >
                {item.label}
              </HealthText>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.monthRow}>
        <TouchableOpacity
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="이전 달"
          onPress={() =>
            setMonthKey(prev => addMonthsToHealthReportMonthKey(prev, -1))
          }
          style={[styles.monthArrow, { borderColor: theme.colors.border }]}
        >
          <Feather
            color={theme.colors.textPrimary}
            name="chevron-left"
            size={18}
          />
        </TouchableOpacity>

        <View style={styles.monthLabelWrap}>
          <HealthText preset="unifiedTitle">
            {humanizeMonthKey(monthKey)}
          </HealthText>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="다음 달"
          accessibilityState={{ disabled: monthKey === currentMonthKey }}
          disabled={monthKey === currentMonthKey}
          onPress={() =>
            setMonthKey(prev => addMonthsToHealthReportMonthKey(prev, 1))
          }
          style={[
            styles.monthArrow,
            {
              borderColor: theme.colors.border,
              opacity: monthKey === currentMonthKey ? 0.35 : 1,
            },
          ]}
        >
          <Feather
            color={theme.colors.textPrimary}
            name="chevron-right"
            size={18}
          />
        </TouchableOpacity>
      </View>

      {activeTab === 'records' ? (
        <View style={styles.dateStripSection}>
          <FlatList
            ref={dateStripRef}
            horizontal
            data={dateItems}
            keyExtractor={item => item}
            showsHorizontalScrollIndicator={false}
            getItemLayout={(_data, index) => ({
              length: DATE_ITEM_WIDTH,
              offset: DATE_ITEM_WIDTH * index,
              index,
            })}
            onScrollToIndexFailed={({ index }) => {
              setTimeout(() => {
                dateStripRef.current?.scrollToOffset({
                  offset: DATE_ITEM_WIDTH * index,
                  animated: true,
                });
              }, 120);
            }}
            contentContainerStyle={styles.dateStripContent}
            renderItem={({ item }) => {
              const active = selectedYmd === item;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item}
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelectedYmd(item)}
                  style={[
                    styles.dateChip,
                    {
                      backgroundColor: active
                        ? healthPalette.primary
                        : 'transparent',
                      borderColor: 'transparent',
                    },
                  ]}
                >
                  <HealthText
                    preset="unifiedMeta"
                    color={active ? '#FFFFFF' : theme.colors.textMuted}
                  >
                    {
                      ['일', '월', '화', '수', '목', '금', '토'][
                        new Date(`${item}T12:00:00+09:00`).getUTCDay()
                      ]
                    }
                  </HealthText>
                  <HealthText
                    preset="unifiedMeta"
                    color={active ? '#FFFFFF' : theme.colors.textPrimary}
                    weight="700"
                  >
                    {Number(item.slice(8, 10))}
                  </HealthText>
                </Pressable>
              );
            }}
          />
        </View>
      ) : null}

      {monthQuery.loading ? (
        <View style={styles.centerEmpty}>
          <HealthText preset="unifiedBody">
            건강 리포트를 정리하고 있어요.
          </HealthText>
        </View>
      ) : monthQuery.error ? (
        <View style={styles.centerEmpty}>
          <HealthText preset="unifiedTitle">
            리포트를 불러오지 못했어요
          </HealthText>
          <HealthText
            preset="unifiedBody"
            color={theme.colors.textMuted}
            style={styles.centerEmptyText}
          >
            {monthQuery.error}
          </HealthText>
          <CtaButton
            role="primary"
            activeOpacity={0.9}
            onPress={() => monthQuery.refetch()}
            style={[styles.primaryCta, {}]}
          >
            <CtaText preset="unifiedLabel">다시 불러오기</CtaText>
          </CtaButton>
        </View>
      ) : activeTab === 'records' ? (
        <ScrollView
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom, 24) + 90 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionHeading}>
            <HealthText weight="600">
              {selectedYmd.replace(/-/g, '.')}
            </HealthText>
            <HealthText preset="unifiedMeta" color={theme.colors.textMuted}>
              {selectedActivities.length}개 기록
            </HealthText>
          </View>

          {selectedActivities.length === 0 ? (
            <View style={styles.emptySection}>
              <HealthText preset="unifiedTitle">
                이날의 건강 기록이 없어요
              </HealthText>
              <HealthText
                preset="unifiedBody"
                color={theme.colors.textMuted}
                style={styles.centerEmptyText}
              >
                병원, 약, 컨디션을 기록해 보세요.
              </HealthText>
              <CtaButton
                role="primary"
                activeOpacity={0.9}
                onPress={openHealthWriteActions}
                style={[styles.primaryCta, {}]}
              >
                <CtaText preset="unifiedLabel">건강 기록하기</CtaText>
              </CtaButton>
            </View>
          ) : (
            selectedActivities.map(item => (
              <ActivityCard
                key={item.id}
                item={item}
                accentColor={healthPalette.primary}
                onPress={() => handleActivityPress(item)}
                onToggleReminder={handleToggleScheduleReminder}
                reminderBusy={
                  !!item.scheduleId &&
                  togglingReminderIds.includes(item.scheduleId)
                }
              />
            ))
          )}
        </ScrollView>
      ) : activeTab === 'weight' ? (
        <ScrollView
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom, 24) + 110 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <HomeFrostedGlass
            season={season}
            testID="health-weight-summary-glass"
            style={[styles.glassPanel, styles.weightSummaryCard]}
          >
            <View
              style={[
                styles.weightSummaryTopRow,
                fontScale >= 1.3 && styles.stackedSummary,
              ]}
            >
              <View style={styles.cardTextWrap}>
                <HealthText preset="unifiedMeta" color={theme.colors.textMuted}>
                  최근 측정 체중
                </HealthText>
                <HealthText preset="display">
                  {formatWeightKg(
                    monthQuery.data?.weightSummary.latestWeightKg,
                  )}
                </HealthText>
                <HealthText preset="unifiedMeta" color={theme.colors.textMuted}>
                  {monthQuery.data?.weightSummary.latestMeasuredOn?.replace(
                    /-/g,
                    '.',
                  ) ?? '측정 날짜 없음'}
                </HealthText>
              </View>
              <SectionHeaderAction
                label="체중 기록"
                color={healthPalette.primary}
                onPress={openWeightCreate}
                accessibilityLabel="체중 기록 추가"
              />
            </View>
            <HealthText preset="unifiedMeta" color={theme.colors.textMuted}>
              이전 측정 대비
            </HealthText>
            <View style={styles.weightDeltaRow}>
              {typeof deltaMeta === 'string' ? (
                <HealthText preset="unifiedMeta" color={theme.colors.textMuted}>
                  {deltaMeta}
                </HealthText>
              ) : (
                <>
                  <Feather
                    color={getDeltaColor(
                      monthQuery.data?.weightSummary.direction ?? 'same',
                      theme,
                    )}
                    name={deltaMeta.icon as never}
                    size={16}
                  />
                  <HealthText
                    preset="unifiedMeta"
                    color={getDeltaColor(
                      monthQuery.data?.weightSummary.direction ?? 'same',
                      theme,
                    )}
                  >
                    {deltaMeta.text}
                  </HealthText>
                </>
              )}
            </View>
            <WeightTrendChart
              logs={monthQuery.data?.weightTimeline ?? []}
              accentColor={theme.colors.textPrimary}
            />
          </HomeFrostedGlass>

          <HomeFrostedGlass
            season={season}
            testID="health-weight-history-glass"
            style={styles.glassPanel}
          >
            <View style={styles.sectionHeading}>
              <HealthText preset="unifiedTitle">측정 이력</HealthText>
              <HealthText preset="unifiedMeta" color={theme.colors.textMuted}>
                {monthQuery.data?.weightTimeline.length ?? 0}회
              </HealthText>
            </View>
            {(monthQuery.data?.weightTimeline.length ?? 0) === 0 ? (
              <View style={styles.emptySection}>
                <HealthText preset="unifiedTitle">
                  첫 체중 기록을 기다리고 있어요
                </HealthText>
                <HealthText
                  preset="unifiedBody"
                  color={theme.colors.textMuted}
                  style={styles.centerEmptyText}
                >
                  측정한 몸무게와 날짜를 남겨 주세요.
                </HealthText>
                <CtaButton
                  role="primary"
                  activeOpacity={0.9}
                  onPress={openWeightCreate}
                  style={[styles.primaryCta, {}]}
                >
                  <CtaText preset="unifiedLabel">첫 몸무게 남기기</CtaText>
                </CtaButton>
              </View>
            ) : (
              monthQuery.data?.weightTimeline
                .slice()
                .reverse()
                .map(log => {
                  const itemDelta = formatDeltaText(
                    log.direction,
                    log.deltaKg,
                    log.deltaRate,
                  );
                  const itemDeltaColor =
                    typeof itemDelta === 'string'
                      ? theme.colors.textMuted
                      : getDeltaColor(log.direction, theme);
                  return (
                    <TouchableOpacity
                      key={log.id}
                      activeOpacity={0.9}
                      accessibilityRole="button"
                      accessibilityLabel={`${log.measuredOn}, ${formatWeightKg(
                        log.weightKg,
                      )}, 체중 기록 수정`}
                      onPress={() => {
                        if (blockHealthVisualQaMutation(log.id)) return;
                        setEditingLog(log);
                        setSheetVisible(true);
                      }}
                      style={[
                        styles.card,
                        {
                          backgroundColor: 'transparent',
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <View style={styles.cardTextWrap}>
                        <HealthText preset="unifiedBody">
                          {log.measuredOn.replace(/-/g, '.')}
                        </HealthText>
                        <HealthText preset="unifiedMeta" color={itemDeltaColor}>
                          {typeof itemDelta === 'string'
                            ? itemDelta
                            : itemDelta.text}
                        </HealthText>
                        {log.note ? (
                          <HealthText
                            preset="unifiedBody"
                            color={theme.colors.textMuted}
                            numberOfLines={1}
                          >
                            {log.note}
                          </HealthText>
                        ) : null}
                      </View>
                      <View style={styles.weightValueWrap}>
                        <HealthText
                          preset="unifiedTitle"
                          color={
                            log.direction === 'same'
                              ? theme.colors.textPrimary
                              : itemDeltaColor
                          }
                        >
                          {formatWeightKg(log.weightKg)}
                        </HealthText>
                        <Feather
                          color={theme.colors.textMuted}
                          name="edit-2"
                          size={15}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })
            )}
          </HomeFrostedGlass>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom, 24) + 110 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <HomeFrostedGlass
            season={season}
            testID="health-insight-summary-glass"
            style={styles.glassPanel}
          >
            <HealthText preset="unifiedTitle" style={styles.insightHeading}>
              이번 달 요약
            </HealthText>

            <View
              style={[
                styles.insightMetricGrid,
                fontScale >= 1.3 && styles.metricsStacked,
              ]}
            >
              <InsightMetricCard
                label="건강 기록"
                value={`${insightActivityItems.length}건`}
                helper="병원, 약, 증상 기록"
                accentColor={healthPalette.primary}
                onPress={() => setSelectedInsightMetric('activity')}
              />
              <InsightMetricCard
                label="기록한 날"
                value={`${insightActiveDays}일`}
                helper="체중 기록 포함"
                accentColor={healthPalette.primary}
                onPress={() => setSelectedInsightMetric('activeDays')}
              />
              <InsightMetricCard
                label="체중 기록"
                value={`${insightWeightTimeline.length}회`}
                helper="월간 체중 체크"
                accentColor={healthPalette.primary}
                onPress={() => setSelectedInsightMetric('weight')}
              />
              <InsightMetricCard
                label="자주 남긴 기록"
                value={buildTopKindLabel(insightActivityItems)}
                helper="가장 많이 남긴 분류"
                accentColor={healthPalette.primary}
                onPress={() => setSelectedInsightMetric('topKind')}
              />
            </View>
          </HomeFrostedGlass>

          <HomeFrostedGlass
            season={season}
            testID="health-insight-dates-glass"
            style={[styles.glassPanel, styles.insightPanel]}
          >
            <View style={styles.insightPanelHeader}>
              <View style={styles.cardTextWrap}>
                <HealthText preset="unifiedTitle">날짜별 기록</HealthText>
                <HealthText preset="unifiedBody" color={theme.colors.textMuted}>
                  날짜별 건강 이벤트와 체중 기록 수
                </HealthText>
              </View>
              <Feather
                color={healthPalette.primary}
                name="bar-chart-2"
                size={18}
              />
            </View>
            <ActivityDensityGraph
              dateItems={monthQuery.data?.dateItems ?? []}
              densityItems={insightDensityItems}
              accentColor={healthPalette.primary}
              focusYmd={todayYmd}
            />
          </HomeFrostedGlass>

          <HomeFrostedGlass
            season={season}
            testID="health-insight-weight-glass"
            style={[styles.glassPanel, styles.insightPanel]}
          >
            <View style={styles.insightPanelHeader}>
              <View style={styles.cardTextWrap}>
                <HealthText preset="unifiedTitle">체중 변화</HealthText>
                <HealthText preset="unifiedBody" color={theme.colors.textMuted}>
                  최신{' '}
                  {formatWeightKg(
                    monthQuery.data?.weightSummary.latestWeightKg,
                  )}
                </HealthText>
              </View>
              <Feather
                color={getDeltaColor(
                  monthQuery.data?.weightSummary.direction ?? 'same',
                  theme,
                )}
                name={
                  monthQuery.data?.weightSummary.direction === 'up'
                    ? 'arrow-up'
                    : monthQuery.data?.weightSummary.direction === 'down'
                    ? 'arrow-down'
                    : 'minus'
                }
                size={18}
              />
            </View>
            {insightWeightTimeline.length > 0 ? (
              <WeightTrendChart
                logs={insightWeightTimeline}
                accentColor={theme.colors.textPrimary}
              />
            ) : (
              <HealthText preset="unifiedMeta" color={theme.colors.textMuted}>
                이달에 측정한 체중이 없어요.
              </HealthText>
            )}
          </HomeFrostedGlass>

          <CtaButton
            role="primary"
            activeOpacity={0.9}
            onPress={openHealthWriteActions}
            style={[styles.primaryCta, { marginTop: 24 }]}
          >
            <CtaText preset="unifiedLabel">건강 기록 더하기</CtaText>
          </CtaButton>
        </ScrollView>
      )}

      <AppNavigationToolbar
        activeKey="more"
        onBeforeNavigate={handleBottomNavigationStart}
        onPressMore={handleOpenMoreFromBottomNavigation}
      />

      <WeightLogEntrySheet
        visible={sheetVisible}
        petId={pet.id}
        petName={pet.name}
        accentColor={healthPalette.primary}
        entrySource="health_report"
        initialLog={editingLog}
        initialWeightKg={pet.weightKg ?? null}
        initialMeasuredOn={selectedYmd}
        onClose={() => {
          setSheetVisible(false);
          setEditingLog(null);
        }}
        onCommitted={handleWeightCommitted}
      />

      <Modal
        visible={selectedInsightDetail !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedInsightMetric(null)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setSelectedInsightMetric(null)}
        >
          <Pressable
            onPress={event => event.stopPropagation()}
            style={[
              styles.insightDetailSheet,
              {
                paddingBottom: Math.max(insets.bottom, 18),
                backgroundColor: theme.colors.surfaceElevated,
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeaderRow}>
              <View style={styles.cardTextWrap}>
                <HealthText preset="unifiedTitle">
                  {selectedInsightDetail?.title ?? '인사이트'}
                </HealthText>
                <HealthText preset="unifiedBody" color={theme.colors.textMuted}>
                  {selectedInsightDetail?.helper ?? '이번 달 건강관리 기록'}
                </HealthText>
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="인사이트 닫기"
                onPress={() => setSelectedInsightMetric(null)}
                style={styles.sheetCloseButton}
              >
                <Feather color={theme.colors.textMuted} name="x" size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.insightDetailList}
              contentContainerStyle={styles.insightDetailListContent}
              showsVerticalScrollIndicator={false}
            >
              {(selectedInsightDetail?.rows.length ?? 0) > 0 ? (
                selectedInsightDetail?.rows.map(row => (
                  <View
                    key={row.id}
                    style={[
                      styles.insightDetailItem,
                      { borderColor: theme.colors.border },
                    ]}
                  >
                    <View style={styles.cardTextWrap}>
                      <HealthText preset="unifiedBody">{row.title}</HealthText>
                      <HealthText
                        preset="unifiedBody"
                        color={theme.colors.textMuted}
                      >
                        {row.subtitle}
                      </HealthText>
                    </View>
                    {row.meta ? (
                      <HealthText
                        preset="unifiedMeta"
                        color={theme.colors.textMuted}
                      >
                        {row.meta}
                      </HealthText>
                    ) : null}
                  </View>
                ))
              ) : (
                <View style={styles.insightDetailEmpty}>
                  <HealthText
                    preset="unifiedBody"
                    color={theme.colors.textMuted}
                  >
                    이번 달에는 아직 표시할 기록이 없어요.
                  </HealthText>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={writeActionSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={closeHealthWriteActions}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={closeHealthWriteActions}
        >
          <Pressable
            onPress={event => event.stopPropagation()}
            style={[
              styles.writeActionSheet,
              {
                paddingBottom: Math.max(insets.bottom, 18),
                backgroundColor: theme.colors.surfaceElevated,
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeaderRow}>
              <View style={styles.sheetHeaderTextStack}>
                <HealthText preset="unifiedTitle">건강 기록하기</HealthText>
                <HealthText preset="unifiedBody" color={theme.colors.textMuted}>
                  병원, 약, 증상, 체중을 한 곳에서 남겨요.
                </HealthText>
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="건강 기록 선택 닫기"
                onPress={closeHealthWriteActions}
                style={styles.sheetCloseButton}
              >
                <Feather color={theme.colors.textMuted} name="x" size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.writeActionList}
              showsVerticalScrollIndicator={false}
            >
              {HEALTH_WRITE_ACTIONS.map(action => (
                <TouchableOpacity
                  key={action.key}
                  accessibilityRole="button"
                  activeOpacity={0.7}
                  onPress={() => handleHealthWriteAction(action.key)}
                  style={[
                    styles.writeActionItem,
                    { borderColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.writeActionItemText}>
                    <HealthText weight="600">{action.title}</HealthText>
                    <HealthText
                      preset="unifiedMeta"
                      color={theme.colors.textMuted}
                    >
                      {action.description}
                    </HealthText>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerSideSlot: {
    width: 84,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSideSlotRight: {
    alignItems: 'flex-end',
  },
  headerBackButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionButton: {
    minHeight: 48,
    paddingHorizontal: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#0B1220',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  petContext: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
  },
  petIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: 8,
    rowGap: 2,
  },
  petName: { maxWidth: '100%', flexShrink: 1 },
  petDetail: { maxWidth: '100%', flexShrink: 1 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  monthArrow: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabelWrap: {
    flex: 1,
    alignItems: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 10,
    borderBottomWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dateStripSection: {
    paddingBottom: 12,
  },
  dateStripContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dateChip: {
    width: 48,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 52,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  contentContainer: {
    paddingHorizontal: 20,
    gap: 0,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
    paddingBottom: 8,
  },
  stackedSummary: { flexDirection: 'column', alignItems: 'flex-start' },
  card: {
    minHeight: 72,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 0,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 24,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  activityStatusBadge: {
    flexShrink: 0,
    borderRadius: 8,
    backgroundColor: 'rgba(34,197,94,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activityStatusText: {
    color: '#15803D',
    fontWeight: '800',
  },
  activityRightColumn: {
    alignItems: 'flex-end',
    gap: 8,
  },
  reminderToggleButton: {
    width: 54,
    height: 30,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 3,
    position: 'relative',
  },
  reminderToggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 3,
    top: 3,
  },
  centerEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  centerEmptyText: {
    marginTop: 8,
    marginBottom: 18,
    textAlign: 'center',
  },
  primaryCta: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 8,
  },
  glassPanel: { padding: 14, marginTop: 12 },
  weightSummaryCard: { gap: 6 },
  weightSummaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  weightDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  weightValueWrap: {
    maxWidth: '40%',
    alignItems: 'flex-end',
    gap: 6,
  },
  insightMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: '4%',
  },
  insightHeading: { paddingBottom: 4 },
  insightMetricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricsStacked: { flexDirection: 'column' },
  metricFullWidth: { flexBasis: 'auto', width: '100%', flexGrow: 0 },
  insightMetricCard: {
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 0,
    paddingVertical: 14,
    gap: 6,
  },
  insightDetailSheet: {
    maxHeight: '72%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
  },
  insightDetailList: {
    maxHeight: 360,
  },
  insightDetailListContent: {
    gap: 10,
    paddingBottom: 4,
  },
  insightDetailItem: {
    minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 0,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  insightDetailEmpty: {
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  insightPanel: { gap: 12 },
  insightPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  insightGraphContent: {
    gap: 9,
    paddingVertical: 6,
    paddingRight: 6,
  },
  insightGraphItem: {
    width: 20,
    alignItems: 'center',
    gap: 6,
  },
  insightGraphTrack: {
    height: 100,
    justifyContent: 'flex-end',
  },
  insightGraphBar: {
    width: 10,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.38)',
  },
  writeActionSheet: {
    maxHeight: '85%',
    flexShrink: 1,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D6DEE8',
    marginBottom: 4,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sheetHeaderTextStack: {
    flex: 1,
    gap: 6,
  },
  sheetCloseButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  writeActionItem: {
    minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 0,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  writeActionItemText: {
    flex: 1,
    gap: 3,
  },
  writeActionList: { flexShrink: 1 },
});
