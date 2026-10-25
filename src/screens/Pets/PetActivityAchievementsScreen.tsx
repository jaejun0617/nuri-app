import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../../app/ui/AppText';
import MarkerText from '../../app/ui/MarkerText';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import PremiumNoticeModal from '../../components/common/PremiumNoticeModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { LavenderScreenBackground } from '../../components/common/LavenderScreenBackground';
import PetAvatar from '../../components/pets/PetAvatar';
import { HomeReflectiveGlass } from '../../components/home/HomeReflectiveGlass';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import {
  loadActivityDashboard,
  type ActivityAchievement,
  type ActivityDashboardData,
  type PetActivityDashboardSummary,
} from '../../services/activity/activityDashboard';
import { appQueryClient } from '../../services/query/appQueryClient';
import {
  loadHomeTitleSelection,
  saveHomeTitleSelection,
} from '../../services/activity/homeTitleSelection';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { openMoreDrawer } from '../../store/uiStore';
import {
  ACTIVITY_ART,
  ACTIVITY_COLORS as C,
  getActivityLayout,
  getActivityVault,
  getChallengeProgress,
  getWalkActivityCount,
} from './activityAchievementsPresentation';
import { getTitleArtwork } from '../../services/activity/titleArtwork';
import { TITLE_VAULT_CATEGORIES } from '../../services/activity/titleVaultV2';

type Nav = NativeStackNavigationProp<
  RootStackParamList,
  'PetActivityAchievements'
>;
type Tab = 'summary' | 'vault';
const fmt = (value: number) => value.toLocaleString('ko-KR');
const NURI_BRAND = require('../../assets/logo/logo_v2.png');

/** Home's AppText owns the real family and single-weight jisu mapping. */
const Copy = memo(function ActivityCopy({
  children,
  style,
  kind = 'body',
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  kind?: 'body' | 'label' | 'title' | 'section' | 'number' | 'caption';
  testID?: string;
}) {
  const textStyle = kind === 'section' ? s.sectionTitle : s[kind];
  return (
    <AppText
      testID={testID}
      preset={
        kind === 'caption' || kind === 'body'
          ? 'unifiedBody'
          : kind === 'label'
          ? 'unifiedLabel'
          : 'unifiedTitle'
      }
      styleOverridesPreset
      style={[s.copy, textStyle, style]}
    >
      {children}
    </AppText>
  );
});
const Glass = memo(function ActivityGlass({
  children,
  style,
  testID,
  selected = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  selected?: boolean;
}) {
  const requestedRadius = StyleSheet.flatten(style)?.borderRadius;
  const radius = typeof requestedRadius === 'number' ? requestedRadius : 18;
  return (
    <HomeReflectiveGlass
      testID={testID}
      borderRadius={radius}
      style={[s.glass, style]}
    >
      {selected ? (
        <View
          pointerEvents="none"
          accessible={false}
          style={[
            StyleSheet.absoluteFill,
            s.selectedGlass,
            { borderRadius: radius },
          ]}
        />
      ) : null}
      {children}
    </HomeReflectiveGlass>
  );
});
function SectionHeading({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={s.sectionHeading}>
      <Copy kind="section" style={s.flex}>
        {title}
      </Copy>
      {detail ? (
        <Copy kind="caption" style={s.sectionDetail}>
          {detail}
        </Copy>
      ) : null}
    </View>
  );
}
function GrowthCard({
  dashboard,
  stack,
}: {
  dashboard: ActivityDashboardData;
  stack: boolean;
}) {
  const level = dashboard.levelSummary;
  return (
    <Glass testID="activity-growth" style={s.growth}>
      <Copy kind="label" style={s.muted}>
        나의 활동 성장
      </Copy>
      <View style={[s.growthMiddle, stack && s.growthStack]}>
        <View style={s.growthCopy}>
          <AppText
            testID="activity-user-level"
            preset="display"
            styleOverridesPreset
            style={s.level}
          >
            Lv.{level.level}
          </AppText>
          <View style={s.titleBubble}>
            <MaterialIcon name="heart" size={17} color={C.accent} />
            <Copy style={s.titleBubbleText}>
              {dashboard.representativeTitle}
            </Copy>
          </View>
        </View>
        <Image
          testID="activity-growth-art"
          source={ACTIVITY_ART.growth}
          style={s.growthArt}
          resizeMode="contain"
          accessible={false}
          importantForAccessibility="no"
        />
      </View>
      <View
        testID="activity-level-progress"
        style={s.progressTrack}
        accessibilityRole="progressbar"
        accessibilityLabel="나의 레벨 진행률"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(dashboard.levelProgress * 100),
        }}
      >
        <View
          style={[
            s.progressFill,
            {
              width: `${
                Math.min(1, Math.max(0, dashboard.levelProgress)) * 100
              }%`,
            },
          ]}
        />
      </View>
      <View style={[s.growthMeta, stack && s.wrap]}>
        <Copy testID="activity-user-xp" style={s.muted}>
          누적 {fmt(level.totalXp)} XP
        </Copy>
        <Copy style={s.muted}>
          {level.level >= dashboard.maxLevel
            ? '최고 레벨 달성'
            : `다음 레벨까지 ${fmt(
                Math.max(0, level.nextLevelXp - level.totalXp),
              )} XP`}
        </Copy>
      </View>
    </Glass>
  );
}
function Challenge({
  item,
  stack,
}: {
  item: ActivityAchievement;
  stack: boolean;
}) {
  const progress = getChallengeProgress(item);
  return (
    <View
      testID={`activity-challenge-${item.key}`}
      style={s.challenge}
      accessible
      accessibilityLabel={`${item.name}, ${item.conditionLabel}, ${item.progressLabel ?? `${progress.current}/${progress.target}${item.domain === 'streak' ? '일' : ''}`}, 도전 중`}
    >
      <View style={s.challengeArtwork}>
        {getTitleArtwork(item.key) ? (
          <Image
            source={getTitleArtwork(item.key)}
            resizeMode="contain"
            style={s.challengeArt}
            accessible={false}
          />
        ) : null}
        <Image
          source={ACTIVITY_ART.lock}
          resizeMode="contain"
          style={s.lock}
          accessible={false}
        />
      </View>
      <View style={[s.challengeCopy, stack && s.challengeStack]}>
        <View style={s.flex}>
          <Copy kind="label">{item.name}</Copy>
          <Copy style={s.condition}>{item.conditionLabel}</Copy>
        </View>
        <View style={[s.challengeProgress, stack && s.challengeProgressStack]}>
          <Copy kind="label" style={s.fraction}>
            {item.progressLabel ?? `${fmt(progress.current)} / ${fmt(progress.target)}${item.domain === 'streak' ? '일' : ''}`}
          </Copy>
          <View
            style={s.segments}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {progress.segmented ? (
              Array.from({ length: progress.target }, (_, index) => (
                <View
                  key={index}
                  testID={`activity-segment-${item.key}-${index}`}
                  style={[
                    s.segment,
                    index < progress.current && s.segmentActive,
                  ]}
                />
              ))
            ) : (
              <View style={s.continuousTrack}>
                <View
                  style={[
                    s.progressFill,
                    { width: `${progress.ratio * 100}%` },
                  ]}
                />
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
function Summary({
  dashboard,
  pet,
  photos,
  activeId,
  onSelect,
  stack,
  petCardWidth,
}: {
  dashboard: ActivityDashboardData;
  pet: PetActivityDashboardSummary | null;
  photos: ReadonlyMap<string, string | null>;
  activeId: string | null;
  onSelect: (id: string) => void;
  stack: boolean;
  petCardWidth: number;
}) {
  const categoryItems = [
    { key: 'walk', label: '산책', icon: 'paw' },
    { key: 'meal', label: '식사', icon: 'silverware-fork-knife' },
    { key: 'diary', label: '일기장', icon: 'notebook-outline' },
    { key: 'other', label: '생활', icon: 'home-outline' },
  ] as const;
  return (
    <>
      <GrowthCard dashboard={dashboard} stack={stack} />
      <View style={s.section}>
        <SectionHeading title="아이별 성장 기록" />
        {dashboard.petSummaries.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.petRow}
          >
            {dashboard.petSummaries.map(item => (
              <Pressable
                key={item.petId}
                testID={`activity-pet-${item.petId}`}
                accessibilityRole="button"
                accessibilityLabel={`${item.petName}, ${fmt(
                  item.xp,
                )} XP, 최고 연속 산책 ${item.streak?.bestStreak ?? 0}일`}
                accessibilityState={{ selected: activeId === item.petId }}
                onPress={() => onSelect(item.petId)}
                style={{ width: petCardWidth }}
              >
                <Glass
                  testID="activity-pet-glass"
                  style={[s.petCard, stack && s.petStack]}
                  selected={activeId === item.petId}
                >
                  <PetAvatar
                    key={photos.get(item.petId) ?? item.petId}
                    uri={photos.get(item.petId) ?? null}
                    fallbackLabel={item.petName}
                    size={48}
                  />
                  <View style={s.petCopy}>
                    <Copy kind="label">{item.petName}</Copy>
                    <Copy style={s.muted}>
                      {fmt(item.xp)} XP · 훈장{' '}
                      {item.achievements.filter(a => a.achieved).length}개
                    </Copy>
                    <Copy style={s.muted}>
                      최고 연속 산책 {item.streak?.bestStreak ?? 0}일
                    </Copy>
                  </View>
                </Glass>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Copy style={s.muted}>등록한 아이가 없어요</Copy>
        )}
      </View>
      {pet ? (
        <>
          <View style={s.section}>
            <SectionHeading
              title={`${pet.petName}의 활동`}
              detail="선택한 아이 기준"
            />
            <Glass style={s.metrics}>
              {[
                {
                  label: '산책',
                  icon: 'paw',
                  value: getWalkActivityCount(pet),
                  unit: '회',
                },
                {
                  label: '타임라인',
                  icon: 'text-box-outline',
                  value: pet.timelineCategoryCounts.all,
                  unit: '개',
                },
                {
                  label: '건강 기록',
                  icon: 'heart-outline',
                  value: pet.health.recordCount,
                  unit: '개',
                },
              ].map((item, index) => (
                <View
                  key={item.label}
                  style={[s.metric, index > 0 && s.divider]}
                >
                  {item.icon === 'paw' ? (
                    <Image
                      testID="activity-walk-brand"
                      source={NURI_BRAND}
                      resizeMode="contain"
                      style={s.walkBrand}
                      accessible={false}
                    />
                  ) : (
                    <MaterialIcon name={item.icon} size={24} color={C.accent} />
                  )}
                  <Copy kind="label" style={s.metricLabel}>
                    {item.label}
                  </Copy>
                  <Copy kind="number">
                    {fmt(item.value)}
                    {item.unit}
                  </Copy>
                </View>
              ))}
            </Glass>
          </View>
          <View style={s.section}>
            <SectionHeading
              title="타임라인 카테고리"
              detail={`전체 ${fmt(pet.timelineCategoryCounts.all)}개`}
            />
            <Glass style={[s.categories, stack && s.wrap]}>
              {categoryItems.map((item, index) => (
                <View
                  key={item.key}
                  style={[
                    s.category,
                    stack && s.categoryStack,
                    index > 0 && !stack && s.divider,
                  ]}
                >
                  <View style={[s.categoryLabel, stack && s.wrap]}>
                    {item.key === 'walk' ? (
                      <Image
                        testID="activity-category-walk-brand"
                        source={NURI_BRAND}
                        resizeMode="contain"
                        style={s.categoryWalkBrand}
                        accessible={false}
                      />
                    ) : (
                      <MaterialIcon
                        name={item.icon}
                        size={19}
                        color={C.accent}
                      />
                    )}
                    <Copy style={s.muted}>{item.label}</Copy>
                  </View>
                  <Copy kind="number" style={s.categoryValue}>
                    {fmt(pet.timelineCategoryCounts[item.key])}
                  </Copy>
                </View>
              ))}
            </Glass>
          </View>
        </>
      ) : null}
      <View style={s.section}>
        <SectionHeading title="나의 공통 활동" detail="아이와 별도로 집계" />
        <Glass style={[s.common, stack && s.commonStack]}>
          {[
            {
              label: '커뮤니티 글',
              icon: 'message-circle',
              count: dashboard.commonSummary.communityPosts.postCount,
              xp: dashboard.commonSummary.communityPosts.xp,
            },
            {
              label: '댓글',
              icon: 'send',
              count: dashboard.commonSummary.comments.commentCount,
              xp: dashboard.commonSummary.comments.xp,
            },
          ].map((item, index) => (
            <View
              key={item.label}
              testID={`activity-common-${item.icon}`}
              style={[s.commonMetric, index > 0 && !stack && s.divider]}
            >
              <Feather name={item.icon} size={29} color={C.accent} />
              <View style={s.commonCopy}>
                <Copy kind="label" style={[s.muted, s.centered]}>
                  {item.label}
                </Copy>
                <View style={s.commonValues}>
                  <Copy kind="number" style={s.commonCount}>
                    {fmt(item.count)}개
                  </Copy>
                  <Copy style={s.muted}>{fmt(item.xp)} XP</Copy>
                </View>
              </View>
            </View>
          ))}
        </Glass>
      </View>
    </>
  );
}

export default function PetActivityAchievementsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RootScreenRoute<'PetActivityAchievements'>>();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const layout = getActivityLayout(width, fontScale);
  const pets = usePetStore(state => state.pets);
  const selectedPetId = usePetStore(state => state.selectedPetId);
  const ownerId = useAuthStore(state => state.session?.user.id ?? null);
  const revision =
    useQuery<number>({
      queryKey: ['walk', ownerId, 'activity-revision'],
      queryFn: () => 0,
      enabled: false,
    }).data ?? 0;
  const [tab, setTab] = useState<Tab>(route.params?.focusTitleId ? 'vault' : route.params?.initialTab ?? 'summary');
  const [vaultCategory, setVaultCategory] = useState(route.params?.focusTitleId?.replace(/\d+$/,'') ?? 'WK');
  const [viewPetId, setViewPetId] = useState<string | null>(route.params?.focusPetId ?? selectedPetId);
  const [result, setResult] = useState<{
    owner: string;
    data: ActivityDashboardData;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [info, setInfo] = useState(false);
  const [picker, setPicker] = useState(false);
  const [selection, setSelection] = useState<{
    ownerId: string;
    petId: string;
    key: string | null;
  } | null>(null);
  const [savingTitle, setSavingTitle] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [titlePrompt, setTitlePrompt] = useState<{
    ownerId: string;
    petId: string;
    key: string;
    name: string;
    petName: string;
  } | null>(null);
  const titleWrite = useRef(false);
  const titleMounted = useRef(true);
  const titleReads = useRef(0);
  const titleScope = useRef({ ownerId, petId: '' });
  const requests = useRef(0);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const focusedTitle = useRef<React.ComponentRef<typeof View>>(null);
  const titleFocusConsumed=useRef<string|null>(null);
  useEffect(()=>{
    if(route.params?.focusTitleId){setTab('vault');setVaultCategory(route.params.focusTitleId.replace(/\d+$/,''));setViewPetId(route.params.focusPetId ?? selectedPetId);titleFocusConsumed.current=null;}
    else if(route.params?.initialTab)setTab(route.params.initialTab);
  },[route.params?.focusTitleId,route.params?.focusPetId,route.params?.initialTab,selectedPetId]);
  const offsets = useRef<Record<Tab, number>>({ summary: 0, vault: 0 });
  const dashboard = result?.owner === ownerId ? result.data : null;
  const inputs = useMemo(
    () =>
      pets.map(p => ({
        id: p.id,
        name: p.name,
        themeColor: p.themeColor ?? null,
      })),
    [pets],
  );
  const photos = useMemo(
    () => new Map(pets.map(p => [p.id, p.avatarUrl ?? null])),
    [pets],
  );
  const pet =
    dashboard?.petSummaries.find(p => p.petId === viewPetId) ??
    dashboard?.petSummaries[0] ??
    null;
  const completeVault = useMemo(
    () => (dashboard ? getActivityVault(dashboard, pet) : null),
    [dashboard, pet],
  );
  const hasCatalog = dashboard?.allAchievements.some(item => item.policyVersion === 2) ?? false;
  const vaultCategories = useMemo(() => [
    ...TITLE_VAULT_CATEGORIES.filter(category => dashboard?.allAchievements.some(item => item.categoryKey === category.key)),
    ...(completeVault?.acquired.some(item => item.hidden) ? [{ key: 'X', label: '뜻밖의 선물' }] : []),
    ...(completeVault?.acquired.some(item => item.categoryKey === 'LEGACY') ? [{ key: 'LEGACY', label: '기존 칭호' }] : []),
  ], [completeVault, dashboard]);
  const activeVaultCategory = vaultCategories.some(category => category.key === vaultCategory)
    ? vaultCategory : vaultCategories[0]?.key;
  const vault = useMemo(() => completeVault && hasCatalog ? {
    acquired: completeVault.acquired.filter(item => item.categoryKey === activeVaultCategory),
    challenges: completeVault.challenges.filter(item => item.categoryKey === activeVaultCategory),
  } : completeVault, [completeVault, hasCatalog, activeVaultCategory]);
  titleScope.current = { ownerId, petId: pet?.petId ?? '' };
  const selectedTitleKey =
    selection?.ownerId === ownerId && selection?.petId === pet?.petId
      ? selection?.key
      : null;
  const activeTitlePrompt =
    titlePrompt?.ownerId === ownerId && titlePrompt?.petId === pet?.petId
      ? titlePrompt
      : null;
  useEffect(() => {
    titleMounted.current = true;
    return () => {
      titleMounted.current = false;
    };
  }, []);
  useEffect(() => {
    const request = ++titleReads.current;
    const petId = pet?.petId;
    setSelectionError(null);
    if (!ownerId || !petId) return;
    let cancelled = false;
    loadHomeTitleSelection({ userId: ownerId, petId })
      .then(value => {
        if (!cancelled && request === titleReads.current)
          setSelection({ ownerId, petId, key: value?.titleKey ?? null });
      })
      .catch(() => {
        if (!cancelled && request === titleReads.current)
          setSelectionError('대표 칭호를 확인하지 못했어요.');
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId, pet?.petId]);
  const chooseTitle = async (key: string) => {
    const petId = pet?.petId;
    if (
      !ownerId ||
      !petId ||
      !dashboard ||
      titleWrite.current ||
      key === selectedTitleKey
    )
      return;
    if (
      titleScope.current.petId !== petId ||
      titleScope.current.ownerId !== ownerId
    )
      return;
    if (
      useAuthStore.getState().session?.user.id !== ownerId ||
      !pets.some(p => p.id === petId)
    )
      return;
    const current = () =>
      titleMounted.current &&
      titleScope.current.ownerId === ownerId &&
      titleScope.current.petId === petId &&
      useAuthStore.getState().session?.user.id === ownerId;
    titleWrite.current = true;
    titleReads.current++;
    setSavingTitle(true);
    setSelectionError(null);
    try {
      const chosen = await saveHomeTitleSelection({
        userId: ownerId,
        petId,
        achievementKey: key,
        dashboard,
      });
      if (current()) {
        setSelection({ ownerId, petId, key: chosen.titleKey });
        setTitlePrompt(null);
      }
    } catch {
      if (current())
        setSelectionError('대표 칭호를 저장하지 못했어요. 다시 눌러 주세요.');
    } finally {
      titleWrite.current = false;
      if (titleMounted.current) setSavingTitle(false);
    }
  };
  const onBack = useEntryAwareBackAction({
    entrySource: route.params?.entrySource,
    onHome: () =>
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
      }),
    onMore: () => {
      navigation.goBack();
      requestAnimationFrame(() => openMoreDrawer());
    },
    onFallback: () => navigation.goBack(),
  });
  const load = useCallback(
    async (refresh: boolean) => {
      const request = ++requests.current;
      const current = () =>
        request === requests.current &&
        useAuthStore.getState().session?.user.id === ownerId &&
        (appQueryClient.getQueryData<number>([
          'walk',
          ownerId,
          'activity-revision',
        ]) ?? 0) === revision;
      setError(false);
      if (refresh) setRefreshing(true);
      else setLoading(true);
      if (!ownerId) {
        setResult(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      try {
        const data = await loadActivityDashboard(inputs);
        if (current()) setResult({ owner: ownerId, data });
      } catch {
        if (current()) setError(true);
      } finally {
        if (current()) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [inputs, ownerId, revision],
  );
  const invalidateRequest = useCallback(() => {
    requests.current++;
  }, []);
  useEffect(() => {
    load(false);
    return invalidateRequest;
  }, [load, invalidateRequest]);
  const selectPet = useCallback((id: string) => {
    setViewPetId(id);
    setPicker(false);
  }, []);
  const selectTab = (next: Tab) => {
    if (next === tab) return;
    setTab(next);
    requestAnimationFrame(() =>
      scroll.current?.scrollTo({ y: offsets.current[next], animated: false }),
    );
  };
  return (
    <View testID="activity-screen" style={s.screen}>
      <LavenderScreenBackground testID="activity-background-gradient" />
      <View
        style={s.flex}
        importantForAccessibility={
          picker || info || activeTitlePrompt ? 'no-hide-descendants' : 'auto'
        }
      >
        <View style={[s.header, { paddingTop: insets.top + 4 }]}>
          <View style={s.headerRow}>
            <Pressable
              testID="activity-back"
              accessibilityRole="button"
              accessibilityLabel="뒤로가기"
              style={s.iconButton}
              onPress={onBack}
            >
              <Feather name="chevron-left" size={28} color={C.ink} />
            </Pressable>
            <Copy kind="title" style={s.headerTitle}>
              활동·칭호
            </Copy>
            <Pressable
              testID="activity-info"
              accessibilityRole="button"
              accessibilityLabel="활동과 칭호 안내"
              style={s.iconButton}
              onPress={() => setInfo(true)}
            >
              <Feather name="info" size={24} color={C.ink} />
            </Pressable>
          </View>
          <Copy style={s.subtitle}>함께한 순간이 차곡차곡 쌓여요</Copy>
        </View>
        <View style={s.tabs} accessibilityRole="tablist">
          {(
            [
              { key: 'summary', label: '활동 요약' },
              { key: 'vault', label: '칭호 보관함' },
            ] as const
          ).map(item => (
            <Pressable
              key={item.key}
              testID={`activity-tab-${item.key}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === item.key }}
              onPress={() => selectTab(item.key)}
              style={s.tab}
            >
              <Copy
                kind="label"
                style={[s.tabLabel, tab === item.key && s.activeText]}
              >
                {item.label}
              </Copy>
              {tab === item.key ? <View style={s.tabUnderline} /> : null}
            </Pressable>
          ))}
        </View>
        <ScrollView
          ref={scroll}
          testID="activity-scroll"
          style={s.flex}
          contentContainerStyle={[
            s.content,
            {
              paddingHorizontal: layout.inset,
              paddingBottom: insets.bottom + 20,
            },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={80}
          onScroll={event => {
            offsets.current[tab] = event.nativeEvent.contentOffset.y;
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                load(true);
              }}
              tintColor={C.accent}
            />
          }
        >
          {loading && !dashboard ? (
            <View
              testID="activity-loading"
              style={s.loading}
              accessibilityLabel="활동 기록 불러오는 중"
            >
              <ActivityIndicator color={C.accent} />
              <View style={s.skeleton} />
              <View style={s.skeleton} />
            </View>
          ) : null}
          {error ? (
            <Glass testID="activity-error" style={s.message}>
              <Copy kind="label">활동 기록을 불러오지 못했어요</Copy>
              <Copy style={s.muted}>
                {dashboard
                  ? '마지막으로 확인한 기록이에요.'
                  : '연결 상태를 확인하고 다시 시도해 주세요.'}
              </Copy>
              <Pressable
                accessibilityRole="button"
                testID="activity-retry"
                onPress={() => {
                  load(!!dashboard);
                }}
                style={s.retry}
              >
                <Copy kind="label" style={s.activeText}>
                  다시 시도
                </Copy>
              </Pressable>
            </Glass>
          ) : null}
          {!loading && !dashboard && !error ? (
            <Copy style={s.muted}>로그인 후 활동을 확인할 수 있어요</Copy>
          ) : null}
          {dashboard && tab === 'summary' ? (
            <Summary
              dashboard={dashboard}
              pet={pet}
              photos={photos}
              activeId={pet?.petId ?? null}
              onSelect={selectPet}
              stack={layout.stack}
              petCardWidth={(width - layout.inset * 2 - 10) / 2}
            />
          ) : null}
          {dashboard && vault && tab === 'vault' ? (
            <>
              <Glass style={[s.vaultPicker, layout.stack && s.wrap]}>
                <Pressable
                  testID="activity-pet-picker"
                  accessibilityRole="button"
                  accessibilityLabel="조회할 아이 선택"
                  onPress={() => setPicker(true)}
                  disabled={!pets.length}
                  style={s.pickerButton}
                >
                  <PetAvatar
                    key={photos.get(pet?.petId ?? '') ?? pet?.petId ?? 'empty'}
                    uri={photos.get(pet?.petId ?? '') ?? null}
                    fallbackLabel={pet?.petName}
                    size={44}
                  />
                  <Copy kind="label" style={s.flex}>
                    {pet?.petName ?? '등록한 아이 없음'}
                  </Copy>
                  <Feather name="chevron-down" size={20} color={C.ink} />
                </Pressable>
                <View style={s.commonHint}>
                  <Feather name="link" size={19} color={C.muted} />
                  <Copy style={s.muted}>공통 칭호 함께 표시</Copy>
                </View>
              </Glass>
              {hasCatalog ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.vaultCategories} testID="activity-title-categories">
                  {vaultCategories.map(category => (
                    <Pressable key={category.key} testID={`activity-title-category-${category.key}`}
                      accessibilityRole="tab" accessibilityState={{ selected: activeVaultCategory === category.key }}
                      onPress={() => setVaultCategory(category.key)}
                      style={[s.vaultCategory, activeVaultCategory === category.key && s.vaultCategorySelected]}>
                      <Copy kind="label" style={activeVaultCategory === category.key ? s.activeText : s.muted}>{category.label}</Copy>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
              <View style={s.section}>
                <SectionHeading
                  title="함께 모은 칭호"
                  detail={`${vault.acquired.length}개`}
                />
                <Copy style={s.sectionDescription}>
                  작은 순간들이 특별한 기억이 되었어요
                </Copy>
                {selectionError ? (
                  <Copy
                    testID="activity-title-selection-error"
                    style={s.selectionError}
                    kind="label"
                  >
                    {selectionError}
                  </Copy>
                ) : null}
                <Glass style={s.vaultGrid}>
                  {vault.acquired.map(item => (
                    <Pressable
                      key={`${item.scope}:${item.ownerId}:${item.key}`}
                      ref={item.key===route.params?.focusTitleId ? focusedTitle : undefined}
                      onLayout={item.key===route.params?.focusTitleId ? ()=>{
                        if(titleFocusConsumed.current===item.key)return;
                        const container=scroll.current?.getInnerViewRef();
                        if(container)focusedTitle.current?.measureLayout(container,(_x,y)=>{scroll.current?.scrollTo({y:Math.max(0,y-20),animated:false});titleFocusConsumed.current=item.key;},()=>{});
                      }:undefined}
                      testID={`activity-earned-${item.key}`}
                      style={[
                        s.earnedCell,
                        { width: `${100 / layout.columns}%` },
                      ]}
                      accessible
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: item.key === selectedTitleKey,
                        disabled: savingTitle,
                        busy: savingTitle,
                      }}
                      accessibilityLabel={`${item.name}, 획득 완료${
                        item.key === selectedTitleKey ? ', 홈 대표 칭호' : ''
                      }`}
                      disabled={savingTitle}
                      onPress={() => {
                        if (
                          !ownerId ||
                          !pet ||
                          item.key === selectedTitleKey ||
                          titleWrite.current
                        )
                          return;
                        setSelectionError(null);
                        setTitlePrompt({
                          ownerId,
                          petId: pet.petId,
                          petName: pet.petName,
                          key: item.key,
                          name: item.name,
                        });
                      }}
                    >
                      {getTitleArtwork(item.key) ? (
                        <Image
                          source={getTitleArtwork(item.key)}
                          resizeMode="contain"
                          style={s.earnedArt}
                          accessible={false}
                        />
                      ) : null}
                      <Copy style={s.earnedName}>{item.name}</Copy>
                      <View style={s.selectionMark}>
                        <Image
                          source={ACTIVITY_ART.check}
                          style={s.check}
                          resizeMode="contain"
                          accessible={false}
                        />
                        {item.key === selectedTitleKey ? (
                          <Copy kind="caption" style={s.activeText}>
                            대표
                          </Copy>
                        ) : null}
                      </View>
                    </Pressable>
                  ))}
                  {!vault.acquired.length ? (
                    <Copy testID="activity-vault-empty" style={s.empty}>
                      아직 모은 칭호가 없어요
                    </Copy>
                  ) : null}
                </Glass>
              </View>
              {activeVaultCategory === 'X' || activeVaultCategory === 'LEGACY' ? null : <View style={s.section}>
                <SectionHeading
                  title="다음 칭호에 한 걸음"
                  detail={`도전 중 ${vault.challenges.length}개`}
                />
                <Glass style={s.challengeList}>
                  {vault.challenges.map(item => (
                    <Challenge
                      key={`${item.scope}:${item.ownerId}:${item.key}`}
                      item={item}
                      stack={layout.stack}
                    />
                  ))}
                  {!vault.challenges.length ? (
                    <Copy style={s.empty}>{hasCatalog ? '이 분야의 칭호를 모두 모았어요' : '모든 칭호를 모았어요'}</Copy>
                  ) : null}
                </Glass>
              </View>}
              <Copy style={s.footer}>함께하는 하루가 새로운 칭호가 돼요</Copy>
            </>
          ) : null}
          {dashboard?.ledgerLimitReached ? (
            <Copy style={s.footer}>
              최근 1,000개 XP 내역 기준의 활동 지표예요. 사용자 누적 XP는 전체
              성장 기록을 사용해요.
            </Copy>
          ) : null}
        </ScrollView>
      </View>
      {picker ? (
        <Modal
          transparent
          visible
          animationType="fade"
          onRequestClose={() => setPicker(false)}
        >
          <View style={s.modalRoot}>
            <Pressable
              accessibilityLabel="아이 선택 닫기"
              accessibilityRole="button"
              style={StyleSheet.absoluteFill}
              onPress={() => setPicker(false)}
            />
            <View
              style={[
                s.pickerSheet,
                { paddingBottom: insets.bottom + 20, maxHeight: '75%' },
              ]}
              accessibilityViewIsModal
            >
              <View style={s.sectionHeading}>
                <Copy kind="section" style={s.flex}>
                  아이 선택
                </Copy>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="닫기"
                  style={s.iconButton}
                  onPress={() => setPicker(false)}
                >
                  <Feather name="x" size={22} color={C.muted} />
                </Pressable>
              </View>
              <ScrollView>
                {pets.map(item => (
                  <Pressable
                    key={item.id}
                    testID={`activity-pick-${item.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={item.name}
                    accessibilityState={{ selected: item.id === pet?.petId }}
                    onPress={() => selectPet(item.id)}
                    style={s.pickerOption}
                  >
                    <PetAvatar
                      key={item.avatarUrl ?? item.id}
                      uri={item.avatarUrl ?? null}
                      fallbackLabel={item.name}
                      size={40}
                    />
                    <Copy kind="label" style={s.flex}>
                      {item.name}
                    </Copy>
                    {item.id === pet?.petId ? (
                      <Image
                        source={ACTIVITY_ART.check}
                        style={s.check}
                        accessible={false}
                      />
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
      {activeTitlePrompt ? (
        <ConfirmDialog
          visible
          title={`${activeTitlePrompt.name} 칭호로 바꿀까요?`}
          titleContent={
            <View style={s.confirmTitle} accessible accessibilityRole="header" accessibilityLabel={`${activeTitlePrompt.name} 칭호로 바꿀까요?`}>
              <View style={s.confirmName}>
                <MarkerText testID="activity-title-confirm-marker" preset="unifiedTitle" styleOverridesPreset variant="wash" markerColor={C.marker} style={[s.copy, s.title]}>
                  {activeTitlePrompt.name}
                </MarkerText>
              </View>
              <Copy kind="title">칭호로 바꿀까요?</Copy>
            </View>
          }
          message={`${activeTitlePrompt.petName}의 홈 대표 칭호를 변경해요.`}
          confirmLabel={savingTitle ? '변경 중…' : '변경하기'}
          cancelLabel="취소"
          accentColor={C.accent}
          typographyMode="unified"
          confirmDisabled={savingTitle}
          confirmLoading={savingTitle}
          onConfirm={() => {
            chooseTitle(activeTitlePrompt.key);
          }}
          onCancel={() => {
            if (titleWrite.current) return;
            setTitlePrompt(null);
            setSelectionError(null);
          }}
        >
          <Image
            source={getTitleArtwork(activeTitlePrompt.key)}
            style={s.confirmArtwork}
            resizeMode="contain"
            accessible={false}
          />
          {selectionError ? (
            <Copy kind="label" style={s.selectionError}>
              {selectionError}
            </Copy>
          ) : null}
        </ConfirmDialog>
      ) : null}
      {info ? (
        <PremiumNoticeModal
          visible
          eyebrow="NURI"
          iconName="shield"
          titleLines={['활동과 칭호 안내']}
          bodyLines={[
            '나의 성장 XP는 계정 전체의 활동을 기준으로 해요.',
            '아이별 기록과 공통 활동은 따로 집계해요.',
            '획득한 칭호는 최고 기록을 보존하고, 도전 중인 연속 산책은 현재 기록을 보여줘요.',
          ]}
          accentColor={C.accent}
          onClose={() => setInfo(false)}
        />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.canvas },
  flex: { flex: 1, minWidth: 0 },
  copy: {
    color: C.ink,
    letterSpacing: 0,
    includeFontPadding: false,
    flexShrink: 1,
  },
  body: { fontSize: 8, lineHeight: 17 },
  caption: { fontSize: 8, lineHeight: 17 },
  label: { fontSize: 11, lineHeight: 18, fontWeight: '500' },
  title: { fontSize: 17, lineHeight: 24, fontWeight: '700' },
  sectionTitle: { fontSize: 17, lineHeight: 28, fontWeight: '700' },
  number: {
    fontSize: 21,
    lineHeight: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  muted: { color: C.muted },
  header: { paddingHorizontal: 12, paddingBottom: 7 },
  headerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  headerTitle: { flex: 1, textAlign: 'center' },
  iconButton: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: { textAlign: 'center', color: C.muted, marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E9E3F5',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  tabLabel: { textAlign: 'center', color: C.muted },
  activeText: { color: C.accent },
  tabUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: C.accent,
  },
  content: { paddingTop: 18 },
  glass: { marginTop: 0, borderRadius: 18 },
  selectedGlass: {
    backgroundColor: 'rgba(125,92,228,0.08)',
  },
  growth: { padding: 18 },
  growthMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 91,
    gap: 6,
  },
  growthCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    minWidth: 0,
  },
  growthStack: { flexWrap: 'wrap' },
  level: {
    fontSize: 59,
    lineHeight: 72,
    fontWeight: '700',
    letterSpacing: 0,
    includeFontPadding: false,
    color: C.ink,
  },
  growthArt: { width: 92, height: 73 },
  titleBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: '100%',
  },
  titleBubbleText: { fontSize: 8, lineHeight: 17 },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: C.track,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: { height: '100%', borderRadius: 6, backgroundColor: '#9973ED' },
  growthMeta: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  wrap: { flexWrap: 'wrap' },
  section: { marginTop: 22, gap: 10 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  sectionDetail: { color: C.muted, textAlign: 'right' },
  sectionDescription: { marginTop: -5, color: C.muted },
  petRow: { gap: 10 },
  petCard: {
    padding: 12,
    minHeight: 80,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  petCopy: { flex: 1, minWidth: 0, gap: 4 },
  petStack: { flexDirection: 'column', alignItems: 'flex-start' },
  metrics: { flexDirection: 'row', paddingVertical: 12 },
  metric: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 5,
  },
  divider: { borderLeftWidth: 1, borderLeftColor: '#E7E0F6' },
  metricLabel: { textAlign: 'center', color: C.muted },
  categories: { flexDirection: 'row', paddingVertical: 12 },
  category: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 5,
  },
  categoryStack: {
    flexBasis: '50%',
    flexGrow: 0,
    flexShrink: 0,
    marginVertical: 5,
  },
  categoryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  categoryValue: { fontSize: 21, lineHeight: 32 },
  common: { flexDirection: 'row', paddingVertical: 12 },
  commonStack: { flexDirection: 'column', gap: 10 },
  commonMetric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  commonValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 7,
  },
  commonCount: { fontSize: 17, lineHeight: 28 },
  commonCopy: { minWidth: 0, flexShrink: 1, alignItems: 'center' },
  centered: { textAlign: 'center' },
  walkBrand: { width: 27, height: 24 },
  categoryWalkBrand: { width: 22, height: 19 },
  vaultPicker: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 26,
  },
  pickerButton: {
    flex: 1,
    minWidth: 110,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commonHint: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  vaultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 5,
    paddingVertical: 10,
  },
  earnedCell: {
    alignItems: 'center',
    paddingHorizontal: 3,
    paddingVertical: 10,
    gap: 7,
    minHeight: 118,
  },
  earnedArt: { width: '100%', height: 62 },
  earnedName: { textAlign: 'center', fontSize: 11, lineHeight: 18 },
  selectionMark: {
    height: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  confirmArtwork: { width: 56, height: 56, alignSelf: 'center' },
  confirmTitle: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 5, rowGap: 2 },
  confirmName: { flexShrink: 1, maxWidth: '100%' },
  selectionError: { color: '#9B4058', marginBottom: 10 },
  check: { width: 17, height: 17 },
  challengeList: { paddingHorizontal: 14 },
  vaultCategories: { gap: 8, paddingVertical: 12 },
  vaultCategory: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 8 },
  vaultCategorySelected: { backgroundColor: C.tint },
  challenge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E1F5',
  },
  challengeArtwork: { width: 52, height: 52 },
  challengeArt: { width: 52, height: 52 },
  lock: { width: 18, height: 22, position: 'absolute', bottom: -1, right: -1 },
  challengeCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  challengeStack: { flexDirection: 'column', alignItems: 'stretch' },
  condition: { color: C.muted, marginTop: 5 },
  challengeProgress: { width: 118, gap: 7 },
  challengeProgressStack: { width: '100%' },
  fraction: { textAlign: 'right' },
  segments: { flexDirection: 'row', gap: 3, height: 7 },
  segment: { flex: 1, borderRadius: 4, backgroundColor: '#D5D0E2' },
  segmentActive: { backgroundColor: '#A079DE' },
  continuousTrack: {
    width: '100%',
    height: 7,
    borderRadius: 4,
    backgroundColor: C.track,
    overflow: 'hidden',
  },
  footer: { textAlign: 'center', color: C.muted, marginTop: 18 },
  empty: { color: C.muted, padding: 16, textAlign: 'center', width: '100%' },
  loading: { gap: 20, paddingVertical: 15 },
  skeleton: { height: 100, borderRadius: 18, backgroundColor: '#EEE9F5' },
  message: { padding: 18, gap: 8, marginBottom: 14 },
  retry: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(25,21,47,.45)',
  },
  pickerSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    backgroundColor: C.canvas,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
  },
});
