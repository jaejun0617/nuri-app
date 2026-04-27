import { resolveLocationDiscoveryThumbnail } from '../src/services/locationDiscovery/thumbnail';

describe('location discovery thumbnail', () => {
  it('animalHospital approved thumbnail은 그대로 사용한다', async () => {
    const thumbnail = await resolveLocationDiscoveryThumbnail({
      id: 'animal-hospital:approved-thumbnail',
      domain: 'animalHospital',
      name: '누리동물병원',
      address: '서울특별시 강남구 테헤란로 10',
      latitude: null,
      longitude: null,
      thumbnailUrl: 'https://cdn.example.com/animal-hospital/nuri.jpg',
    });

    expect(thumbnail).toBe('https://cdn.example.com/animal-hospital/nuri.jpg');
  });

  it('클라이언트는 더 이상 Google Places fallback을 직접 호출하지 않는다', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');

    const thumbnail = await resolveLocationDiscoveryThumbnail({
      id: 'animal-hospital:no-thumbnail',
      domain: 'animalHospital',
      name: '누리동물병원',
      address: '서울특별시 강남구 테헤란로 10',
      latitude: 37.5,
      longitude: 127.03,
      thumbnailUrl: null,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(thumbnail).toBeNull();
  });
});
