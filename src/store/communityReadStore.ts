import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

type ReadStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;
type ReadState = {
  readKeys: Readonly<Record<string, true>>;
  hydratePost: (userId: string | null, postId: string) => Promise<void>;
  markRead: (userId: string | null, postId: string) => Promise<boolean>;
};

export function communityPostReadKey(userId: string | null, postId: string) {
  const viewer = userId?.trim();
  const scope = viewer ? `user:${encodeURIComponent(viewer)}` : 'guest';
  return `nuri.community.read.v1:${scope}:${encodeURIComponent(postId)}`;
}

// One small entry per post avoids an ever-growing single storage row. Reading
// state never owns server entities, list membership, ordering or pagination.
export function createCommunityReadStore(storage: ReadStorage = AsyncStorage) {
  const loaded = new Set<string>();
  const persisted = new Set<string>();
  const reads = new Map<string, Promise<void>>();
  const writes = new Map<string, Promise<boolean>>();

  return create<ReadState>((set, get) => ({
    readKeys: {},
    hydratePost: (userId, postId) => {
      if (!postId.trim()) return Promise.resolve();
      const key = communityPostReadKey(userId, postId);
      if (loaded.has(key) || get().readKeys[key]) return Promise.resolve();
      const pending = reads.get(key);
      if (pending) return pending;
      const request = storage
        .getItem(key)
        .then(value => {
          loaded.add(key);
          if (value === '1') {
            persisted.add(key);
            set(state => ({ readKeys: { ...state.readKeys, [key]: true } }));
          }
          // A delayed unread result must not erase a newer local read.
        })
        .catch(() => {
          if (__DEV__) console.warn('[NURI-COMMUNITY-READ] load_failed');
        })
        .finally(() => reads.delete(key));
      reads.set(key, request);
      return request;
    },
    markRead: (userId, postId) => {
      if (!postId.trim()) return Promise.resolve(false);
      const key = communityPostReadKey(userId, postId);
      if (!get().readKeys[key]) {
        set(state => ({ readKeys: { ...state.readKeys, [key]: true } }));
      }
      if (persisted.has(key)) return Promise.resolve(true);
      const pending = writes.get(key);
      if (pending) return pending;
      const request = storage
        .setItem(key, '1')
        .then(() => {
          persisted.add(key);
          loaded.add(key);
          return true;
        })
        .catch(() => {
          // Keep the session indication, but permit a later visit to retry
          // persistence. Storage failure must not block reading the post.
          if (__DEV__) console.warn('[NURI-COMMUNITY-READ] save_failed');
          return false;
        })
        .finally(() => writes.delete(key));
      writes.set(key, request);
      return request;
    },
  }));
}

export const useCommunityReadStore = createCommunityReadStore();
