import AsyncStorage from '@react-native-async-storage/async-storage';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  auditPublishedGuideCoverage,
  GUIDE_MINIMUM_BY_SPECIES,
} from '../src/services/guides/coverage';
import type {
  PetCareGuide,
  PetGuideSpecies,
} from '../src/services/guides/types';
import { pickHomeGuideRecommendations } from '../src/services/guides/rotation';
import { filterPetCareGuidesForListAudience } from '../src/services/guides/service';
import {
  PET_CANONICAL_SPECIES,
  type PetSpeciesKey,
} from '../src/services/pets/species';
import { getGuideContentBlockPresentation } from '../src/screens/Guides/GuideDetailScreen';

function makeGuide(
  id: string,
  species: PetGuideSpecies,
  title = id,
): PetCareGuide {
  return {
    id,
    slug: id,
    title,
    summary: `${title} 요약`,
    body: `${title} 본문`,
    bodyPreview: `${title} 미리보기`,
    category: 'daily-care',
    tags: [],
    targetSpecies: [species],
    contentBlocks: [
      { id: 'normal', role: 'normal', title: null, body: `${title} 본문` },
      {
        id: 'warning',
        role: 'warning',
        title: '주의',
        body: `${title} 주의 내용`,
      },
    ],
    sources: [
      {
        label: 'Veterinary source',
        url: 'https://example.com/source',
        publisher: 'Example',
        reviewedAt: '2026-09-17',
      },
    ],
    speciesKeywords: [],
    searchKeywords: [],
    agePolicy: {
      type: 'all',
      lifeStage: null,
      minMonths: null,
      maxMonths: null,
    },
    status: 'published',
    isActive: true,
    sortOrder: 0,
    priority: 1,
    rotationWeight: 1,
    image: null,
    publishedAt: '2026-09-17T00:00:00.000Z',
    createdAt: '2026-09-17T00:00:00.000Z',
    updatedAt: '2026-09-17T00:00:00.000Z',
  };
}

describe('species-aware guide platform', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
  });

  it('enforces twenty dog/cat guides and ten for every other active species', () => {
    expect(GUIDE_MINIMUM_BY_SPECIES).toEqual({
      DOG: 20,
      CAT: 20,
      RABBIT: 10,
      HAMSTER: 10,
      GUINEA_PIG: 10,
      FERRET: 10,
      BIRD: 10,
      FISH: 10,
      REPTILE: 10,
      OTHER: 10,
    });
  });

  it('audits coverage, duplicate titles and missing species independently', () => {
    const guides = PET_CANONICAL_SPECIES.flatMap(species =>
      Array.from(
        { length: GUIDE_MINIMUM_BY_SPECIES[species.speciesKey] },
        (_, index) =>
          makeGuide(
            `${species.speciesKey.toLowerCase()}-${index}`,
            species.speciesKey,
            `${species.speciesLabel} 가이드 ${index + 1}`,
          ),
      ),
    );
    const audit = auditPublishedGuideCoverage(guides);
    expect(audit.belowMinimum).toEqual([]);
    expect(audit.duplicateTitles).toEqual([]);
    expect(audit.guidesWithoutSpecies).toEqual([]);
  });

  it('keeps every semantic role in the additive SQL seed and uses canonical species keys', () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260917090000_pack04_species_guide_platform.sql',
      ),
      'utf8',
    );
    const roles = ['normal', 'important', 'tip', 'warning', 'danger'];
    roles.forEach(role => expect(sql).toContain(`'role', '${role}'`));

    const speciesKeys = PET_CANONICAL_SPECIES.map(
      species => species.speciesKey,
    );
    speciesKeys.forEach((speciesKey: PetSpeciesKey) => {
      expect(sql).toContain(`'${speciesKey}'`);
    });
    expect(sql).toContain("where p.species_key in ('DOG', 'CAT')");
  });

  it.each(PET_CANONICAL_SPECIES)(
    'keeps list and Home recommendations scoped to $speciesKey',
    async species => {
      const exactGuides = [0, 1].map(index =>
        makeGuide(
          `${species.speciesKey.toLowerCase()}-${index}`,
          species.speciesKey,
        ),
      );
      const otherSpecies = species.speciesKey === 'DOG' ? 'CAT' : 'DOG';
      const wrongGuide = makeGuide('wrong-species', otherSpecies);
      wrongGuide.tags = [species.speciesLabel];
      wrongGuide.speciesKeywords = [species.speciesLabel];
      const context = {
        userId: 'qa-user',
        petId: `qa-${species.speciesKey.toLowerCase()}`,
        species: species.group,
        speciesDetailKey: species.defaultSubtypeKey,
        speciesDisplayName: species.speciesLabel,
        birthDate: null,
        deathDate: null,
        now: new Date('2026-09-17T00:00:00.000Z'),
      };

      expect(
        filterPetCareGuidesForListAudience(
          [...exactGuides, wrongGuide],
          context,
        ),
      ).toEqual(exactGuides);

      const homeGuides = await pickHomeGuideRecommendations(
        [...exactGuides, wrongGuide],
        context,
      );
      expect(homeGuides).toHaveLength(2);
      expect(
        homeGuides.every(guide =>
          guide.targetSpecies.includes(species.speciesKey),
        ),
      ).toBe(true);
    },
  );

  it('maps semantic guide roles to distinct presentation contracts', () => {
    const accent = {
      primary: '#3366FF',
      tint: '#EEF3FF',
      border: '#C7D6FF',
      deep: '#183B8F',
    };
    const normal = getGuideContentBlockPresentation('normal', accent);
    const tip = getGuideContentBlockPresentation('tip', accent);
    const warning = getGuideContentBlockPresentation('warning', accent);
    const danger = getGuideContentBlockPresentation('danger', accent);

    expect(normal.backgroundColor).toBe('transparent');
    expect(tip.backgroundColor).toBe(accent.tint);
    expect(warning.icon).toBe('alert-triangle');
    expect(danger.icon).toBe('alert-octagon');
    expect(new Set([tip.color, warning.color, danger.color]).size).toBe(3);
  });

  it('never fills a sparse species catalog with another species', async () => {
    const context = {
      userId: 'qa',
      petId: 'qa-custom',
      species: 'other' as const,
      speciesKey: 'HAMSTER' as const,
      speciesDisplayName: '새로운 세부종',
      birthDate: null,
      deathDate: null,
    };
    const exact = makeGuide('hamster', 'HAMSTER');
    const wrong = makeGuide('dog', 'DOG');
    expect(await pickHomeGuideRecommendations([exact, wrong], context)).toEqual(
      [exact],
    );
    expect(filterPetCareGuidesForListAudience([wrong], context)).toEqual([]);
    const common = makeGuide('common', 'COMMON');
    expect(
      new Set(
        (
          await pickHomeGuideRecommendations([exact, wrong, common], context)
        ).map(item => item.id),
      ),
    ).toEqual(new Set(['hamster', 'common']));
  });
});
