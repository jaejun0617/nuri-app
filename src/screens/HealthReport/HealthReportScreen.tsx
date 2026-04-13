import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
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
import { useHealthReportAccess } from '../../hooks/useHealthReportAccess';
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
  type HealthActivityItem,
  type HealthReportTabKey,
  type WeightDeltaDirection,
  type WeightTimelineItem,
} from '../../services/health-report/viewModel';
import type { PetWeightLog, PetWeightLogMutationResult } from '../../services/supabase/petWeightLogs';
import { useAuthStore } from '../../store/authStore';
import { resolveSelectedPetId, usePetStore } from '../../store/petStore';
import { openMoreDrawer } from '../../store/uiStore';
import { getKstYmd, humanizeMonthKey } from '../../utils/date';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'HealthReport'>;
type HealthReportRoute = RouteProp<RootStackParamList, 'HealthReport'>;

const TAB_ITEMS: Array<{
  key: HealthReportTabKey;
  label: string;
  locked?: boolean;
}> = [
  { key: 'records', label: '건강기록' },
  { key: 'weight', label: '체중관리' },
  { key: 'report', label: '리포트', locked: true },
];

const DATE_ITEM_WIDTH = 56;

type HealthReportMonthData = NonNullable<ReturnType<typeof useHealthReportMonth>['data']>;

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

function ActivityCard({
  item,
  accentColor,
  onPress,
}: {
  item: HealthActivityItem;
  accentColor: string;
  onPress: () => void;
}) {
  const theme = useTheme();

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

export default function HealthReportScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<HealthReportRoute>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const access = useHealthReportAccess();
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
  const [activeTab, setActiveTab] = useState<HealthReportTabKey>(
    route.params?.initialTab ?? 'records',
  );
  const [monthKey, setMonthKey] = useState(currentMonthKey);
  const [selectedYmd, setSelectedYmd] = useState(todayYmd);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingLog, setEditingLog] = useState<PetWeightLog | null>(null);

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
    if (!dateItems.length) return;

    const nextSelected =
      isCurrentMonth && dateItems.includes(todayYmd)
        ? todayYmd
        : monthQuery.data?.latestActivityYmd ?? dateItems[dateItems.length - 1];
    setSelectedYmd(nextSelected);
  }, [dateItems, isCurrentMonth, monthQuery.data?.latestActivityYmd, todayYmd]);

  useEffect(() => {
    if (!dateItems.length) return;
    const selectedIndex = Math.max(0, dateItems.indexOf(selectedYmd));
    const timer = setTimeout(() => {
      dateStripRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }, 60);

    return () => clearTimeout(timer);
  }, [dateItems, selectedYmd]);

  const openWeightCreate = useCallback(() => {
    setEditingLog(null);
    setSheetVisible(true);
  }, []);

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
              entrySource: 'more',
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
            건강 리포트
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
      </SafeAreaView>
    );
  }

  const deltaMeta = formatDeltaText(
    monthQuery.data?.weightSummary.direction ?? 'same',
    monthQuery.data?.weightSummary.deltaKg ?? null,
    monthQuery.data?.weightSummary.deltaRate ?? null,
  );

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
          건강 리포트
        </AppText>

        <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
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
              {item.locked ? (
                <Feather
                  color={active ? '#FFFFFF' : theme.colors.textMuted}
                  name="lock"
                  size={12}
                />
              ) : null}
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
                onPress={() =>
                  navigation.navigate('RecordCreate', {
                    petId: pet.id,
                    returnTo: { tab: 'TimelineTab' },
                  })
                }
                style={[styles.primaryCta, { backgroundColor: petTheme.primary }]}
              >
                <AppText preset="button" color="#FFFFFF">
                  건강 기록 남기기
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
                      <AppText preset="helper" color={theme.colors.textMuted}>
                        {typeof itemDelta === 'string' ? itemDelta : itemDelta.text}
                      </AppText>
                      {log.note ? (
                        <AppText preset="helper" color={theme.colors.textMuted} numberOfLines={1}>
                          {log.note}
                        </AppText>
                      ) : null}
                    </View>
                    <View style={styles.weightValueWrap}>
                      <AppText preset="titleSm">{formatWeightKg(log.weightKg)}</AppText>
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
            { paddingBottom: Math.max(insets.bottom, 24) + 72 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.teaserCard,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.teaserBadge}>
              <Feather color={petTheme.primary} name="lock" size={14} />
              <AppText preset="caption" color={petTheme.primary}>
                Premium Preview
              </AppText>
            </View>
            <AppText preset="titleMd">데이터가 쌓일수록 한층 깊어집니다</AppText>
            <AppText preset="body" color={theme.colors.textMuted} style={styles.teaserText}>
              월간 체중 리듬, 병원 방문 흐름, 기록 밀도를 한눈에 회고하는 프리미엄 분석이 이 자리에서 완성됩니다.
            </AppText>
            <View style={styles.teaserList}>
              <AppText preset="bodySm" color={theme.colors.textPrimary}>
                월간 변화 포인트를 정제한 요약
              </AppText>
              <AppText preset="bodySm" color={theme.colors.textPrimary}>
                체중과 건강 이벤트의 연결 신호
              </AppText>
              <AppText preset="bodySm" color={theme.colors.textPrimary}>
                다음 기록을 위한 차분한 리마인드 제안
              </AppText>
            </View>
            {access.report === 'teaser' ? (
              <AppText preset="helper" color={theme.colors.textMuted}>
                지금은 티저만 열려 있고, 결제/잠금 로직은 다음 단계에서 연결됩니다.
              </AppText>
            ) : null}
          </View>
        </ScrollView>
      )}

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
    width: 40,
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
});
