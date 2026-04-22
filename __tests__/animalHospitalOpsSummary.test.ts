import {
  calculateAnimalHospitalDriftSummary,
  summarizeAnimalHospitalDelta,
} from '../src/services/animalHospital/opsSummary';

describe('animalHospital ops summary', () => {
  it('delta dry-run summary는 신규/변경/누락/좌표 실패를 분리한다', () => {
    const summary = summarizeAnimalHospitalDelta({
      contracts: [
        {
          sourceKey: 'official-localdata:new',
          canonicalId: 'animal-hospital:official-localdata:new',
          rowChecksum: 'ah_new',
          isActive: true,
          coordinateNormalizationStatus: 'exact',
        },
        {
          sourceKey: 'official-localdata:changed',
          canonicalId: 'animal-hospital:official-localdata:changed',
          rowChecksum: 'ah_changed_next',
          isActive: false,
          coordinateNormalizationStatus: 'conversion-required',
        },
        {
          sourceKey: 'official-localdata:unchanged',
          canonicalId: 'animal-hospital:official-localdata:unchanged',
          rowChecksum: 'ah_same',
          isActive: true,
          coordinateNormalizationStatus: 'exact',
        },
      ],
      failedRows: 1,
      issues: [
        {
          providerRecordId: null,
          code: 'invalid-row',
          message: '필수 식별자 누락',
        },
      ],
      remoteSources: [
        {
          sourceKey: 'official-localdata:changed',
          rowChecksum: 'ah_changed_prev',
          canonicalHospitalId: null,
        },
        {
          sourceKey: 'official-localdata:unchanged',
          rowChecksum: 'ah_same',
          canonicalHospitalId: 'animal-hospital:official-localdata:unchanged',
        },
        {
          sourceKey: 'official-localdata:missing',
          rowChecksum: 'ah_missing',
          canonicalHospitalId: 'animal-hospital:official-localdata:missing',
        },
      ],
    });

    expect(summary).toMatchObject({
      totalRows: 4,
      mappedRows: 3,
      failedRows: 1,
      parseFailedRows: 1,
      coordinateConversionFailedRows: 1,
      newRows: 1,
      changedRows: 1,
      unchangedRows: 1,
      inactiveRows: 1,
      missingSuspectedRows: 1,
      matchingFailedRows: 1,
      canonicalUpsertTargetRows: 3,
      changeLogExpectedRows: 3,
    });
  });

  it('drift summary는 approved coverage 비율을 canonical 기준으로 계산한다', () => {
    const summary = calculateAnimalHospitalDriftSummary({
      sourceRows: 10,
      totalCanonical: 8,
      publicVisible: 5,
      activeNotHidden: 5,
      sourceUnlinkedRows: 1,
      canonicalDriftSuspected: 2,
      hiddenCount: 1,
      inactiveCount: 3,
      approvedPhoneCount: 4,
      approvedCoordinatesCount: 2,
      approvedThumbnailCount: 1,
      approvedOpen24HoursCount: 1,
    });

    expect(summary.approvedPhoneCoverageRatio).toBe(0.5);
    expect(summary.approvedCoordinatesCoverageRatio).toBe(0.25);
    expect(summary.approvedThumbnailCoverageRatio).toBe(0.125);
    expect(summary.approvedOpen24HoursCoverageRatio).toBe(0.125);
  });
});
