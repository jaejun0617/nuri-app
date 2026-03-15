import { supabase } from './client';
import type {
  GuideAgePolicy,
  GuideContentStatus,
  GuideEventContext,
  GuideCategory,
  GuideSearchKeyword,
  PetCareGuide,
  PetCareGuideAdminUpsertInput,
  PetGuideSpecies,
} from '../guides/types';

type GuideSummaryRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body_preview: string;
  category: string;
  tags: string[] | null;
  target_species: string[] | null;
  species_keywords: string[] | null;
  search_keywords: string[] | null;
  age_policy_type: 'all' | 'lifeStage' | 'ageRange';
  age_policy_life_stage: 'baby' | 'adult' | 'senior' | null;
  age_policy_min_months: number | null;
  age_policy_max_months: number | null;
  status: GuideContentStatus;
  is_active: boolean;
  priority: number | null;
  sort_order: number | null;
  rotation_weight: number | null;
  thumbnail_image_url: string | null;
  cover_image_url: string | null;
  image_alt: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type GuideDetailRow = GuideSummaryRow & {
  body: string;
};

type GuidePopularSearchRow = {
  keyword: string;
  search_count: number | null;
  source: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isGuideSummaryRow(value: unknown): value is GuideSummaryRow {
  return isRecord(value) && typeof value.id === 'string' && typeof value.title === 'string';
}

function toGuideSummaryRows(data: unknown): GuideSummaryRow[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isGuideSummaryRow);
}

function isGuideDetailRow(value: unknown): value is GuideDetailRow {
  if (!isGuideSummaryRow(value) || !isRecord(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.body === 'string';
}

function isGuidePopularSearchRow(value: unknown): value is GuidePopularSearchRow {
  return (
    isRecord(value) &&
    typeof value.keyword === 'string' &&
    ('search_count' in value ? typeof value.search_count === 'number' || value.search_count === null : true)
  );
}

function toGuidePopularSearchRows(data: unknown): GuidePopularSearchRow[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isGuidePopularSearchRow);
}

function toGuideCategory(value: string): GuideCategory {
  return (
    value === 'nutrition' ||
    value === 'health' ||
    value === 'behavior' ||
    value === 'daily-care' ||
    value === 'environment' ||
    value === 'safety' ||
    value === 'seasonal'
      ? value
      : 'daily-care'
  );
}

function toGuideSpecies(values: string[] | null): ReadonlyArray<PetGuideSpecies> {
  if (!Array.isArray(values)) return ['common'];
  const normalized = values.filter(
    value => value === 'dog' || value === 'cat' || value === 'other' || value === 'common',
  ) as PetGuideSpecies[];
  return normalized.length > 0 ? normalized : ['common'];
}

function toGuideAgePolicy(row: GuideSummaryRow): GuideAgePolicy {
  if (row.age_policy_type === 'lifeStage' && row.age_policy_life_stage) {
    return {
      type: 'lifeStage',
      lifeStage: row.age_policy_life_stage,
      minMonths: null,
      maxMonths: null,
    };
  }
  if (row.age_policy_type === 'ageRange') {
    return {
      type: 'ageRange',
      lifeStage: null,
      minMonths: row.age_policy_min_months ?? null,
      maxMonths: row.age_policy_max_months ?? null,
    };
  }
  return {
    type: 'all',
    lifeStage: null,
    minMonths: null,
    maxMonths: null,
  };
}

function normalizeStringArray(value: string[] | null | undefined): ReadonlyArray<string> {
  if (!Array.isArray(value)) return [];
  return value.map(item => `${item}`.trim()).filter(Boolean);
}

function mapRowToGuide(row: GuideSummaryRow | GuideDetailRow): PetCareGuide {
  const sourceUri = row.cover_image_url?.trim() || null;
  const thumbnailUri = row.thumbnail_image_url?.trim() || null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: 'body' in row ? row.body : null,
    bodyPreview: row.body_preview,
    category: toGuideCategory(row.category),
    tags: normalizeStringArray(row.tags),
    targetSpecies: toGuideSpecies(row.target_species),
    speciesKeywords: normalizeStringArray(row.species_keywords),
    searchKeywords: normalizeStringArray(row.search_keywords),
    agePolicy: toGuideAgePolicy(row),
    status: row.status,
    isActive: row.is_active,
    sortOrder: row.sort_order ?? 0,
    priority: row.priority ?? 0,
    rotationWeight: row.rotation_weight ?? 1,
    image:
      sourceUri || thumbnailUri || row.image_alt
        ? {
            thumbnailUri,
            sourceUri,
            alt: row.image_alt?.trim() || null,
          }
        : null,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const GUIDE_SUMMARY_COLUMNS = [
  'id',
  'slug',
  'title',
  'summary',
  'body_preview',
  'category',
  'tags',
  'target_species',
  'species_keywords',
  'search_keywords',
  'age_policy_type',
  'age_policy_life_stage',
  'age_policy_min_months',
  'age_policy_max_months',
  'status',
  'is_active',
  'priority',
  'sort_order',
  'rotation_weight',
  'thumbnail_image_url',
  'cover_image_url',
  'image_alt',
  'published_at',
  'created_at',
  'updated_at',
].join(',');

function toAdminUpsertPayload(input: PetCareGuideAdminUpsertInput) {
  const nowIso = new Date().toISOString();
  const normalizedStatus: GuideContentStatus = input.status;
  const publishedAt =
    normalizedStatus === 'published' ? (input.publishedAt ?? nowIso) : null;

  return {
    id: input.id?.trim() || undefined,
    slug: input.slug.trim(),
    title: input.title.trim(),
    summary: input.summary.trim(),
    body: input.body.trim(),
    body_preview: input.bodyPreview.trim(),
    category: input.category,
    tags: [...input.tags],
    target_species: [...input.targetSpecies],
    species_keywords: [...input.speciesKeywords],
    search_keywords: [...input.searchKeywords],
    age_policy_type: input.agePolicy.type,
    age_policy_life_stage:
      input.agePolicy.type === 'lifeStage' ? input.agePolicy.lifeStage : null,
    age_policy_min_months:
      input.agePolicy.type === 'ageRange' ? input.agePolicy.minMonths : null,
    age_policy_max_months:
      input.agePolicy.type === 'ageRange' ? input.agePolicy.maxMonths : null,
    status: normalizedStatus,
    is_active: input.isActive,
    priority: input.priority,
    sort_order: input.sortOrder,
    rotation_weight: input.rotationWeight,
    thumbnail_image_url: input.thumbnailImageUrl?.trim() || null,
    cover_image_url: input.coverImageUrl?.trim() || null,
    image_alt: input.imageAlt?.trim() || null,
    published_at: publishedAt,
    archived_at: normalizedStatus === 'archived' ? nowIso : null,
  };
}

export async function fetchPublishedPetCareGuideCatalog(): Promise<PetCareGuide[]> {
  const { data, error } = await supabase
    .from('pet_care_guides')
    .select(GUIDE_SUMMARY_COLUMNS)
    .is('deleted_at', null)
    .eq('is_active', true)
    .eq('status', 'published')
    .order('priority', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('published_at', { ascending: false, nullsFirst: false });

  if (error) throw error;

  return toGuideSummaryRows(data).map(mapRowToGuide);
}

export async function searchPublishedPetCareGuidesRpc(input: {
  query: string;
  species: Exclude<PetGuideSpecies, 'common'> | null;
  ageInMonths: number | null;
  limit: number;
}): Promise<PetCareGuide[]> {
  const normalizedQuery = input.query.trim();
  if (!normalizedQuery) return [];

  const { data, error } = await supabase.rpc('search_pet_care_guides', {
    p_query: normalizedQuery,
    p_species_group: input.species,
    p_age_in_months: input.ageInMonths,
    p_limit: input.limit,
  });

  if (error) throw error;

  return toGuideSummaryRows(data).map(mapRowToGuide);
}

export async function fetchPopularPetCareGuideSearchesRpc(input: {
  species: Exclude<PetGuideSpecies, 'common'> | null;
  limit: number;
}): Promise<GuideSearchKeyword[]> {
  const { data, error } = await supabase.rpc(
    'get_pet_care_guide_popular_searches',
    {
      p_species_group: input.species,
      p_limit: input.limit,
    },
  );

  if (error) throw error;

  return toGuidePopularSearchRows(data)
    .map(row => ({
      keyword: row.keyword.trim(),
      score: Number(row.search_count ?? 0),
      source:
        row.source === 'event'
          ? ('events' as const)
          : ('catalog' as const),
    }))
    .filter(item => item.keyword.length > 0);
}

export async function fetchManagedPetCareGuideCatalog(): Promise<PetCareGuide[]> {
  const { data, error } = await supabase
    .from('pet_care_guides')
    .select(GUIDE_SUMMARY_COLUMNS)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .order('priority', { ascending: false })
    .order('sort_order', { ascending: true });

  if (error) throw error;

  return toGuideSummaryRows(data).map(mapRowToGuide);
}

export async function fetchPublishedPetCareGuideDetail(
  guideId: string,
): Promise<PetCareGuide | null> {
  const { data, error } = await supabase
    .from('pet_care_guides')
    .select(`${GUIDE_SUMMARY_COLUMNS},body`)
    .eq('id', guideId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw error;
  if (!data || !isGuideDetailRow(data)) return null;
  return mapRowToGuide(data);
}

export async function fetchManagedPetCareGuideDetail(
  guideId: string,
): Promise<PetCareGuide | null> {
  const { data, error } = await supabase
    .from('pet_care_guides')
    .select(`${GUIDE_SUMMARY_COLUMNS},body`)
    .eq('id', guideId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  if (!data || !isGuideDetailRow(data)) return null;
  return mapRowToGuide(data);
}

export async function upsertManagedPetCareGuide(
  input: PetCareGuideAdminUpsertInput,
): Promise<PetCareGuide> {
  const payload = toAdminUpsertPayload(input);
  const { data, error } = await supabase
    .from('pet_care_guides')
    .upsert(payload, { onConflict: 'id' })
    .select(`${GUIDE_SUMMARY_COLUMNS},body`)
    .single();

  if (error) throw error;
  if (!isGuideDetailRow(data)) {
    throw new Error('가이드 저장 결과를 확인하지 못했어요.');
  }

  return mapRowToGuide(data);
}

export async function insertPetCareGuideEvents(
  events: ReadonlyArray<GuideEventContext>,
): Promise<void> {
  if (events.length === 0) return;

  const payload = events
    .filter(event => event.userId && event.guideId)
    .map(event => ({
      user_id: event.userId,
      pet_id: event.petId,
      guide_id: event.guideId,
      event_type: event.eventType,
      placement: event.placement,
      rotation_window_key: event.rotationWindowKey ?? null,
      search_query: event.searchQuery ?? null,
      context_species_group: event.contextSpeciesGroup ?? null,
      context_species_detail_key: event.contextSpeciesDetailKey ?? null,
      context_age_in_months: event.contextAgeInMonths ?? null,
      metadata: event.metadata ?? {},
    }));

  if (payload.length === 0) return;

  const { error } = await supabase.from('pet_care_guide_events').insert(payload);
  if (error) throw error;
}
