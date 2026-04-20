import { applyAnimalHospitalApprovedVerifications } from '../src/domains/animalHospital/verification';
import { mapOfficialAnimalHospitalSourceToCanonical } from '../src/services/animalHospital/service';
import type { AnimalHospitalVerificationRecord } from '../src/domains/animalHospital/types';

function createCanonical() {
  return mapOfficialAnimalHospitalSourceToCanonical({
    provider: 'official-localdata',
    providerRecordId: '4110000:411000001020240555',
    sourceUpdatedAt: '2026-04-20T00:00:00.000Z',
    ingestedAt: '2026-04-20T01:00:00.000Z',
    snapshotId: 'verification-unit',
    snapshotFetchedAt: '2026-04-20T01:00:00.000Z',
    ingestMode: 'snapshot',
    name: '검수동물병원',
    roadAddress: '경기 고양시 일산서구 중앙로 555',
    lotAddress: '경기 고양시 일산서구 대화동 555',
    operationStatusText: '영업/정상',
    licenseStatusText: '정상',
    officialPhone: null,
    coordinates: {
      latitude: null,
      longitude: null,
      crs: 'UNKNOWN',
    },
    metadata: {},
    rowChecksum: 'ah_verification_unit',
    rawPayload: {},
  }).canonicalHospital;
}

function createVerification(
  input: Partial<AnimalHospitalVerificationRecord>,
): AnimalHospitalVerificationRecord {
  const now = '2026-04-20T02:00:00.000Z';

  return {
    id: input.id ?? 'verification-1',
    animalHospitalId: input.animalHospitalId ?? createCanonical().id,
    fieldKey: input.fieldKey ?? 'phone',
    status: input.status ?? 'approved',
    verifiedValue: input.verifiedValue ?? { phone: '031-555-0000' },
    verificationSource: input.verificationSource ?? 'operator-call',
    reviewerId: input.reviewerId ?? 'reviewer-1',
    reviewedAt: input.reviewedAt ?? now,
    expiresAt: input.expiresAt ?? null,
    note: input.note ?? null,
    evidence: input.evidence ?? {},
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

describe('animalHospital approved verification projection gate', () => {
  it('approved phone/coordinates/thumbnail만 canonical public-safe field에 반영한다', () => {
    const canonical = createCanonical();
    const projected = applyAnimalHospitalApprovedVerifications({
      canonical,
      now: Date.parse('2026-04-20T03:00:00.000Z'),
      verifications: [
        createVerification({
          id: 'phone-1',
          animalHospitalId: canonical.id,
          fieldKey: 'phone',
          verifiedValue: { phone: '031-555-0000' },
        }),
        createVerification({
          id: 'coordinates-1',
          animalHospitalId: canonical.id,
          fieldKey: 'coordinates',
          verifiedValue: { latitude: 37.68, longitude: 126.77 },
        }),
        createVerification({
          id: 'thumbnail-1',
          animalHospitalId: canonical.id,
          fieldKey: 'thumbnail',
          verifiedValue: {
            thumbnailUrl:
              'https://cdn.example.com/animal-hospital/verified.jpg',
          },
        }),
        createVerification({
          id: 'homepage-1',
          animalHospitalId: canonical.id,
          fieldKey: 'homepageUrl',
          verifiedValue: { url: 'https://example.com' },
        }),
      ],
    });

    expect(projected.contact.publicPhone?.value).toBe('031-555-0000');
    expect(projected.contact.publicPhone?.verificationStatus).toBe('reviewed');
    expect(projected.coordinates).toMatchObject({
      latitude: 37.68,
      longitude: 126.77,
      source: 'reviewed',
      normalizationStatus: 'exact',
    });
    expect(projected.media.thumbnailUrl).toBe(
      'https://cdn.example.com/animal-hospital/verified.jpg',
    );
    expect(projected.sensitiveDetails.homepageUrl.visibility).toBe('hidden');
    expect(projected.sensitiveDetails.homepageUrl.value).toBeNull();
  });

  it('thumbnail verification은 http URL만 public media에 반영한다', () => {
    const canonical = createCanonical();
    const projected = applyAnimalHospitalApprovedVerifications({
      canonical,
      now: Date.parse('2026-04-20T03:00:00.000Z'),
      verifications: [
        createVerification({
          animalHospitalId: canonical.id,
          fieldKey: 'thumbnail',
          verifiedValue: { thumbnailUrl: 'file://local-thumbnail.jpg' },
        }),
      ],
    });

    expect(projected.media.thumbnailUrl).toBeNull();
  });

  it('만료되거나 rejected verification은 반영하지 않는다', () => {
    const canonical = createCanonical();
    const projected = applyAnimalHospitalApprovedVerifications({
      canonical,
      now: Date.parse('2026-04-20T03:00:00.000Z'),
      verifications: [
        createVerification({
          animalHospitalId: canonical.id,
          status: 'approved',
          expiresAt: '2026-04-19T00:00:00.000Z',
          verifiedValue: { phone: '031-555-0000' },
        }),
        createVerification({
          animalHospitalId: canonical.id,
          status: 'rejected',
          verifiedValue: { latitude: 37.68, longitude: 126.77 },
        }),
      ],
    });

    expect(projected.contact.publicPhone).toBeNull();
    expect(projected.coordinates.latitude).toBeNull();
    expect(projected.coordinates.longitude).toBeNull();
  });
});
