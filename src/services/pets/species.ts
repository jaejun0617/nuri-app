export type PetSpeciesGroup = 'dog' | 'cat' | 'other';

export type PetSpeciesKey =
  | 'DOG'
  | 'CAT'
  | 'RABBIT'
  | 'HAMSTER'
  | 'GUINEA_PIG'
  | 'FERRET'
  | 'BIRD'
  | 'FISH'
  | 'REPTILE'
  | 'OTHER';

// Kept as an alias while screens migrate from the old representative-species name.
export type PetRepresentativeSpeciesKey = PetSpeciesKey;

export type PetSpeciesOption = {
  key: PetSpeciesGroup;
  label: string;
  description: string;
  placeholders: { breed: string; detail: string };
};

export type PetSpeciesSubtype = {
  subtypeKey: string;
  subtypeLabel: string;
  aliases: ReadonlyArray<string>;
  displayOrder: number;
};

export type PetSpeciesDefinition = {
  speciesKey: PetSpeciesKey;
  speciesLabel: string;
  aliases: ReadonlyArray<string>;
  displayOrder: number;
  guideSpeciesKey: PetSpeciesKey;
  isActive: boolean;
  group: PetSpeciesGroup;
  defaultSubtypeKey: string;
  defaultDisplayName: string;
  description: string;
  placeholders: { breed: string; detail: string };
  metadata: {
    detailLabel: '품종/세부 종' | '세부 종' | '종류';
    allowCustomSubtype: boolean;
  };
  subtypes: ReadonlyArray<PetSpeciesSubtype>;
};

export type PetRepresentativeSpeciesOption = {
  key: PetSpeciesKey;
  label: string;
  description: string;
  group: PetSpeciesGroup;
  defaultDetailKey: string;
  defaultDisplayName: string;
  placeholders: { breed: string; detail: string };
  showBreedField: boolean;
  detailLabel: PetSpeciesDefinition['metadata']['detailLabel'];
};

export type PetSpeciesQuickDetailOption = {
  label: string;
  detailKey: string;
};

function subtype(
  subtypeKey: string,
  subtypeLabel: string,
  displayOrder: number,
  aliases: ReadonlyArray<string> = [],
): PetSpeciesSubtype {
  return Object.freeze({ subtypeKey, subtypeLabel, aliases, displayOrder });
}

export const PET_SPECIES_GROUP_OPTIONS: ReadonlyArray<PetSpeciesOption> =
  Object.freeze([
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
      description: '소동물, 조류, 어류, 파충류를 포함해 확장돼요.',
      placeholders: {
        breed: '품종 또는 세부종을 입력해 주세요',
        detail: '예: 페럿, 고슴도치, 친칠라',
      },
    },
  ]);

// Legacy export retained for callers that still need the three-value DB group contract.
export const PET_SPECIES_OPTIONS = PET_SPECIES_GROUP_OPTIONS;

export const PET_CANONICAL_SPECIES: ReadonlyArray<PetSpeciesDefinition> =
  Object.freeze([
    {
      speciesKey: 'DOG',
      speciesLabel: '강아지',
      aliases: ['dog', 'dogs', '개', '강아지', '반려견'],
      displayOrder: 10,
      guideSpeciesKey: 'DOG',
      isActive: true,
      group: 'dog',
      defaultSubtypeKey: 'dog',
      defaultDisplayName: '강아지',
      description: '강아지 맞춤 추천과 건강·행동 팁에 반영돼요.',
      placeholders: {
        breed: '예: 말티즈, 푸들',
        detail: '품종을 검색하거나 입력해 주세요',
      },
      metadata: { detailLabel: '품종/세부 종', allowCustomSubtype: true },
      subtypes: [
        subtype('maltese', '말티즈', 10),
        subtype('poodle', '푸들', 20, ['토이푸들', '미니어처푸들']),
        subtype('pomeranian', '포메라니안', 30, ['포메']),
        subtype('shih-tzu', '시츄', 40, ['시추']),
        subtype('jindo', '진돗개', 50, ['진도견']),
        subtype('retriever', '리트리버', 60, [
          '골든리트리버',
          '래브라도리트리버',
        ]),
        subtype('bichon-frise', '비숑 프리제', 70, ['비숑']),
        subtype('chihuahua', '치와와', 80),
        subtype('welsh-corgi', '웰시코기', 90, ['코기']),
        subtype('mixed-dog', '믹스견', 100, ['믹스', '혼종']),
      ],
    },
    {
      speciesKey: 'CAT',
      speciesLabel: '고양이',
      aliases: ['cat', 'cats', '고양이', '냥이', '반려묘'],
      displayOrder: 20,
      guideSpeciesKey: 'CAT',
      isActive: true,
      group: 'cat',
      defaultSubtypeKey: 'cat',
      defaultDisplayName: '고양이',
      description: '고양이 맞춤 추천과 환경·행동 팁에 반영돼요.',
      placeholders: {
        breed: '예: 코리안숏헤어, 러시안블루',
        detail: '품종을 검색하거나 입력해 주세요',
      },
      metadata: { detailLabel: '품종/세부 종', allowCustomSubtype: true },
      subtypes: [
        subtype('korean-shorthair', '코리안숏헤어', 10, ['코숏']),
        subtype('russian-blue', '러시안블루', 20),
        subtype('british-shorthair', '브리티시숏헤어', 30, ['브숏']),
        subtype('persian', '페르시안', 40),
        subtype('scottish-fold', '스코티시폴드', 50, ['스코티시 폴드']),
        subtype('ragdoll', '랙돌', 60),
        subtype('siamese', '샴', 70, ['샴고양이']),
        subtype('maine-coon', '메인쿤', 80),
        subtype('abyssinian', '아비시니안', 90),
        subtype('mixed-cat', '믹스묘', 100, ['믹스', '혼종']),
      ],
    },
    {
      speciesKey: 'RABBIT',
      speciesLabel: '토끼',
      aliases: ['rabbit', 'bunny', '토끼'],
      displayOrder: 30,
      guideSpeciesKey: 'RABBIT',
      isActive: true,
      group: 'other',
      defaultSubtypeKey: 'rabbit',
      defaultDisplayName: '토끼',
      description: '토끼 맞춤 식이·치아·생활환경 팁에 반영돼요.',
      placeholders: {
        breed: '예: 네덜란드 드워프',
        detail: '종류를 검색하거나 입력해 주세요',
      },
      metadata: { detailLabel: '품종/세부 종', allowCustomSubtype: true },
      subtypes: [
        subtype('netherland-dwarf', '네덜란드 드워프', 10),
        subtype('lionhead', '라이언헤드', 20),
        subtype('mini-rex', '미니렉스', 30),
        subtype('holland-lop', '홀랜드롭', 40, ['롭이어']),
        subtype('mixed-rabbit', '믹스 토끼', 50, ['믹스']),
      ],
    },
    {
      speciesKey: 'HAMSTER',
      speciesLabel: '햄스터',
      aliases: ['hamster', '햄스터'],
      displayOrder: 40,
      guideSpeciesKey: 'HAMSTER',
      isActive: true,
      group: 'other',
      defaultSubtypeKey: 'hamster',
      defaultDisplayName: '햄스터',
      description: '햄스터 맞춤 야행성 생활·환경·건강 팁에 반영돼요.',
      placeholders: {
        breed: '예: 골든, 드워프',
        detail: '종류를 검색하거나 입력해 주세요',
      },
      metadata: { detailLabel: '종류', allowCustomSubtype: true },
      subtypes: [
        subtype('golden-hamster', '골든 햄스터', 10, ['골든', '시리안']),
        subtype('dwarf-hamster', '드워프 햄스터', 20, ['드워프']),
        subtype('roborovski', '로보로브스키', 30, ['로보']),
        subtype('campbell', '캠벨', 40),
        subtype('chinese-hamster', '차이니즈 햄스터', 50),
      ],
    },
    {
      speciesKey: 'GUINEA_PIG',
      speciesLabel: '기니피그',
      aliases: ['guinea pig', 'guinea-pig', 'guineapig', '기니피그'],
      displayOrder: 50,
      guideSpeciesKey: 'GUINEA_PIG',
      isActive: true,
      group: 'other',
      defaultSubtypeKey: 'guinea-pig',
      defaultDisplayName: '기니피그',
      description: '기니피그 맞춤 비타민 C·식이·환경 팁에 반영돼요.',
      placeholders: {
        breed: '예: 아메리칸, 아비시니안',
        detail: '종류를 검색하거나 입력해 주세요',
      },
      metadata: { detailLabel: '종류', allowCustomSubtype: true },
      subtypes: [
        subtype('american-guinea-pig', '아메리칸', 10, ['아메리칸 기니피그']),
        subtype('abyssinian-guinea-pig', '아비시니안', 20, [
          '아비시니안 기니피그',
        ]),
        subtype('peruvian-guinea-pig', '페루비안', 30),
        subtype('skinny-pig', '스키니피그', 40, ['스키니 피그']),
      ],
    },
    {
      speciesKey: 'FERRET',
      speciesLabel: '페럿',
      aliases: ['ferret', '페럿', '패럿'],
      displayOrder: 60,
      guideSpeciesKey: 'FERRET',
      isActive: true,
      group: 'other',
      defaultSubtypeKey: 'ferret',
      defaultDisplayName: '페럿',
      description: '페럿 맞춤 안전·식이·활동 팁에 반영돼요.',
      placeholders: {
        breed: '예: 세이블, 알비노',
        detail: '종류를 검색하거나 입력해 주세요',
      },
      metadata: { detailLabel: '종류', allowCustomSubtype: true },
      subtypes: [
        subtype('sable-ferret', '세이블', 10),
        subtype('albino-ferret', '알비노', 20),
        subtype('silver-ferret', '실버', 30),
        subtype('cinnamon-ferret', '시나몬', 40),
      ],
    },
    {
      speciesKey: 'BIRD',
      speciesLabel: '조류',
      aliases: ['bird', 'birds', '새', '조류', '앵무'],
      displayOrder: 70,
      guideSpeciesKey: 'BIRD',
      isActive: true,
      group: 'other',
      defaultSubtypeKey: 'bird',
      defaultDisplayName: '조류',
      description: '조류 맞춤 환경·영양·행동 관찰 팁에 반영돼요.',
      placeholders: {
        breed: '예: 코뉴어, 문조',
        detail: '종류를 검색하거나 입력해 주세요',
      },
      metadata: { detailLabel: '종류', allowCustomSubtype: true },
      subtypes: [
        subtype('parrot', '앵무새', 10, ['앵무']),
        subtype('conure', '코뉴어', 20),
        subtype('budgerigar', '잉꼬', 30, ['사랑앵무']),
        subtype('cockatiel', '왕관앵무', 40),
        subtype('java-sparrow', '문조', 50),
        subtype('canary', '카나리아', 60),
        subtype('finch', '핀치', 70),
      ],
    },
    {
      speciesKey: 'FISH',
      speciesLabel: '어류',
      aliases: ['fish', 'fishes', '물고기', '어류', '관상어'],
      displayOrder: 80,
      guideSpeciesKey: 'FISH',
      isActive: true,
      group: 'other',
      defaultSubtypeKey: 'fish',
      defaultDisplayName: '어류',
      description: '어류 맞춤 수질·수조·급여 팁에 반영돼요.',
      placeholders: {
        breed: '예: 베타, 금붕어',
        detail: '종류를 검색하거나 입력해 주세요',
      },
      metadata: { detailLabel: '종류', allowCustomSubtype: true },
      subtypes: [
        subtype('betta', '베타', 10),
        subtype('goldfish', '금붕어', 20),
        subtype('guppy', '구피', 30),
        subtype('tetra', '테트라', 40),
        subtype('cichlid', '시클리드', 50),
        subtype('tropical-fish', '열대어', 60),
      ],
    },
    {
      speciesKey: 'REPTILE',
      speciesLabel: '파충류',
      aliases: [
        'reptile',
        'reptiles',
        '파충류',
        'turtle',
        'tortoise',
        '거북',
        '도마뱀',
        '뱀',
      ],
      displayOrder: 90,
      guideSpeciesKey: 'REPTILE',
      isActive: true,
      group: 'other',
      defaultSubtypeKey: 'reptile',
      defaultDisplayName: '파충류',
      description: '거북이·도마뱀 등 파충류의 온도·조명·환경 팁에 반영돼요.',
      placeholders: {
        breed: '예: 육지거북, 레오파드게코',
        detail: '종류를 검색하거나 입력해 주세요',
      },
      metadata: { detailLabel: '종류', allowCustomSubtype: true },
      subtypes: [
        subtype('aquatic-turtle', '수생거북', 10, [
          '리버쿠터',
          '레드이어슬라이더',
          '거북이',
        ]),
        subtype('tortoise', '육지거북', 20),
        subtype('leopard-gecko', '레오파드게코', 30, ['표범도마뱀붙이']),
        subtype('crested-gecko', '크레스티드게코', 40),
        subtype('bearded-dragon', '비어디드래곤', 50),
        subtype('snake', '뱀', 60),
      ],
    },
    {
      speciesKey: 'OTHER',
      speciesLabel: '기타',
      aliases: ['other', '기타', '기타 반려동물', '소동물'],
      displayOrder: 100,
      guideSpeciesKey: 'OTHER',
      isActive: true,
      group: 'other',
      defaultSubtypeKey: 'other',
      defaultDisplayName: '기타 반려동물',
      description: '목록에 없는 반려동물은 종류를 직접 입력해 등록해요.',
      placeholders: {
        breed: '예: 고슴도치, 친칠라',
        detail: '종류를 직접 입력해 주세요',
      },
      metadata: { detailLabel: '종류', allowCustomSubtype: true },
      subtypes: [
        subtype('hedgehog', '고슴도치', 10, ['hedgehog']),
        subtype('chinchilla', '친칠라', 20, ['chinchilla']),
        subtype('sugar-glider', '슈가글라이더', 30, ['sugar glider']),
        subtype('other', '직접 입력', 100),
      ],
    },
  ]);

const ACTIVE_SPECIES = PET_CANONICAL_SPECIES.filter(
  species => species.isActive,
).sort((left, right) => left.displayOrder - right.displayOrder);

export const PET_REPRESENTATIVE_SPECIES_OPTIONS: ReadonlyArray<PetRepresentativeSpeciesOption> =
  Object.freeze(
    ACTIVE_SPECIES.map(species => ({
      key: species.speciesKey,
      label: species.speciesLabel,
      description: species.description,
      group: species.group,
      defaultDetailKey: species.defaultSubtypeKey,
      defaultDisplayName: species.defaultDisplayName,
      placeholders: species.placeholders,
      showBreedField: species.metadata.detailLabel === '품종/세부 종',
      detailLabel: species.metadata.detailLabel,
    })),
  );

function normalizeLooseText(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().toLowerCase().replace(/[_.]/g, '-').replace(/\s+/g, ' ');
}

function normalizeAliasToken(value: string): string {
  return normalizeLooseText(value)?.replace(/[\s-]/g, '') ?? '';
}

function findSubtype(
  species: PetSpeciesDefinition,
  value: string,
): PetSpeciesSubtype | null {
  const token = normalizeAliasToken(value);
  if (!token) return null;
  return (
    species.subtypes.find(candidate =>
      [candidate.subtypeKey, candidate.subtypeLabel, ...candidate.aliases].some(
        alias => normalizeAliasToken(alias) === token,
      ),
    ) ?? null
  );
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
  if (species === 'dog') return '강아지';
  if (species === 'cat') return '고양이';
  if (species === 'other') return '기타 반려동물';
  return '반려동물';
}

export function getPetSpeciesDefinition(
  key: PetSpeciesKey,
): PetSpeciesDefinition {
  return (
    PET_CANONICAL_SPECIES.find(species => species.speciesKey === key) ??
    PET_CANONICAL_SPECIES[PET_CANONICAL_SPECIES.length - 1]
  );
}

export function getRepresentativeSpeciesLabel(key: PetSpeciesKey): string {
  return getPetSpeciesDefinition(key).speciesLabel;
}

export function getRepresentativeSpeciesOption(
  key: PetSpeciesKey,
): PetRepresentativeSpeciesOption {
  return (
    PET_REPRESENTATIVE_SPECIES_OPTIONS.find(option => option.key === key) ??
    PET_REPRESENTATIVE_SPECIES_OPTIONS[PET_REPRESENTATIVE_SPECIES_OPTIONS.length - 1]
  );
}

export function getPetSpeciesQuickDetailOptions(
  key: PetSpeciesKey,
): ReadonlyArray<PetSpeciesQuickDetailOption> {
  return getPetSpeciesDefinition(key)
    .subtypes.filter(item => item.subtypeKey !== 'other')
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map(item => ({ label: item.subtypeLabel, detailKey: item.subtypeKey }));
}

export function deriveCanonicalPetSpeciesKey(input: {
  speciesKey?: PetSpeciesKey | null;
  species: PetSpeciesGroup | null | undefined;
  speciesDetailKey?: string | null | undefined;
  speciesDisplayName?: string | null | undefined;
  breed?: string | null | undefined;
}): PetSpeciesKey {
  const normalizedSpecies = normalizePetSpeciesGroup(input.species);
  const canonical = PET_CANONICAL_SPECIES.find(
    item => item.speciesKey === input.speciesKey,
  );
  if (canonical && canonical.group === normalizedSpecies)
    return canonical.speciesKey;
  if (normalizedSpecies === 'dog') return 'DOG';
  if (normalizedSpecies === 'cat') return 'CAT';

  const candidates = [
    input.speciesDetailKey,
    input.speciesDisplayName,
    input.breed,
  ]
    .map(value => normalizeAliasToken(value ?? ''))
    .filter(Boolean);

  for (const species of ACTIVE_SPECIES) {
    if (
      species.speciesKey === 'DOG' ||
      species.speciesKey === 'CAT' ||
      species.speciesKey === 'OTHER'
    ) {
      continue;
    }
    const aliases = [
      species.speciesKey,
      species.speciesLabel,
      species.defaultSubtypeKey,
      species.defaultDisplayName,
      ...species.aliases,
      ...species.subtypes.flatMap(item => [
        item.subtypeKey,
        item.subtypeLabel,
        ...item.aliases,
      ]),
    ].map(normalizeAliasToken);

    if (
      candidates.some(candidate =>
        aliases.some(alias =>
          alias.length < 2 ? candidate === alias : candidate.includes(alias),
        ),
      )
    ) {
      return species.speciesKey;
    }
  }

  return 'OTHER';
}

export const deriveRepresentativeSpeciesKey = deriveCanonicalPetSpeciesKey;

export function resolveSubtypeAfterSpeciesChange(input: {
  previousSpeciesKey: PetSpeciesKey;
  nextSpeciesKey: PetSpeciesKey;
  currentSubtype: string;
}): string {
  return input.previousSpeciesKey === input.nextSpeciesKey
    ? input.currentSubtype
    : '';
}

export function buildPetSpeciesSelection(
  speciesKey: PetSpeciesKey,
  detailInput: string,
): {
  species: PetSpeciesGroup;
  speciesKey: PetSpeciesKey;
  speciesDetailKey: string;
  speciesDisplayName: string;
} {
  const species = getPetSpeciesDefinition(speciesKey);
  const trimmedDetail = detailInput.trim();
  const knownSubtype = trimmedDetail
    ? findSubtype(species, trimmedDetail)
    : null;

  if (knownSubtype) {
    return {
      species: species.group,
      speciesKey: species.speciesKey,
      speciesDetailKey: knownSubtype.subtypeKey,
      speciesDisplayName: knownSubtype.subtypeLabel,
    };
  }

  if (!trimmedDetail) {
    return {
      species: species.group,
      speciesKey: species.speciesKey,
      speciesDetailKey: species.defaultSubtypeKey,
      speciesDisplayName: species.defaultDisplayName,
    };
  }

  return {
    species: species.group,
    speciesKey: species.speciesKey,
    speciesDetailKey:
      normalizePetSpeciesDetailKey(trimmedDetail) ?? species.defaultSubtypeKey,
    speciesDisplayName: trimmedDetail,
  };
}

export function getPetSpeciesSearchKeywords(input: {
  speciesKey?: PetSpeciesKey | null;
  species: PetSpeciesGroup | null | undefined;
  speciesDetailKey?: string | null | undefined;
  speciesDisplayName?: string | null | undefined;
}): string[] {
  const keywords = new Set<string>();
  const speciesKey = deriveCanonicalPetSpeciesKey(input);
  const definition = getPetSpeciesDefinition(speciesKey);

  keywords.add(speciesKey.toLowerCase());
  keywords.add(definition.speciesLabel);
  definition.aliases.forEach(alias => keywords.add(alias));

  const detailKey = normalizePetSpeciesDetailKey(input.speciesDetailKey);
  const displayName = normalizePetSpeciesDisplayName(input.speciesDisplayName);
  if (detailKey) keywords.add(detailKey);
  if (displayName) keywords.add(displayName);
  return Array.from(keywords);
}
