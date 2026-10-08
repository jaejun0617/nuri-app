import {
  communityPostReadKey,
  createCommunityReadStore,
} from '../src/store/communityReadStore';

function fixture() {
  const disk = new Map<string, string>();
  const storage = {
    getItem: jest.fn(async (key: string) => disk.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      disk.set(key, value);
    }),
  };
  return { disk, storage, store: createCommunityReadStore(storage) };
}

describe('community account-local read indication', () => {
  it('persists across store recreation without a time limit', async () => {
    const { store, storage } = fixture();
    await store.getState().markRead('viewer-a', 'post-a');
    const restarted = createCommunityReadStore(storage);
    await restarted.getState().hydratePost('viewer-a', 'post-a');
    expect(
      restarted.getState().readKeys[communityPostReadKey('viewer-a', 'post-a')],
    ).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      communityPostReadKey('viewer-a', 'post-a'),
      '1',
    );
  });

  it('isolates accounts and guests, including keys containing delimiters', async () => {
    const { store } = fixture();
    await store.getState().markRead('a', 'post-a');
    await store.getState().hydratePost('b', 'post-a');
    await store.getState().hydratePost(null, 'post-a');
    expect(store.getState().readKeys[communityPostReadKey('a', 'post-a')]).toBe(
      true,
    );
    expect(
      store.getState().readKeys[communityPostReadKey('b', 'post-a')],
    ).toBeUndefined();
    expect(
      store.getState().readKeys[communityPostReadKey(null, 'post-a')],
    ).toBeUndefined();
    expect(communityPostReadKey('a:b', 'c')).not.toBe(
      communityPostReadKey('a', 'b:c'),
    );
  });

  it('never removes previous reads when other posts are read or hydrated', async () => {
    const { store } = fixture();
    for (const id of ['old', 'new', 'newer'])
      await store.getState().markRead('a', id);
    await store.getState().hydratePost('a', 'unread');
    expect(Object.keys(store.getState().readKeys)).toHaveLength(3);
    expect(store.getState().readKeys[communityPostReadKey('a', 'old')]).toBe(
      true,
    );
  });

  it('does not overwrite a new read with a late unread hydration', async () => {
    const { store, storage } = fixture();
    let resolveRead: (value: string | null) => void = () => {};
    storage.getItem.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveRead = resolve;
        }),
    );
    const read = store.getState().hydratePost('a', 'late');
    await store.getState().markRead('a', 'late');
    resolveRead(null);
    await read;
    expect(store.getState().readKeys[communityPostReadKey('a', 'late')]).toBe(
      true,
    );
  });

  it('coalesces concurrent writes and does not rewrite an already saved read', async () => {
    const { store, storage } = fixture();
    await Promise.all([
      store.getState().markRead('a', 'p'),
      store.getState().markRead('a', 'p'),
    ]);
    await store.getState().markRead('a', 'p');
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent hydration and skips a loaded unread entry', async () => {
    const { store, storage } = fixture();
    await Promise.all([
      store.getState().hydratePost('a', 'p'),
      store.getState().hydratePost('a', 'p'),
    ]);
    await store.getState().hydratePost('a', 'p');
    expect(storage.getItem).toHaveBeenCalledTimes(1);
  });

  it('keeps a session read after storage failure and permits retry', async () => {
    const { store, storage } = fixture();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    storage.setItem.mockRejectedValueOnce(new Error('disk'));
    expect(await store.getState().markRead('a', 'p')).toBe(false);
    expect(store.getState().readKeys[communityPostReadKey('a', 'p')]).toBe(
      true,
    );
    expect(await store.getState().markRead('a', 'p')).toBe(true);
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('does not manufacture reads for malformed values, failures or empty post IDs', async () => {
    const { store, storage, disk } = fixture();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    disk.set(communityPostReadKey('a', 'bad'), '{bad');
    await store.getState().hydratePost('a', 'bad');
    storage.getItem.mockRejectedValueOnce(new Error('disk'));
    await store.getState().hydratePost('a', 'failed');
    await store.getState().hydratePost('a', 'failed');
    await store.getState().hydratePost('a', '');
    expect(await store.getState().markRead('a', ' ')).toBe(false);
    expect(store.getState().readKeys).toEqual({});
    expect(storage.setItem).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
