import { buildActivityDashboard, mapLedgerRow } from '../activity/activityDashboard';
import type { ActivityDashboardData, ActivityDashboardLedgerRow } from '../activity/activityDashboard';
import { buildTimelineCategoryCounts } from '../timeline/query';
import type { MemoryRecord } from '../supabase/memories';
import type { Pet } from '../../store/petStore';

export type ScopedTimelineDomain = { kind: 'timeline'; pets: Pet[]; records: MemoryRecord[] };
export type ScopedActivityDomain = { kind: 'activity'; pets: Pet[]; dashboard: ActivityDashboardData };
export type ScopedDestinationDomain = ScopedTimelineDomain | ScopedActivityDomain;

const invalid = () => new Error('NURI_NOTIFICATION_RESPONSE_INVALID');
const uuid = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  return value as Record<string, unknown>;
}
function string(value: unknown) {
  if (typeof value !== 'string') throw invalid();
  return value;
}
const nullable = (value: unknown) => value === null ? null : string(value);
function id(value: unknown) {
  const result = string(value);
  if (!uuid.test(result)) throw invalid();
  return result;
}
function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw invalid();
  return value;
}
function count(value: unknown) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw invalid();
  return value;
}
function time(value: unknown) {
  const result = string(value);
  if (!Number.isFinite(Date.parse(result))) throw invalid();
  return result;
}

export function parseScopedDestinationDomain(value: unknown): ScopedDestinationDomain {
  const row = object(value);
  const pets = list(row.pets).map(raw => {
    const pet = object(raw);
    return { id: id(pet.id), name: string(pet.name), themeColor: nullable(pet.themeColor) };
  });
  const owned = new Set(pets.map(pet => pet.id));
  if (owned.size !== pets.length) throw invalid();
  const records = list(row.records).map((raw): MemoryRecord => {
    const record = object(raw);
    const petId = id(record.petId);
    if (!owned.has(petId)) throw invalid();
    return { id: id(record.id), petId, title: string(record.title),
      category: nullable(record.category), subCategory: nullable(record.subCategory),
      occurredAt: time(record.occurredAt), createdAt: time(record.createdAt),
      tags: [], imagePaths: [] };
  });
  if (new Set(records.map(record => record.id)).size !== records.length) throw invalid();
  if (row.kind === 'timeline') return { kind: 'timeline', pets, records };
  if (row.kind !== 'activity') throw invalid();
  const ledgerRows = list(row.ledger).map((raw): ActivityDashboardLedgerRow => {
    const entry = mapLedgerRow(raw);
    if (!entry || !uuid.test(entry.id) || (entry.petId !== null && !owned.has(entry.petId))) throw invalid();
    return entry;
  });
  return { kind: 'activity', pets, dashboard: buildActivityDashboard({
    pets,
    levelSummary: { totalXp: count(row.totalXp), level: 1, currentLevelXp: 0, nextLevelXp: 100, updatedAt: null },
    ledgerRows,
    titles: [], streakByPetId: {}, healthRecordCountsByPetId: {},
    timelineCountsByPetId: Object.fromEntries(pets.map(pet =>
      [pet.id, buildTimelineCategoryCounts(records.filter(record => record.petId === pet.id))],
    )),
    communityPostCount: count(row.postCount),
    commentCount: count(row.commentCount),
  }) };
}
