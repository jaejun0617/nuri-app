import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AppState, Keyboard } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { supabase } from '../../services/supabase/client';
import { SUPABASE_URL } from '../../services/supabase/config';
import { observeTutorialInterrupt, tutorialInterruptRevision } from '../../services/tutorial/runtime';
import { mergeTutorialStates, parseTutorialProgress, tutorialCatalog, tutorialIds, type TutorialId, type TutorialStates, type TutorialState } from '../../services/tutorial/catalog';
import { useNotificationScope } from './NotificationScopeProvider';
import TutorialReader, { useTutorialMotionPermission } from '../../screens/Tutorial/TutorialReader';

type Request = (id?: TutorialId, state?: TutorialState) => Promise<{ eligible: boolean; states: TutorialStates }>;
type Snapshot = { eligible: boolean; states: TutorialStates } | null;
const emptyView = { open: (_id: TutorialId, _replay = false) => false, snapshot: null as Snapshot };
const Context = createContext(emptyView);
export const useTutorial = () => useContext(Context);

// Only a ready, focused entry can request the one shared reader. A pending
// lookup may resolve after the first gesture, but that entry then stays quiet.
export function useAutomaticTutorial(id: TutorialId, ready: boolean) {
  const focused = useIsFocused();
  const { open, snapshot } = useTutorial();
  const touched = useRef(false);
  const attempted = useRef(false);
  const entryRevision = useRef(tutorialInterruptRevision());
  useLayoutEffect(() => {
    if (!focused) {
      touched.current = false;
      attempted.current = false;
      entryRevision.current = tutorialInterruptRevision();
    }
  }, [focused]);
  useEffect(() => {
    if (focused && ready && !touched.current && !attempted.current && snapshot?.eligible &&
      entryRevision.current === tutorialInterruptRevision() && !Keyboard.isVisible()) {
      attempted.current = open(id);
    }
  }, [focused, id, open, ready, snapshot]);
  const onTouchStart = useCallback(() => { touched.current = true; }, []);
  return onTouchStart;
}

export function TutorialProvider({ children, initialNavigationReady }: React.PropsWithChildren<{ initialNavigationReady: boolean }>) {
  const { inbox } = useNotificationScope();
  const session = useAuthStore(s => s.session);
  const recovery = useAuthStore(s => s.passwordRecoveryFlow.status === 'active');
  const key = inbox ? `isolated:${inbox.userId}` : session ? `${SUPABASE_URL}:${session.user.id}` : null;
  const request = useMemo<Request | null>(() => {
    if (inbox) return (id, state) => inbox.client.tutorialProgress(id, state);
    if (!session || recovery) return null;
    return async (id, state) => {
      // Bind each request to the captured identity, never to the next session's token.
      const { data, error } = await supabase.rpc('tutorial_progress_v1', {
        p_topic: id ?? null, p_state: state ?? null,
      }).setHeader('Authorization', `Bearer ${session.access_token}`);
      if (error) throw error;
      return parseTutorialProgress(data);
    };
  }, [inbox, recovery, session]);
  const [loaded, setLoaded] = useState<{ request: Request; value: NonNullable<Snapshot> } | null>(null);
  const snapshot = loaded && loaded.request === request ? loaded.value : null;
  const [reader, setReader] = useState<{ id: TutorialId; replay: boolean; request: Request | null; key: string | null } | null>(null);
  const showing = useRef(false);
  const pending = useRef<TutorialStates>({});
  const generation = useRef(0);
  const storage = key ? `nuri:tutorial:v1:${key}` : null;
  const writes = useRef(Promise.resolve());
  const moreOpen = useUiStore(s => s.moreDrawerOpen);
  const motion = useTutorialMotionPermission();
  const close = useCallback(() => { showing.current = false; setReader(null); }, []);
  useEffect(() => observeTutorialInterrupt(close), [close]);
  useLayoutEffect(() => {
    pending.current = {};
    showing.current = false;
    generation.current += 1;
    return () => { generation.current += 1; };
  }, [request, storage]);

  const persist = useCallback((states: TutorialStates) => {
    if (storage) writes.current = writes.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(storage, JSON.stringify(states))).catch(() => {});
    return writes.current;
  }, [storage]);

  useEffect(() => {
    if (!storage || !request || !initialNavigationReady) return;
    const token = generation.current;
    let syncing = false;
    const sync = async () => {
      if (syncing) return;
      syncing = true;
      try {
        await writes.current;
        const raw = await AsyncStorage.getItem(storage).catch(() => null);
        let cached: TutorialStates = {};
        if (raw) {
          try { cached = parseTutorialProgress({ eligible: true, states: JSON.parse(raw) }).states; } catch { /* Ignore corrupt local cache. */ }
        }
        if (token !== generation.current) return;
        const remote = await request();
        if (token !== generation.current) return;
        pending.current = mergeTutorialStates(cached, pending.current);
        setLoaded({ request, value: { eligible: remote.eligible, states: mergeTutorialStates(remote.states, pending.current) } });
        if (!remote.eligible) return;
        for (const id of tutorialIds) {
          const state = pending.current[id];
          if (token !== generation.current) return;
          if (!state) continue;
          if (remote.states[id] !== 'completed' && remote.states[id] !== state) await request(id, state);
          if (token !== generation.current) return;
          if (pending.current[id] === state) delete pending.current[id];
        }
        await persist({ ...pending.current });
      } catch {
        if (token === generation.current) setLoaded(null);
      } finally { syncing = false; }
    };
    sync().catch(() => {});
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') sync().catch(() => {}); });
    return () => subscription.remove();
  }, [initialNavigationReady, persist, request, storage]);

  const open = useCallback((id: TutorialId, replay = false) => {
    if (showing.current || AppState.currentState !== 'active') return false;
    if (!replay && (!initialNavigationReady || moreOpen || recovery || !snapshot?.eligible ||
      snapshot.states[id] || pending.current[id] || !tutorialCatalog[id].automatic)) return false;
    showing.current = true;
    setReader({ id, replay, request, key });
    return true;
  }, [initialNavigationReady, key, moreOpen, recovery, request, snapshot]);

  function finish(state: TutorialState) {
    const entry = reader;
    if (!entry || entry.request !== request || entry.key !== key || !showing.current) return;
    close();
    if (!request || !snapshot?.eligible || !tutorialCatalog[entry.id].automatic || (entry.replay && state === 'skipped')) return;
    const token = generation.current;
    const id = entry.id;
    pending.current = mergeTutorialStates(pending.current, { [id]: state });
    persist({ ...pending.current }).catch(() => {});
    setLoaded({ request, value: { ...snapshot, states: mergeTutorialStates(snapshot.states, pending.current) } });
    request(id, state).then(remote => {
      if (token !== generation.current) return;
      if (pending.current[id] === state) delete pending.current[id];
      persist({ ...pending.current }).catch(() => {});
      setLoaded(previous => ({ request, value: {
        eligible: remote.eligible, states: mergeTutorialStates(previous?.value.states ?? {}, remote.states, pending.current),
      } }));
    }).catch(() => {});
  }

  const context = useMemo(() => ({ open, snapshot }), [open, snapshot]);
  return <Context.Provider value={context}>
    {children}
    {reader && reader.key === key && reader.request === request && !recovery ? (
      <TutorialReader topic={reader.id} replay={reader.replay}
        motion={motion}
        onClose={() => reader.replay ? close() : finish('skipped')}
        onComplete={() => finish('completed')} />
    ) : null}
  </Context.Provider>;
}
