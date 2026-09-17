import {
  buildPetSpeciesSelection,
  deriveCanonicalPetSpeciesKey,
  getPetSpeciesQuickDetailOptions,
  PET_CANONICAL_SPECIES,
  resolveSubtypeAfterSpeciesChange,
} from '../src/services/pets/species';

describe('canonical pet species taxonomy', () => {
  it('defines ten active species with unique business and guide keys', () => {
    const active = PET_CANONICAL_SPECIES.filter(species => species.isActive);
    expect(active).toHaveLength(10);
    expect(new Set(active.map(species => species.speciesKey)).size).toBe(
      active.length,
    );
    expect(new Set(active.map(species => species.guideSpeciesKey)).size).toBe(
      active.length,
    );
    expect(active.map(species => species.speciesKey)).toEqual([
      'DOG',
      'CAT',
      'RABBIT',
      'HAMSTER',
      'GUINEA_PIG',
      'FERRET',
      'BIRD',
      'FISH',
      'REPTILE',
      'OTHER',
    ]);
  });

  it('keeps subtype keys unique inside every species', () => {
    PET_CANONICAL_SPECIES.forEach(species => {
      const keys = species.subtypes.map(item => item.subtypeKey);
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys.every(key => /^[a-z0-9-]+$/.test(key))).toBe(true);
    });
  });

  it.each([
    [{ species: 'dog' as const }, 'DOG'],
    [{ species: 'cat' as const }, 'CAT'],
    [
      { species: 'other' as const, speciesDetailKey: 'golden-hamster' },
      'HAMSTER',
    ],
    [
      { species: 'other' as const, speciesDisplayName: '네덜란드 드워프 토끼' },
      'RABBIT',
    ],
    [
      { species: 'other' as const, speciesDisplayName: '기니피그' },
      'GUINEA_PIG',
    ],
    [{ species: 'other' as const, speciesDisplayName: '페럿' }, 'FERRET'],
    [{ species: 'other' as const, speciesDisplayName: '코뉴어' }, 'BIRD'],
    [{ species: 'other' as const, speciesDisplayName: '베타' }, 'FISH'],
    [{ species: 'other' as const, speciesDisplayName: '리버쿠터' }, 'REPTILE'],
    [
      { species: 'other' as const, speciesDisplayName: '알 수 없는 기존 값' },
      'OTHER',
    ],
  ])('maps legacy values without destructive rewrites', (input, expected) => {
    expect(deriveCanonicalPetSpeciesKey(input)).toBe(expected);
  });

  it('stores known subtype keys while keeping custom legacy labels visible', () => {
    expect(buildPetSpeciesSelection('DOG', '말티즈')).toEqual({
      species: 'dog',
      speciesKey: 'DOG',
      speciesDetailKey: 'maltese',
      speciesDisplayName: '말티즈',
    });

    expect(buildPetSpeciesSelection('OTHER', '데구')).toEqual({
      species: 'other',
      speciesKey: 'OTHER',
      speciesDetailKey: '데구',
      speciesDisplayName: '데구',
    });
  });

  it('clears incompatible subtype only when the species actually changes', () => {
    expect(
      resolveSubtypeAfterSpeciesChange({
        previousSpeciesKey: 'DOG',
        nextSpeciesKey: 'DOG',
        currentSubtype: '말티즈',
      }),
    ).toBe('말티즈');
    expect(
      resolveSubtypeAfterSpeciesChange({
        previousSpeciesKey: 'DOG',
        nextSpeciesKey: 'CAT',
        currentSubtype: '말티즈',
      }),
    ).toBe('');
  });

  it('preserves the canonical species of an unrecognized custom subtype after save', () => {
    const selection = buildPetSpeciesSelection('HAMSTER', '새로운 세부종');
    expect(deriveCanonicalPetSpeciesKey(selection)).toBe('HAMSTER');
    expect(deriveCanonicalPetSpeciesKey({ ...selection, species: 'dog' })).toBe(
      'DOG',
    );
  });

  it('exposes searchable subtype choices for every active species', () => {
    PET_CANONICAL_SPECIES.filter(species => species.isActive).forEach(
      species => {
        const options = getPetSpeciesQuickDetailOptions(species.speciesKey);
        if (species.speciesKey === 'OTHER') {
          expect(options.length).toBeGreaterThanOrEqual(3);
        } else {
          expect(options.length).toBeGreaterThanOrEqual(4);
        }
      },
    );
  });
});
