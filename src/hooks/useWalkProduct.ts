import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { resolveSelectedPetId, usePetStore } from '../store/petStore';
import { walkRecordRepository } from '../services/walk/server/supabaseWalkRecordRepository';
import { walkProgressionRepository } from '../services/walk/server/supabaseWalkProgressionRepository';
import {
  walkRequest,
  type WalkUiScope,
} from '../services/walk/product/requests';
import {
  createWalkContextFence,
  type WalkScopeMode,
} from '../services/walk/product/context';

export const walkKey = (
  owner: string | null,
  pet: string | null,
  leaf: string,
) => ['walk', owner, pet, leaf] as const;

// Cached auth only. A foreground/owner/selected-pet revision invalidates every
// captured continuation, including a switch away and back to the same pet.
const fence = createWalkContextFence({
  ownerId: null,
  selectedPetId: null,
  petIds: [],
  foreground: false,
});
const listeners = new Set<() => void>();
function syncContext() {
  const pets = usePetStore.getState();
  if (
    fence.update({
      ownerId: useAuthStore.getState().session?.user.id ?? null,
      selectedPetId: resolveSelectedPetId(pets.pets, pets.selectedPetId),
      petIds: pets.pets.map(p => p.id),
      foreground: AppState.currentState === 'active',
    })
  )
    for (const listener of listeners) listener();
}
let stop: (() => void) | null = null;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!stop) {
    const auth = useAuthStore.subscribe(syncContext),
      pet = usePetStore.subscribe(syncContext);
    const app = AppState.addEventListener('change', syncContext);
    stop = () => {
      auth();
      pet();
      app.remove();
    };
    syncContext();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      stop?.();
      stop = null;
    }
  };
}
export function useWalkScope(
  petId: string | null,
  mode: WalkScopeMode = 'PINNED',
): (WalkUiScope & { generation: string }) | null {
  useSyncExternalStore(subscribe, fence.version);
  const contextGeneration = petId
    ? fence.capture(petId, mode)?.generation
    : undefined;
  const alive = useRef(true);
  const route = useRef({ petId, mode, revision: 0 });
  if (route.current.petId !== petId || route.current.mode !== mode)
    route.current = { petId, mode, revision: route.current.revision + 1 };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  return useMemo(() => {
    const captured = petId ? fence.capture(petId, mode) : null;
    if (captured?.generation !== contextGeneration) return null;
    const availableNow = () => {
      const auth = useAuthStore.getState(), pets = usePetStore.getState();
      return auth.session?.user.id === captured?.ownerId && AppState.currentState === 'active' && pets.pets.some(pet => pet.id === petId) && (mode === 'PINNED' || resolveSelectedPetId(pets.pets, pets.selectedPetId) === petId);
    };
    const revision = route.current.revision;
    return captured && availableNow()
      ? {
          ...captured,
          generation: `${captured.generation}:${
            mode === 'SELECTED' ? 'selected' : revision
          }`,
          current: () =>
            alive.current &&
            route.current.revision === revision &&
            availableNow() &&
            captured.current(),
        }
      : null;
  }, [petId, mode, contextGeneration]);
}

export function useWalkProgression(
  petId: string | null,
  enabled = true,
  mode: WalkScopeMode = 'SELECTED',
) {
  const scope = useWalkScope(petId, mode);
  return useQuery({
    queryKey: [
      ...walkKey(scope?.ownerId ?? null, petId, 'progression'),
      scope?.generation,
    ],
    enabled: enabled && !!scope,
    queryFn: ({ signal }) =>
      walkRequest(
        scope!,
        () => walkProgressionRepository.get(scope!.petId),
        signal,
      ),
    staleTime: 60_000,
    refetchOnMount: true,
    retry: false,
  });
}
export function useWalkPrompt(petId: string | null, enabled = true) {
  const scope = useWalkScope(petId, 'SELECTED');
  return useQuery({
    queryKey: [
      ...walkKey(scope?.ownerId ?? null, petId, 'prompt'),
      scope?.generation,
    ],
    enabled: enabled && !!scope,
    queryFn: ({ signal }) =>
      walkRequest(
        scope!,
        () => walkRecordRepository.prompt(scope!.petId),
        signal,
      ),
    staleTime: 30_000,
    refetchOnMount: true,
    retry: false,
  });
}
export function useWalkSources(
  petId: string | null,
  memoryIds: readonly string[],
  enabled = true,
) {
  const scope = useWalkScope(petId);
  const identity = [...new Set(memoryIds)].sort().join(',');
  return useQuery({
    queryKey: [
      ...walkKey(scope?.ownerId ?? null, petId, 'sources'),
      identity,
      scope?.generation,
    ],
    enabled: enabled && !!scope && !!identity,
    queryFn: async ({ signal }) => {
      const ids = identity.split(',');
      const all = [];
      for (let i = 0; i < ids.length; i += 100) {
        const expected = ids
          .slice(i, i + 100)
          .map(memoryId => ({ memoryId, petId: scope!.petId }));
        all.push(
          ...(await walkRequest(
            scope!,
            () => walkRecordRepository.memorySummaries(expected),
            signal,
          )),
        );
      }
      return all;
    },
    staleTime: 30_000,
    refetchOnMount: 'always',
    retry: false,
  });
}
