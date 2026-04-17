// 파일: src/store/mapViewportStore.ts
// 역할:
// - 지도 중심 좌표/줌 레벨을 도메인별로 영속 저장한다.
// - 상세 화면 왕복 뒤에도 마지막 viewport를 복원할 수 있도록 restore 인터페이스를 제공한다.
// 주의:
// - 이 store는 화면 상태의 source of truth가 아니라 복귀 UX용 snapshot 저장소다.
// - camera 이동 중 프레임마다 저장하지 말고, idle 시점에만 saveViewport를 호출해야 한다.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type MapViewportDomain =
  | 'animal-hospital'
  | 'pet-travel'
  | 'location-discovery'
  | 'walk';

export type MapViewportSnapshot = {
  centerLatitude: number;
  centerLongitude: number;
  zoomLevel: number;
  selectedItemId: string | null;
  updatedAt: string;
};

type MapViewportPersistedState = {
  byDomain: Partial<Record<MapViewportDomain, MapViewportSnapshot>>;
};

type MapViewportStoreState = MapViewportPersistedState & {
  hydrated: boolean;
  pendingRestoreByDomain: Partial<Record<MapViewportDomain, number>>;
  markHydrated: () => void;
  getViewport: (domain: MapViewportDomain) => MapViewportSnapshot | null;
  saveViewport: (
    domain: MapViewportDomain,
    viewport: Omit<MapViewportSnapshot, 'updatedAt'>,
  ) => void;
  setSelectedItem: (
    domain: MapViewportDomain,
    selectedItemId: string | null,
  ) => void;
  requestRestore: (domain: MapViewportDomain) => void;
  consumeRestoreViewport: (domain: MapViewportDomain) => MapViewportSnapshot | null;
  clearViewport: (domain: MapViewportDomain) => void;
};

const STORAGE_KEY = 'nuri.mapViewport.v1';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeSelectedItemId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeViewportSnapshot(value: unknown): MapViewportSnapshot | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    !isFiniteNumber(record.centerLatitude) ||
    !isFiniteNumber(record.centerLongitude) ||
    !isFiniteNumber(record.zoomLevel)
  ) {
    return null;
  }

  const updatedAt =
    typeof record.updatedAt === 'string' && record.updatedAt.trim()
      ? record.updatedAt
      : null;
  if (!updatedAt) {
    return null;
  }

  return {
    centerLatitude: record.centerLatitude,
    centerLongitude: record.centerLongitude,
    zoomLevel: record.zoomLevel,
    selectedItemId: normalizeSelectedItemId(record.selectedItemId),
    updatedAt,
  };
}

function normalizePersistedState(value: unknown): MapViewportPersistedState {
  if (typeof value !== 'object' || value === null) {
    return { byDomain: {} };
  }

  const byDomainRecord =
    'byDomain' in value &&
    typeof value.byDomain === 'object' &&
    value.byDomain !== null
      ? (value.byDomain as Record<string, unknown>)
      : {};

  const byDomain = Object.fromEntries(
    (['animal-hospital', 'pet-travel', 'location-discovery', 'walk'] as const)
      .map(domain => {
        const normalized = normalizeViewportSnapshot(byDomainRecord[domain]);
        return normalized ? [domain, normalized] : null;
      })
      .filter(
        (
          entry,
        ): entry is [MapViewportDomain, MapViewportSnapshot] => Boolean(entry),
      ),
  );

  return { byDomain };
}

export function buildMapViewportSnapshot(input: {
  centerLatitude: number;
  centerLongitude: number;
  zoomLevel: number;
  selectedItemId?: string | null;
}): MapViewportSnapshot | null {
  if (
    !isFiniteNumber(input.centerLatitude) ||
    !isFiniteNumber(input.centerLongitude) ||
    !isFiniteNumber(input.zoomLevel)
  ) {
    return null;
  }

  return {
    centerLatitude: input.centerLatitude,
    centerLongitude: input.centerLongitude,
    zoomLevel: input.zoomLevel,
    selectedItemId: normalizeSelectedItemId(input.selectedItemId),
    updatedAt: new Date().toISOString(),
  };
}

export const useMapViewportStore = create<MapViewportStoreState>()(
  persist(
    (set, get) => ({
      byDomain: {},
      hydrated: false,
      pendingRestoreByDomain: {},
      markHydrated: () => set({ hydrated: true }),
      getViewport: domain => get().byDomain[domain] ?? null,
      saveViewport: (domain, viewport) => {
        const nextSnapshot = buildMapViewportSnapshot(viewport);
        if (!nextSnapshot) {
          return;
        }

        set(state => ({
          byDomain: {
            ...state.byDomain,
            [domain]: nextSnapshot,
          },
        }));
      },
      setSelectedItem: (domain, selectedItemId) => {
        const current = get().byDomain[domain];
        if (!current) {
          return;
        }

        set(state => ({
          byDomain: {
            ...state.byDomain,
            [domain]: {
              ...current,
              selectedItemId: normalizeSelectedItemId(selectedItemId),
              updatedAt: new Date().toISOString(),
            },
          },
        }));
      },
      requestRestore: domain => {
        set(state => ({
          pendingRestoreByDomain: {
            ...state.pendingRestoreByDomain,
            [domain]: Date.now(),
          },
        }));
      },
      consumeRestoreViewport: domain => {
        const viewport = get().byDomain[domain] ?? null;
        const hasPendingRestore =
          typeof get().pendingRestoreByDomain[domain] === 'number';

        if (!hasPendingRestore) {
          return null;
        }

        set(state => {
          const nextPending = { ...state.pendingRestoreByDomain };
          delete nextPending[domain];

          return {
            pendingRestoreByDomain: nextPending,
          };
        });

        return viewport;
      },
      clearViewport: domain => {
        set(state => {
          const nextByDomain = { ...state.byDomain };
          const nextPending = { ...state.pendingRestoreByDomain };
          delete nextByDomain[domain];
          delete nextPending[domain];

          return {
            byDomain: nextByDomain,
            pendingRestoreByDomain: nextPending,
          };
        });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        byDomain: state.byDomain,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...normalizePersistedState(persistedState),
      }),
      onRehydrateStorage: () => state => {
        if (!state) {
          return;
        }

        state.markHydrated();
      },
    },
  ),
);

export function saveMapViewport(
  domain: MapViewportDomain,
  viewport: Omit<MapViewportSnapshot, 'updatedAt'>,
) {
  useMapViewportStore.getState().saveViewport(domain, viewport);
}

export function requestMapViewportRestore(domain: MapViewportDomain) {
  useMapViewportStore.getState().requestRestore(domain);
}

export function consumeMapViewportRestore(domain: MapViewportDomain) {
  return useMapViewportStore.getState().consumeRestoreViewport(domain);
}
