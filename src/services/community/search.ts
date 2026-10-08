export const COMMUNITY_SEARCH_MAX_LENGTH = 100;

export function normalizeCommunitySearchQuery(query: string): string {
  const normalized = query.trim();
  if (normalized.length > COMMUNITY_SEARCH_MAX_LENGTH) {
    throw new Error('community_search_query_invalid');
  }
  return normalized;
}
