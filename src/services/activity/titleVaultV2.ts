import { supabase } from '../supabase/client';
import type { ActivityAchievement, DashboardPet } from './activityDashboard';
import catalog from './titleCatalogV2.json';
import { getCanonicalTitleId, SERVER_TITLE_ARTWORK_IDS } from './titleArtwork';

const definitions = new Map(catalog.entries.map(entry => [entry.id, entry]));
export const TITLE_VAULT_CATEGORIES = [...new Map(
  catalog.entries.filter(entry => !entry.hidden).map(entry => [entry.category, {
    key: entry.category,
    label: entry.categoryLabel,
  }]),
).values()];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function invalid(): never { throw new Error('TITLE_VAULT_RESPONSE_INVALID'); }

export function getCanonicalTitleIdentity(key: string) {
  const id = getCanonicalTitleId(key);
  const definition = id ? definitions.get(id) : undefined;
  return definition ? { titleKey: definition.id, titleName: definition.name } : null;
}

/** The server, never a caller-provided count, owns achievement completion. */
export function parseTitleVaultV2(value: unknown, pets: DashboardPet[]): ActivityAchievement[] {
  if (!isRecord(value) || value.policyVersion !== 2 || value.catalogCount !== 332 || !Array.isArray(value.rows)) return invalid();
  const seen = new Set<string>();
  const achievements = value.rows.map((raw): ActivityAchievement => {
    if (!isRecord(raw) || typeof raw.key !== 'string') return invalid();
    if (raw.policyVersion === 1 && Object.prototype.hasOwnProperty.call(SERVER_TITLE_ARTWORK_IDS, raw.key) && raw.scope === 'common' && raw.ownerId === 'common' &&
      raw.categoryKey === 'LEGACY' && raw.achieved === true && typeof raw.name === 'string' &&
      typeof raw.earnedAt === 'string' && Number.isFinite(Date.parse(raw.earnedAt))) {
      const identity = `common:common:${raw.key}`;
      if (seen.has(identity)) return invalid();
      seen.add(identity);
      return { key: raw.key, name: raw.name, scope: 'common', ownerId: 'common', ownerLabel: '공통 활동',
        domain: 'timeline', achieved: true, currentValue: 1, threshold: 1, conditionLabel: '기존 획득 기록',
        policyVersion: 1, categoryKey: 'LEGACY', categoryLabel: '기존 칭호', progressLabel: '기존 획득 보존', earnedAt: raw.earnedAt };
    }
    const definition = definitions.get(raw.key);
    if (!definition || raw.policyVersion !== 2 || raw.name !== definition.name || raw.scope !== definition.scope ||
      raw.domain !== definition.domain || raw.categoryKey !== definition.category || raw.hidden !== definition.hidden ||
      typeof raw.ownerId !== 'string' || typeof raw.achieved !== 'boolean' ||
      typeof raw.currentValue !== 'number' || !Number.isInteger(raw.currentValue) || raw.currentValue < 0 || raw.currentValue > 1000 ||
      raw.threshold !== 1000 || typeof raw.progressLabel !== 'string' || typeof raw.progressKnown !== 'boolean' ||
      raw.conditionLabel !== definition.conditionLabel || (raw.hidden && !raw.achieved)) return invalid();
    const pet = pets.find(item => item.id === raw.ownerId);
    if ((raw.scope === 'pet' && !pet) || (raw.scope === 'common' && raw.ownerId !== 'common')) return invalid();
    const identity = `${raw.scope}:${raw.ownerId}:${raw.key}`;
    if (seen.has(identity)) return invalid();
    seen.add(identity);
    const domain = raw.domain;
    if (domain !== 'walk' && domain !== 'streak' && domain !== 'timeline' && domain !== 'timeline_category' &&
      domain !== 'community' && domain !== 'comment' && domain !== 'health') return invalid();
    const scope = raw.scope === 'pet' ? 'pet' : 'common';
    if (raw.achieved && (typeof raw.earnedAt !== 'string' || !Number.isFinite(Date.parse(raw.earnedAt)))) return invalid();
    return {
      key: raw.key, name: definition.name, domain, scope,
      ownerId: raw.ownerId, ownerLabel: pet?.name ?? '공통 활동',
      conditionLabel: raw.conditionLabel, currentValue: raw.currentValue, threshold: 1000, achieved: raw.achieved,
      policyVersion: 2, categoryKey: definition.category, categoryLabel: definition.categoryLabel,
      hidden: definition.hidden, progressLabel: raw.progressLabel,
      progressKnown: raw.progressKnown,
      ...(typeof raw.earnedAt === 'string' ? { earnedAt: raw.earnedAt } : {}),
    };
  });
  for (const definition of catalog.entries.filter(entry => !entry.hidden)) {
    const owners = definition.scope === 'common' ? ['common'] : pets.map(pet => pet.id);
    if (owners.some(owner => !seen.has(`${definition.scope}:${owner}:${definition.id}`))) return invalid();
  }
  return achievements;
}

export async function fetchTitleVaultV2(pets: DashboardPet[]): Promise<ActivityAchievement[]> {
  const { data, error } = await supabase.rpc('get_nuri_title_vault_v2');
  if (error) throw error;
  return parseTitleVaultV2(data, pets);
}

/** null is a read. A boolean mutation is sent only after an explicit user action. */
export async function manageRemembranceRecord(memoryId: string, included: boolean | null): Promise<boolean> {
  const { data, error } = await supabase.rpc('manage_nuri_remembrance_record_v2', {
    p_memory_id: memoryId, p_included: included,
  });
  if (error) throw error;
  if (!isRecord(data) || typeof data.included !== 'boolean') return invalid();
  return data.included;
}
