import { supabase } from './client';
import type { PetTravelUserReportType } from '../petTravel/types';

export type PetPlaceOwnReportStatus =
  | 'pet-friendly'
  | 'not-pet-friendly'
  | 'policy-changed'
  | 'unknown';

export type PetPlaceUserLayerRecord = {
  targetId: string;
  bookmarkId: string | null;
  bookmarkedAt: string | null;
  isBookmarked: boolean;
  ownReportId: string | null;
  ownReportStatus: PetPlaceOwnReportStatus | null;
  ownReportUpdatedAt: string | null;
};

export type PetTravelUserLayerRecord = {
  targetId: string;
  ownReportId: string | null;
  ownReportType: PetTravelUserReportType | null;
  ownReportStatus: 'submitted' | 'reviewed' | 'dismissed' | null;
  ownReportUpdatedAt: string | null;
};

export type SearchLogDomain = 'pet-friendly-place' | 'pet-travel';

type PetPlaceBookmarkRow = {
  id: string;
  pet_place_meta_id: string;
  created_at: string;
};

type PetPlaceUserReportRow = {
  id: string;
  pet_place_meta_id: string;
  report_status: string;
  updated_at: string;
  created_at: string;
};

type PetTravelUserReportRow = {
  id: string;
  place_id: string;
  report_type: string;
  report_status: string;
  updated_at: string;
  created_at: string;
};

const VALID_PET_PLACE_REPORT_STATUSES = new Set<PetPlaceOwnReportStatus>([
  'pet-friendly',
  'not-pet-friendly',
  'policy-changed',
  'unknown',
]);
const VALID_PET_TRAVEL_REPORT_TYPES = new Set<PetTravelUserReportType>([
  'pet_allowed',
  'pet_restricted',
  'info_outdated',
]);
const VALID_PET_TRAVEL_REPORT_STATUSES = new Set<
  'submitted' | 'reviewed' | 'dismissed'
>(['submitted', 'reviewed', 'dismissed']);

function normalizeString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }

  return user?.id ?? null;
}

export async function loadCurrentPetPlaceUserLayerRecords(): Promise<
  Map<string, PetPlaceUserLayerRecord>
> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return new Map();
  }

  const [{ data: bookmarkRows, error: bookmarkError }, { data: reportRows, error: reportError }] =
    await Promise.all([
      supabase
        .from('pet_place_bookmarks')
        .select('id, pet_place_meta_id, created_at')
        .eq('user_id', userId),
      supabase
        .from('pet_place_user_reports')
        .select('id, pet_place_meta_id, report_status, updated_at, created_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
    ]);

  if (bookmarkError) {
    throw bookmarkError;
  }
  if (reportError) {
    throw reportError;
  }

  const records = new Map<string, PetPlaceUserLayerRecord>();

  (bookmarkRows ?? []).forEach(rawRow => {
    const row = rawRow as PetPlaceBookmarkRow;
    const targetId = normalizeString(row.pet_place_meta_id);
    if (!targetId) {
      return;
    }

    records.set(targetId, {
      targetId,
      bookmarkId: row.id,
      bookmarkedAt: row.created_at,
      isBookmarked: true,
      ownReportId: null,
      ownReportStatus: null,
      ownReportUpdatedAt: null,
    });
  });

  (reportRows ?? []).forEach(rawRow => {
    const row = rawRow as PetPlaceUserReportRow;
    const targetId = normalizeString(row.pet_place_meta_id);
    const reportStatus = normalizeString(row.report_status);
    if (
      !targetId ||
      !reportStatus ||
      !VALID_PET_PLACE_REPORT_STATUSES.has(reportStatus as PetPlaceOwnReportStatus)
    ) {
      return;
    }

    const current =
      records.get(targetId) ??
      ({
        targetId,
        bookmarkId: null,
        bookmarkedAt: null,
        isBookmarked: false,
        ownReportId: null,
        ownReportStatus: null,
        ownReportUpdatedAt: null,
      } satisfies PetPlaceUserLayerRecord);

    if (current.ownReportId) {
      return;
    }

    records.set(targetId, {
      ...current,
      ownReportId: row.id,
      ownReportStatus: reportStatus as PetPlaceOwnReportStatus,
      ownReportUpdatedAt: row.updated_at ?? row.created_at,
    });
  });

  return records;
}

export async function setPetPlaceBookmark(
  targetId: string,
  shouldBookmark: boolean,
): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('로그인 후 저장 상태를 관리할 수 있어요.');
  }

  if (shouldBookmark) {
    const { error } = await supabase.from('pet_place_bookmarks').upsert(
      {
        user_id: userId,
        pet_place_meta_id: targetId,
      },
      {
        onConflict: 'user_id,pet_place_meta_id',
        ignoreDuplicates: false,
      },
    );

    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await supabase
    .from('pet_place_bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('pet_place_meta_id', targetId);

  if (error) {
    throw error;
  }
}

export async function upsertPetPlaceUserReport(input: {
  targetId: string;
  reportStatus: PetPlaceOwnReportStatus;
}): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('로그인 후 제보를 남길 수 있어요.');
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('pet_place_user_reports')
    .select('id')
    .eq('user_id', userId)
    .eq('pet_place_meta_id', input.targetId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  const existingId = normalizeString(existingRows?.[0]?.id as string | undefined);
  if (existingId) {
    const { error } = await supabase
      .from('pet_place_user_reports')
      .update({
        report_status: input.reportStatus,
      })
      .eq('id', existingId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await supabase.from('pet_place_user_reports').insert({
    user_id: userId,
    pet_place_meta_id: input.targetId,
    report_status: input.reportStatus,
  });

  if (error) {
    throw error;
  }
}

export async function loadCurrentPetTravelUserLayerRecords(): Promise<
  Map<string, PetTravelUserLayerRecord>
> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return new Map();
  }

  const { data: reportRows, error } = await supabase
    .from('pet_travel_user_reports')
    .select('id, place_id, report_type, report_status, updated_at, created_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  const records = new Map<string, PetTravelUserLayerRecord>();

  (reportRows ?? []).forEach(rawRow => {
    const row = rawRow as PetTravelUserReportRow;
    const targetId = normalizeString(row.place_id);
    const reportType = normalizeString(row.report_type);
    const reportStatus = normalizeString(row.report_status);
    if (
      !targetId ||
      !reportType ||
      !reportStatus ||
      !VALID_PET_TRAVEL_REPORT_TYPES.has(reportType as PetTravelUserReportType) ||
      !VALID_PET_TRAVEL_REPORT_STATUSES.has(
        reportStatus as 'submitted' | 'reviewed' | 'dismissed',
      )
    ) {
      return;
    }

    if (records.has(targetId)) {
      return;
    }

    records.set(targetId, {
      targetId,
      ownReportId: row.id,
      ownReportType: reportType as PetTravelUserReportType,
      ownReportStatus: reportStatus as 'submitted' | 'reviewed' | 'dismissed',
      ownReportUpdatedAt: row.updated_at ?? row.created_at,
    });
  });

  return records;
}

export async function upsertPetTravelUserReport(input: {
  targetId: string;
  reportType: PetTravelUserReportType;
}): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('로그인 후 제보를 남길 수 있어요.');
  }

  const { error } = await supabase.from('pet_travel_user_reports').upsert(
    {
      place_id: input.targetId,
      user_id: userId,
      report_type: input.reportType,
      report_status: 'submitted',
      evidence_payload: {},
    },
    {
      onConflict: 'place_id,user_id,report_type',
      ignoreDuplicates: false,
    },
  );

  if (error) {
    throw error;
  }
}

export async function recordUserSearchLog(input: {
  sourceDomain: SearchLogDomain;
  queryText: string;
  anchorLatitude?: number | null;
  anchorLongitude?: number | null;
  resultCount: number;
  providerMix: string[];
}): Promise<void> {
  const normalizedQuery = normalizeString(input.queryText);
  const userId = await getCurrentUserId();
  if (!userId || !normalizedQuery) {
    return;
  }

  const { error } = await supabase.from('pet_place_search_logs').insert({
    user_id: userId,
    query_text: normalizedQuery,
    source_domain: input.sourceDomain,
    anchor_latitude: input.anchorLatitude ?? null,
    anchor_longitude: input.anchorLongitude ?? null,
    result_count: Math.max(0, input.resultCount),
    provider_mix: input.providerMix,
  });

  if (error) {
    throw error;
  }
}
