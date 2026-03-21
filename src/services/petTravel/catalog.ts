import type {
  PetTravelCategory,
  PetTravelPetAllowed,
  PetTravelPlaceType,
  PetTravelRegion,
  PetTravelRegionIntent,
} from './types';

type AreaSeed = {
  id: string;
  label: string;
  areaCode: string;
  description: string;
  aliases: string[];
  addressKeywords: string[];
};

type LocalSeed = {
  id: string;
  label: string;
  areaCode: string;
  sigunguCode?: string;
  aliases?: string[];
  addressKeywords?: string[];
  description?: string;
};

const AREA_REGION_SEEDS: ReadonlyArray<AreaSeed> = [
  {
    id: 'all',
    label: '전국',
    areaCode: '0',
    description: '전국 단위 여행 후보를 넓게 탐색하는 기본 범위',
    aliases: ['전국', '전체', '대한민국', '한국'],
    addressKeywords: ['전국'],
  },
  {
    id: 'seoul',
    label: '서울',
    areaCode: '1',
    description: '서울권 여행 후보 범위',
    aliases: ['서울', '서울시', '서울특별시'],
    addressKeywords: ['서울특별시', '서울시'],
  },
  {
    id: 'incheon',
    label: '인천',
    areaCode: '2',
    description: '인천권 여행 후보 범위',
    aliases: ['인천', '인천시', '인천광역시'],
    addressKeywords: ['인천광역시', '인천시'],
  },
  {
    id: 'daejeon',
    label: '대전',
    areaCode: '3',
    description: '대전권 여행 후보 범위',
    aliases: ['대전', '대전시', '대전광역시'],
    addressKeywords: ['대전광역시', '대전시'],
  },
  {
    id: 'daegu',
    label: '대구',
    areaCode: '4',
    description: '대구권 여행 후보 범위',
    aliases: ['대구', '대구시', '대구광역시'],
    addressKeywords: ['대구광역시', '대구시'],
  },
  {
    id: 'gwangju',
    label: '광주',
    areaCode: '5',
    description: '광주권 여행 후보 범위',
    aliases: ['광주', '광주시', '광주광역시'],
    addressKeywords: ['광주광역시', '광주시'],
  },
  {
    id: 'busan',
    label: '부산',
    areaCode: '6',
    description: '부산권 여행 후보 범위',
    aliases: ['부산', '부산시', '부산광역시'],
    addressKeywords: ['부산광역시', '부산시'],
  },
  {
    id: 'ulsan',
    label: '울산',
    areaCode: '7',
    description: '울산권 여행 후보 범위',
    aliases: ['울산', '울산시', '울산광역시'],
    addressKeywords: ['울산광역시', '울산시'],
  },
  {
    id: 'sejong',
    label: '세종',
    areaCode: '8',
    description: '세종권 여행 후보 범위',
    aliases: ['세종', '세종시', '세종특별자치시'],
    addressKeywords: ['세종특별자치시', '세종시'],
  },
  {
    id: 'gyeonggi',
    label: '경기',
    areaCode: '31',
    description: '경기권 여행 후보 범위',
    aliases: ['경기', '경기도'],
    addressKeywords: ['경기도'],
  },
  {
    id: 'gangwon',
    label: '강원',
    areaCode: '32',
    description: '강원권 여행 후보 범위',
    aliases: ['강원', '강원도', '강원특별자치도'],
    addressKeywords: ['강원특별자치도', '강원도'],
  },
  {
    id: 'chungbuk',
    label: '충북',
    areaCode: '33',
    description: '충북권 여행 후보 범위',
    aliases: ['충북', '충청북도'],
    addressKeywords: ['충청북도'],
  },
  {
    id: 'chungnam',
    label: '충남',
    areaCode: '34',
    description: '충남권 여행 후보 범위',
    aliases: ['충남', '충청남도'],
    addressKeywords: ['충청남도'],
  },
  {
    id: 'gyeongbuk',
    label: '경북',
    areaCode: '35',
    description: '경북권 여행 후보 범위',
    aliases: ['경북', '경상북도'],
    addressKeywords: ['경상북도'],
  },
  {
    id: 'gyeongnam',
    label: '경남',
    areaCode: '36',
    description: '경남권 여행 후보 범위',
    aliases: ['경남', '경상남도'],
    addressKeywords: ['경상남도'],
  },
  {
    id: 'jeonbuk',
    label: '전북',
    areaCode: '37',
    description: '전북권 여행 후보 범위',
    aliases: ['전북', '전라북도', '전북특별자치도'],
    addressKeywords: ['전북특별자치도', '전라북도'],
  },
  {
    id: 'jeonnam',
    label: '전남',
    areaCode: '38',
    description: '전남권 여행 후보 범위',
    aliases: ['전남', '전라남도'],
    addressKeywords: ['전라남도'],
  },
  {
    id: 'jeju',
    label: '제주',
    areaCode: '39',
    description: '제주권 여행 후보 범위',
    aliases: ['제주', '제주도', '제주특별자치도'],
    addressKeywords: ['제주특별자치도', '제주시', '서귀포시'],
  },
] as const;

const LOCAL_REGION_SEEDS: ReadonlyArray<LocalSeed> = [
  { id: 'seoul-gangnam', label: '서울 강남', areaCode: '1', aliases: ['강남', '강남구'] },
  { id: 'seoul-jongno', label: '서울 종로', areaCode: '1', aliases: ['종로', '종로구'] },
  { id: 'seoul-mapo', label: '서울 마포', areaCode: '1', aliases: ['마포', '마포구', '홍대', '연남'] },
  { id: 'seoul-songpa', label: '서울 송파', areaCode: '1', aliases: ['송파', '송파구', '잠실'] },
  { id: 'seoul-yongsan', label: '서울 용산', areaCode: '1', aliases: ['용산', '용산구', '이태원', '한남'] },
  { id: 'incheon-ganghwa', label: '인천 강화', areaCode: '2', aliases: ['강화', '강화군'] },
  { id: 'incheon-yeonsu', label: '인천 연수', areaCode: '2', aliases: ['연수', '연수구', '송도'] },
  { id: 'daejeon-yuseong', label: '대전 유성', areaCode: '3', aliases: ['유성', '유성구'] },
  { id: 'daejeon-jung', label: '대전 중구', areaCode: '3', aliases: ['대전 중구', '중구'] },
  { id: 'daegu-suseong', label: '대구 수성', areaCode: '4', aliases: ['수성', '수성구'] },
  { id: 'gwangju-dong', label: '광주 동구', areaCode: '5', aliases: ['광주 동구', '동구'] },
  { id: 'busan-haeundae', label: '부산 해운대', areaCode: '6', sigunguCode: '16', aliases: ['해운대', '해운대구'] },
  { id: 'busan-suyeong', label: '부산 수영', areaCode: '6', aliases: ['광안리', '수영구'] },
  { id: 'busan-gijang', label: '부산 기장', areaCode: '6', aliases: ['기장', '기장군'] },
  { id: 'ulsan-ulju', label: '울산 울주', areaCode: '7', aliases: ['울주', '울주군'] },
  { id: 'gyeonggi-goyang', label: '경기 고양', areaCode: '31', aliases: ['고양', '고양시', '일산', '일산동구', '일산서구', '덕양구'] },
  { id: 'gyeonggi-suwon', label: '경기 수원', areaCode: '31', aliases: ['수원', '수원시', '영통', '광교'] },
  { id: 'gyeonggi-yongin', label: '경기 용인', areaCode: '31', aliases: ['용인', '용인시', '기흥', '수지', '처인구'] },
  { id: 'gyeonggi-seongnam', label: '경기 성남', areaCode: '31', aliases: ['성남', '성남시', '분당', '판교', '수정구', '중원구'] },
  { id: 'gyeonggi-gimpo', label: '경기 김포', areaCode: '31', aliases: ['김포', '김포시'] },
  { id: 'gyeonggi-paju', label: '경기 파주', areaCode: '31', aliases: ['파주', '파주시'] },
  { id: 'gyeonggi-gapyeong', label: '경기 가평', areaCode: '31', aliases: ['가평', '가평군'] },
  { id: 'gyeonggi-yangpyeong', label: '경기 양평', areaCode: '31', aliases: ['양평', '양평군'] },
  { id: 'gyeonggi-namyangju', label: '경기 남양주', areaCode: '31', aliases: ['남양주', '남양주시'] },
  { id: 'gyeonggi-pocheon', label: '경기 포천', areaCode: '31', aliases: ['포천', '포천시'] },
  { id: 'gyeonggi-anseong', label: '경기 안성', areaCode: '31', aliases: ['안성', '안성시'] },
  { id: 'gyeonggi-yangju', label: '경기 양주', areaCode: '31', aliases: ['양주', '양주시'] },
  { id: 'gangwon-gangneung', label: '강원 강릉', areaCode: '32', aliases: ['강릉', '강릉시'] },
  { id: 'gangwon-sokcho', label: '강원 속초', areaCode: '32', sigunguCode: '5', aliases: ['속초', '속초시'] },
  { id: 'gangwon-yangyang', label: '강원 양양', areaCode: '32', aliases: ['양양', '양양군'] },
  { id: 'gangwon-chuncheon', label: '강원 춘천', areaCode: '32', aliases: ['춘천', '춘천시'] },
  { id: 'gangwon-wonju', label: '강원 원주', areaCode: '32', aliases: ['원주', '원주시'] },
  { id: 'gangwon-pyeongchang', label: '강원 평창', areaCode: '32', aliases: ['평창', '평창군'] },
  { id: 'gangwon-donghae', label: '강원 동해', areaCode: '32', aliases: ['동해', '동해시'] },
  { id: 'gangwon-samcheok', label: '강원 삼척', areaCode: '32', aliases: ['삼척', '삼척시'] },
  { id: 'gangwon-hongcheon', label: '강원 홍천', areaCode: '32', aliases: ['홍천', '홍천군'] },
  { id: 'chungbuk-cheongju', label: '충북 청주', areaCode: '33', aliases: ['청주', '청주시'] },
  { id: 'chungbuk-chungju', label: '충북 충주', areaCode: '33', aliases: ['충주', '충주시'] },
  { id: 'chungbuk-jecheon', label: '충북 제천', areaCode: '33', aliases: ['제천', '제천시'] },
  { id: 'chungnam-cheonan', label: '충남 천안', areaCode: '34', aliases: ['천안', '천안시'] },
  { id: 'chungnam-asan', label: '충남 아산', areaCode: '34', aliases: ['아산', '아산시'] },
  { id: 'chungnam-taean', label: '충남 태안', areaCode: '34', aliases: ['태안', '태안군'] },
  { id: 'chungnam-boryeong', label: '충남 보령', areaCode: '34', aliases: ['보령', '보령시', '대천'] },
  { id: 'chungnam-gongju', label: '충남 공주', areaCode: '34', aliases: ['공주', '공주시'] },
  { id: 'chungnam-seosan', label: '충남 서산', areaCode: '34', aliases: ['서산', '서산시'] },
  { id: 'gyeongbuk-gyeongju', label: '경북 경주', areaCode: '35', sigunguCode: '2', aliases: ['경주', '경주시'] },
  { id: 'gyeongbuk-pohang', label: '경북 포항', areaCode: '35', aliases: ['포항', '포항시'] },
  { id: 'gyeongbuk-andong', label: '경북 안동', areaCode: '35', aliases: ['안동', '안동시'] },
  { id: 'gyeongbuk-gumi', label: '경북 구미', areaCode: '35', aliases: ['구미', '구미시'] },
  { id: 'gyeongbuk-yeongdeok', label: '경북 영덕', areaCode: '35', aliases: ['영덕', '영덕군'] },
  { id: 'gyeongbuk-ulleung', label: '경북 울릉', areaCode: '35', aliases: ['울릉', '울릉군', '독도'] },
  { id: 'gyeongnam-changwon', label: '경남 창원', areaCode: '36', aliases: ['창원', '창원시', '마산', '진해'] },
  { id: 'gyeongnam-gimhae', label: '경남 김해', areaCode: '36', aliases: ['김해', '김해시'] },
  { id: 'gyeongnam-tongyeong', label: '경남 통영', areaCode: '36', aliases: ['통영', '통영시'] },
  { id: 'gyeongnam-geoje', label: '경남 거제', areaCode: '36', aliases: ['거제', '거제시'] },
  { id: 'gyeongnam-namhae', label: '경남 남해', areaCode: '36', aliases: ['남해', '남해군'] },
  { id: 'gyeongnam-sacheon', label: '경남 사천', areaCode: '36', aliases: ['사천', '사천시'] },
  { id: 'jeonbuk-jeonju', label: '전북 전주', areaCode: '37', aliases: ['전주', '전주시'] },
  { id: 'jeonbuk-gunsan', label: '전북 군산', areaCode: '37', aliases: ['군산', '군산시'] },
  { id: 'jeonbuk-namwon', label: '전북 남원', areaCode: '37', aliases: ['남원', '남원시'] },
  { id: 'jeonbuk-muju', label: '전북 무주', areaCode: '37', aliases: ['무주', '무주군'] },
  { id: 'jeonbuk-buan', label: '전북 부안', areaCode: '37', aliases: ['부안', '부안군'] },
  { id: 'jeonnam-yeosu', label: '전남 여수', areaCode: '38', aliases: ['여수', '여수시'] },
  { id: 'jeonnam-suncheon', label: '전남 순천', areaCode: '38', aliases: ['순천', '순천시'] },
  { id: 'jeonnam-mokpo', label: '전남 목포', areaCode: '38', aliases: ['목포', '목포시'] },
  { id: 'jeonnam-damyang', label: '전남 담양', areaCode: '38', aliases: ['담양', '담양군'] },
  { id: 'jeonnam-haenam', label: '전남 해남', areaCode: '38', aliases: ['해남', '해남군'] },
  { id: 'jeonnam-wando', label: '전남 완도', areaCode: '38', aliases: ['완도', '완도군'] },
  { id: 'jeju-jeju', label: '제주 제주시', areaCode: '39', aliases: ['제주시', '제주 시내', '애월', '조천', '구좌', '한림'] },
  { id: 'jeju-seogwipo', label: '제주 서귀포', areaCode: '39', sigunguCode: '3', aliases: ['서귀포', '서귀포시', '중문', '성산', '표선'] },
] as const;

function normalizeRegionKeyword(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function buildAliases(label: string, aliases: ReadonlyArray<string>): string[] {
  const tokens = new Set<string>();

  [label, ...aliases].forEach(alias => {
    const trimmed = alias.trim();
    if (!trimmed) {
      return;
    }

    tokens.add(trimmed);
    tokens.add(trimmed.replace(/특별자치도|특별자치시|특별시|광역시|자치시|자치도/g, ''));
    tokens.add(trimmed.replace(/시|군|구$/g, ''));
  });

  return [...tokens].filter(Boolean);
}

function buildAddressKeywords(
  label: string,
  addressKeywords: ReadonlyArray<string> | undefined,
  aliases: ReadonlyArray<string>,
): string[] {
  const keywords = new Set<string>(addressKeywords ?? []);
  [label, ...aliases].forEach(alias => {
    if (/[시군구]$/.test(alias)) {
      keywords.add(alias);
    }
  });
  return [...keywords];
}

const BROAD_REGIONS: ReadonlyArray<PetTravelRegion> = AREA_REGION_SEEDS.map(seed => ({
  id: seed.id,
  label: seed.label,
  areaCode: seed.areaCode,
  sigunguCode: null,
  description: seed.description,
  aliases: buildAliases(seed.label, seed.aliases),
  addressKeywords: buildAddressKeywords(
    seed.label,
    seed.addressKeywords,
    seed.aliases,
  ),
  scope: 'broad',
}));

const LOCAL_REGIONS: ReadonlyArray<PetTravelRegion> = LOCAL_REGION_SEEDS.map(seed => {
  const aliases = buildAliases(seed.label, seed.aliases ?? []);
  return {
    id: seed.id,
    label: seed.label,
    areaCode: seed.areaCode,
    sigunguCode: seed.sigunguCode ?? null,
    description:
      seed.description ?? `${seed.label} 생활권과 관광권 검색을 좁히는 지역 범위`,
    aliases,
    addressKeywords: buildAddressKeywords(
      seed.label,
      seed.addressKeywords,
      aliases,
    ),
    scope: 'local',
  };
});

export const PET_TRAVEL_REGIONS: ReadonlyArray<PetTravelRegion> = [
  ...BROAD_REGIONS,
  ...LOCAL_REGIONS,
] as const;

export const PET_TRAVEL_CATEGORIES: ReadonlyArray<PetTravelCategory> = [
  {
    id: 'all',
    label: '전체',
    description: '지역 안의 전체 여행 후보',
    contentTypeId: null,
  },
  {
    id: 'attraction',
    label: '관광지',
    description: '대표 관광지와 방문 포인트',
    contentTypeId: '12',
  },
  {
    id: 'stay',
    label: '숙소',
    description: '반려동물 동반 숙박 후보',
    contentTypeId: '32',
  },
  {
    id: 'restaurant',
    label: '음식점',
    description: '여행 중 들를 식음료 장소',
    contentTypeId: '39',
  },
  {
    id: 'experience',
    label: '체험',
    description: '현장 체험과 이용형 콘텐츠',
    contentTypeId: '28',
  },
  {
    id: 'outdoor',
    label: '야외공간',
    description: '산책과 체류가 가능한 야외 후보',
    contentTypeId: '12',
  },
] as const;

const REGION_ONLY_SUFFIX_PATTERN = /(특별자치도|특별자치시|특별시|광역시|자치도|자치시|도|시|군|구)$/;
const REGION_ONLY_TOKEN_PATTERN = /^[가-힣]{2,8}$/;
const REGION_QUERY_EXCLUDE_PATTERN =
  /(공원|수목원|정원|박물관|미술관|해변|호수|호텔|리조트|펜션|캠핑|전망대|목장|농원|카페|식당|맛집|숙소|풀빌라|애견|반려견|펫)/;

export function getPetTravelRegions(): ReadonlyArray<PetTravelRegion> {
  return PET_TRAVEL_REGIONS;
}

export function getPetTravelCategories(): ReadonlyArray<PetTravelCategory> {
  return PET_TRAVEL_CATEGORIES;
}

export function getPetTravelRegionById(id: string): PetTravelRegion | null {
  return PET_TRAVEL_REGIONS.find(region => region.id === id) ?? null;
}

export function resolvePetTravelRegionIntent(
  keyword: string,
): PetTravelRegionIntent | null {
  const normalizedKeyword = normalizeRegionKeyword(keyword);
  if (!normalizedKeyword) {
    return null;
  }

  const candidates = PET_TRAVEL_REGIONS.filter(region => region.id !== 'all')
    .flatMap(region =>
      region.aliases.map(alias => ({
        region,
        alias,
        normalizedAlias: normalizeRegionKeyword(alias),
      })),
    )
    .filter(({ normalizedAlias }) =>
      normalizedAlias === normalizedKeyword ||
      normalizedAlias.includes(normalizedKeyword) ||
      normalizedKeyword.includes(normalizedAlias),
    )
    .sort((left, right) => {
      const leftExact = left.normalizedAlias === normalizedKeyword ? 1 : 0;
      const rightExact = right.normalizedAlias === normalizedKeyword ? 1 : 0;
      if (leftExact !== rightExact) {
        return rightExact - leftExact;
      }

      const leftScope = left.region.scope === 'local' ? 1 : 0;
      const rightScope = right.region.scope === 'local' ? 1 : 0;
      if (leftScope !== rightScope) {
        return rightScope - leftScope;
      }

      return right.normalizedAlias.length - left.normalizedAlias.length;
    });

  const match = candidates[0];
  if (!match) {
    return null;
  }

  const isRegionOnlyQuery =
    REGION_ONLY_TOKEN_PATTERN.test(normalizedKeyword) &&
    !REGION_QUERY_EXCLUDE_PATTERN.test(normalizedKeyword) &&
    (REGION_ONLY_SUFFIX_PATTERN.test(keyword.trim()) ||
      normalizedKeyword === match.normalizedAlias);

  return {
    normalizedKeyword,
    region: match.region,
    matchedAlias: match.alias,
    isRegionOnlyQuery,
  };
}

export function resolvePetTravelRegionFromKeyword(
  keyword: string,
): PetTravelRegion | null {
  return resolvePetTravelRegionIntent(keyword)?.region ?? getPetTravelRegionById('all');
}

export function getPetTravelCategoryById(
  id: PetTravelCategory['id'],
): PetTravelCategory | null {
  return PET_TRAVEL_CATEGORIES.find(category => category.id === id) ?? null;
}

export function getPetTravelPlaceTypeLabel(
  placeType: PetTravelPlaceType,
): string {
  switch (placeType) {
    case 'pet-venue':
      return '펫 중심 장소';
    case 'outdoor':
      return '야외 여행지';
    case 'stay':
      return '숙박 후보';
    case 'restaurant':
      return '식음료 장소';
    case 'experience':
      return '체험 장소';
    case 'shopping':
      return '상업시설';
    case 'mixed':
      return '복합 장소';
    case 'travel-attraction':
    default:
      return '여행지';
  }
}

export function getPetTravelPetAllowedLabel(
  petAllowed: PetTravelPetAllowed,
): string {
  switch (petAllowed) {
    case 'confirmed':
      return '반려동물 동반 가능';
    case 'possible':
      return '반려동물 동반 가능성 있음';
    case 'check-required':
    default:
      return '현장 확인 필요';
  }
}
