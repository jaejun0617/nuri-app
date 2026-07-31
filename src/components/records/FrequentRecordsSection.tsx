// 파일: src/components/records/FrequentRecordsSection.tsx
// 목적:
// - 홈에서 빠른 기록 진입과 선택된 반려동물의 최신 기록 요약을 함께 제공한다.
// - 평면 섹션 안에서 빠른 기록 진입과 최신 기록 요약을 함께 제공한다.

import AppText from '../../app/ui/AppText';
import React, { memo, useMemo } from 'react';
import {
  AppState,
  Pressable,
  View,
  type AppStateStatus,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useIsFocused } from '@react-navigation/native';

import type { MemoryRecord } from '../../services/supabase/memories';
import {
  buildFrequentRecordSummaries,
  type FrequentRecordCategory,
  type FrequentRecordSummary,
} from '../../services/home/frequentRecords';
import type { buildPetThemePalette } from '../../services/pets/themePalette';
import { SectionHeaderAction } from '../../app/ui/SectionHeaderAction';
import { styles } from './FrequentRecordsSection.styles';

type PetTheme = ReturnType<typeof buildPetThemePalette>;
type RecordStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'refreshing'
  | 'loadingMore'
  | 'error';

type FrequentRecordsSectionProps = {
  petTheme: PetTheme;
  records: ReadonlyArray<MemoryRecord>;
  recordStatus: RecordStatus;
  now?: Date;
  onPressCategory: (category: FrequentRecordCategory) => void;
  onPressAll: () => void;
};

const RELATIVE_TIME_REFRESH_MS = 60_000;

const CATEGORY_META: Record<
  FrequentRecordCategory,
  { label: string; icon: string }
> = {
  walk: { label: '산책', icon: 'walk' },
  meal: { label: '식사', icon: 'silverware-fork-knife' },
  health: { label: '건강', icon: 'heart-pulse' },
  grooming: { label: '미용', icon: 'content-cut' },
};

function RecordSummaryCard({
  item,
  accentColor,
  accentTint,
  onPress,
}: {
  item: FrequentRecordSummary;
  accentColor: string;
  accentTint: string;
  onPress: () => void;
}) {
  const meta = CATEGORY_META[item.category];
  const accessibilityLabel = item.hasRecentRecord
    ? `${meta.label} 기록하기, 최근 기록 ${item.relativeTimeLabel ?? '확인 불가'}, ${item.summaryLabel}`
    : `${meta.label} 기록하기, 아직 기록이 없습니다`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.recordCard,
        pressed ? styles.recordCardPressed : null,
      ]}
    >
      <View style={styles.recordContentStack}>
        <View style={styles.recordIconSlot}>
          <View style={[styles.recordIconWrap, { backgroundColor: accentTint }]}>
            <MaterialCommunityIcons
              name={meta.icon}
              size={23}
              color={accentColor}
            />
          </View>
        </View>
        <View style={styles.recordTitleSlot}>
          <AppText
            preset="unifiedLabel"
            style={styles.recordLabel}
            numberOfLines={1}
          >
            {meta.label}
          </AppText>
        </View>
        <View style={styles.recordTimeSlot}>
          {item.relativeTimeLabel ? (
            <View
              style={[styles.relativeTimeMarker, { backgroundColor: `${accentColor}18` }]}
            >
              <AppText preset="unifiedBody" style={[styles.relativeTimeText, { color: accentColor }]}>
                {item.relativeTimeLabel}
              </AppText>
            </View>
          ) : (
            <View style={styles.relativeTimePlaceholder} />
          )}
        </View>
        <View style={styles.recordSummarySlot}>
          <AppText
            preset="unifiedBody"
            style={styles.recordSummary}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {item.summaryLabel}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

function FrequentRecordsSectionBase({
  petTheme,
  records,
  recordStatus,
  now,
  onPressCategory,
  onPressAll,
}: FrequentRecordsSectionProps) {
  const isScreenFocused = useIsFocused();
  const [currentTime, setCurrentTime] = React.useState(() => now ?? new Date());

  React.useEffect(() => {
    if (now) {
      setCurrentTime(now);
      return;
    }

    if (!isScreenFocused || AppState.currentState !== 'active') return;

    const syncCurrentTime = () => setCurrentTime(new Date());
    syncCurrentTime();

    const timer = setInterval(syncCurrentTime, RELATIVE_TIME_REFRESH_MS);
    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') syncCurrentTime();
      },
    );

    return () => {
      clearInterval(timer);
      appStateSubscription.remove();
    };
  }, [isScreenFocused, now]);

  const summaries = useMemo(
    () => buildFrequentRecordSummaries(records, currentTime),
    [currentTime, records],
  );
  const isLoading =
    (recordStatus === 'idle' || recordStatus === 'loading') &&
    records.length === 0;
  const hasError = recordStatus === 'error' && records.length === 0;

  return (
    <View style={styles.section}>
        <View style={styles.headerRow}>
          <View style={styles.headerLead}>
            <View
              style={[styles.sparkleWrap, { backgroundColor: petTheme.tint }]}
            >
              <MaterialCommunityIcons
                name="creation"
                size={19}
                color={petTheme.primary}
              />
            </View>
            <View style={styles.headerTextGroup}>
              <AppText preset="unifiedTitle" style={[styles.title, { color: petTheme.primary }]}>
                자주 쓰는 기록
              </AppText>
              <AppText preset="unifiedBody"
                style={styles.subtitle}
                numberOfLines={1}
                ellipsizeMode="tail"
                allowFontScaling={false}
              >
                우리 아이의 일상을 빠르게 기록해보세요
              </AppText>
            </View>
          </View>
          <SectionHeaderAction
            color={petTheme.primary}
            onPress={onPressAll}
            accessibilityLabel="전체 기록 보기"
            textPreset="unifiedMicro"
            size="compact"
          />
        </View>

        {isLoading ? (
          <View style={styles.statusBox}>
            <AppText preset="unifiedBody" style={styles.statusText}>최근 기록을 불러오는 중이에요.</AppText>
          </View>
        ) : hasError ? (
          <View style={styles.statusBox}>
            <AppText preset="unifiedBody" style={styles.statusText}>기록을 확인할 수 없어요.</AppText>
          </View>
        ) : (
          <View style={styles.grid}>
            {summaries.map(item => (
              <RecordSummaryCard
                key={item.category}
                item={item}
                accentColor={petTheme.primary}
                accentTint={petTheme.tint}
                onPress={() => onPressCategory(item.category)}
              />
            ))}
          </View>
        )}
    </View>
  );
}

export const FrequentRecordsSection = memo(FrequentRecordsSectionBase);
