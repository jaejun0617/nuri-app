// 파일: src/services/records/form.ts
// 역할:
// - record 생성/수정 화면이 공유하는 폼 옵션과 입력 헬퍼를 제공
// - 이미지 picker 결과 해석, 날짜/태그 정규화, 감정/카테고리 옵션을 중앙화
// - RecordCreateScreen / RecordEditScreen 중복 로직을 줄여 화면별 동작 차이를 최소화

import type { Asset as ImagePickerAsset } from 'react-native-image-picker';

import type { EmotionTag } from '../supabase/memories';

export const RECORD_MAIN_CATEGORIES = [
  { key: 'walk', label: '산책', icon: 'activity' as const, tag: '#산책' },
  { key: 'meal', label: '식사', icon: 'coffee' as const, tag: '#식사' },
  { key: 'health', label: '건강', icon: 'heart' as const, tag: '#건강' },
  { key: 'diary', label: '일기장', icon: 'edit-3' as const, tag: '#일기장' },
  { key: 'other', label: '기타', icon: 'more-horizontal' as const, tag: '#기타' },
] as const;

export const RECORD_OTHER_SUBCATEGORIES = [
  { key: 'grooming', label: '미용', tag: '#미용' },
  { key: 'hospital', label: '병원/약', tag: '#병원약' },
  { key: 'etc', label: '기타', tag: '#기타세부' },
] as const;

export const RECORD_SUGGESTED_TAGS = [
  '#산책',
  '#강아지',
  '#귀요미',
  '#일상',
  '#힐링',
  '#꽃만남',
] as const;

export const RECORD_DEFAULT_RECENT_TAGS = [
  '#예방접종',
  '#맛있는간식',
] as const;

export const RECORD_RECENT_TAGS_STORAGE_KEY =
  'nuri.recordCreateRecentTags.v1';

export const RECORD_EMOTION_OPTIONS: ReadonlyArray<{
  value: EmotionTag;
  emoji: string;
  label: string;
}> = [
  { value: 'happy', emoji: '😊', label: '행복해요' },
  { value: 'calm', emoji: '😌', label: '평온해요' },
  { value: 'excited', emoji: '🤩', label: '신나요' },
  { value: 'neutral', emoji: '🙂', label: '무난해요' },
  { value: 'sad', emoji: '😢', label: '아쉬워요' },
  { value: 'anxious', emoji: '😥', label: '걱정돼요' },
  { value: 'angry', emoji: '😠', label: '예민해요' },
  { value: 'tired', emoji: '😴', label: '피곤해요' },
];

export type RecordMainCategoryKey =
  (typeof RECORD_MAIN_CATEGORIES)[number]['key'];
export type RecordOtherSubCategoryKey =
  (typeof RECORD_OTHER_SUBCATEGORIES)[number]['key'];
export type RecordDateShortcutKey = 'today' | 'yesterday';
export type PickedRecordImage = {
  key: string;
  uri: string;
  mimeType: string | null;
};

function inferMimeFromFileName(
  fileName: string | null | undefined,
): string | null {
  const value = (fileName ?? '').toLowerCase().trim();
  if (!value) return null;
  if (value.endsWith('.jpg') || value.endsWith('.jpeg')) return 'image/jpeg';
  if (value.endsWith('.png')) return 'image/png';
  if (value.endsWith('.webp')) return 'image/webp';
  if (value.endsWith('.heic')) return 'image/heic';
  if (value.endsWith('.heif')) return 'image/heif';
  return null;
}

function inferMimeFromUri(uri: string): string | null {
  const normalized = uri.toLowerCase().split('?')[0];
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.webp')) return 'image/webp';
  if (normalized.endsWith('.heic')) return 'image/heic';
  if (normalized.endsWith('.heif')) return 'image/heif';
  return null;
}

export function resolveRecordPickerMimeType(asset: {
  type?: string | null;
  fileName?: string | null;
  uri?: string | null;
}) {
  const direct = asset.type ?? null;
  if (direct && direct.includes('/')) return direct;

  const byName = inferMimeFromFileName(asset.fileName);
  if (byName) return byName;

  if (asset.uri) return inferMimeFromUri(asset.uri);
  return null;
}

export function buildPickedRecordImages(
  assets: ImagePickerAsset[],
  input: {
    existingUris?: string[];
    keyPrefix: string;
    limit?: number;
  },
): PickedRecordImage[] {
  const seenUris = new Set(input.existingUris ?? []);
  const next: PickedRecordImage[] = [];
  const limit = input.limit ?? 10;

  for (const asset of assets) {
    const uri = asset.uri ?? null;
    if (!uri) continue;
    if (seenUris.has(uri)) continue;

    seenUris.add(uri);
    next.push({
      key: `${input.keyPrefix}:${uri}`,
      uri,
      mimeType: resolveRecordPickerMimeType(asset),
    });

    if (next.length >= limit) break;
  }

  return next;
}

export function toRecordYmd(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function offsetRecordYmd(base: string, offsetDays: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return base;
  const [y, m, d] = base.split('-').map(Number);
  const next = new Date(y, m - 1, d + offsetDays);
  return toRecordYmd(next);
}

export function formatRecordKoreanDate(ymd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;

  const [y, m, d] = ymd.split('-').map(Number);
  const dayIndex = new Date(y, m - 1, d).getDay();
  const dayText = ['일', '월', '화', '수', '목', '금', '토'][dayIndex] ?? '';
  return `${y}년 ${m}월 ${d}일 ${dayText}요일`;
}

export function parseRecordTags(raw: string) {
  const cleaned = raw.trim();
  if (!cleaned) return [];

  const byComma = cleaned
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const base =
    byComma.length >= 2
      ? byComma
      : cleaned
          .split(/\s+/)
          .map(s => s.trim())
          .filter(Boolean);

  return base
    .map(tag => tag.replace(/^#/, '').trim())
    .filter(Boolean)
    .slice(0, 10)
    .map(tag => `#${tag}`);
}

export function mergeRecordTags(
  selectedTags: string[],
  mainCategoryKey: RecordMainCategoryKey | null,
  otherSubCategoryKey: RecordOtherSubCategoryKey | null,
) {
  const manual = selectedTags
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 10);
  const mainTag =
    RECORD_MAIN_CATEGORIES.find(category => category.key === mainCategoryKey)
      ?.tag ?? null;
  const otherSubTag =
    otherSubCategoryKey && mainCategoryKey === 'other'
      ? RECORD_OTHER_SUBCATEGORIES.find(sub => sub.key === otherSubCategoryKey)
          ?.tag ?? null
      : null;

  const merged = [mainTag, otherSubTag, ...manual].filter(Boolean) as string[];
  return Array.from(new Set(merged));
}

export function validateRecordOccurredAt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error('날짜 형식은 YYYY-MM-DD 입니다.');
  }
  return trimmed;
}

export function normalizeRecentRecordTags(tags: string[]) {
  return tags
    .map(tag => (tag ?? '').trim())
    .filter(Boolean)
    .slice(0, 8);
}
