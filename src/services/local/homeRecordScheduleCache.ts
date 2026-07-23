// 파일: src/services/local/homeRecordScheduleCache.ts
// 역할:
// - 로그인 홈의 기록/일정 프리뷰를 userId + petId scope로 디스크 캐시한다.
// - 홈 첫 렌더링은 캐시를 먼저 보여주고, 원격 bootstrap은 기존 store 상태머신이 background refresh로 마무리한다.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MemoryRecord } from '../supabase/memories';
import type { PetSchedule } from '../supabase/schedules';
import { normalizeMemoryRecordMetadata } from '../records/metadata';

export type HomeRecordScheduleCache = {
  savedAt: number;
  records: MemoryRecord[];
  schedules: PetSchedule[];
};

type PersistedHomeRecordScheduleCache = HomeRecordScheduleCache & {
  schemaVersion: 1;
  userId: string;
  petId: string;
};

const HOME_RECORD_SCHEDULE_CACHE_PREFIX = '@nuri/home-record-schedule/v1';
const HOME_RECORD_SCHEDULE_CACHE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const HOME_RECORD_CACHE_LIMIT = 20;
const HOME_SCHEDULE_CACHE_LIMIT = 30;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toNullableString(value: unknown): string | null {
  const normalized = toString(value);
  return normalized.length > 0 ? normalized : null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function toNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toBoolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false;
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item));
}

export function buildHomeRecordScheduleCacheKey(input: {
  userId: string;
  petId: string;
}) {
  return `${HOME_RECORD_SCHEDULE_CACHE_PREFIX}:${input.userId}:${input.petId}`;
}

function parseCachedMemoryRecord(value: unknown, petId: string): MemoryRecord | null {
  if (!isRecord(value)) return null;
  const id = toString(value.id);
  const cachedPetId = toString(value.petId);
  const title = toString(value.title);
  const createdAt = toString(value.createdAt);
  if (!id || cachedPetId !== petId || !title || !createdAt) return null;

  return {
    id,
    petId: cachedPetId,
    title,
    content: toNullableString(value.content),
    emotion: toNullableString(value.emotion) as MemoryRecord['emotion'],
    tags: toStringArray(value.tags),
    category: toNullableString(value.category),
    subCategory: toNullableString(value.subCategory),
    price: toNumberOrNull(value.price),
    occurredAt: toNullableString(value.occurredAt),
    createdAt,
    metadata: normalizeMemoryRecordMetadata(value.metadata),
    imageUrl: toNullableString(value.imageUrl),
    imagePath: toNullableString(value.imagePath),
    imagePaths: toStringArray(value.imagePaths),
    timelineImagePath: toNullableString(value.timelineImagePath),
    timelineImageVariant:
      value.timelineImageVariant === 'original' ||
      value.timelineImageVariant === 'timeline-thumb'
        ? value.timelineImageVariant
        : null,
  };
}

function parseCachedSchedule(
  value: unknown,
  input: { userId: string; petId: string },
): PetSchedule | null {
  if (!isRecord(value)) return null;
  const id = toString(value.id);
  const userId = toString(value.userId);
  const petId = toString(value.petId);
  const title = toString(value.title);
  const startsAt = toString(value.startsAt);
  const category = toString(value.category) as PetSchedule['category'];
  const iconKey = toString(value.iconKey) as PetSchedule['iconKey'];
  const createdAt = toString(value.createdAt);
  const updatedAt = toString(value.updatedAt);

  if (
    !id ||
    userId !== input.userId ||
    petId !== input.petId ||
    !title ||
    !startsAt ||
    !category ||
    !iconKey ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,
    userId,
    petId,
    title,
    note: toNullableString(value.note),
    startsAt,
    endsAt: toNullableString(value.endsAt),
    allDay: toBoolean(value.allDay),
    category,
    subCategory: toNullableString(value.subCategory) as PetSchedule['subCategory'],
    iconKey,
    colorKey: (toNullableString(value.colorKey) ?? 'brand') as PetSchedule['colorKey'],
    reminderMinutes: toNumberArray(value.reminderMinutes),
    repeatRule: (toNullableString(value.repeatRule) ?? 'none') as PetSchedule['repeatRule'],
    repeatInterval: toNumberOrNull(value.repeatInterval) ?? 1,
    repeatUntil: toNullableString(value.repeatUntil),
    linkedMemoryId: toNullableString(value.linkedMemoryId),
    completedAt: toNullableString(value.completedAt),
    source: (toNullableString(value.source) ?? 'manual') as PetSchedule['source'],
    externalCalendarId: toNullableString(value.externalCalendarId),
    externalEventId: toNullableString(value.externalEventId),
    syncStatus: (toNullableString(value.syncStatus) ?? 'local') as PetSchedule['syncStatus'],
    createdAt,
    updatedAt,
  };
}

function parseCacheEntry(
  value: unknown,
  input: { userId: string; petId: string; now: number },
): HomeRecordScheduleCache | null {
  if (!isRecord(value)) return null;
  if (value.schemaVersion !== 1) return null;
  if (toString(value.userId) !== input.userId) return null;
  if (toString(value.petId) !== input.petId) return null;

  const savedAt =
    typeof value.savedAt === 'number' && Number.isFinite(value.savedAt)
      ? value.savedAt
      : null;
  if (!savedAt || input.now - savedAt > HOME_RECORD_SCHEDULE_CACHE_MAX_AGE_MS) {
    return null;
  }

  const records = Array.isArray(value.records)
    ? value.records
        .map(item => parseCachedMemoryRecord(item, input.petId))
        .filter((item): item is MemoryRecord => item !== null)
    : [];
  const schedules = Array.isArray(value.schedules)
    ? value.schedules
        .map(item => parseCachedSchedule(item, input))
        .filter((item): item is PetSchedule => item !== null)
    : [];

  return { savedAt, records, schedules };
}

export async function loadHomeRecordScheduleCache(input: {
  userId: string | null;
  petId: string | null;
  now?: number;
}): Promise<HomeRecordScheduleCache | null> {
  if (!input.userId || !input.petId) return null;
  const cacheKey = buildHomeRecordScheduleCacheKey({
    userId: input.userId,
    petId: input.petId,
  });
  const raw = await AsyncStorage.getItem(cacheKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    const entry = parseCacheEntry(parsed, {
      userId: input.userId,
      petId: input.petId,
      now: input.now ?? Date.now(),
    });
    if (!entry) {
      await AsyncStorage.removeItem(cacheKey);
    }
    return entry;
  } catch {
    await AsyncStorage.removeItem(cacheKey);
    return null;
  }
}

export async function saveHomeRecordScheduleCache(input: {
  userId: string | null;
  petId: string | null;
  records: MemoryRecord[];
  schedules: PetSchedule[];
  now?: number;
}): Promise<void> {
  if (!input.userId || !input.petId) return;
  const scopedRecords = input.records
    .filter(record => record.petId === input.petId)
    .slice(0, HOME_RECORD_CACHE_LIMIT);
  const scopedSchedules = input.schedules
    .filter(
      schedule =>
        schedule.userId === input.userId && schedule.petId === input.petId,
    )
    .slice(0, HOME_SCHEDULE_CACHE_LIMIT);

  const entry: PersistedHomeRecordScheduleCache = {
    schemaVersion: 1,
    userId: input.userId,
    petId: input.petId,
    savedAt: input.now ?? Date.now(),
    records: scopedRecords,
    schedules: scopedSchedules,
  };

  await AsyncStorage.setItem(
    buildHomeRecordScheduleCacheKey({
      userId: input.userId,
      petId: input.petId,
    }),
    JSON.stringify(entry),
  );
}

export async function clearAllHomeRecordScheduleCaches(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter(key =>
    key.startsWith(HOME_RECORD_SCHEDULE_CACHE_PREFIX),
  );
  if (cacheKeys.length === 0) return;
  await Promise.all(cacheKeys.map(key => AsyncStorage.removeItem(key)));
}
