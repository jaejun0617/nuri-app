import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '../../app/ui/AppText';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import { DEFAULT_MIN_YEAR, formatDatePart } from '../../components/date-picker/datePickerUtils';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';
import { TIMELINE_DESIGN as C } from '../../theme/timelineDesign';

function MonthStepper({
  field,
  value,
  canGoBack = true,
  canGoForward = true,
  onStep,
}: {
  field: 'year' | 'month';
  value: number;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onStep: (direction: -1 | 1) => void;
}) {
  const isYear = field === 'year';
  const unit = isYear ? '년' : '월';

  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isYear ? '이전 연도' : '이전 월'}
        testID={`timeline-${field}-previous`}
        disabled={!canGoBack}
        onPress={() => onStep(-1)}
        style={styles.arrow}
      >
        <View style={[styles.arrowCircle, !canGoBack && styles.disabledArrow]}>
          <NuriSemanticIcon family="feather" name="chevron-left" size={18} color={C.ink} accessible={false} />
        </View>
      </Pressable>
      <AppText
        preset="unifiedTitle"
        styleOverridesPreset
        accessibilityLiveRegion="polite"
        testID={`timeline-${field}-value`}
        style={styles.value}
      >
        {`${value}${unit}`}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isYear ? '다음 연도' : '다음 월'}
        testID={`timeline-${field}-next`}
        disabled={!canGoForward}
        onPress={() => onStep(1)}
        style={styles.arrow}
      >
        <View style={[styles.arrowCircle, !canGoForward && styles.disabledArrow]}>
          <NuriSemanticIcon family="feather" name="chevron-right" size={18} color={C.ink} accessible={false} />
        </View>
      </Pressable>
    </View>
  );
}

export default function TimelineMonthPicker({
  monthKey,
  currentYear,
  availableMonths,
  onMonthChange,
  onClose,
  onShowAll,
}: {
  monthKey: string;
  currentYear: number;
  availableMonths: readonly string[];
  onMonthChange: (month: string) => void;
  onClose?: () => void;
  onShowAll?: () => void;
}) {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  const latest = useRef({ year, month });
  useEffect(() => { latest.current = { year, month }; }, [year, month]);
  const knownYears = availableMonths.map(key => Number(key.slice(0, 4)));
  const firstYear = Math.min(DEFAULT_MIN_YEAR, year, ...knownYears);
  const lastYear = Math.max(currentYear + 1, year, ...knownYears);
  const step = (field: 'year' | 'month', direction: -1 | 1) => {
    const value = field === 'year'
      ? latest.current.year + direction
      : (latest.current.month + direction + 11) % 12 + 1;
    if (field === 'year' && (value < firstYear || value > lastYear)) return;
    const next = { ...latest.current, [field]: value };
    latest.current = next;
    onMonthChange(`${formatDatePart(next.year, 4)}-${formatDatePart(next.month)}`);
  };

  return (
    <View testID="timeline-month-picker">
      {onClose ? <View style={styles.header}>
        <View style={styles.headerSlot} />
        <AppText accessibilityRole="header" preset="unifiedTitle" style={styles.heading}>연도·월 선택</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="연도·월 선택 닫기"
          testID="timeline-month-close"
          onPress={onClose}
          style={styles.headerSlot}
        >
          <NuriSemanticIcon family="feather" name="x" size={22} color="#000000" preserveOriginal accessible={false} />
        </Pressable>
      </View> : null}
      <View style={[styles.steppers, !onClose && styles.inlineSteppers]} testID="timeline-month-steppers">
        <MonthStepper
          field="year"
          value={year}
          canGoBack={year > firstYear}
          canGoForward={year < lastYear}
          onStep={direction => step('year', direction)}
        />
        <MonthStepper field="month" value={month} onStep={direction => step('month', direction)} />
      </View>
      {onShowAll ? <View style={styles.galleryAction}>
        <CtaButton role="primary" testID="timeline-month-show-all" onPress={onShowAll}>
          <CtaText preset="unifiedBody">전체 기록 모아보기</CtaText>
        </CtaButton>
      </View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  headerSlot: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heading: { color: C.ink, textAlign: 'center', flex: 1 },
  steppers: { gap: 2 },
  inlineSteppers: { paddingHorizontal: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2 },
  arrow: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  arrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.53)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledArrow: { opacity: 0.35 },
  value: { flex: 1, color: C.ink, textAlign: 'center', fontSize: 16, lineHeight: 24, paddingVertical: 5 },
  galleryAction: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, marginTop: 10, paddingTop: 10 },
});
