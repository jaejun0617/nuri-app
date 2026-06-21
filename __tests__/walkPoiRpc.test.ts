import { searchWalkPoiLocations } from '../src/services/locationDiscovery/walkPoiRpc';
import type { LocationDiscoverySearchInput } from '../src/services/locationDiscovery/types';

jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

const { supabase } = jest.requireMock('../src/services/supabase/client') as {
  supabase: {
    rpc: jest.Mock<Promise<{ data: unknown; error: null }>, [string, unknown]>;
  };
};

const SEARCH_INPUT: LocationDiscoverySearchInput = {
  query: null,
  scope: {
    displayLabel: '통영 강구안',
    queryLabel: null,
    anchorCoordinates: {
      latitude: 34.842,
      longitude: 128.423,
      accuracy: 20,
      capturedAt: 1_777_000_000_000,
      source: 'gps',
    },
    distanceLabel: '현재 위치 기준',
  },
};

describe('walk POI public RPC mapper', () => {
  beforeEach(() => {
    supabase.rpc.mockReset();
  });

  it('public description의 기술 용어를 사용자 화면용 한글 문구로 정규화한다', async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          id: '3d9bf997-1f07-48ea-b9e7-03f1a4c8598b',
          name: '미수해안로 산책로',
          category: 'waterside',
          category_label: '해안 산책로',
          description: 'V1.1 통영 권역의 운영자 검수 POI seed입니다.',
          address: '경상남도 통영시 항남동',
          road_address: '경상남도 통영시 강구안길 일대',
          latitude: 34.84285,
          longitude: 128.42325,
          distance_meters: 97,
          source_attribution: '누리 운영자 검수 자료',
          public_trust_status: 'approved',
          reviewed_at: '2026-06-20T21:53:59.002787+00:00',
          updated_at: '2026-06-20T21:53:59.002787+00:00',
          quality_score: 79,
        },
      ],
      error: null,
    });

    const [item] = await searchWalkPoiLocations(SEARCH_INPUT);

    expect(item?.description).toBe(
      '운영 검수 통영 권역의 운영자 검수 장소 데이터 자료입니다.',
    );
    expect(item?.description).not.toMatch(/\b(seed|POI|V1\.1)\b/i);
  });
});
