import { resolveLocationDiscoveryThumbnail } from '../src/services/locationDiscovery/thumbnail';

describe('locationDiscovery thumbnail policy', () => {
  it('동물병원은 검증된 thumbnailUrl 없이는 외부 사진 검색을 호출하지 않는다', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const result = await resolveLocationDiscoveryThumbnail({
        id: 'animal-hospital-thumbnail-policy',
        domain: 'animalHospital',
        name: '누리동물병원',
        address: '경기 고양시 일산서구 일산로 539',
        latitude: 37.68,
        longitude: 126.77,
        thumbnailUrl: null,
      });

      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('검증된 http thumbnailUrl은 동물병원에서도 그대로 사용한다', async () => {
    const result = await resolveLocationDiscoveryThumbnail({
      id: 'animal-hospital-verified-thumbnail',
      domain: 'animalHospital',
      name: '누리동물병원',
      address: '경기 고양시 일산서구 일산로 539',
      latitude: 37.68,
      longitude: 126.77,
      thumbnailUrl: 'https://cdn.example.com/animal-hospital/nuri.jpg',
    });

    expect(result).toBe('https://cdn.example.com/animal-hospital/nuri.jpg');
  });
});
