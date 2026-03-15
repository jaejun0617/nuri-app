import type { PetSpeciesGroup } from '../pets/species';

export type PetGuideSpecies = PetSpeciesGroup | 'common';

export type GuideCategory =
  | 'nutrition'
  | 'health'
  | 'behavior'
  | 'daily-care'
  | 'environment'
  | 'safety'
  | 'seasonal';

export type GuideLifeStage = 'baby' | 'adult' | 'senior';
export type GuideContentStatus = 'draft' | 'published' | 'archived';
export type GuideEventType = 'home_impression' | 'list_click' | 'detail_view';
export type GuideEventPlacement =
  | 'logged-in-home'
  | 'guide-list'
  | 'guide-detail';
export type GuideSearchSource = 'rpc' | 'fallback';
export type GuideSearchKeywordSource = 'events' | 'catalog';

export type GuideAgePolicy =
  | {
      type: 'all';
      lifeStage: null;
      minMonths: null;
      maxMonths: null;
    }
  | {
      type: 'lifeStage';
      lifeStage: GuideLifeStage;
      minMonths: null;
      maxMonths: null;
    }
  | {
      type: 'ageRange';
      lifeStage: null;
      minMonths: number | null;
      maxMonths: number | null;
    };

export type GuideImage = {
  thumbnailUri: string | null;
  sourceUri: string | null;
  alt: string | null;
} | null;

export type PetCareGuide = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string | null;
  bodyPreview: string;
  category: GuideCategory;
  tags: ReadonlyArray<string>;
  targetSpecies: ReadonlyArray<PetGuideSpecies>;
  speciesKeywords: ReadonlyArray<string>;
  searchKeywords: ReadonlyArray<string>;
  agePolicy: GuideAgePolicy;
  status: GuideContentStatus;
  isActive: boolean;
  sortOrder: number;
  priority: number;
  rotationWeight: number;
  image: GuideImage;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PetCareGuideAdminUpsertInput = {
  id?: string | null;
  slug: string;
  title: string;
  summary: string;
  body: string;
  bodyPreview: string;
  category: GuideCategory;
  tags: ReadonlyArray<string>;
  targetSpecies: ReadonlyArray<PetGuideSpecies>;
  speciesKeywords: ReadonlyArray<string>;
  searchKeywords: ReadonlyArray<string>;
  agePolicy: GuideAgePolicy;
  status: GuideContentStatus;
  isActive: boolean;
  priority: number;
  sortOrder: number;
  rotationWeight: number;
  thumbnailImageUrl?: string | null;
  coverImageUrl?: string | null;
  imageAlt?: string | null;
  publishedAt?: string | null;
};

export type GuidePersonalizationContext = {
  userId: string | null;
  petId: string | null;
  species: PetSpeciesGroup | null;
  speciesDetailKey?: string | null;
  speciesDisplayName?: string | null;
  birthDate: string | null;
  deathDate?: string | null;
  now?: Date;
};

export type GuideEventContext = {
  userId: string | null;
  petId: string | null;
  guideId: string;
  eventType: GuideEventType;
  placement: GuideEventPlacement;
  rotationWindowKey?: string | null;
  searchQuery?: string | null;
  contextSpeciesGroup?: PetSpeciesGroup | null;
  contextSpeciesDetailKey?: string | null;
  contextAgeInMonths?: number | null;
  metadata?: Record<string, unknown>;
};

export type GuideSearchContext = {
  query: string;
  species: PetSpeciesGroup | null;
  ageInMonths: number | null;
  limit?: number;
};

export type GuideSearchKeyword = {
  keyword: string;
  score: number;
  source: GuideSearchKeywordSource;
};

export type GuideSearchResponse = {
  guides: PetCareGuide[];
  source: GuideSearchSource;
};
