import { useEffect, useMemo, useRef, useState } from 'react';

import { createLatestRequestController } from '../services/app/async';
import { getHomePetCareGuideRecommendations } from '../services/guides/service';
import type { GuidePersonalizationContext, PetCareGuide } from '../services/guides/types';
import { usePetCareGuideCatalog } from './usePetCareGuideCatalog';

type UseHomePetCareGuidesState = {
  loading: boolean;
  guides: PetCareGuide[];
  error: string | null;
};

const EMPTY_GUIDES: PetCareGuide[] = [];

export function useHomePetCareGuides(
  context: GuidePersonalizationContext,
): UseHomePetCareGuidesState {
  const { birthDate, deathDate, petId, species, speciesDetailKey, speciesDisplayName, userId } =
    context;
  const catalogState = usePetCareGuideCatalog();
  const [state, setState] = useState<UseHomePetCareGuidesState>({
    loading: true,
    guides: EMPTY_GUIDES,
    error: null,
  });
  const catalogSignature = useMemo(
    () =>
      catalogState.guides
        .map(guide => `${guide.id}:${guide.updatedAt}:${guide.isActive ? '1' : '0'}`)
        .join(','),
    [catalogState.guides],
  );
  const catalogGuidesRef = useRef(catalogState.guides);

  useEffect(() => {
    catalogGuidesRef.current = catalogState.guides;
  }, [catalogSignature, catalogState.guides]);

  useEffect(() => {
    if (catalogState.loading) {
      setState(prev => {
        if (prev.loading && prev.error === null) return prev;
        return { ...prev, loading: true, error: null };
      });
      return;
    }

    const request = createLatestRequestController();

    async function run() {
      const requestId = request.begin();

      try {
        const guides = await getHomePetCareGuideRecommendations({
          userId,
          petId,
          species,
          speciesDetailKey,
          speciesDisplayName,
          birthDate,
          deathDate,
        }, { catalog: catalogGuidesRef.current });
        if (!request.isCurrent(requestId)) return;
        setState({
          loading: false,
          guides,
          error: catalogState.error,
        });
      } catch {
        if (!request.isCurrent(requestId)) return;
        setState({
          loading: false,
          guides: EMPTY_GUIDES,
          error: '추천 팁을 불러오지 못했어요.',
        });
      }
    }

    run().catch(() => {});

    return () => {
      request.cancel();
    };
  }, [
    birthDate,
    deathDate,
    catalogSignature,
    catalogState.error,
    catalogState.loading,
    petId,
    species,
    speciesDetailKey,
    speciesDisplayName,
    userId,
  ]);

  return state;
}
