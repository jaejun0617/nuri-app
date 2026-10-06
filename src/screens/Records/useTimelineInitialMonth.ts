import { useCallback, useEffect, useRef } from 'react';

export function useTimelineInitialMonth({
  petId,
  enabled,
  latestRecordedMonth,
  setMonth,
}: {
  petId: string | null;
  enabled: boolean;
  latestRecordedMonth: string | null;
  setMonth: (month: string | null) => void;
}) {
  const resolvedPetId = useRef<string | null>(null);

  useEffect(() => {
    resolvedPetId.current = null;
  }, [enabled, petId]);

  // A delayed summary must never replace a user's explicit month (including all).
  useEffect(() => {
    if (
      !enabled ||
      !petId ||
      !latestRecordedMonth ||
      resolvedPetId.current === petId
    ) {
      return;
    }
    resolvedPetId.current = petId;
    setMonth(latestRecordedMonth);
  }, [enabled, latestRecordedMonth, petId, setMonth]);

  return useCallback(() => {
    resolvedPetId.current = petId;
  }, [petId]);
}
