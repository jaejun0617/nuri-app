import React, { useCallback, useContext, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type CompositeNavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TimelineStackParamList } from '../../navigation/TimelineStackNavigator';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { ToolbarHeightContext } from '../../components/navigation/ToolbarHeightContext';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import AppText from '../../app/ui/AppText';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import Feather from '../../components/icons/NuriFeatherIcon';
import {
  SeasonalFormBackground,
  SeasonalFormPanel,
} from '../../components/common/SeasonalFormSurface';
import { useMonthlyExpenses } from '../../hooks/useMonthlyExpenses';
import {
  addMonthsToHealthReportMonthKey,
  normalizeHealthReportMonthKey,
} from '../../services/health-report/month';
import { formatRecordPriceLabel } from '../../services/records/form';
import type { MonthlyExpense } from '../../services/records/expenses';

export default function MonthlyExpensesScreen() {
  const navigation =
    useNavigation<
      CompositeNavigationProp<
        NativeStackNavigationProp<TimelineStackParamList, 'MonthlyExpenses'>,
        NativeStackNavigationProp<RootStackParamList>
      >
    >();
  const route =
    useRoute<RouteProp<TimelineStackParamList, 'MonthlyExpenses'>>();
  const [month, setMonth] = useState(() =>
    normalizeHealthReportMonthKey(route.params?.monthKey),
  );
  const [visibleCount, setVisibleCount] = useState(20);
  const query = useMonthlyExpenses(month);
  const toolbarHeight = useContext(ToolbarHeightContext);
  const insets = useSafeAreaInsets();
  const returnHome = useCallback(
    () => navigation.navigate('AppTabs', { screen: 'HomeTab' }),
    [navigation],
  );
  const onBack = useEntryAwareBackAction({
    entrySource: route.params?.entrySource,
    onHome: returnHome,
    onMore: returnHome,
    onFallback: () => navigation.goBack(),
  });
  const changeMonth = (offset: number) => {
    setVisibleCount(20);
    setMonth(current => addMonthsToHealthReportMonthKey(current, offset));
  };
  const renderItem = useCallback(
    ({ item }: { item: MonthlyExpense }) => (
      <TouchableOpacity
        style={styles.row}
        accessibilityRole="button"
        onPress={() =>
          navigation.navigate('RecordDetail', {
            petId: item.petId,
            memoryId: item.id,
          })
        }
      >
        <View style={styles.rowCopy}>
          <AppText preset="unifiedMeta" style={styles.meta}>
            {item.petName} ·{' '}
            {item.kind === 'shopping' ? '용품·쇼핑' : '병원·건강'} ·{' '}
            {item.date.replace(/-/g, '.')}
          </AppText>
          <AppText preset="unifiedBody" numberOfLines={2} style={styles.title}>
            {item.title}
          </AppText>
        </View>
        <AppText preset="unifiedBody" style={styles.price}>
          {formatRecordPriceLabel(item.price)}
        </AppText>
      </TouchableOpacity>
    ),
    [navigation],
  );
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <SeasonalFormBackground />
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="뒤로"
          style={styles.tool}
          onPress={onBack}
        >
          <Feather name="arrow-left" size={22} color="#172334" />
        </TouchableOpacity>
        <AppText preset="unifiedTitle" style={styles.heading}>
          월별 지출
        </AppText>
        <View style={styles.tool} />
      </View>
      <FlatList
        data={
          query.isError ? [] : query.data?.items.slice(0, visibleCount) ?? []
        }
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: (toolbarHeight ?? insets.bottom) + 20 },
        ]}
        refreshing={query.isFetching}
        onRefresh={() => {
          query.refetch();
        }}
        ListHeaderComponent={
          <>
            <View style={styles.monthRow}>
              <TouchableOpacity
                accessibilityLabel="이전 달"
                accessibilityRole="button"
                style={styles.tool}
                onPress={() => changeMonth(-1)}
              >
                <Feather name="chevron-left" size={22} />
              </TouchableOpacity>
              <AppText preset="unifiedBody" style={styles.title}>
                {Number(month.slice(0, 4))}년 {Number(month.slice(5))}월
              </AppText>
              <TouchableOpacity
                accessibilityLabel="다음 달"
                accessibilityRole="button"
                style={styles.tool}
                onPress={() => changeMonth(1)}
              >
                <Feather name="chevron-right" size={22} />
              </TouchableOpacity>
            </View>
            <SeasonalFormPanel style={styles.summary}>
              <AppText preset="unifiedMeta" style={styles.meta}>
                전체 펫 · 기록한 지출
              </AppText>
              <AppText preset="unifiedTitle" style={styles.total}>
                {query.isError
                  ? '조회하지 못했어요'
                  : query.data
                  ? formatRecordPriceLabel(query.data.total)
                  : '불러오는 중'}
              </AppText>
              {query.data && !query.isError ? (
                <AppText preset="unifiedMeta" style={styles.meta}>
                  용품 {formatRecordPriceLabel(query.data.shopping)} · 병원·건강{' '}
                  {formatRecordPriceLabel(query.data.medical)}
                </AppText>
              ) : null}
            </SeasonalFormPanel>
            {query.data?.legacyDateCount ? (
              <AppText preset="unifiedMeta" style={styles.meta}>
                날짜가 없는 {query.data.legacyDateCount}건은 등록일 기준이에요.
              </AppText>
            ) : null}
          </>
        }
        ListEmptyComponent={
          !query.isFetching ? (
            <AppText preset="unifiedBody" style={styles.empty}>
              {query.isError
                ? '잠시 후 다시 시도해 주세요.'
                : '이 달에 금액을 기록한 지출이 없어요.'}
            </AppText>
          ) : undefined
        }
        ListFooterComponent={
          query.data &&
          !query.isError &&
          visibleCount < query.data.items.length ? (
            <CtaButton
              role="neutral"
              onPress={() => setVisibleCount(count => count + 20)}
            >
              <CtaText preset="unifiedBody">지출 더 보기</CtaText>
            </CtaButton>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  tool: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { flex: 1, textAlign: 'center', fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingBottom: 20 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  summary: { gap: 8, marginBottom: 12 },
  total: { color: '#172334', fontWeight: '900' },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CAD0D8',
  },
  rowCopy: { flex: 1, gap: 5 },
  title: { color: '#172334', fontWeight: '700' },
  meta: { color: '#4F5A68' },
  price: {
    color: '#172334',
    fontWeight: '800',
    maxWidth: '40%',
    flexShrink: 1,
    textAlign: 'right',
  },
  empty: { paddingVertical: 28, textAlign: 'center', color: '#4F5A68' },
});
