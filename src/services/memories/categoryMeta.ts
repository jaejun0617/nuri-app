// 파일: src/services/memories/categoryMeta.ts
// 역할:
// - memory category/subcategory를 화면 공통 기준으로 정규화
// - 타임라인 필터와 홈 카드가 같은 카테고리 해석 규칙을 공유하도록 보장
// - 레이블/아이콘/색상 메타를 한 곳에서 관리해 화면별 분기 중복을 줄임

import type { MemoryRecord } from '../supabase/memories';

export type MemoryMainCategory =
  | 'all'
  | 'walk'
  | 'meal'
  | 'health'
  | 'diary'
  | 'other';

export type MemoryOtherSubCategory =
  | 'grooming'
  | 'hospital'
  | 'indoor'
  | 'training'
  | 'outing'
  | 'shopping'
  | 'bathing'
  | 'etc';

export type MemoryCategoryMeta = {
  label: string;
  icon: string;
  tint: string;
  mainCategory: Exclude<MemoryMainCategory, 'all'>;
  otherSubCategory?: MemoryOtherSubCategory;
};

export const MAIN_CATEGORY_OPTIONS: Array<{
  key: MemoryMainCategory;
  label: string;
}> = [
  { key: 'all', label: '전체' },
  { key: 'walk', label: '산책' },
  { key: 'meal', label: '식사' },
  { key: 'health', label: '건강' },
  { key: 'diary', label: '일기장' },
  { key: 'other', label: '생활' },
];

export const OTHER_SUBCATEGORY_OPTIONS: Array<{
  key: MemoryOtherSubCategory;
  label: string;
}> = [
  { key: 'grooming', label: '미용' },
  { key: 'hospital', label: '병원/약' },
  { key: 'indoor', label: '실내 놀이' },
  { key: 'training', label: '교육/훈련' },
  { key: 'outing', label: '외출/여행' },
  { key: 'shopping', label: '용품/쇼핑' },
  { key: 'bathing', label: '목욕/위생' },
  { key: 'etc', label: '기타' },
];

function readRecordTagsRaw(record: MemoryRecord): string {
  if (!Array.isArray(record.tags) || record.tags.length === 0) return '';
  return record.tags.join(' ').trim();
}

function readLegacyStringField(
  record: MemoryRecord,
  keys: readonly string[],
): string {
  const source = record as Record<string, unknown>;

  for (const key of keys) {
    const value = source[key];
    if (typeof value !== 'string') continue;
    const normalized = value.trim();
    if (normalized) return normalized;
  }

  return '';
}

export function readRecordCategoryRaw(record: MemoryRecord): string {
  const normalized = readLegacyStringField(record, [
    'category',
    'type',
    'kind',
    'recordType',
    'mainCategory',
    'categoryKey',
  ]);
  if (normalized) return normalized;
  return readRecordTagsRaw(record);
}

export function normalizeCategoryKey(raw: string): MemoryMainCategory {
  const value = raw.trim().toLowerCase();
  if (!value) return 'all';

  if (value === 'walk' || value === 'stroll') return 'walk';
  if (value === 'meal' || value === 'food' || value === 'feed') return 'meal';
  if (value === 'health' || value === 'medical') return 'health';
  if (value === 'diary' || value === 'journal') return 'diary';
  if (value === 'other' || value === 'etc') return 'other';

  if (value.includes('산책')) return 'walk';
  if (value.includes('식사') || value.includes('간식')) return 'meal';
  if (value.includes('일기')) return 'diary';
  if (value.includes('기타') || value.includes('미용')) return 'other';
  if (value.includes('건강')) return 'health';
  if (value.includes('병원') || value.includes('약')) {
    return value.includes('기타') ? 'other' : 'health';
  }

  return 'other';
}

export function readOtherSubCategoryRaw(record: MemoryRecord): string {
  const normalized = readLegacyStringField(record, [
    'subCategory',
    'subcategory',
    'sub_type',
    'detailCategory',
    'otherSubCategory',
  ]);
  if (normalized) return normalized;
  return readRecordTagsRaw(record);
}

export function normalizeOtherSubKey(raw: string): MemoryOtherSubCategory {
  const value = raw.trim().toLowerCase();
  if (!value) return 'etc';

  if (value === 'grooming') return 'grooming';
  if (value === 'hospital' || value === 'medicine' || value === 'clinic') {
    return 'hospital';
  }
  if (value === 'indoor' || value === 'indoorplay') return 'indoor';
  if (value === 'training' || value === 'lesson') return 'training';
  if (value === 'outing' || value === 'travel') return 'outing';
  if (value === 'shopping' || value === 'goods') return 'shopping';
  if (value === 'bathing' || value === 'bath' || value === 'hygiene') {
    return 'bathing';
  }
  if (value.includes('미용')) return 'grooming';
  if (value.includes('병원') || value.includes('약')) return 'hospital';
  if (value.includes('실내') || value.includes('놀이')) return 'indoor';
  if (value.includes('훈련') || value.includes('교육')) return 'training';
  if (value.includes('외출') || value.includes('여행')) return 'outing';
  if (value.includes('쇼핑') || value.includes('용품')) return 'shopping';
  if (value.includes('목욕') || value.includes('위생')) return 'bathing';

  return 'etc';
}

export function getRecordCategoryMeta(
  record: MemoryRecord,
): MemoryCategoryMeta {
  const mainCategory = normalizeCategoryKey(readRecordCategoryRaw(record));

  if (mainCategory === 'walk') {
    return {
      label: '산책 기록',
      icon: 'walk',
      tint: 'rgba(109,106,248,0.10)',
      mainCategory: 'walk',
    };
  }

  if (mainCategory === 'meal') {
    return {
      label: '식사 기록',
      icon: 'silverware-fork-knife',
      tint: 'rgba(249,115,22,0.10)',
      mainCategory: 'meal',
    };
  }

  if (mainCategory === 'health') {
    return {
      label: '건강 기록',
      icon: 'medical-bag',
      tint: 'rgba(34,197,94,0.10)',
      mainCategory: 'health',
    };
  }

  if (mainCategory === 'diary') {
    return {
      label: '일기장',
      icon: 'notebook-outline',
      tint: 'rgba(59,130,246,0.10)',
      mainCategory: 'diary',
    };
  }

  const otherSubCategory = normalizeOtherSubKey(
    readOtherSubCategoryRaw(record),
  );

  if (otherSubCategory === 'grooming') {
    return {
      label: '기타 · 미용',
      icon: 'content-cut',
      tint: 'rgba(236,72,153,0.10)',
      mainCategory: 'other',
      otherSubCategory,
    };
  }

  if (otherSubCategory === 'hospital') {
    return {
      label: '기타 · 병원/약',
      icon: 'medical-bag',
      tint: 'rgba(34,197,94,0.10)',
      mainCategory: 'other',
      otherSubCategory,
    };
  }

  if (otherSubCategory === 'indoor') {
    return {
      label: '기타 · 실내 놀이',
      icon: 'home-heart',
      tint: 'rgba(109,106,248,0.10)',
      mainCategory: 'other',
      otherSubCategory,
    };
  }

  if (otherSubCategory === 'training') {
    return {
      label: '기타 · 교육/훈련',
      icon: 'school-outline',
      tint: 'rgba(59,130,246,0.10)',
      mainCategory: 'other',
      otherSubCategory,
    };
  }

  if (otherSubCategory === 'outing') {
    return {
      label: '기타 · 외출/여행',
      icon: 'map-marker-path',
      tint: 'rgba(249,115,22,0.10)',
      mainCategory: 'other',
      otherSubCategory,
    };
  }

  if (otherSubCategory === 'shopping') {
    return {
      label: '기타 · 용품/쇼핑',
      icon: 'shopping-outline',
      tint: 'rgba(168,85,247,0.10)',
      mainCategory: 'other',
      otherSubCategory,
    };
  }

  if (otherSubCategory === 'bathing') {
    return {
      label: '기타 · 목욕/위생',
      icon: 'shower',
      tint: 'rgba(14,165,233,0.10)',
      mainCategory: 'other',
      otherSubCategory,
    };
  }

  return {
    label: '기타',
    icon: 'dots-horizontal-circle-outline',
    tint: 'rgba(148,163,184,0.10)',
    mainCategory: 'other',
    otherSubCategory: 'etc',
  };
}
