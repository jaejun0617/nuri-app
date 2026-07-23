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
import { formatRecordMonthDay, getRecordSortTimestamp } from '../records/date';
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

export function buildFrequentRecordSummary(
  category: FrequentRecordCategory,
  record: MemoryRecord | null,
): string {
  if (!record) return CATEGORY_FALLBACK_LABEL[category];

  const source = getSummarySource(record);
  if (source) return compactSummary(source);
  return CATEGORY_COMPLETE_LABEL[category];
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

