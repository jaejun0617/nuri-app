import type {
  AnimalHospitalIngestIssue,
  AnimalHospitalOfficialSourceNormalizedRow,
  AnimalHospitalOfficialSourceSnapshotInput,
} from '../../domains/animalHospital/types';
import {
  buildAnimalHospitalOfficialSourceKey,
  createStableChecksum,
  normalizeAnimalHospitalAddress,
  normalizeAnimalHospitalName,
  normalizeAnimalHospitalPhone,
  normalizeWhitespace,
  parseNullableNumber,
} from './normalization';

const LOCALDATA_PROVIDER = 'official-localdata';

function pickString(
  row: Record<string, unknown>,
  keys: ReadonlyArray<string>,
): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string') {
      const normalized = normalizeWhitespace(value);
      if (normalized) {
        return normalized;
      }
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function pickNumberLike(
  row: Record<string, unknown>,
  keys: ReadonlyArray<string>,
): number | string | null {
  for (const key of keys) {
    const value = row[key];
    if (
      (typeof value === 'number' && Number.isFinite(value)) ||
      typeof value === 'string'
    ) {
      return value;
    }
  }

  return null;
}

function pickDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function buildWarnings(input: {
  providerRecordId: string | null;
  latitude: number | null;
  longitude: number | null;
  x5174: number | null;
  y5174: number | null;
}): AnimalHospitalIngestIssue[] {
  const warnings: AnimalHospitalIngestIssue[] = [];

  if (
    input.latitude === null &&
    input.longitude === null &&
    (input.x5174 !== null || input.y5174 !== null)
  ) {
    warnings.push({
      providerRecordId: input.providerRecordId,
      code: 'coordinate-fallback',
      message: 'WGS84 좌표가 없어 EPSG:5174 좌표를 후속 변환 대상으로 남겼어요.',
    });
  }

  return warnings;
}

export function normalizeLocaldataAnimalHospitalRow(params: {
  row: Record<string, unknown>;
  snapshot: Required<
    Pick<
      AnimalHospitalOfficialSourceSnapshotInput,
      'provider' | 'fetchedAt' | 'snapshotId' | 'ingestMode'
    >
  > &
    Pick<AnimalHospitalOfficialSourceSnapshotInput, 'defaultSourceUpdatedAt'>;
}): AnimalHospitalOfficialSourceNormalizedRow | null {
  const { row, snapshot } = params;
  const openLocalGovernmentCode = pickString(row, [
    '개방자치단체코드',
    '개방자치단체코드명',
    'openLocalGovernmentCode',
  ]);
  const managementNumber = pickString(row, ['관리번호', 'managementNo']);
  const providerRecordId =
    managementNumber && openLocalGovernmentCode
      ? `${openLocalGovernmentCode}:${managementNumber}`
      : (pickString(row, [
          '개방서비스아이디',
          '개방서비스ID',
          '개방서비스id',
        ]) ??
        managementNumber ??
        pickString(row, ['인허가번호', '허가번호', 'licenseNo']));
  const name = pickString(row, ['사업장명', '사업장명칭', '업소명', 'name']);

  if (!providerRecordId || !name) {
    return null;
  }

  const roadAddress = pickString(row, [
    '도로명전체주소',
    '도로명주소',
    'roadAddress',
  ]);
  const lotAddress = pickString(row, [
    '소재지전체주소',
    '지번주소',
    'address',
  ]);
  const sourceUpdatedAt =
    pickDate(
      pickString(row, [
        '데이터기준일자',
        '데이터갱신시점',
        '최종수정시점',
        '인허가일자',
        '수정일자',
        'lastUpdatedAt',
      ]),
    ) ?? snapshot.defaultSourceUpdatedAt ?? null;
  const operationStatusText = pickString(row, [
    '영업상태명',
    '상세영업상태명',
    '영업상태',
    'operationStatus',
  ]);
  const licenseStatusText = pickString(row, [
    '상세영업상태명',
    '폐업일자',
    '휴업종료일자',
    'licenseStatus',
  ]);
  const officialPhone = pickString(row, [
    '소재지전화',
    '전화번호',
    '대표전화',
    'phone',
  ]);
  const latitude = parseNullableNumber(
    pickNumberLike(row, ['위도', 'latitude']),
  );
  const longitude = parseNullableNumber(
    pickNumberLike(row, ['경도', 'longitude']),
  );
  const x5174 = parseNullableNumber(
    pickNumberLike(row, [
      '좌표정보(X)',
      '좌표정보X',
      '좌표정보X(EPSG5174)',
      'x5174',
    ]),
  );
  const y5174 = parseNullableNumber(
    pickNumberLike(row, [
      '좌표정보(Y)',
      '좌표정보Y',
      '좌표정보Y(EPSG5174)',
      'y5174',
    ]),
  );
  const warnings = buildWarnings({
    providerRecordId,
    latitude,
    longitude,
    x5174,
    y5174,
  });

  const metadata = {
    officialSourceKey: buildAnimalHospitalOfficialSourceKey({
      provider: LOCALDATA_PROVIDER,
      providerRecordId,
    }),
    normalizedName: normalizeAnimalHospitalName(name),
    normalizedPrimaryAddress: normalizeAnimalHospitalAddress(
      roadAddress ?? lotAddress,
    ),
    normalizedPhone: normalizeAnimalHospitalPhone(officialPhone),
  };

  return {
    providerRecordId,
    warnings,
    input: {
      provider: LOCALDATA_PROVIDER,
      providerRecordId,
      sourceUpdatedAt,
      ingestedAt: snapshot.fetchedAt,
      snapshotId: snapshot.snapshotId,
      snapshotFetchedAt: snapshot.fetchedAt,
      ingestMode: snapshot.ingestMode,
      name,
      roadAddress,
      lotAddress,
      licenseStatusText,
      operationStatusText,
      officialPhone,
      coordinates: {
        latitude,
        longitude,
        x5174,
        y5174,
        crs:
          latitude !== null && longitude !== null
            ? 'WGS84'
            : x5174 !== null || y5174 !== null
              ? 'EPSG:5174'
              : 'UNKNOWN',
      },
      metadata,
      rowChecksum: createStableChecksum({
        providerRecordId,
        name,
        roadAddress,
        lotAddress,
        officialPhone,
        sourceUpdatedAt,
        operationStatusText,
        licenseStatusText,
        latitude,
        longitude,
        x5174,
        y5174,
      }),
      rawPayload: row,
    },
  };
}

export function createOfficialAnimalHospitalSnapshot(
  input: AnimalHospitalOfficialSourceSnapshotInput,
): Required<
  Pick<
    AnimalHospitalOfficialSourceSnapshotInput,
    'provider' | 'fetchedAt' | 'snapshotId' | 'ingestMode'
  >
> &
  Pick<AnimalHospitalOfficialSourceSnapshotInput, 'defaultSourceUpdatedAt'> & {
    rows: ReadonlyArray<Record<string, unknown>>;
  } {
  const fetchedAt = input.fetchedAt ?? new Date().toISOString();
  const snapshotId =
    input.snapshotId ??
    `${input.provider}:${fetchedAt.slice(0, 10)}:${input.rows.length}`;

  return {
    provider: input.provider,
    fetchedAt,
    snapshotId,
    ingestMode: input.ingestMode ?? 'snapshot',
    defaultSourceUpdatedAt: input.defaultSourceUpdatedAt ?? null,
    rows: input.rows,
  };
}
