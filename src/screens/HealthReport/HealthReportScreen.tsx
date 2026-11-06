import { AppHeaderLayout } from '../../components/navigation/AppHeaderLayout';
import { APP_HEADER } from '../../components/navigation/headerAppearance';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import LavenderCtaFill from '../../app/ui/LavenderCtaFill';
import { LAVENDER_CTA } from '../../app/theme/tokens/productAccent';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Image,
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
import { NuriAlert as Alert } from '../../app/ui/NuriAlert';
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
import { healthReportColors as colors } from '../../app/theme/tokens/healthReport';
import PetAvatar from '../../components/pets/PetAvatar';
import { SectionHeaderAction } from '../../app/ui/SectionHeaderAction';
import WeightTrendChart from '../../components/health/WeightTrendChart';
import { HomeFrostedGlass } from '../../components/home/HomeFrostedGlass';
import { MenuGlassSurface } from '../../components/common/MenuGlassSurface';
import { MORE_MENU } from '../../components/MoreDrawer/moreMenuVisualTokens';
import SeasonalAmbientBackground from '../../components/common/SeasonalAmbientBackground';
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
import { getKstYmd } from '../../utils/date';

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

type RecordFilter = 'all' | 'weight' | 'health';
const RECORD_FILTERS: readonly { key: RecordFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'weight', label: '체중' },
  { key: 'health', label: '건강 메모' },
];
type RecordRow =
  | { kind: 'activity'; item: HealthActivityItem }
  | { kind: 'weight'; log: WeightTimelineItem };

function HealthCardSurface() {
  const season = useEffectiveSeason();
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID="health-card-bevel"
      style={StyleSheet.absoluteFill}
    >
      <HomeFrostedGlass
        season={season}
        borderRadius={MORE_MENU.radius}
        style={styles.glassSurface}
      />
    </View>
  );
}

function HealthGlassCard({
  children,
  style,
  testID,
}: Pick<React.ComponentProps<typeof View>, 'children' | 'style' | 'testID'>) {
  return (
    <View testID={testID} style={[styles.glassPanel, style]}>
      <HealthCardSurface />
      {children}
    </View>
  );
}

function formatTimelineDate(ymd: string) {
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][
    new Date(`${ymd}T00:00:00Z`).getUTCDay()
  ];
  return `${ymd.replace(/-/g, '.')} (${weekday})`;
}

function compactDelta(log: Pick<WeightTimelineItem, 'deltaKg' | 'deltaRate'>) {
  if (log.deltaKg === null || log.deltaRate === null) return '비교 기록 없음';
  return `${log.deltaKg > 0 ? '+' : ''}${log.deltaKg}kg · ${Math.abs(
    log.deltaRate,
  ).toFixed(1)}%`;
}

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
  color = colors.ink,
  ...props
}: React.ComponentProps<typeof AppText>) {
  const compact = preset === 'unifiedMeta' || preset === 'unifiedMicro';
  const title = preset === 'unifiedTitle';
  return (
    <AppText
      {...props}
      preset={preset}
      color={color}
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

type HealthWriteActionKey =
  | 'hospital-record'
  | 'medicine-record'
  | 'hospital'
  | 'medicine'
  | 'symptom'
  | 'weight';

const HEALTH_WRITE_ACTIONS: Array<{
  key: HealthWriteActionKey;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    key: 'hospital-record',
    title: '병원·진단 기록',
    description: '진료 내용과 병원비를 기록해요',
    icon: 'file-text',
  },
  {
    key: 'medicine-record',
    title: '약·복약 기록',
    description: '복약 내용과 약값을 기록해요',
    icon: 'file-text',
  },
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
  series: 'health' | 'weight';
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

function WeightChangeBadge({
  summary,
  compact = false,
}: {
  summary?: HealthReportMonthData['weightSummary'];
  compact?: boolean;
}) {
  if (summary?.deltaKg == null) return null;
  const change = compact
    ? `${summary.deltaKg > 0 ? '+' : ''}${summary.deltaKg}kg`
    : compactDelta(summary);
  return (
    <View style={styles.weightDeltaRow}>
      <HealthText preset="unifiedMeta" color={colors.accent}>
        이전보다 {change}
      </HealthText>
    </View>
  );
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
      style={styles.timelineCard}
    >
      <HealthCardSurface />
      <View style={styles.cardTextWrap}>
        <HealthText preset="unifiedMeta" color={accentColor}>
          {item.source === 'memory' ? '건강 메모' : getKindLabel(item.kind)}
        </HealthText>
        <HealthText preset="unifiedBody" weight="600">
          {item.title}
        </HealthText>
        <HealthText preset="unifiedMeta" color={colors.muted} numberOfLines={1}>
          {item.subtitle}
        </HealthText>
        {item.source === 'schedule' ? (
          <HealthText
            preset="unifiedMeta"
            color={colors.muted}
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
            />
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
      <Feather color={colors.muted} name="chevron-right" size={18} />
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
      series: 'health' as const,
    })),
    ...weightTimeline.map(item => ({
      id: `weight:${item.id}`,
      ymd: item.measuredOn,
      series: 'weight' as const,
    })),
  ].filter(item => item.ymd.length > 0);
}

function InsightMetricCard({
  label,
  value,
  helper,
  onPress,
}: {
  label: string;
  value: string;
  helper: string;
  onPress: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}, 상세 보기`}
      onPress={onPress}
      style={[
        styles.insightMetricCard,
        fontScale >= 1.3 && styles.metricFullWidth,
      ]}
    >
      <View style={[styles.cardTextWrap, styles.metricText]}>
        <HealthText
          preset="unifiedMeta"
          color={colors.muted}
          style={styles.metricLabel}
        >
          {label}
        </HealthText>
        <HealthText
          preset="unifiedTitle"
          weight="800"
          style={styles.metricValue}
        >
          {value}
        </HealthText>
        <HealthText
          preset="unifiedMicro"
          color={colors.muted}
          style={styles.metricHelper}
        >
          {helper}
        </HealthText>
      </View>
      <Feather name="chevron-right" size={13} color={colors.muted} />
    </TouchableOpacity>
  );
}

function ActivityDensityGraph({
  densityItems,
}: {
  densityItems: InsightDensityItem[];
}) {
  const { fontScale } = useWindowDimensions();
  const plotHeight = 60 * Math.max(1, fontScale);
  const dates = useMemo(() => {
    const days = new Map<string, { health: number; weight: number }>();
    for (const { ymd, series } of densityItems) {
      const entry = days.get(ymd) ?? { health: 0, weight: 0 };
      entry[series] += 1;
      days.set(ymd, entry);
    }
    return [...days.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    );
  }, [densityItems]);

  if (!dates.length) {
    return (
      <HealthText preset="unifiedMeta" color={colors.muted}>
        이달에 기록이 있는 날짜가 없어요.
      </HealthText>
    );
  }
  const max = Math.max(
    1,
    ...dates.map(([, count]) => Math.max(count.health, count.weight)),
  );
  const interval = Math.max(1, Math.ceil(max / 3));
  const ceiling = Math.ceil(max / interval) * interval;
  const ticks = Array.from(
    { length: ceiling / interval + 1 },
    (_, index) => ceiling - interval * index,
  );
  return (
    <View style={styles.densityRoot}>
      <View style={styles.densityRow}>
        <View style={[styles.densityAxis, { height: plotHeight + 22 }]}>
          <HealthText preset="unifiedMicro" color={colors.muted}>
            건
          </HealthText>
          {ticks.map(tick => (
            <HealthText
              key={tick}
              preset="unifiedMicro"
              color={colors.muted}
              style={{
                position: 'absolute',
                top: 15 + (1 - tick / ceiling) * plotHeight,
              }}
            >
              {tick}
            </HealthText>
          ))}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.densityScroll}
          contentContainerStyle={styles.densityContent}
        >
          <View style={styles.densityGrid} pointerEvents="none">
            {ticks.map(tick => (
              <View
                key={tick}
                style={[
                  styles.densityRule,
                  {
                    top: 24 + (1 - tick / ceiling) * plotHeight,
                    borderStyle: tick === 0 ? 'solid' : 'dashed',
                  },
                ]}
              />
            ))}
          </View>
          {dates.map(([ymd, count]) => (
            <View
              key={ymd}
              style={[styles.densityDay, { minWidth: 68 * fontScale }]}
              accessible
              accessibilityLabel={`${ymd}, 건강 기록 ${count.health}건, 체중 ${count.weight}건`}
            >
              <View style={[styles.densityBars, { height: plotHeight + 24 }]}>
                {(['health', 'weight'] as const).map(series => (
                  <View key={series} style={styles.densityBarColumn}>
                    <HealthText
                      preset="unifiedMicro"
                      color={series === 'health' ? colors.accent : '#3061AF'}
                    >
                      {count[series]}
                    </HealthText>
                    <View
                      style={[
                        styles.densityBar,
                        {
                          height: (count[series] / ceiling) * plotHeight,
                          backgroundColor:
                            series === 'health' ? '#AB82F4' : '#8AB5F5',
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>
              <HealthText preset="unifiedMicro" color={colors.muted}>
                {Number(ymd.slice(5, 7))}/{Number(ymd.slice(8))}
              </HealthText>
            </View>
          ))}
        </ScrollView>
      </View>
      <HealthText
        preset="unifiedMicro"
        color={colors.muted}
        style={styles.densityCaption}
      >
        기록이 있는 날짜
      </HealthText>
    </View>
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
  const [recordFilter, setRecordFilter] = useState<RecordFilter>('all');

  const resolvedPetId = useMemo(
    () => resolveSelectedPetId(pets, selectedPetId, route.params?.petId),
    [pets, route.params?.petId, selectedPetId],
  );
  const pet = useMemo(
    () => pets.find(item => item.id === resolvedPetId) ?? null,
    [pets, resolvedPetId],
  );
  const healthPalette = { primary: colors.accent };
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

  const openWeightCreate = useCallback(() => {
    if (blockHealthVisualQaMutation()) return;
    setEditingLog(null);
    setSheetVisible(true);
  }, []);

  const openWeightEdit = useCallback((log: PetWeightLog) => {
    if (blockHealthVisualQaMutation(log.id)) return;
    setEditingLog(log);
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

      if (
        action === 'symptom' ||
        action === 'hospital-record' ||
        action === 'medicine-record'
      ) {
        navigation.navigate('RecordCreate', {
          petId: pet.id,
          initialMainCategory: 'health',
          initialHealthRecordKind:
            action === 'hospital-record'
              ? 'hospital'
              : action === 'medicine-record'
              ? 'medicine'
              : 'condition',
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
        // Keep the report and its return menu below the native detail scene.
        navigation.navigate('HealthTimeline', {
          screen: 'RecordDetail',
          params: {
            petId: pet.id,
            memoryId: item.memoryId,
            entrySource: 'health_report',
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
  const recordGroups = useMemo(() => {
    const groups = new Map<string, RecordRow[]>();
    const add = (ymd: string, row: RecordRow) => {
      const rows = groups.get(ymd);
      if (rows) rows.push(row);
      else groups.set(ymd, [row]);
    };
    if (recordFilter !== 'weight') {
      insightActivityItems.forEach(item =>
        add(item.ymd, { kind: 'activity', item }),
      );
    }
    if (recordFilter !== 'health') {
      insightWeightTimeline
        .slice()
        .reverse()
        .forEach(log => add(log.measuredOn, { kind: 'weight', log }));
    }
    return [...groups.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([ymd, rows]) => ({ ymd, rows }));
  }, [insightActivityItems, insightWeightTimeline, recordFilter]);
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
        <AppHeaderLayout subtitle="아이의 건강과 변화를 차곡차곡 살펴봐요" style={styles.header}>
          <View style={styles.headerSideSlot}>
            <TouchableOpacity
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="뒤로가기"
              onPress={onPressBack}
              style={styles.headerBackButton}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Feather color="#102033" name="chevron-left" size={APP_HEADER.backIconSize} />
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
        </AppHeaderLayout>

        <View style={styles.centerEmpty}>
          <HealthText preset="unifiedTitle" color={theme.colors.textPrimary}>
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

  const petContextDetail = getPetContextDetail(pet);
  const summary = monthQuery.data?.weightSummary;
  const values = insightWeightTimeline.map(log => log.weightKg);
  const weightStats = [
    ['측정', `${values.length}회`],
    ['최저', values.length ? formatWeightKg(Math.min(...values)) : '–'],
    ['최고', values.length ? formatWeightKg(Math.max(...values)) : '–'],
  ];
  const statsRow = (
    <View style={styles.weightStats}>
      {weightStats.map(([label, value], index) => (
        <View
          key={label}
          style={[styles.statCell, index > 0 && styles.statDivider]}
        >
          <HealthText preset="unifiedMeta" color={colors.muted}>
            {label}
          </HealthText>
          <HealthText weight="700">{value}</HealthText>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <SeasonalAmbientBackground season={season} />
      <AppHeaderLayout subtitle="아이의 건강과 변화를 차곡차곡 살펴봐요" style={styles.header}>
        <View style={styles.headerSideSlot}>
          <TouchableOpacity
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            onPress={onPressBack}
            style={styles.headerBackButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Feather color="#102033" name="chevron-left" size={APP_HEADER.backIconSize} />
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
            <LavenderCtaFill radius={22} />
            <HealthText
              preset="unifiedMeta"
              weight="600"
              color={LAVENDER_CTA.text}
              style={styles.headerActionText}
            >
              기록하기
            </HealthText>
          </TouchableOpacity>
        </View>
      </AppHeaderLayout>

      <View style={styles.petContext}>
        <View style={styles.avatarFrame}>
          <PetAvatar
            key={pet.avatarUrl ?? pet.id}
            uri={pet.avatarUrl ?? null}
            size={50}
            fallbackLabel={pet.name}
            accentColor={pet.themeColor ?? null}
          />
        </View>
        <View style={styles.petIdentity}>
          <HealthText weight="800" style={styles.petName}>
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
      </View>

      <View style={styles.tabRow} accessibilityRole="tablist">
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
              style={styles.tabButton}
            >
              <HealthText
                weight={active ? '700' : '500'}
                color={active ? colors.accent : colors.muted}
              >
                {item.label}
              </HealthText>
              {active ? <View testID="health-tab-underline" style={styles.tabUnderline} /> : null}
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
          style={styles.monthArrow}
        >
          <Feather color={colors.ink} name="chevron-left" size={18} />
        </TouchableOpacity>

        <View style={styles.monthLabelWrap}>
          <HealthText preset="unifiedTitle">
            {`${monthKey.slice(0, 4)}년 ${Number(monthKey.slice(5, 7))}월`}
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
              opacity: monthKey === currentMonthKey ? 0.35 : 1,
            },
          ]}
        >
          <Feather color={colors.ink} name="chevron-right" size={18} />
        </TouchableOpacity>
      </View>

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
          key="health-records"
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom, 24) + 90 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <HealthGlassCard style={styles.recordsSummary}>
            <View style={styles.cardTextWrap}>
              <HealthText color={colors.muted} style={styles.cardCaption}>
                이번 달 건강 기록
              </HealthText>
              <HealthText
                preset="display"
                weight="800"
                style={styles.totalValue}
              >
                {insightActivityItems.length + insightWeightTimeline.length}건
              </HealthText>
              <HealthText color={colors.muted} style={styles.cardCaption}>
                체중 {insightWeightTimeline.length}건 · 건강 메모{' '}
                {insightActivityItems.length}건
              </HealthText>
            </View>
            <Image
              accessible={false}
              resizeMode="contain"
              style={styles.checklistArt}
              source={require('../../assets/activity/health-month-checklist.png')}
            />
          </HealthGlassCard>
          <View style={styles.filterRow} accessibilityRole="tablist">
            {RECORD_FILTERS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                testID={`health-record-filter-${key}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: recordFilter === key }}
                onPress={() => setRecordFilter(key)}
                style={[
                  styles.filterChip,
                  recordFilter === key && styles.filterActive,
                ]}
              >
                <HealthText
                  preset="unifiedMeta"
                  weight="600"
                  color={recordFilter === key ? '#FFFFFF' : colors.muted}
                >
                  {label}
                </HealthText>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.sectionHeading}>
            <HealthText preset="unifiedTitle" weight="700">
              최근 기록
            </HealthText>
            <HealthText preset="unifiedMeta" color={colors.muted}>
              총{' '}
              {recordGroups.reduce(
                (count, group) => count + group.rows.length,
                0,
              )}
              건
            </HealthText>
          </View>
          {recordGroups.length === 0 ? (
            <View testID="health-records-empty" style={[styles.emptySection, styles.recordsEmpty]}>
              <HealthText preset="unifiedTitle" style={styles.recordsEmptyCopy}>
                이달의 해당 기록이 없어요
              </HealthText>
              <CtaButton
                role="primary"
                onPress={openHealthWriteActions}
                style={styles.primaryCta}
              >
                <CtaText preset="unifiedLabel">건강 기록하기</CtaText>
              </CtaButton>
            </View>
          ) : (
            recordGroups.map(({ ymd, rows }, index) => (
              <View key={ymd} style={styles.timelineGroup}>
                {index < recordGroups.length - 1 ? (
                  <View style={styles.timelineLine} />
                ) : null}
                <View style={styles.timelineDot} />
                <HealthText
                  color={colors.muted}
                  preset="unifiedMeta"
                  style={styles.timelineDate}
                >
                  {formatTimelineDate(ymd)}
                </HealthText>
                {rows.map(row =>
                  row.kind === 'activity' ? (
                    <ActivityCard
                      key={row.item.id}
                      item={row.item}
                      accentColor={colors.accent}
                      onPress={() => handleActivityPress(row.item)}
                      onToggleReminder={handleToggleScheduleReminder}
                      reminderBusy={
                        !!row.item.scheduleId &&
                        togglingReminderIds.includes(row.item.scheduleId)
                      }
                    />
                  ) : (
                    <TouchableOpacity
                      key={row.log.id}
                      style={styles.timelineCard}
                      accessibilityRole="button"
                      accessibilityLabel={`${
                        row.log.measuredOn
                      }, ${formatWeightKg(row.log.weightKg)}, 체중 기록 수정`}
                      onPress={() => openWeightEdit(row.log)}
                    >
                      <HealthCardSurface />
                      <View style={styles.cardTextWrap}>
                        <HealthText preset="unifiedMeta" color={colors.accent}>
                          체중
                        </HealthText>
                        <HealthText weight="700">
                          {formatWeightKg(row.log.weightKg)}
                        </HealthText>
                        <HealthText preset="unifiedMeta" color={colors.muted}>
                          {row.log.note?.trim() || compactDelta(row.log)}
                        </HealthText>
                      </View>
                      <Feather
                        name="chevron-right"
                        size={18}
                        color={colors.muted}
                      />
                    </TouchableOpacity>
                  ),
                )}
              </View>
            ))
          )}
        </ScrollView>
      ) : activeTab === 'weight' ? (
        <ScrollView
          key="health-weight"
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom, 24) + 110 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <HealthGlassCard testID="health-weight-summary-glass">
            <View
              style={[
                styles.weightSummaryTopRow,
                fontScale >= 1.3 && styles.stackedSummary,
              ]}
            >
              <View style={styles.cardTextWrap}>
                <HealthText color={colors.muted} style={styles.cardCaption}>
                  최근 측정 체중
                </HealthText>
                <HealthText
                  preset="display"
                  weight="800"
                  style={styles.latestWeight}
                >
                  {summary?.latestWeightKg ?? '–'}
                  <HealthText color={colors.muted} style={styles.weightUnit}>
                    kg
                  </HealthText>
                </HealthText>
                <HealthText color={colors.muted} style={styles.cardCaption}>
                  {summary?.latestMeasuredOn?.replace(/-/g, '.') ??
                    '측정 날짜 없음'}
                </HealthText>
              </View>
              <View style={styles.weightAction}>
                <SectionHeaderAction
                  label="체중 기록"
                  color={colors.accent}
                  onPress={openWeightCreate}
                  accessibilityLabel="체중 기록 추가"
                />
              </View>
            </View>
            <WeightChangeBadge summary={summary} />
            <View style={styles.chartSection}>
              <HealthText color={colors.muted} weight="600">
                체중 변화
              </HealthText>
              {insightWeightTimeline.length ? (
                <WeightTrendChart
                  logs={insightWeightTimeline}
                  accentColor={colors.chart}
                />
              ) : (
                <HealthText preset="unifiedMeta" color={colors.muted}>
                  이달에 측정한 체중이 없어요.
                </HealthText>
              )}
            </View>
            {statsRow}
          </HealthGlassCard>
          <HealthGlassCard testID="health-weight-history-glass">
            <View style={styles.sectionHeading}>
              <HealthText preset="unifiedTitle" weight="700">
                측정 이력
              </HealthText>
              <HealthText preset="unifiedMeta" color={colors.muted}>
                총 {insightWeightTimeline.length}회
              </HealthText>
            </View>
            {insightWeightTimeline.length === 0 ? (
              <View style={styles.emptySection}>
                <HealthText preset="unifiedTitle">
                  첫 체중 기록을 기다리고 있어요
                </HealthText>
                <SectionHeaderAction
                  label="첫 몸무게 남기기"
                  color={colors.accent}
                  onPress={openWeightCreate}
                  accessibilityLabel="첫 몸무게 남기기"
                />
              </View>
            ) : (
              insightWeightTimeline
                .slice()
                .reverse()
                .map(log => (
                  <TouchableOpacity
                    key={log.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${log.measuredOn}, ${formatWeightKg(
                      log.weightKg,
                    )}, 체중 기록 수정`}
                    onPress={() => openWeightEdit(log)}
                    style={styles.historyRow}
                  >
                    <View style={styles.historyDate}>
                      <HealthText preset="unifiedMeta">
                        {log.measuredOn.replace(/-/g, '.')}
                      </HealthText>
                      {log.note ? (
                        <HealthText
                          preset="unifiedMicro"
                          color={colors.muted}
                          numberOfLines={1}
                        >
                          {log.note}
                        </HealthText>
                      ) : null}
                    </View>
                    <HealthText weight="700">
                      {formatWeightKg(log.weightKg)}
                    </HealthText>
                    <HealthText
                      preset="unifiedMeta"
                      color={colors.muted}
                      style={styles.historyDelta}
                    >
                      {compactDelta(log)}
                    </HealthText>
                    <HealthText preset="unifiedMeta" color={colors.accent}>
                      수정
                    </HealthText>
                  </TouchableOpacity>
                ))
            )}
          </HealthGlassCard>
        </ScrollView>
      ) : (
        <ScrollView
          key="health-insights"
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom, 24) + 110 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <HealthGlassCard testID="health-insight-summary-glass">
            <HealthText preset="unifiedTitle" weight="700">
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
                helper="병원 · 약 · 증상 기록"
                onPress={() => setSelectedInsightMetric('activity')}
              />
              <InsightMetricCard
                label="기록한 날"
                value={`${insightActiveDays}일`}
                helper="체중 기록 포함"
                onPress={() => setSelectedInsightMetric('activeDays')}
              />
              <InsightMetricCard
                label="체중 측정"
                value={`${insightWeightTimeline.length}회`}
                helper="이번 달 측정 횟수"
                onPress={() => setSelectedInsightMetric('weight')}
              />
              <InsightMetricCard
                label="자주 남긴 기록"
                value={topInsightKind ? getKindLabel(topInsightKind) : '–'}
                helper={
                  topInsightKind
                    ? `${
                        insightActivityItems.filter(
                          item => item.kind === topInsightKind,
                        ).length
                      }건`
                    : '남긴 기록 없음'
                }
                onPress={() => setSelectedInsightMetric('topKind')}
              />
            </View>
          </HealthGlassCard>
          <HealthGlassCard testID="health-insight-dates-glass">
            <View style={styles.insightPanelHeader}>
              <HealthText preset="unifiedTitle" weight="700">
                날짜별 기록
              </HealthText>
              <View style={styles.legend}>
                <View
                  style={[styles.legendDot, { backgroundColor: colors.chart }]}
                />
                <HealthText preset="unifiedMicro" color={colors.muted}>
                  건강 기록
                </HealthText>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: colors.chartBlue },
                  ]}
                />
                <HealthText preset="unifiedMicro" color={colors.muted}>
                  체중
                </HealthText>
              </View>
            </View>
            <HealthText preset="unifiedMeta" color={colors.muted}>
              건강 기록과 체중 기록을 함께 봐요
            </HealthText>
            <ActivityDensityGraph densityItems={insightDensityItems} />
          </HealthGlassCard>
          <HealthGlassCard testID="health-insight-weight-glass">
            <View style={styles.insightPanelHeader}>
              <HealthText preset="unifiedTitle" weight="700">
                체중 변화
              </HealthText>
              <SectionHeaderAction
                label="체중 보기"
                color={colors.accent}
                onPress={() => setActiveTab('weight')}
                accessibilityLabel="체중 보기"
                size="compact"
              />
            </View>
            <View
              style={[
                styles.insightWeight,
                fontScale >= 1.3 && styles.stackedSummary,
              ]}
            >
              <View style={styles.cardTextWrap}>
                <HealthText preset="display" weight="800">
                  {formatWeightKg(summary?.latestWeightKg)}
                </HealthText>
                <HealthText preset="unifiedMeta" color={colors.muted}>
                  최근 측정 ·{' '}
                  {summary?.latestMeasuredOn?.replace(/-/g, '.') ?? '날짜 없음'}
                </HealthText>
                <WeightChangeBadge summary={summary} compact />
              </View>
              {insightWeightTimeline.length ? (
                <View style={styles.insightSparkline}>
                  <WeightTrendChart
                    logs={insightWeightTimeline}
                    accentColor={colors.chart}
                    compact
                  />
                </View>
              ) : null}
            </View>
            {statsRow}
          </HealthGlassCard>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={openHealthWriteActions}
            style={styles.addHealthButton}
          >
            <LavenderCtaFill radius={9} />
            <HealthText weight="700" color={LAVENDER_CTA.text}>
              건강 기록 더하기
            </HealthText>
            <Feather name="chevron-right" size={18} color={LAVENDER_CTA.text} />
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
                <HealthText
                  preset="unifiedTitle"
                  color={theme.colors.textPrimary}
                >
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
                      <HealthText
                        preset="unifiedBody"
                        color={theme.colors.textPrimary}
                      >
                        {row.title}
                      </HealthText>
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
                backgroundColor: 'transparent',
              },
            ]}
          >
            <MenuGlassSurface radius={0} backed />
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeaderRow}>
              <View style={styles.sheetHeaderTextStack}>
                <HealthText preset="unifiedTitle" color={colors.ink}>
                  건강 기록하기
                </HealthText>
                <HealthText preset="unifiedBody" color={colors.muted}>
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
                <NuriSemanticIcon
                  family="feather"
                  color="#111111"
                  name="x"
                  size={22}
                  preserveOriginal
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.writeActionList}
              contentContainerStyle={styles.writeActionListContent}
              showsVerticalScrollIndicator={false}
            >
              {HEALTH_WRITE_ACTIONS.map(action => (
                <TouchableOpacity
                  key={action.key}
                  accessibilityRole="button"
                  activeOpacity={0.7}
                  onPress={() => handleHealthWriteAction(action.key)}
                  style={styles.writeActionItem}
                >
                  <MenuGlassSurface radius={8} />
                  <View style={styles.writeActionItemText}>
                    <HealthText weight="600">{action.title}</HealthText>
                    <HealthText preset="unifiedMeta" color={colors.muted}>
                      {action.description}
                    </HealthText>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={colors.muted}
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
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 20,
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
    minHeight: 42,
    borderRadius: 22,
    backgroundColor: colors.tint,
    paddingHorizontal: 5,
    minWidth: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  headerActionText: { fontSize: 14, lineHeight: 19, textAlign: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',



     ...APP_HEADER.title },
  petContext: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 5,
  },
  avatarFrame: {
    borderColor: '#FFFFFF',
    borderWidth: 2,
    borderRadius: 27,
    backgroundColor: colors.tint,
  },
  petIdentity: { flex: 1, minWidth: 0 },
  petName: { maxWidth: '100%', flexShrink: 1, fontSize: 19, lineHeight: 25 },
  petDetail: { maxWidth: '100%', flexShrink: 1, color: colors.muted },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 5,
    gap: 10,
  },
  monthArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.53)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabelWrap: {
    flex: 1,
    alignItems: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 18,
    paddingBottom: 3,
  },
  tabButton: {
    flex: 1,
    minHeight: 36,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabUnderline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, borderRadius: 1, backgroundColor: colors.accent },
  contentContainer: { paddingHorizontal: 18, paddingTop: 6, gap: 16 },
  recordsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 114,
    padding: 12,
  },
  cardCaption: { fontSize: 14, lineHeight: 20 },
  totalValue: { fontSize: 44, lineHeight: 48 },
  checklistArt: { width: '27%', maxWidth: 115, aspectRatio: 225 / 201 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    minHeight: 34,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  filterActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  timelineGroup: { paddingLeft: 26, gap: 8 },
  timelineLine: {
    position: 'absolute',
    left: 8,
    top: 15,
    bottom: -20,
    width: 1,
    backgroundColor: colors.line,
  },
  timelineDot: {
    position: 'absolute',
    left: 3,
    top: 4,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderColor: '#FFFFFF',
    borderWidth: 2,
    backgroundColor: colors.chart,
  },
  timelineDate: { paddingBottom: 1 },
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
  timelineCard: {
    minHeight: 68,
    borderRadius: MORE_MENU.radius,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  recordsEmpty: { gap: 20 },
  recordsEmptyCopy: { textAlign: 'center', flexShrink: 1 },
  glassPanel: {
    padding: 14,
    borderRadius: MORE_MENU.radius,
  },
  glassSurface: { ...StyleSheet.absoluteFill, width: 'auto', marginTop: 0 },
  weightSummaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  latestWeight: { fontSize: 44, lineHeight: 48 },
  weightUnit: { fontSize: 24, fontWeight: '700' },
  weightAction: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  weightDeltaRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    backgroundColor: colors.tint,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
    marginTop: 6,
  },
  chartSection: {
    borderTopWidth: 1,
    borderColor: colors.line,
    marginTop: 12,
    paddingTop: 10,
  },
  weightStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: colors.line,
    marginTop: 10,
    paddingTop: 10,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  statDivider: { borderLeftWidth: 1, borderColor: colors.line },
  historyRow: {
    minHeight: 42,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  historyDate: { flex: 1, minWidth: 77 },
  historyDelta: { flex: 1, minWidth: 60, textAlign: 'right' },
  insightMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: '4%',
    rowGap: 6,
  },
  metricsStacked: { flexDirection: 'column' },
  metricFullWidth: { flexBasis: 'auto', width: '100%', flexGrow: 0 },
  insightMetricCard: {
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingVertical: 7,
    gap: 5,
  },
  metricText: { gap: 1 },
  metricLabel: { fontSize: 12, lineHeight: 16 },
  metricValue: { fontSize: 18, lineHeight: 22 },
  metricHelper: { fontSize: 11, lineHeight: 16 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  densityRoot: { marginTop: 5 },
  densityRow: { flexDirection: 'row' },
  densityAxis: { width: 22 },
  densityScroll: { flex: 1 },
  densityContent: { flexGrow: 1 },
  densityGrid: { ...StyleSheet.absoluteFill },
  densityRule: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  densityDay: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 5 },
  densityBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  densityBarColumn: { alignItems: 'center', minWidth: 23 },
  densityBar: { width: 23, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  densityCaption: { textAlign: 'center', marginTop: 2 },
  insightWeight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  insightSparkline: { flex: 1, minWidth: 0 },
  addHealthButton: {
    minHeight: 44,
    borderRadius: 9,
    backgroundColor: colors.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 2,
    paddingHorizontal: 8,
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
  insightPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
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
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingHorizontal: 12,
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
  writeActionListContent: { gap: 10, paddingBottom: 4 },
});
