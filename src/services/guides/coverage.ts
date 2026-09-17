import { PET_CANONICAL_SPECIES, type PetSpeciesKey } from '../pets/species';
import type { PetCareGuide } from './types';

export const GUIDE_MINIMUM_BY_SPECIES: Readonly<Record<PetSpeciesKey, number>> =
  Object.freeze(
    PET_CANONICAL_SPECIES.reduce<Record<PetSpeciesKey, number>>(
      (result, species) => {
        result[species.guideSpeciesKey] =
          species.guideSpeciesKey === 'DOG' || species.guideSpeciesKey === 'CAT'
            ? 20
            : 10;
        return result;
      },
      {
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
      },
    ),
  );

export type GuideCoverageAudit = {
  counts: Readonly<Record<PetSpeciesKey, number>>;
  belowMinimum: ReadonlyArray<{
    speciesKey: PetSpeciesKey;
    actual: number;
    required: number;
  }>;
  duplicateTitles: ReadonlyArray<string>;
  guidesWithoutSpecies: ReadonlyArray<string>;
};

export function auditPublishedGuideCoverage(
  guides: ReadonlyArray<PetCareGuide>,
): GuideCoverageAudit {
  const activeSpecies = PET_CANONICAL_SPECIES.filter(
    species => species.isActive,
  );
  const counts = activeSpecies.reduce<Record<PetSpeciesKey, number>>(
    (result, species) => {
      result[species.speciesKey] = 0;
      return result;
    },
    {
      DOG: 0,
      CAT: 0,
      RABBIT: 0,
      HAMSTER: 0,
      GUINEA_PIG: 0,
      FERRET: 0,
      BIRD: 0,
      FISH: 0,
      REPTILE: 0,
      OTHER: 0,
    },
  );
  const titleCounts = new Map<string, number>();
  const guidesWithoutSpecies: string[] = [];

  guides
    .filter(guide => guide.isActive && guide.status === 'published')
    .forEach(guide => {
      const normalizedTitle = guide.title
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();
      titleCounts.set(
        normalizedTitle,
        (titleCounts.get(normalizedTitle) ?? 0) + 1,
      );

      const directSpecies = guide.targetSpecies.filter(
        (species): species is PetSpeciesKey => species !== 'COMMON',
      );
      if (
        directSpecies.length === 0 &&
        !guide.targetSpecies.includes('COMMON')
      ) {
        guidesWithoutSpecies.push(guide.id);
      }
      directSpecies.forEach(species => {
        counts[species] += 1;
      });
    });

  const belowMinimum = activeSpecies.flatMap(species => {
    const actual = counts[species.speciesKey];
    const required = GUIDE_MINIMUM_BY_SPECIES[species.speciesKey];
    return actual < required
      ? [{ speciesKey: species.speciesKey, actual, required }]
      : [];
  });

  return {
    counts,
    belowMinimum,
    duplicateTitles: [...titleCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([title]) => title)
      .sort(),
    guidesWithoutSpecies,
  };
}
