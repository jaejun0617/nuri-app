import React, { memo, useCallback, useState } from 'react';
import {
  ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet,
  TouchableOpacity, View, useWindowDimensions, type StyleProp, type TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import AppText from '../../app/ui/AppText';
import Feather from 'react-native-vector-icons/Feather';
import PremiumNoticeModal from '../../components/common/PremiumNoticeModal';
import { HomeReflectiveGlass } from '../../components/home/HomeReflectiveGlass';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { fetchActivityRankingSnapshot } from '../../services/ranking/activityRanking';
import {
  ACTIVITY_RANKING_QUERY_GC_TIME_MS, ACTIVITY_RANKING_QUERY_STALE_TIME_MS,
} from '../../services/ranking/activityRankingQuery';
import { useAuthStore } from '../../store/authStore';
import { openMoreDrawer } from '../../store/uiStore';
import { RANKING_COLORS as C, RANKING_TABS, RANKING_TYPOGRAPHY as T, type RankingDisplayRow, type RankingTab } from './rankingPresentation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'NuriRanking'>;
type Role = keyof typeof T;
const BRAND = require('../../assets/logo/logo_v2.png');
const PRIVACY_SHIELD = require('../../assets/ranking/privacy-shield.png');

const Copy = memo(function RankingCopy({ children, role = 'body', style, testID }: {
  children: React.ReactNode; role?: Role; style?: StyleProp<TextStyle>; testID?: string;
}) {
  return <AppText testID={testID} preset={role === 'body' || role === 'caption' ? 'unifiedBody' : role === 'label' ? 'unifiedLabel' : 'unifiedTitle'}
    styleOverridesPreset style={[s.copy, T[role], style]}>{children}</AppText>;
});

const Avatar = memo(function RankingAvatar({ row }: { row: RankingDisplayRow }) {
  // The RPC exposes no public avatar. Never infer a pet or profile image.
  return <View style={s.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Image testID="ranking-avatar" source={row.avatarSource ?? BRAND} resizeMode="contain" accessible={false}
      style={row.avatarSource ? s.avatarImage : s.brandImage} />
  </View>;
});

const RankingRow = memo(function RankingRow({ row, overall, stacked }: {
  row: RankingDisplayRow; overall: boolean; stacked: boolean;
}) {
  const podium = overall && row.rankNo <= 3;
  return <View testID="ranking-row" accessibilityLabel={[row.rankNo + '위', row.displayName, row.scoreLabel].join(', ')}
    style={[s.row, overall ? s.overallRow : s.categoryRow, (podium || (!overall && row.rankNo === 1)) && s.highlight]}>
    <View style={[s.rankSlot, podium && s.podium, podium && row.rankNo > 1 && s.secondaryPodium]}>
      <Copy role="rank" style={[s.rank, podium && s.podiumText]}>{row.rankNo}</Copy>
    </View>
    <Avatar row={row} />
    <View style={s.rowBody}>
      <View style={[s.nameScore, stacked && s.stacked]}>
        <Copy role="name" testID="ranking-name" style={s.name}>{row.displayName}</Copy>
        {overall || stacked ? <Copy role="number" testID="ranking-score" style={s.score}>{row.scoreLabel}</Copy> : null}
      </View>
      {!overall ? <View testID="ranking-bar" accessible={false} style={s.barTrack}>
        <LinearGradient colors={['#AC8BEA', '#9873E3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          testID="ranking-bar-fill" style={[s.barFill, { width: (row.barRatio * 80) + '%' }]} />
      </View> : null}
    </View>
    {!overall && !stacked ? <Copy role="number" testID="ranking-score" style={s.categoryScore}>{row.scoreLabel}</Copy> : null}
  </View>;
});

type MyStatus = 'loading' | 'ready' | 'error';
export type NuriRankingViewProps = {
  category: RankingTab;
  onCategoryChange: (tab: RankingTab) => void;
  rows: RankingDisplayRow[];
  myRow: RankingDisplayRow | null;
  myStatus: MyStatus;
  loading: boolean;
  error: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onBack: () => void;
  onInfo: () => void;
  topInset: number;
  bottomInset: number;
};

/** Shared rendering only; the screen owns authenticated query state. */
export function NuriRankingView({ category, onCategoryChange, rows, myRow, myStatus,
  loading, error, refreshing, onRefresh, onBack, onInfo, topInset, bottomInset }: NuriRankingViewProps) {
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 350 || fontScale >= 1.3;
  const meta = RANKING_TABS.find(tab => tab.key === category) ?? RANKING_TABS[0];
  return <View testID="ranking-screen" style={s.screen}>
    <LinearGradient testID="ranking-background" colors={['#FBF9FF', '#F0EBF9', '#F9F3FA']}
      start={{ x: 0, y: 0 }} end={{ x: 0.85, y: 1 }} pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill} />
    <View testID="ranking-status-bar" pointerEvents="none" style={[s.statusBar, { height: topInset }]} />
    <View style={[s.header, { paddingTop: topInset + 4 }]}>
      <View style={s.headerRow}>
        <TouchableOpacity testID="ranking-back" accessibilityRole="button" accessibilityLabel="랭킹 화면 닫기" style={s.iconButton} onPress={onBack}>
          <Feather name="chevron-left" size={24} color={C.ink} />
        </TouchableOpacity>
        <Copy role="title" style={s.headerTitle}>누리 랭킹</Copy>
        <TouchableOpacity testID="ranking-info" accessibilityRole="button" accessibilityLabel="랭킹 집계 기준 안내" style={s.iconButton} onPress={onInfo}>
          <Feather name="info" size={23} color={C.muted} />
        </TouchableOpacity>
      </View>
      <Copy role="subtitle" style={s.subtitle}>함께 쌓은 작은 순간들</Copy>
    </View>
    <View testID="ranking-tabs" style={s.tabs}>
      {RANKING_TABS.map(tab => <TouchableOpacity key={tab.key} testID={'ranking-tab-' + tab.key}
        accessibilityRole="tab" accessibilityState={{ selected: tab.key === category }} style={s.tab}
        onPress={() => { if (tab.key !== category) onCategoryChange(tab.key); }}>
        <Copy role="tab" style={[s.tabText, tab.key === category && s.activeText]}>{tab.label}</Copy>
        {tab.key === category ? <View testID="ranking-tab-underline" style={s.underline} /> : null}
      </TouchableOpacity>)}
    </View>
    <ScrollView testID="ranking-scroll" style={s.scroll} contentContainerStyle={[s.content, { paddingBottom: bottomInset + 16 }]}
      showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} colors={[C.accent]} />}>
      <View testID="ranking-heading" style={s.section}>
        <View style={[s.sectionTop, stacked && s.stacked]}>
          <Copy role="section">{meta.title}</Copy>
          <View style={s.privacy}><Image testID="ranking-privacy-shield" source={PRIVACY_SHIELD} accessible={false} resizeMode="contain" style={s.privacyIcon} /><Copy role="label" style={s.muted}>닉네임 보호 중</Copy></View>
        </View>
        <Copy style={s.helper}>{meta.helper}</Copy>
      </View>
      <View testID="ranking-table" style={s.table}>
        <HomeReflectiveGlass testID="ranking-table-glass" borderRadius={16} style={s.glassPaint} />
        <View style={s.columns}><Copy role="label" style={s.muted}>순위</Copy><Copy role="label" style={s.muted}>{meta.column}</Copy></View>
        {loading ? <View testID="ranking-loading" accessibilityRole="progressbar" accessibilityLabel="랭킹 불러오는 중" style={s.state}>
          <ActivityIndicator color={C.accent} /><Copy style={s.muted}>랭킹을 불러오고 있어요</Copy>
        </View> : null}
        {error ? <View testID="ranking-error" style={s.state}>
          <Copy role="title">랭킹을 불러오지 못했어요</Copy><Copy style={s.muted}>잠시 뒤 다시 확인해 주세요.</Copy>
          <TouchableOpacity testID="ranking-retry" accessibilityRole="button" style={s.retry} onPress={onRefresh}><Copy role="label" style={s.activeText}>다시 시도</Copy></TouchableOpacity>
        </View> : null}
        {!loading && !error && !rows.length ? <View testID="ranking-empty" style={s.state}>
          <Copy role="title">아직 쌓인 활동이 없어요</Copy><Copy style={s.muted}>활동이 쌓이면 순위를 확인할 수 있어요.</Copy>
        </View> : null}
        {!loading && !error ? rows.map(row => <RankingRow key={row.rowSource + '-' + row.rankNo} row={row} overall={category === 'overall'} stacked={stacked} />) : null}
      </View>
      <View testID="ranking-my-card" style={[s.myCard, stacked && s.myCardStacked]}>
        <HomeReflectiveGlass testID="ranking-my-glass" borderRadius={16} style={s.glassPaint} />
        <View style={s.meBadge}><Copy role="label" style={s.meText}>나</Copy></View>
        {myRow ? <><Avatar row={myRow} /><View style={s.myBody}>
          <Copy role="name">{myRow.displayName}</Copy><Copy role="caption" style={s.muted}>나의 {meta.label} 순위</Copy>
          {stacked ? <Copy role="number" style={s.myScore}>{myRow.rankNo}위 · {myRow.scoreLabel}</Copy> : null}
        </View>{!stacked ? <View style={s.myNumbers}><Copy role="number">{myRow.rankNo}위</Copy><Copy role="label" style={s.muted}>{myRow.scoreLabel}</Copy></View> : null}</> : <View style={s.myBody}>
          <Copy role="label">나의 {meta.label} 순위</Copy>
          <Copy style={s.muted}>{myStatus === 'loading' ? '내 순위를 불러오고 있어요' : myStatus === 'ready' ? '아직 순위가 없어요' : '내 순위를 불러오지 못했어요'}</Copy>
        </View>}
      </View>
      {meta.footer ? <Copy role="caption" testID="ranking-footer" style={s.footer}>{meta.footer}</Copy> : null}
    </ScrollView>
  </View>;
}

export default function NuriRankingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RootScreenRoute<'NuriRanking'>>();
  const insets = useSafeAreaInsets();
  const owner = useAuthStore(state => state.session?.user.id ?? null);
  const [category, setCategory] = useState<RankingTab>('overall');
  const [info, setInfo] = useState(false);
  const rankingQuery = useQuery({
    queryKey: ['activity-ranking-snapshot-v1', owner, category],
    queryFn: () => fetchActivityRankingSnapshot(category),
    enabled: !!owner,
    staleTime: ACTIVITY_RANKING_QUERY_STALE_TIME_MS,
    gcTime: ACTIVITY_RANKING_QUERY_GC_TIME_MS,
    retry: 1,
  });
  const backAction = useEntryAwareBackAction({
    entrySource: route.params?.entrySource,
    onHome: () => navigation.reset({ index: 0, routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }] }),
    onMore: () => { navigation.goBack(); requestAnimationFrame(openMoreDrawer); },
    onFallback: () => navigation.goBack(),
  });
  const onRefresh = useCallback(() => { rankingQuery.refetch().catch(() => undefined); }, [rankingQuery]);
  return <>
    <NuriRankingView category={category} onCategoryChange={setCategory}
      rows={rankingQuery.data?.rows ?? []} myRow={rankingQuery.data?.myRow ?? null}
      myStatus={rankingQuery.isPending && owner ? 'loading' : rankingQuery.isError || !owner ? 'error' : 'ready'}
      loading={rankingQuery.isPending && !!owner} error={rankingQuery.isError || !owner}
      refreshing={rankingQuery.isRefetching} onRefresh={onRefresh}
      onBack={backAction} onInfo={() => setInfo(true)} topInset={insets.top} bottomInset={insets.bottom} />
    <PremiumNoticeModal visible={info} eyebrow="누리 랭킹" titleLines={['랭킹 집계 기준']} iconName="shield" accentColor={C.accent}
      bodyLines={['계정 전체의 누적 XP와 활동 지표를 기준으로 집계해요.', '산책은 XP, 글·댓글·건강·생활은 각 활동 수를 표시해요.', '현재 사용자는 나, 다른 사용자는 보호된 이름으로 표시해요.']}
      onClose={() => setInfo(false)} />
  </>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  copy: { color: C.ink, letterSpacing: 0, includeFontPadding: false, flexShrink: 1 },
  muted: { color: C.muted }, activeText: { color: C.accent },
  statusBar: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 12, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  iconButton: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center' },
  subtitle: { marginTop: 10, textAlign: 'center', color: C.muted },
  tabs: { flexDirection: 'row', marginHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, minWidth: 0, minHeight: 52, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  tabText: { textAlign: 'center', color: C.muted },
  underline: { position: 'absolute', bottom: 0, left: 4, right: 4, height: 2, backgroundColor: C.accent },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 24 },
  section: { marginBottom: 18, gap: 4 },
  sectionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  privacyIcon: { width: 14, height: 16 },
  helper: { color: C.muted },
  table: { paddingHorizontal: 10, paddingTop: 12, paddingBottom: 8, borderRadius: 16 },
  glassPaint: { ...StyleSheet.absoluteFill, width: 'auto', marginTop: 0 },
  columns: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, paddingBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 6, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  overallRow: { minHeight: 50 }, categoryRow: { minHeight: 62 },
  highlight: { backgroundColor: C.highlight, borderRadius: 9 },
  rankSlot: { width: 27, minHeight: 27, alignItems: 'center', justifyContent: 'center' },
  rank: { color: C.muted, textAlign: 'center' },
  podium: { borderRadius: 14, backgroundColor: C.accent },
  secondaryPodium: { backgroundColor: '#B69BEA' }, podiumText: { color: '#FFFFFF' },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8E0F8', overflow: 'hidden', flexShrink: 0 },
  avatarImage: { width: '100%', height: '100%' }, brandImage: { width: 29, height: 27 },
  rowBody: { flex: 1, minWidth: 0, gap: 5 },
  nameScore: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stacked: { flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  name: { flex: 1, minWidth: 0 },
  score: { textAlign: 'right', flexShrink: 1 },
  categoryScore: { textAlign: 'right', minWidth: 70, flexShrink: 0 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: C.track, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  myCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, paddingHorizontal: 12, paddingVertical: 16, minHeight: 80, borderRadius: 16 },
  myCardStacked: { alignItems: 'flex-start' },
  meBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  meText: { color: '#FFFFFF' }, myBody: { flex: 1, minWidth: 0, gap: 3 }, myNumbers: { alignItems: 'flex-end' },
  myScore: { textAlign: 'left' }, footer: { marginTop: 20, paddingVertical: 4, textAlign: 'center', color: C.muted },
  state: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  retry: { minHeight: 48, paddingHorizontal: 20, justifyContent: 'center' },
});
