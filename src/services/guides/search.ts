import { getGuideCategoryLabel, formatGuideTargetSpeciesLabel } from './presentation';
import type { PetCareGuide } from './types';

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function tokenize(query: string): string[] {
  return normalizeText(query)
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean);
}

function buildSearchCorpus(guide: PetCareGuide): string[] {
  return [
    guide.title,
    guide.summary,
    guide.bodyPreview,
    getGuideCategoryLabel(guide.category),
    formatGuideTargetSpeciesLabel(guide.targetSpecies),
    ...guide.tags,
    ...guide.searchKeywords,
    ...guide.speciesKeywords,
  ]
    .map(normalizeText)
    .filter(Boolean);
}

function scoreTokenMatch(guide: PetCareGuide, token: string): number {
  const title = normalizeText(guide.title);
  const summary = normalizeText(guide.summary);
  const bodyPreview = normalizeText(guide.bodyPreview);
  const category = normalizeText(getGuideCategoryLabel(guide.category));
  const targetSpecies = normalizeText(formatGuideTargetSpeciesLabel(guide.targetSpecies));
  const tags = guide.tags.map(normalizeText);
  const keywords = [...guide.searchKeywords, ...guide.speciesKeywords].map(normalizeText);

  let score = 0;

  if (title.includes(token)) score += 9;
  if (summary.includes(token)) score += 6;
  if (bodyPreview.includes(token)) score += 4;
  if (category.includes(token)) score += 5;
  if (targetSpecies.includes(token)) score += 5;
  if (tags.some(tag => tag.includes(token))) score += 7;
  if (keywords.some(keyword => keyword.includes(token))) score += 7;

  return score;
}

export function searchPetCareGuides(
  guides: ReadonlyArray<PetCareGuide>,
  query: string,
): PetCareGuide[] {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [...guides];

  const tokens = tokenize(normalizedQuery);
  if (tokens.length === 0) return [...guides];

  return [...guides]
    .map(guide => {
      const corpus = buildSearchCorpus(guide);
      const matchesAllTokens = tokens.every(token =>
        corpus.some(field => field.includes(token)),
      );
      if (!matchesAllTokens) return null;

      const score = tokens.reduce(
        (acc, token) => acc + scoreTokenMatch(guide, token),
        0,
      );
      return { guide, score };
    })
    .filter((entry): entry is { guide: PetCareGuide; score: number } => Boolean(entry))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.guide.priority !== left.guide.priority) {
        return right.guide.priority - left.guide.priority;
      }
      if (left.guide.sortOrder !== right.guide.sortOrder) {
        return left.guide.sortOrder - right.guide.sortOrder;
      }
      return right.guide.updatedAt.localeCompare(left.guide.updatedAt);
    })
    .map(entry => entry.guide);
}

