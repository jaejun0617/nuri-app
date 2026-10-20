export type WalkScopeMode = 'SELECTED' | 'PINNED';
export type WalkContextSnapshot = Readonly<{
  ownerId: string | null;
  selectedPetId: string | null;
  petIds: readonly string[];
  foreground: boolean;
}>;

// Lifecycle generations only, never server data or auth credentials. Token
// refresh/theme edits do not change identity; owner/selection ABA does.
export function createWalkContextFence(initial: WalkContextSnapshot) {
  let state = initial,
    owner = 0,
    selection = 0,
    foreground = 0,
    version = 0;
  const pets = new Map<string, number>();
  return {
    update(next: WalkContextSnapshot) {
      let changed = false;
      if (next.ownerId !== state.ownerId) {
        owner++;
        changed = true;
      }
      if (next.selectedPetId !== state.selectedPetId) {
        selection++;
        changed = true;
      }
      if (next.foreground !== state.foreground) {
        foreground++;
        changed = true;
      }
      for (const id of new Set([...state.petIds, ...next.petIds]))
        if (state.petIds.includes(id) !== next.petIds.includes(id)) {
          pets.set(id, (pets.get(id) ?? 0) + 1);
          changed = true;
        }
      state = next;
      if (changed) version++;
      return changed;
    },
    version: () => version,
    capture(petId: string, mode: WalkScopeMode) {
      const ownerId = state.ownerId;
      const generation = `${owner}:${foreground}:${pets.get(petId) ?? 0}:${
        mode === 'SELECTED' ? selection : 'pinned'
      }`;
      const available = () =>
        !!state.ownerId &&
        state.foreground &&
        state.petIds.includes(petId) &&
        (mode === 'PINNED' || state.selectedPetId === petId);
      if (!ownerId || !available()) return null;
      return {
        ownerId,
        petId,
        generation,
        current: () =>
          available() &&
          state.ownerId === ownerId &&
          generation ===
            `${owner}:${foreground}:${pets.get(petId) ?? 0}:${
              mode === 'SELECTED' ? selection : 'pinned'
            }`,
      };
    },
  };
}
