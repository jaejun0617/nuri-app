// 파일: src/services/home/frequentRecords.ts
// 목적:
// - 홈의 `자주 쓰는 기록` 섹션이 선택된 반려동물의 최신 기록만 소비하도록 한다.
// - 카테고리 판별, 최신 기록 선택, 상대시간, 요약 문구를 순수 함수로 분리한다.
// - 저장되지 않은 예시 데이터나 카테고리 간 기록 혼합을 방지한다.

import {
  normalizeCategoryKey,
  normalizeOtherSubKey,
  readOtherSubCategoryRaw,
  readRecordCategoryRaw,
} from '../memories/categoryMeta';
import {
  formatRecordMonthDay,
  getRecordSortTimestamp,
} from '../records/date';
import {
  GROOMING_CARE_OPTIONS,
  HEALTH_CONDITION_OPTIONS,
  type HealthCondition,
} from '../records/metadata';
import type { MemoryRecord } from '../supabase/memories';

export type FrequentRecordCategory = 'walk' | 'meal' | 'health' | 'grooming';

export type FrequentRecordSummary = {
  category: FrequentRecordCategory;
  record: MemoryRecord | null;
  hasRecentRecord: boolean;
  relativeTimeLabel: string | null;
  summaryLabel: string;
};

const CATEGORY_FALLBACK_LABEL: Record<FrequentRecordCategory, string> = {
  walk: '첫 산책 기록을 남겨보세요',
  meal: '첫 식사 기록을 남겨보세요',
  health: '첫 건강 기록을 남겨보세요',
  grooming: '첫 미용 기록을 남겨보세요',
};

const CATEGORY_COMPLETE_LABEL: Record<FrequentRecordCategory, string> = {
  walk: '산책 기록 완료',
  meal: '식사 기록 완료',
  health: '건강 기록 완료',
  grooming: '미용 기록 완료',
};

function normalizeSummaryText(value: string | null | undefined): string {
  return `${value ?? ''}`.replace(/\s+/g, ' ').trim();
}

function compactSummary(value: string): string {
  const normalized = normalizeSummaryText(value);
  if (normalized.length <= 24) return normalized;
  return `${normalized.slice(0, 23).trimEnd()}…`;
}

function matchesCategory(
  record: MemoryRecord,
  category: FrequentRecordCategory,
): boolean {
  const mainCategory = normalizeCategoryKey(readRecordCategoryRaw(record));
  const otherSubCategory = normalizeOtherSubKey(
    readOtherSubCategoryRaw(record),
  );

  if (category === 'grooming') {
    return mainCategory === 'other' && otherSubCategory === 'grooming';
  }

  return mainCategory === category;
}

function getLatestRecord(
  records: ReadonlyArray<MemoryRecord>,
  category: FrequentRecordCategory,
): MemoryRecord | null {
  return records
    .filter(record => matchesCategory(record, category))
    .reduce<MemoryRecord | null>((latest, record) => {
      if (!latest) return record;

      const currentTimestamp = getRecordSortTimestamp(record);
      const latestTimestamp = getRecordSortTimestamp(latest);
      if (currentTimestamp !== latestTimestamp) {
        return currentTimestamp > latestTimestamp ? record : latest;
      }

      return record.createdAt > latest.createdAt ? record : latest;
    }, null);
}

function getSummarySource(record: MemoryRecord): string {
  return normalizeSummaryText(record.title) || normalizeSummaryText(record.content);
}

function getSummarySearchText(record: MemoryRecord): string {
  return normalizeSummaryText(
    [record.title, record.content, ...record.tags].filter(Boolean).join(' '),
  ).toLocaleLowerCase();
}

export function getWalkDayPeriod(recordedAt: string | null | undefined): string | null {
  const timestamp = Date.parse(`${recordedAt ?? ''}`);
  if (!Number.isFinite(timestamp)) return null;

  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 11) return '오전';
  if (hour >= 11 && hour < 14) return '점심';
  if (hour >= 14 && hour < 18) return '오후';
  if (hour >= 18 && hour < 22) return '저녁';
  return '밤';
}

export function buildWalkSummaryFromRecordedAt(
  recordedAt: string | null | undefined,
): string {
  const period = getWalkDayPeriod(recordedAt);
  return period ? `${period} 산책 완료` : CATEGORY_COMPLETE_LABEL.walk;
}

function buildWalkSummary(record: MemoryRecord): string {
  return buildWalkSummaryFromRecordedAt(record.createdAt);
}

function getMealLabel(foodType: string): string {
  switch (foodType) {
    case 'wet_food':
      return '습식 사료';
    case 'treat':
      return '간식';
    case 'water':
      return '물';
    case 'other':
      return '식사';
    default:
      return '사료';
  }
}

function buildMealSummary(record: MemoryRecord): string {
  const meal = record.metadata?.meal;
  if (meal) {
    const foodLabel = getMealLabel(meal.foodType);
    if (typeof meal.amountGrams === 'number' && meal.amountGrams > 0) {
      return `${foodLabel} ${meal.amountGrams}g`;
    }
    return foodLabel;
  }

  const searchText = getSummarySearchText(record);
  const amountMatch = searchText.match(/(\d+(?:\.\d+)?)\s*(g|kg|ml|개|캔|팩)/i);
  if (!amountMatch) return CATEGORY_COMPLETE_LABEL.meal;

  const foodLabel = /간식|snack|treat/.test(searchText)
    ? '간식'
    : /물|water/.test(searchText)
      ? '물'
      : '사료';
  return `${foodLabel} ${amountMatch[1]}${amountMatch[2].toLocaleLowerCase()}`;
}

function getHealthConditionLabel(condition: HealthCondition): string {
  return HEALTH_CONDITION_OPTIONS.find(option => option.value === condition)
    ?.label ?? '기록 완료';
}

function buildHealthSummary(record: MemoryRecord, source: string): string {
  const health = record.metadata?.health;
  if (health) {
    const condition = health.condition
      ? getHealthConditionLabel(health.condition)
      : null;
    const weight =
      typeof health.weightKg === 'number' && health.weightKg > 0
        ? `${health.weightKg}kg`
        : null;
    if (condition && weight) return `${condition} · ${weight}`;
    if (condition) return `컨디션 ${condition}`;
    if (weight) return `체중 ${weight}`;
  }

  if (
    record.emotion === 'sad' ||
    record.emotion === 'anxious' ||
    record.emotion === 'angry' ||
    record.emotion === 'tired'
  ) {
    return '컨디션 나빠요';
  }
  if (
    record.emotion === 'happy' ||
    record.emotion === 'calm' ||
    record.emotion === 'excited'
  ) {
    return '컨디션 좋아요';
  }
  if (record.emotion === 'neutral') return '컨디션 무난해요';

  const weightMatch = getSummarySearchText(record).match(
    /(\d+(?:\.\d+)?)\s*kg/i,
  );
  if (weightMatch || /체중|weight/i.test(source)) {
    return weightMatch ? `체중 ${weightMatch[1]}kg` : '체중 기록 완료';
  }
  if (/약|medication|medicine/i.test(source)) return '약 복용 완료';
  return CATEGORY_COMPLETE_LABEL.health;
}

function buildGroomingSummary(record: MemoryRecord): string {
  const careTypes = record.metadata?.grooming?.careTypes;
  if (careTypes?.length) {
    const labels = careTypes
      .map(type => GROOMING_CARE_OPTIONS.find(option => option.value === type)?.label)
      .filter((label): label is string => Boolean(label));
    if (careTypes.includes('full_grooming')) return '전체 미용';
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return `${labels[0]} & ${labels[1]}`;
    if (labels.length > 2) return `${labels[0]} 외 ${labels.length - 1}개`;
  }

  const searchText = getSummarySearchText(record);
  const hasBath = /목욕|bath|샤워|shower/.test(searchText);
  const hasFur = /털|fur|groom|미용/.test(searchText);

  if (hasBath && hasFur) return '목욕 & 털 정리';
  if (hasBath) return '목욕 완료';
  if (hasFur) return '털 정리 완료';
  if (/발톱|nail/.test(searchText)) return '발톱 정리 완료';
  return CATEGORY_COMPLETE_LABEL.grooming;
}

export function buildFrequentRecordSummary(
  category: FrequentRecordCategory,
  record: MemoryRecord | null,
): string {
  if (!record) return CATEGORY_FALLBACK_LABEL[category];

  const source = getSummarySource(record);
  switch (category) {
    case 'walk':
      return compactSummary(buildWalkSummary(record));
    case 'meal':
      return compactSummary(buildMealSummary(record));
    case 'health':
      return compactSummary(buildHealthSummary(record, source));
    case 'grooming':
      return compactSummary(buildGroomingSummary(record));
  }
}

export function formatFrequentRecordRelativeTime(
  record: MemoryRecord | null,
  now = new Date(),
): string | null {
  if (!record) return null;

  const createdAt = new Date(record.createdAt).getTime();
  if (!Number.isFinite(createdAt)) return null;

  const diffMs = now.getTime() - createdAt;
  if (!Number.isFinite(diffMs) || diffMs < 60 * 1000) return '방금 전';

  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const diffMinutes = Math.floor(diffMs / minuteMs);
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMs / hourMs);
  if (diffHours < 24) return `${diffHours}시간 전`;

  const diffDays = Math.floor(diffMs / dayMs);
  if (diffDays < 7) return `${diffDays}일 전`;

  return formatRecordMonthDay(record) || null;
}

export function buildFrequentRecordSummaries(
  records: ReadonlyArray<MemoryRecord>,
  now = new Date(),
): FrequentRecordSummary[] {
  const categories: FrequentRecordCategory[] = [
    'walk',
    'meal',
    'health',
    'grooming',
  ];

  return categories.map(category => {
    const record = getLatestRecord(records, category);
    return {
      category,
      record,
      hasRecentRecord: record !== null,
      relativeTimeLabel: formatFrequentRecordRelativeTime(record, now),
      summaryLabel: buildFrequentRecordSummary(category, record),
    };
  });
}
