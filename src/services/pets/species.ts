export type PetSpeciesGroup = 'dog' | 'cat' | 'other';

export type PetRepresentativeSpeciesKey =
  | 'dog'
  | 'cat'
  | 'hamster'
  | 'rabbit'
  | 'turtle'
  | 'bird'
  | 'fish'
  | 'other';

export type PetSpeciesOption = {
  key: PetSpeciesGroup;
  label: string;
  description: string;
  placeholders: {
    breed: string;
    detail: string;
  };
};

export type PetRepresentativeSpeciesOption = {
  key: PetRepresentativeSpeciesKey;
  label: string;
  description: string;
  group: PetSpeciesGroup;
  defaultDetailKey: string | null;
  defaultDisplayName: string;
  placeholders: {
    breed: string;
    detail: string;
  };
  showBreedField: boolean;
};

export type PetSpeciesQuickDetailOption = {
  label: string;
  detailKey: string;
};

export const PET_SPECIES_OPTIONS: ReadonlyArray<PetSpeciesOption> = Object.freeze([
  {
    key: 'dog',
    label: '강아지',
    description: '강아지 맞춤 가이드와 검색에 반영돼요.',
    placeholders: {
      breed: '품종을 입력해 주세요',
      detail: '예: 말티즈, 푸들',
    },
  },
  {
    key: 'cat',
    label: '고양이',
    description: '고양이 맞춤 가이드와 검색에 반영돼요.',
    placeholders: {
      breed: '품종을 입력해 주세요',
      detail: '예: 코리안숏헤어, 러시안블루',
    },
  },
  {
    key: 'other',
    label: '기타',
    description: '토끼, 햄스터, 거북이 등 기타 반려동물에 맞게 확장돼요.',
    placeholders: {
      breed: '품종 또는 세부종을 입력해 주세요',
      detail: '예: hamster, turtle, rabbit',
    },
  },
]);

export const PET_REPRESENTATIVE_SPECIES_OPTIONS: ReadonlyArray<PetRepresentativeSpeciesOption> =
  Object.freeze([
    {
      key: 'dog',
      label: '강아지',
      description: '강아지 맞춤 추천과 건강/행동 팁에 반영돼요.',
      group: 'dog',
      defaultDetailKey: 'dog',
      defaultDisplayName: '강아지',
      placeholders: {
        breed: '예: 말티즈, 푸들',
        detail: '예: 말티즈, 푸들',
      },
      showBreedField: true,
    },
    {
      key: 'cat',
      label: '고양이',
      description: '고양이 맞춤 추천과 환경/행동 팁에 반영돼요.',
      group: 'cat',
      defaultDetailKey: 'cat',
      defaultDisplayName: '고양이',
      placeholders: {
        breed: '예: 코리안숏헤어, 러시안블루',
        detail: '예: 코리안숏헤어, 브리티시숏헤어',
      },
      showBreedField: true,
    },
    {
      key: 'hamster',
      label: '햄스터',
      description: '햄스터 맞춤 환경/건강 팁에 반영돼요.',
      group: 'other',
      defaultDetailKey: 'hamster',
      defaultDisplayName: '햄스터',
      placeholders: {
        breed: '예: 골든, 드워프',
        detail: '예: 골든, 드워프, 로보로브스키',
      },
      showBreedField: false,
    },
    {
      key: 'rabbit',
      label: '토끼',
      description: '토끼 맞춤 식이/환경 팁에 반영돼요.',
      group: 'other',
      defaultDetailKey: 'rabbit',
      defaultDisplayName: '토끼',
      placeholders: {
        breed: '예: 네덜란드 드워프',
        detail: '예: 네덜란드 드워프, 라이언헤드',
      },
      showBreedField: false,
    },
    {
      key: 'turtle',
      label: '거북이',
      description: '거북이 맞춤 수온/바스킹 팁에 반영돼요.',
      group: 'other',
      defaultDetailKey: 'turtle',
      defaultDisplayName: '거북이',
      placeholders: {
        breed: '예: 리버쿠터',
        detail: '예: 리버쿠터, 육지거북',
      },
      showBreedField: false,
    },
    {
      key: 'bird',
      label: '새',
      description: '새 맞춤 생활/환경 팁 확장을 위한 기준 종이에요.',
      group: 'other',
      defaultDetailKey: 'bird',
      defaultDisplayName: '새',
      placeholders: {
        breed: '예: 코뉴어, 문조',
        detail: '예: 앵무새, 문조, 카나리아',
      },
      showBreedField: false,
    },
    {
      key: 'fish',
      label: '물고기',
      description: '물고기 맞춤 수질/사육 팁 확장을 위한 기준 종이에요.',
      group: 'other',
      defaultDetailKey: 'fish',
      defaultDisplayName: '물고기',
      placeholders: {
        breed: '예: 베타, 금붕어',
        detail: '예: 베타, 금붕어, 구피',
      },
      showBreedField: false,
    },
    {
      key: 'other',
      label: '기타',
      description: '대표 종에 없으면 직접 입력으로 등록해요.',
      group: 'other',
      defaultDetailKey: 'other',
      defaultDisplayName: '기타 반려동물',
      placeholders: {
        breed: '예: 페럿, 친칠라',
        detail: '예: 친칠라, 페럿, 도마뱀',
      },
      showBreedField: false,
    },
  ]);

const QUICK_DETAIL_OPTIONS: Readonly<Record<PetRepresentativeSpeciesKey, ReadonlyArray<PetSpeciesQuickDetailOption>>> =
  Object.freeze({
    dog: [
      { label: '말티즈', detailKey: 'maltese' },
      { label: '푸들', detailKey: 'poodle' },
      { label: '포메라니안', detailKey: 'pomeranian' },
      { label: '시츄', detailKey: 'shih-tzu' },
      { label: '믹스', detailKey: 'mixed-dog' },
    ],
    cat: [
      { label: '코리안숏헤어', detailKey: 'korean-shorthair' },
      { label: '러시안블루', detailKey: 'russian-blue' },
      { label: '브리티시숏헤어', detailKey: 'british-shorthair' },
      { label: '페르시안', detailKey: 'persian' },
      { label: '믹스', detailKey: 'mixed-cat' },
    ],
    hamster: [
      { label: '골든', detailKey: 'golden-hamster' },
      { label: '드워프', detailKey: 'dwarf-hamster' },
      { label: '로보로브스키', detailKey: 'roborovski' },
      { label: '캠벨', detailKey: 'campbell' },
    ],
    rabbit: [
      { label: '네덜란드 드워프', detailKey: 'netherland-dwarf' },
      { label: '라이언헤드', detailKey: 'lionhead' },
      { label: '미니렉스', detailKey: 'mini-rex' },
      { label: '믹스', detailKey: 'mixed-rabbit' },
    ],
    turtle: [
      { label: '리버쿠터', detailKey: 'river-cooter' },
      { label: '레드이어슬라이더', detailKey: 'red-eared-slider' },
      { label: '육지거북', detailKey: 'tortoise' },
    ],
    bird: [
      { label: '앵무새', detailKey: 'parrot' },
      { label: '문조', detailKey: 'java-sparrow' },
      { label: '카나리아', detailKey: 'canary' },
    ],
    fish: [
      { label: '베타', detailKey: 'betta' },
      { label: '금붕어', detailKey: 'goldfish' },
      { label: '구피', detailKey: 'guppy' },
      { label: '열대어', detailKey: 'tropical-fish' },
    ],
    other: [
      { label: '친칠라', detailKey: 'chinchilla' },
      { label: '페럿', detailKey: 'ferret' },
      { label: '고슴도치', detailKey: 'hedgehog' },
      { label: '도마뱀', detailKey: 'lizard' },
    ],
  });

function normalizeLooseText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null;
}

export function normalizePetSpeciesGroup(
  value: unknown,
): PetSpeciesGroup | null {
  return value === 'dog' || value === 'cat' || value === 'other' ? value : null;
}

export function normalizePetSpeciesDetailKey(value: unknown): string | null {
  return typeof value === 'string' && value.trim()
    ? value.trim().toLowerCase()
    : null;
}

export function normalizePetSpeciesDisplayName(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function getPetSpeciesGroupLabel(
  species: PetSpeciesGroup | null | undefined,
): string {
  switch (species) {
    case 'dog':
      return '강아지';
    case 'cat':
      return '고양이';
    case 'other':
      return '기타 반려동물';
    default:
      return '반려동물';
  }
}

export function getRepresentativeSpeciesLabel(
  key: PetRepresentativeSpeciesKey,
): string {
  return (
    PET_REPRESENTATIVE_SPECIES_OPTIONS.find(option => option.key === key)?.label ??
    '기타'
  );
}

export function getRepresentativeSpeciesOption(
  key: PetRepresentativeSpeciesKey,
): PetRepresentativeSpeciesOption {
  return (
    PET_REPRESENTATIVE_SPECIES_OPTIONS.find(option => option.key === key) ??
    PET_REPRESENTATIVE_SPECIES_OPTIONS[PET_REPRESENTATIVE_SPECIES_OPTIONS.length - 1]
  );
}

export function getPetSpeciesQuickDetailOptions(
  key: PetRepresentativeSpeciesKey,
): ReadonlyArray<PetSpeciesQuickDetailOption> {
  return QUICK_DETAIL_OPTIONS[key] ?? [];
}

export function deriveRepresentativeSpeciesKey(input: {
  species: PetSpeciesGroup | null | undefined;
  speciesDetailKey?: string | null | undefined;
  speciesDisplayName?: string | null | undefined;
}): PetRepresentativeSpeciesKey {
  const normalizedSpecies = normalizePetSpeciesGroup(input.species);
  const detail = normalizeLooseText(input.speciesDetailKey);
  const display = normalizeLooseText(input.speciesDisplayName);
  const joined = `${detail ?? ''} ${display ?? ''}`;

  if (normalizedSpecies === 'dog') return 'dog';
  if (normalizedSpecies === 'cat') return 'cat';

  if (joined.includes('hamster') || joined.includes('햄스터')) return 'hamster';
  if (joined.includes('rabbit') || joined.includes('토끼')) return 'rabbit';
  if (
    joined.includes('turtle') ||
    joined.includes('거북') ||
    joined.includes('tortoise')
  ) {
    return 'turtle';
  }
  if (joined.includes('bird') || joined.includes('새') || joined.includes('앵무')) {
    return 'bird';
  }
  if (
    joined.includes('fish') ||
    joined.includes('물고기') ||
    joined.includes('금붕어') ||
    joined.includes('열대어')
  ) {
    return 'fish';
  }

  return 'other';
}

export function buildPetSpeciesSelection(
  representative: PetRepresentativeSpeciesKey,
  detailInput: string,
): {
  species: PetSpeciesGroup;
  speciesDetailKey: string;
  speciesDisplayName: string;
} {
  const option = getRepresentativeSpeciesOption(representative);
  const trimmedDetail = detailInput.trim();

  if (!trimmedDetail) {
    return {
      species: option.group,
      speciesDetailKey: option.defaultDetailKey ?? option.key,
      speciesDisplayName: option.defaultDisplayName,
    };
  }

  return {
    species: option.group,
    speciesDetailKey: normalizePetSpeciesDetailKey(trimmedDetail) ?? option.defaultDetailKey ?? option.key,
    speciesDisplayName: trimmedDetail,
  };
}

export function getPetSpeciesSearchKeywords(input: {
  species: PetSpeciesGroup | null | undefined;
  speciesDetailKey?: string | null | undefined;
  speciesDisplayName?: string | null | undefined;
}): string[] {
  const keywords = new Set<string>();

  const normalizedSpecies = normalizePetSpeciesGroup(input.species);
  if (normalizedSpecies === 'dog') {
    keywords.add('dog');
    keywords.add('강아지');
    keywords.add('개');
  }
  if (normalizedSpecies === 'cat') {
    keywords.add('cat');
    keywords.add('고양이');
    keywords.add('냥이');
  }
  if (normalizedSpecies === 'other') {
    keywords.add('other');
    keywords.add('기타');
    keywords.add('기타 반려동물');
  }

  const representative = deriveRepresentativeSpeciesKey(input);
  if (representative !== 'other') {
    keywords.add(representative);
    keywords.add(getRepresentativeSpeciesLabel(representative));
  }

  const detailKey = normalizePetSpeciesDetailKey(input.speciesDetailKey);
  const displayName = normalizePetSpeciesDisplayName(input.speciesDisplayName);

  if (detailKey) keywords.add(detailKey);
  if (displayName) keywords.add(displayName);

  return Array.from(keywords);
}
