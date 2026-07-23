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
  formatRecordCreatedTime,
  formatRecordMonthDay,
  getRecordSortTimestamp,
} from '../records/date';
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

function formatAmount(value: string, unit: string): string {
  return `${value}${unit.toLocaleLowerCase()}`;
}

function buildWalkSummary(record: MemoryRecord, source: string): string {
  const searchText = getSummarySearchText(record);
  const distanceMatch = searchText.match(/(\d+(?:\.\d+)?)\s*(km|킬로미터)/i);
  const durationMatch = searchText.match(/(\d+)\s*(분|min(?:ute)?s?)/i);
  const distance = distanceMatch?.[1] ?? null;
  const duration = durationMatch?.[1] ?? null;

  if (distance && duration) return `${distance}km · ${duration}분`;
  if (duration) return `${duration}분 산책 완료`;

  const period = formatRecordCreatedTime(record).split(' ')[0];
  if (period === '오전' || period === '오후') return `${period} 산책 완료`;
  if (source.includes('산책')) return '산책 기록 완료';
  return CATEGORY_COMPLETE_LABEL.walk;
}

function buildMealSummary(record: MemoryRecord): string {
  const searchText = getSummarySearchText(record);
  const amountMatch = searchText.match(
    /(\d+(?:\.\d+)?)\s*(g|kg|ml|개|캔|팩)/i,
  );
  if (!amountMatch) return CATEGORY_COMPLETE_LABEL.meal;

  const foodLabel =
    /간식|snack|treat/.test(searchText)
      ? '간식'
      : /물|water/.test(searchText)
        ? '물'
        : '사료';
  return `${foodLabel} ${formatAmount(amountMatch[1], amountMatch[2])}`;
}

function buildHealthSummary(record: MemoryRecord, source: string): string {
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
      return compactSummary(buildWalkSummary(record, source));
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
