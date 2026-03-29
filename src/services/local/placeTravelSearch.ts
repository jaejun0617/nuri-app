import AsyncStorage from '@react-native-async-storage/async-storage';

export type PersonalSearchNamespace =
  | 'walk'
  | 'pet-friendly-place'
  | 'pet-travel';

export type RecentPersonalSearchEntry = {
  query: string;
  updatedAt: string;
};

const RECENT_PERSONAL_SEARCH_LIMIT = 6;
const STORAGE_KEY_BY_NAMESPACE: Record<PersonalSearchNamespace, string> = {
  walk: 'nuri.locationDiscovery.walk.recentSearches.v1',
  'pet-friendly-place': 'nuri.locationDiscovery.petFriendly.recentSearches.v1',
  'pet-travel': 'nuri.petTravel.recentSearches.v1',
};

function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function safeParseEntries(raw: string | null): RecentPersonalSearchEntry[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as RecentPersonalSearchEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        entry =>
          entry &&
          typeof entry.query === 'string' &&
          typeof entry.updatedAt === 'string',
      )
      .map(entry => ({
        query: normalizeQuery(entry.query),
        updatedAt: entry.updatedAt,
      }))
      .filter(entry => entry.query.length > 0)
      .slice(0, RECENT_PERSONAL_SEARCH_LIMIT);
  } catch {
    return [];
  }
}

async function persistEntries(
  namespace: PersonalSearchNamespace,
  entries: RecentPersonalSearchEntry[],
): Promise<RecentPersonalSearchEntry[]> {
  const normalized = entries
    .map(entry => ({
      query: normalizeQuery(entry.query),
      updatedAt: entry.updatedAt,
    }))
    .filter(entry => entry.query.length > 0)
    .slice(0, RECENT_PERSONAL_SEARCH_LIMIT);

  const storageKey = STORAGE_KEY_BY_NAMESPACE[namespace];
  if (normalized.length === 0) {
    await AsyncStorage.removeItem(storageKey);
    return [];
  }

  await AsyncStorage.setItem(storageKey, JSON.stringify(normalized));
  return normalized;
}

export async function loadRecentPersonalSearches(
  namespace: PersonalSearchNamespace,
): Promise<RecentPersonalSearchEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_BY_NAMESPACE[namespace]);
  return safeParseEntries(raw);
}

export async function saveRecentPersonalSearch(
  namespace: PersonalSearchNamespace,
  query: string,
): Promise<RecentPersonalSearchEntry[]> {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return loadRecentPersonalSearches(namespace);
  }

  const nextEntry: RecentPersonalSearchEntry = {
    query: normalizedQuery,
    updatedAt: new Date().toISOString(),
  };
  const current = await loadRecentPersonalSearches(namespace);
  const deduped = current.filter(entry => entry.query !== normalizedQuery);
  return persistEntries(namespace, [nextEntry, ...deduped]);
}

export async function removeRecentPersonalSearch(
  namespace: PersonalSearchNamespace,
  query: string,
): Promise<RecentPersonalSearchEntry[]> {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return loadRecentPersonalSearches(namespace);
  }

  const current = await loadRecentPersonalSearches(namespace);
  return persistEntries(
    namespace,
    current.filter(entry => entry.query !== normalizedQuery),
  );
}

export async function clearRecentPersonalSearches(
  namespace: PersonalSearchNamespace,
): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY_BY_NAMESPACE[namespace]);
}

export async function clearAllRecentPersonalSearches(): Promise<void> {
  await Promise.all(
    Object.values(STORAGE_KEY_BY_NAMESPACE).map(storageKey =>
      AsyncStorage.removeItem(storageKey),
    ),
  );
}
