import type {
  AnimalHospitalCoordinateNormalizationStatus,
  AnimalHospitalIngestIssue,
} from '../../domains/animalHospital/types';

export type AnimalHospitalDeltaContractSnapshot = {
  sourceKey: string;
  canonicalId: string;
  rowChecksum: string | null;
  isActive: boolean;
  coordinateNormalizationStatus: AnimalHospitalCoordinateNormalizationStatus;
};

export type AnimalHospitalDeltaRemoteSourceSnapshot = {
  sourceKey: string;
  rowChecksum: string | null;
  canonicalHospitalId: string | null;
};

export type AnimalHospitalDeltaSummary = {
  totalRows: number;
  mappedRows: number;
  failedRows: number;
  parseFailedRows: number;
  coordinateConversionFailedRows: number;
  newRows: number;
  changedRows: number;
  unchangedRows: number;
  inactiveRows: number;
  missingSuspectedRows: number;
  matchingFailedRows: number;
  canonicalUpsertTargetRows: number;
  changeLogExpectedRows: number;
};

export type AnimalHospitalDriftSummaryInput = {
  sourceRows: number;
  totalCanonical: number;
  publicVisible: number;
  activeNotHidden: number;
  sourceUnlinkedRows: number;
  canonicalDriftSuspected: number;
  hiddenCount: number;
  inactiveCount: number;
  approvedPhoneCount: number;
  approvedCoordinatesCount: number;
  approvedThumbnailCount: number;
  approvedOpen24HoursCount: number;
};

export type AnimalHospitalDriftSummary = AnimalHospitalDriftSummaryInput & {
  approvedPhoneCoverageRatio: number;
  approvedCoordinatesCoverageRatio: number;
  approvedThumbnailCoverageRatio: number;
  approvedOpen24HoursCoverageRatio: number;
};

function divideOrZero(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return Number((numerator / denominator).toFixed(4));
}

export function summarizeAnimalHospitalDelta(params: {
  contracts: ReadonlyArray<AnimalHospitalDeltaContractSnapshot>;
  failedRows: number;
  issues: ReadonlyArray<AnimalHospitalIngestIssue>;
  remoteSources?: ReadonlyArray<AnimalHospitalDeltaRemoteSourceSnapshot>;
}): AnimalHospitalDeltaSummary {
  const remoteSourceMap = new Map(
    (params.remoteSources ?? []).map(source => [source.sourceKey, source]),
  );
  const contractSourceKeys = new Set(
    params.contracts.map(contract => contract.sourceKey),
  );
  let newRows = 0;
  let changedRows = 0;
  let unchangedRows = 0;
  let matchingFailedRows = 0;

  for (const contract of params.contracts) {
    const remoteSource = remoteSourceMap.get(contract.sourceKey);

    if (!remoteSource) {
      newRows += 1;
      continue;
    }

    if (!remoteSource.canonicalHospitalId) {
      matchingFailedRows += 1;
    }

    if (remoteSource.rowChecksum === contract.rowChecksum) {
      unchangedRows += 1;
    } else {
      changedRows += 1;
    }
  }

  const missingSuspectedRows = (params.remoteSources ?? []).filter(
    source => !contractSourceKeys.has(source.sourceKey),
  ).length;
  const coordinateConversionFailedRows = params.contracts.filter(
    contract => contract.coordinateNormalizationStatus === 'conversion-required',
  ).length;

  return {
    totalRows: params.contracts.length + params.failedRows,
    mappedRows: params.contracts.length,
    failedRows: params.failedRows,
    parseFailedRows: params.issues.filter(issue => issue.code === 'invalid-row')
      .length,
    coordinateConversionFailedRows,
    newRows,
    changedRows,
    unchangedRows,
    inactiveRows: params.contracts.filter(contract => !contract.isActive)
      .length,
    missingSuspectedRows,
    matchingFailedRows,
    canonicalUpsertTargetRows: params.contracts.length,
    changeLogExpectedRows: params.contracts.length,
  };
}

export function calculateAnimalHospitalDriftSummary(
  input: AnimalHospitalDriftSummaryInput,
): AnimalHospitalDriftSummary {
  return {
    ...input,
    approvedPhoneCoverageRatio: divideOrZero(
      input.approvedPhoneCount,
      input.totalCanonical,
    ),
    approvedCoordinatesCoverageRatio: divideOrZero(
      input.approvedCoordinatesCount,
      input.totalCanonical,
    ),
    approvedThumbnailCoverageRatio: divideOrZero(
      input.approvedThumbnailCount,
      input.totalCanonical,
    ),
    approvedOpen24HoursCoverageRatio: divideOrZero(
      input.approvedOpen24HoursCount,
      input.totalCanonical,
    ),
  };
}
