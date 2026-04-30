import type { SupabaseClient } from '@supabase/supabase-js';

import { createAnimalHospitalSupabasePersistence } from '../src/services/supabase/animalHospitals';

type RpcResult = {
  data: ReadonlyArray<Record<string, unknown>> | null;
  error: unknown | null;
};

type QueryResult = {
  data: ReadonlyArray<Record<string, unknown>> | null;
  error: unknown | null;
};

type QueryBuilderMock = {
  select: jest.Mock<QueryBuilderMock, [string]>;
  eq: jest.Mock<QueryBuilderMock, [string, unknown]>;
  gte: jest.Mock<QueryBuilderMock, [string, unknown]>;
  lte: jest.Mock<QueryBuilderMock, [string, unknown]>;
  or: jest.Mock<QueryBuilderMock, [string]>;
  order: jest.Mock<QueryBuilderMock, [string, { ascending: boolean }]>;
  limit: jest.Mock<Promise<QueryResult>, [number]>;
};

function createRpcHospitalRow(input: {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
}) {
  return {
    id: input.id,
    official_source_key: `official:${input.id}`,
    primary_source_provider: 'official-localdata',
    primary_source_record_id: input.id,
    canonical_name: input.name,
    normalized_name: input.name.replace(/\s+/g, '').toLowerCase(),
    primary_address: '경기 고양시 일산서구 중앙로 1',
    road_address: '경기 고양시 일산서구 중앙로 1',
    lot_address: '경기 고양시 일산서구 대화동 1',
    normalized_primary_address: '경기고양시일산서구중앙로1',
    latitude: input.latitude,
    longitude: input.longitude,
    coordinate_source: 'official-wgs84',
    coordinate_normalization_status: 'exact',
    status_code: 'operating',
    status_summary: '영업/정상',
    license_status_text: '정상',
    operation_status_text: '영업/정상',
    official_phone: null,
    normalized_phone: null,
    public_trust_status: 'needs_verification',
    freshness_status: 'fresh',
    requires_verification: true,
    has_source_conflict: false,
    source_updated_at: '2026-04-18T00:00:00.000Z',
    canonical_updated_at: '2026-04-18T08:00:00.000Z',
    reviewed_at: null,
    is_active: true,
    is_hidden: false,
    lifecycle_note: null,
    provider_place_id: null,
    provider_place_url: null,
    distance_meters: input.distanceMeters,
  };
}

function createSupabaseClientMock(rows: ReadonlyArray<Record<string, unknown>>) {
  const rpc = jest.fn<Promise<RpcResult>, [string, Record<string, unknown>]>(
    async () => ({
      data: rows,
      error: null,
    }),
  );
  const from = jest.fn(() => {
    throw new Error('legacy query should not be called when RPC succeeds');
  });
  const client = { rpc, from } as unknown as SupabaseClient;

  return { client, rpc, from };
}

function createFallbackSupabaseClientMock(
  rows: ReadonlyArray<Record<string, unknown>>,
) {
  const rpc = jest.fn<Promise<RpcResult>, [string, Record<string, unknown>]>(
    async () => ({
      data: null,
      error: { code: 'PGRST202', message: 'function not found' },
    }),
  );
  let queryBuilder: QueryBuilderMock;
  queryBuilder = {
    select: jest.fn<QueryBuilderMock, [string]>(() => queryBuilder),
    eq: jest.fn<QueryBuilderMock, [string, unknown]>(() => queryBuilder),
    gte: jest.fn<QueryBuilderMock, [string, unknown]>(() => queryBuilder),
    lte: jest.fn<QueryBuilderMock, [string, unknown]>(() => queryBuilder),
    or: jest.fn<QueryBuilderMock, [string]>(() => queryBuilder),
    order: jest.fn<QueryBuilderMock, [string, { ascending: boolean }]>(
      () => queryBuilder,
    ),
    limit: jest.fn<Promise<QueryResult>, [number]>(async () => ({
      data: rows,
      error: null,
    })),
  };
  const from = jest.fn(() => queryBuilder);
  const client = { rpc, from } as unknown as SupabaseClient;

  return { client, rpc, from, queryBuilder };
}

describe('animalHospital Supabase public search repository', () => {
  it('RPC 반환 row를 기존 canonical mapping으로 연결하고 RPC 정렬 순서를 유지한다', async () => {
    const nearRow = createRpcHospitalRow({
      id: 'hospital-near',
      name: '가까운동물병원',
      latitude: 37.6801,
      longitude: 126.7701,
      distanceMeters: 120,
    });
    const farRow = createRpcHospitalRow({
      id: 'hospital-far',
      name: '먼동물병원',
      latitude: 37.7,
      longitude: 126.79,
      distanceMeters: 3000,
    });
    const { client, rpc, from } = createSupabaseClientMock([nearRow, farRow]);
    const repository = createAnimalHospitalSupabasePersistence(client);

    const result = await repository.search({
      query: null,
      coordinates: {
        latitude: 37.68,
        longitude: 126.77,
      },
      radiusMeters: 5000,
      useNearbySearch: true,
    });

    expect(rpc).toHaveBeenCalledWith('animal_hospital_public_search_v1', {
      p_query: null,
      p_anchor_lat: 37.68,
      p_anchor_lng: 126.77,
      p_use_nearby: true,
      p_radius_meters: 5000,
      p_limit: 40,
      p_open24_hours_only: false,
      p_exotic_animal_care_only: false,
    });
    expect(from).not.toHaveBeenCalled();
    expect(result.map(item => item.id)).toEqual([
      'hospital-near',
      'hospital-far',
    ]);
    expect(result[0]?.canonicalName).toBe('가까운동물병원');
    expect(result[0]?.coordinates.latitude).toBe(37.6801);
    expect(result[0]?.lifecycle.isActive).toBe(true);
  });

  it('RPC missing이면 legacy REST fallback을 호출한다', async () => {
    const fallbackRow = createRpcHospitalRow({
      id: 'hospital-fallback',
      name: '폴백동물병원',
      latitude: 37.6802,
      longitude: 126.7702,
      distanceMeters: 180,
    });
    const { client, rpc, from, queryBuilder } =
      createFallbackSupabaseClientMock([fallbackRow]);
    const repository = createAnimalHospitalSupabasePersistence(client);

    const result = await repository.search({
      query: '폴백',
      coordinates: {
        latitude: 37.68,
        longitude: 126.77,
      },
      radiusMeters: 5000,
      useNearbySearch: false,
    });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('animal_hospitals');
    expect(queryBuilder.select).toHaveBeenCalled();
    expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
    expect(queryBuilder.eq).toHaveBeenCalledWith('is_hidden', false);
    expect(queryBuilder.gte).not.toHaveBeenCalled();
    expect(queryBuilder.lte).not.toHaveBeenCalled();
    expect(queryBuilder.or).toHaveBeenCalledWith(
      'canonical_name.ilike.%폴백%,primary_address.ilike.%폴백%',
    );
    expect(queryBuilder.limit).toHaveBeenCalledWith(40);
    expect(result.map(item => item.id)).toEqual(['hospital-fallback']);
  });
});
