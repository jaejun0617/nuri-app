// 파일: src/services/supabase/schedules.ts
// 목적:
// - pet_schedules 조회/생성/수정/삭제
// - 홈 "전체 일정"과 향후 일정 화면의 기준 서비스

import { supabase } from './client';

export type ScheduleCategory =
  | 'walk'
  | 'meal'
  | 'health'
  | 'grooming'
  | 'diary'
  | 'other';

export type ScheduleSubCategory =
  | 'vaccine'
  | 'hospital'
  | 'medicine'
  | 'checkup'
  | 'bath'
  | 'haircut'
  | 'nail'
  | 'meal-plan'
  | 'walk-routine'
  | 'journal'
  | 'etc';

export type ScheduleIconKey =
  | 'walk'
  | 'meal'
  | 'bowl'
  | 'medical-bag'
  | 'stethoscope'
  | 'syringe'
  | 'pill'
  | 'content-cut'
  | 'shower'
  | 'notebook'
  | 'heart'
  | 'star'
  | 'calendar'
  | 'dots';

export type ScheduleColorKey =
  | 'brand'
  | 'blue'
  | 'green'
  | 'orange'
  | 'pink'
  | 'yellow'
  | 'gray';

export type ScheduleRepeatRule =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly';

export type ScheduleSource =
  | 'manual'
  | 'google_calendar'
  | 'apple_calendar'
  | 'imported';

export type ScheduleSyncStatus = 'local' | 'synced' | 'dirty' | 'deleted';

export type PetSchedule = {
  id: string;
  userId: string;
  petId: string;
  title: string;
  note: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  category: ScheduleCategory;
  subCategory: ScheduleSubCategory | null;
  iconKey: ScheduleIconKey;
  colorKey: ScheduleColorKey;
  reminderMinutes: number[];
  repeatRule: ScheduleRepeatRule;
  repeatInterval: number;
  repeatUntil: string | null;
  linkedMemoryId: string | null;
  completedAt: string | null;
  source: ScheduleSource;
  externalCalendarId: string | null;
  externalEventId: string | null;
  syncStatus: ScheduleSyncStatus;
  createdAt: string;
  updatedAt: string;
};

type PetSchedulesRow = {
  id: string;
  user_id: string;
  pet_id: string;
  title: string;
  note: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean | null;
  category: ScheduleCategory;
  sub_category: ScheduleSubCategory | null;
  icon_key: ScheduleIconKey;
  color_key: ScheduleColorKey | null;
  reminder_minutes: number[] | null;
  repeat_rule: ScheduleRepeatRule | null;
  repeat_interval: number | null;
  repeat_until: string | null;
  linked_memory_id: string | null;
  completed_at: string | null;
  source: ScheduleSource | null;
  external_calendar_id: string | null;
  external_event_id: string | null;
  sync_status: ScheduleSyncStatus | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: PetSchedulesRow): PetSchedule {
  return {
    id: row.id,
    userId: row.user_id,
    petId: row.pet_id,
    title: row.title,
    note: row.note,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: row.all_day ?? false,
    category: row.category,
    subCategory: row.sub_category,
    iconKey: row.icon_key,
    colorKey: row.color_key ?? 'brand',
    reminderMinutes: row.reminder_minutes ?? [],
    repeatRule: row.repeat_rule ?? 'none',
    repeatInterval: row.repeat_interval ?? 1,
    repeatUntil: row.repeat_until,
    linkedMemoryId: row.linked_memory_id,
    completedAt: row.completed_at,
    source: row.source ?? 'manual',
    externalCalendarId: row.external_calendar_id,
    externalEventId: row.external_event_id,
    syncStatus: row.sync_status ?? 'local',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SCHEDULE_COLUMNS = [
  'id',
  'user_id',
  'pet_id',
  'title',
  'note',
  'starts_at',
  'ends_at',
  'all_day',
  'category',
  'sub_category',
  'icon_key',
  'color_key',
  'reminder_minutes',
  'repeat_rule',
  'repeat_interval',
  'repeat_until',
  'linked_memory_id',
  'completed_at',
  'source',
  'external_calendar_id',
  'external_event_id',
  'sync_status',
  'created_at',
  'updated_at',
].join(',');

export async function fetchSchedulesByPetRange(input: {
  petId: string;
  from: string;
  to: string;
}): Promise<PetSchedule[]> {
  const { data, error } = await supabase
    .from('pet_schedules')
    .select(SCHEDULE_COLUMNS)
    .eq('pet_id', input.petId)
    .gte('starts_at', input.from)
    .lte('starts_at', input.to)
    .neq('sync_status', 'deleted')
    .order('starts_at', { ascending: true });

  if (error) throw error;

  const rows = (Array.isArray(data) ? data : []) as unknown as PetSchedulesRow[];
  return rows.map(mapRow);
}

export async function fetchSchedulesByPet(input: {
  petId: string;
  limit?: number;
}): Promise<PetSchedule[]> {
  let query = supabase
    .from('pet_schedules')
    .select(SCHEDULE_COLUMNS)
    .eq('pet_id', input.petId)
    .neq('sync_status', 'deleted')
    .order('starts_at', { ascending: true });

  if (typeof input.limit === 'number' && input.limit > 0) {
    query = query.limit(input.limit);
  }

  const { data, error } = await query;

  if (error) throw error;

  const rows = (Array.isArray(data) ? data : []) as unknown as PetSchedulesRow[];
  return rows.map(mapRow);
}

export async function fetchScheduleById(scheduleId: string): Promise<PetSchedule> {
  const { data, error } = await supabase
    .from('pet_schedules')
    .select(SCHEDULE_COLUMNS)
    .eq('id', scheduleId)
    .single();

  if (error) throw error;
  return mapRow(data as unknown as PetSchedulesRow);
}

export async function createSchedule(input: {
  petId: string;
  title: string;
  note?: string | null;
  startsAt: string;
  endsAt?: string | null;
  allDay?: boolean;
  category: ScheduleCategory;
  subCategory?: ScheduleSubCategory | null;
  iconKey: ScheduleIconKey;
  colorKey?: ScheduleColorKey;
  reminderMinutes?: number[];
  repeatRule?: ScheduleRepeatRule;
  repeatInterval?: number;
  repeatUntil?: string | null;
  linkedMemoryId?: string | null;
  source?: ScheduleSource;
  externalCalendarId?: string | null;
  externalEventId?: string | null;
  syncStatus?: ScheduleSyncStatus;
}): Promise<string> {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id ?? null;
  if (!userId) throw new Error('로그인 정보가 없습니다.');

  const payload = {
    user_id: userId,
    pet_id: input.petId,
    title: input.title.trim(),
    note: input.note ?? null,
    starts_at: input.startsAt,
    ends_at: input.endsAt ?? null,
    all_day: input.allDay ?? false,
    category: input.category,
    sub_category: input.subCategory ?? null,
    icon_key: input.iconKey,
    color_key: input.colorKey ?? 'brand',
    reminder_minutes: input.reminderMinutes ?? [],
    repeat_rule: input.repeatRule ?? 'none',
    repeat_interval: input.repeatInterval ?? 1,
    repeat_until: input.repeatUntil ?? null,
    linked_memory_id: input.linkedMemoryId ?? null,
    source: input.source ?? 'manual',
    external_calendar_id: input.externalCalendarId ?? null,
    external_event_id: input.externalEventId ?? null,
    sync_status: input.syncStatus ?? 'local',
  };

  const { data, error } = await supabase
    .from('pet_schedules')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;

  return (data as { id: string }).id;
}

export async function updateSchedule(input: {
  scheduleId: string;
  petId: string;
  title: string;
  note?: string | null;
  startsAt: string;
  endsAt?: string | null;
  allDay?: boolean;
  category: ScheduleCategory;
  subCategory?: ScheduleSubCategory | null;
  iconKey: ScheduleIconKey;
  colorKey?: ScheduleColorKey;
  reminderMinutes?: number[];
  repeatRule?: ScheduleRepeatRule;
  repeatInterval?: number;
  repeatUntil?: string | null;
  linkedMemoryId?: string | null;
  completedAt?: string | null;
  source?: ScheduleSource;
  externalCalendarId?: string | null;
  externalEventId?: string | null;
  syncStatus?: ScheduleSyncStatus;
}): Promise<void> {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id ?? null;
  if (!userId) throw new Error('로그인 정보가 없습니다.');

  const payload = {
    pet_id: input.petId,
    title: input.title.trim(),
    note: input.note ?? null,
    starts_at: input.startsAt,
    ends_at: input.endsAt ?? null,
    all_day: input.allDay ?? false,
    category: input.category,
    sub_category: input.subCategory ?? null,
    icon_key: input.iconKey,
    color_key: input.colorKey ?? 'brand',
    reminder_minutes: input.reminderMinutes ?? [],
    repeat_rule: input.repeatRule ?? 'none',
    repeat_interval: input.repeatInterval ?? 1,
    repeat_until: input.repeatUntil ?? null,
    linked_memory_id: input.linkedMemoryId ?? null,
    completed_at: input.completedAt ?? null,
    source: input.source ?? 'manual',
    external_calendar_id: input.externalCalendarId ?? null,
    external_event_id: input.externalEventId ?? null,
    sync_status: input.syncStatus ?? 'local',
  };

  const { error } = await supabase
    .from('pet_schedules')
    .update(payload)
    .eq('id', input.scheduleId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id ?? null;
  if (!userId) throw new Error('로그인 정보가 없습니다.');

  const { error } = await supabase
    .from('pet_schedules')
    .delete()
    .eq('id', scheduleId)
    .eq('user_id', userId);

  if (error) throw error;
}
