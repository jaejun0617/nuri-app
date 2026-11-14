import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { mixedInboxKey, type MixedInboxScope } from '../../services/notifications/mixedNotifications';
import type { IsolatedNoticeClient } from '../../screens/SupportIsolation/isolatedNoticeClient';

type ScopedInbox = MixedInboxScope & { client: IsolatedNoticeClient };
export const scopedDestinationKey = (scopeKey: string) =>
  ['scoped-notification-target', scopeKey] as const;
const Scope = createContext<{
  inbox: ScopedInbox | null;
  select(inbox: ScopedInbox | null): void;
}>({ inbox: null, select: () => {} });

export function useNotificationScope() {
  const scope = useContext(Scope);
  return scope.inbox?.isCurrent() ? scope : { inbox: null, select: scope.select };
}

export function NotificationScopeProvider({ children }: React.PropsWithChildren) {
  const [inbox, setInbox] = useState<ScopedInbox | null>(null);
  const current = useRef<ScopedInbox | null>(null);
  const query = useQueryClient();
  function discard(scope: ScopedInbox) {
    scope.client.dispose();
    query.removeQueries({ queryKey: mixedInboxKey(scope) });
    query.removeQueries({ queryKey: scopedDestinationKey(scope.key) });
  }
  function select(next: ScopedInbox | null) {
    if (!__DEV__) return;
    if (current.current) {
      discard(current.current);
    }
    current.current = next;
    setInbox(next);
  }
  useEffect(() => {
    if (!__DEV__) return;
    const unsubscribe = useAuthStore.subscribe((next, previous) => {
      if (next.session !== previous.session && current.current) {
        current.current.client.dispose();
        query.removeQueries({ queryKey: mixedInboxKey(current.current) });
        query.removeQueries({ queryKey: scopedDestinationKey(current.current.key) });
        current.current = null;
        setInbox(null);
      }
    });
    return () => {
      unsubscribe();
      current.current?.client.dispose();
      current.current = null;
    };
  }, [query]);
  return <Scope.Provider value={{ inbox: __DEV__ ? inbox : null, select }}>{children}</Scope.Provider>;
}
