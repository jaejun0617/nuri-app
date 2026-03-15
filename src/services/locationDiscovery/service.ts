import type { DeviceCoordinates } from '../location/currentPosition';
import { buildStaticMapPreviewUrl } from './maps';
import { kakaoLocalSearchProvider } from './kakaoLocal';
import type {
  KakaoPlaceDocument,
  LocationDiscoveryDomain,
  LocationDiscoveryItem,
  LocationDiscoveryResponse,
  LocationDiscoverySearchInput,
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
const PLACE_DEFAULT_QUERIES = ['애견동반 카페', '애견동반 식당'] as const;
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

function normalizeQuery(value: string | null | undefined): string | null {
  const normalized = (value ?? '').trim().replace(/\s+/g, ' ');
  return normalized || null;
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
  const area = document.road_address_name?.trim() || document.address_name?.trim() || '';
  if (!area) {
    return `${category} 주변을 가볍게 둘러보기 좋아요.`;
  }
  return `${area} 근처에서 ${category} 분위기를 느끼며 걷기 좋아요.`;
}

function buildPetFriendlyNotice(document: KakaoPlaceDocument): string {
  const category =
    document.category_name?.split('>').pop()?.trim() ||
    document.category_group_name?.trim() ||
    '매장';
  return `${category} 방문 전 실제 반려동물 동반 가능 여부를 꼭 다시 확인해 주세요.`;
}

function matchesPositiveKeyword(value: string, keywords: ReadonlyArray<string>): boolean {
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

function dedupeItems(items: ReadonlyArray<LocationDiscoveryItem>): LocationDiscoveryItem[] {
  const map = new Map<string, LocationDiscoveryItem>();

  items.forEach(item => {
    const key = item.id || `${item.name}:${item.latitude.toFixed(5)}:${item.longitude.toFixed(5)}`;
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

function toWalkItem(
  document: KakaoPlaceDocument,
  distanceReferenceCoordinates: DeviceCoordinates | null,
  distanceLabel: string,
): LocationDiscoveryItem | null {
  const latitude = parseCoordinate(document.y);
  const longitude = parseCoordinate(document.x);
  const name = document.place_name?.trim() || '';
  const address = document.road_address_name?.trim() || document.address_name?.trim() || '';

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
    petNotice: null,
    mapPreviewUrl: buildStaticMapPreviewUrl({ latitude, longitude }),
  };
}

function toPetFriendlyPlaceItem(
  document: KakaoPlaceDocument,
  distanceReferenceCoordinates: DeviceCoordinates | null,
  distanceLabel: string,
): LocationDiscoveryItem | null {
  const latitude = parseCoordinate(document.y);
  const longitude = parseCoordinate(document.x);
  const name = document.place_name?.trim() || '';
  const address = document.road_address_name?.trim() || document.address_name?.trim() || '';

  if (!latitude || !longitude || !name || !address) {
    return null;
  }

  return {
    id: document.id?.trim() || `${name}:${latitude}:${longitude}`,
    domain: 'pet-friendly-place',
    name,
    description: `${address} 주변에서 쉬어가기 좋은 펫동반 장소예요.`,
    categoryLabel:
      document.category_name?.split('>').pop()?.trim() ||
      document.category_group_name?.trim() ||
      '펫동반 장소',
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
    petNotice: buildPetFriendlyNotice(document),
    mapPreviewUrl: buildStaticMapPreviewUrl({ latitude, longitude }),
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
    return [`애견동반 ${normalizedQuery}`, normalizedQuery];
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
    if (left.domain === 'walk' && right.domain === 'walk') {
      const leftPriority = getWalkPriority(left);
      const rightPriority = getWalkPriority(right);

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

  const items = sortItems(
    dedupeItems(
      documents
        .filter(filterWalkDocument)
        .map(document =>
          toWalkItem(document, input.scope.anchorCoordinates, input.scope.distanceLabel),
        )
        .filter((item): item is LocationDiscoveryItem => Boolean(item)),
    ),
  );

  return {
    items,
    query: normalizeQuery(input.query),
    source: 'kakao',
    verificationStatus: 'verified',
    scope: input.scope,
  };
}

async function searchPetFriendlyPlaces(
  input: LocationDiscoverySearchInput,
): Promise<LocationDiscoveryResponse> {
  const documents = await searchDocumentsByQueries(
    buildPetFriendlyQueries(input),
    input.scope.anchorCoordinates,
    {
      radiusMeters: 3500,
      size: 10,
      maxPages: 1,
    },
  );

  const items = sortItems(
    dedupeItems(
      documents
        .map(document =>
          toPetFriendlyPlaceItem(
            document,
            input.scope.anchorCoordinates,
            input.scope.distanceLabel,
          ),
        )
        .filter((item): item is LocationDiscoveryItem => Boolean(item)),
    ),
  );

  return {
    items,
    query: normalizeQuery(input.query),
    source: 'kakao',
    verificationStatus: 'unverified',
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
      verificationStatus: domain === 'walk' ? 'verified' : 'unverified',
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
