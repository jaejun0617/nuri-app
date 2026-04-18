import type {
  AnimalHospitalCanonicalHospital,
  AnimalHospitalCanonicalUpsertContract,
  AnimalHospitalCanonicalUpsertResult,
  AnimalHospitalIngestSummary,
  AnimalHospitalOfficialSourceSnapshotInput,
  AnimalHospitalSourceRecord,
} from '../../domains/animalHospital/types';
import {
  createOfficialAnimalHospitalSnapshot,
  normalizeLocaldataAnimalHospitalRow,
} from './officialSource';
import { mapOfficialAnimalHospitalSourceToCanonical } from './mapper';
import type { AnimalHospitalCanonicalRepository } from './service';

export type AnimalHospitalChangeLogInput = {
  canonicalId: string;
  sourceId: string;
  changeType: 'inserted' | 'updated' | 'unchanged' | 'failed';
  summary: string;
  payload: Record<string, unknown>;
};

export type AnimalHospitalPersistenceAdapter = {
  search: (input: {
    query: string | null;
    coordinates: { latitude: number; longitude: number } | null;
    radiusMeters: number;
  }) => Promise<ReadonlyArray<AnimalHospitalCanonicalHospital>>;
  getSourceRecordByKey: (sourceKey: string) => Promise<AnimalHospitalSourceRecord | null>;
  upsertCanonical: (
    contract: AnimalHospitalCanonicalUpsertContract,
  ) => Promise<AnimalHospitalCanonicalHospital>;
  upsertSourceRecord: (
    contract: AnimalHospitalCanonicalUpsertContract,
  ) => Promise<AnimalHospitalSourceRecord>;
  appendChangeLog: (input: AnimalHospitalChangeLogInput) => Promise<void>;
};

export type AnimalHospitalWriteRepository = AnimalHospitalCanonicalRepository & {
  upsertCanonical: (
    contract: AnimalHospitalCanonicalUpsertContract,
  ) => Promise<AnimalHospitalCanonicalUpsertResult>;
  ingestOfficialSnapshot: (
    input: AnimalHospitalOfficialSourceSnapshotInput,
  ) => Promise<AnimalHospitalIngestSummary>;
};

export function createAnimalHospitalRepository(
  adapter: AnimalHospitalPersistenceAdapter,
): AnimalHospitalWriteRepository {
  const upsertCanonical = async (
    contract: AnimalHospitalCanonicalUpsertContract,
  ): Promise<AnimalHospitalCanonicalUpsertResult> => {
    const existingSourceRecord = await adapter.getSourceRecordByKey(
      contract.sourceKey,
    );
    const nextAction =
      existingSourceRecord?.rowChecksum === contract.rowChecksum
        ? 'unchanged'
        : existingSourceRecord
          ? 'updated'
          : 'inserted';

    const canonicalHospital = await adapter.upsertCanonical(contract);
    const sourceRecord = await adapter.upsertSourceRecord({
      ...contract,
      canonicalHospital,
      sourceRecord: {
        ...contract.sourceRecord,
        canonicalHospitalId: canonicalHospital.id,
      },
    });

    await adapter.appendChangeLog({
      canonicalId: canonicalHospital.id,
      sourceId: sourceRecord.sourceId,
      changeType: nextAction,
      summary:
        nextAction === 'inserted'
          ? '공식 source 기준 canonical 병원을 최초 생성했어요.'
          : nextAction === 'updated'
            ? '공식 source 최신 스냅샷으로 canonical 병원을 갱신했어요.'
            : '공식 source 스냅샷 메타데이터만 새로 반영했어요.',
      payload: {
        officialSourceKey: contract.officialSourceKey,
        rowChecksum: contract.rowChecksum,
        sourceUpdatedAt: contract.sourceUpdatedAt,
      },
    });

    return {
      canonicalId: canonicalHospital.id,
      sourceId: sourceRecord.sourceId,
      officialSourceKey: contract.officialSourceKey,
      action: nextAction,
      sourceUpdatedAt: contract.sourceUpdatedAt,
      canonicalUpdatedAt: canonicalHospital.trust.canonicalUpdatedAt,
      warnings: [],
    };
  };

  return {
    search: adapter.search,
    upsertCanonical,
    ingestOfficialSnapshot: async input => {
      const snapshot = createOfficialAnimalHospitalSnapshot(input);
      const summary: AnimalHospitalIngestSummary = {
        provider: snapshot.provider,
        snapshotId: snapshot.snapshotId,
        fetchedAt: snapshot.fetchedAt,
        ingestMode: snapshot.ingestMode,
        totalRows: snapshot.rows.length,
        inserted: 0,
        updated: 0,
        unchanged: 0,
        failed: 0,
        issues: [],
        results: [],
      };

      for (const row of snapshot.rows) {
        const normalized = normalizeLocaldataAnimalHospitalRow({
          row,
          snapshot,
        });

        if (!normalized) {
          summary.failed += 1;
          summary.issues.push({
            providerRecordId: null,
            code: 'invalid-row',
            message: '필수 식별자 또는 병원명이 없어 공식 source row를 건너뛰었어요.',
          });
          continue;
        }

        summary.issues.push(...normalized.warnings);

        try {
          const contract = mapOfficialAnimalHospitalSourceToCanonical(
            normalized.input,
          );
          const result = await upsertCanonical(contract);
          summary.results.push(result);
          summary[result.action] += 1;
        } catch (error) {
          summary.failed += 1;
          summary.issues.push({
            providerRecordId: normalized.providerRecordId,
            code: 'upsert-failed',
            message:
              error instanceof Error
                ? error.message
                : 'canonical upsert 중 알 수 없는 오류가 발생했어요.',
          });
        }
      }

      return summary;
    },
  };
}
