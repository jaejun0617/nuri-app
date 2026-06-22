// 파일: src/services/locationDiscovery/service.ts
// 파일 목적:
// - 산책 장소와 펫동반 장소 탐색 도메인의 핵심 후보 수집/정제 로직을 제공한다.
// 어디서 쓰이는지:
// - `useLocationDiscovery` 훅과 주변 산책/펫동반 장소 리스트·상세 화면에서 사용된다.
// 핵심 역할:
// - 산책 POI RPC 결과와 도메인별 외부 후보를 정규화해 `LocationDiscoveryItem` 목록을 만든다.
// - 펫동반 장소의 경우 Supabase 메타와 외부 후보를 병합해 서비스 표시 모델로 정규화한다.
// 데이터·상태 흐름:
// - 산책은 자체 POI RPC만 사용자 runtime source로 사용하고, Keep Fallback 조건은 빈 결과 UX로 안전하게 닫는다.
// - 펫동반 장소는 별도 adapter로 외부 후보를 수집하고, 필요 시 `placeMeta.ts`가 canonical 메타/보조 신호를 덧씌운다.
// - 화면은 이 파일이 만든 normalized item만 소비하고, source/provider 차이는 내부에서 숨긴다.
// 수정 시 주의:
// - 펫동반 장소는 외부 후보 + 선택적 메타 merge이므로, 검증 상태를 과하게 확정하는 방향으로 바꾸면 안 된다.
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
import { petFriendlyKakaoSearchProvider } from './kakaoProviderAdapters';
import type { LocationSearchProvider } from './provider';
import type {
  KakaoPlaceDocument,
  LocationDiscoveryDomain,
  LocationDiscoveryItem,
  LocationDiscoveryItemKind,
  LocationDiscoveryResponse,
  LocationDiscoverySearchInput,
  LocationDiscoveryVerificationStatus,
} from './types';
import { ENABLE_WALK_POI_RPC, searchWalkPoiLocations } from './walkPoiRpc';

const WALK_POI_FALLBACK_GATE_REGIONS = [
  {
    id: 'ilsan_juyeop_lakepark',
    label: '일산·주엽·호수공원 생활권',
    center: {
      latitude: 37.676492,
      longitude: 126.767888,
    },
    radiusMeters: 5000,
  },
  {
    id: 'baekseok_madu_jeongbalsan',
    label: '백석·마두·정발산 생활권',
    center: {
      latitude: 37.6433,
      longitude: 126.7882,
    },
    radiusMeters: 5000,
  },
  {
    id: 'seoul_worldcup_nanji_mangwon',
    label: '서울 월드컵공원·난지·망원 권역',
    center: {
      latitude: 37.5647,
      longitude: 126.8872,
    },
    radiusMeters: 5000,
  },
  {
    id: 'seoul_banpo_jamwon_ichon',
    label: '서울 반포·잠원·이촌 한강 권역',
    center: {
      latitude: 37.5146,
      longitude: 126.9919,
    },
    radiusMeters: 4500,
  },
  {
    id: 'seoul_ttukseom_seoulforest',
    label: '서울 뚝섬·서울숲 권역',
    center: {
      latitude: 37.5392,
      longitude: 127.0479,
    },
    radiusMeters: 4500,
  },
  {
    id: 'seoul_songpa_olympic_lake',
    label: '서울 송파·올림픽공원·석촌호수 권역',
    center: {
      latitude: 37.5165,
      longitude: 127.116,
    },
    radiusMeters: 5000,
  },
  {
    id: 'seoul_yangjae_tancheon',
    label: '서울 양재천·탄천 권역',
    center: {
      latitude: 37.4805,
      longitude: 127.0405,
    },
    radiusMeters: 5000,
  },
  {
    id: 'seoul_jungnangcheon',
    label: '서울 중랑천 권역',
    center: {
      latitude: 37.608,
      longitude: 127.067,
    },
    radiusMeters: 5000,
  },
  {
    id: 'seoul_anyangcheon',
    label: '서울 안양천 권역',
    center: {
      latitude: 37.5185,
      longitude: 126.881,
    },
    radiusMeters: 5000,
  },
  {
    id: 'seoul_boramae_dorimcheon',
    label: '서울 보라매·도림천 권역',
    center: {
      latitude: 37.492,
      longitude: 126.919,
    },
    radiusMeters: 5000,
  },
  {
    id: 'seoul_dreamforest',
    label: '서울 북서울꿈의숲 권역',
    center: {
      latitude: 37.6226,
      longitude: 127.0427,
    },
    radiusMeters: 5000,
  },
  {
    id: 'metro_bundang_pangyo_tancheon',
    label: '성남·분당·판교·탄천 권역',
    center: {
      latitude: 37.382,
      longitude: 127.118,
    },
    radiusMeters: 5000,
  },
  {
    id: 'metro_hanam_misa_hangang',
    label: '하남·미사한강공원 권역',
    center: {
      latitude: 37.5665,
      longitude: 127.19,
    },
    radiusMeters: 5000,
  },
  {
    id: 'metro_suwon_gwanggyo_lake',
    label: '수원·광교호수공원 권역',
    center: {
      latitude: 37.285,
      longitude: 127.066,
    },
    radiusMeters: 5000,
  },
  {
    id: 'metro_gwacheon_seoul_grand_park',
    label: '과천·서울대공원 권역',
    center: {
      latitude: 37.435,
      longitude: 127.014,
    },
    radiusMeters: 5000,
  },
  {
    id: 'metro_incheon_songdo_central_park',
    label: '인천 송도 센트럴파크 권역',
    center: {
      latitude: 37.3925,
      longitude: 126.6375,
    },
    radiusMeters: 5000,
  },
  {
    id: 'metro_bucheon_sangdong_lake',
    label: '부천 상동호수공원 권역',
    center: {
      latitude: 37.5037,
      longitude: 126.7446,
    },
    radiusMeters: 5000,
  },
  {
    id: 'metro_anyang_hagui_anyangcheon',
    label: '안양·학의천·안양천 권역',
    center: {
      latitude: 37.394,
      longitude: 126.955,
    },
    radiusMeters: 5000,
  },
  {
    id: 'metro_namyangju_dasan_wangsukcheon',
    label: '남양주·다산·왕숙천 권역',
    center: {
      latitude: 37.612,
      longitude: 127.159,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_busan_haeundae_dongbaek',
    label: '부산 해운대·동백섬 권역',
    center: {
      latitude: 35.1587,
      longitude: 129.158,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_daegu_suseong_lake',
    label: '대구 수성못 권역',
    center: {
      latitude: 35.828,
      longitude: 128.614,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_daejeon_gapcheon_expo',
    label: '대전 갑천·엑스포 권역',
    center: {
      latitude: 36.374,
      longitude: 127.387,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_ulsan_taehwagang_garden',
    label: '울산 태화강 국가정원 권역',
    center: {
      latitude: 35.548,
      longitude: 129.298,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_gwangju_stream_yeongsan',
    label: '광주 광주천·영산강 권역',
    center: {
      latitude: 35.154,
      longitude: 126.852,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_sejong_lake_geumgang',
    label: '세종호수공원·금강 권역',
    center: {
      latitude: 36.4975,
      longitude: 127.2597,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_cheongju_musimcheon',
    label: '청주 무심천·문암생태공원 권역',
    center: {
      latitude: 36.642,
      longitude: 127.489,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_cheonan_cheonhoji_buldang',
    label: '천안 천호지·불당천 권역',
    center: {
      latitude: 36.815,
      longitude: 127.154,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_chuncheon_gongjicheon_uiam',
    label: '춘천 공지천·의암호 권역',
    center: {
      latitude: 37.873,
      longitude: 127.713,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_gangneung_gyeongpo_namdaecheon',
    label: '강릉 경포호·남대천 권역',
    center: {
      latitude: 37.797,
      longitude: 128.896,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_jeju_ihoteu_tapdong',
    label: '제주 이호테우·탑동해안 권역',
    center: {
      latitude: 33.512,
      longitude: 126.522,
    },
    radiusMeters: 5000,
  },
  {
    id: 'metro_yongin_giheung_lake',
    label: '용인·기흥호수공원 권역',
    center: {
      latitude: 37.235,
      longitude: 127.105,
    },
    radiusMeters: 5000,
  },
  {
    id: 'metro_gunpo_chomakgol',
    label: '군포 초막골생태공원 권역',
    center: {
      latitude: 37.344,
      longitude: 126.928,
    },
    radiusMeters: 5000,
  },
  {
    id: 'metro_siheung_gaetgol',
    label: '시흥 갯골생태공원 권역',
    center: {
      latitude: 37.389,
      longitude: 126.779,
    },
    radiusMeters: 5000,
  },
  {
    id: 'metro_gimpo_hangang_lake',
    label: '김포 한강신도시 호수공원 권역',
    center: {
      latitude: 37.644,
      longitude: 126.68,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_jeonju_cheon_hanok',
    label: '전주 전주천·한옥마을 권역',
    center: {
      latitude: 35.816,
      longitude: 127.153,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_changwon_yongji_changwoncheon',
    label: '창원 용지호수·창원천 권역',
    center: {
      latitude: 35.228,
      longitude: 128.681,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_pohang_yeongildae_hyeongsan',
    label: '포항 영일대·형산강 권역',
    center: {
      latitude: 36.055,
      longitude: 129.378,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_gimhae_yeonji_haebancheon',
    label: '김해 연지공원·해반천 권역',
    center: {
      latitude: 35.236,
      longitude: 128.889,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_yeosu_ungcheon_seaside',
    label: '여수 웅천해변·이순신공원 권역',
    center: {
      latitude: 34.744,
      longitude: 127.676,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_suncheon_dongcheon_garden',
    label: '순천 동천·순천만국가정원 권역',
    center: {
      latitude: 34.95,
      longitude: 127.487,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_mokpo_peace_gatbawi',
    label: '목포 평화광장·갓바위 권역',
    center: {
      latitude: 34.8,
      longitude: 126.433,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_gumi_dongnak_nakdong',
    label: '구미 동락공원·낙동강 권역',
    center: {
      latitude: 36.107,
      longitude: 128.419,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_jinju_namgang_jinjuseong',
    label: '진주 남강·진주성 권역',
    center: {
      latitude: 35.19,
      longitude: 128.083,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_busan_oncheon_suyeong',
    label: '부산 온천천·수영강 권역',
    center: {
      latitude: 35.185,
      longitude: 129.105,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_daegu_sincheon_geumhogang',
    label: '대구 신천·금호강 권역',
    center: {
      latitude: 35.872,
      longitude: 128.603,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_daejeon_yurim_arboretum',
    label: '대전 유림공원·한밭수목원 권역',
    center: {
      latitude: 36.365,
      longitude: 127.382,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_ulsan_seonam_grandpark',
    label: '울산 선암호수공원·울산대공원 권역',
    center: {
      latitude: 35.528,
      longitude: 129.315,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_gyeongju_bomun_lake',
    label: '경주 보문호·황성공원 권역',
    center: {
      latitude: 35.845,
      longitude: 129.289,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_gunsan_eunpa_geumgang',
    label: '군산 은파호수공원·금강 권역',
    center: {
      latitude: 35.964,
      longitude: 126.708,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_masan_jinhae_waterfront',
    label: '마산·진해 해안 산책 권역',
    center: {
      latitude: 35.183,
      longitude: 128.565,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_tongyeong_gangguan_mireuk',
    label: '통영 강구안·미륵도 권역',
    center: {
      latitude: 34.842,
      longitude: 128.423,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_geoje_gohyeon_jangseungpo',
    label: '거제 고현천·장승포 권역',
    center: {
      latitude: 34.88,
      longitude: 128.623,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_andong_nakdong_woryeong',
    label: '안동 낙동강·월영교 권역',
    center: {
      latitude: 36.568,
      longitude: 128.731,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_iksan_baesan_seodong',
    label: '익산 배산공원·서동공원 권역',
    center: {
      latitude: 35.951,
      longitude: 126.975,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_naju_yeongsan_riverside',
    label: '나주 영산강·금성산 권역',
    center: {
      latitude: 35.015,
      longitude: 126.71,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_sacheon_samcheonpo_seaside',
    label: '사천 삼천포·노산공원 권역',
    center: {
      latitude: 34.932,
      longitude: 128.077,
    },
    radiusMeters: 5000,
  },
  {
    id: 'national_yangsan_yangsancheon_hwangsan',
    label: '양산 양산천·황산공원 권역',
    center: {
      latitude: 35.338,
      longitude: 129.037,
    },
    radiusMeters: 5000,
  },
] as const;
const PLACE_DEFAULT_QUERIES = [
  '애견동반 카페',
  '애견동반 식당',
  '반려동물 동반',
  '애견카페',
  '반려견 운동장',
] as const;
function parseBooleanFlag(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

const ENABLE_WALK_POI_FALLBACK_GATE = parseBooleanFlag(
  process.env.EXPO_PUBLIC_ENABLE_WALK_POI_FALLBACK_GATE,
  true,
);
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

type LocationDiscoveryProviderSearchRequest = {
  query: string;
  page: number;
};

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

function calculateDistanceMeters(
  origin: Pick<DeviceCoordinates, 'latitude' | 'longitude'>,
  target: { latitude: number; longitude: number },
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;
  const latDiff = toRadians(target.latitude - origin.latitude);
  const lngDiff = toRadians(target.longitude - origin.longitude);
  const originLat = toRadians(origin.latitude);
  const targetLat = toRadians(target.latitude);
  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(originLat) * Math.cos(targetLat) * Math.sin(lngDiff / 2) ** 2;
  return Math.round(
    2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
  );
}

function getWalkPoiFallbackGateRegion(
  coordinates: DeviceCoordinates | null,
): (typeof WALK_POI_FALLBACK_GATE_REGIONS)[number] | null {
  if (!coordinates) {
    return null;
  }

  let nearestRegion: (typeof WALK_POI_FALLBACK_GATE_REGIONS)[number] | null =
    null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  WALK_POI_FALLBACK_GATE_REGIONS.forEach(region => {
    const distance = calculateDistanceMeters(coordinates, region.center);
    if (distance <= region.radiusMeters && distance < nearestDistance) {
      nearestRegion = region;
      nearestDistance = distance;
    }
  });

  return nearestRegion;
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
      item.id ||
      `${item.name}:${item.latitude.toFixed(5)}:${item.longitude.toFixed(5)}`;
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
        description:
          '동반 불가 제보가 있어 방문 전 반드시 매장에 확인해 주세요.',
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
          sourceType === 'service-meta'
            ? '서비스 메타 + 외부 후보'
            : 'Kakao Local 후보',
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
          sourceType === 'service-meta'
            ? '서비스 메타 미확정'
            : 'Kakao Local 후보',
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

  if (
    canPublishTrustReviewed &&
    serviceMeta?.verificationStatus === 'admin-verified'
  ) {
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
      description: '외부 원본만으로는 실제 동반 가능 여부를 확정할 수 없어요.',
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
    hasKeywordEvidence: matchesPositiveKeyword(
      keywordHaystack,
      PET_POSITIVE_KEYWORDS,
    ),
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
      providerLabel: serviceMeta
        ? 'NURI 메타 + Kakao Local'
        : 'Kakao Local 후보',
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

function buildPetFriendlyQueries(
  input: LocationDiscoverySearchInput,
): string[] {
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
  provider: LocationSearchProvider,
  queries: ReadonlyArray<string>,
  coordinates: DeviceCoordinates | null,
  options: {
    radiusMeters: number;
    size: number;
    maxPages: number;
  },
): Promise<KakaoPlaceDocument[]> {
  const requests = queries.flatMap(query =>
    Array.from({ length: options.maxPages }, (_, index) => ({
      query,
      page: index + 1,
    })),
  );

  return searchDocumentsByRequests(provider, requests, coordinates, {
    radiusMeters: options.radiusMeters,
    size: options.size,
  });
}

async function searchDocumentsByRequests(
  provider: LocationSearchProvider,
  requests: ReadonlyArray<LocationDiscoveryProviderSearchRequest>,
  coordinates: DeviceCoordinates | null,
  options: {
    radiusMeters: number;
    size: number;
  },
): Promise<KakaoPlaceDocument[]> {
  const tasks = requests.map(request =>
    provider.searchKeyword({
      query: request.query,
      coordinates,
      radiusMeters: options.radiusMeters,
      size: options.size,
      page: request.page,
    }),
  );

  const responses = await Promise.allSettled(tasks);
  return responses.flatMap(response =>
    response.status === 'fulfilled' ? response.value : [],
  );
}

function sortItems(
  items: ReadonlyArray<LocationDiscoveryItem>,
): LocationDiscoveryItem[] {
  return [...items].sort((left, right) => {
    const trustPriorityDiff =
      getPublicTrustPriority(left.publicTrust.publicLabel) -
      getPublicTrustPriority(right.publicTrust.publicLabel);
    if (trustPriorityDiff !== 0) {
      return trustPriorityDiff;
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

function applyPetFriendlyExposureGuard(
  items: ReadonlyArray<LocationDiscoveryItem>,
  query: string | null | undefined,
): LocationDiscoveryItem[] {
  const queryIntent = getDiscoveryQueryIntent(
    query,
    PLACE_BROAD_QUERY_KEYWORDS,
  );
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

type WalkPoiSafeFallbackReason =
  | 'poi_disabled'
  | 'coordinate_missing'
  | 'poi_empty'
  | 'poi_rpc_error';

function buildWalkPoiSafeFallbackResponse(
  input: LocationDiscoverySearchInput,
  normalizedQuery: string | null,
  options: {
    reason: WalkPoiSafeFallbackReason;
    mode: 'search' | 'nearby';
    gateLimited?: boolean;
    gateRegionId?: string | null;
    message?: string;
  },
): LocationDiscoveryResponse {
  console.info(
    '[NURI-DEBUG] walk-poi-rpc safe-fallback',
    JSON.stringify({
      reason: options.reason,
      mode: options.mode,
      gateLimited: options.gateLimited ?? false,
      gateRegionId: options.gateRegionId ?? null,
      kakaoBlocked: true,
      message: options.message,
    }),
  );

  return {
    items: [],
    query: normalizedQuery,
    source: 'walk_poi',
    verificationStatus:
      options.reason === 'poi_empty' ? 'admin-verified' : 'unknown',
    scope: input.scope,
  };
}

async function searchWalkLocations(
  input: LocationDiscoverySearchInput,
): Promise<LocationDiscoveryResponse> {
  const normalizedQuery = normalizeQuery(input.query);

  if (!ENABLE_WALK_POI_RPC) {
    return buildWalkPoiSafeFallbackResponse(input, normalizedQuery, {
      reason: 'poi_disabled',
      mode: normalizedQuery ? 'search' : 'nearby',
    });
  }

  if (!normalizedQuery && !input.scope.anchorCoordinates) {
    return buildWalkPoiSafeFallbackResponse(input, normalizedQuery, {
      reason: 'coordinate_missing',
      mode: 'nearby',
    });
  }

  try {
    const poiItems = await searchWalkPoiLocations(input);
    if (poiItems.length > 0) {
      const readyGateRegion = getWalkPoiFallbackGateRegion(
        input.scope.anchorCoordinates,
      );
      if (ENABLE_WALK_POI_FALLBACK_GATE && readyGateRegion) {
        console.info(
          '[NURI-DEBUG] walk-poi-rpc fallback',
          JSON.stringify({
            reason: 'poi_ready',
            mode: normalizedQuery ? 'search' : 'nearby',
            gateLimited: true,
            gateRegionId: readyGateRegion.id,
            kakaoBlocked: true,
            resultCount: poiItems.length,
          }),
        );
      }

      return {
        items: poiItems,
        query: normalizedQuery,
        source: 'walk_poi',
        verificationStatus: 'admin-verified',
        scope: input.scope,
      };
    }

    const emptyFallbackGateRegion = getWalkPoiFallbackGateRegion(
      input.scope.anchorCoordinates,
    );
    const shouldLimitEmptyFallback =
      ENABLE_WALK_POI_FALLBACK_GATE && emptyFallbackGateRegion !== null;

    return buildWalkPoiSafeFallbackResponse(input, normalizedQuery, {
      reason: 'poi_empty',
      mode: normalizedQuery ? 'search' : 'nearby',
      gateLimited: shouldLimitEmptyFallback,
      gateRegionId: emptyFallbackGateRegion?.id ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    return buildWalkPoiSafeFallbackResponse(input, normalizedQuery, {
      reason: 'poi_rpc_error',
      mode: normalizedQuery ? 'search' : 'nearby',
      message,
    });
  }
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
    petFriendlyKakaoSearchProvider,
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
                  buildPetPlaceSourceLookupKey(
                    'kakao',
                    candidate.externalPlaceId,
                  ),
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
                    buildPetPlaceSourceLookupKey(
                      'kakao',
                      candidate.externalPlaceId,
                    ),
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
  const normalizedQuery = normalizeQuery(input.query);

  if (!normalizedQuery && !input.scope.anchorCoordinates) {
    if (domain === 'walk') {
      return buildWalkPoiSafeFallbackResponse(input, null, {
        reason: 'coordinate_missing',
        mode: 'nearby',
      });
    }

    return {
      items: [],
      query: null,
      source: 'kakao',
      verificationStatus: 'unknown',
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
