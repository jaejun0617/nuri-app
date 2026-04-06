// 파일: src/services/locationDiscovery/service.ts
// 파일 목적:
// - 산책 장소와 펫동반 장소 탐색 도메인의 핵심 후보 수집/정제 로직을 제공한다.
// 어디서 쓰이는지:
// - `useLocationDiscovery` 훅과 주변 산책/펫동반 장소 리스트·상세 화면에서 사용된다.
// 핵심 역할:
// - Kakao Local 후보를 수집하고, 도메인별 키워드/정렬/검증 상태 규칙으로 `LocationDiscoveryItem` 목록을 만든다.
// - 펫동반 장소의 경우 Supabase 메타와 외부 후보를 병합해 서비스 표시 모델로 정규화한다.
// 데이터·상태 흐름:
// - 외부 검색 원본은 Kakao Local이고, 필요 시 `placeMeta.ts`가 canonical 메타/보조 신호를 덧씌운다.
// - 화면은 이 파일이 만든 normalized item만 소비하고, source/provider 차이는 내부에서 숨긴다.
// 수정 시 주의:
// - 현재 source of truth는 외부 후보 + 선택적 메타 merge이므로, 검증 상태를 과하게 확정하는 방향으로 바꾸면 안 된다.
// - 정렬/필터 패턴 하나만 바꿔도 산책과 펫동반 장소 양쪽 체감 품질이 동시에 달라지므로 실기기 검색 QA가 필요하다.
import type { DeviceCoordinates } from '../location/currentPosition';
import type { PublicTrustInfo } from '../trust/publicTrust';
import {
  buildTrustBasisDateLabel,
  canKeepTrustReviewed,
  getPublicTrustPriority,
  getPublicTrustLabelText,
  hasAnyTrustEvidence,
  hasTrustBasisDate,
  isTrustDateStale,
} from '../trust/publicTrust';
import type { PetFriendlyPlaceServiceMeta } from './placeMeta';
import {
  buildPetPlaceSourceLookupKey,
  loadPetFriendlyPlaceServiceMeta,
} from './placeMeta';
import { buildStaticMapPreviewUrl } from './maps';
import { kakaoLocalSearchProvider } from './kakaoLocal';
import type {
  KakaoPlaceDocument,
  LocationDiscoveryDomain,
  LocationDiscoveryItem,
  LocationDiscoveryItemKind,
  LocationDiscoveryResponse,
  LocationDiscoverySearchInput,
  LocationDiscoveryVerificationStatus,
} from './types';

const WALK_BASE_KEYWORDS = [
  '공원',
  '문화공원',
  '호수공원',
  '근린공원',
  '생태공원',
  '수변공원',
  '어린이공원',
  '산책로',
  '둘레길',
  '숲길',
] as const;
const PLACE_DEFAULT_QUERIES = [
  '애견동반 카페',
  '애견동반 식당',
  '반려동물 동반',
  '애견카페',
  '반려견 운동장',
] as const;
const WALK_POSITIVE_KEYWORDS = [
  '공원',
  '도시근린공원',
  '호수공원',
  '수변공원',
  '근린공원',
  '생태공원',
  '문화공원',
  '어린이공원',
  '산책로',
  '둘레길',
  '숲길',
] as const;
const WALK_NEGATIVE_KEYWORDS = [
  '화장실',
  '출입구',
  '입구',
  '정문',
  '후문',
  '게이트',
  '주차장',
  '공영주차장',
  '버스정류장',
  '편의점',
  '은행',
  '주유소',
  '병원',
  '약국',
  '아파트',
  '공중전화',
  '카페',
  '커피',
  '음식점',
  '식당',
  '레스토랑',
  '반려동물용품',
  '애견용품',
  '펫샵',
  '용품',
  '호텔',
  '미용',
  '유치원',
  '애견카페',
  '반려동물',
  '학원',
  '체험학습장',
  '공원시설물',
  '생태보존',
  '서식지',
  '교육장',
  '전시장',
  '박물관',
] as const;
const WALK_STRONG_PRIORITY_KEYWORDS = [
  '문화공원',
  '호수공원',
  '수변공원',
  '생태공원',
  '근린공원',
  '도시근린공원',
  '어린이공원',
  '공원',
  '산책로',
  '둘레길',
  '숲길',
] as const;
const DEFAULT_QUERY_PAGE_SIZE = 15;
const PET_POSITIVE_KEYWORDS = [
  '애견',
  '반려',
  '펫',
  '동반',
  '테라스',
  '야외',
  '운동장',
  '놀이터',
] as const;
const PET_NEGATIVE_KEYWORDS = [
  '동물병원',
  '병원',
  '약국',
  '호텔',
  '유치원',
  '미용',
  '용품',
  '펫샵',
  '마트',
  '아파트',
  '오피스텔',
  '정류장',
  '주차장',
  '게이트',
  '출입구',
  '학교',
  '학원',
] as const;
const PLACE_CONFLICT_SIGNAL_KEYS = new Set([
  'allows-dogs',
  'official-pet-policy',
  'pet-travel-listing',
]);
const PLACE_BROAD_QUERY_KEYWORDS = [
  '애견',
  '반려',
  '강아지',
  '펫',
  '동반',
  '카페',
  '식당',
  '레스토랑',
  '테라스',
  '공간',
  '장소',
  '맛집',
  '브런치',
  '펍',
] as const;
const WALK_BROAD_QUERY_KEYWORDS = [
  '공원',
  '산책',
  '산책로',
  '둘레길',
  '숲길',
  '호수',
  '해변',
  '강변',
  '수변',
  '트레킹',
  '러닝',
  '코스',
] as const;

type NormalizedPlaceBase = {
  id: string;
  kind: LocationDiscoveryItemKind;
  name: string;
  description: string;
  categoryLabel: string;
  address: string;
  roadAddress: string | null;
  distanceMeters: number | null;
  distanceLabel: string;
  estimatedMinutes: number | null;
  latitude: number;
  longitude: number;
  placeUrl: string | null;
  phone: string | null;
  coordinateLabel: string;
  externalPlaceId: string | null;
};

type DiscoveryQueryIntent = 'none' | 'broad' | 'specific';

type NormalizedPetFriendlyCandidate = NormalizedPlaceBase & {
  domain: 'pet-friendly-place';
  hasKeywordEvidence: boolean;
};

function formatCoordinateLabel(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function normalizeQuery(value: string | null | undefined): string | null {
  const normalized = (value ?? '').trim().replace(/\s+/g, ' ');
  return normalized || null;
}

function getDiscoveryQueryIntent(
  value: string | null | undefined,
  broadKeywords: ReadonlyArray<string>,
): DiscoveryQueryIntent {
  const normalized = normalizeQuery(value);
  if (!normalized) {
    return 'none';
  }

  const tokens = normalized
    .split(' ')
    .map(token => token.trim())
    .filter(Boolean);

  const isBroadToken = tokens.some(token => {
    if (token.length <= 3) {
      return true;
    }

    return broadKeywords.some(
      keyword => token.includes(keyword) || keyword.includes(token),
    );
  });

  return isBroadToken ? 'broad' : 'specific';
}

function parseCoordinate(value: string | undefined): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseDistanceMeters(
  value: string | undefined,
  coordinates: DeviceCoordinates | null,
  latitude: number,
  longitude: number,
): number | null {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return Math.round(numeric);
  }

  if (!coordinates) return null;

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;
  const latDiff = toRadians(latitude - coordinates.latitude);
  const lngDiff = toRadians(longitude - coordinates.longitude);
  const originLat = toRadians(coordinates.latitude);
  const targetLat = toRadians(latitude);
  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(originLat) * Math.cos(targetLat) * Math.sin(lngDiff / 2) ** 2;
  const distance = 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(distance);
}

function estimateWalkMinutes(distanceMeters: number | null): number | null {
  if (distanceMeters === null) return null;
  const routeDistance = distanceMeters * 1.6;
  return Math.max(15, Math.min(90, Math.round(routeDistance / 70)));
}

function buildWalkDescription(document: KakaoPlaceDocument): string {
  const category =
    document.category_group_name?.trim() ||
    document.category_name?.split('>').pop()?.trim() ||
    '산책 장소';
  const area =
    document.road_address_name?.trim() || document.address_name?.trim() || '';
  if (!area) {
    return `${category} 주변을 가볍게 둘러보기 좋아요.`;
  }
  return `${area} 근처에서 ${category} 분위기를 느끼며 걷기 좋아요.`;
}

function buildPetFriendlyDescription(
  document: KakaoPlaceDocument,
  kind: LocationDiscoveryItemKind,
): string {
  const address =
    document.road_address_name?.trim() || document.address_name?.trim();
  const areaLabel = address ? `${address} 근처에서` : '근처에서';

  switch (kind) {
    case 'cafe':
      return `${areaLabel} 쉬어가기 좋은 펫동반 카페 후보예요.`;
    case 'restaurant':
      return `${areaLabel} 식사와 함께 들르기 좋은 펫동반 식당 후보예요.`;
    case 'outdoor-space':
      return `${areaLabel} 야외에서 머물기 좋은 펫동반 공간 후보예요.`;
    case 'indoor-space':
      return `${areaLabel} 실내에서 머물기 좋은 펫동반 공간 후보예요.`;
    default:
      return `${areaLabel} 들르기 좋은 펫동반 장소 후보예요.`;
  }
}

function matchesPositiveKeyword(
  value: string,
  keywords: ReadonlyArray<string>,
): boolean {
  return keywords.some(keyword => value.includes(keyword));
}

function filterWalkDocument(document: KakaoPlaceDocument): boolean {
  const name = document.place_name?.trim() || '';
  const category = document.category_name?.trim() || '';
  const groupName = document.category_group_name?.trim() || '';
  const haystack = `${name} ${category}`;
  const categoryHaystack = `${category} ${groupName}`;

  if (!name) return false;
  if (/(출입구|입구|정문|후문|게이트)\s*\d*/.test(name)) {
    return false;
  }
  if (matchesPositiveKeyword(haystack, WALK_NEGATIVE_KEYWORDS)) {
    return false;
  }
  if (
    /(카페|커피|음식점|식당|레스토랑|반려동물용품|애견용품|펫샵|호텔|미용|유치원|학원|체험학습장|공원시설물|생태보존|서식지|교육장|전시장|박물관)/.test(
      categoryHaystack,
    )
  ) {
    return false;
  }

  return matchesPositiveKeyword(haystack, WALK_POSITIVE_KEYWORDS);
}

function getWalkPriority(item: LocationDiscoveryItem): number {
  const haystack = `${item.name} ${item.categoryLabel}`;

  for (let index = 0; index < WALK_STRONG_PRIORITY_KEYWORDS.length; index += 1) {
    if (haystack.includes(WALK_STRONG_PRIORITY_KEYWORDS[index])) {
      return index;
    }
  }

  return WALK_STRONG_PRIORITY_KEYWORDS.length;
}

function inferPetFriendlyPlaceKind(
  document: KakaoPlaceDocument,
): LocationDiscoveryItemKind {
  const category = `${document.category_group_name ?? ''} ${
    document.category_name ?? ''
  }`;
  const name = document.place_name?.trim() || '';
  const haystack = `${name} ${category}`;

  if (/(카페|커피|디저트)/.test(haystack)) return 'cafe';
  if (/(음식점|식당|레스토랑|브런치|주점)/.test(haystack)) {
    return 'restaurant';
  }
  if (/(공원|운동장|놀이터|테라스|정원|야외|둘레길|산책로)/.test(haystack)) {
    return 'outdoor-space';
  }
  if (/(쇼룸|라운지|공방|스튜디오|전시|복합|실내)/.test(haystack)) {
    return 'indoor-space';
  }
  return 'pet-friendly-place';
}

function filterPetFriendlyDocument(document: KakaoPlaceDocument): boolean {
  const name = document.place_name?.trim() || '';
  const category = document.category_name?.trim() || '';
  const groupName = document.category_group_name?.trim() || '';
  const haystack = `${name} ${category} ${groupName}`;

  if (!name) return false;
  if (matchesPositiveKeyword(haystack, PET_NEGATIVE_KEYWORDS)) {
    return false;
  }

  return true;
}

function getPetFriendlyPriority(item: LocationDiscoveryItem): number {
  const haystack = `${item.name} ${item.categoryLabel} ${item.description}`;
  const hasPetKeyword =
    item.publicTrust.publicLabel !== 'candidate' ||
    matchesPositiveKeyword(haystack, PET_POSITIVE_KEYWORDS);

  switch (item.kind) {
    case 'cafe':
      return hasPetKeyword ? 0 : 1;
    case 'restaurant':
      return hasPetKeyword ? 2 : 3;
    case 'outdoor-space':
      return hasPetKeyword ? 4 : 5;
    case 'indoor-space':
      return hasPetKeyword ? 6 : 7;
    default:
      return hasPetKeyword ? 8 : 9;
  }
}

function dedupeItems(
  items: ReadonlyArray<LocationDiscoveryItem>,
): LocationDiscoveryItem[] {
  const map = new Map<string, LocationDiscoveryItem>();

  items.forEach(item => {
    const key =
      item.id || `${item.name}:${item.latitude.toFixed(5)}:${item.longitude.toFixed(5)}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      return;
    }

    const existingDistance = existing.distanceMeters ?? Number.MAX_SAFE_INTEGER;
    const nextDistance = item.distanceMeters ?? Number.MAX_SAFE_INTEGER;
    if (nextDistance < existingDistance) {
      map.set(key, item);
    }
  });

  return [...map.values()];
}

function buildWalkVerification() {
  return {
    status: 'service-ranked' as const,
    label: '현재 위치 기반 후보',
    description:
      '현재 위치와 산책 키워드를 기준으로 정리한 후보예요. 실제 이용 가능 여부는 다시 확인해 주세요.',
    tone: 'neutral' as const,
    sourceLabel: 'NURI 추천 정렬',
    requiresConfirmation: true,
  };
}

function buildWalkPublicTrust(): PublicTrustInfo {
  return {
    publicLabel: 'candidate',
    label: getPublicTrustLabelText('candidate'),
    shortReason: '거리와 키워드를 기준으로 정리한 산책 후보예요.',
    description:
      '현재 위치 기반 편의 추천이며 공적 검수 정보와는 별도예요.',
    guidance: '실제 운영 상태와 이용 가능 여부는 현장에서 다시 확인해 주세요.',
    tone: 'neutral',
    sourceLabel: '현재 위치 기반 추천',
    basisDate: null,
    basisDateLabel: null,
    isStale: false,
    hasConflict: false,
    layers: ['candidate'],
  };
}

function buildPetFriendlyVerification(
  status: Exclude<LocationDiscoveryVerificationStatus, 'service-ranked'>,
  sourceType: 'external-only' | 'service-meta',
) {
  switch (status) {
    case 'admin-verified':
      return {
        status,
        label: '펫동반 가능',
        description: '운영 검수 메타 기준으로 확인된 장소예요.',
        tone: 'positive' as const,
        sourceLabel: 'NURI 운영 검수',
        requiresConfirmation: false,
      };
    case 'user-reported':
      return {
        status,
        label: '사용자 제보 기반',
        description: '사용자 제보가 있으니 방문 전 정책을 다시 확인해 주세요.',
        tone: 'caution' as const,
        sourceLabel: '사용자 제보',
        requiresConfirmation: true,
      };
    case 'rejected':
      return {
        status,
        label: '동반 불가 제보',
        description: '동반 불가 제보가 있어 방문 전 반드시 매장에 확인해 주세요.',
        tone: 'critical' as const,
        sourceLabel: '서비스 메타',
        requiresConfirmation: true,
      };
    case 'keyword-inferred':
      return {
        status,
        label: '펫동반 가능성 있음',
        description:
          sourceType === 'service-meta'
            ? '서비스 메타와 외부 후보를 함께 참고한 추정 결과예요.'
            : '외부 검색 키워드 기반 후보예요. 현장 확인이 필요해요.',
        tone: 'caution' as const,
        sourceLabel:
          sourceType === 'service-meta' ? '서비스 메타 + 외부 후보' : 'Kakao Local 후보',
        requiresConfirmation: true,
      };
    case 'unknown':
    default:
      return {
        status: 'unknown' as const,
        label: '현장 확인 필요',
        description:
          sourceType === 'service-meta'
            ? '서비스 메타가 아직 확정되지 않았어요. 방문 전 정책을 확인해 주세요.'
            : '외부 장소 후보만 확보된 상태예요. 실제 반려동물 동반 가능 여부는 현장 확인이 필요해요.',
        tone: 'caution' as const,
        sourceLabel:
          sourceType === 'service-meta' ? '서비스 메타 미확정' : 'Kakao Local 후보',
        requiresConfirmation: true,
      };
  }
}

function getPetPolicySummaryLabel(
  status: Exclude<LocationDiscoveryVerificationStatus, 'service-ranked'>,
): string {
  switch (status) {
    case 'admin-verified':
      return '펫동반 가능';
    case 'keyword-inferred':
      return '펫동반 가능성 있음';
    case 'user-reported':
      return '사용자 제보 기반';
    case 'rejected':
      return '동반 불가 제보';
    case 'unknown':
    default:
      return '현장 확인 필요';
  }
}

function buildExternalPetPolicyNote(document: KakaoPlaceDocument): string {
  const category =
    document.category_name?.split('>').pop()?.trim() ||
    document.category_group_name?.trim() ||
    '매장';

  return `${category} 방문 전 실제 반려동물 동반 가능 여부와 입장 조건을 꼭 다시 확인해 주세요.`;
}

function buildPetFriendlyPublicTrust(params: {
  candidate: NormalizedPetFriendlyCandidate;
  serviceMeta: PetFriendlyPlaceServiceMeta | undefined;
}): PublicTrustInfo {
  const { candidate, serviceMeta } = params;
  const layers: Array<'candidate' | 'trust' | 'user'> = ['candidate'];
  const isStale = isTrustDateStale(serviceMeta?.lastVerifiedAt);
  const hasPositiveExternalSignal = Boolean(
    serviceMeta?.externalSignals.some(signal => {
      if (!PLACE_CONFLICT_SIGNAL_KEYS.has(signal.signalKey)) {
        return false;
      }

      if (signal.signalValueBoolean === true) {
        return true;
      }

      return signal.signalScore >= 0.65;
    }),
  );
  const hasNegativeExternalSignal = Boolean(
    serviceMeta?.externalSignals.some(
      signal =>
        PLACE_CONFLICT_SIGNAL_KEYS.has(signal.signalKey) &&
        signal.signalValueBoolean === false,
    ),
  );
  const hasEvidence = hasAnyTrustEvidence({
    summaryText: serviceMeta?.petPolicyText,
    noteText: serviceMeta?.adminNote,
    linkCount: serviceMeta?.sourceLinks.length ?? 0,
    signalCount: serviceMeta?.externalSignals.length ?? 0,
  });
  const hasFreshnessBasis = hasTrustBasisDate(serviceMeta?.lastVerifiedAt);
  const hasConflict =
    Boolean(serviceMeta) &&
    ((serviceMeta?.verificationStatus === 'rejected' &&
      (candidate.hasKeywordEvidence || hasPositiveExternalSignal)) ||
      (serviceMeta?.verificationStatus === 'admin-verified' &&
        hasNegativeExternalSignal));

  if (serviceMeta) {
    layers.push('trust');
    if (
      serviceMeta.sourceType === 'user-report' ||
      serviceMeta.userReportCount > 0
    ) {
      layers.push('user');
    }
  }

  const canPublishTrustReviewed = canKeepTrustReviewed({
    isAdminReviewed: serviceMeta?.verificationStatus === 'admin-verified',
    basisDate: serviceMeta?.lastVerifiedAt,
    hasConflict,
    hasEvidence,
  });

  if (canPublishTrustReviewed && serviceMeta?.verificationStatus === 'admin-verified') {
    return {
      publicLabel: 'trust_reviewed',
      label: getPublicTrustLabelText('trust_reviewed'),
      shortReason: '운영 검수 이력이 반영된 장소예요.',
      description:
        '검수 메타를 참고한 정보지만 외부 원본과 실제 현장 정책은 달라질 수 있어요.',
      guidance: '실제 방문 전 반려동물 동반 조건을 다시 한 번 확인해 주세요.',
      tone: 'positive',
      sourceLabel: '운영 검수 메타',
      basisDate: serviceMeta.lastVerifiedAt,
      basisDateLabel: buildTrustBasisDateLabel(
        serviceMeta.lastVerifiedAt,
        '검수 기준일',
      ),
      isStale: false,
      hasConflict,
      layers,
    };
  }

  if (serviceMeta?.verificationStatus === 'rejected') {
    return {
      publicLabel: 'needs_verification',
      label: getPublicTrustLabelText('needs_verification'),
      shortReason: '동반 불가 이력이 있어 재확인이 필요해요.',
      description:
        '외부 후보와 운영 메타가 다를 수 있어 가장 보수적인 라벨을 유지해요.',
      guidance: '매장 또는 시설의 최신 정책을 직접 확인해 주세요.',
      tone: 'critical',
      sourceLabel: '동반 불가 이력',
      basisDate: serviceMeta.lastVerifiedAt,
      basisDateLabel: buildTrustBasisDateLabel(
        serviceMeta.lastVerifiedAt,
        '검수 기준일',
      ),
      isStale,
      hasConflict,
      layers,
    };
  }

  if (
    serviceMeta?.verificationStatus === 'user-reported' ||
    serviceMeta?.sourceType === 'user-report'
  ) {
    return {
      publicLabel: 'needs_verification',
      label: getPublicTrustLabelText('needs_verification'),
      shortReason: '사용자 제보가 있지만 운영 확정 단계는 아니에요.',
      description:
        '사용자 제보는 참고용 신호이며 외부 원본과 실제 현장 정책이 다를 수 있어요.',
      guidance: '실제 방문 전 반려동물 동반 조건을 다시 확인해 주세요.',
      tone: 'caution',
      sourceLabel: '사용자 제보',
      basisDate: serviceMeta.lastVerifiedAt,
      basisDateLabel: buildTrustBasisDateLabel(
        serviceMeta.lastVerifiedAt,
        '제보 기준일',
      ),
      isStale,
      hasConflict,
      layers,
    };
  }

  if (serviceMeta) {
    return {
      publicLabel: 'needs_verification',
      label: getPublicTrustLabelText('needs_verification'),
      shortReason: hasConflict
        ? '검수 메타와 외부 신호가 엇갈려 재확인이 필요해요.'
        : isStale
          ? '검수 기준일이 오래돼 다시 확인이 필요해요.'
          : !hasFreshnessBasis
            ? '검수 기준일이 없어 공적 라벨을 더 올리지 않았어요.'
          : !hasEvidence
            ? '검수 메타는 있지만 공개 라벨을 올릴 근거가 아직 부족해요.'
            : '서비스 메타는 있지만 확정 검수 단계는 아니에요.',
      description:
        '서비스 메타가 있어도 기준일, 근거, 외부 신호가 충분히 맞지 않으면 더 보수적인 라벨을 유지해요.',
      guidance: '실제 방문 전 반려동물 동반 조건을 다시 확인해 주세요.',
      tone: 'caution',
      sourceLabel: '서비스 메타',
      basisDate: serviceMeta.lastVerifiedAt,
      basisDateLabel: buildTrustBasisDateLabel(
        serviceMeta.lastVerifiedAt,
        '기준일',
      ),
      isStale,
      hasConflict,
      layers,
    };
  }

  if (candidate.hasKeywordEvidence) {
    return {
      publicLabel: 'needs_verification',
      label: getPublicTrustLabelText('needs_verification'),
      shortReason: '펫 관련 키워드가 잡힌 외부 후보예요.',
      description:
        '외부 원본만으로는 실제 동반 가능 여부를 확정할 수 없어요.',
      guidance: '실제 방문 전 반려동물 동반 조건을 다시 확인해 주세요.',
      tone: 'caution',
      sourceLabel: 'Kakao Local 후보',
      basisDate: null,
      basisDateLabel: null,
      isStale: false,
      hasConflict: false,
      layers,
    };
  }

  return {
    publicLabel: 'candidate',
    label: getPublicTrustLabelText('candidate'),
    shortReason: '검증 근거가 부족한 외부 후보예요.',
    description:
      '후보는 보이지만 공적 검수 정보가 없어 신뢰 라벨을 올리지 않았어요.',
    guidance: '실제 방문 전 반려동물 동반 조건을 다시 확인해 주세요.',
    tone: 'neutral',
    sourceLabel: 'Kakao Local 후보',
    basisDate: null,
    basisDateLabel: null,
    isStale: false,
    hasConflict: false,
    layers,
  };
}

function toWalkItem(
  document: KakaoPlaceDocument,
  distanceReferenceCoordinates: DeviceCoordinates | null,
  distanceLabel: string,
): LocationDiscoveryItem | null {
  const latitude = parseCoordinate(document.y);
  const longitude = parseCoordinate(document.x);
  const name = document.place_name?.trim() || '';
  const address =
    document.road_address_name?.trim() || document.address_name?.trim() || '';

  if (!latitude || !longitude || !name || !address) {
    return null;
  }

  const distanceMeters = parseDistanceMeters(
    document.distance,
    distanceReferenceCoordinates,
    latitude,
    longitude,
  );

  return {
    id: document.id?.trim() || `${name}:${latitude}:${longitude}`,
    domain: 'walk',
    kind: 'walk-spot',
    name,
    description: buildWalkDescription(document),
    categoryLabel:
      document.category_group_name?.trim() ||
      document.category_name?.split('>').pop()?.trim() ||
      '산책 장소',
    address,
    roadAddress: document.road_address_name?.trim() || null,
    distanceMeters,
    distanceLabel,
    estimatedMinutes: estimateWalkMinutes(distanceMeters),
    latitude,
    longitude,
    placeUrl: document.place_url?.trim() || null,
    phone: document.phone?.trim() || null,
    operatingStatusLabel: null,
    source: {
      provider: 'kakao',
      providerLabel: 'Kakao Local',
      type: 'external-api',
      externalPlaceId: document.id?.trim() || null,
    },
    verification: buildWalkVerification(),
    publicTrust: buildWalkPublicTrust(),
    userLayer: {
      targetId: null,
      supportsBookmark: false,
      supportsReport: false,
    },
    petPolicy: {
      summaryLabel: null,
      detail: null,
    },
    thumbnailUrl: null,
    coordinateLabel: formatCoordinateLabel(latitude, longitude),
    mapPreviewUrl: buildStaticMapPreviewUrl({ latitude, longitude }),
  };
}

function toNormalizedPetFriendlyCandidate(
  document: KakaoPlaceDocument,
  distanceReferenceCoordinates: DeviceCoordinates | null,
  distanceLabel: string,
): NormalizedPetFriendlyCandidate | null {
  const latitude = parseCoordinate(document.y);
  const longitude = parseCoordinate(document.x);
  const name = document.place_name?.trim() || '';
  const address =
    document.road_address_name?.trim() || document.address_name?.trim() || '';

  if (!latitude || !longitude || !name || !address) {
    return null;
  }

  const kind = inferPetFriendlyPlaceKind(document);
  const categoryLabel =
    document.category_name?.split('>').pop()?.trim() ||
    document.category_group_name?.trim() ||
    '펫동반 장소';
  const keywordHaystack = `${name} ${categoryLabel} ${
    document.category_name ?? ''
  } ${document.category_group_name ?? ''}`;

  return {
    id: document.id?.trim() || `${name}:${latitude}:${longitude}`,
    domain: 'pet-friendly-place',
    kind,
    name,
    description: buildPetFriendlyDescription(document, kind),
    categoryLabel,
    address,
    roadAddress: document.road_address_name?.trim() || null,
    distanceMeters: parseDistanceMeters(
      document.distance,
      distanceReferenceCoordinates,
      latitude,
      longitude,
    ),
    distanceLabel,
    estimatedMinutes: null,
    latitude,
    longitude,
    placeUrl: document.place_url?.trim() || null,
    phone: document.phone?.trim() || null,
    coordinateLabel: formatCoordinateLabel(latitude, longitude),
    externalPlaceId: document.id?.trim() || null,
    hasKeywordEvidence: matchesPositiveKeyword(keywordHaystack, PET_POSITIVE_KEYWORDS),
  };
}

function mergePetFriendlyCandidate(
  candidate: NormalizedPetFriendlyCandidate,
  document: KakaoPlaceDocument,
  serviceMeta: PetFriendlyPlaceServiceMeta | undefined,
): LocationDiscoveryItem {
  const verificationStatus =
    serviceMeta?.verificationStatus ??
    (candidate.hasKeywordEvidence ? 'keyword-inferred' : 'unknown');
  const sourceType = serviceMeta ? 'service-meta' : 'external-only';
  const verification = buildPetFriendlyVerification(
    verificationStatus,
    sourceType,
  );
  const publicTrust = buildPetFriendlyPublicTrust({
    candidate,
    serviceMeta,
  });

  return {
    id: candidate.id,
    domain: candidate.domain,
    kind: candidate.kind,
    name: candidate.name,
    description: candidate.description,
    categoryLabel: candidate.categoryLabel,
    address: candidate.address,
    roadAddress: candidate.roadAddress,
    distanceMeters: candidate.distanceMeters,
    distanceLabel: candidate.distanceLabel,
    estimatedMinutes: candidate.estimatedMinutes,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    placeUrl: candidate.placeUrl,
    phone: candidate.phone,
    operatingStatusLabel: serviceMeta?.operatingStatusLabel ?? null,
    source: {
      provider: serviceMeta ? 'supabase' : 'kakao',
      providerLabel: serviceMeta ? 'NURI 메타 + Kakao Local' : 'Kakao Local 후보',
      type: serviceMeta ? 'service-meta' : 'external-api',
      externalPlaceId: candidate.externalPlaceId,
    },
    verification,
    publicTrust,
    userLayer: {
      targetId: serviceMeta?.id ?? null,
      supportsBookmark: Boolean(serviceMeta?.id),
      supportsReport: Boolean(serviceMeta?.id),
    },
    petPolicy: {
      summaryLabel: getPetPolicySummaryLabel(verification.status),
      detail:
        serviceMeta?.petPolicyText ?? buildExternalPetPolicyNote(document),
    },
    thumbnailUrl: null,
    coordinateLabel: candidate.coordinateLabel,
    mapPreviewUrl: buildStaticMapPreviewUrl({
      latitude: candidate.latitude,
      longitude: candidate.longitude,
    }),
  };
}

function buildWalkQueries(input: LocationDiscoverySearchInput): string[] {
  const normalizedQuery = normalizeQuery(input.query);

  if (normalizedQuery) {
    return [normalizedQuery];
  }

  return [...WALK_BASE_KEYWORDS];
}

function buildPetFriendlyQueries(input: LocationDiscoverySearchInput): string[] {
  const normalizedQuery = normalizeQuery(input.query);
  if (normalizedQuery) {
    if (/(애견|반려|펫)/.test(normalizedQuery)) {
      return [normalizedQuery];
    }

    return [
      `애견동반 ${normalizedQuery}`,
      `반려동물 동반 ${normalizedQuery}`,
      normalizedQuery,
    ];
  }

  return [...PLACE_DEFAULT_QUERIES];
}

async function searchDocumentsByQueries(
  queries: ReadonlyArray<string>,
  coordinates: DeviceCoordinates | null,
  options: {
    radiusMeters: number;
    size: number;
    maxPages: number;
  },
): Promise<KakaoPlaceDocument[]> {
  const tasks = queries.flatMap(query =>
    Array.from({ length: options.maxPages }, (_, index) =>
      kakaoLocalSearchProvider.searchKeyword({
        query,
        coordinates,
        radiusMeters: options.radiusMeters,
        size: options.size,
        page: index + 1,
      }),
    ),
  );

  const responses = await Promise.all(tasks);
  return responses.flat();
}

function sortItems(items: ReadonlyArray<LocationDiscoveryItem>): LocationDiscoveryItem[] {
  return [...items].sort((left, right) => {
    const trustPriorityDiff =
      getPublicTrustPriority(left.publicTrust.publicLabel) -
      getPublicTrustPriority(right.publicTrust.publicLabel);
    if (trustPriorityDiff !== 0) {
      return trustPriorityDiff;
    }

    if (left.domain === 'walk' && right.domain === 'walk') {
      const leftPriority = getWalkPriority(left);
      const rightPriority = getWalkPriority(right);

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
    }

    if (
      left.domain === 'pet-friendly-place' &&
      right.domain === 'pet-friendly-place'
    ) {
      const leftPriority = getPetFriendlyPriority(left);
      const rightPriority = getPetFriendlyPriority(right);

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
    }

    const leftDistance = left.distanceMeters ?? Number.MAX_SAFE_INTEGER;
    const rightDistance = right.distanceMeters ?? Number.MAX_SAFE_INTEGER;
    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    return left.name.localeCompare(right.name, 'ko');
  });
}

function applyWalkExposureGuard(
  items: ReadonlyArray<LocationDiscoveryItem>,
  query: string | null | undefined,
): LocationDiscoveryItem[] {
  const queryIntent = getDiscoveryQueryIntent(query, WALK_BROAD_QUERY_KEYWORDS);
  const distanceCapMeters =
    queryIntent === 'none' ? 3200 : queryIntent === 'broad' ? 4500 : null;
  const itemCap =
    queryIntent === 'none' ? 8 : queryIntent === 'broad' ? 10 : 12;

  const distanceFiltered = items.filter((item, index) => {
    if (distanceCapMeters === null) {
      return true;
    }

    if (item.distanceMeters === null || item.distanceMeters <= distanceCapMeters) {
      return true;
    }

    return index < 3;
  });

  return distanceFiltered.slice(0, itemCap);
}

function applyPetFriendlyExposureGuard(
  items: ReadonlyArray<LocationDiscoveryItem>,
  query: string | null | undefined,
): LocationDiscoveryItem[] {
  const queryIntent = getDiscoveryQueryIntent(query, PLACE_BROAD_QUERY_KEYWORDS);
  const trustReviewed = items.filter(
    item => item.publicTrust.publicLabel === 'trust_reviewed',
  );
  const needsVerification = items.filter(
    item => item.publicTrust.publicLabel === 'needs_verification',
  );
  const candidates = items.filter(
    item => item.publicTrust.publicLabel === 'candidate',
  );
  const strongerCount = trustReviewed.length + needsVerification.length;

  const needsVerificationCap =
    queryIntent === 'none' ? 4 : queryIntent === 'broad' ? 5 : 6;
  const candidateCap =
    queryIntent === 'none'
      ? strongerCount > 0
        ? 1
        : 2
      : queryIntent === 'broad'
        ? strongerCount > 0
          ? 1
          : 2
        : strongerCount > 0
          ? 2
          : 3;

  return [
    ...trustReviewed,
    ...needsVerification.slice(0, needsVerificationCap),
    ...candidates.slice(0, candidateCap),
  ];
}

async function searchWalkLocations(
  input: LocationDiscoverySearchInput,
): Promise<LocationDiscoveryResponse> {
  const documents = await searchDocumentsByQueries(
    buildWalkQueries(input),
    input.scope.anchorCoordinates,
    {
      radiusMeters: input.scope.anchorCoordinates ? 5500 : 20000,
      size: DEFAULT_QUERY_PAGE_SIZE,
      maxPages: input.scope.anchorCoordinates ? 3 : 2,
    },
  );

  const items = applyWalkExposureGuard(
    sortItems(
      dedupeItems(
        documents
          .filter(filterWalkDocument)
          .map(document =>
            toWalkItem(document, input.scope.anchorCoordinates, input.scope.distanceLabel),
          )
          .filter((item): item is LocationDiscoveryItem => Boolean(item)),
      ),
    ),
    input.query,
  );

  return {
    items,
    query: normalizeQuery(input.query),
    source: 'kakao',
    verificationStatus: 'service-ranked',
    scope: input.scope,
  };
}

function getResponseVerificationStatus(
  items: ReadonlyArray<LocationDiscoveryItem>,
): Exclude<LocationDiscoveryVerificationStatus, 'service-ranked'> {
  if (items.some(item => item.verification.status === 'admin-verified')) {
    return 'admin-verified';
  }
  if (items.some(item => item.verification.status === 'user-reported')) {
    return 'user-reported';
  }
  if (items.some(item => item.verification.status === 'keyword-inferred')) {
    return 'keyword-inferred';
  }
  if (items.some(item => item.verification.status === 'rejected')) {
    return 'rejected';
  }
  return 'unknown';
}

async function searchPetFriendlyPlaces(
  input: LocationDiscoverySearchInput,
): Promise<LocationDiscoveryResponse> {
  const documents = await searchDocumentsByQueries(
    buildPetFriendlyQueries(input),
    input.scope.anchorCoordinates,
    {
      radiusMeters: input.scope.anchorCoordinates ? 4000 : 20000,
      size: 10,
      maxPages: input.scope.anchorCoordinates ? 2 : 1,
    },
  );

  const candidates = documents
    .filter(filterPetFriendlyDocument)
    .map(document => ({
      document,
      candidate: toNormalizedPetFriendlyCandidate(
        document,
        input.scope.anchorCoordinates,
        input.scope.distanceLabel,
      ),
    }))
    .filter(
      (
        entry,
      ): entry is {
        document: KakaoPlaceDocument;
        candidate: NormalizedPetFriendlyCandidate;
      } => Boolean(entry.candidate),
    );

  const serviceMetaMap = await loadPetFriendlyPlaceServiceMeta({
    provider: 'kakao',
    providerPlaceIds: candidates
      .map(({ candidate }) => candidate.externalPlaceId)
      .filter((value): value is string => Boolean(value)),
  });
  const hasExplicitQuery = Boolean(normalizeQuery(input.query));

  const items = applyPetFriendlyExposureGuard(
    sortItems(
      dedupeItems(
        candidates
          .filter(({ candidate }) => {
            const serviceMeta = candidate.externalPlaceId
              ? serviceMetaMap.get(
                  buildPetPlaceSourceLookupKey('kakao', candidate.externalPlaceId),
                )
              : undefined;

            if (hasExplicitQuery) {
              return true;
            }

            return candidate.hasKeywordEvidence || Boolean(serviceMeta);
          })
          .map(({ document, candidate }) =>
            mergePetFriendlyCandidate(
              candidate,
              document,
              candidate.externalPlaceId
                ? serviceMetaMap.get(
                    buildPetPlaceSourceLookupKey('kakao', candidate.externalPlaceId),
                  )
                : undefined,
            ),
          ),
      ),
    ),
    input.query,
  );

  return {
    items,
    query: normalizeQuery(input.query),
    source: 'kakao',
    verificationStatus: getResponseVerificationStatus(items),
    scope: input.scope,
  };
}

export async function searchLocationDiscovery(
  domain: LocationDiscoveryDomain,
  input: LocationDiscoverySearchInput,
): Promise<LocationDiscoveryResponse> {
  if (!normalizeQuery(input.query) && !input.scope.anchorCoordinates) {
    return {
      items: [],
      query: null,
      source: 'kakao',
      verificationStatus: domain === 'walk' ? 'service-ranked' : 'unknown',
      scope: input.scope,
    };
  }

  if (domain === 'walk') {
    return searchWalkLocations(input);
  }

  return searchPetFriendlyPlaces(input);
}

export function formatDistanceLabel(distanceMeters: number | null): string {
  if (distanceMeters === null) return '거리 확인 중';
  if (distanceMeters < 1000) return `${distanceMeters}m`;
  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

export function formatDurationLabel(minutes: number | null): string | null {
  if (minutes === null) return null;
  return `약 ${minutes}분`;
}
