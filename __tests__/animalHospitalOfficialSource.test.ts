import { normalizeLocaldataAnimalHospitalRow } from '../src/services/animalHospital/officialSource';
import { mapOfficialAnimalHospitalSourceToCanonical } from '../src/services/animalHospital/service';

describe('animalHospital official source normalization', () => {
  it('Localdata row를 official ingest contract로 정규화하고 canonical로 변환한다', () => {
    const normalized = normalizeLocaldataAnimalHospitalRow({
      row: {
        개방서비스아이디: 'LD-001',
        사업장명: '누리동물병원',
        도로명전체주소: '서울특별시 강남구 테헤란로 10',
        소재지전체주소: '서울특별시 강남구 역삼동 10-1',
        영업상태명: '영업/정상',
        소재지전화: '02-555-0101',
        위도: '37.4999',
        경도: '127.0333',
        데이터기준일자: '2026-04-16',
      },
      snapshot: {
        provider: 'official-localdata',
        fetchedAt: '2026-04-17T09:00:00.000Z',
        snapshotId: 'official-localdata:2026-04-17',
        ingestMode: 'snapshot',
        defaultSourceUpdatedAt: null,
      },
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.input.providerRecordId).toBe('LD-001');
    expect(normalized?.input.rowChecksum).toMatch(/^ah_/);

    const mapped = mapOfficialAnimalHospitalSourceToCanonical(normalized!.input);

    expect(mapped.officialSourceKey).toBe('official-localdata:ld-001');
    expect(mapped.sourceRecord.normalizedName).toBe('누리동물병원');
    expect(mapped.canonicalHospital.canonicalName).toBe('누리동물병원');
    expect(mapped.canonicalHospital.lifecycle.isActive).toBe(true);
    expect(mapped.canonicalHospital.searchTokens.normalizedAddress).toBe(
      '서울특별시 강남구 테헤란로 10',
    );
  });
});
