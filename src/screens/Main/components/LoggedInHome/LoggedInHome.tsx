// 파일: src/screens/Main/components/LoggedInHome/LoggedInHome.tsx
// 목적:
// - 로그인 홈 (LoggedInHome)
// - ✅ "오늘날의 기록(전체보기)" : 가로 슬라이드(정사각 5:5, 옆 카드 살짝 보임)
//   - ✅ UX 고도화: snap 정밀화 + scale/active 강조 + parallax + momentum index 추적 + dot indicator
//   - ✅ 최대 14개까지만 슬라이더 노출(그 이상은 전체보기 유도)

import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  type ListRenderItem,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator, // ✅ 로딩 스피너 추가
} from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import Screen from '../../../../components/layout/Screen';
import { useWeatherGuide } from '../../../../hooks/useWeatherGuide';
import { useSignedMemoryImage } from '../../../../hooks/useSignedMemoryImage';
import type { AppTabParamList } from '../../../../navigation/AppTabsNavigator';
import type { TimelineStackParamList } from '../../../../navigation/TimelineStackNavigator';
import type { RootStackParamList } from '../../../../navigation/RootNavigator';
import {
  getRecordCategoryMeta,
  normalizeCategoryKey,
  readRecordCategoryRaw,
  type MemoryMainCategory,
  type MemoryOtherSubCategory,
} from '../../../../services/memories/categoryMeta';
import { useAuthStore } from '../../../../store/authStore';
import { usePetStore } from '../../../../store/petStore';
import type { PetRecordsState } from '../../../../store/recordStore';
import { useRecordStore } from '../../../../store/recordStore';
import { useScheduleStore } from '../../../../store/scheduleStore';

import type { MemoryRecord } from '../../../../services/supabase/memories';
import type { PetSchedule } from '../../../../services/supabase/schedules';
import {
  pickTodayPhoto,
  generateTimeMessage,
  getTimeMessageEmoji,
} from '../../../../services/home/homeRecall';
import { buildHomeWidgetSnapshot } from '../../../../services/home/widgetSnapshot';
import { syncHomeWidgetSnapshot } from '../../../../services/home/widgetBridge';
import { buildWeeklySummary } from '../../../../services/home/weeklySummary';
import {
  formatScheduleDateLabel,
  getScheduleColorPalette,
  mapScheduleIconName,
  mapScheduleToMemoryCategory,
} from '../../../../services/schedules/presentation';
import { buildPetThemePalette } from '../../../../services/pets/themePalette';
import {
  formatMemorialPetName,
  isMemorialPet,
} from '../../../../services/pets/memorial';
import WeatherGuideHomeCard from '../../../../components/weather/WeatherGuideHomeCard';
import { styles } from './LoggedInHome.styles';

type HomeTabNav = BottomTabNavigationProp<AppTabParamList, 'HomeTab'>;
type RootNav = NativeStackNavigationProp<RootStackParamList>;
type Nav = CompositeNavigationProp<HomeTabNav, RootNav>;
type TimelineMainCategory = NonNullable<
  TimelineStackParamList['TimelineMain']
>['mainCategory'];
type TimelineOtherSubCategory = NonNullable<
  TimelineStackParamList['TimelineMain']
>['otherSubCategory'];
type HomeMainCategory = Exclude<MemoryMainCategory, 'all'>;
type HomeOtherSubCategory = MemoryOtherSubCategory;

type WeeklyScheduleItem = {
  key: string;
  dateLabel: string;
  title: string;
  subtitle: string;
  icon: string;
  tint: string;
  mainCategory: HomeMainCategory;
  otherSubCategory?: HomeOtherSubCategory;
};

/* ---------------------------------------------------------
 * 1) helpers
 * -------------------------------------------------------- */
function toSnippet(text: string | null | undefined, max = 46) {
  const v = (text ?? '').trim();
  if (!v) return '내용이 없습니다.';
  if (v.length <= max) return v;
  return `${v.slice(0, max)}…`;
}

function formatYmdToDots(ymd: string | null | undefined): string | null {
  const s = (ymd ?? '').trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return `${s.slice(0, 4)}.${s.slice(5, 7)}.${s.slice(8, 10)}`;
}

function getRecordYmdDots(item: MemoryRecord): string {
  const raw = (item.occurredAt ?? item.createdAt.slice(0, 10)) as string;
  return formatYmdToDots(raw) ?? raw;
}

function calcAgeFromBirth(birthYmd: string | null | undefined): number | null {
  const s = (birthYmd ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;

  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  if (!y || !m || !d) return null;

  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  let age = kstNow.getUTCFullYear() - y;
  const curM = kstNow.getUTCMonth() + 1;
  const curD = kstNow.getUTCDate();

  if (curM < m || (curM === m && curD < d)) age -= 1;
  if (age < 0) return 0;
  return age;
}

function calcDaysSinceAdoption(
  adoptionYmd: string | null | undefined,
): number | null {
  const s = (adoptionYmd ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;

  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  if (!y || !m || !d) return null;

  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  const startUtc = Date.UTC(y, m - 1, d);
  const endUtc = Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate(),
  );

  const diffDays = Math.floor((endUtc - startUtc) / (24 * 60 * 60 * 1000));
  if (!Number.isFinite(diffDays)) return null;

  return Math.max(0, diffDays + 1);
}

function formatGender(
  g: 'male' | 'female' | 'unknown' | null | undefined,
): string | null {
  if (!g || g === 'unknown') return null;
  return g === 'male' ? '남아' : '여아';
}

function formatWeightKg(v: number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}kg`;
}

function pickObjectParticle(word: string): '을' | '를' {
  const value = word.trim();
  if (!value) return '를';

  const lastChar = value.charCodeAt(value.length - 1);
  const HANGUL_BASE = 0xac00;
  const HANGUL_LAST = 0xd7a3;

  if (lastChar < HANGUL_BASE || lastChar > HANGUL_LAST) return '를';
  return (lastChar - HANGUL_BASE) % 28 === 0 ? '를' : '을';
}

function clampList(list: string[] | null | undefined, max = 2) {
  const arr = Array.isArray(list) ? list : [];
  return arr
    .map(s => (s ?? '').trim())
    .filter(Boolean)
    .slice(0, max);
}

function toRecordDate(item: MemoryRecord): Date | null {
  const source = item.occurredAt?.trim() || item.createdAt?.trim() || '';
  if (!source) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) {
    const date = new Date(`${source}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(source);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function diffCalendarDays(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

function formatRelativeRecordTime(item: MemoryRecord): string {
  const target = toRecordDate(item);
  if (!target) return '';

  const now = new Date();
  const diffMs = now.getTime() - target.getTime();
  const hourMs = 60 * 60 * 1000;

  if (diffMs < hourMs) return '방금 전';

  if (isSameDay(target, now)) {
    return `${Math.max(1, Math.floor(diffMs / hourMs))}시간 전`;
  }

  const diffDays = diffCalendarDays(target, now);
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;

  return `${target.getMonth() + 1}.${target.getDate()}`;
}

function buildScheduleCard(schedule: PetSchedule): WeeklyScheduleItem {
  const category = mapScheduleToMemoryCategory(schedule);
  const palette = getScheduleColorPalette(schedule.colorKey);
  return {
    key: schedule.id,
    dateLabel: formatScheduleDateLabel(schedule),
    title: schedule.title,
    subtitle:
      schedule.note?.trim() ||
      (schedule.allDay
        ? '하루 일정으로 저장된 항목이에요'
        : '예정된 일정이에요'),
    icon: mapScheduleIconName(schedule.iconKey),
    tint: palette.tint,
    mainCategory: category.mainCategory,
    otherSubCategory: category.otherSubCategory,
  };
}

const FALLBACK_RECORDS_STATE: Omit<PetRecordsState, 'requestSeq'> =
  Object.freeze({
    status: 'idle',
    items: [],
    errorMessage: null,
    cursor: null,
    hasMore: false,
  });

const FALLBACK_SCHEDULES_STATE = Object.freeze({
  items: [] as PetSchedule[],
  status: 'idle' as const,
  errorMessage: null as string | null,
  requestSeq: 0,
});

const TODAY_RECORDS_MAX = 14;

const HOME_SHORTCUTS: Array<{
  key: string;
  label: string;
  note: string;
  icon: string;
  mainCategory: Exclude<TimelineMainCategory, undefined>;
  otherSubCategory?: Exclude<TimelineOtherSubCategory, undefined>;
}> = [
  {
    key: 'walk',
    label: '산책일지',
    note: '산책',
    icon: 'walk',
    mainCategory: 'walk',
  },
  {
    key: 'health',
    label: '건강기록',
    note: '건강',
    icon: 'medical-bag',
    mainCategory: 'health',
  },
  {
    key: 'meal',
    label: '식사기록',
    note: '식사',
    icon: 'silverware-fork-knife',
    mainCategory: 'meal',
  },
  {
    key: 'grooming',
    label: '미용기록',
    note: '미용',
    icon: 'content-cut',
    mainCategory: 'other',
    otherSubCategory: 'grooming',
  },
];

const TIP_TEMPLATES: Array<{
  key: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    key: 'care',
    eyebrow: '건강 케어',
    title: '노령견을 위한 관절 관리 팁 5가지',
    description: '집에서도 천천히 따라할 수 있는 스트레칭부터 시작해요',
    icon: 'heart',
  },
  {
    key: 'meal',
    eyebrow: '식단 가이드',
    title: '꼭 챙기면 좋은 영양 밸런스 체크',
    description: '나이와 활동량에 맞춘 식사 리듬을 정리해 보세요',
    icon: 'sun',
  },
];

const TODAY_HOME_TIP = {
  badge: '오늘의 팁',
  title:
    '반려동물의 평소 소리를 기억해두면 작은 변화도 더 빨리 알아챌 수 있어요.',
  description:
    '산책 후 숨소리, 잠든 뒤 호흡, 식사 직후의 반응처럼 평소의 기준을 남겨두면 컨디션 변화를 더 빨리 알아차릴 수 있어요.',
};

const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList<MemoryRecord>,
);

/* ---------------------------------------------------------
 * 3) sub components (hooks-safe)
 * -------------------------------------------------------- */
const TodayRecordCard = React.memo(function TodayRecordCard({
  item,
  index,
  cardW,
  snap,
  scrollX,
  onPress,
}: {
  item: MemoryRecord;
  index: number;
  cardW: number;
  snap: number;
  scrollX: SharedValue<number>;
  onPress: (memoryId: string) => void;
}) {
  const ymd = useMemo(() => getRecordYmdDots(item), [item]);
  const title = useMemo(
    () => (item.title?.trim() ? item.title : '제목 없음'),
    [item.title],
  );
  const content = useMemo(() => toSnippet(item.content, 44), [item.content]);

  const { signedUrl, loading: isLoading } = useSignedMemoryImage(
    item.imagePath,
  );

  const cardAnimStyle = useAnimatedStyle(() => {
    const x = scrollX.value;
    const centerX = index * snap;
    const dist = Math.abs(x - centerX);

    const s = interpolate(dist, [0, snap], [1.0, 0.92], Extrapolate.CLAMP);
    const o = interpolate(dist, [0, snap], [1.0, 0.86], Extrapolate.CLAMP);

    return { transform: [{ scale: s }], opacity: o };
  }, [index, snap]);

  const imageAnimStyle = useAnimatedStyle(() => {
    const x = scrollX.value;
    const centerX = index * snap;

    const PARA = 18;
    const tx = interpolate(
      x - centerX,
      [-snap, 0, snap],
      [PARA, 0, -PARA],
      Extrapolate.CLAMP,
    );

    return { transform: [{ translateX: tx }] };
  }, [index, snap]);

  return (
    <Animated.View style={cardAnimStyle}>
      <TouchableOpacity
        activeOpacity={0.92}
        style={[styles.todayRecordCard, { width: cardW, height: cardW }]}
        onPress={() => onPress(item.id)}
      >
        <View style={styles.todayRecordMedia}>
          {/* ✅ 로딩 처리 추가 완료 */}
          {!item.imagePath ? (
            <View style={styles.todayRecordImgPlaceholder} />
          ) : isLoading ? (
            <View
              style={[
                styles.todayRecordImgPlaceholder,
                { justifyContent: 'center', alignItems: 'center' },
              ]}
            >
              <ActivityIndicator size="small" color="#fff" />
            </View>
          ) : signedUrl ? (
            <Animated.Image
              source={{ uri: signedUrl }}
              style={[styles.todayRecordImg, imageAnimStyle]}
            />
          ) : (
            <View style={styles.todayRecordImgPlaceholder} />
          )}

          <View style={styles.todayRecordOverlayTint} />
          <View style={styles.todayRecordBottomTint} />
          <View style={styles.todayRecordBottomTintDeep} />

          <View style={styles.todayRecordOverlay}>
            <Text style={styles.todayRecordTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.todayRecordContent} numberOfLines={2}>
              {content}
            </Text>
            <View style={styles.todayRecordMetaRow}>
              <View style={{ flex: 1 }} />
              <Text style={styles.todayRecordDate}>{ymd}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

function IndicatorDot({
  i,
  progress,
  color,
}: {
  i: number;
  progress: SharedValue<number>;
  color: string;
}) {
  const dotStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const dist = Math.abs(p - i);

    const s = interpolate(dist, [0, 1, 2], [1.35, 1.0, 0.9], Extrapolate.CLAMP);
    const o = interpolate(
      dist,
      [0, 1, 2],
      [1.0, 0.55, 0.35],
      Extrapolate.CLAMP,
    );

    return { opacity: o, transform: [{ scale: s }] };
  }, [i]);

  return (
    <Animated.View
      style={[styles.indicatorDot, { backgroundColor: color }, dotStyle]}
    />
  );
}

const MonthlyDiaryCard = React.memo(function MonthlyDiaryCard({
  item,
  onPress,
}: {
  item: MemoryRecord;
  onPress: (memoryId: string) => void;
}) {
  const { signedUrl } = useSignedMemoryImage(item.imagePath);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={styles.monthDiaryCard}
      onPress={() => onPress(item.id)}
    >
      <View style={styles.monthDiaryCover}>
        {signedUrl ? (
          <Image source={{ uri: signedUrl }} style={styles.monthDiaryImage} />
        ) : (
          <View style={styles.monthDiaryFallback}>
            <Feather name="image" size={20} color="rgba(85,96,112,0.55)" />
          </View>
        )}
      </View>
      <Text style={styles.monthDiaryTitle} numberOfLines={1}>
        {item.title?.trim() || '기록'}
      </Text>
      <Text style={styles.monthDiaryMeta} numberOfLines={1}>
        {getRecordYmdDots(item)}
      </Text>
    </TouchableOpacity>
  );
});

const TodayPhotoSection = React.memo(function TodayPhotoSection({
  todayPhoto,
  todayPhotoUrl,
  isTodayPhotoLoading,
  todayPhotoOverlayTitle,
  onPressRecordItem,
  onPressRecord,
  accentColor,
}: {
  todayPhoto: {
    record: MemoryRecord | null;
    mode: 'anniversary' | 'random' | 'none';
  };
  todayPhotoUrl: string | null;
  isTodayPhotoLoading: boolean;
  todayPhotoOverlayTitle: string;
  onPressRecordItem: (memoryId: string) => void;
  onPressRecord: () => void;
  accentColor: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: accentColor }]}>
          오늘날의 사진
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.photoCard}
        onPress={() =>
          todayPhoto.record
            ? onPressRecordItem(todayPhoto.record.id)
            : onPressRecord()
        }
      >
        {!todayPhoto.record?.imagePath ? (
          <View style={styles.photoPlaceholder} />
        ) : isTodayPhotoLoading ? (
          <View
            style={[
              styles.photoPlaceholder,
              { justifyContent: 'center', alignItems: 'center' },
            ]}
          >
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : todayPhotoUrl ? (
          <Image
            source={{ uri: todayPhotoUrl }}
            style={styles.photoImage}
            fadeDuration={250}
          />
        ) : (
          <View style={styles.photoPlaceholder} />
        )}

        <View style={styles.photoOverlayTint} />

        <View style={styles.photoOverlay}>
          <Text style={styles.photoOverlayTitle}>{todayPhotoOverlayTitle}</Text>
          <Text style={styles.photoOverlaySub} numberOfLines={1}>
            {todayPhoto.record?.title?.trim()
              ? todayPhoto.record.title
              : '추억을 눌러 확인해요'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
});

const TodayRecordsSection = React.memo(function TodayRecordsSection({
  todayRecords,
  onPressTimeline,
  onPressRecord,
  keyExtractor,
  renderTodayRecord,
  SNAP,
  slideScrollHandler,
  renderTodayRecordSeparator,
  progress,
  activeSlideIndex,
  hasMoreThanSlider,
  accentColor,
  accentDeepColor,
}: {
  todayRecords: MemoryRecord[];
  onPressTimeline: () => void;
  onPressRecord: () => void;
  keyExtractor: (it: MemoryRecord) => string;
  renderTodayRecord: ListRenderItem<MemoryRecord>;
  SNAP: number;
  slideScrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  renderTodayRecordSeparator: () => React.JSX.Element;
  progress: SharedValue<number>;
  activeSlideIndex: number;
  hasMoreThanSlider: boolean;
  accentColor: string;
  accentDeepColor: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: accentDeepColor }]}>
          오늘날의 기록
        </Text>
        <TouchableOpacity activeOpacity={0.85} onPress={onPressTimeline}>
          <Text style={[styles.sectionLink, { color: accentColor }]}>
            전체보기
          </Text>
        </TouchableOpacity>
      </View>

      {todayRecords.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>아직 기록이 없어요</Text>
          <Text style={styles.emptyDesc}>첫 번째 추억을 남겨보세요.</Text>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.recordBtn,
              {
                backgroundColor: accentDeepColor,
                shadowColor: accentDeepColor,
              },
            ]}
            onPress={onPressRecord}
          >
            <Text style={styles.recordBtnText}>기록하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.todayRecordsWrap}>
          <AnimatedFlatList
            data={todayRecords}
            keyExtractor={keyExtractor}
            renderItem={renderTodayRecord}
            horizontal
            showsHorizontalScrollIndicator={false}
            bounces={false}
            decelerationRate="fast"
            snapToInterval={SNAP}
            snapToAlignment="start"
            disableIntervalMomentum={false}
            onScroll={slideScrollHandler}
            scrollEventThrottle={16}
            contentContainerStyle={[
              styles.todayRecordsContent,
              { paddingRight: 16 },
            ]}
            ItemSeparatorComponent={renderTodayRecordSeparator}
            getItemLayout={(_, index) => ({
              length: SNAP,
              offset: SNAP * index,
              index,
            })}
          />

          <View style={styles.indicatorRow}>
            {todayRecords.map((_, i) => (
              <IndicatorDot
                key={`dot-${i}`}
                i={i}
                progress={progress}
                color={accentColor}
              />
            ))}
          </View>

          <View style={styles.moreHintRow}>
            <Text style={styles.moreHintText}>
              {activeSlideIndex + 1} / {todayRecords.length}
              {hasMoreThanSlider ? ' · 더 많은 기록은 ‘전체보기’' : ''}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
});

const WeeklySummarySection = React.memo(function WeeklySummarySection({
  petName,
  walkCount,
  mealCount,
  healthCount,
  recordDays,
  totalRecords,
  upcomingSchedules,
  accentDeepColor,
  accentSoftColor,
  accentBorderColor,
}: {
  petName: string;
  walkCount: number;
  mealCount: number;
  healthCount: number;
  recordDays: number;
  totalRecords: number;
  upcomingSchedules: number;
  accentDeepColor: string;
  accentSoftColor: string;
  accentBorderColor: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.tipSectionTitle, { color: accentDeepColor }]}>
          이번 주 요약
        </Text>
      </View>

      <View
        style={[
          styles.summaryCard,
          { backgroundColor: accentSoftColor, borderColor: accentBorderColor },
        ]}
      >
        <Text style={styles.summaryTitle}>
          이번 주 {petName}의 리듬을 한 장으로 정리했어요
        </Text>
        <Text style={styles.summaryDesc}>
          산책, 식사, 건강기록, 작성일 수를 기준으로 이번 주 흐름을 빠르게 볼 수
          있어요.
        </Text>

        <View style={styles.summaryGrid}>
          <View
            style={[styles.summaryItem, { borderColor: accentBorderColor }]}
          >
            <Text style={[styles.summaryValue, { color: accentDeepColor }]}>
              {walkCount}
            </Text>
            <Text style={styles.summaryLabel}>산책 기록</Text>
          </View>
          <View
            style={[styles.summaryItem, { borderColor: accentBorderColor }]}
          >
            <Text style={[styles.summaryValue, { color: accentDeepColor }]}>
              {mealCount}
            </Text>
            <Text style={styles.summaryLabel}>식사 기록</Text>
          </View>
          <View
            style={[styles.summaryItem, { borderColor: accentBorderColor }]}
          >
            <Text style={[styles.summaryValue, { color: accentDeepColor }]}>
              {healthCount}
            </Text>
            <Text style={styles.summaryLabel}>건강 기록</Text>
          </View>
          <View
            style={[styles.summaryItem, { borderColor: accentBorderColor }]}
          >
            <Text style={[styles.summaryValue, { color: accentDeepColor }]}>
              {recordDays}
            </Text>
            <Text style={styles.summaryLabel}>기록한 날</Text>
          </View>
        </View>

        <View style={styles.summaryFooterRow}>
          <Text style={styles.summaryFooterText}>
            이번 주 기록 {totalRecords}개
          </Text>
          <Text style={styles.summaryFooterText}>
            남은 일정 {upcomingSchedules}개
          </Text>
        </View>
      </View>
    </View>
  );
});

const ScheduleSection = React.memo(function ScheduleSection({
  weekScheduleItems,
  onPressScheduleList,
  onPressScheduleCreate,
  accentColor,
  accentDeepColor,
  accentTint,
}: {
  weekScheduleItems: WeeklyScheduleItem[];
  onPressScheduleList: () => void;
  onPressScheduleCreate: () => void;
  accentColor: string;
  accentDeepColor: string;
  accentTint: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.tipSectionTitle, { color: accentDeepColor }]}>
          일정 보기
        </Text>
        <TouchableOpacity activeOpacity={0.85} onPress={onPressScheduleList}>
          <Text style={[styles.sectionLink, { color: accentColor }]}>
            더보기
          </Text>
        </TouchableOpacity>
      </View>

      {weekScheduleItems.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>등록된 일정이 아직 없어요</Text>
          <Text style={styles.emptyDesc}>
            오래 남겨둘 일정도 한곳에 모아두고 홈에서 가볍게 꺼내볼 수 있어요.
          </Text>
        </View>
      ) : (
        <View style={styles.scheduleList}>
          {weekScheduleItems.map(item => (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.92}
              style={styles.scheduleCard}
              onPress={onPressScheduleList}
            >
              <View
                style={[
                  styles.scheduleDateBadge,
                  { backgroundColor: accentTint },
                ]}
              >
                <Text style={styles.scheduleDateText}>{item.dateLabel}</Text>
              </View>

              <View style={styles.scheduleBody}>
                <View
                  style={[
                    styles.scheduleIconWrap,
                    { backgroundColor: item.tint },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={18}
                    color={accentColor}
                  />
                </View>

                <View style={styles.scheduleTextCol}>
                  <Text style={styles.scheduleTitle}>{item.title}</Text>
                  <Text style={styles.scheduleSub} numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                </View>

                <Feather
                  name="chevron-right"
                  size={18}
                  color="rgba(85,96,112,0.48)"
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.recordBtn,
          { backgroundColor: accentDeepColor, shadowColor: accentDeepColor },
        ]}
        onPress={onPressScheduleCreate}
      >
        <Text style={styles.recordBtnText}>일정 추가하기</Text>
      </TouchableOpacity>
    </View>
  );
});

const RecentActivitiesSection = React.memo(function RecentActivitiesSection({
  recentActivities,
  onPressTimeline,
  onPressRecordItem,
  accentColor,
  accentDeepColor,
}: {
  recentActivities: MemoryRecord[];
  onPressTimeline: () => void;
  onPressRecordItem: (memoryId: string) => void;
  accentColor: string;
  accentDeepColor: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.tipSectionTitle, { color: accentDeepColor }]}>
          최근 활동
        </Text>
        <TouchableOpacity activeOpacity={0.85} onPress={onPressTimeline}>
          <Text style={[styles.sectionLink, { color: accentColor }]}>
            전체보기
          </Text>
        </TouchableOpacity>
      </View>

      {recentActivities.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>최근 활동이 아직 없어요</Text>
          <Text style={styles.emptyDesc}>
            기록을 남기면 홈에서 최근 움직임을 바로 볼 수 있어요.
          </Text>
        </View>
      ) : (
        <View style={styles.activityList}>
          {recentActivities.map(item => {
            const meta = getRecordCategoryMeta(item);
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.92}
                style={styles.activityRow}
                onPress={() => onPressRecordItem(item.id)}
              >
                <View
                  style={[
                    styles.activityIconWrap,
                    { backgroundColor: meta.tint },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={meta.icon}
                    size={17}
                    color={accentColor}
                  />
                </View>

                <View style={styles.activityTextCol}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {item.title?.trim() || meta.label}
                  </Text>
                  <Text style={styles.activitySub} numberOfLines={1}>
                    {meta.label}
                    {item.content?.trim()
                      ? ` · ${toSnippet(item.content, 26)}`
                      : ''}
                  </Text>
                </View>

                <Text style={styles.activityTime}>
                  {formatRelativeRecordTime(item)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
});

const MonthlyDiarySection = React.memo(function MonthlyDiarySection({
  petName,
  currentMonthDiaryEntries,
  onPressTimelineCategory,
  onPressRecord,
  onPressRecordItem,
  accentColor,
  accentDeepColor,
}: {
  petName: string;
  currentMonthDiaryEntries: MemoryRecord[];
  onPressTimelineCategory: (
    mainCategory: Exclude<TimelineMainCategory, undefined>,
    otherSubCategory?: Exclude<TimelineOtherSubCategory, undefined>,
  ) => void;
  onPressRecord: () => void;
  onPressRecordItem: (memoryId: string) => void;
  accentColor: string;
  accentDeepColor: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.tipSectionTitle, { color: accentDeepColor }]}>
          이번 달 {petName} 일기
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onPressTimelineCategory('diary')}
        >
          <Text style={[styles.sectionLink, { color: accentColor }]}>
            더보기
          </Text>
        </TouchableOpacity>
      </View>

      {currentMonthDiaryEntries.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>이번 달 일기가 아직 없어요</Text>
          <Text style={styles.emptyDesc}>첫 번째 일기를 남겨보세요.</Text>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.recordBtn,
              {
                backgroundColor: accentDeepColor,
                shadowColor: accentDeepColor,
              },
            ]}
            onPress={onPressRecord}
          >
            <Text style={styles.recordBtnText}>기록하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthDiaryList}
        >
          {currentMonthDiaryEntries.map(item => (
            <MonthlyDiaryCard
              key={item.id}
              item={item}
              onPress={onPressRecordItem}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
});

export default function LoggedInHome() {
  // ---------------------------------------------------------
  // 0) navigation
  // ---------------------------------------------------------
  const navigation = useNavigation<Nav>();
  const rootNavigation = navigation as unknown as RootNav;

  // ---------------------------------------------------------
  // 1) auth
  // ---------------------------------------------------------
  const nicknameRaw = useAuthStore(s => s.profile.nickname);

  // ---------------------------------------------------------
  // 2) pets
  // ---------------------------------------------------------
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const selectPet = usePetStore(s => s.selectPet);

  // ---------------------------------------------------------
  // 3) derived
  // ---------------------------------------------------------
  const nickname = useMemo(() => nicknameRaw?.trim() || null, [nicknameRaw]);

  const selectedPet = useMemo(() => {
    if (pets.length === 0) return null;
    if (!selectedPetId) return pets[0];
    return pets.find(p => p.id === selectedPetId) ?? pets[0];
  }, [pets, selectedPetId]);

  const activePetId = selectedPet?.id ?? null;

  // ---------------------------------------------------------
  // 3.5) pet switch transition (fade + lift)
  // ---------------------------------------------------------
  const [switching, setSwitching] = useState(false);

  const OUT_OPACITY = 0.92;
  const OUT_LIFT_PX = 0.1;

  const svOpacity = useSharedValue(1);
  const svTranslateY = useSharedValue(0);

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      opacity: svOpacity.value,
      transform: [{ translateY: svTranslateY.value }],
    };
  }, []);

  // ---------------------------------------------------------
  // 4) records
  // ---------------------------------------------------------
  const bootstrapRecords = useRecordStore(s => s.bootstrap);
  const bootstrapSchedules = useScheduleStore(s => s.bootstrap);

  const petRecordsState = useRecordStore(s =>
    activePetId ? s.byPetId[activePetId] ?? null : null,
  );
  const petSchedulesState = useScheduleStore(s =>
    activePetId ? s.byPetId[activePetId] ?? null : null,
  );

  const safeRecordsState = petRecordsState ?? FALLBACK_RECORDS_STATE;
  const safeSchedulesState = petSchedulesState ?? FALLBACK_SCHEDULES_STATE;

  useEffect(() => {
    if (!activePetId) return;
    bootstrapRecords(activePetId);
  }, [bootstrapRecords, activePetId]);

  useEffect(() => {
    if (!activePetId) return;
    bootstrapSchedules(activePetId);
  }, [activePetId, bootstrapSchedules]);

  // ---------------------------------------------------------
  // 4.3) today message / today photo
  // ---------------------------------------------------------
  const todayMessage = useMemo(() => {
    return generateTimeMessage({
      petName: selectedPet?.name ?? null,
      deathDate: selectedPet?.deathDate ?? null,
    });
  }, [selectedPet?.deathDate, selectedPet?.name]);
  const todayMessageEmoji = useMemo(
    () => getTimeMessageEmoji(selectedPet?.deathDate ?? null),
    [selectedPet?.deathDate],
  );

  const [todayPhoto, setTodayPhoto] = useState<{
    record: MemoryRecord | null;
    mode: 'anniversary' | 'random' | 'none';
  }>({ record: null, mode: 'none' });

  useEffect(() => {
    setTodayPhoto({ record: null, mode: 'none' });
  }, [activePetId]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!activePetId) {
        if (mounted) setTodayPhoto({ record: null, mode: 'none' });
        return;
      }
      const picked = await pickTodayPhoto(activePetId, safeRecordsState.items);
      if (mounted) setTodayPhoto(picked);
    }

    run();
    return () => {
      mounted = false;
    };
  }, [activePetId, safeRecordsState.items]);

  const { signedUrl: todayPhotoUrl, loading: isTodayPhotoLoading } =
    useSignedMemoryImage(todayPhoto.record?.imagePath);

  const todayPhotoOverlayTitle = useMemo(() => {
    if (todayPhoto.mode === 'anniversary') return '작년 오늘의 기억';
    if (todayPhoto.mode === 'random') return '오늘 꺼내보는 한 장';
    return '오늘의 사진';
  }, [todayPhoto.mode]);

  // ---------------------------------------------------------
  // ✅ 4.4) 오늘날의 기록(슬라이드) 데이터 (최대 14)
  // ---------------------------------------------------------
  const todayRecordsAll = safeRecordsState.items;
  const todayRecords = useMemo(
    () => todayRecordsAll.slice(0, TODAY_RECORDS_MAX),
    [todayRecordsAll],
  );
  const hasMoreThanSlider = todayRecordsAll.length > TODAY_RECORDS_MAX;

  // ---------------------------------------------------------
  // ✅ 4.5) 슬라이드 레이아웃 계산
  // ---------------------------------------------------------
  const { width: SCREEN_W } = Dimensions.get('window');
  const SLIDE_GAP = 14;

  const CARD_W = useMemo(() => {
    const usable = SCREEN_W - 16 * 2;
    const w = Math.floor(usable * 0.72);
    return Math.max(260, Math.min(w, 340));
  }, [SCREEN_W]);

  const SNAP = CARD_W + SLIDE_GAP;

  // ---------------------------------------------------------
  // ✅ 4.6) slider values
  // ---------------------------------------------------------
  const scrollX = useSharedValue(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    setActiveSlideIndex(0);
    scrollX.value = 0;
  }, [activePetId, scrollX]);

  const progress = useDerivedValue(() => {
    if (SNAP <= 0) return 0;
    return scrollX.value / SNAP;
  }, [SNAP]);

  const onSlideMomentumEnd = useCallback(
    (offsetX: number) => {
      if (SNAP <= 0) return;
      const idx = Math.round(offsetX / SNAP);
      const clamped = Math.max(
        0,
        Math.min(idx, Math.max(0, todayRecords.length - 1)),
      );
      setActiveSlideIndex(clamped);
    },
    [SNAP, todayRecords.length],
  );

  const slideScrollHandler = useAnimatedScrollHandler({
    onScroll: e => {
      scrollX.value = e.contentOffset.x;
    },
    onMomentumEnd: e => {
      runOnJS(onSlideMomentumEnd)(e.contentOffset.x);
    },
  });

  // ---------------------------------------------------------
  // 5) HERO derived
  // ---------------------------------------------------------
  const plainPetName = useMemo(
    () => selectedPet?.name?.trim() || '우리 아이',
    [selectedPet?.name],
  );

  const profilePetName = useMemo(
    () =>
      formatMemorialPetName(
        selectedPet?.name ?? '우리 아이',
        selectedPet?.deathDate ?? null,
      ),
    [selectedPet?.deathDate, selectedPet?.name],
  );

  const breed = useMemo(
    () => (selectedPet?.breed ?? '').trim() || null,
    [selectedPet?.breed],
  );

  const birthYmd = useMemo(
    () => (selectedPet?.birthDate ?? '').trim() || null,
    [selectedPet?.birthDate],
  );
  const birthText = useMemo(() => formatYmdToDots(birthYmd), [birthYmd]);

  const ageText = useMemo(() => {
    const age = calcAgeFromBirth(birthYmd);
    return age === null ? null : `${age}살`;
  }, [birthYmd]);

  const genderText = useMemo(
    () => formatGender(selectedPet?.gender ?? null),
    [selectedPet?.gender],
  );

  const weightText = useMemo(
    () => formatWeightKg(selectedPet?.weightKg ?? null),
    [selectedPet?.weightKg],
  );

  const topMetaLine = useMemo(() => {
    const parts: string[] = [];
    if (breed) parts.push(breed);
    if (ageText) parts.push(ageText);
    if (genderText) parts.push(genderText);
    if (weightText) parts.push(weightText);
    if (parts.length === 0) return null;
    return parts.join(' | ');
  }, [breed, ageText, genderText, weightText]);

  const togetherDays = useMemo(
    () => calcDaysSinceAdoption(selectedPet?.adoptionDate ?? null),
    [selectedPet?.adoptionDate],
  );

  const hobbies = useMemo(
    () => clampList(selectedPet?.hobbies, 2),
    [selectedPet?.hobbies],
  );
  const likes = useMemo(
    () => clampList(selectedPet?.likes, 2),
    [selectedPet?.likes],
  );
  const dislikes = useMemo(
    () => clampList(selectedPet?.dislikes, 2),
    [selectedPet?.dislikes],
  );

  const tags = useMemo(() => {
    const arr = Array.isArray(selectedPet?.tags)
      ? (selectedPet?.tags as string[])
      : [];
    const normalized = arr
      .map(t => (t ?? '').trim())
      .filter(Boolean)
      .slice(0, 10);
    if (normalized.length > 0) return normalized;
    return ['#산책러버', '#간식최애', '#주인바라기'];
  }, [selectedPet?.tags]);

  const selectedAvatarUri = useMemo(
    () => selectedPet?.avatarUrl ?? null,
    [selectedPet?.avatarUrl],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );
  const weatherGuideState = useWeatherGuide('일산동');
  const weatherGuide = weatherGuideState.bundle;

  // ---------------------------------------------------------
  // 6) header text
  // ---------------------------------------------------------
  const greetingTitle = useMemo(
    () => (nickname ? `${nickname}님, 반가워요!` : '반가워요!'),
    [nickname],
  );

  const greetingSubTitle = useMemo(() => {
    if (pets.length === 0) return '소중한 아이를 등록하고 추억을 기록해 보세요';
    return '오늘의 메시지로 하루를 시작해요';
  }, [pets.length]);

  const homeWidgetSnapshot = useMemo(
    () =>
      buildHomeWidgetSnapshot({
        petName: plainPetName,
        themeColor: petTheme.primary,
        schedules: safeSchedulesState.items,
        records: safeRecordsState.items,
      }),
    [
      plainPetName,
      petTheme.primary,
      safeRecordsState.items,
      safeSchedulesState.items,
    ],
  );

  useEffect(() => {
    syncHomeWidgetSnapshot(homeWidgetSnapshot);
  }, [homeWidgetSnapshot]);

  // ---------------------------------------------------------
  // 7) actions
  // ---------------------------------------------------------
  const onPressAddPet = useCallback(() => {
    rootNavigation.navigate('PetCreate', { from: 'header_plus' });
  }, [rootNavigation]);

  const onPressTimeline = useCallback(() => {
    navigation.navigate('TimelineTab', {
      screen: 'TimelineMain',
      params: {
        petId: activePetId ?? undefined,
        mainCategory: 'all',
      },
    });
  }, [navigation, activePetId]);

  const onPressScheduleList = useCallback(() => {
    rootNavigation.navigate('ScheduleList', {
      petId: activePetId ?? undefined,
    });
  }, [activePetId, rootNavigation]);

  const onPressScheduleCreate = useCallback(() => {
    rootNavigation.navigate('ScheduleCreate', {
      petId: activePetId ?? undefined,
    });
  }, [activePetId, rootNavigation]);

  const onPressPetProfileEdit = useCallback(() => {
    if (!activePetId) return;
    rootNavigation.navigate('PetProfileEdit', { petId: activePetId });
  }, [activePetId, rootNavigation]);

  const onPressWeatherInsight = useCallback(() => {
    rootNavigation.navigate('WeatherInsight', {
      district: weatherGuide.district,
    });
  }, [rootNavigation, weatherGuide.district]);

  const onPressTimelineCategory = useCallback(
    (
      mainCategory: Exclude<TimelineMainCategory, undefined>,
      otherSubCategory?: Exclude<TimelineOtherSubCategory, undefined>,
    ) => {
      navigation.navigate('TimelineTab', {
        screen: 'TimelineMain',
        params: {
          petId: activePetId ?? undefined,
          mainCategory,
          otherSubCategory,
        },
      });
    },
    [navigation, activePetId],
  );

  const onPressRecord = useCallback(() => {
    navigation.navigate('RecordCreateTab', { petId: activePetId ?? undefined });
  }, [navigation, activePetId]);

  const onPressRecordItem = useCallback(
    (memoryId: string) => {
      if (!activePetId) return;
      navigation.navigate('TimelineTab', {
        screen: 'RecordDetail',
        params: {
          petId: activePetId,
          memoryId,
        },
      });
    },
    [navigation, activePetId],
  );

  const onPressPetChip = useCallback(
    (petId: string) => {
      if (switching) return;
      if (petId === activePetId) return;

      setSwitching(true);

      svOpacity.value = withTiming(OUT_OPACITY, {
        duration: 140,
        easing: Easing.out(Easing.cubic),
      });

      svTranslateY.value = withTiming(
        OUT_LIFT_PX,
        { duration: 140, easing: Easing.out(Easing.cubic) },
        finished => {
          if (!finished) {
            runOnJS(setSwitching)(false);
            return;
          }

          runOnJS(selectPet)(petId);

          svOpacity.value = withTiming(1, {
            duration: 180,
            easing: Easing.out(Easing.cubic),
          });
          svTranslateY.value = withTiming(
            0,
            { duration: 180, easing: Easing.out(Easing.cubic) },
            () => runOnJS(setSwitching)(false),
          );
        },
      );
    },
    [
      switching,
      activePetId,
      selectPet,
      svOpacity,
      svTranslateY,
      OUT_OPACITY,
      OUT_LIFT_PX,
    ],
  );

  const quickActionCards = HOME_SHORTCUTS;

  const tipsSectionTitle = useMemo(() => {
    return `${plainPetName}${pickObjectParticle(plainPetName)} 위한 추천 팁`;
  }, [plainPetName]);

  const recommendationTips = useMemo(() => {
    return TIP_TEMPLATES.map(item => ({
      ...item,
      title:
        item.key === 'meal'
          ? `${plainPetName}에게 꼭 필요한 영양 루틴`
          : item.title,
    }));
  }, [plainPetName]);

  const recentActivities = useMemo(
    () => safeRecordsState.items.slice(0, 7),
    [safeRecordsState.items],
  );

  const currentMonthDiaryEntries = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    return safeRecordsState.items
      .filter(item => {
        if (normalizeCategoryKey(readRecordCategoryRaw(item)) !== 'diary') {
          return false;
        }

        const date = toRecordDate(item);
        if (!date) return false;

        return date.getFullYear() === year && date.getMonth() === month;
      })
      .slice(0, 7);
  }, [safeRecordsState.items]);

  const weekScheduleItems = useMemo<WeeklyScheduleItem[]>(() => {
    return safeSchedulesState.items.slice(0, 7).map(buildScheduleCard);
  }, [safeSchedulesState.items]);
  const weeklySummary = useMemo(
    () => buildWeeklySummary(safeRecordsState.items, safeSchedulesState.items),
    [safeRecordsState.items, safeSchedulesState.items],
  );

  // ---------------------------------------------------------
  // 8) Accordion state (pet 변경 시 초기화)
  // ---------------------------------------------------------
  const [acc, setAcc] = useState<
    Record<'hobby' | 'like' | 'dislike' | 'tag', boolean>
  >({
    hobby: false,
    like: false,
    dislike: false,
    tag: false,
  });

  useEffect(() => {
    setAcc({ hobby: false, like: false, dislike: false, tag: false });
  }, [activePetId]);

  const allExpanded = useMemo(
    () => acc.hobby && acc.like && acc.dislike && acc.tag,
    [acc.hobby, acc.like, acc.dislike, acc.tag],
  );

  const onToggleAll = useCallback(() => {
    setAcc(prev => {
      const next = !(prev.hobby && prev.like && prev.dislike && prev.tag);
      return { hobby: next, like: next, dislike: next, tag: next };
    });
  }, []);

  const onToggleOne = useCallback(
    (key: 'hobby' | 'like' | 'dislike' | 'tag') => {
      setAcc(prev => ({ ...prev, [key]: !prev[key] }));
    },
    [],
  );

  // ---------------------------------------------------------
  // 9) slider render
  // ---------------------------------------------------------
  const renderTodayRecord = useCallback<ListRenderItem<MemoryRecord>>(
    ({ item, index }) => {
      if (index === undefined) return null;
      return (
        <TodayRecordCard
          item={item}
          index={index}
          cardW={CARD_W}
          snap={SNAP}
          scrollX={scrollX}
          onPress={onPressRecordItem}
        />
      );
    },
    [CARD_W, SNAP, scrollX, onPressRecordItem],
  );

  const keyExtractor = useCallback((it: MemoryRecord) => it.id, []);
  const renderTodayRecordSeparator = useCallback(
    () => <View style={{ width: SLIDE_GAP }} />,
    [SLIDE_GAP],
  );

  // ---------------------------------------------------------
  // 10) render
  // ---------------------------------------------------------
  return (
    <Screen style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTextArea}>
              <Text style={[styles.title, { color: petTheme.primary }]}>
                {greetingTitle}
              </Text>
              <Text style={styles.subTitle}>{greetingSubTitle}</Text>
            </View>

            <View style={styles.headerIcons}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.headerIconBtn}
                onPress={() => {}}
              >
                <Feather name="search" size={18} color="rgba(11,18,32,0.75)" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.headerIconBtn}
                onPress={() => {}}
              >
                <Feather name="bell" size={18} color="rgba(11,18,32,0.75)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Pet switcher */}
          <View style={styles.petSwitcherRow}>
            {pets.slice(0, 4).map(p => {
              const isActive = p.id === activePetId;
              const uri = p.avatarUrl ?? null;

              return (
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.85}
                  style={[
                    styles.petChip,
                    isActive
                      ? [
                          styles.petChipActive,
                          {
                            borderColor: petTheme.primary,
                            shadowColor: petTheme.primary,
                          },
                        ]
                      : null,
                  ]}
                  onPress={() => onPressPetChip(p.id)}
                >
                  {uri ? (
                    <Image source={{ uri }} style={styles.petChipImage} />
                  ) : (
                    <View style={styles.petChipPlaceholder} />
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.petAddChip}
              onPress={onPressAddPet}
            >
              <Feather name="plus" size={20} color={petTheme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Fade container */}
        <Animated.View style={animatedContentStyle}>
          <View style={styles.weatherGuideWrap}>
            <WeatherGuideHomeCard
              weather={weatherGuide}
              onPress={onPressWeatherInsight}
            />
          </View>

          {/* HERO */}
          <View style={styles.heroCard}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.heroGearBtn}
              onPress={onPressPetProfileEdit}
            >
              <MaterialCommunityIcons
                name="cog-outline"
                size={22}
                color={petTheme.deep}
              />
            </TouchableOpacity>

            <View style={styles.heroCenter}>
              <View style={styles.heroAvatarOuter}>
                <View
                  style={[
                    styles.heroAvatarGlow,
                    {
                      backgroundColor: petTheme.glow,
                      shadowColor: petTheme.primary,
                    },
                  ]}
                />
                <LinearGradient
                  colors={petTheme.ringGradient}
                  locations={[0, 0.55, 1]}
                  start={{ x: 0.18, y: 0.12 }}
                  end={{ x: 0.82, y: 0.9 }}
                  style={[
                    styles.heroAvatarRing,
                    { shadowColor: petTheme.primary },
                  ]}
                >
                  <View style={styles.heroAvatarRingInner}>
                    <View style={styles.heroAvatarWrap}>
                      {selectedAvatarUri ? (
                        <Image
                          source={{ uri: selectedAvatarUri }}
                          style={styles.heroAvatarImg}
                        />
                      ) : (
                        <View style={styles.heroAvatarPlaceholder} />
                      )}
                    </View>
                  </View>
                </LinearGradient>
              </View>

              <Text
                style={[styles.heroName, { color: petTheme.deep }]}
                numberOfLines={1}
              >
                {profilePetName}
              </Text>

              {topMetaLine ? (
                <Text style={styles.heroMetaLine} numberOfLines={1}>
                  {isMemorialPet(selectedPet?.deathDate ?? null)
                    ? `${topMetaLine}`
                    : topMetaLine}
                </Text>
              ) : (
                <Text style={styles.heroMetaMuted} numberOfLines={1}>
                  아이 정보를 채우면 더 예쁘게 보여요
                </Text>
              )}

              {birthText ? (
                <Text style={styles.heroBirthText} numberOfLines={1}>
                  생년월일 {birthText}
                </Text>
              ) : null}

              {togetherDays !== null ? (
                <View
                  style={[
                    styles.heroTogetherPill,
                    { backgroundColor: petTheme.deep },
                  ]}
                >
                  <View style={styles.heroTogetherRow}>
                    <Text
                      style={styles.heroTogetherHeart}
                    >
                      {petTheme.heartEmoji}
                    </Text>
                    <Text
                      style={[
                        styles.heroTogetherText,
                        { color: petTheme.onDeep },
                      ]}
                    >
                      함께한 시간{' '}
                      <Text
                        style={[
                          styles.heroTogetherStrong,
                          { color: petTheme.onDeep },
                        ]}
                      >
                        {togetherDays}
                      </Text>{' '}
                      일
                    </Text>
                    <Text
                      style={styles.heroTogetherHeart}
                    >
                      {petTheme.heartEmoji}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.accordionWrap}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.accordionAllRow}
                onPress={onToggleAll}
              >
                <Text
                  style={[
                    styles.accordionAllLabel,
                    { color: petTheme.primary },
                  ]}
                >
                  모두펼치기
                </Text>
                <Feather
                  name={allExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={petTheme.primary}
                />
              </TouchableOpacity>

              <View style={styles.accordionItem}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.accordionHeaderRow}
                  onPress={() => onToggleOne('hobby')}
                >
                  <View style={styles.accordionLeft}>
                    <View
                      style={[
                        styles.accordionIconCircle,
                        styles.iconCircleBlue,
                      ]}
                    >
                      <Text style={styles.accordionIconText}>🐾</Text>
                    </View>
                    <Text style={[styles.accordionTitle, styles.accTitleBlue]}>
                      취미
                    </Text>
                  </View>
                  <Feather
                    name={acc.hobby ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={petTheme.primary}
                  />
                </TouchableOpacity>

                {acc.hobby ? (
                  <View style={styles.accordionBody}>
                    {hobbies.length > 0 ? (
                      hobbies.map(v => (
                        <Text key={v} style={styles.accordionBullet}>
                          • {v}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.accordionEmpty}>• 아직 없어요</Text>
                    )}
                  </View>
                ) : null}
              </View>

              <View style={styles.accordionItem}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.accordionHeaderRow}
                  onPress={() => onToggleOne('like')}
                >
                  <View style={styles.accordionLeft}>
                    <View
                      style={[
                        styles.accordionIconCircle,
                        styles.iconCircleOrange,
                      ]}
                    >
                      <Text style={styles.accordionIconText}>💛</Text>
                    </View>
                    <Text
                      style={[styles.accordionTitle, styles.accTitleOrange]}
                    >
                      좋아하는 것
                    </Text>
                  </View>
                  <Feather
                    name={acc.like ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={petTheme.primary}
                  />
                </TouchableOpacity>

                {acc.like ? (
                  <View style={styles.accordionBody}>
                    {likes.length > 0 ? (
                      likes.map(v => (
                        <Text key={v} style={styles.accordionBullet}>
                          • {v}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.accordionEmpty}>• 아직 없어요</Text>
                    )}
                  </View>
                ) : null}
              </View>

              <View style={styles.accordionItem}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.accordionHeaderRow}
                  onPress={() => onToggleOne('dislike')}
                >
                  <View style={styles.accordionLeft}>
                    <View
                      style={[
                        styles.accordionIconCircle,
                        styles.iconCirclePink,
                      ]}
                    >
                      <Text style={styles.accordionIconText}>💔</Text>
                    </View>
                    <Text style={[styles.accordionTitle, styles.accTitlePink]}>
                      싫어하는 것
                    </Text>
                  </View>
                  <Feather
                    name={acc.dislike ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={petTheme.primary}
                  />
                </TouchableOpacity>

                {acc.dislike ? (
                  <View style={styles.accordionBody}>
                    {dislikes.length > 0 ? (
                      dislikes.map(v => (
                        <Text key={v} style={styles.accordionBullet}>
                          • {v}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.accordionEmpty}>• 아직 없어요</Text>
                    )}
                  </View>
                ) : null}
              </View>

              <View style={[styles.accordionItem, { borderBottomWidth: 0 }]}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.accordionHeaderRow}
                  onPress={() => onToggleOne('tag')}
                >
                  <View style={styles.accordionLeft}>
                    <View
                      style={[
                        styles.accordionIconCircle,
                        styles.iconCirclePurple,
                      ]}
                    >
                      <Feather name="hash" size={16} color={petTheme.primary} />
                    </View>
                    <Text
                      style={[styles.accordionTitle, styles.accTitlePurple]}
                    >
                      #태그
                    </Text>
                  </View>
                  <Feather
                    name={acc.tag ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={petTheme.primary}
                  />
                </TouchableOpacity>

                {acc.tag ? (
                  <View style={styles.accordionBody}>
                    <View style={styles.tagsRow}>
                      {tags.map(t => (
                        <View
                          key={t}
                          style={[
                            styles.tagChip,
                            {
                              borderColor: petTheme.border,
                              backgroundColor: petTheme.tint,
                            },
                          ]}
                        >
                          <Text
                            style={[styles.tagText, { color: petTheme.deep }]}
                          >
                            {t}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.heroMessageBox}>
              <View style={styles.heroMessageIcon}>
                <Text style={styles.heroMessageIconText}>
                  {todayMessageEmoji}
                </Text>
              </View>
              <Text style={styles.heroMessageText}>{todayMessage}</Text>
              <View style={styles.heroMessageBottomShadow} />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderCol}>
              <Text style={[styles.sectionTitle, { color: petTheme.deep }]}>
                자주 쓰는 기록
              </Text>
              <Text style={styles.sectionSubText}>
                산책 · 식사 · 건강 · 미용 기록을 바로 열어보세요
              </Text>
            </View>

            <View style={styles.quickGridFrame}>
              <View style={styles.quickGrid}>
                {quickActionCards.map(item => (
                  <TouchableOpacity
                    key={item.key}
                    activeOpacity={0.92}
                    style={styles.quickCard}
                    onPress={() =>
                      onPressTimelineCategory(
                        item.mainCategory,
                        item.otherSubCategory,
                      )
                    }
                  >
                    <View
                      style={[
                        styles.quickIconWrap,
                        { backgroundColor: petTheme.tint },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={24}
                        color={petTheme.primary}
                        style={styles.quickIcon}
                      />
                    </View>
                    <Text style={styles.quickCardTitle}>{item.label}</Text>
                    <Text
                      style={[
                        styles.quickCardNote,
                        { color: petTheme.primary },
                      ]}
                    >
                      {item.note}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Section lead */}
          <View style={styles.sectionLead}>
            <Text style={[styles.sectionLeadTitle, { color: petTheme.deep }]}>
              오늘의 추억 둘러보기
            </Text>
            <Text style={styles.sectionLeadSub}>
              사진과 기록을 천천히 살펴보세요
            </Text>
          </View>

          <TodayPhotoSection
            todayPhoto={todayPhoto}
            todayPhotoUrl={todayPhotoUrl}
            isTodayPhotoLoading={isTodayPhotoLoading}
            todayPhotoOverlayTitle={todayPhotoOverlayTitle}
            onPressRecordItem={onPressRecordItem}
            onPressRecord={onPressRecord}
            accentColor={petTheme.deep}
          />

          <TodayRecordsSection
            todayRecords={todayRecords}
            onPressTimeline={onPressTimeline}
            onPressRecord={onPressRecord}
            keyExtractor={keyExtractor}
            renderTodayRecord={renderTodayRecord}
            SNAP={SNAP}
            slideScrollHandler={slideScrollHandler}
            renderTodayRecordSeparator={renderTodayRecordSeparator}
            progress={progress}
            activeSlideIndex={activeSlideIndex}
            hasMoreThanSlider={hasMoreThanSlider}
            accentColor={petTheme.primary}
            accentDeepColor={petTheme.deep}
          />

          <WeeklySummarySection
            petName={plainPetName}
            walkCount={weeklySummary.walkCount}
            mealCount={weeklySummary.mealCount}
            healthCount={weeklySummary.healthCount}
            recordDays={weeklySummary.recordDays}
            totalRecords={weeklySummary.totalRecords}
            upcomingSchedules={weeklySummary.upcomingSchedules}
            accentDeepColor={petTheme.deep}
            accentSoftColor={petTheme.soft}
            accentBorderColor={petTheme.border}
          />

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.tipSectionTitle, { color: petTheme.deep }]}>
                {tipsSectionTitle}
              </Text>
            </View>

            <View style={styles.tipList}>
              {recommendationTips.map(item => (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.92}
                  style={styles.tipCard}
                >
                  <View
                    style={[
                      styles.tipThumb,
                      { backgroundColor: petTheme.tint },
                    ]}
                  >
                    <View style={styles.tipThumbInner}>
                      <Feather
                        name={item.icon}
                        size={20}
                        color={petTheme.primary}
                      />
                    </View>
                  </View>

                  <View style={styles.tipContent}>
                    <Text
                      style={[styles.tipEyebrow, { color: petTheme.primary }]}
                    >
                      {item.eyebrow}
                    </Text>
                    <Text style={styles.tipTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.tipDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <ScheduleSection
            weekScheduleItems={weekScheduleItems}
            onPressScheduleList={onPressScheduleList}
            onPressScheduleCreate={onPressScheduleCreate}
            accentColor={petTheme.primary}
            accentDeepColor={petTheme.deep}
            accentTint={petTheme.tint}
          />

          <RecentActivitiesSection
            recentActivities={recentActivities}
            onPressTimeline={onPressTimeline}
            onPressRecordItem={onPressRecordItem}
            accentColor={petTheme.primary}
            accentDeepColor={petTheme.deep}
          />

          <View style={styles.section}>
            <View
              style={[styles.todayTipCard, { backgroundColor: petTheme.tint }]}
            >
              <View style={styles.todayTipBadge}>
                <Feather name="map-pin" size={12} color={petTheme.primary} />
                <Text
                  style={[
                    styles.todayTipBadgeText,
                    { color: petTheme.primary },
                  ]}
                >
                  {TODAY_HOME_TIP.badge}
                </Text>
              </View>
              <Text style={styles.todayTipTitle}>{TODAY_HOME_TIP.title}</Text>
              <Text style={styles.todayTipDesc}>
                {TODAY_HOME_TIP.description}
              </Text>
            </View>
          </View>

          <MonthlyDiarySection
            petName={plainPetName}
            currentMonthDiaryEntries={currentMonthDiaryEntries}
            onPressTimelineCategory={onPressTimelineCategory}
            onPressRecord={onPressRecord}
            onPressRecordItem={onPressRecordItem}
            accentColor={petTheme.primary}
            accentDeepColor={petTheme.deep}
          />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
