import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, ScrollView, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type CompositeNavigationProp, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TimelineStackParamList } from '../../navigation/TimelineStackNavigator';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { ToolbarHeightContext } from '../../components/navigation/ToolbarHeightContext';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import AppText from '../../app/ui/AppText';
import { ASSETS } from '../../assets';
import Feather from '../../components/icons/NuriFeatherIcon';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';
import { HomeFloatingWidgetSurface } from '../../components/home/HomeWidgetMaterial';
import PremiumNoticeModal from '../../components/common/PremiumNoticeModal';
import { useMonthlyExpenses } from '../../hooks/useMonthlyExpenses';
import { addMonthsToHealthReportMonthKey, normalizeHealthReportMonthKey } from '../../services/health-report/month';
import { formatRecordPriceLabel } from '../../services/records/form';
import { usePetStore } from '../../store/petStore';
import { openMoreDrawer } from '../../store/uiStore';
import { EXPENSE_GROUPS, monthlyExpenseLayout, presentMonthlyExpenses, type ExpenseFilter, type ExpenseListRow } from './monthlyExpensePresentation';
import { isMonthlyExpensePreviewEnabled, MONTHLY_EXPENSE_PREVIEW_ITEMS, MONTHLY_EXPENSE_PREVIEW_MONTH, MONTHLY_EXPENSE_PREVIEW_PETS } from './monthlyExpensePreview';
import { EXPENSE_COLORS as colors, styles } from './MonthlyExpensesScreen.styles';

function GroupIcon({ kind, size = 36 }: { kind: typeof EXPENSE_GROUPS[number]['key']; size?: number }) {
  const group = EXPENSE_GROUPS.find(item => item.key === kind)!;
  return <View testID={'expense-list-icon-' + kind} style={[styles.icon, { width: size, height: size, borderRadius: size / 2, backgroundColor: group.tint }]}>
    <NuriSemanticIcon family={kind === 'grooming' ? 'feather' : 'material'} name={group.icon} size={size * 0.66} color={group.color}
      style={kind === 'grooming' ? styles.uprightScissors : undefined} preserveOriginal />
  </View>;
}

export default function MonthlyExpensesScreen() {
  const navigation = useNavigation<CompositeNavigationProp<NativeStackNavigationProp<TimelineStackParamList, 'MonthlyExpenses'>, NativeStackNavigationProp<RootStackParamList>>>();
  const route = useRoute<RouteProp<TimelineStackParamList, 'MonthlyExpenses'>>();
  const preview = isMonthlyExpensePreviewEnabled();
  const [month, setMonth] = useState(() => preview ? MONTHLY_EXPENSE_PREVIEW_MONTH : normalizeHealthReportMonthKey(route.params?.monthKey));
  const [petId, setPetId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ExpenseFilter>('all');
  const [petPickerOpen, setPetPickerOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const pets = usePetStore(state => state.pets);
  const availablePets = preview ? MONTHLY_EXPENSE_PREVIEW_PETS : pets;
  // Removing a pet falls back locally; this filter never changes Home's selected pet.
  const validPetId = availablePets.some(pet => pet.id === petId) ? petId : null;
  const selectedPet = availablePets.find(pet => pet.id === validPetId);
  const listRef = useRef<FlatList<ExpenseListRow>>(null);
  useEffect(() => {
    setMonth(preview ? MONTHLY_EXPENSE_PREVIEW_MONTH : normalizeHealthReportMonthKey(route.params?.monthKey));
    setPetId(null);
    setFilter('all');
  }, [route.params?.monthKey, route.params?.entryRequestId, preview]);
  const query = useMonthlyExpenses(month, !preview);
  const toolbarHeight = useContext(ToolbarHeightContext);
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const dataReady = preview || Boolean(query.data);
  const error = !preview && query.isError;
  const loading = !preview && !query.data && !error;
  const view = useMemo(() => {
    const sourceItems = preview ? month === MONTHLY_EXPENSE_PREVIEW_MONTH ? MONTHLY_EXPENSE_PREVIEW_ITEMS : [] : query.data?.items ?? [];
    return presentMonthlyExpenses(sourceItems, validPetId, filter);
  }, [preview, month, query.data?.items, validPetId, filter]);
  const amountCharacters = Math.max(...EXPENSE_GROUPS.map(group => formatRecordPriceLabel(view.summary[group.key]).length));
  const layout = monthlyExpenseLayout(width, fontScale, amountCharacters);
  const activeGroup = EXPENSE_GROUPS.find(group => group.key === filter);
  const returnHome = useCallback(() => navigation.navigate('AppTabs', { screen: 'HomeTab' }), [navigation]);
  const onBack = useEntryAwareBackAction({
    entrySource: route.params?.entrySource,
    onHome: returnHome,
    onMore: () => { navigation.goBack(); requestAnimationFrame(() => openMoreDrawer()); },
    onFallback: () => navigation.goBack(),
  });
  const changeMonth = (offset: number) => {
    setMonth(current => addMonthsToHealthReportMonthKey(current, offset));
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };
  const renderItem = ({ item: row, index }: { item: ExpenseListRow; index: number }) => (
    <View style={[styles.listPlate, index === 0 && styles.firstPlate, index === view.rows.length - 1 && styles.lastPlate]}>
      {row.type === 'date' ? <View style={styles.dateRow}>
        <AppText styleOverridesPreset style={[styles.dateText, styles.dateLabel]}>{Number(row.date.slice(5, 7))}월 {Number(row.date.slice(8, 10))}일</AppText>
        {filter === 'all' && <AppText styleOverridesPreset style={[styles.dateText, styles.dateTotal]}>{formatRecordPriceLabel(row.total)}</AppText>}
      </View> : <TouchableOpacity testID={'expense-row-' + row.item.id} style={styles.row} accessibilityRole="button"
        accessibilityLabel={row.item.title + ', ' + row.item.petName + ', ' + formatRecordPriceLabel(row.item.price)}
        onPress={() => { if (!preview) navigation.navigate('RecordDetail', { petId: row.item.petId, memoryId: row.item.id }); }}>
        <GroupIcon kind={row.item.kind} />
        <View style={[styles.rowBody, (layout.stackedRow || formatRecordPriceLabel(row.item.price).length > 11) && styles.stackedBody]}>
          <View style={styles.rowCopy}>
            <AppText styleOverridesPreset style={styles.rowTitle}>{row.item.title}</AppText>
            <View style={styles.rowMetaLine}>
              <View style={styles.petMetaDivider}><AppText styleOverridesPreset style={styles.rowMeta}>{row.item.petName}</AppText></View>
              <AppText styleOverridesPreset style={[styles.rowMeta, styles.categoryMeta]}>{EXPENSE_GROUPS.find(group => group.key === row.item.kind)?.label}</AppText>
            </View>
          </View>
          <AppText styleOverridesPreset style={styles.rowAmount}>{formatRecordPriceLabel(row.item.price)}</AppText>
        </View>
      </TouchableOpacity>}
    </View>
  );
  return <SafeAreaView testID={preview ? 'monthly-expenses-preview' : 'monthly-expenses-live'} style={styles.screen} edges={['top', 'left', 'right']}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" style={styles.tool} onPress={onBack}>
        <NuriSemanticIcon family="feather" name="arrow-left" size={24} color={colors.ink} preserveOriginal />
      </TouchableOpacity>
      <AppText typographyRole="screenTitle" preset="unifiedTitle" style={styles.heading}>월별 지출</AppText>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="월별 지출 안내" style={styles.tool} onPress={() => setInfoOpen(true)}>
        <NuriSemanticIcon family="feather" name="info" size={23} color="#706A8A" preserveOriginal />
      </TouchableOpacity>
    </View>
    <FlatList ref={listRef} data={error || loading ? [] : view.rows} keyExtractor={row => row.key} renderItem={renderItem}
      contentContainerStyle={[styles.content, { paddingHorizontal: layout.gutter, paddingBottom: (toolbarHeight ?? insets.bottom) + 24 }]}
      refreshing={!preview && query.isFetching} onRefresh={() => { if (!preview) query.refetch(); }}
      ListHeaderComponent={<>
        <View style={styles.monthRow}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="이전 달" style={styles.tool} onPress={() => changeMonth(-1)}><Feather name="chevron-left" size={24} color={colors.ink} /></TouchableOpacity>
          <AppText styleOverridesPreset style={styles.month}>{Number(month.slice(0, 4))}년 {Number(month.slice(5))}월</AppText>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="다음 달" style={styles.tool} onPress={() => changeMonth(1)}><Feather name="chevron-right" size={24} color={colors.ink} /></TouchableOpacity>
        </View>
        <View style={[styles.glass, styles.summary]} testID="expense-month-summary">
          <HomeFloatingWidgetSurface radius={16} testIDPrefix="expense-summary-glass" />
          <View style={styles.summaryHeading}>
            <AppText styleOverridesPreset style={styles.label}>이달 기록한 지출</AppText>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="아이 필터" style={styles.petSelector} onPress={() => setPetPickerOpen(true)}>
              <Image testID="expense-pet-scope-icon" accessible={false} source={require('../../assets/records/monthly-expense-pets.png')} style={styles.petScopeIcon} resizeMode="contain" />
              <AppText styleOverridesPreset style={styles.petName}>{selectedPet?.name ?? '전체 아이'}</AppText>
              <Feather name="chevron-down" size={17} color="#706A8A" />
            </TouchableOpacity>
          </View>
          <AppText styleOverridesPreset testID="expense-month-total" style={[styles.total, fontScale < 1.3 && styles.closeTotalSpacing, { fontSize: layout.totalFontSize, lineHeight: layout.totalFontSize + 11 }]}>
            {error ? '조회하지 못했어요' : !dataReady ? '불러오는 중' : <>{view.summary.total.toLocaleString('ko-KR')}<AppText styleOverridesPreset style={styles.unit}>원</AppText></>}
          </AppText>
          <AppText styleOverridesPreset style={styles.description}>타임라인에 남긴 비용을 모았어요</AppText>
          <View style={styles.divider} />
          <View style={[styles.categories, layout.verticalSummary && styles.verticalCategories]}>
            {EXPENSE_GROUPS.map((group, index) => <View key={group.key} style={[styles.categorySummary, layout.compact && !layout.verticalSummary && styles.compactSummary, layout.verticalSummary && styles.verticalSummary, index < EXPENSE_GROUPS.length - 1 && styles.categorySeparator]}>
              <View style={styles.summaryCopy}>
                <AppText styleOverridesPreset style={styles.summaryLabel}>{group.label}</AppText>
                <AppText styleOverridesPreset testID={'expense-summary-' + group.key} style={[styles.summaryAmount, width < 400 && { fontSize: 11, lineHeight: 20 }]}>{error || !dataReady ? '—' : formatRecordPriceLabel(view.summary[group.key])}</AppText>
              </View>
            </View>)}
          </View>
        </View>
        <View style={styles.tabs} accessibilityRole="tablist">
          {[{ key: 'all' as const, label: '전체' }, ...EXPENSE_GROUPS].map(group => <TouchableOpacity key={group.key}
            testID={'expense-tab-' + group.key} accessibilityRole="tab" accessibilityState={{ selected: filter === group.key }}
            accessibilityLabel={group.label} style={[styles.tab, filter === group.key && styles.activeTab]} onPress={() => setFilter(group.key)}>
            <AppText styleOverridesPreset style={[styles.tabLabel, filter === group.key && styles.activeTabLabel]}>{group.label}</AppText>
          </TouchableOpacity>)}
        </View>
        <View style={styles.listHeading}>
          <AppText styleOverridesPreset style={styles.listTitle}>{activeGroup ? activeGroup.label + ' 내역' : '지출 내역'}</AppText>
          <AppText styleOverridesPreset testID="expense-selected-count" style={styles.count}>{error || !dataReady ? '—' : (filter === 'all' ? '총 ' : '') + view.selected.length + '건'}</AppText>
        </View>
        {filter !== 'all' && <View style={styles.selectedTotal}>
          <AppText styleOverridesPreset style={styles.description}>선택한 항목 합계</AppText>
          <AppText styleOverridesPreset testID="expense-selected-total" style={styles.selectedAmount}>{error || !dataReady ? '—' : formatRecordPriceLabel(view.selectedTotal)}</AppText>
        </View>}
        {view.summary.legacyDateCount > 0 && !error && dataReady && <AppText styleOverridesPreset style={styles.footerText}>날짜가 없는 {view.summary.legacyDateCount}건은 등록일 기준이에요.</AppText>}
      </>}
      ListEmptyComponent={<View style={[styles.glass, styles.status]}>
        {loading ? <><ActivityIndicator color={colors.accent} /><AppText styleOverridesPreset style={styles.description}>지출을 불러오고 있어요</AppText></> : error ? <>
          <AppText styleOverridesPreset style={styles.emptyTitle}>지출을 불러오지 못했어요</AppText>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="지출 다시 시도" style={styles.retry} onPress={() => query.refetch()}><AppText styleOverridesPreset style={styles.retryText}>다시 시도</AppText></TouchableOpacity>
        </> : <><AppText styleOverridesPreset style={styles.emptyTitle}>{filter === 'all' ? '이달에 기록한 지출이 없어요' : activeGroup?.label + ' 지출이 없어요'}</AppText><AppText styleOverridesPreset style={styles.description}>타임라인에 비용을 남기면 여기에 모여요</AppText></>}
      </View>}
      ListFooterComponent={<View style={styles.footer}><NuriSemanticIcon family="feather" name="info" size={14} color="#9A91B5" preserveOriginal /><AppText styleOverridesPreset style={styles.footerText}>타임라인에 기록한 지출만 표시돼요</AppText></View>}
    />
    <PremiumNoticeModal visible={infoOpen} eyebrow="NURI" iconName="shield" titleLines={['월별 지출 안내']}
      bodyLines={['선택한 월과 아이의 타임라인에 기록한 비용을 모아요.', '병원·건강, 미용, 생활·용품을 포함해요.', '미용에는 목욕·위생에 기록한 비용도 포함해요.', '관리 항목이 여러 개여도 한 기록의 비용은 한 번만 합산해요.', ...(preview ? ['현재 화면은 디자인 검증용 데이터이며 실제 기록과 합산하지 않아요.'] : [])]}
      confirmLabel="알겠어요" accentColor={colors.accent} typographyMode="unified" onClose={() => setInfoOpen(false)} />
    <Modal testID="expense-pet-picker-modal" visible={petPickerOpen} transparent statusBarTranslucent navigationBarTranslucent animationType="fade" onRequestClose={() => setPetPickerOpen(false)}>
      <View style={styles.overlay}>
        <Pressable testID="expense-pet-picker-overlay" accessible={false} style={styles.pickerScrim} onPress={() => setPetPickerOpen(false)} />
        <View testID="expense-pet-picker" style={styles.sheet} accessibilityViewIsModal>
        <HomeFloatingWidgetSurface radius={20} testIDPrefix="expense-pet-picker-glass" />
        <View style={styles.pickerHeader}>
          <Image accessible={false} source={require('../../assets/records/monthly-expense-pets.png')} style={styles.petScopeIcon} resizeMode="contain" />
          <View style={styles.pickerHeadingCopy}>
            <AppText preset="unifiedTitle" style={styles.pickerTitle}>아이 선택</AppText>
            <AppText styleOverridesPreset style={styles.pickerDescription}>월별 지출을 확인할 아이를 골라 주세요</AppText>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="아이 선택 닫기" style={styles.tool} onPress={() => setPetPickerOpen(false)}>
            <NuriSemanticIcon family="feather" name="x" size={20} color={colors.muted} preserveOriginal />
          </TouchableOpacity>
        </View>
        <ScrollView>
          {[{ id: null, name: '전체 아이' }, ...availablePets].map((pet, index) => <TouchableOpacity key={pet.id ?? 'all'} accessibilityRole="radio"
            testID={'expense-pet-option-' + index} accessibilityLabel={pet.name} accessibilityState={{ checked: validPetId === pet.id, selected: validPetId === pet.id }} style={[styles.petOption, validPetId === pet.id && styles.petOptionSelected]}
            onPress={() => { setPetId(pet.id); setPetPickerOpen(false); listRef.current?.scrollToOffset({ offset: 0, animated: false }); }}>
            <View style={styles.pickerOptionIcon}>
              {pet.id === null ? <Image accessible={false} source={require('../../assets/records/monthly-expense-pets.png')} style={styles.petScopeIcon} resizeMode="contain" />
                : <Image testID={'expense-pet-symbol-' + index} accessible={false} source={ASSETS.logo} style={styles.pickerPetSymbol} resizeMode="contain" />}
            </View>
            <View style={styles.pickerHeadingCopy}>
              <AppText styleOverridesPreset style={[styles.rowTitle, validPetId === pet.id && styles.petOptionLabelSelected]}>{pet.name}</AppText>
              <AppText styleOverridesPreset style={styles.pickerOptionDescription}>{pet.id === null ? '모든 아이의 지출 모아보기' : '이 아이의 지출만 보기'}</AppText>
            </View>
            <View style={[styles.pickerRadio, validPetId === pet.id && styles.pickerRadioSelected]}>
              {validPetId === pet.id && <NuriSemanticIcon family="feather" name="check" size={14} color="#FFFFFF" preserveOriginal />}
            </View>
          </TouchableOpacity>)}
        </ScrollView>
        <AppText styleOverridesPreset style={styles.pickerFooter}>여기서 선택해도 홈의 아이는 바뀌지 않아요</AppText>
      </View></View>
    </Modal>
  </SafeAreaView>;
}
