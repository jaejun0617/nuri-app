import { useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';

/** Capture one mounted owner/pet generation, including A → B → A changes. */
export function useOwnerOperation(scopeKey: string) {
  const scope = useRef({ active: true, version: 0, key: scopeKey });
  scope.current.key = scopeKey;
  useEffect(() => {
    const current = scope.current;
    current.active = true;
    current.version += 1;
    const unsubscribe = useAuthStore.subscribe((next, previous) => {
      if (next.session?.user.id !== previous.session?.user.id)
        current.version += 1;
    });
    return () => {
      current.active = false;
      current.version += 1;
      unsubscribe();
    };
  }, [scopeKey]);
  return useCallback(() => {
    const { version, key } = scope.current;
    const owner = useAuthStore.getState().session?.user.id;
    return () =>
      Boolean(owner) &&
      scope.current.active &&
      scope.current.version === version &&
      scope.current.key === key &&
      useAuthStore.getState().session?.user.id === owner;
  }, []);
}
