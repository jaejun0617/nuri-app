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
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import WeightLogEntrySheet from '../../components/health/WeightLogEntrySheet';
import AppNavigationToolbar from '../../components/navigation/AppNavigationToolbar';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import { useHealthReportMonth } from '../../hooks/useHealthReportMonth';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { buildPetThemePalette } from '../../services/pets/themePalette';
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
  clearScheduleNotification,
  upsertScheduleNotification,
} from '../../services/schedules/notifications';
import type { PetWeightLog, PetWeightLogMutationResult } from '../../services/supabase/petWeightLogs';
import {
  fetchScheduleById,
  updateSchedule,
} from '../../services/supabase/schedules';
import { useAuthStore } from '../../store/authStore';
import { resolveSelectedPetId, usePetStore } from '../../store/petStore';
import { useScheduleStore } from '../../store/scheduleStore';
import { openMoreDrawer } from '../../store/uiStore';
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

type HealthWriteActionKey = 'hospital' | 'medicine' | 'symptom' | 'weight';

const HEALTH_WRITE_ACTIONS: Array<{
  key: HealthWriteActionKey;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    key: 'hospital',
    title: '병원/검진',
    description: '진료, 검진, 접종처럼 날짜가 중요한 건강 일정을 남겨요',
    icon: 'calendar',
  },
  {
    key: 'medicine',
    title: '투약/복약',
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

type HealthReportMonthData = NonNullable<ReturnType<typeof useHealthReportMonth>['data']>;
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
  return `${value.toFixed(1)}kg`;
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
  const icon = direction === 'up' ? 'arrow-up' : direction === 'down' ? 'arrow-down' : 'minus';
  const verb =
    direction === 'up' ? '늘었어요' : direction === 'down' ? '줄었어요' : '유지됐어요';

  return {
    icon,
    text: `${prefix}${Math.abs(deltaKg).toFixed(1)}kg (${Math.abs(deltaRate).toFixed(1)}%) ${verb}`,
  };
}

function getDeltaColor(
  direction: WeightDeltaDirection,
  theme: ReturnType<typeof useTheme>,
) {
  if (direction === 'up') return theme.colors.success;
  if (direction === 'down') return theme.colors.danger;
  return theme.colors.textMuted;
}

function compareWeightLogs(lhs: PetWeightLog, rhs: PetWeightLog) {
  const measuredCompare = lhs.measuredOn.localeCompare(rhs.measuredOn);
  if (measuredCompare !== 0) return measuredCompare;

  const createdCompare = lhs.createdAt.localeCompare(rhs.createdAt);
  if (createdCompare !== 0) return createdCompare;

  return lhs.id.localeCompare(rhs.id);
}

function isLogInMonth(log: PetWeightLog, month: HealthReportMonthData['bounds']) {
  return log.measuredOn >= month.startYmd && log.measuredOn < month.endExclusiveYmd;
}

function applyCommittedWeightMutation(
  current: HealthReportMonthData,
  result: PetWeightLogMutationResult,
): HealthReportMonthData {
  const changedLog = result.changedLog;
  let weightLogs = current.weightLogs;

  if (changedLog) {
    if (result.action === 'upsert' && isLogInMonth(changedLog, current.bounds)) {
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
        item => !(item.source === 'schedule' && item.scheduleId === input.scheduleId),
      )
    : current.activityItems.map(item =>
        item.source === 'schedule' && item.scheduleId === input.scheduleId
          ? {
              ...item,
              reminderMinutes: input.reminderMinutes ?? item.reminderMinutes,
              completedAt:
                input.completedAt !== undefined ? input.completedAt : item.completedAt,
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
  const toggleAnimation = useRef(new Animated.Value(reminderEnabled ? 1 : 0)).current;

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
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: `${accentColor}18` },
        ]}
      >
        <Feather color={accentColor} name={item.iconName as never} size={16} />
      </View>
      <View style={styles.cardTextWrap}>
        <AppText preset="body" numberOfLines={1}>
          {item.title}
        </AppText>
        <AppText preset="helper" color={theme.colors.textMuted} numberOfLines={1}>
          {item.subtitle}
        </AppText>
        {item.source === 'schedule' ? (
          <AppText preset="caption" color={theme.colors.textMuted} numberOfLines={1}>
            {formatReminderMinutesSummary(item.reminderMinutes)}
          </AppText>
        ) : null}
      </View>
      <View style={styles.activityRightColumn}>
        {item.source === 'schedule' && onToggleReminder ? (
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel={reminderEnabled ? '알림 끄기' : '알림 켜기'}
            accessibilityState={{ checked: reminderEnabled, disabled: reminderBusy }}
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
            <AppText preset="caption" style={styles.activityStatusText}>
              완료됨
            </AppText>
          </View>
        ) : null}
      </View>
      <Feather color={theme.colors.textMuted} name="chevron-right" size={18} />
    </TouchableOpacity>
  );
}

function WeightBarChart({
  logs,
  accentColor,
}: {
  logs: WeightTimelineItem[];
  accentColor: string;
}) {
  const theme = useTheme();
  const minWeight = useMemo(
    () =>
      logs.reduce(
        (acc, log) => Math.min(acc, log.weightKg),
        logs[0]?.weightKg ?? 0,
      ),
    [logs],
  );
  const maxWeight = useMemo(
    () =>
      logs.reduce(
        (acc, log) => Math.max(acc, log.weightKg),
        logs[0]?.weightKg ?? 0,
      ),
    [logs],
  );
  const range = maxWeight - minWeight;

  if (logs.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chartScrollContent}
    >
      {logs.map(log => {
        const ratio = range <= 0 ? 0.62 : (log.weightKg - minWeight) / range;
        const barHeight = 56 + ratio * 64;
        return (
          <View key={log.id} style={styles.chartItem}>
            <View style={styles.chartBarTrack}>
              <View
                style={[
                  styles.chartBar,
                  { backgroundColor: accentColor, height: barHeight },
                ]}
              />
            </View>
            <AppText preset="caption" color={theme.colors.textMuted}>
              {log.measuredOn.slice(8, 10)}일
            </AppText>
          </View>
        );
      })}
    </ScrollView>
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

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.insightMetricCard,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <AppText preset="helper" color={theme.colors.textMuted}>
        {label}
      </AppText>
      <AppText preset="titleMd" color={accentColor}>
        {value}
      </AppText>
      <AppText preset="caption" color={theme.colors.textMuted}>
        {helper}
      </AppText>
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
  const scrollRef = useRef<ScrollView>(null);
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
      dateItems.reduce(
        (acc, ymd) => Math.max(acc, countsByYmd[ymd] ?? 0),
        0,
      ),
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
        const barHeight = count > 0 ? 18 + ratio * 58 : 8;
        return (
          <View
            key={ymd}
            style={styles.insightGraphItem}
            accessibilityLabel={`${ymd.slice(8, 10)}일 건강관리 기록 ${count}건`}
          >
            <View style={styles.insightGraphTrack}>
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
            <AppText preset="caption" color={theme.colors.textMuted}>
              {ymd.slice(8, 10)}
            </AppText>
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
  const petTheme = useMemo(
    () => buildPetThemePalette(pet?.themeColor),
    [pet?.themeColor],
  );
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

  const monthQuery = useHealthReportMonth({
    petId: pet?.id ?? null,
    monthKey,
    fallbackLatestWeightKg: pet?.weightKg ?? null,
  });
  const dateItems = useMemo(
    () => monthQuery.data?.dateItems ?? [],
    [monthQuery.data?.dateItems],
  );
  const isCurrentMonth = monthKey === currentMonthKey;
  const selectedActivities = monthQuery.data?.groupedActivities[selectedYmd] ?? [];

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
    if (!dateItems.length || activeTab === 'report') return;
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
      if (!pet) return;
      setWriteActionSheetVisible(false);

      if (action === 'weight') {
        requestAnimationFrame(openWeightCreate);
        return;
      }

      if (action === 'symptom') {
        navigation.navigate('RecordCreate', {
          petId: pet.id,
          initialMainCategory: 'health',
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
        initialTitle: medicineAction ? '투약/복약 기록' : '병원/검진 기록',
        initialCategory: 'health',
        initialHealthSubCategory: medicineAction ? 'medicine' : 'hospital',
        initialIconKey: medicineAction ? 'pill' : 'medical-bag',
        returnTo: { screen: 'HealthReport', initialTab: 'records' },
      });
    },
    [navigation, openWeightCreate, pet],
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
          entrySource: 'more',
        });
      }
    },
    [navigation, pet],
  );

  const handleToggleScheduleReminder = useCallback(
    async (item: HealthActivityItem) => {
      if (!pet || item.source !== 'schedule' || !item.scheduleId) return;

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
          clearScheduleNotification(schedule.id);
        } else {
          await upsertScheduleNotification({
            id: schedule.id,
            petId: schedule.petId,
            title: schedule.title,
            note: schedule.note,
            startsAt: schedule.startsAt,
            repeatRule: schedule.repeatRule,
            reminderMinutes: nextReminderMinutes,
            completedAt: schedule.completedAt,
          });
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
        useScheduleStore.getState().refresh(pet.id).catch(() => {});
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
        <View style={styles.header}>
          <View style={styles.headerSideSlot}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={onPressBack}
              style={styles.headerBackButton}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Feather color="#102033" name="arrow-left" size={20} />
            </TouchableOpacity>
          </View>
          <AppText preset="headline" style={styles.headerTitle}>
            건강관리
          </AppText>
          <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
        </View>

        <View style={styles.centerEmpty}>
          <AppText preset="titleMd">먼저 아이 프로필이 필요해요</AppText>
          <AppText
            preset="body"
            color={theme.colors.textMuted}
            style={styles.centerEmptyText}
          >
            건강 기록과 체중 리포트는 아이 프로필을 기준으로 묶어 보여줍니다.
          </AppText>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('PetCreate', { from: 'cta' })}
            style={[styles.primaryCta, { backgroundColor: theme.colors.brand }]}
          >
            <AppText preset="button" color="#FFFFFF">
              아이 프로필 등록하기
            </AppText>
          </TouchableOpacity>
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
  const insightHasAnyData =
    insightActivityItems.length > 0 ||
    insightWeightTimeline.length > 0 ||
    monthQuery.data?.weightSummary.latestWeightKg !== null;

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <View style={styles.headerSideSlot}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onPressBack}
            style={styles.headerBackButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Feather color="#102033" name="arrow-left" size={20} />
          </TouchableOpacity>
        </View>

        <AppText preset="headline" style={styles.headerTitle}>
          건강관리
        </AppText>

        <View style={[styles.headerSideSlot, styles.headerSideSlotRight]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={openHealthWriteActions}
            style={[
              styles.headerActionButton,
              { backgroundColor: petTheme.primary },
            ]}
          >
            <Feather color="#FFFFFF" name="plus" size={15} />
            <AppText preset="caption" color="#FFFFFF">
              기록
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.monthRow}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setMonthKey(prev => addMonthsToHealthReportMonthKey(prev, -1))}
          style={[styles.monthArrow, { borderColor: theme.colors.border }]}
        >
          <Feather color={theme.colors.textPrimary} name="chevron-left" size={18} />
        </TouchableOpacity>

        <View style={styles.monthLabelWrap}>
          <AppText preset="titleSm">{humanizeMonthKey(monthKey)}</AppText>
          <AppText preset="helper" color={theme.colors.textMuted}>
            월 단위로 묶어 빠르게 훑어볼 수 있어요
          </AppText>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          disabled={monthKey === currentMonthKey}
          onPress={() => setMonthKey(prev => addMonthsToHealthReportMonthKey(prev, 1))}
          style={[
            styles.monthArrow,
            {
              borderColor: theme.colors.border,
              opacity: monthKey === currentMonthKey ? 0.35 : 1,
            },
          ]}
        >
          <Feather color={theme.colors.textPrimary} name="chevron-right" size={18} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {TAB_ITEMS.map(item => {
          const active = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.9}
              onPress={() => setActiveTab(item.key)}
              style={[
                styles.tabButton,
                {
                  backgroundColor: active ? petTheme.primary : theme.colors.surfaceElevated,
                  borderColor: active ? petTheme.primary : theme.colors.border,
                },
              ]}
            >
              <AppText
                preset="tab"
                color={active ? '#FFFFFF' : theme.colors.textPrimary}
              >
                {item.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab !== 'report' ? (
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
                  onPress={() => setSelectedYmd(item)}
                  style={[
                    styles.dateChip,
                    {
                      backgroundColor: active ? petTheme.primary : theme.colors.surfaceElevated,
                      borderColor: active ? petTheme.primary : theme.colors.border,
                    },
                  ]}
                >
                  <AppText
                    preset="caption"
                    color={active ? '#FFFFFF' : theme.colors.textMuted}
                  >
                    {item.slice(5, 7)}월
                  </AppText>
                  <AppText
                    preset="bodySm"
                    color={active ? '#FFFFFF' : theme.colors.textPrimary}
                    weight="700"
                  >
                    {Number(item.slice(8, 10))}
                  </AppText>
                </Pressable>
              );
            }}
          />
        </View>
      ) : null}

      {monthQuery.loading ? (
        <View style={styles.centerEmpty}>
          <AppText preset="body">건강 리포트를 정리하고 있어요.</AppText>
        </View>
      ) : monthQuery.error ? (
        <View style={styles.centerEmpty}>
          <AppText preset="titleSm">리포트를 불러오지 못했어요</AppText>
          <AppText
            preset="body"
            color={theme.colors.textMuted}
            style={styles.centerEmptyText}
          >
            {monthQuery.error}
          </AppText>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => monthQuery.refetch()}
            style={[styles.primaryCta, { backgroundColor: petTheme.primary }]}
          >
            <AppText preset="button" color="#FFFFFF">
              다시 불러오기
            </AppText>
          </TouchableOpacity>
        </View>
      ) : activeTab === 'records' ? (
        <ScrollView
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom, 24) + 90 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.highlightPanel,
              {
                backgroundColor: petTheme.soft,
                borderColor: petTheme.border,
              },
            ]}
          >
            <AppText preset="titleSm">오늘의 시선이 머무는 날</AppText>
            <AppText preset="bodySm" color={theme.colors.textMuted}>
              {selectedYmd.replace(/-/g, '.')}에 남은 병원, 약, 증상 기록을 한 줄씩 빠르게 살펴보세요.
            </AppText>
          </View>

          {selectedActivities.length === 0 ? (
            <View style={styles.emptySection}>
              <AppText preset="titleSm">아직 고요한 하루예요</AppText>
              <AppText preset="body" color={theme.colors.textMuted} style={styles.centerEmptyText}>
                첫 건강 기록이 놓이면 작은 변화도 더 또렷하게 기억할 수 있어요.
              </AppText>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={openHealthWriteActions}
                style={[styles.primaryCta, { backgroundColor: petTheme.primary }]}
              >
                <AppText preset="button" color="#FFFFFF">
                  건강 기록하기
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            selectedActivities.map(item => (
              <ActivityCard
                key={item.id}
                item={item}
                accentColor={petTheme.primary}
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
          <View
            style={[
              styles.weightSummaryCard,
              {
                backgroundColor: petTheme.soft,
                borderColor: petTheme.border,
              },
            ]}
          >
            <View style={styles.weightSummaryTopRow}>
              <View>
                <AppText preset="helper" color={theme.colors.textMuted}>
                  최신 몸무게
                </AppText>
                <AppText preset="display">{formatWeightKg(monthQuery.data?.weightSummary.latestWeightKg)}</AppText>
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={openWeightCreate}
                style={[styles.inlineButton, { backgroundColor: petTheme.primary }]}
              >
                <Feather color="#FFFFFF" name="plus" size={16} />
                <AppText preset="button" color="#FFFFFF">
                  기록 추가
                </AppText>
              </TouchableOpacity>
            </View>
            <View style={styles.weightDeltaRow}>
              {typeof deltaMeta === 'string' ? (
                <AppText preset="bodySm" color={theme.colors.textMuted}>
                  {deltaMeta}
                </AppText>
              ) : (
                <>
                  <Feather
                    color={getDeltaColor(monthQuery.data?.weightSummary.direction ?? 'same', theme)}
                    name={deltaMeta.icon as never}
                    size={16}
                  />
                  <AppText
                    preset="bodySm"
                    color={getDeltaColor(monthQuery.data?.weightSummary.direction ?? 'same', theme)}
                  >
                    {deltaMeta.text}
                  </AppText>
                </>
              )}
            </View>
          </View>

          <WeightBarChart
            logs={monthQuery.data?.weightTimeline ?? []}
            accentColor={petTheme.primary}
          />

          {(monthQuery.data?.weightTimeline.length ?? 0) === 0 ? (
            <View style={styles.emptySection}>
              <AppText preset="titleSm">첫 체중 기록을 기다리고 있어요</AppText>
              <AppText preset="body" color={theme.colors.textMuted} style={styles.centerEmptyText}>
                한 번의 기록이 쌓이면 증감 흐름과 월간 변화가 바로 또렷해집니다.
              </AppText>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={openWeightCreate}
                style={[styles.primaryCta, { backgroundColor: petTheme.primary }]}
              >
                <AppText preset="button" color="#FFFFFF">
                  첫 몸무게 남기기
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            monthQuery.data?.weightTimeline
              .slice()
              .reverse()
              .map(log => {
                const itemDelta = formatDeltaText(log.direction, log.deltaKg, log.deltaRate);
                const itemDeltaColor =
                  typeof itemDelta === 'string'
                    ? theme.colors.textMuted
                    : getDeltaColor(log.direction, theme);
                return (
                  <TouchableOpacity
                    key={log.id}
                    activeOpacity={0.9}
                    onPress={() => {
                      setEditingLog(log);
                      setSheetVisible(true);
                    }}
                    style={[
                      styles.card,
                      {
                        backgroundColor: theme.colors.surfaceElevated,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.cardTextWrap}>
                      <AppText preset="body">{log.measuredOn.replace(/-/g, '.')}</AppText>
                      <AppText preset="helper" color={itemDeltaColor}>
                        {typeof itemDelta === 'string' ? itemDelta : itemDelta.text}
                      </AppText>
                      {log.note ? (
                        <AppText preset="helper" color={theme.colors.textMuted} numberOfLines={1}>
                          {log.note}
                        </AppText>
                      ) : null}
                    </View>
                    <View style={styles.weightValueWrap}>
                      <AppText
                        preset="titleSm"
                        color={
                          log.direction === 'same'
                            ? theme.colors.textPrimary
                            : itemDeltaColor
                        }
                      >
                        {formatWeightKg(log.weightKg)}
                      </AppText>
                      <Feather color={theme.colors.textMuted} name="edit-2" size={15} />
                    </View>
                  </TouchableOpacity>
                );
              })
          )}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom, 24) + 110 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.insightHeroCard,
              {
                backgroundColor: petTheme.soft,
                borderColor: petTheme.border,
              },
            ]}
          >
            <AppText preset="helper" color={petTheme.primary}>
              {humanizeMonthKey(monthKey)} 건강 인사이트
            </AppText>
            <AppText preset="titleMd">
              {insightHasAnyData
                ? `${pet.name}의 이번 달 흐름이 모이고 있어요`
                : '첫 기록이 쌓이면 월간 흐름이 열려요'}
            </AppText>
            <AppText preset="body" color={theme.colors.textMuted}>
              {insightHasAnyData
                ? '기록한 날, 체중 변화, 자주 남긴 건강 이벤트를 한 화면에서 정리합니다.'
                : '병원, 약, 증상, 체중을 남기면 이곳에서 변화의 방향을 바로 볼 수 있어요.'}
            </AppText>
          </View>

          <View style={styles.insightMetricGrid}>
            <InsightMetricCard
              label="건강 이벤트"
              value={`${insightActivityItems.length}건`}
              helper="병원, 약, 증상 기록"
              accentColor={petTheme.primary}
              onPress={() => setSelectedInsightMetric('activity')}
            />
            <InsightMetricCard
              label="기록한 날"
              value={`${insightActiveDays}일`}
              helper="건강 이벤트와 체중 기록 기준"
              accentColor={petTheme.primary}
              onPress={() => setSelectedInsightMetric('activeDays')}
            />
            <InsightMetricCard
              label="체중 기록"
              value={`${insightWeightTimeline.length}회`}
              helper="월간 체중 체크"
              accentColor={petTheme.primary}
              onPress={() => setSelectedInsightMetric('weight')}
            />
            <InsightMetricCard
              label="자주 남긴 기록"
              value={buildTopKindLabel(insightActivityItems)}
              helper="이번 달 중심 이벤트"
              accentColor={petTheme.primary}
              onPress={() => setSelectedInsightMetric('topKind')}
            />
          </View>

          <View
            style={[
              styles.insightPanel,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.insightPanelHeader}>
              <View>
                <AppText preset="titleSm">기록 밀도</AppText>
                <AppText preset="helper" color={theme.colors.textMuted}>
                  날짜별 건강 이벤트와 체중 기록 수
                </AppText>
              </View>
              <Feather color={petTheme.primary} name="bar-chart-2" size={18} />
            </View>
            <ActivityDensityGraph
              dateItems={monthQuery.data?.dateItems ?? []}
              densityItems={insightDensityItems}
              accentColor={petTheme.primary}
              focusYmd={todayYmd}
            />
          </View>

          <View
            style={[
              styles.insightPanel,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.insightPanelHeader}>
              <View>
                <AppText preset="titleSm">체중 흐름</AppText>
                <AppText preset="helper" color={theme.colors.textMuted}>
                  최신 {formatWeightKg(monthQuery.data?.weightSummary.latestWeightKg)}
                </AppText>
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
              <WeightBarChart
                logs={insightWeightTimeline}
                accentColor={petTheme.primary}
              />
            ) : (
              <AppText preset="bodySm" color={theme.colors.textMuted}>
                체중 기록을 남기면 월간 변화 막대가 이곳에 쌓입니다.
              </AppText>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={openHealthWriteActions}
            style={[styles.primaryCta, { backgroundColor: petTheme.primary }]}
          >
            <AppText preset="button" color="#FFFFFF">
              건강 기록 더하기
            </AppText>
          </TouchableOpacity>
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
        accentColor={petTheme.primary}
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
                <AppText preset="titleSm">
                  {selectedInsightDetail?.title ?? '인사이트'}
                </AppText>
                <AppText preset="helper" color={theme.colors.textMuted}>
                  {selectedInsightDetail?.helper ?? '이번 달 건강관리 기록'}
                </AppText>
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
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
                      <AppText preset="body">{row.title}</AppText>
                      <AppText preset="helper" color={theme.colors.textMuted}>
                        {row.subtitle}
                      </AppText>
                    </View>
                    {row.meta ? (
                      <AppText preset="caption" color={theme.colors.textMuted}>
                        {row.meta}
                      </AppText>
                    ) : null}
                  </View>
                ))
              ) : (
                <View style={styles.insightDetailEmpty}>
                  <AppText preset="body" color={theme.colors.textMuted}>
                    이번 달에는 아직 표시할 기록이 없어요.
                  </AppText>
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
        <Pressable style={styles.sheetBackdrop} onPress={closeHealthWriteActions}>
          <Pressable
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
                <View
                  style={[
                    styles.writeActionBadge,
                    { backgroundColor: `${petTheme.primary}12` },
                  ]}
                >
                  <AppText
                    preset="caption"
                    color={petTheme.primary}
                    style={styles.writeActionBadgeText}
                  >
                    HEALTH MANAGEMENT
                  </AppText>
                </View>
                <AppText preset="titleSm">건강 기록하기</AppText>
                <AppText preset="helper" color={theme.colors.textMuted}>
                  병원, 약, 증상, 체중을 한 곳에서 남겨요.
                </AppText>
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={closeHealthWriteActions}
                style={styles.sheetCloseButton}
              >
                <Feather color={theme.colors.textMuted} name="x" size={18} />
              </TouchableOpacity>
            </View>

            {HEALTH_WRITE_ACTIONS.map(action => (
              <TouchableOpacity
                key={action.key}
                activeOpacity={0.9}
                onPress={() => handleHealthWriteAction(action.key)}
                style={[styles.writeActionItem, { borderColor: theme.colors.border }]}
              >
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: `${petTheme.primary}18` },
                  ]}
                >
                  <Feather color={petTheme.primary} name={action.icon as never} size={16} />
                </View>
                <View style={styles.writeActionItemText}>
                  <AppText preset="body">{action.title}</AppText>
                  <AppText preset="helper" color={theme.colors.textMuted}>
                    {action.description}
                  </AppText>
                </View>
                <Feather color={theme.colors.textMuted} name="chevron-right" size={18} />
              </TouchableOpacity>
            ))}
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
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  headerSideSlot: {
    width: 74,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSideSlotRight: {
    alignItems: 'flex-end',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionButton: {
    minHeight: 36,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#0B1220',
    fontWeight: '900',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabelWrap: {
    flex: 1,
    alignItems: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  tabButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
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
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  contentContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  highlightPanel: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  card: {
    minHeight: 72,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: {
    flex: 1,
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
  weightSummaryCard: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  weightSummaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  inlineButton: {
    minHeight: 40,
    borderRadius: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weightDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartScrollContent: {
    gap: 12,
    paddingVertical: 8,
    paddingRight: 8,
  },
  chartItem: {
    alignItems: 'center',
    gap: 8,
    width: 34,
  },
  chartBarTrack: {
    height: 128,
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: 22,
    borderRadius: 8,
  },
  weightValueWrap: {
    alignItems: 'flex-end',
    gap: 6,
  },
  insightHeroCard: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 8,
  },
  insightMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  insightMetricCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
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
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
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
  insightPanel: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  insightPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
    height: 82,
    justifyContent: 'flex-end',
  },
  insightGraphBar: {
    width: 10,
    borderRadius: 8,
  },
  teaserCard: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
  },
  teaserBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teaserText: {
    marginTop: -2,
  },
  teaserList: {
    gap: 8,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.38)',
  },
  writeActionSheet: {
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
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F5F8',
  },
  writeActionBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  writeActionBadgeText: {
    fontWeight: '900',
    letterSpacing: 0,
  },
  writeActionItem: {
    minHeight: 72,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(247,248,252,0.86)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  writeActionItemText: {
    flex: 1,
    gap: 3,
  },
});
