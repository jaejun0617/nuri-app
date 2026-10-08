import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '../../../../app/ui/AppText';
import { HomeSectionGlass } from '../../../../components/home/HomeSectionGlass';
import { useMonthlyExpenses } from '../../../../hooks/useMonthlyExpenses';
import { getMonthKeyInKst } from '../../../../utils/date';
import { formatRecordPriceLabel } from '../../../../services/records/form';

export default function MonthlyExpenseSection({
  onPress,
}: {
  onPress: (monthKey: string) => void;
}) {
  const monthKey = getMonthKeyInKst(new Date());
  const query = useMonthlyExpenses(monthKey ?? '');
  if (!monthKey) return null;
  return (
    <HomeSectionGlass style={styles.panel}>
      <TouchableOpacity
        testID="home-monthly-expenses"
        accessibilityRole="button"
        accessibilityLabel="월별 지출 상세 보기"
        onPress={() => onPress(monthKey)}
        style={styles.content}
      >
        <View style={styles.heading}>
          <AppText preset="unifiedBody" style={styles.title}>
            이번 달 기록한 지출
          </AppText>
          <AppText preset="unifiedMeta" style={styles.meta}>
            전체 펫
          </AppText>
        </View>
        <AppText preset="unifiedTitle" style={styles.amount}>
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
      </TouchableOpacity>
    </HomeSectionGlass>
  );
}
const styles = StyleSheet.create({
  panel: { marginTop: 12 },
  content: { paddingHorizontal: 18, paddingVertical: 16, gap: 8 },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: { color: '#172334', fontWeight: '800', flexShrink: 1 },
  amount: { color: '#172334', fontWeight: '900' },
  meta: { color: '#4F5A68', flexShrink: 1 },
});
