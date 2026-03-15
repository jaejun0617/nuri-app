import type { PetCareGuide } from './types';

type GuideSeason = 'spring' | 'summer' | 'autumn' | 'winter';

const SEASON_KEYWORDS: Readonly<Record<GuideSeason, ReadonlyArray<string>>> = {
  spring: ['봄', 'spring', '환절기'],
  summer: ['여름', 'summer', '장마', '폭염'],
  autumn: ['가을', 'autumn'],
  winter: ['겨울', 'winter', '한파'],
};

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase();
}

function getCurrentSeason(now = new Date()): GuideSeason {
  const month = now.getMonth() + 1;

  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function guideSeasonMatches(
  guide: PetCareGuide,
  season: GuideSeason,
): boolean {
  const keywords = [
    guide.title,
    guide.summary,
    ...guide.tags,
    ...guide.searchKeywords,
    ...guide.speciesKeywords,
  ].map(normalizeKeyword);

  return SEASON_KEYWORDS[season].some(keyword =>
    keywords.some(value => value.includes(normalizeKeyword(keyword))),
  );
}

function detectGuideSeason(guide: PetCareGuide): GuideSeason | null {
  const matchedSeason = (Object.keys(SEASON_KEYWORDS) as GuideSeason[]).find(season =>
    guideSeasonMatches(guide, season),
  );

  return matchedSeason ?? null;
}

export function getGuideSeasonalityScore(
  guide: PetCareGuide,
  now?: Date,
): number {
  const guideSeason = detectGuideSeason(guide);
  if (!guideSeason) return 0;

  const currentSeason = getCurrentSeason(now);
  if (guideSeason === currentSeason) {
    return guide.category === 'seasonal' ? 130 : 90;
  }

  return guide.category === 'seasonal' ? -80 : -30;
}
