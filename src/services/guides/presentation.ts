import type { ComponentProps } from 'react';
import Feather from 'react-native-vector-icons/Feather';

import { resolveLifeStage } from './agePolicy';
import type {
  GuideAgePolicy,
  GuideCategory,
  GuideContentStatus,
  PetCareGuide,
  PetGuideSpecies,
} from './types';

export function getGuideCategoryLabel(category: GuideCategory): string {
  switch (category) {
    case 'nutrition':
      return '영양';
    case 'health':
      return '건강';
    case 'behavior':
      return '행동';
    case 'daily-care':
      return '일상 돌봄';
    case 'environment':
      return '환경';
    case 'safety':
      return '안전';
    case 'seasonal':
      return '시즌';
    default:
      return '가이드';
  }
}

export function getGuideCategoryIconName(
  category: GuideCategory,
): ComponentProps<typeof Feather>['name'] {
  switch (category) {
    case 'nutrition':
      return 'coffee';
    case 'health':
      return 'heart';
    case 'behavior':
      return 'smile';
    case 'daily-care':
      return 'sun';
    case 'environment':
      return 'home';
    case 'safety':
      return 'shield';
    case 'seasonal':
      return 'cloud';
    default:
      return 'book-open';
  }
}

function getSpeciesLabel(species: PetGuideSpecies): string {
  switch (species) {
    case 'dog':
      return '강아지';
    case 'cat':
      return '고양이';
    case 'other':
      return '기타 반려동물';
    case 'common':
    default:
      return '공통';
  }
}

export function formatGuideTargetSpeciesLabel(
  targetSpecies: ReadonlyArray<PetGuideSpecies>,
): string {
  const unique = Array.from(new Set(targetSpecies));
  if (unique.length === 0) return '공통';
  return unique.map(getSpeciesLabel).join(' · ');
}

export function formatGuideAgePolicyLabel(
  agePolicy: GuideAgePolicy,
): string {
  if (agePolicy.type === 'all') return '전 연령';
  if (agePolicy.type === 'lifeStage') {
    switch (agePolicy.lifeStage) {
      case 'baby':
        return '어린 시기';
      case 'adult':
        return '성장기 이후';
      case 'senior':
        return '노령기';
      default:
        return '연령 맞춤';
    }
  }

  const minLabel =
    agePolicy.minMonths !== null ? `${agePolicy.minMonths}개월 이상` : null;
  const maxLabel =
    agePolicy.maxMonths !== null ? `${agePolicy.maxMonths}개월 이하` : null;
  return [minLabel, maxLabel].filter(Boolean).join(' · ') || '연령 맞춤';
}

export function formatGuideAudienceLabel(guide: PetCareGuide): string {
  return `${formatGuideTargetSpeciesLabel(guide.targetSpecies)} · ${formatGuideAgePolicyLabel(
    guide.agePolicy,
  )}`;
}

export function formatGuideStatusLabel(status: GuideContentStatus): string {
  switch (status) {
    case 'draft':
      return '초안';
    case 'published':
      return '발행';
    case 'archived':
      return '보관';
    default:
      return '상태';
  }
}

export function formatPersonalizationSummary(input: {
  species: Exclude<PetGuideSpecies, 'common'> | null;
  ageInMonths: number | null;
}): string {
  const speciesLabel = input.species ? getSpeciesLabel(input.species) : '공통';
  const lifeStage = resolveLifeStage(input.ageInMonths);
  const lifeStageLabel =
    lifeStage === 'baby'
      ? '어린 시기'
      : lifeStage === 'senior'
        ? '노령기'
        : lifeStage === 'adult'
          ? '성장기 이후'
          : '전 연령';

  return `${speciesLabel} · ${lifeStageLabel}`;
}
