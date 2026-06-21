// 파일: src/services/locationDiscovery/walkPoiRpc.ts
// 파일 목적:
// - V1.1 자체 산책 POI public RPC 결과를 기존 location discovery 카드 모델로 안전하게 변환한다.
// 어디서 쓰이는지:
// - 산책/location discovery 리스트와 상세 화면에서 Kakao Local fallback보다 앞선 read path로 사용된다.
// 핵심 역할:
// - public RPC 반환 필드만 소비하고, source/import/review/audit 내부 필드는 앱에 노출하지 않는다.
// - RPC 실패 또는 결과 0건일 때 기존 provider fallback이 동작할 수 있도록 빈 배열/nullable 결과로 닫는다.
import { supabase } from '../supabase/client';
import {
  buildTrustBasisDateLabel,
  getPublicTrustLabelText,
  isTrustDateStale,
} from '../trust/publicTrust';
import { buildStaticMapPreviewUrl } from './maps';
import type {
  LocationDiscoveryItem,
  LocationDiscoverySearchInput,
} from './types';

const WALK_POI_RPC_TIMEOUT_MS = 12000;
const WALK_POI_DEFAULT_LIMIT = 8;
const WALK_POI_NEARBY_RADIUS_METERS = 5500;
const WALK_POI_SEARCH_RADIUS_METERS = 20000;

function parseBooleanFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

export const ENABLE_WALK_POI_RPC = parseBooleanFlag(
  process.env.EXPO_PUBLIC_ENABLE_WALK_POI_RPC,
  true,
);

type WalkPoiPublicRpcRow = {
  id: string;
  name: string;
  category: string | null;
  category_label: string | null;
  description: string | null;
  address: string | null;
  road_address: string | null;
  latitude: number;
  longitude: number;
  distance_meters: number | null;
  source_attribution: string | null;
  public_trust_status: string | null;
  reviewed_at: string | null;
  updated_at: string | null;
  quality_score: number | null;
};

type WalkPoiDetailInput = {
  currentDistanceMeters: number | null;
  currentDistanceLabel: string;
};

type RpcErrorLike = {
  message?: string;
  code?: string;
  details?: string;
};

type RpcResult = {
  data: unknown;
  error: RpcErrorLike | null;
};

function normalizeQuery(value: string | null | undefined): string | null {
  const normalized = (value ?? '').trim().replace(/\s+/g, ' ');
  return normalized || null;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(
  record: Record<string, unknown>,
  key: keyof WalkPoiPublicRpcRow,
): string | null {
  const value = record[key];
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function readNumber(
  record: Record<string, unknown>,
  key: keyof WalkPoiPublicRpcRow,
): number | null {
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

  return null;
}

function toWalkPoiPublicRpcRow(value: unknown): WalkPoiPublicRpcRow | null {
  if (!isObjectRecord(value)) {
    return null;
  }

  const id = readString(value, 'id');
  const name = readString(value, 'name');
  const latitude = readNumber(value, 'latitude');
  const longitude = readNumber(value, 'longitude');
  if (!id || !name || latitude === null || longitude === null) {
    return null;
  }

  return {
    id,
    name,
    category: readString(value, 'category'),
    category_label: readString(value, 'category_label'),
    description: readString(value, 'description'),
    address: readString(value, 'address'),
    road_address: readString(value, 'road_address'),
    latitude,
    longitude,
    distance_meters: readNumber(value, 'distance_meters'),
    source_attribution: readString(value, 'source_attribution'),
    public_trust_status: readString(value, 'public_trust_status'),
    reviewed_at: readString(value, 'reviewed_at'),
    updated_at: readString(value, 'updated_at'),
    quality_score: readNumber(value, 'quality_score'),
  };
}

function toRows(value: unknown): WalkPoiPublicRpcRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(toWalkPoiPublicRpcRow)
    .filter((row): row is WalkPoiPublicRpcRow => row !== null);
}

function toRpcResult(value: unknown): RpcResult {
  if (!isObjectRecord(value)) {
    return {
      data: null,
      error: { message: 'walk_poi_rpc_invalid_response' },
    };
  }

  const errorValue = value.error;
  const error = isObjectRecord(errorValue)
    ? {
        message:
          typeof errorValue.message === 'string'
            ? errorValue.message
            : undefined,
        code: typeof errorValue.code === 'string' ? errorValue.code : undefined,
        details:
          typeof errorValue.details === 'string'
            ? errorValue.details
            : undefined,
      }
    : null;

  return {
    data: value.data,
    error,
  };
}

function buildRpcError(error: RpcErrorLike): Error {
  return new Error(error.message ?? error.code ?? 'walk_poi_rpc_error');
}

function withTimeout<T>(
  task: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(label));
    }, timeoutMs);
  });

  return Promise.race([task, timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

function estimateWalkMinutes(distanceMeters: number | null): number | null {
  if (distanceMeters === null) return null;
  const routeDistance = distanceMeters * 1.6;
  return Math.max(15, Math.min(90, Math.round(routeDistance / 70)));
}

function formatCoordinateLabel(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function buildDescription(row: WalkPoiPublicRpcRow): string {
  const description = row.description?.trim();
  if (description) {
    return normalizePublicDescription(description);
  }

  const categoryLabel = row.category_label ?? '산책 장소';
  const address = row.road_address ?? row.address;
  if (address) {
    return `${address} 근처에서 ${categoryLabel} 분위기를 느끼며 걷기 좋아요.`;
  }

  return `${categoryLabel}로 운영 검수된 산책 장소예요.`;
}

function normalizePublicDescription(value: string): string {
  return value
    .replace(/\bseed\b/gi, '자료')
    .replace(/\bPOI\b/g, '장소 데이터')
    .replace(/\bV1\.1\b/gi, '운영 검수');
}

function buildWalkPoiItem(
  row: WalkPoiPublicRpcRow,
  options: WalkPoiDetailInput,
): LocationDiscoveryItem {
  const basisDate = row.reviewed_at ?? row.updated_at;
  const distanceMeters = row.distance_meters ?? options.currentDistanceMeters;
  const address = row.address ?? row.road_address ?? '주소 정보 준비 중';
  const attribution = row.source_attribution ?? 'NURI 운영 검수';

  return {
    id: row.id,
    domain: 'walk',
    kind: 'walk-spot',
    name: row.name,
    description: buildDescription(row),
    categoryLabel: row.category_label ?? '산책 장소',
    address,
    roadAddress: row.road_address,
    distanceMeters,
    distanceLabel: options.currentDistanceLabel,
    estimatedMinutes: estimateWalkMinutes(distanceMeters),
    latitude: row.latitude,
    longitude: row.longitude,
    placeUrl: null,
    phone: null,
    operatingStatusLabel: null,
    source: {
      provider: 'walk_poi',
      providerLabel: 'NURI 자체 POI',
      type: 'canonical-poi',
      externalPlaceId: null,
    },
    verification: {
      status: 'admin-verified',
      label: '운영 검수 반영',
      description: 'NURI 자체 POI 기준으로 공개된 산책 장소예요.',
      tone: 'positive',
      sourceLabel: attribution,
      requiresConfirmation: false,
    },
    publicTrust: {
      publicLabel: 'trust_reviewed',
      label: getPublicTrustLabelText('trust_reviewed'),
      shortReason: '운영 검수로 공개 중인 자체 산책 POI예요.',
      description: '앱 공개용 projection에서 승인된 산책 장소만 표시해요.',
      guidance: '현장 상황은 바뀔 수 있으니 방문 전 주변 환경을 확인해 주세요.',
      tone: 'positive',
      sourceLabel: attribution,
      basisDate,
      basisDateLabel: buildTrustBasisDateLabel(basisDate, '검수'),
      isStale: isTrustDateStale(basisDate),
      hasConflict: false,
      layers: ['trust'],
    },
    userLayer: {
      targetId: row.id,
      supportsBookmark: false,
      supportsReport: false,
    },
    petPolicy: {
      summaryLabel: null,
      detail: null,
    },
    thumbnailUrl: null,
    coordinateLabel: formatCoordinateLabel(row.latitude, row.longitude),
    mapPreviewUrl: buildStaticMapPreviewUrl({
      latitude: row.latitude,
      longitude: row.longitude,
    }),
    qualityScore: row.quality_score,
  };
}

async function invokePublicRpc(
  name:
    | 'walk_poi_public_nearby_v1'
    | 'walk_poi_public_search_v1'
    | 'walk_poi_public_detail_v1',
  params: Record<string, string | number | null>,
): Promise<unknown> {
  const result = toRpcResult(
    await withTimeout(
      Promise.resolve(supabase.rpc(name, params)),
      WALK_POI_RPC_TIMEOUT_MS,
      `${name}_timeout`,
    ),
  );

  if (result.error) {
    throw buildRpcError(result.error);
  }

  return result.data;
}

export async function searchWalkPoiLocations(
  input: LocationDiscoverySearchInput,
): Promise<LocationDiscoveryItem[]> {
  if (!ENABLE_WALK_POI_RPC) {
    return [];
  }

  const query = normalizeQuery(input.query);
  const anchor = input.scope.anchorCoordinates;
  const data = query
    ? await invokePublicRpc('walk_poi_public_search_v1', {
        p_query: query,
        p_anchor_lat: anchor?.latitude ?? null,
        p_anchor_lng: anchor?.longitude ?? null,
        p_radius_meters: anchor ? WALK_POI_NEARBY_RADIUS_METERS : WALK_POI_SEARCH_RADIUS_METERS,
        p_limit: WALK_POI_DEFAULT_LIMIT,
        p_bbox_min_lat: null,
        p_bbox_min_lng: null,
        p_bbox_max_lat: null,
        p_bbox_max_lng: null,
      })
    : await invokePublicRpc('walk_poi_public_nearby_v1', {
        p_anchor_lat: anchor?.latitude ?? null,
        p_anchor_lng: anchor?.longitude ?? null,
        p_radius_meters: WALK_POI_NEARBY_RADIUS_METERS,
        p_limit: WALK_POI_DEFAULT_LIMIT,
      });

  return toRows(data).map(row =>
    buildWalkPoiItem(row, {
      currentDistanceMeters: row.distance_meters,
      currentDistanceLabel: input.scope.distanceLabel,
    }),
  );
}

export async function fetchWalkPoiDetailItem(
  item: LocationDiscoveryItem,
): Promise<LocationDiscoveryItem | null> {
  if (item.source.provider !== 'walk_poi') {
    return null;
  }

  const data = await invokePublicRpc('walk_poi_public_detail_v1', {
    p_walk_poi_id: item.id,
  });
  const [row] = toRows(data);
  if (!row) {
    return null;
  }

  return buildWalkPoiItem(row, {
    currentDistanceMeters: item.distanceMeters,
    currentDistanceLabel: item.distanceLabel,
  });
}
