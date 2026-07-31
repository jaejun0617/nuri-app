// 파일: src/components/records/FrequentRecordsSection.tsx
// 목적:
// - 홈에서 빠른 기록 진입과 선택된 반려동물의 최신 기록 요약을 함께 제공한다.
// - 그라디언트 보더, 테마 포인트, 1:1:1:1 기록 카드를 이 섹션 안에서만 관리한다.

import React, { memo, useMemo } from 'react';
import {
  AppState,
  Pressable,
  Text,
  View,
  type AppStateStatus,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useIsFocused } from '@react-navigation/native';

import type { MemoryRecord } from '../../services/supabase/memories';
import {
  buildFrequentRecordSummaries,
  type FrequentRecordCategory,
  type FrequentRecordSummary,
} from '../../services/home/frequentRecords';
import type { buildPetThemePalette } from '../../services/pets/themePalette';
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
        { borderColor: `${accentColor}20` },
        pressed ? styles.recordCardPressed : null,
      ]}
    >
      <View style={styles.recordContentStack}>
        <View style={styles.recordIconSlot}>
          <View style={[styles.recordIconWrap, { backgroundColor: accentTint }]}>
            <MaterialCommunityIcons
              name={meta.icon}
              size={22}
              color={accentColor}
            />
          </View>
        </View>
        <View style={styles.recordTitleSlot}>
          <Text style={styles.recordLabel} numberOfLines={1}>
            {meta.label}
          </Text>
        </View>
        <View style={styles.recordTimeSlot}>
          {item.relativeTimeLabel ? (
            <View
              style={[styles.relativeTimePill, { backgroundColor: accentTint }]}
            >
              <Text style={[styles.relativeTimeText, { color: accentColor }]}>
                {item.relativeTimeLabel}
              </Text>
            </View>
          ) : (
            <View style={styles.relativeTimePlaceholder} />
          )}
        </View>
        <View style={styles.recordSummarySlot}>
          <Text style={styles.recordSummary} numberOfLines={2}>
            {item.summaryLabel}
          </Text>
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
    <LinearGradient
      colors={[
        `${petTheme.ringGradient[0]}A6`,
        '#F6D9F6',
        '#F7E0D1',
        '#DDEBFA',
        `${petTheme.ringGradient[2]}A6`,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.outerCard}
    >
      <View style={styles.innerCard}>
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
              <Text style={[styles.title, { color: petTheme.primary }]}>
                자주 쓰는 기록
              </Text>
              <Text
                style={styles.subtitle}
                numberOfLines={1}
                ellipsizeMode="tail"
                allowFontScaling={false}
              >
                우리 아이의 일상을 빠르게 기록해보세요
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="전체 기록 보기"
            onPress={onPressAll}
            style={({ pressed }) => [
              styles.allButton,
              {
                borderColor: `${petTheme.primary}26`,
              },
              pressed ? styles.allButtonPressed : null,
            ]}
          >
            <Text style={[styles.allButtonText, { color: petTheme.primary }]}>
              전체 보기
            </Text>
            <Feather name="chevron-right" size={14} color={petTheme.primary} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>최근 기록을 불러오는 중이에요.</Text>
          </View>
        ) : hasError ? (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>기록을 확인할 수 없어요.</Text>
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
    </LinearGradient>
  );
}

export const FrequentRecordsSection = memo(FrequentRecordsSectionBase);
