import AsyncStorage from '@react-native-async-storage/async-storage';

import { GUIDE_RECENT_SEARCH_LIMIT } from '../guides/config';

const GUIDE_RECENT_SEARCHES_STORAGE_KEY = 'nuri.guides.recentSearches.v1';

export type RecentGuideSearchEntry = {
  query: string;
  updatedAt: string;
};

function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function safeParseEntries(raw: string | null): RecentGuideSearchEntry[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as RecentGuideSearchEntry[];
    if (!Array.isArray(parsed)) return [];

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
      .slice(0, GUIDE_RECENT_SEARCH_LIMIT);
  } catch {
    return [];
  }
}

async function persistEntries(entries: RecentGuideSearchEntry[]): Promise<RecentGuideSearchEntry[]> {
  const normalized = entries
    .map(entry => ({
      query: normalizeQuery(entry.query),
      updatedAt: entry.updatedAt,
    }))
    .filter(entry => entry.query.length > 0)
    .slice(0, GUIDE_RECENT_SEARCH_LIMIT);

  if (normalized.length === 0) {
    await AsyncStorage.removeItem(GUIDE_RECENT_SEARCHES_STORAGE_KEY);
    return [];
  }

  await AsyncStorage.setItem(
    GUIDE_RECENT_SEARCHES_STORAGE_KEY,
    JSON.stringify(normalized),
  );
  return normalized;
}

export async function loadRecentGuideSearches(): Promise<RecentGuideSearchEntry[]> {
  const raw = await AsyncStorage.getItem(GUIDE_RECENT_SEARCHES_STORAGE_KEY);
  return safeParseEntries(raw);
}

export async function saveRecentGuideSearch(
  query: string,
): Promise<RecentGuideSearchEntry[]> {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return loadRecentGuideSearches();
  }

  const nextEntry: RecentGuideSearchEntry = {
    query: normalizedQuery,
    updatedAt: new Date().toISOString(),
  };
  const current = await loadRecentGuideSearches();
  const deduped = current.filter(entry => entry.query !== normalizedQuery);
  return persistEntries([nextEntry, ...deduped]);
}

export async function removeRecentGuideSearch(
  query: string,
): Promise<RecentGuideSearchEntry[]> {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) return loadRecentGuideSearches();

  const current = await loadRecentGuideSearches();
  return persistEntries(
    current.filter(entry => entry.query !== normalizedQuery),
  );
}

export async function clearRecentGuideSearches(): Promise<void> {
  await AsyncStorage.removeItem(GUIDE_RECENT_SEARCHES_STORAGE_KEY);
}
