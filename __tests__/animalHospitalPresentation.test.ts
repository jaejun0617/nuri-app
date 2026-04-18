import {
  buildAnimalHospitalCardViewModel,
  buildAnimalHospitalDetailViewModel,
} from '../src/domains/animalHospital/presentation';
import type { AnimalHospitalPublicHospital } from '../src/domains/animalHospital/types';

const publicHospital: AnimalHospitalPublicHospital = {
  id: 'animal-hospital:official-localdata:test',
  name: '누리동물병원',
  address: '서울특별시 강남구 테헤란로 10',
  roadAddress: '서울특별시 강남구 테헤란로 10',
  latitude: 37.4999,
  longitude: 127.0333,
  distanceMeters: 230,
  distanceLabel: '도보 3분',
  statusSummary: '인허가 기준 운영 병원으로 확인됐어요.',
  officialPhone: '02-555-0101',
  publicTrust: {
    publicLabel: 'needs_verification',
    label: '확인 필요',
    shortReason: '기본 정보는 있지만 최신 확인이 더 필요해요.',
    description: '공개 가능한 기본 정보만 보여주고, 민감한 운영 정보는 숨겨 둬요.',
    guidance: '민감한 운영 정보는 아직 public에 열지 않았어요.',
    tone: 'caution',
    sourceLabel: 'official-localdata',
    basisDate: '2026-04-16T00:00:00.000Z',
    basisDateLabel: '기준일 2026.04.16',
    isStale: false,
    hasConflict: false,
    layers: ['trust'],
  },
  links: {
    externalMapUrl: 'https://maps.example.test',
    providerPlaceUrl: 'https://place.example.test',
    callUri: 'tel:025550101',
  },
};

describe('animalHospital presentation models', () => {
  it('카드 view model은 public safe field만 소비한다', () => {
    const card = buildAnimalHospitalCardViewModel(publicHospital);

    expect(card.title).toBe('누리동물병원');
    expect(card.phoneLabel).toBe('02-555-0101');
    expect('operatingHours' in (card as unknown as Record<string, unknown>)).toBe(
      false,
    );
  });

  it('상세 view model은 public whitelist 내 정보만 정리한다', () => {
    const detail = buildAnimalHospitalDetailViewModel(publicHospital);

    expect(detail.trustLabel).toBe('확인 필요');
    expect(detail.hasProviderLink).toBe(true);
    expect('homepageUrl' in (detail as unknown as Record<string, unknown>)).toBe(
      false,
    );
  });
});
