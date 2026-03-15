import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  GUIDE_EXPOSURE_HISTORY_LIMIT,
  GUIDE_HOME_CARD_COUNT,
  GUIDE_ROTATION_INTERVAL_HOURS,
} from './config';
import { getAgeInMonthsFromBirthDate, matchesGuideAgePolicy } from './agePolicy';
import { getGuidePersonalizationScore, getGuideSpeciesScore } from './personalization';
import type { GuidePersonalizationContext, PetCareGuide } from './types';

const GUIDE_EXPOSURE_STATE_KEY = 'nuri.guides.exposureState.v1';

type ExposureSnapshot = {
  lastWindowKey: string | null;
  lastGuideIds: string[];
  recentGuideIds: string[];
  recentCategories: string[];
};

type ExposureState = Record<string, ExposureSnapshot>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function normalizeExposureSnapshot(value: unknown): ExposureSnapshot {
  if (!isRecord(value)) {
    return {
      lastWindowKey: null,
      lastGuideIds: [],
      recentGuideIds: [],
      recentCategories: [],
    };
  }

  return {
    lastWindowKey:
      typeof value.lastWindowKey === 'string' ? value.lastWindowKey : null,
    lastGuideIds: normalizeStringArray(value.lastGuideIds),
    recentGuideIds: normalizeStringArray(value.recentGuideIds),
    recentCategories: normalizeStringArray(value.recentCategories),
  };
}

async function loadExposureState(): Promise<ExposureState> {
  const raw = await AsyncStorage.getItem(GUIDE_EXPOSURE_STATE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return {};

    return Object.entries(parsed).reduce<ExposureState>((acc, [key, value]) => {
      acc[key] = normalizeExposureSnapshot(value);
      return acc;
    }, {});
  } catch {
    return {};
  }
}

async function saveExposureState(next: ExposureState): Promise<void> {
  await AsyncStorage.setItem(GUIDE_EXPOSURE_STATE_KEY, JSON.stringify(next));
}

function getContextKey(context: GuidePersonalizationContext): string {
  return [
    context.userId ?? 'guest',
    context.petId ?? 'no-pet',
    context.species ?? 'no-species',
    context.speciesDetailKey ?? 'no-detail',
    context.speciesDisplayName ?? 'no-display',
    context.birthDate ?? 'no-birth',
    context.deathDate ?? 'no-death',
  ].join(':');
}

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 2147483647;
  }

  return Math.abs(hash);
}

export function getGuideRotationWindowKey(
  now = new Date(),
  intervalHours = GUIDE_ROTATION_INTERVAL_HOURS,
): string {
  const bucketMs = Math.max(1, intervalHours) * 60 * 60 * 1000;
  return String(Math.floor(now.getTime() / bucketMs));
}

function guideSupportsSpecies(
  guide: PetCareGuide,
  context: Pick<
    GuidePersonalizationContext,
    'species' | 'speciesDetailKey' | 'speciesDisplayName'
  >,
): boolean {
  return getGuideSpeciesScore(guide, context) > 0;
}

function rankGuide(
  guide: PetCareGuide,
  context: GuidePersonalizationContext,
  seed: string,
  recentGuideIds: string[],
  recentCategories: string[],
): number {
  const recentPenalty = recentGuideIds.includes(guide.id) ? -160 : 0;
  const recentCategoryPenalty = recentCategories.includes(guide.category) ? -70 : 0;
  const rotationRank =
    hashString(`${seed}:${guide.id}`) % Math.max(1, guide.rotationWeight * 997);

  return (
    getGuidePersonalizationScore(guide, context) +
    recentPenalty -
    recentCategoryPenalty -
    rotationRank
  );
}

function sortGuides(
  guides: PetCareGuide[],
  context: GuidePersonalizationContext,
  seed: string,
  recentGuideIds: string[],
): PetCareGuide[] {
  return [...guides].sort((left, right) => {
    const scoreDiff =
      rankGuide(right, context, seed, recentGuideIds, []) -
      rankGuide(left, context, seed, recentGuideIds, []);
    if (scoreDiff !== 0) return scoreDiff;

    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }

    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.id.localeCompare(right.id);
  });
}

function isCommonOnlyGuide(guide: PetCareGuide): boolean {
  return guide.targetSpecies.length === 1 && guide.targetSpecies.includes('common');
}

function pickGuideWithCategoryDiversity(
  guides: ReadonlyArray<PetCareGuide>,
  usedGuideIds: Set<string>,
  usedCategories: Set<string>,
): PetCareGuide | null {
  const unseenCategoryGuide =
    guides.find(
      guide =>
        !usedGuideIds.has(guide.id) && !usedCategories.has(guide.category),
    ) ?? null;

  if (unseenCategoryGuide) return unseenCategoryGuide;

  return guides.find(guide => !usedGuideIds.has(guide.id)) ?? null;
}

function pickUniqueGuides(
  base: PetCareGuide[],
  append: PetCareGuide[],
  count: number,
): PetCareGuide[] {
  const seen = new Set(base.map(item => item.id));
  const next = [...base];

  for (const guide of append) {
    if (seen.has(guide.id)) continue;
    next.push(guide);
    seen.add(guide.id);
    if (next.length >= count) break;
  }

  return next;
}

export async function pickHomeGuideRecommendations(
  guides: ReadonlyArray<PetCareGuide>,
  context: GuidePersonalizationContext,
): Promise<PetCareGuide[]> {
  const activeGuides = guides.filter(guide => guide.isActive);
  const now = context.now ?? new Date();
  const windowKey = getGuideRotationWindowKey(now);
  const contextKey = getContextKey(context);
  const exposureState = await loadExposureState();
  const snapshot = exposureState[contextKey] ?? {
    lastWindowKey: null,
    lastGuideIds: [],
    recentGuideIds: [],
    recentCategories: [],
  };

  if (snapshot.lastWindowKey === windowKey && snapshot.lastGuideIds.length > 0) {
    const stableGuides = snapshot.lastGuideIds
      .map(id => activeGuides.find(guide => guide.id === id) ?? null)
      .filter((guide): guide is PetCareGuide => Boolean(guide));

    if (stableGuides.length >= GUIDE_HOME_CARD_COUNT) {
      return stableGuides.slice(0, GUIDE_HOME_CARD_COUNT);
    }
  }

  const ageInMonths = getAgeInMonthsFromBirthDate(context.birthDate, now);
  const strictCandidates = activeGuides.filter(
    guide =>
      guideSupportsSpecies(guide, context) &&
      matchesGuideAgePolicy(guide.agePolicy, ageInMonths),
  );
  const speciesCandidates = activeGuides.filter(guide =>
    guideSupportsSpecies(guide, context),
  );
  const commonFallbackCandidates = activeGuides.filter(guide =>
    guide.targetSpecies.includes('common'),
  );

  const seed = `${contextKey}:${windowKey}`;
  const recentGuideIds = snapshot.recentGuideIds.slice(0, GUIDE_EXPOSURE_HISTORY_LIMIT);
  const recentCategories = snapshot.recentCategories.slice(0, GUIDE_EXPOSURE_HISTORY_LIMIT);

  const strictSorted = [...strictCandidates].sort((left, right) => {
    const scoreDiff =
      rankGuide(right, context, seed, recentGuideIds, recentCategories) -
      rankGuide(left, context, seed, recentGuideIds, recentCategories);
    if (scoreDiff !== 0) return scoreDiff;
    return right.priority - left.priority;
  });
  const speciesSorted = [...speciesCandidates].sort((left, right) => {
    const scoreDiff =
      rankGuide(right, context, seed, recentGuideIds, recentCategories) -
      rankGuide(left, context, seed, recentGuideIds, recentCategories);
    if (scoreDiff !== 0) return scoreDiff;
    return right.priority - left.priority;
  });
  const commonSorted = [...commonFallbackCandidates].sort((left, right) => {
    const scoreDiff =
      rankGuide(right, context, seed, recentGuideIds, recentCategories) -
      rankGuide(left, context, seed, recentGuideIds, recentCategories);
    if (scoreDiff !== 0) return scoreDiff;
    return right.priority - left.priority;
  });

  const recommendations: PetCareGuide[] = [];
  const usedGuideIds = new Set<string>();
  const usedCategories = new Set<string>();

  const bestSpeciesGuide = pickGuideWithCategoryDiversity(
    strictSorted.filter(guide => !isCommonOnlyGuide(guide)),
    usedGuideIds,
    usedCategories,
  );
  if (bestSpeciesGuide) {
    recommendations.push(bestSpeciesGuide);
    usedGuideIds.add(bestSpeciesGuide.id);
    usedCategories.add(bestSpeciesGuide.category);
  }

  if (GUIDE_HOME_CARD_COUNT >= 2) {
    const bestCommonGuide = pickGuideWithCategoryDiversity(
      commonSorted,
      usedGuideIds,
      usedCategories,
    );
    if (bestCommonGuide) {
      recommendations.push(bestCommonGuide);
      usedGuideIds.add(bestCommonGuide.id);
      usedCategories.add(bestCommonGuide.category);
    }
  }

  let nextRecommendations = pickUniqueGuides(
    recommendations,
    strictSorted,
    GUIDE_HOME_CARD_COUNT,
  );
  nextRecommendations = pickUniqueGuides(
    nextRecommendations,
    speciesSorted,
    GUIDE_HOME_CARD_COUNT,
  );
  nextRecommendations = pickUniqueGuides(
    nextRecommendations,
    commonSorted,
    GUIDE_HOME_CARD_COUNT,
  );

  if (nextRecommendations.length < GUIDE_HOME_CARD_COUNT) {
    nextRecommendations = pickUniqueGuides(
      nextRecommendations,
      sortGuides(activeGuides, context, seed, recentGuideIds),
      GUIDE_HOME_CARD_COUNT,
    );
  }

  const selectedIds = nextRecommendations
    .slice(0, GUIDE_HOME_CARD_COUNT)
    .map(guide => guide.id);
  const selectedCategories = nextRecommendations
    .slice(0, GUIDE_HOME_CARD_COUNT)
    .map(guide => guide.category);
  const nextRecentGuideIds = Array.from(
    new Set([...selectedIds, ...snapshot.recentGuideIds]),
  ).slice(0, GUIDE_EXPOSURE_HISTORY_LIMIT);
  const nextRecentCategories = Array.from(
    new Set([...selectedCategories, ...snapshot.recentCategories]),
  ).slice(0, GUIDE_EXPOSURE_HISTORY_LIMIT);

  exposureState[contextKey] = {
    lastWindowKey: windowKey,
    lastGuideIds: selectedIds,
    recentGuideIds: nextRecentGuideIds,
    recentCategories: nextRecentCategories,
  };
  await saveExposureState(exposureState);

  return nextRecommendations.slice(0, GUIDE_HOME_CARD_COUNT);
}
