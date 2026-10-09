import CtaButton, { CtaText } from '../../app/ui/CtaButton';
// 파일: src/screens/Schedules/ScheduleListScreen.tsx
// 파일 목적:
// - 선택된 반려동물 기준 일정 목록을 보여주는 일정 도메인의 허브 화면이다.
// 어디서 쓰이는지:
// - RootNavigator의 `ScheduleList` 라우트에서 사용되며, 홈과 More 메뉴에서 진입한다.
// 핵심 역할:
// - 일정 목록 조회, 새로고침, 상세 이동, 새 일정 작성 이동, 빈 상태 안내를 담당한다.
// - 선택 펫이 없거나 일정이 비어 있는 경우에도 다음 행동으로 자연스럽게 이어지게 만든다.
// 데이터·상태 흐름:
// - petStore에서 현재 펫 컨텍스트를 해석하고, scheduleStore의 petId별 캐시를 읽어 화면 상태를 구성한다.
// - 실제 서버 fetch는 store bootstrap/refresh가 수행한다.
// 수정 시 주의:
// - route petId와 selectedPetId 해석 우선순위를 바꾸면 홈에서 들어온 일정 컨텍스트가 달라질 수 있다.
// - 일정 목록은 홈 요약과 같은 캐시를 공유하므로 로딩/갱신 UX를 과하게 따로 만들면 상태가 어긋날 수 있다.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  AppState,
  SectionList,
  useWindowDimensions,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Feather from '../../components/icons/NuriFeatherIcon';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';

import AppTextInput from '../../app/ui/AppTextInput';
import { useTheme } from 'styled-components/native';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import SeasonalAmbientBackground from '../../components/common/SeasonalAmbientBackground';
import { HomeFrostedGlass } from '../../components/home/HomeFrostedGlass';
import { getKstYmd } from '../../utils/date';
import {
  buildScheduleListSections,
  scheduleListDayLabel,
  scheduleListMonthLabel,
  scheduleListTimeLabel,
  type ScheduleListFilter,
} from '../../services/schedules/listPresentation';
import AppText from '../../app/ui/AppText';
import HeaderIconActionButton from '../../components/navigation/HeaderIconActionButton';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import type { PetSchedule } from '../../services/supabase/schedules';
import { NEUTRAL_UI_PALETTE } from '../../services/pets/themePalette';
import { isHealthSchedule } from '../../services/health-report/viewModel';
import { mapScheduleIconName } from '../../services/schedules/presentation';
import { resolveSelectedPetId, usePetStore } from '../../store/petStore';
import { useScheduleStore } from '../../store/scheduleStore';
import { openMoreDrawer } from '../../store/uiStore';
import { styles } from './ScheduleListScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ScheduleList'>;
type Route = RootScreenRoute<'ScheduleList'>;
const EMPTY_SCHEDULE_ITEMS: PetSchedule[] = [];
Object.freeze(EMPTY_SCHEDULE_ITEMS);

export default function ScheduleListScreen() {
  const theme = useTheme();
  const season = useEffectiveSeason();
  const { width, fontScale } = useWindowDimensions();
  const compactFilters = width < 380 || fontScale >= 1.3;
  const [filter, setFilter] = useState<ScheduleListFilter>('all');
  const [query, setQuery] = useState('');
  const [today, setToday] = useState(getKstYmd);
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const routePetId = route.params?.petId ?? null;

  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);

  const petId = useMemo(() => {
    return resolveSelectedPetId(pets, selectedPetId, routePetId);
  }, [pets, routePetId, selectedPetId]);
  const selectedPet = useMemo(
    () => pets.find(candidate => candidate.id === petId) ?? pets[0] ?? null,
    [petId, pets],
  );
  const petTheme = NEUTRAL_UI_PALETTE;

  const bootstrap = useScheduleStore(s => s.bootstrap);
  const refresh = useScheduleStore(s => s.refresh);

  const petState = useScheduleStore(s =>
    petId ? s.byPetId[petId] ?? null : null,
  );
  const schedules = petState?.items ?? EMPTY_SCHEDULE_ITEMS;
  const visibleSchedules = useMemo(
    () => schedules.filter(schedule => !isHealthSchedule(schedule)),
    [schedules],
  );
  const status = petState?.status ?? 'idle';
  const errorMessage = petState?.errorMessage ?? null;
  const refreshing = status === 'refreshing';
  const isInitialLoading =
    status === 'loading' && visibleSchedules.length === 0;
  const isError = status === 'error' && visibleSchedules.length === 0;

  useEffect(() => {
    if (!petId) return;
    bootstrap(petId);
  }, [bootstrap, petId]);

  const onRefresh = useCallback(() => {
    if (!petId) return;
    refresh(petId);
  }, [petId, refresh]);

  const onPressCreate = useCallback(() => {
    navigation.navigate('ScheduleCreate', {
      petId: petId ?? undefined,
      entrySource: route.params?.entrySource,
      returnTo: {
        screen: 'ScheduleList',
        entrySource: route.params?.entrySource,
      },
    });
  }, [navigation, petId, route.params?.entrySource]);

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

  const onPressItem = useCallback(
    (scheduleId: string) => {
      navigation.navigate('ScheduleDetail', {
        petId: petId ?? undefined,
        scheduleId,
        entrySource: route.params?.entrySource,
        returnTo: {
          screen: 'ScheduleList',
          entrySource: route.params?.entrySource,
        },
      });
    },
    [navigation, petId, route.params?.entrySource],
  );

  const sections = useMemo(
    () => buildScheduleListSections(visibleSchedules, filter, query, today),
    [visibleSchedules, filter, query, today],
  );
  useEffect(() => {
    setFilter('all');
    setQuery('');
  }, [petId]);
  useEffect(() => {
    const update = () => setToday(getKstYmd());
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') update();
    });
    const timer = setInterval(update, 60000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, []);
  const headerTopInset = Math.max(insets.top, 12);

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <SeasonalAmbientBackground season={season} />
      <View style={[styles.header, { paddingTop: headerTopInset + 4 }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="뒤로"
          style={styles.headerBackButton}
          onPress={onPressBack}
        >
          <Feather name="chevron-left" size={24} color={petTheme.deep} />
        </TouchableOpacity>
        <AppText
          typographyRole="screenTitle"
          preset="unifiedTitle"
          color={petTheme.primary}
          style={styles.headerTitle}
        >
          전체 일정
        </AppText>
        <HeaderIconActionButton
          preserveOriginal
          role="primary"
          accessibilityLabel="일정 추가"
          onPress={onPressCreate}
        />
      </View>
      <SectionList
        testID="schedule-hub-list"
        sections={sections}
        keyExtractor={item => item.key}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={petTheme.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <AppText
              preset="cardTitle"
              color={theme.colors.textPrimary}
              style={styles.subtitle}
            >
              {selectedPet?.name ?? '반려동물'}의 일정·기념일
            </AppText>
            <View style={styles.search}>
              <Feather
                name="search"
                size={22}
                color={theme.colors.textSecondary}
              />
              <AppTextInput
                testID="schedule-hub-search"
                accessibilityLabel="일정 검색"
                placeholder="일정 검색"
                placeholderTextColor={theme.colors.textSecondary}
                value={query}
                onChangeText={value => {
                  setQuery(value);
                }}
                style={[
                  styles.searchInput,
                  { color: theme.colors.textPrimary },
                ]}
              />
              {query ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="검색어 지우기"
                  style={styles.clearButton}
                  onPress={() => setQuery('')}
                >
                  <NuriSemanticIcon
                    family="feather"
                    name="x"
                    size={20}
                    color={theme.colors.textSecondary}
                    preserveOriginal
                  />
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={styles.filterRow}>
              <View
                style={[styles.segments, compactFilters && styles.segmentsGrid]}
                accessibilityLabel="일정 기간 선택"
              >
                {(
                  [
                    { key: 'all', label: '전체' },
                    { key: 'today', label: '오늘' },
                    { key: 'upcoming', label: '예정' },
                    { key: 'past', label: '지난' },
                  ] as const
                ).map(item => (
                  <TouchableOpacity
                    key={item.key}
                    testID={`schedule-hub-filter-${item.key}`}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: filter === item.key }}
                    onPress={() => {
                      setFilter(item.key);
                      setToday(getKstYmd());
                    }}
                    style={[
                      styles.segment,
                      compactFilters && styles.segmentGrid,
                      filter === item.key && {
                        backgroundColor: petTheme.primary,
                      },
                    ]}
                  >
                    <AppText
                      preset="unifiedLabel"
                      color={
                        filter === item.key
                          ? '#FFFFFF'
                          : theme.colors.textSecondary
                      }
                      style={styles.centered}
                    >
                      {item.label}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {errorMessage && visibleSchedules.length ? (
              <AppText
                accessibilityLiveRegion="polite"
                preset="unifiedMicro"
                color={theme.colors.textMuted}
              >
                새 일정을 불러오지 못했어요. 이전에 확인한 일정을 보여드려요.
              </AppText>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => {
          const index = sections.indexOf(section);
          const showMonth =
            index === 0 || sections[index - 1].month !== section.month;
          return (
            <View>
              {showMonth ? (
                <AppText
                  preset="unifiedTitle"
                  color={theme.colors.textPrimary}
                  style={styles.monthTitle}
                >
                  {scheduleListMonthLabel(section.month)}
                </AppText>
              ) : null}
              <AppText
                preset="cardTitle"
                color={petTheme.deep}
                style={styles.dayTitle}
              >
                {scheduleListDayLabel(section.day)}
              </AppText>
            </View>
          );
        }}
        renderItem={({ item: occurrence, section }) => {
          const item = occurrence.schedule;
          const timeLabel = scheduleListTimeLabel(occurrence, section.day);
          return (
            <TouchableOpacity
              testID={`schedule-hub-item-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${timeLabel}, ${item.title}, 일정 상세 보기`}
              activeOpacity={0.8}
              onPress={() => onPressItem(item.id)}
              style={styles.card}
            >
              <HomeFrostedGlass
                testID={`schedule-hub-glass-${item.id}`}
                season={season}
                borderRadius={12}
                style={styles.cardContent}
              >
                <NuriSemanticIcon
                  family="material"
                  name={mapScheduleIconName(item.iconKey)}
                  size={30}
                  color={petTheme.primary}
                />
                <View style={styles.cardTextCol}>
                  <AppText
                    preset="unifiedMicro"
                    color={theme.colors.textSecondary}
                  >
                    {timeLabel}
                  </AppText>
                  <AppText preset="cardTitle" color={theme.colors.textPrimary}>
                    {item.title}
                  </AppText>
                  {item.repeatRule !== 'none' || item.completedAt ? (
                    <AppText
                      preset="unifiedMicro"
                      color={theme.colors.textSecondary}
                    >
                      {[
                        item.repeatRule !== 'none' ? '반복 일정' : '',
                        item.completedAt ? '완료' : '',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </AppText>
                  ) : null}
                </View>
                {item.reminderMinutes.length ? (
                  <Feather name="bell" size={18} color={theme.colors.textMuted} />
                ) : null}
                <Feather
                  name="chevron-right"
                  size={19}
                  color={petTheme.primary}
                />
              </HomeFrostedGlass>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <NuriSemanticIcon
              family="material"
              name="calendar-blank-outline"
              size={36}
              color={petTheme.primary}
            />
            <AppText
              preset="cardTitle"
              color={theme.colors.textPrimary}
              style={styles.centered}
            >
              {!petId
                ? '반려동물을 먼저 선택해 주세요'
                : isInitialLoading || status === 'idle'
                ? '일정을 불러오는 중이에요'
                : isError
                ? '일정을 불러오지 못했어요'
                : query.trim()
                ? '검색한 일정이 없어요'
                : filter === 'past'
                ? '지난 일정이 아직 없어요'
                : filter === 'today'
                ? '오늘 일정이 없어요'
                : filter === 'upcoming'
                ? '예정된 일정이 없어요'
                : '등록된 일정이 아직 없어요'}
            </AppText>
            {isError ? (
              <CtaButton
                role="primary"
                accessibilityRole="button"
                onPress={onRefresh}
                style={styles.todayButton}
              >
                <CtaText preset="unifiedLabel">다시 불러오기</CtaText>
              </CtaButton>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}
