// 파일: src/services/petTravel/api.ts
// 파일 목적:
// - `반려동물과 여행` 도메인의 TourAPI 연동과 후보 정제 로직을 담당한다.
// 어디서 쓰이는지:
// - PetTravelListScreen, PetTravelDetailScreen, 관련 테스트 코드에서 사용된다.
// 핵심 역할:
// - `KorPetTourService2`의 리스트/검색/상세 API를 호출하고, 지역 intent와 카테고리 조건에 맞는 후보를 만든다.
// - `placeType`, `petAllowed`, score breakdown을 계산해 화면이 바로 쓸 수 있는 여행 후보 모델을 반환한다.
// 데이터·상태 흐름:
// - 현재 런타임은 TourAPI 후보를 기본으로 만들고, 있으면 trust layer를 read-only로 붙여 public label을 더 보수적으로 재결정한다.
// - 리스트와 상세는 모두 이 파일을 거치며, 화면은 외부 API 스키마 대신 내부 `PetTravelItem/Detail` 타입만 사용한다.
// 수정 시 주의:
// - raw 문구나 정규식만으로 `confirmed`를 열지 않는 것이 현재 운영 원칙이다.
// - 지역 intent, commercial penalty, pet score 규칙은 검색 품질과 신뢰도에 직결되므로 예외처리 추가보다 전체 규칙 기준으로 수정해야 한다.
import { TOUR_API_SERVICE_KEY } from '../../config/runtime';
import type { PublicTrustInfo } from '../trust/publicTrust';
import {
  buildTrustBasisDateLabel,
  canKeepTrustReviewed,
  getPublicTrustLabelText,
  getPublicTrustPriority,
  hasAnyTrustEvidence,
  hasTrustBasisDate,
  isTrustDateStale,
} from '../trust/publicTrust';
import {
  loadPetTravelTrustSnapshotsBySourceIds,
  type PetTravelTrustPlaceSnapshot,
  type PetTravelTrustPolicySnapshot,
} from '../supabase/petTravelTrust';
import {
  getPetTravelCategoryById,
  resolvePetTravelRegionIntent,
} from './catalog';
import type {
  PetTravelCategory,
  PetTravelDetail,
  PetTravelItem,
  PetTravelListResult,
  PetTravelPetPolicy,
  PetTravelPlaceType,
  PetTravelRegion,
  PetTravelRegionIntent,
  PetTravelScoreBreakdown,
} from './types';

type JsonRecord = Record<string, unknown>;

type TourApiEndpoint =
  | 'areaBasedList2'
  | 'searchKeyword2'
  | 'detailCommon2'
  | 'detailIntro2'
  | 'detailPetTour2';

type TourApiQueryInput = {
  endpoint: string;
  params: Record<string, string | number | null | undefined>;
};

type FetchListInput = {
  searchKeyword: string;
  categoryId: PetTravelCategory['id'];
  page?: number;
  size?: number;
};

type FetchDetailInput = {
  item: PetTravelItem;
};

const TOUR_API_PROVIDER_LABEL = '한국관광공사 반려동물 동반여행 서비스';
const TOUR_API_BASE_URL = 'https://apis.data.go.kr/B551011';
const TOUR_API_SERVICE_NAME = 'KorPetTourService2';
const TOUR_API_AREA_ENDPOINT: TourApiEndpoint = 'areaBasedList2';
const TOUR_API_SEARCH_ENDPOINT: TourApiEndpoint = 'searchKeyword2';
const TOUR_API_DETAIL_COMMON_ENDPOINT: TourApiEndpoint = 'detailCommon2';
const TOUR_API_DETAIL_INTRO_ENDPOINT: TourApiEndpoint = 'detailIntro2';
const TOUR_API_DETAIL_PET_ENDPOINT: TourApiEndpoint = 'detailPetTour2';
const PET_TRAVEL_CONTENT_TYPE_WHITELIST = new Set([
  '12', // 관광지
  '14', // 문화시설
  '15', // 축제/공연/행사
  '28', // 레포츠
  '32', // 숙박
  '39', // 음식점
]);
const PET_NOTICE_KEYS = [
  'acmpyPsblCpam',
  'petTursmInfo',
  'etcAcmpyInfo',
  'relaAcdntRiskMtr',
  'relaPosesFclty',
  'relaFrnshPrdlst',
  'petInfo',
  'infoCenter',
] as const;
const FACILITY_KEYS = [
  'relaPosesFclty',
  'relaFrnshPrdlst',
  'acmpyNeedMtr',
  'sbrsCl',
  'infoCenter',
] as const;
const USAGE_KEYS = ['usetime', 'infocenter', 'chkpet', 'expguide'] as const;
const REST_DATE_KEYS = ['restdate', 'restdatefood', 'reservationlodging'] as const;
const PARKING_KEYS = ['parking', 'parkingfood'] as const;
const OPERATING_KEYS = ['usetime', 'opendate', 'openperiod', 'infocenter'] as const;
const TRAVEL_POSITIVE_PATTERNS = [
  /공원/,
  /수목원/,
  /정원/,
  /식물원/,
  /박물관/,
  /미술관/,
  /전시관/,
  /기념관/,
  /문학관/,
  /해변/,
  /호수/,
  /습지/,
  /휴양림/,
  /둘레길/,
  /산책로/,
  /전망대/,
  /마을/,
  /농원/,
  /목장/,
  /테마파크/,
  /유원지/,
  /펜션/,
  /리조트/,
  /호텔/,
  /한옥/,
  /캠핑/,
  /오토캠핑/,
] as const;
const PET_POSITIVE_PATTERNS = [
  /애견카페/,
  /반려견카페/,
  /애견운동장/,
  /도그런/,
  /도그파크/,
  /반려견동반/,
  /펫동반/,
  /애견동반/,
  /펫파크/,
  /펫놀이터/,
  /반려견놀이터/,
] as const;
const TRAVEL_SHOPPING_ALLOW_PATTERNS = [
  /시장/,
  /전통시장/,
  /특화거리/,
  /공예/,
  /공방/,
  /기념품/,
] as const;
const COMMERCIAL_EXCLUDE_PATTERNS = [
  /약국/,
  /안경원/,
  /의원/,
  /병원/,
  /쇼핑몰/,
  /몰/,
  /백화점/,
  /면세점/,
  /플래그십/,
  /브랜드/,
  /아울렛/,
  /스토어/,
  /메가스토어/,
  /마트/,
  /하이마트/,
  /핸드백/,
  /남성/,
  /여성/,
  /매장/,
  /직영점/,
  /센터/,
  /타운/,
  /퍼포먼스/,
  /올리브영/,
  /뉴코아/,
] as const;
const PET_CONFIRMED_PATTERNS = [
  /반려동물\s*동반\s*가능/,
  /애견\s*동반\s*가능/,
  /반려견\s*동반\s*가능/,
  /반려동물\s*입장\s*가능/,
  /애견\s*입장\s*가능/,
  /동반\s*가능/,
] as const;
const PET_NEGATIVE_PATTERNS = [
  /동반\s*불가/,
  /출입\s*불가/,
  /입장\s*불가/,
  /제한/,
  /문의/,
] as const;
const PET_CHECK_REQUIRED_PATTERNS = [
  /현장/,
  /사전문의/,
  /문의/,
  /정책/,
  /확인/,
] as const;
const BROAD_TRAVEL_QUERY_KEYWORDS = [
  '여행',
  '숙소',
  '호텔',
  '펜션',
  '리조트',
  '맛집',
  '식당',
  '카페',
  '공원',
  '해변',
  '바다',
  '캠핑',
  '산책',
  '체험',
  '박물관',
  '애견',
  '반려',
  '강아지',
  '펫',
  '동반',
] as const;

type PetTravelQueryIntent = 'none' | 'region-only' | 'broad' | 'specific';

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return trimmed ? trimmed : null;
}

function getPetTravelQueryIntent(
  keyword: string,
  regionIntent: PetTravelRegionIntent | null,
): PetTravelQueryIntent {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) {
    return 'none';
  }

  if (regionIntent?.isRegionOnlyQuery) {
    return 'region-only';
  }

  const tokens = trimmedKeyword
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean);

  const isBroad = tokens.some(token => {
    if (token.length <= 4) {
      return true;
    }

    return BROAD_TRAVEL_QUERY_KEYWORDS.some(
      keywordText =>
        token.includes(keywordText) || keywordText.includes(token),
    );
  });

  return isBroad ? 'broad' : 'specific';
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value == null ? [] : [value];
}

function joinTruthyLines(values: ReadonlyArray<string | null>): string | null {
  const filtered = values.filter((value): value is string => Boolean(value));
  if (!filtered.length) {
    return null;
  }

  return filtered.join('\n');
}

function pickStringFields(record: JsonRecord, keys: ReadonlyArray<string>): string[] {
  return keys
    .map(key => normalizeString(record[key]))
    .filter((value): value is string => Boolean(value));
}

function buildTourApiUrl(input: TourApiQueryInput): string {
  const params = new URLSearchParams();
  params.set('serviceKey', TOUR_API_SERVICE_KEY);
  params.set('MobileOS', 'ETC');
  params.set('MobileApp', 'NURI');
  params.set('_type', 'json');

  Object.entries(input.params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && `${value}`.trim() !== '') {
      params.set(key, String(value));
    }
  });

  return `${TOUR_API_BASE_URL}/${input.endpoint}?${params.toString()}`;
}

function buildLiveFailureMessage(errorDetail: string): string {
  return `TourAPI 실시간 응답을 확인하지 못했어요. 공식 KorPetTourService2 호출이 실패했어요. (${errorDetail})`;
}

function readTourApiItems(json: unknown): { items: JsonRecord[]; totalCount: number } {
  if (!isRecord(json)) {
    throw new Error('TourAPI 응답 형식이 올바르지 않아요.');
  }

  const response = json.response;
  if (!isRecord(response)) {
    throw new Error('TourAPI 응답 본문이 비어 있어요.');
  }

  const header = response.header;
  if (isRecord(header)) {
    const resultCode = normalizeString(header.resultCode);
    if (resultCode && resultCode !== '0000') {
      throw new Error(
        normalizeString(header.resultMsg) ??
          'TourAPI 요청을 처리하지 못했어요.',
      );
    }
  }

  const body = response.body;
  if (!isRecord(body)) {
    return { items: [], totalCount: 0 };
  }

  const totalCount = toFiniteNumber(body.totalCount) ?? 0;
  const items = body.items;
  if (!isRecord(items)) {
    return { items: [], totalCount };
  }

  const rawItem = items.item;
  return {
    items: toArray(rawItem).filter(isRecord),
    totalCount,
  };
}

async function fetchTourApiJson(
  endpoint: TourApiEndpoint,
  params: Record<string, string | number | null | undefined>,
): Promise<unknown> {
  if (!TOUR_API_SERVICE_KEY) {
    throw new Error(
      'TourAPI 서비스 키가 없어 반려동물과 여행 데이터를 불러올 수 없어요.',
    );
  }

  const qualifiedEndpoint = `${TOUR_API_SERVICE_NAME}/${endpoint}`;

  try {
    const response = await fetch(
      buildTourApiUrl({ endpoint: qualifiedEndpoint, params }),
    );
    if (!response.ok) {
      throw new Error(`${qualifiedEndpoint}:${response.status}`);
    }

    const json = (await response.json()) as unknown;
    readTourApiItems(json);
    return json;
  } catch (error) {
    throw new Error(
      buildLiveFailureMessage(
        error instanceof Error ? error.message : 'unknown-error',
      ),
    );
  }
}

function inferCategoryId(
  contentTypeId: string,
  categoryLabel: string | null,
): PetTravelCategory['id'] {
  if (contentTypeId === '32') {
    return 'stay';
  }
  if (contentTypeId === '39') {
    return 'restaurant';
  }
  if (contentTypeId === '28') {
    return 'experience';
  }

  const haystack = `${categoryLabel ?? ''}`.toLowerCase();
  if (haystack.includes('야외') || haystack.includes('공원') || haystack.includes('해변')) {
    return 'outdoor';
  }

  return 'attraction';
}

function getCategoryLabel(
  categoryId: PetTravelCategory['id'],
  rawCategoryLabel: string | null,
): string {
  return rawCategoryLabel ?? getPetTravelCategoryById(categoryId)?.label ?? '여행지';
}

function normalizeAddress(record: JsonRecord): string {
  const addr1 = normalizeString(record.addr1);
  const addr2 = normalizeString(record.addr2);
  return joinTruthyLines([addr1, addr2]) ?? '주소 확인 필요';
}

function buildFacilityHighlights(record: JsonRecord): string[] {
  const values = pickStringFields(record, FACILITY_KEYS)
    .flatMap(value =>
      value
        .split(/[,\n/]/)
        .map(token => token.trim())
        .filter(Boolean),
    )
    .slice(0, 4);

  return [...new Set(values)];
}

function buildPetNotice(record: JsonRecord): string {
  const raw = joinTruthyLines(pickStringFields(record, PET_NOTICE_KEYS));
  if (!raw) {
    return '상세 반려동물 동반 조건은 현장 정책을 다시 확인해 주세요.';
  }

  const lines = raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const unique = [...new Set(lines)];
  return unique.join('\n');
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function hasAnyPattern(
  value: string,
  patterns: ReadonlyArray<RegExp>,
): boolean {
  return patterns.some(pattern => pattern.test(value));
}

function matchesRegionScope(
  item: PetTravelItem,
  region: PetTravelRegion,
): boolean {
  if (region.id === 'all') {
    return true;
  }

  const address = item.address;
  const title = item.name;

  if (region.scope === 'broad') {
    return region.addressKeywords.some(keyword => address.includes(keyword));
  }

  return region.addressKeywords.some(keyword => address.includes(keyword)) ||
    (title.includes(region.label) &&
      region.addressKeywords.some(keyword => title.includes(keyword)));
}

function isRegionIntentAllCandidate(item: PetTravelItem): boolean {
  if (item.source.contentTypeId === '38' || item.source.contentTypeId === '39') {
    return false;
  }

  switch (item.placeType) {
    case 'travel-attraction':
    case 'outdoor':
    case 'stay':
    case 'experience':
    case 'pet-venue':
      return true;
    default:
      return false;
  }
}

function getPlaceType(
  contentTypeId: string,
  categoryId: PetTravelCategory['id'],
  title: string,
  categoryLabel: string,
): PetTravelPlaceType {
  const combinedText = `${title} ${categoryLabel}`;

  if (contentTypeId === '38') {
    return hasAnyPattern(combinedText, TRAVEL_SHOPPING_ALLOW_PATTERNS)
      ? 'mixed'
      : 'shopping';
  }
  if (hasAnyPattern(combinedText, PET_POSITIVE_PATTERNS)) {
    return 'pet-venue';
  }
  if (contentTypeId === '32') {
    return 'stay';
  }
  if (contentTypeId === '39') {
    return 'restaurant';
  }
  if (contentTypeId === '28') {
    return 'experience';
  }
  if (categoryId === 'outdoor' || hasAnyPattern(combinedText, [/공원/, /해변/, /수목원/, /호수/, /휴양림/])) {
    return 'outdoor';
  }

  return 'travel-attraction';
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function buildPetPolicy(record: JsonRecord, title: string): PetTravelPetPolicy {
  const petNotice = buildPetNotice(record);
  const combinedText = `${title}\n${petNotice}`;
  const evidence: PetTravelPetPolicy['evidence'][number][] = [];
  const explicitPositive =
    hasAnyPattern(petNotice, PET_CONFIRMED_PATTERNS) &&
    !hasAnyPattern(petNotice, PET_NEGATIVE_PATTERNS);
  const explicitNegative = hasAnyPattern(petNotice, PET_NEGATIVE_PATTERNS);
  const petVenueSignal = hasAnyPattern(combinedText, PET_POSITIVE_PATTERNS);
  const checkRequiredSignal = hasAnyPattern(petNotice, PET_CHECK_REQUIRED_PATTERNS);

  if (explicitPositive) {
    evidence.push({
      source: 'tour-api-raw' as const,
      label: 'TourAPI 동반 문구',
      detail: 'TourAPI 상세 문구에 동반 가능 표현이 포함됨',
    });
  }
  if (petVenueSignal) {
    evidence.push({
      source: 'tour-api-raw' as const,
      label: '펫 친화 키워드',
      detail: '장소명 또는 안내 문구에 펫 친화 키워드가 포함됨',
    });
  }
  if (explicitNegative) {
    evidence.push({
      source: 'tour-api-raw' as const,
      label: '제한/문의 문구',
      detail: '제한 또는 현장 문의 문구가 함께 포함됨',
    });
  }

  if (explicitNegative) {
    return {
      status: 'unknown',
      trustStage: 'candidate-layer',
      petAllowed: 'check-required',
      confidence: clampScore(checkRequiredSignal ? 0.2 : 0.1),
      requiresOnsiteCheck: true,
      evidence,
    };
  }

  if (explicitPositive || petVenueSignal) {
    return {
      status: 'tour-api-positive',
      trustStage: 'candidate-layer',
      petAllowed: 'possible',
      confidence: clampScore(explicitPositive ? 0.62 : 0.42),
      requiresOnsiteCheck: true,
      evidence,
    };
  }

  return {
    status: 'unknown',
    trustStage: 'candidate-layer',
    petAllowed: 'check-required',
    confidence: clampScore(checkRequiredSignal ? 0.18 : 0.08),
    requiresOnsiteCheck: true,
    evidence:
      evidence.length > 0
        ? evidence
        : [
            {
              source: 'tour-api-raw',
              label: '확정 근거 부족',
              detail: 'TourAPI 원문만으로는 펫 동반 허용을 확정할 수 없음',
            },
          ],
  };
}

function getPolicySourcePriority(policy: PetTravelTrustPolicySnapshot): number {
  switch (policy.sourceType) {
    case 'admin-review':
      return 0;
    case 'user-report':
      return 1;
    case 'tour-api':
      return 2;
    case 'system-inference':
    default:
      return 3;
  }
}

function sortTrustPolicies(
  left: PetTravelTrustPolicySnapshot,
  right: PetTravelTrustPolicySnapshot,
): number {
  const sourcePriorityDiff =
    getPolicySourcePriority(left) - getPolicySourcePriority(right);
  if (sourcePriorityDiff !== 0) {
    return sourcePriorityDiff;
  }

  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
}

function pickPrimaryTrustPolicy(
  trustSnapshot: PetTravelTrustPlaceSnapshot | null,
): PetTravelTrustPolicySnapshot | null {
  const policies = trustSnapshot?.activePolicies ?? [];
  if (!policies.length) {
    return null;
  }

  return [...policies].sort(sortTrustPolicies)[0] ?? null;
}

function hasPetTravelTrustConflict(params: {
  petPolicy: PetTravelPetPolicy;
  trustSnapshot: PetTravelTrustPlaceSnapshot | null;
}): boolean {
  const { petPolicy, trustSnapshot } = params;
  const policies = trustSnapshot?.activePolicies ?? [];
  if (!policies.length) {
    return false;
  }

  const distinctStatuses = new Set(policies.map(policy => policy.policyStatus));
  if (distinctStatuses.size > 1) {
    return true;
  }

  const primaryPolicy = pickPrimaryTrustPolicy(trustSnapshot);
  if (!primaryPolicy) {
    return false;
  }

  if (
    petPolicy.petAllowed === 'possible' &&
    (primaryPolicy.policyStatus === 'restricted' ||
      primaryPolicy.policyStatus === 'not_allowed')
  ) {
    return true;
  }

  return (
    primaryPolicy.sourceType === 'admin-review' &&
    primaryPolicy.policyStatus === 'allowed' &&
    petPolicy.petAllowed !== 'possible'
  );
}

function buildPetTravelPublicTrust(params: {
  petPolicy: PetTravelPetPolicy;
  sourceUpdatedAt: string | null;
  trustSnapshot: PetTravelTrustPlaceSnapshot | null;
}): PublicTrustInfo {
  const { petPolicy, sourceUpdatedAt, trustSnapshot } = params;
  const primaryPolicy = pickPrimaryTrustPolicy(trustSnapshot);
  const hasTrust = Boolean(trustSnapshot && trustSnapshot.activePolicies.length > 0);
  const layers: Array<'candidate' | 'trust' | 'user'> = ['candidate'];

  if (hasTrust) {
    layers.push('trust');
  }
  if (
    trustSnapshot?.activePolicies.some(policy => policy.sourceType === 'user-report')
  ) {
    layers.push('user');
  }

  const trustBasisDate = primaryPolicy?.updatedAt ?? null;
  const isStale = isTrustDateStale(trustBasisDate);
  const hasConflict = hasPetTravelTrustConflict({
    petPolicy,
    trustSnapshot,
  });
  const hasEvidence = hasAnyTrustEvidence({
    summaryText: primaryPolicy?.evidenceSummary,
    noteText: primaryPolicy?.policyNote,
    payload: primaryPolicy?.evidencePayload ?? null,
  });
  const hasFreshnessBasis = hasTrustBasisDate(trustBasisDate);
  const canPublishTrustReviewed = canKeepTrustReviewed({
    isAdminReviewed:
      primaryPolicy?.sourceType === 'admin-review' &&
      primaryPolicy.policyStatus === 'allowed',
    basisDate: trustBasisDate,
    hasConflict,
    requiresOnsiteCheck: primaryPolicy?.requiresOnsiteCheck ?? false,
    hasEvidence,
  });

  if (canPublishTrustReviewed && primaryPolicy) {
    return {
      publicLabel: 'trust_reviewed',
      label: getPublicTrustLabelText('trust_reviewed'),
      shortReason: '운영 검수 이력이 반영된 여행지예요.',
      description:
        '검수 메타를 참고한 정보지만 외부 원본과 실제 현장 정책은 달라질 수 있어요.',
      guidance: '실제 방문 전 반려동물 동반 조건을 다시 확인해 주세요.',
      tone: 'positive',
      sourceLabel: '운영 검수',
      basisDate: trustBasisDate,
      basisDateLabel: buildTrustBasisDateLabel(trustBasisDate, '검수 기준일'),
      isStale: false,
      hasConflict,
      layers,
    };
  }

  if (
    primaryPolicy &&
    (primaryPolicy.policyStatus === 'restricted' ||
      primaryPolicy.policyStatus === 'not_allowed')
  ) {
    return {
      publicLabel: 'needs_verification',
      label: getPublicTrustLabelText('needs_verification'),
      shortReason: '제한 또는 불가 이력이 있어 재확인이 필요해요.',
      description:
        '외부 원본과 정책 메타가 다를 수 있어 가장 보수적인 라벨을 유지해요.',
      guidance: '실제 방문 전 운영 정책을 직접 확인해 주세요.',
      tone: primaryPolicy.policyStatus === 'not_allowed' ? 'critical' : 'caution',
      sourceLabel:
        primaryPolicy.sourceType === 'admin-review' ? '운영 검수' : '정책 메타',
      basisDate: trustBasisDate,
      basisDateLabel: buildTrustBasisDateLabel(trustBasisDate, '정책 기준일'),
      isStale,
      hasConflict,
      layers,
    };
  }

  if (primaryPolicy) {
    return {
      publicLabel: 'needs_verification',
      label: getPublicTrustLabelText('needs_verification'),
      shortReason:
        primaryPolicy.sourceType === 'user-report'
          ? '사용자 제보가 있지만 운영 확정 단계는 아니에요.'
          : hasConflict
            ? '검수 메타와 외부 원본이 엇갈려 재확인이 필요해요.'
            : isStale
              ? '검수 또는 정책 기준일이 오래돼 최신 여부를 다시 확인해야 해요.'
              : !hasFreshnessBasis
                ? '정책 기준일이 없어 공개 라벨을 더 올리지 않았어요.'
              : primaryPolicy.requiresOnsiteCheck
                ? '검수 이력이 있어도 현장 확인이 필요한 상태예요.'
                : !hasEvidence
                  ? '정책 메타는 있지만 공개 라벨을 올릴 근거가 아직 부족해요.'
                  : '정책 메타는 있지만 확정 문구를 열 수 있는 단계는 아니에요.',
      description:
        'trust 데이터가 있어도 evidence와 최신성이 충분치 않으면 보수 라벨을 유지해요.',
      guidance: '실제 방문 전 반려동물 동반 조건을 다시 확인해 주세요.',
      tone: 'caution',
      sourceLabel:
        primaryPolicy.sourceType === 'user-report'
          ? '사용자 제보'
          : primaryPolicy.sourceType === 'admin-review'
            ? '운영 검수'
            : '정책 메타',
      basisDate: trustBasisDate,
      basisDateLabel: buildTrustBasisDateLabel(trustBasisDate, '기준일'),
      isStale,
      hasConflict,
      layers,
    };
  }

  if (petPolicy.petAllowed === 'possible') {
    return {
      publicLabel: 'needs_verification',
      label: getPublicTrustLabelText('needs_verification'),
      shortReason: '외부 원본에 동반 가능성 신호가 있지만 검수 이력은 없어요.',
      description:
        'TourAPI 원문과 후보 점수는 참고용이며 실제 정책을 확정하지 않아요.',
      guidance: '실제 방문 전 반려동물 동반 조건을 다시 확인해 주세요.',
      tone: 'caution',
      sourceLabel: 'TourAPI 후보',
      basisDate: sourceUpdatedAt,
      basisDateLabel: buildTrustBasisDateLabel(sourceUpdatedAt, '외부 기준일'),
      isStale: false,
      hasConflict: false,
      layers,
    };
  }

  return {
    publicLabel: 'candidate',
    label: getPublicTrustLabelText('candidate'),
    shortReason: '검증 근거가 부족한 여행 후보예요.',
    description:
      '후보는 보이지만 trust 데이터와 검수 이력이 없어 공적 라벨을 올리지 않았어요.',
    guidance: '실제 방문 전 반려동물 동반 조건을 다시 확인해 주세요.',
    tone: 'neutral',
    sourceLabel: 'TourAPI 후보',
    basisDate: sourceUpdatedAt,
    basisDateLabel: buildTrustBasisDateLabel(sourceUpdatedAt, '외부 기준일'),
    isStale: false,
    hasConflict: false,
    layers,
  };
}

async function hydratePetTravelPublicTrust(
  items: ReadonlyArray<PetTravelItem>,
): Promise<PetTravelItem[]> {
  const trustSnapshotMap = await loadPetTravelTrustSnapshotsBySourceIds(
    items.map(item => item.source.contentId),
  );

  return items.map(item => {
    const trustSnapshot = trustSnapshotMap.get(item.source.contentId) ?? null;
    const publicTrust = buildPetTravelPublicTrust({
      petPolicy: item.petPolicy,
      sourceUpdatedAt: item.source.sourceUpdatedAt || null,
      trustSnapshot,
    });

    return {
      ...item,
      publicTrust,
      petConfidenceLabel: publicTrust.label,
      userLayer: {
        targetId: trustSnapshot?.placeId ?? item.userLayer.targetId,
        supportsReport: Boolean(trustSnapshot?.placeId),
      },
    };
  });
}

function sortPetTravelByPublicTrust(items: ReadonlyArray<PetTravelItem>): PetTravelItem[] {
  return [...items].sort((left, right) => {
    const trustPriorityDiff =
      getPublicTrustPriority(left.publicTrust.publicLabel) -
      getPublicTrustPriority(right.publicTrust.publicLabel);
    if (trustPriorityDiff !== 0) {
      return trustPriorityDiff;
    }

    if (
      right.aggregation.score.finalScore !== left.aggregation.score.finalScore
    ) {
      return right.aggregation.score.finalScore - left.aggregation.score.finalScore;
    }

    if (
      right.aggregation.score.travelScore !== left.aggregation.score.travelScore
    ) {
      return right.aggregation.score.travelScore - left.aggregation.score.travelScore;
    }

    return right.aggregation.score.petScore - left.aggregation.score.petScore;
  });
}

function applyPetTravelExposureGuard(
  items: ReadonlyArray<PetTravelItem>,
  queryIntent: PetTravelQueryIntent,
): PetTravelItem[] {
  const sortedItems = sortPetTravelByPublicTrust(items);
  const trustReviewed = sortedItems.filter(
    item => item.publicTrust.publicLabel === 'trust_reviewed',
  );
  const needsVerification = sortedItems.filter(
    item => item.publicTrust.publicLabel === 'needs_verification',
  );
  const candidates = sortedItems.filter(
    item => item.publicTrust.publicLabel === 'candidate',
  );
  const hasStrongerResults = trustReviewed.length + needsVerification.length > 0;

  const filteredNeedsVerification = needsVerification.filter(item => {
    const minimumScore =
      queryIntent === 'none'
        ? 0.34
        : queryIntent === 'region-only'
          ? 0.42
          : queryIntent === 'broad'
            ? 0.36
            : 0.3;
    return item.aggregation.score.finalScore >= minimumScore;
  }).slice(
    0,
    queryIntent === 'none'
      ? 5
      : queryIntent === 'region-only'
        ? 3
        : queryIntent === 'broad'
          ? 4
          : 6,
  );
  const filteredCandidates = candidates
    .filter(item => {
      const minimumScore =
        queryIntent === 'none'
          ? 0.56
          : queryIntent === 'region-only'
            ? 0.64
            : queryIntent === 'broad'
              ? 0.58
              : 0.5;

      if (item.aggregation.score.finalScore < minimumScore) {
        return false;
      }

      if (
        queryIntent !== 'specific' &&
        item.aggregation.score.petScore < 0.24 &&
        item.petAllowed === 'check-required'
      ) {
        return false;
      }

      if (
        (queryIntent === 'region-only' || queryIntent === 'broad') &&
        item.placeType === 'restaurant'
      ) {
        return item.aggregation.score.finalScore >= minimumScore + 0.08;
      }

      return true;
    })
    .slice(
      0,
      queryIntent === 'none'
        ? hasStrongerResults
          ? 1
          : 2
        : queryIntent === 'region-only'
          ? 1
          : queryIntent === 'broad'
            ? hasStrongerResults
              ? 1
              : 2
            : hasStrongerResults
              ? 2
              : 3,
    );

  return [...trustReviewed, ...filteredNeedsVerification, ...filteredCandidates];
}

function buildKakaoMapUrl(
  name: string,
  latitude: number,
  longitude: number,
): string {
  const encodedName = encodeURIComponent(name);
  return `kakaomap://look?p=${latitude},${longitude}&name=${encodedName}`;
}

function buildKakaoMapWebUrl(
  name: string,
  latitude: number,
  longitude: number,
): string {
  const encodedName = encodeURIComponent(name);
  return `https://map.kakao.com/link/map/${encodedName},${latitude},${longitude}`;
}

function buildScoreBreakdown(
  item: Pick<
    PetTravelItem,
    'name' | 'address' | 'categoryLabel' | 'source' | 'placeType' | 'facilityHighlights' | 'petPolicy'
  >,
  keyword: string,
  regionIntent: PetTravelRegionIntent | null,
): PetTravelScoreBreakdown {
  const title = item.name;
  const address = item.address;
  const categoryLabel = item.categoryLabel;
  const keywordText = normalizeSearchText(keyword);
  const combinedText = `${title} ${address} ${categoryLabel}`;
  const normalizedCombined = normalizeSearchText(combinedText);
  const hasTravelPositive = hasAnyPattern(combinedText, TRAVEL_POSITIVE_PATTERNS);
  const hasRegionScopeMatch = regionIntent
    ? matchesRegionScope(item as PetTravelItem, regionIntent.region)
    : false;

  let travelScore = 0.2;
  switch (item.source.contentTypeId) {
    case '12':
    case '14':
    case '15':
      travelScore += 0.34;
      break;
    case '28':
      travelScore += 0.3;
      break;
    case '32':
      travelScore += 0.26;
      break;
    case '39':
      travelScore += 0.08;
      break;
    case '38':
      travelScore += 0.02;
      break;
    default:
      travelScore += 0.04;
      break;
  }

  if (keywordText && normalizeSearchText(title).includes(keywordText)) {
    travelScore += 0.2;
  }
  if (keywordText && normalizeSearchText(address).includes(keywordText)) {
    travelScore += 0.12;
  }
  if (keywordText && normalizedCombined.includes(keywordText)) {
    travelScore += 0.05;
  }
  if (hasRegionScopeMatch) {
    // Region-only 검색은 area scope를 이미 좁혀 온 결과이므로,
    // 행정명 별칭 차이(예: `제주도` vs `제주특별자치도`) 때문에
    // 적합한 후보가 과하게 탈락하지 않도록 최소 가산점을 준다.
    travelScore += regionIntent?.isRegionOnlyQuery ? 0.1 : 0.04;
  }
  if (hasTravelPositive) {
    travelScore += 0.18;
  }
  if (item.facilityHighlights.length > 0) {
    travelScore += 0.05;
  }
  if (item.placeType === 'outdoor') {
    travelScore += 0.08;
  }
  if (item.placeType === 'experience') {
    travelScore += 0.04;
  }
  if (item.placeType === 'stay') {
    travelScore += 0.03;
  }

  let petScore = 0;
  if (item.petPolicy.status === 'db-verified') {
    petScore = 1;
  } else if (item.petPolicy.status === 'user-reported') {
    petScore = 0.72;
  } else if (item.petPolicy.petAllowed === 'possible') {
    petScore = item.petPolicy.confidence;
  } else {
    petScore = item.petPolicy.confidence * 0.5;
  }
  if (item.placeType === 'stay' || item.placeType === 'restaurant') {
    petScore *= 0.72;
  }

  let commercialPenalty = 0;
  if (item.source.contentTypeId === '38') {
    commercialPenalty += 0.35;
  }
  if (item.placeType === 'shopping') {
    commercialPenalty += 0.35;
  }
  if (hasAnyPattern(title, COMMERCIAL_EXCLUDE_PATTERNS)) {
    commercialPenalty += 0.4;
  }
  if (isExplicitlyCommercialResult(item as PetTravelItem)) {
    commercialPenalty += 0.45;
  }

  const normalizedTravel = clampScore(travelScore);
  const normalizedPet = clampScore(
    Math.min(clampScore(petScore), normalizedTravel * 0.75),
  );
  const normalizedPenalty = clampScore(commercialPenalty);
  const finalScore = clampScore(
    normalizedTravel * 0.72 + normalizedPet * 0.18 - normalizedPenalty * 0.7,
  );

  return {
    travelScore: normalizedTravel,
    petScore: normalizedPet,
    commercialPenalty: normalizedPenalty,
    finalScore,
  };
}

function mapListItem(record: JsonRecord, regionId: string): PetTravelItem | null {
  const contentId = normalizeString(record.contentid);
  const contentTypeId = normalizeString(record.contenttypeid);
  const name = normalizeString(record.title);
  const latitude = toFiniteNumber(record.mapy);
  const longitude = toFiniteNumber(record.mapx);

  if (!contentId || !contentTypeId || !name || latitude === null || longitude === null) {
    return null;
  }
  if (!PET_TRAVEL_CONTENT_TYPE_WHITELIST.has(contentTypeId)) {
    return null;
  }

  const categoryLabel =
    normalizeString(record.cat3) ??
    normalizeString(record.cat2) ??
    normalizeString(record.cat1);
  const categoryId = inferCategoryId(contentTypeId, categoryLabel);
  const normalizedCategoryLabel = getCategoryLabel(categoryId, categoryLabel);
  const petNotice = buildPetNotice(record);
  const placeType = getPlaceType(contentTypeId, categoryId, name, normalizedCategoryLabel);
  const petPolicy = buildPetPolicy(record, name);
  const publicTrust = buildPetTravelPublicTrust({
    petPolicy,
    sourceUpdatedAt: normalizeString(record.modifiedtime),
    trustSnapshot: null,
  });
  const petConfidenceLabel = publicTrust.label;
  const kakaoMapUrl = buildKakaoMapUrl(name, latitude, longitude);
  const kakaoMapWebUrl = buildKakaoMapWebUrl(name, latitude, longitude);
  const aggregation = {
    trustStage: 'candidate-layer' as const,
    rawSources: ['tour-api-raw' as const],
    score: {
      travelScore: 0,
      petScore: 0,
      commercialPenalty: 0,
      finalScore: 0,
    },
  };

  return {
    id: `tour-api:${contentId}`,
    name,
    regionId,
    categoryId,
    categoryLabel: normalizedCategoryLabel,
    placeType,
    petAllowed: petPolicy.petAllowed,
    summary:
      normalizeString(record.overview) ??
      `${name} 여행 후보예요. 상세 정보를 열어 반려동물 동반 조건을 확인해 주세요.`,
    address: normalizeAddress(record),
    latitude,
    longitude,
    kakaoMapUrl,
    kakaoMapWebUrl,
    phone: normalizeString(record.tel),
    operatingHours: joinTruthyLines(pickStringFields(record, OPERATING_KEYS)),
    petNotice,
    petConfidenceLabel,
    facilityHighlights: buildFacilityHighlights(record),
    thumbnailUrl:
      normalizeString(record.firstimage) ?? normalizeString(record.firstimage2),
    source: {
      provider: 'tour-api',
      providerLabel: TOUR_API_PROVIDER_LABEL,
      contentId,
      contentTypeId,
      areaCode: normalizeString(record.areacode) ?? '0',
      sigunguCode: normalizeString(record.sigungucode),
      sourceLabel: 'TourAPI 실시간 여행 후보',
      sourceUpdatedAt: normalizeString(record.modifiedtime) ?? '',
    },
    petPolicy,
    aggregation,
    publicTrust,
    userLayer: {
      targetId: null,
      supportsReport: false,
    },
  };
}

function isExplicitlyCommercialResult(item: PetTravelItem): boolean {
  const title = item.name;
  const hasTravelShoppingSignal = hasAnyPattern(title, TRAVEL_SHOPPING_ALLOW_PATTERNS);
  if (hasTravelShoppingSignal) {
    return false;
  }

  if (hasAnyPattern(title, COMMERCIAL_EXCLUDE_PATTERNS)) {
    return true;
  }

  if (/점$/.test(title)) {
    return true;
  }

  return false;
}

function matchesSelectedCategory(
  item: PetTravelItem,
  categoryId: PetTravelCategory['id'],
): boolean {
  switch (categoryId) {
    case 'all':
      return true;
    case 'stay':
      return item.source.contentTypeId === '32';
    case 'restaurant':
      return item.source.contentTypeId === '39';
    case 'experience':
      return item.source.contentTypeId === '28';
    case 'outdoor':
      return item.categoryId === 'outdoor';
    case 'attraction':
      return item.categoryId === 'attraction' && item.source.contentTypeId !== '38';
    default:
      return item.categoryId === categoryId;
  }
}

function filterAndRankSearchResults(
  items: PetTravelItem[],
  keyword: string,
  categoryId: PetTravelCategory['id'],
  regionIntent: PetTravelRegionIntent | null,
): PetTravelItem[] {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) {
    return items;
  }

  const queryIntent = getPetTravelQueryIntent(trimmedKeyword, regionIntent);
  const isRegionOnlyQuery = queryIntent === 'region-only';
  const minScore =
    queryIntent === 'region-only'
      ? 0.52
      : queryIntent === 'broad'
        ? 0.34
        : 0.28;

  return items
    .map(item => ({
      item,
      score: buildScoreBreakdown(item, trimmedKeyword, regionIntent),
    }))
    .map(({ item, score }) => ({
      item: {
        ...item,
        aggregation: {
          ...item.aggregation,
          score,
        },
      },
      score,
    }))
    .filter(({ item, score }) => {
      if (isExplicitlyCommercialResult(item)) {
        return false;
      }
      if (isRegionOnlyQuery && categoryId === 'all' && item.source.contentTypeId === '38') {
        return false;
      }
      if (score.travelScore < 0.2) {
        return false;
      }
      if (
        queryIntent !== 'specific' &&
        item.publicTrust.publicLabel === 'candidate' &&
        score.petScore < 0.24
      ) {
        return false;
      }
      if (
        item.petAllowed === 'check-required' &&
        score.petScore < 0.2 &&
        score.travelScore < minScore + 0.08
      ) {
        return false;
      }
      if (isRegionOnlyQuery && categoryId === 'all' && item.source.contentTypeId === '39') {
        return score.finalScore >= minScore + 0.12;
      }
      return score.finalScore >= minScore;
    })
    .sort((left, right) => {
      if (right.score.finalScore !== left.score.finalScore) {
        return right.score.finalScore - left.score.finalScore;
      }
      if (right.score.travelScore !== left.score.travelScore) {
        return right.score.travelScore - left.score.travelScore;
      }
      return right.score.petScore - left.score.petScore;
    })
    .map(({ item }) => item);
}

function mergeUniqueItems(items: PetTravelItem[]): PetTravelItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function isConfirmedPetFriendly(item: PetTravelItem): boolean {
  if (!PET_TRAVEL_CONTENT_TYPE_WHITELIST.has(item.source.contentTypeId)) {
    return false;
  }
  if (isExplicitlyCommercialResult(item)) {
    return false;
  }

  return true;
}

async function fetchRegionIntentItems(params: {
  keyword: string;
  categoryId: PetTravelCategory['id'];
  region: PetTravelRegion;
  size: number;
}): Promise<PetTravelItem[]> {
  const { categoryId, keyword, region, size } = params;
  const areaJson = await fetchTourApiJson(TOUR_API_AREA_ENDPOINT, {
    pageNo: 1,
    numOfRows: Math.max(100, Math.min(200, size * 4)),
    areaCode: region.areaCode,
    sigunguCode: region.sigunguCode,
    contentTypeId:
      categoryId === 'all'
        ? '12'
        : getPetTravelCategoryById(categoryId)?.contentTypeId ?? null,
  });

  const areaItems = readTourApiItems(areaJson).items
    .map(item => mapListItem(item, region.id))
    .filter((item): item is PetTravelItem => Boolean(item));

  let mergedItems = areaItems;

  if (region.scope === 'local') {
    const keywordJson = await fetchTourApiJson(TOUR_API_SEARCH_ENDPOINT, {
      pageNo: 1,
      numOfRows: Math.max(60, Math.min(120, size * 3)),
      keyword,
    });

    const keywordItems = readTourApiItems(keywordJson).items
      .map(item => mapListItem(item, region.id))
      .filter((item): item is PetTravelItem => Boolean(item));

    mergedItems = mergeUniqueItems([...areaItems, ...keywordItems]);
  }

  return mergedItems
    .filter(item => matchesSelectedCategory(item, categoryId))
    .filter(item => matchesRegionScope(item, region))
    .filter(item =>
      categoryId === 'all' ? isRegionIntentAllCandidate(item) : true,
    )
    .filter(isConfirmedPetFriendly);
}

function mapDetail(
  baseItem: PetTravelItem,
  commonRecord: JsonRecord | null,
  introRecord: JsonRecord | null,
  petRecord: JsonRecord | null,
  trustSnapshot: PetTravelTrustPlaceSnapshot | null,
): PetTravelDetail {
  const mergedRecord: JsonRecord = {
    ...(commonRecord ?? {}),
    ...(introRecord ?? {}),
    ...(petRecord ?? {}),
  };
  const petPolicy = buildPetPolicy(mergedRecord, baseItem.name);

  const overview =
    normalizeString((commonRecord ?? {}).overview) ??
    normalizeString(mergedRecord.overview);
  const publicTrust = buildPetTravelPublicTrust({
    petPolicy,
    sourceUpdatedAt:
      normalizeString((commonRecord ?? {}).modifiedtime) ??
      baseItem.source.sourceUpdatedAt ??
      null,
    trustSnapshot,
  });

  return {
    ...baseItem,
    summary: overview ?? baseItem.summary,
    phone:
      normalizeString(mergedRecord.tel) ??
      normalizeString(mergedRecord.infocenter) ??
      baseItem.phone,
    operatingHours:
      joinTruthyLines(pickStringFields(mergedRecord, OPERATING_KEYS)) ??
      baseItem.operatingHours,
    petPolicy,
    petAllowed: petPolicy.petAllowed,
    petNotice: buildPetNotice(mergedRecord),
    petConfidenceLabel: publicTrust.label,
    publicTrust,
    facilityHighlights: buildFacilityHighlights(mergedRecord).length
      ? buildFacilityHighlights(mergedRecord)
      : [...baseItem.facilityHighlights],
    thumbnailUrl:
      normalizeString(mergedRecord.firstimage) ??
      normalizeString(mergedRecord.firstimage2) ??
      baseItem.thumbnailUrl,
    overview,
    homepage: normalizeString((commonRecord ?? {}).homepage),
    parkingInfo: joinTruthyLines(pickStringFields(mergedRecord, PARKING_KEYS)),
    restDate: joinTruthyLines(pickStringFields(mergedRecord, REST_DATE_KEYS)),
    usageInfo: joinTruthyLines(pickStringFields(mergedRecord, USAGE_KEYS)),
    sourceUpdatedAt:
      normalizeString((commonRecord ?? {}).modifiedtime) ??
      baseItem.source.sourceUpdatedAt ??
      null,
    userLayer: {
      targetId: trustSnapshot?.placeId ?? baseItem.userLayer.targetId,
      supportsReport: Boolean(trustSnapshot?.placeId ?? baseItem.userLayer.targetId),
    },
  };
}

export async function fetchPetTravelList(
  input: FetchListInput,
): Promise<PetTravelListResult> {
  const trimmedKeyword = input.searchKeyword.trim();
  const category = getPetTravelCategoryById(input.categoryId);
  const resolvedRegionIntent = trimmedKeyword
    ? resolvePetTravelRegionIntent(trimmedKeyword)
    : null;

  if (!category) {
    throw new Error('여행 조회 조건이 올바르지 않아요.');
  }

  if (
    trimmedKeyword &&
    resolvedRegionIntent?.isRegionOnlyQuery &&
    resolvedRegionIntent.region.id !== 'all'
  ) {
    const regionItems = await fetchRegionIntentItems({
      keyword: trimmedKeyword,
      categoryId: input.categoryId,
      region: resolvedRegionIntent.region,
      size: input.size ?? 30,
    });
    const rankedRegionItems = filterAndRankSearchResults(
      regionItems,
      trimmedKeyword,
      input.categoryId,
      resolvedRegionIntent,
    ).filter(isConfirmedPetFriendly);
    const hydratedRegionItems = await hydratePetTravelPublicTrust(rankedRegionItems);
    const exposedRegionItems = applyPetTravelExposureGuard(
      hydratedRegionItems,
      getPetTravelQueryIntent(trimmedKeyword, resolvedRegionIntent),
    );

    return {
      items: exposedRegionItems,
      totalCount: exposedRegionItems.length,
      apiTotalCount: rankedRegionItems.length,
    };
  }

  const commonParams = {
    pageNo: Math.max(1, input.page ?? 1),
    numOfRows: trimmedKeyword
      ? Math.min(100, Math.max(40, input.size ?? 60))
      : Math.min(60, Math.max(30, input.size ?? 40)),
  };
  const json = trimmedKeyword
    ? await fetchTourApiJson(TOUR_API_SEARCH_ENDPOINT, {
        ...commonParams,
        keyword: trimmedKeyword,
      })
    : await fetchTourApiJson(TOUR_API_AREA_ENDPOINT, {
        ...commonParams,
        contentTypeId: category.contentTypeId ?? '12',
      });

  const parsed = readTourApiItems(json);
  const mappedItems = parsed.items
    .map(item => mapListItem(item, 'all'))
    .filter((item): item is PetTravelItem => Boolean(item))
    .filter(item => matchesSelectedCategory(item, input.categoryId));
  const rankedItems = trimmedKeyword
    ? filterAndRankSearchResults(
        mappedItems,
        trimmedKeyword,
        input.categoryId,
        resolvedRegionIntent,
      ).filter(isConfirmedPetFriendly)
    : mappedItems
        .filter(isConfirmedPetFriendly)
        .map(item => ({
          ...item,
          aggregation: {
            ...item.aggregation,
            score: buildScoreBreakdown(item, '', null),
          },
        }))
        .sort(
          (a, b) =>
            b.aggregation.score.travelScore -
            a.aggregation.score.travelScore,
        );
  const hydratedItems = await hydratePetTravelPublicTrust(rankedItems);
  const exposedItems = applyPetTravelExposureGuard(
    hydratedItems,
    getPetTravelQueryIntent(trimmedKeyword, resolvedRegionIntent),
  );

  return {
    items: exposedItems,
    totalCount: exposedItems.length,
    apiTotalCount: parsed.totalCount,
  };
}

export async function fetchPetTravelDetail(
  input: FetchDetailInput,
): Promise<PetTravelDetail> {
  const commonJson = await fetchTourApiJson(TOUR_API_DETAIL_COMMON_ENDPOINT, {
    contentId: input.item.source.contentId,
  });

  const introJson = await fetchTourApiJson(TOUR_API_DETAIL_INTRO_ENDPOINT, {
    contentId: input.item.source.contentId,
    contentTypeId: input.item.source.contentTypeId,
  });
  const petJson = await fetchTourApiJson(TOUR_API_DETAIL_PET_ENDPOINT, {
    contentId: input.item.source.contentId,
  });

  const commonItems = readTourApiItems(commonJson).items;
  const introItems = readTourApiItems(introJson).items;
  const petItems = readTourApiItems(petJson).items;
  const trustSnapshotMap = await loadPetTravelTrustSnapshotsBySourceIds([
    input.item.source.contentId,
  ]);

  return mapDetail(
    input.item,
    commonItems[0] ?? null,
    introItems[0] ?? null,
    petItems[0] ?? null,
    trustSnapshotMap.get(input.item.source.contentId) ?? null,
  );
}
