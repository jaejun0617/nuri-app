import type { Pet } from '../../store/petStore';
import { formatPetCalendarAgeLabel } from '../../services/pets/age';
import {
  buildPetSpeciesSelection,
  deriveCanonicalPetSpeciesKey,
} from '../../services/pets/species';
import { formatWeightKg, formatPetSex } from './profileEditPresentation';

export type SavedPetProfile = Pick<
  Pet,
  | 'id'
  | 'name'
  | 'avatarUrl'
  | 'species'
  | 'speciesKey'
  | 'speciesDetailKey'
  | 'speciesDisplayName'
  | 'breed'
  | 'birthDate'
  | 'weightKg'
  | 'gender'
>;

export type ProfileCompletionReceipt = {
  ownerId: string;
  savedPet: SavedPetProfile;
};

export function buildProfileCompletionSummary(
  pet: SavedPetProfile,
  now = new Date(),
) {
  const detail =
    pet.speciesDisplayName?.trim() ||
    pet.speciesDetailKey?.trim() ||
    pet.breed?.trim() ||
    '';
  const species =
    !pet.species && !pet.speciesKey && !detail
      ? null
      : buildPetSpeciesSelection(
          deriveCanonicalPetSpeciesKey({ ...pet, species: pet.species }),
          detail,
        ).speciesDisplayName;
  return {
    name: pet.name.trim() || '아이',
    photoUri: pet.avatarUrl?.trim() || null,
    fields: [
      { key: 'species', label: '품종', value: species || '미입력' },
      {
        key: 'age',
        label: '나이',
        value: formatPetCalendarAgeLabel(pet.birthDate, now) ?? '미입력',
      },
      {
        key: 'weight',
        label: '몸무게',
        value: formatWeightKg(pet.weightKg) ?? '미입력',
      },
      {
        key: 'gender',
        label: '성별',
        value: formatPetSex(pet.gender) ?? '미입력',
      },
    ],
  };
}

export function captureSavedPetProfile(pet: Pet): SavedPetProfile {
  return {
    id: pet.id,
    name: pet.name,
    avatarUrl: pet.avatarUrl,
    species: pet.species,
    speciesKey: pet.speciesKey,
    speciesDetailKey: pet.speciesDetailKey,
    speciesDisplayName: pet.speciesDisplayName,
    breed: pet.breed,
    birthDate: pet.birthDate,
    weightKg: pet.weightKg,
    gender: pet.gender,
  };
}
