import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWalkScope } from './useWalkProduct';
import {
  loadWalkDraft,
  saveWalkDraft,
  type WalkDraftFields,
  type WalkDraftScope,
} from '../services/walk/product/drafts';
import { walkRecordRepository } from '../services/walk/server/supabaseWalkRecordRepository';
import {
  WalkRecordError,
  type WalkRecordView,
} from '../services/walk/server/recordRepository';
import { walkRequest, walkErrorCopy } from '../services/walk/product/requests';
import { commitWalkComposer } from '../services/walk/product/composer';
import { canonicalWalkMemory } from '../services/walk/product/presentation';
import { invalidateWalkProduct } from '../services/walk/product/invalidation';
import { useRecordStore } from '../store/recordStore';
import { getDateYmdInKst } from '../utils/date';
import { processPendingMemoryUploads } from '../services/local/uploadQueue';

export function useGpsWalkComposer(
  clientSessionId: string | undefined,
  petId: string | null,
  value: WalkDraftFields,
  hydrate: (fields: WalkDraftFields, occurredAt: string) => void,
) {
  const scope = useWalkScope(petId);
  const draftScope = useMemo<WalkDraftScope | null>(
    () =>
      scope && clientSessionId
        ? { ownerId: scope.ownerId, petId: scope.petId, clientSessionId }
        : null,
    [scope, clientSessionId],
  );
  const [view, setView] = useState<WalkRecordView | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, retry] = useState(0);
  const [existingMemoryId, setExistingMemoryId] = useState<string | null>(null);
  const halted = useRef(false);
  const currentFields = useRef(value);
  currentFields.current = value;
  useEffect(() => {
    if (!clientSessionId || !scope || !draftScope) {
      setReady(false);
      return;
    }
    let active = true;
    const abort = new AbortController();
    halted.current = false;
    setReady(false);
    setView(null);
    setError(null);
    setExistingMemoryId(null);
    (async () => {
      const source = await walkRequest(
        scope,
        () => walkRecordRepository.get(clientSessionId, scope.petId),
        abort.signal,
      );
      const draft = await walkRequest(
        scope,
        () => loadWalkDraft(draftScope),
        abort.signal,
      );
      if (!active || !scope.current()) return;
      setView(source);
      setExistingMemoryId(source.memory?.id ?? null);
      if (source.sessionDeleted)
        throw new WalkRecordError('WALK_SESSION_DELETED', false);
      if (source.recordState === 'RECORD_DELETED')
        throw new WalkRecordError('WALK_RECORD_RECREATE_FORBIDDEN', false);
      if (source.summary) {
        const day = getDateYmdInKst(source.summary.startedAt);
        if (!day) throw new Error('WALK_INVALID_RECORD_RESPONSE');
        hydrate(
          draft?.fields ?? {
            title: source.memory?.title ?? '함께한 산책',
            content: source.memory?.content ?? '',
            emotion: null,
            tags: source.memory?.tags ?? [],
            photos: [],
          },
          day,
        );
      }
      if (
        source.recordState !== 'RECORD_PENDING' &&
        source.recordState !== 'RECORDED'
      )
        throw new Error('WALK_RECORD_UNAVAILABLE');
      setReady(true);
    })().catch(e => {
      if (active && scope.current()) setError(walkErrorCopy(e));
    });
    return () => {
      active = false;
      abort.abort();
    };
  }, [clientSessionId, draftScope, hydrate, revision, scope]);
  useEffect(() => {
    if (!ready || !scope || !draftScope || halted.current || !scope.current())
      return;
    saveWalkDraft(draftScope, value).catch(() => {
      if (scope.current()) {
        setReady(false);
        setError('작성 내용을 보관하지 못했어요. 다시 시도해 주세요.');
      }
    });
  }, [draftScope, ready, scope, value]);
  const submit = useCallback(async () => {
    if (!ready || !scope || !draftScope) return null;
    halted.current = true;
    try {
      const result = await commitWalkComposer(
        scope,
        draftScope,
        currentFields.current,
      );
      if (!scope.current()) return null;
      const memory = result.commit.record.memory!;
      useRecordStore
        .getState()
        .upsertOneLocal(scope.petId, canonicalWalkMemory(memory));
      useRecordStore.getState().setFocusedMemoryId(scope.petId, memory.id);
      invalidateWalkProduct(scope, 'MEMORY_COMMIT');
      if (result.photoQueued) {
        walkRequest(scope, () =>
          processPendingMemoryUploads({ userId: scope.ownerId }),
        )
          .then(() =>
            walkRequest(scope, () =>
              walkRecordRepository.get(draftScope.clientSessionId, scope.petId),
            ),
          )
          .then(latest => {
            if (scope.current() && latest.memory)
              useRecordStore
                .getState()
                .upsertOneLocal(
                  scope.petId,
                  canonicalWalkMemory(latest.memory),
                );
          })
          .catch(() => undefined);
      }
      setExistingMemoryId(memory.id);
      if (result.retained) halted.current = false;
      return result;
    } catch (e) {
      if (scope.current()) {
        halted.current = false;
        setError(walkErrorCopy(e));
      }
      throw e;
    }
  }, [draftScope, ready, scope]);
  return {
    view,
    ready: ready && !!scope?.current(),
    error,
    submit,
    existingMemoryId,
    retry: () => retry(n => n + 1),
    draftScope,
    current: () => !!scope?.current(),
    contextKey:
      scope && clientSessionId
        ? `${scope.ownerId}:${scope.petId}:${clientSessionId}:${scope.generation}`
        : null,
  };
}
