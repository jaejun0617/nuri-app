import { supabase } from './client';
import { buildHealthReportMonthBounds } from '../health-report/month';

export type PetWeightLogSource =
  | 'manual'
  | 'health_report'
  | 'pet_profile'
  | 'pet_create'
  | 'home'
  | 'backfill';

export type PetWeightLog = {
  id: string;
  petId: string;
  userId: string;
  measuredOn: string;
  weightKg: number;
  note: string | null;
  source: PetWeightLogSource;
  createdAt: string;
  updatedAt: string;
};

export type PetWeightLatestSnapshot = {
  latestWeightKg: number;
  latestMeasuredOn: string;
  latestLogId: string;
};

export type PetWeightLogsForMonthResult = {
  logs: PetWeightLog[];
  previousLog: PetWeightLog | null;
  latestSnapshot: PetWeightLatestSnapshot | null;
};

export type PetWeightLogMutationResult = {
  action: 'upsert' | 'delete';
  changedLog: PetWeightLog | null;
  latestSnapshot: PetWeightLatestSnapshot | null;
};

type PetWeightLogRow = {
  id: string;
  pet_id: string;
  user_id: string;
  measured_on: string;
  weight_kg: number | string;
  note: string | null;
  source: PetWeightLogSource;
  created_at: string;
  updated_at: string;
};

const PET_WEIGHT_LOG_COLUMNS = [
  'id',
  'pet_id',
  'user_id',
  'measured_on',
  'weight_kg',
  'note',
  'source',
  'created_at',
  'updated_at',
].join(',');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

function isPetWeightLogSource(value: unknown): value is PetWeightLogSource {
  return (
    value === 'manual' ||
    value === 'health_report' ||
    value === 'pet_profile' ||
    value === 'pet_create' ||
    value === 'home' ||
    value === 'backfill'
  );
}

function isPetWeightLogRow(value: unknown): value is PetWeightLogRow {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.pet_id === 'string' &&
    typeof value.user_id === 'string' &&
    typeof value.measured_on === 'string' &&
    toFiniteNumber(value.weight_kg) !== null &&
    isPetWeightLogSource(value.source) &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string'
  );
}

function toPetWeightLogRows(data: unknown): PetWeightLogRow[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isPetWeightLogRow);
}

function mapRow(row: PetWeightLogRow): PetWeightLog {
  return {
    id: row.id,
    petId: row.pet_id,
    userId: row.user_id,
    measuredOn: row.measured_on,
    weightKg: toFiniteNumber(row.weight_kg) ?? 0,
    note: row.note,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toLatestSnapshot(log: PetWeightLog | null): PetWeightLatestSnapshot | null {
  if (!log) return null;
  return {
    latestWeightKg: log.weightKg,
    latestMeasuredOn: log.measuredOn,
    latestLogId: log.id,
  };
}

export async function fetchLatestPetWeightSnapshot(
  petId: string,
): Promise<PetWeightLatestSnapshot | null> {
  const { data, error } = await supabase
    .from('pet_weight_logs')
    .select(PET_WEIGHT_LOG_COLUMNS)
    .eq('pet_id', petId)
    .order('measured_on', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!isPetWeightLogRow(data)) return null;
  return toLatestSnapshot(mapRow(data));
}

export async function fetchPetWeightLogsForMonth(input: {
  petId: string;
  monthKey: string;
}): Promise<PetWeightLogsForMonthResult> {
  const bounds = buildHealthReportMonthBounds(input.monthKey);

  const [monthResult, previousResult, latestSnapshot] = await Promise.all([
    supabase
      .from('pet_weight_logs')
      .select(PET_WEIGHT_LOG_COLUMNS)
      .eq('pet_id', input.petId)
      .gte('measured_on', bounds.startYmd)
      .lt('measured_on', bounds.endExclusiveYmd)
      .order('measured_on', { ascending: true })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true }),
    supabase
      .from('pet_weight_logs')
      .select(PET_WEIGHT_LOG_COLUMNS)
      .eq('pet_id', input.petId)
      .lt('measured_on', bounds.startYmd)
      .order('measured_on', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle(),
    fetchLatestPetWeightSnapshot(input.petId),
  ]);

  if (monthResult.error) throw monthResult.error;
  if (previousResult.error) throw previousResult.error;

  return {
    logs: toPetWeightLogRows(monthResult.data).map(mapRow),
    previousLog: isPetWeightLogRow(previousResult.data)
      ? mapRow(previousResult.data)
      : null,
    latestSnapshot,
  };
}

export async function upsertPetWeightLog(input: {
  petId: string;
  measuredOn: string;
  weightKg: number;
  note?: string | null;
  source: PetWeightLogSource;
}): Promise<PetWeightLogMutationResult> {
  const payload = {
    pet_id: input.petId,
    measured_on: input.measuredOn,
    weight_kg: input.weightKg,
    note: input.note?.trim() ? input.note.trim() : null,
    source: input.source,
  };

  const { data, error } = await supabase
    .from('pet_weight_logs')
    .upsert(payload, { onConflict: 'pet_id,measured_on' })
    .select(PET_WEIGHT_LOG_COLUMNS)
    .single();

  if (error) throw error;
  if (!isPetWeightLogRow(data)) {
    throw new Error('체중 기록 저장 결과를 확인하지 못했어요.');
  }

  return {
    action: 'upsert',
    changedLog: mapRow(data),
    latestSnapshot: await fetchLatestPetWeightSnapshot(input.petId),
  };
}

export async function deletePetWeightLog(input: {
  logId: string;
}): Promise<PetWeightLogMutationResult> {
  const { data, error } = await supabase
    .from('pet_weight_logs')
    .delete()
    .eq('id', input.logId)
    .select(PET_WEIGHT_LOG_COLUMNS)
    .single();

  if (error) throw error;
  if (!isPetWeightLogRow(data)) {
    throw new Error('삭제한 체중 기록을 확인하지 못했어요.');
  }

  const deletedLog = mapRow(data);
  return {
    action: 'delete',
    changedLog: deletedLog,
    latestSnapshot: await fetchLatestPetWeightSnapshot(deletedLog.petId),
  };
}

