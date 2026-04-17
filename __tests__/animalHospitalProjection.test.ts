import { projectAnimalHospitalPublic } from '../src/domains/animalHospital/projections';
import { mapOfficialAnimalHospitalSourceToCanonical } from '../src/services/animalHospital/service';

describe('animalHospital public projection', () => {
  it('official source 기반 canonical은 safe public subset만 노출한다', () => {
    const canonical = mapOfficialAnimalHospitalSourceToCanonical({
      provider: 'official-localdata',
      providerRecordId: 'official-001',
      sourceUpdatedAt: '2026-04-15T00:00:00.000Z',
      ingestedAt: '2026-04-15T08:00:00.000Z',
      name: '누리동물병원',
      roadAddress: '서울특별시 강남구 테헤란로 10',
      lotAddress: '서울특별시 강남구 역삼동 10-1',
      licenseStatusText: '정상 영업',
      operationStatusText: '영업/정상',
      officialPhone: '02-555-0101',
      coordinates: {
        latitude: 37.4999,
        longitude: 127.0333,
        crs: 'WGS84',
      },
      rawPayload: {
        businessStatus: '영업/정상',
      },
    }).canonicalHospital;

    const projected = projectAnimalHospitalPublic({
      canonical,
      anchorCoordinates: {
        latitude: 37.498,
        longitude: 127.03,
      },
    });

    expect(Object.keys(projected).sort()).toEqual([
      'address',
      'distanceLabel',
      'distanceMeters',
      'id',
      'latitude',
      'links',
      'name',
      'officialPhone',
      'publicTrust',
      'roadAddress',
      'statusSummary',
      'longitude',
    ].sort());
    expect(projected.name).toBe('누리동물병원');
    expect(projected.officialPhone).toBe('02-555-0101');
    expect(projected.links.callUri).toBe('tel:025550101');
    expect(projected.statusSummary).toContain('인허가 기준 운영 병원');
    expect(projected.publicTrust.publicLabel).toBe('needs_verification');
    expect('operatingHours' in projected).toBe(false);
    expect('open24Hours' in projected).toBe(false);
    expect('homepageUrl' in projected).toBe(false);
  });

  it('stale official phone은 public projection에서 숨긴다', () => {
    const canonical = mapOfficialAnimalHospitalSourceToCanonical({
      provider: 'official-localdata',
      providerRecordId: 'official-002',
      sourceUpdatedAt: '2026-02-01T00:00:00.000Z',
      ingestedAt: '2026-02-01T08:00:00.000Z',
      name: '오래된병원',
      roadAddress: '서울특별시 마포구 월드컵북로 1',
      operationStatusText: '영업/정상',
      officialPhone: '02-1234-5678',
      coordinates: {
        latitude: 37.55,
        longitude: 126.91,
        crs: 'WGS84',
      },
    }).canonicalHospital;

    const projected = projectAnimalHospitalPublic({
      canonical,
      anchorCoordinates: null,
    });

    expect(projected.officialPhone).toBeNull();
    expect(projected.links.callUri).toBeNull();
  });
});
