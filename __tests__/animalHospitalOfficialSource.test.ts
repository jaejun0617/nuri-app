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

  it('공식 CSV의 EPSG:5174 좌표는 위경도로 확정하지 않고 변환 필요 상태로 남긴다', () => {
    const normalized = normalizeLocaldataAnimalHospitalRow({
      row: {
        개방자치단체코드: '3000000',
        관리번호: '300000001020130001',
        사업장명: '효자동물병원',
        도로명주소: '서울특별시 종로구 자하문로 66-2 (효자동)',
        지번주소: '서울특별시 종로구 효자동 31',
        영업상태명: '휴업',
        상세영업상태명: '휴업',
        전화번호: '',
        '좌표정보(X)': '197364.614476836',
        '좌표정보(Y)': '453303.293915738',
        데이터갱신시점: '2025-12-15 16:15:28',
      },
      snapshot: {
        provider: 'official-localdata',
        fetchedAt: '2026-04-18T08:00:00.000Z',
        snapshotId: 'official-localdata:2026-04-18',
        ingestMode: 'snapshot',
        defaultSourceUpdatedAt: null,
      },
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.input.providerRecordId).toBe(
      '3000000:300000001020130001',
    );
    expect(normalized?.input.coordinates).toMatchObject({
      latitude: null,
      longitude: null,
      x5174: 197364.614476836,
      y5174: 453303.293915738,
      crs: 'EPSG:5174',
    });

    const mapped = mapOfficialAnimalHospitalSourceToCanonical(normalized!.input);

    expect(mapped.canonicalHospital.coordinates.latitude).toBeNull();
    expect(mapped.canonicalHospital.coordinates.longitude).toBeNull();
    expect(mapped.canonicalHospital.coordinates.source).toBe(
      'epsg5174-pending',
    );
    expect(mapped.canonicalHospital.coordinates.normalizationStatus).toBe(
      'conversion-required',
    );
    expect(mapped.canonicalHospital.trust.hasSourceConflict).toBe(true);
    expect(mapped.canonicalHospital.lifecycle.isActive).toBe(false);
  });
});
