import { createAnimalHospitalRepository } from '../src/services/animalHospital/repository';
import { mapOfficialAnimalHospitalSourceToCanonical } from '../src/services/animalHospital/service';
import type {
  AnimalHospitalCanonicalHospital,
  AnimalHospitalCanonicalUpsertContract,
  AnimalHospitalSourceRecord,
} from '../src/domains/animalHospital/types';

function createInMemoryAdapter() {
  const canonicals = new Map<string, AnimalHospitalCanonicalHospital>();
  const sourceRecords = new Map<string, AnimalHospitalSourceRecord>();
  const changeLogs: Array<Record<string, unknown>> = [];

  return {
    canonicals,
    sourceRecords,
    changeLogs,
    adapter: {
      search: async () => [...canonicals.values()],
      getSourceRecordByKey: async (sourceKey: string) =>
        sourceRecords.get(sourceKey) ?? null,
      upsertCanonical: async (contract: AnimalHospitalCanonicalUpsertContract) => {
        canonicals.set(contract.canonicalHospital.id, contract.canonicalHospital);
        return contract.canonicalHospital;
      },
      upsertSourceRecord: async (contract: AnimalHospitalCanonicalUpsertContract) => {
        sourceRecords.set(contract.sourceRecord.sourceKey, contract.sourceRecord);
        return contract.sourceRecord;
      },
      appendChangeLog: async (input: {
        canonicalId: string;
        sourceId: string;
        changeType: 'inserted' | 'updated' | 'unchanged' | 'failed';
        summary: string;
        payload: Record<string, unknown>;
      }) => {
        changeLogs.push(input);
      },
    },
  };
}

describe('animalHospital canonical repository', () => {
  it('canonical upsert와 source provenance 저장을 함께 수행한다', async () => {
    const memory = createInMemoryAdapter();
    const repository = createAnimalHospitalRepository(memory.adapter);
    const contract = mapOfficialAnimalHospitalSourceToCanonical({
      provider: 'official-localdata',
      providerRecordId: 'official-010',
      sourceUpdatedAt: '2026-04-16T00:00:00.000Z',
      ingestedAt: '2026-04-17T00:00:00.000Z',
      snapshotId: 'official-localdata:2026-04-17',
      snapshotFetchedAt: '2026-04-17T00:00:00.000Z',
      ingestMode: 'snapshot',
      rowChecksum: 'ah_checksum_1',
      name: '누리동물병원',
      roadAddress: '서울특별시 강남구 테헤란로 10',
      operationStatusText: '영업/정상',
      officialPhone: '02-555-0101',
      coordinates: {
        latitude: 37.4999,
        longitude: 127.0333,
        crs: 'WGS84',
      },
      metadata: {
        source: 'localdata',
      },
      rawPayload: {
        source: 'localdata',
      },
    });

    const result = await repository.upsertCanonical(contract);

    expect(result.action).toBe('inserted');
    expect(memory.canonicals.get(contract.canonicalHospital.id)?.canonicalName).toBe(
      '누리동물병원',
    );
    expect(memory.sourceRecords.get(contract.sourceKey)?.snapshotId).toBe(
      'official-localdata:2026-04-17',
    );
    expect(memory.sourceRecords.get(contract.sourceKey)?.rowChecksum).toBe(
      'ah_checksum_1',
    );
    expect(memory.changeLogs[0]?.changeType).toBe('inserted');
  });

  it('동일 checksum 재수집은 unchanged로 요약한다', async () => {
    const memory = createInMemoryAdapter();
    const repository = createAnimalHospitalRepository(memory.adapter);
    const contract = mapOfficialAnimalHospitalSourceToCanonical({
      provider: 'official-localdata',
      providerRecordId: 'official-011',
      sourceUpdatedAt: '2026-04-16T00:00:00.000Z',
      ingestedAt: '2026-04-17T00:00:00.000Z',
      snapshotId: 'official-localdata:2026-04-17',
      snapshotFetchedAt: '2026-04-17T00:00:00.000Z',
      ingestMode: 'snapshot',
      rowChecksum: 'ah_checksum_same',
      name: '리마동물병원',
      roadAddress: '서울특별시 마포구 월드컵북로 1',
      operationStatusText: '영업/정상',
      officialPhone: '02-1111-2222',
      coordinates: {
        latitude: 37.55,
        longitude: 126.91,
        crs: 'WGS84',
      },
    });

    await repository.upsertCanonical(contract);
    const nextResult = await repository.upsertCanonical(contract);

    expect(nextResult.action).toBe('unchanged');
    expect(memory.changeLogs).toHaveLength(2);
    expect(memory.changeLogs[1]?.changeType).toBe('unchanged');
  });
});
