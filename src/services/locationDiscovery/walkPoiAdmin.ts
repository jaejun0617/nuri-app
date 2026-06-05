// 파일: src/services/locationDiscovery/walkPoiAdmin.ts
// 파일 목적:
// - V1.1 walk POI admin read-only RPC 응답을 앱 운영 화면 모델로 정규화한다.
// 어디서 쓰이는지:
// - WalkPoiAdminReadOnlyScreen에서 import/review/audit/coverage 상태를 읽는다.
// 핵심 역할:
// - raw payload와 provider 내부값을 앱 화면에 기대하지 않고, 공개 가능한 운영 요약 필드만 소비한다.
import { supabase } from '../supabase/client';

export type WalkPoiAdminStatusCounts = {
  pending: number;
  approved: number;
  rejected: number;
  held: number;
};

export type WalkPoiAdminProjectionCounts = {
  publicActiveApproved: number;
  hiddenPending: number;
  hiddenRejected: number;
  hiddenHeld: number;
};

export type WalkPoiAdminCoverageRegion = {
  id: string;
  label: string;
  center: {
    latitude: number;
    longitude: number;
  };
  radiusMeters: number;
};

export type WalkPoiAdminCoverageSummary = {
  approvedTotalCount: number;
  approvedWithin3Km: number;
  approvedWithin5Km: number;
  gateReady: boolean;
  nextBatchRegion: string;
  thresholds: {
    approvedWithin3Km: number;
    approvedWithin5Km: number;
    searchHitRatePercent: number;
    nearbyEmptyRateMaxPercent: number;
    fallbackRateMaxPercent: number;
    rpcErrorRateMaxPercent: number;
    publicLeakCount: number;
  };
};

export type WalkPoiAdminSourceProviderCount = {
  sourceProvider: string;
  approvedCount: number;
};

export type WalkPoiAdminImportBatch = {
  id: string;
  sourceProvider: string;
  importMode: string;
  importStatus: string;
  sourceName: string | null;
  summary: {
    requestedCount: number;
    createdCount: number;
    duplicateCount: number;
    conflictCount: number;
    skippedCount: number;
    reviewCount: number;
  };
  createdAt: string | null;
  finishedAt: string | null;
};

export type WalkPoiAdminReviewQueueItem = {
  walkPoiId: string;
  name: string;
  categoryLabel: string;
  address: string | null;
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'held';
  visibilityStatus: string;
  lifecycleStatus: string;
  sourceProvider: string;
  externalSourceId: string | null;
  createdAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
};

export type WalkPoiAdminAuditLogItem = {
  id: number;
  walkPoiId: string | null;
  name: string | null;
  actionType: string;
  note: string | null;
  createdAt: string | null;
};

export type WalkPoiAdminFallbackGate = {
  enabled: boolean;
  limitedRegionId: string;
  limitedRegionLabel: string;
  blockedReason: string;
  allowedReasons: string[];
  kakaoLocalRuntimeDeleted: boolean;
  nextCoverageRegion: string;
};

export type WalkPoiAdminReadSummary = {
  generatedAt: string | null;
  coverageRegion: WalkPoiAdminCoverageRegion;
  coverageSummary: WalkPoiAdminCoverageSummary;
  canonicalStatusCounts: WalkPoiAdminStatusCounts;
  publicProjectionCounts: WalkPoiAdminProjectionCounts;
  sourceProviderCounts: WalkPoiAdminSourceProviderCount[];
  recentImportBatches: WalkPoiAdminImportBatch[];
  recentReviewQueue: WalkPoiAdminReviewQueueItem[];
  recentAuditLogs: WalkPoiAdminAuditLogItem[];
  fallbackGate: WalkPoiAdminFallbackGate;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
}

function readRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = record[key];
  return isRecord(value) ? value : {};
}

function readArray<T>(
  record: Record<string, unknown>,
  key: string,
  mapper: (value: unknown) => T | null,
): T[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(mapper).filter((item): item is T => item !== null);
}

function readStringArray(
  record: Record<string, unknown>,
  key: string,
): string[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function mapStatusCounts(value: unknown): WalkPoiAdminStatusCounts {
  const record = isRecord(value) ? value : {};
  return {
    pending: readNumber(record, 'pending'),
    approved: readNumber(record, 'approved'),
    rejected: readNumber(record, 'rejected'),
    held: readNumber(record, 'held'),
  };
}

function mapProjectionCounts(value: unknown): WalkPoiAdminProjectionCounts {
  const record = isRecord(value) ? value : {};
  return {
    publicActiveApproved: readNumber(record, 'publicActiveApproved'),
    hiddenPending: readNumber(record, 'hiddenPending'),
    hiddenRejected: readNumber(record, 'hiddenRejected'),
    hiddenHeld: readNumber(record, 'hiddenHeld'),
  };
}

function mapCoverageRegion(value: unknown): WalkPoiAdminCoverageRegion {
  const record = isRecord(value) ? value : {};
  const center = readRecord(record, 'center');
  return {
    id: readString(record, 'id') ?? 'unknown',
    label: readString(record, 'label') ?? '지역 기준 미확인',
    center: {
      latitude: readNumber(center, 'latitude'),
      longitude: readNumber(center, 'longitude'),
    },
    radiusMeters: readNumber(record, 'radiusMeters'),
  };
}

function mapCoverageSummary(value: unknown): WalkPoiAdminCoverageSummary {
  const record = isRecord(value) ? value : {};
  const thresholds = readRecord(record, 'thresholds');
  return {
    approvedTotalCount: readNumber(record, 'approvedTotalCount'),
    approvedWithin3Km: readNumber(record, 'approvedWithin3Km'),
    approvedWithin5Km: readNumber(record, 'approvedWithin5Km'),
    gateReady: readBoolean(record, 'gateReady'),
    nextBatchRegion: readString(record, 'nextBatchRegion') ?? '고양시 전체',
    thresholds: {
      approvedWithin3Km: readNumber(thresholds, 'approvedWithin3Km'),
      approvedWithin5Km: readNumber(thresholds, 'approvedWithin5Km'),
      searchHitRatePercent: readNumber(thresholds, 'searchHitRatePercent'),
      nearbyEmptyRateMaxPercent: readNumber(
        thresholds,
        'nearbyEmptyRateMaxPercent',
      ),
      fallbackRateMaxPercent: readNumber(thresholds, 'fallbackRateMaxPercent'),
      rpcErrorRateMaxPercent: readNumber(thresholds, 'rpcErrorRateMaxPercent'),
      publicLeakCount: readNumber(thresholds, 'publicLeakCount'),
    },
  };
}

function mapSourceProviderCount(
  value: unknown,
): WalkPoiAdminSourceProviderCount | null {
  if (!isRecord(value)) {
    return null;
  }

  const sourceProvider = readString(value, 'sourceProvider');
  if (!sourceProvider) {
    return null;
  }

  return {
    sourceProvider,
    approvedCount: readNumber(value, 'approvedCount'),
  };
}

function mapImportBatch(value: unknown): WalkPoiAdminImportBatch | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value, 'id');
  const sourceProvider = readString(value, 'sourceProvider');
  if (!id || !sourceProvider) {
    return null;
  }

  const summary = readRecord(value, 'summary');
  return {
    id,
    sourceProvider,
    importMode: readString(value, 'importMode') ?? 'unknown',
    importStatus: readString(value, 'importStatus') ?? 'unknown',
    sourceName: readString(value, 'sourceName'),
    summary: {
      requestedCount: readNumber(summary, 'requestedCount'),
      createdCount: readNumber(summary, 'createdCount'),
      duplicateCount: readNumber(summary, 'duplicateCount'),
      conflictCount: readNumber(summary, 'conflictCount'),
      skippedCount: readNumber(summary, 'skippedCount'),
      reviewCount: readNumber(summary, 'reviewCount'),
    },
    createdAt: readString(value, 'createdAt'),
    finishedAt: readString(value, 'finishedAt'),
  };
}

function normalizeReviewStatus(
  value: string | null,
): WalkPoiAdminReviewQueueItem['reviewStatus'] {
  if (
    value === 'pending' ||
    value === 'approved' ||
    value === 'rejected' ||
    value === 'held'
  ) {
    return value;
  }

  return 'pending';
}

function mapReviewQueueItem(
  value: unknown,
): WalkPoiAdminReviewQueueItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const walkPoiId = readString(value, 'walkPoiId');
  const name = readString(value, 'name');
  if (!walkPoiId || !name) {
    return null;
  }

  return {
    walkPoiId,
    name,
    categoryLabel: readString(value, 'categoryLabel') ?? '산책 장소',
    address: readString(value, 'address'),
    reviewStatus: normalizeReviewStatus(readString(value, 'reviewStatus')),
    visibilityStatus: readString(value, 'visibilityStatus') ?? 'unknown',
    lifecycleStatus: readString(value, 'lifecycleStatus') ?? 'unknown',
    sourceProvider: readString(value, 'sourceProvider') ?? 'unknown',
    externalSourceId: readString(value, 'externalSourceId'),
    createdAt: readString(value, 'createdAt'),
    reviewedAt: readString(value, 'reviewedAt'),
    reviewNote: readString(value, 'reviewNote'),
  };
}

function mapAuditLogItem(value: unknown): WalkPoiAdminAuditLogItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const actionType = readString(value, 'actionType');
  if (!actionType) {
    return null;
  }

  return {
    id: readNumber(value, 'id'),
    walkPoiId: readString(value, 'walkPoiId'),
    name: readString(value, 'name'),
    actionType,
    note: readString(value, 'note'),
    createdAt: readString(value, 'createdAt'),
  };
}

function mapFallbackGate(value: unknown): WalkPoiAdminFallbackGate {
  const record = isRecord(value) ? value : {};
  return {
    enabled: readBoolean(record, 'enabled'),
    limitedRegionId: readString(record, 'limitedRegionId') ?? 'unknown',
    limitedRegionLabel: readString(record, 'limitedRegionLabel') ?? '미확인',
    blockedReason: readString(record, 'blockedReason') ?? 'poi_empty',
    allowedReasons: readStringArray(record, 'allowedReasons'),
    kakaoLocalRuntimeDeleted: readBoolean(record, 'kakaoLocalRuntimeDeleted'),
    nextCoverageRegion:
      readString(record, 'nextCoverageRegion') ?? '고양시 전체',
  };
}

export function mapWalkPoiAdminReadSummary(
  value: unknown,
): WalkPoiAdminReadSummary {
  if (!isRecord(value)) {
    throw new Error('walk_poi_admin_summary_invalid_response');
  }

  return {
    generatedAt: readString(value, 'generatedAt'),
    coverageRegion: mapCoverageRegion(value.coverageRegion),
    coverageSummary: mapCoverageSummary(value.coverageSummary),
    canonicalStatusCounts: mapStatusCounts(value.canonicalStatusCounts),
    publicProjectionCounts: mapProjectionCounts(value.publicProjectionCounts),
    sourceProviderCounts: readArray(
      value,
      'sourceProviderCounts',
      mapSourceProviderCount,
    ),
    recentImportBatches: readArray(
      value,
      'recentImportBatches',
      mapImportBatch,
    ),
    recentReviewQueue: readArray(
      value,
      'recentReviewQueue',
      mapReviewQueueItem,
    ),
    recentAuditLogs: readArray(value, 'recentAuditLogs', mapAuditLogItem),
    fallbackGate: mapFallbackGate(value.fallbackGate),
  };
}

export async function fetchWalkPoiAdminReadSummary(): Promise<WalkPoiAdminReadSummary> {
  const { data, error } = await supabase.rpc('walk_poi_admin_read_summary_v1');

  if (error) {
    throw error;
  }

  return mapWalkPoiAdminReadSummary(data);
}
