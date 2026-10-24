import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActivityDashboardData } from './activityDashboard';
import type { HomeTitleBadgeIdentity } from './homeTitleBadge';
import { getTitleArtwork, SERVER_TITLE_ARTWORK_IDS } from './titleArtwork';
import { getCanonicalTitleIdentity } from './titleVaultV2';

const PREFIX = '@nuri/home-title-selection/v1';
const storageKey = (userId: string, petId: string) =>
  `${PREFIX}:${userId}:${petId}`;
const knownAchievement = (key: string) =>
  getTitleArtwork(key) !== undefined;

/** A device-local display preference, never an award or XP settlement. */
export async function loadHomeTitleSelection(input: {
  userId: string | null;
  petId: string | null;
}): Promise<HomeTitleBadgeIdentity | null> {
  if (!input.userId || !input.petId) return null;
  const raw = await AsyncStorage.getItem(storageKey(input.userId, input.petId));
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const entry = value as Record<string, unknown>;
    if (
      entry.version !== 1 ||
      typeof entry.titleKey !== 'string' ||
      !knownAchievement(entry.titleKey) ||
      typeof entry.titleName !== 'string' ||
      !entry.titleName.trim()
    )
      return null;
    const legacyUnscoped = Object.prototype.hasOwnProperty.call(SERVER_TITLE_ARTWORK_IDS, entry.titleKey);
    return (!legacyUnscoped ? getCanonicalTitleIdentity(entry.titleKey) : null) ?? { titleKey: entry.titleKey, titleName: entry.titleName };
  } catch {
    return null;
  }
}

export async function saveHomeTitleSelection(input: {
  userId: string;
  petId: string;
  achievementKey: string;
  dashboard: ActivityDashboardData;
}): Promise<HomeTitleBadgeIdentity> {
  const pet = input.dashboard.petSummaries.find(p => p.petId === input.petId);
  if (!input.userId || !pet) throw new Error('TITLE_PET_SCOPE_INVALID');
  // Resolve from the loaded source, never from caller-supplied names or artwork.
  const achievement = [
    ...pet.achievements.filter(
      a => a.scope === 'pet' && a.ownerId === pet.petId,
    ),
    ...input.dashboard.commonSummary.achievements.filter(
      a => a.scope === 'common' && a.ownerId === 'common',
    ),
  ].find(a => a.key === input.achievementKey && a.achieved);
  if (!achievement || !knownAchievement(achievement.key))
    throw new Error('TITLE_NOT_EARNED');
  const identity = (achievement.policyVersion !== 1 ? getCanonicalTitleIdentity(achievement.key) : null) ?? { titleKey: achievement.key, titleName: achievement.name };
  await AsyncStorage.setItem(
    storageKey(input.userId, input.petId),
    JSON.stringify({ version: 1, ...identity }),
  );
  return identity;
}
