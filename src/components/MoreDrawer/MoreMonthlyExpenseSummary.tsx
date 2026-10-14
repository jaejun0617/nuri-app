import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import AppText from '../../app/ui/AppText';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import { HomeFrostedGlass } from '../home/HomeFrostedGlass';
import NuriIcon from '../icons/NuriIcon';
import NuriSemanticIcon from '../icons/NuriSemanticIcon';
import { useMonthlyExpenses } from '../../hooks/useMonthlyExpenses';
import { getMonthKeyInKst } from '../../utils/date';
import { formatRecordPriceLabel } from '../../services/records/form';
import { MORE_MENU } from './moreMenuVisualTokens';

export default function MoreMonthlyExpenseSummary({
  onPress,
}: {
  onPress: (monthKey: string) => void;
}) {
  const monthKey = getMonthKeyInKst(new Date());
  const query = useMonthlyExpenses(monthKey ?? '');
  const theme = useTheme();
  const season = useEffectiveSeason();
  if (!monthKey) return null;
  const amount = query.isError
    ? '조회하지 못했어요'
    : query.data
    ? formatRecordPriceLabel(query.data.total)
    : '불러오는 중';
  return (
    <HomeFrostedGlass season={season} borderRadius={MORE_MENU.radius} style={styles.panel} testID="more-monthly-expenses-summary">
      <TouchableOpacity
        testID="more-monthly-expenses"
        accessibilityRole="button"
        accessibilityLabel={`${monthKey.replace('-', '년 ')}월, 이번 달 기록한 지출 ${amount}, 월별 지출 상세 보기`}
        onPress={() => onPress(monthKey)}
        activeOpacity={0.65}
        style={styles.content}
      >
        <View style={styles.heading}>
          <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <NuriIcon name="shopping" size={24} />
          </View>
          <AppText preset="unifiedBody" styleOverridesPreset style={[styles.title, { color: theme.colors.textPrimary }]}>
            이번 달 기록한 지출
          </AppText>
        </View>
        <View style={styles.value}>
          <AppText preset="unifiedTitle" styleOverridesPreset style={[styles.amount, { color: theme.colors.textPrimary }]}>
            {amount}
          </AppText>
          <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <NuriSemanticIcon family="feather" name="chevron-right" size={16} color={theme.colors.textSecondary} />
          </View>
        </View>
      </TouchableOpacity>
    </HomeFrostedGlass>
  );
}
const styles = StyleSheet.create({
  panel: { marginTop: 0 },
  content: {
    minHeight: 80,
    padding: 16,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  value: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '52%', flexShrink: 1 },
  title: { fontSize: 13, lineHeight: 18, fontWeight: '700', flexShrink: 1 },
  amount: { fontSize: 20, lineHeight: 26, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
});
