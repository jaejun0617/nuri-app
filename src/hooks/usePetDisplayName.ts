import { usePetStore, resolveSelectedPetId } from '../store/petStore';
import { getPetDisplayName } from '../utils/petDisplayName';

/** Explicit IDs never fall back to a different pet. Omission means current Home context. */
export function usePetDisplayName(petId?: string | null): string {
  return usePetStore(state => {
    const id =
      petId === undefined
        ? resolveSelectedPetId(state.pets, state.selectedPetId)
        : petId;
    return getPetDisplayName(state.pets.find(pet => pet.id === id)?.name);
  });
}
