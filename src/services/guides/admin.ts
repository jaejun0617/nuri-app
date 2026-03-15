import type {
  GuideAgePolicy,
  GuideCategory,
  GuideContentStatus,
  GuideLifeStage,
  PetCareGuide,
  PetCareGuideAdminUpsertInput,
  PetGuideSpecies,
} from './types';

export type GuideAdminFormValues = {
  id: string | null;
  slug: string;
  title: string;
  summary: string;
  bodyPreview: string;
  body: string;
  category: GuideCategory;
  tagsText: string;
  searchKeywordsText: string;
  speciesKeywordsText: string;
  targetSpecies: ReadonlyArray<PetGuideSpecies>;
  agePolicyType: GuideAgePolicy['type'];
  agePolicyLifeStage: GuideLifeStage;
  agePolicyMinMonths: string;
  agePolicyMaxMonths: string;
  status: GuideContentStatus;
  isActive: boolean;
  priority: string;
  sortOrder: string;
  rotationWeight: string;
  thumbnailImageUrl: string;
  coverImageUrl: string;
  imageAlt: string;
  publishedAt: string | null;
};

export const GUIDE_CATEGORY_OPTIONS: ReadonlyArray<GuideCategory> = [
  'nutrition',
  'health',
  'behavior',
  'daily-care',
  'environment',
  'safety',
  'seasonal',
];

export const GUIDE_STATUS_OPTIONS: ReadonlyArray<GuideContentStatus> = [
  'draft',
  'published',
  'archived',
];

export const GUIDE_TARGET_SPECIES_OPTIONS: ReadonlyArray<PetGuideSpecies> = [
  'dog',
  'cat',
  'other',
  'common',
];

export const GUIDE_LIFE_STAGE_OPTIONS: ReadonlyArray<GuideLifeStage> = [
  'baby',
  'adult',
  'senior',
];

function normalizeCsvText(value: string): string[] {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function toNumberString(value: number): string {
  return Number.isFinite(value) ? String(value) : '0';
}

export function buildGuideSlug(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || `guide-${Date.now()}`;
}

export function createEmptyGuideAdminFormValues(): GuideAdminFormValues {
  return {
    id: null,
    slug: '',
    title: '',
    summary: '',
    bodyPreview: '',
    body: '',
    category: 'daily-care',
    tagsText: '',
    searchKeywordsText: '',
    speciesKeywordsText: '',
    targetSpecies: ['common'],
    agePolicyType: 'all',
    agePolicyLifeStage: 'adult',
    agePolicyMinMonths: '',
    agePolicyMaxMonths: '',
    status: 'draft',
    isActive: true,
    priority: '0',
    sortOrder: '0',
    rotationWeight: '1',
    thumbnailImageUrl: '',
    coverImageUrl: '',
    imageAlt: '',
    publishedAt: null,
  };
}

export function mapGuideToAdminFormValues(
  guide: PetCareGuide,
): GuideAdminFormValues {
  return {
    id: guide.id,
    slug: guide.slug,
    title: guide.title,
    summary: guide.summary,
    bodyPreview: guide.bodyPreview,
    body: guide.body ?? '',
    category: guide.category,
    tagsText: guide.tags.join(', '),
    searchKeywordsText: guide.searchKeywords.join(', '),
    speciesKeywordsText: guide.speciesKeywords.join(', '),
    targetSpecies: [...guide.targetSpecies],
    agePolicyType: guide.agePolicy.type,
    agePolicyLifeStage: guide.agePolicy.lifeStage ?? 'adult',
    agePolicyMinMonths:
      guide.agePolicy.minMonths !== null ? String(guide.agePolicy.minMonths) : '',
    agePolicyMaxMonths:
      guide.agePolicy.maxMonths !== null ? String(guide.agePolicy.maxMonths) : '',
    status: guide.status,
    isActive: guide.isActive,
    priority: toNumberString(guide.priority),
    sortOrder: toNumberString(guide.sortOrder),
    rotationWeight: toNumberString(guide.rotationWeight),
    thumbnailImageUrl: guide.image?.thumbnailUri ?? '',
    coverImageUrl: guide.image?.sourceUri ?? '',
    imageAlt: guide.image?.alt ?? '',
    publishedAt: guide.publishedAt,
  };
}

function toNullableInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildAgePolicy(values: GuideAdminFormValues): GuideAgePolicy {
  if (values.agePolicyType === 'lifeStage') {
    return {
      type: 'lifeStage',
      lifeStage: values.agePolicyLifeStage,
      minMonths: null,
      maxMonths: null,
    };
  }

  if (values.agePolicyType === 'ageRange') {
    return {
      type: 'ageRange',
      lifeStage: null,
      minMonths: toNullableInteger(values.agePolicyMinMonths),
      maxMonths: toNullableInteger(values.agePolicyMaxMonths),
    };
  }

  return {
    type: 'all',
    lifeStage: null,
    minMonths: null,
    maxMonths: null,
  };
}

export function validateGuideAdminFormValues(
  values: GuideAdminFormValues,
): string | null {
  if (!values.title.trim()) return '제목을 입력해 주세요.';
  if (!values.summary.trim()) return '요약을 입력해 주세요.';
  if (!values.bodyPreview.trim()) return '본문 미리보기를 입력해 주세요.';
  if (!values.body.trim()) return '본문을 입력해 주세요.';
  if (!values.slug.trim()) return '슬러그를 확인해 주세요.';
  if (values.targetSpecies.length === 0) return '대상 종을 한 개 이상 선택해 주세요.';

  if (values.agePolicyType === 'ageRange') {
    const minMonths = toNullableInteger(values.agePolicyMinMonths);
    const maxMonths = toNullableInteger(values.agePolicyMaxMonths);

    if (minMonths === null && maxMonths === null) {
      return '연령 범위를 쓰려면 최소 또는 최대 개월 수를 입력해 주세요.';
    }
    if (
      minMonths !== null &&
      maxMonths !== null &&
      minMonths > maxMonths
    ) {
      return '연령 범위의 최소값이 최대값보다 클 수 없어요.';
    }
  }

  return null;
}

export function buildGuideAdminUpsertInput(
  values: GuideAdminFormValues,
): PetCareGuideAdminUpsertInput {
  const agePolicy = buildAgePolicy(values);

  return {
    id: values.id,
    slug: values.slug.trim(),
    title: values.title.trim(),
    summary: values.summary.trim(),
    bodyPreview: values.bodyPreview.trim(),
    body: values.body.trim(),
    category: values.category,
    tags: normalizeCsvText(values.tagsText),
    searchKeywords: normalizeCsvText(values.searchKeywordsText),
    speciesKeywords: normalizeCsvText(values.speciesKeywordsText),
    targetSpecies: [...values.targetSpecies],
    agePolicy,
    status: values.status,
    isActive: values.isActive,
    priority: Number.parseInt(values.priority.trim() || '0', 10) || 0,
    sortOrder: Number.parseInt(values.sortOrder.trim() || '0', 10) || 0,
    rotationWeight:
      Math.max(1, Number.parseInt(values.rotationWeight.trim() || '1', 10)) || 1,
    thumbnailImageUrl: values.thumbnailImageUrl.trim() || null,
    coverImageUrl: values.coverImageUrl.trim() || null,
    imageAlt: values.imageAlt.trim() || null,
    publishedAt: values.publishedAt,
  };
}
