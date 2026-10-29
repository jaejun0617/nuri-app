import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  enqueuePendingMemoryUpload,
  processPendingMemoryUploads,
} from '../src/services/local/uploadQueue';
import {
  fetchMemoryById,
  updateMemoryImagePaths,
} from '../src/services/supabase/memories';
import {
  uploadMemoryImage,
  deleteMemoryImage,
} from '../src/services/supabase/storageMemories';

type State = { session: { user: { id: string } } | null };
let mockState: State = { session: { user: { id: 'A' } } };
const mockListeners = new Set<(next: State, previous: State) => void>();
const mockGetUser = jest.fn();
jest.mock('../src/store/authStore', () => ({
  useAuthStore: {
    getState: () => mockState,
    subscribe: (listener: (next: State, previous: State) => void) => {
      mockListeners.add(listener);
      return () => mockListeners.delete(listener);
    },
  },
}));
jest.mock('../src/services/supabase/client', () => ({
  supabase: { auth: { getUser: () => mockGetUser() } },
}));
jest.mock('../src/services/supabase/memories', () => ({
  fetchMemoryById: jest.fn(),
  updateMemoryImagePaths: jest.fn(),
}));
jest.mock('../src/services/supabase/storageMemories', () => ({
  uploadMemoryImage: jest.fn(),
  deleteMemoryImage: jest.fn(),
}));
const key = 'nuri.memory-upload-queue.v1';
const storage = new Map<string, string>();
const input = {
  userId: 'A',
  petId: 'pet',
  memoryId: 'memory',
  mode: 'create' as const,
  finalEntries: [
    {
      kind: 'pending' as const,
      key: 'photo',
      uri: 'file://photo.jpg',
      mimeType: 'image/jpeg',
    },
  ],
};
function owner(id: string | null) {
  const previous = mockState;
  mockState = { session: id ? { user: { id } } : null };
  mockListeners.forEach(listener => listener(mockState, previous));
}
beforeEach(() => {
  jest.clearAllMocks();
  storage.clear();
  owner('A');
  jest
    .mocked(AsyncStorage.getItem)
    .mockImplementation(async k => storage.get(k) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (k, value) => {
    storage.set(k, value);
  });
  mockGetUser.mockImplementation(async () => ({
    data: { user: mockState.session?.user ?? null },
    error: null,
  }));
  jest
    .mocked(fetchMemoryById)
    .mockResolvedValue({
      id: 'memory',
      petId: 'pet',
      title: 'saved',
      tags: [],
      createdAt: '',
      imagePaths: [],
    });
  jest
    .mocked(uploadMemoryImage)
    .mockResolvedValue({ path: 'A/pet/memory/upload.jpg' });
  jest
    .mocked(updateMemoryImagePaths)
    .mockResolvedValue({
      mode: 'multi',
      savedPaths: ['A/pet/memory/upload.jpg'],
    });
});
afterEach(() => expect(mockListeners.size).toBe(0));
it('does not trust a caller-supplied previous owner after an account switch', async () => {
  await enqueuePendingMemoryUpload(input);
  owner('B');
  expect((await processPendingMemoryUploads({ userId: 'A' })).processed).toBe(
    0,
  );
  expect(fetchMemoryById).not.toHaveBeenCalled();
  expect(JSON.parse(storage.get(key) ?? '[]')).toHaveLength(1);
});
it('keeps an inaccessible task when the account changes during a missing-row response', async () => {
  await enqueuePendingMemoryUpload(input);
  jest.mocked(fetchMemoryById).mockImplementationOnce(async () => {
    owner('B');
    throw { code: 'PGRST116' };
  });
  expect((await processPendingMemoryUploads({ userId: 'A' })).failed).toBe(0);
  expect(JSON.parse(storage.get(key) ?? '[]')).toEqual([
    expect.objectContaining({ attempts: 0, userId: 'A' }),
  ]);
  expect(uploadMemoryImage).not.toHaveBeenCalled();
});
it('retains a known uploaded path across A -> B -> A and attaches it only on a new eligible attempt', async () => {
  await enqueuePendingMemoryUpload(input);
  jest.mocked(uploadMemoryImage).mockImplementationOnce(async () => {
    owner('B');
    owner('A');
    return { path: 'A/pet/memory/upload.jpg' };
  });
  expect((await processPendingMemoryUploads({ userId: 'A' })).succeeded).toBe(
    0,
  );
  expect(updateMemoryImagePaths).not.toHaveBeenCalled();
  expect(deleteMemoryImage).not.toHaveBeenCalled();
  expect(JSON.parse(storage.get(key) ?? '[]')).toEqual([
    expect.objectContaining({
      attempts: 0,
      finalEntries: [{ kind: 'existing', path: 'A/pet/memory/upload.jpg' }],
    }),
  ]);
  expect((await processPendingMemoryUploads({ userId: 'A' })).succeeded).toBe(
    1,
  );
  expect(uploadMemoryImage).toHaveBeenCalledTimes(1);
  expect(updateMemoryImagePaths).toHaveBeenCalledWith({
    memoryId: 'memory',
    imagePaths: ['A/pet/memory/upload.jpg'],
  });
  expect(JSON.parse(storage.get(key) ?? '[]')).toEqual([]);
});
it('serializes simultaneous enqueues rather than dropping the other record', async () => {
  const first = enqueuePendingMemoryUpload(input);
  const second = enqueuePendingMemoryUpload({ ...input, memoryId: 'other' });
  await first;
  await second;
  expect(JSON.parse(storage.get(key) ?? '[]')).toHaveLength(2);
});
it('retains a retry after an ordinary upload failure without attaching a failed photo', async () => {
  await enqueuePendingMemoryUpload(input);
  jest.mocked(uploadMemoryImage).mockRejectedValueOnce(new Error('offline'));
  expect((await processPendingMemoryUploads({ userId: 'A' })).failed).toBe(1);
  expect(updateMemoryImagePaths).not.toHaveBeenCalled();
  expect(JSON.parse(storage.get(key) ?? '[]')).toEqual([
    expect.objectContaining({ attempts: 1 }),
  ]);
});
it('bounds automatic attempts without deleting the only retained photo plan', async () => {
  await enqueuePendingMemoryUpload(input);
  jest.mocked(uploadMemoryImage).mockRejectedValue(new Error('offline'));
  for (let attempt = 0; attempt < 6; attempt += 1)
    await processPendingMemoryUploads({ userId: 'A' });
  expect(uploadMemoryImage).toHaveBeenCalledTimes(5);
  expect(JSON.parse(storage.get(key) ?? '[]')).toEqual([
    expect.objectContaining({ attempts: 5, finalEntries: input.finalEntries }),
  ]);
});

it('preserves uploaded objects and their queued identity when a reference write commits but its response is lost', async () => {
  await enqueuePendingMemoryUpload(input);
  let serverPaths: string[] = [];
  jest.mocked(updateMemoryImagePaths).mockImplementationOnce(async request => {
    serverPaths = request.imagePaths;
    throw new Error('response lost after commit');
  });

  expect((await processPendingMemoryUploads({ userId: 'A' })).failed).toBe(1);
  expect(serverPaths).toEqual(['A/pet/memory/upload.jpg']);
  expect(deleteMemoryImage).not.toHaveBeenCalled();
  expect(JSON.parse(storage.get(key) ?? '[]')).toEqual([
    expect.objectContaining({
      attempts: 1,
      finalEntries: [{ kind: 'existing', path: 'A/pet/memory/upload.jpg' }],
    }),
  ]);

  expect((await processPendingMemoryUploads({ userId: 'A' })).succeeded).toBe(
    1,
  );
  expect(uploadMemoryImage).toHaveBeenCalledTimes(1);
  expect(updateMemoryImagePaths).toHaveBeenCalledTimes(2);
  expect(JSON.parse(storage.get(key) ?? '[]')).toEqual([]);
});

it('journals uploaded paths before submitting references and retains them if queue removal fails', async () => {
  await enqueuePendingMemoryUpload(input);
  jest.mocked(updateMemoryImagePaths).mockImplementationOnce(async request => {
    expect(JSON.parse(storage.get(key) ?? '[]')).toEqual([
      expect.objectContaining({
        finalEntries: request.imagePaths.map(path => ({
          kind: 'existing',
          path,
        })),
      }),
    ]);
    jest
      .mocked(AsyncStorage.setItem)
      .mockRejectedValueOnce(new Error('local removal failed'));
    return { mode: 'multi', savedPaths: request.imagePaths };
  });
  expect((await processPendingMemoryUploads({ userId: 'A' })).failed).toBe(1);
  expect(deleteMemoryImage).not.toHaveBeenCalled();
  expect((await processPendingMemoryUploads({ userId: 'A' })).succeeded).toBe(
    1,
  );
  expect(uploadMemoryImage).toHaveBeenCalledTimes(1);
  expect(JSON.parse(storage.get(key) ?? '[]')).toEqual([]);
});

it('does not delete a journaled object when the local journal response is ambiguous', async () => {
  await enqueuePendingMemoryUpload(input);
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(async (k, value) => {
    storage.set(k, value);
    throw new Error('journal response lost');
  });
  expect((await processPendingMemoryUploads({ userId: 'A' })).failed).toBe(1);
  expect(updateMemoryImagePaths).not.toHaveBeenCalled();
  expect(deleteMemoryImage).not.toHaveBeenCalled();
  expect((await processPendingMemoryUploads({ userId: 'A' })).succeeded).toBe(
    1,
  );
  expect(uploadMemoryImage).toHaveBeenCalledTimes(1);
});

it('still cleans up a partial upload before any journal or reference submission', async () => {
  await enqueuePendingMemoryUpload({
    ...input,
    finalEntries: [
      ...input.finalEntries,
      { ...input.finalEntries[0], key: 'second', uri: 'file://second.jpg' },
    ],
  });
  jest
    .mocked(uploadMemoryImage)
    .mockResolvedValueOnce({ path: 'A/pet/memory/first.jpg' })
    .mockRejectedValueOnce(new Error('second upload failed'));
  expect((await processPendingMemoryUploads({ userId: 'A' })).failed).toBe(1);
  expect(updateMemoryImagePaths).not.toHaveBeenCalled();
  expect(deleteMemoryImage).toHaveBeenCalledWith('A/pet/memory/first.jpg');
  expect(JSON.parse(storage.get(key) ?? '[]')).toEqual([
    expect.objectContaining({
      attempts: 1,
      finalEntries: [
        ...input.finalEntries,
        { ...input.finalEntries[0], key: 'second', uri: 'file://second.jpg' },
      ],
    }),
  ]);
});
