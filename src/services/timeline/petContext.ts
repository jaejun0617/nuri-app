import { resolveSelectedPetId, type Pet } from '../../store/petStore';

export function resolveTimelinePetId(
  pets: Pet[],
  selectedPetId: string | null,
  notificationPetId: string | null,
  notificationTargeted: boolean,
): string | null {
  // Ordinary tabs follow selection; a notification keeps its explicit owned target.
  if (notificationTargeted && notificationPetId) {
    return pets.some(pet => pet.id === notificationPetId)
      ? notificationPetId
      : null;
  }
  return resolveSelectedPetId(pets, selectedPetId);
}
