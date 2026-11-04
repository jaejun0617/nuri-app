import { Buffer } from 'buffer';
import { uploadMemoryImage } from '../src/services/supabase/storageMemories';

const mockUpload = jest.fn();
const mockInfo = jest.fn();
jest.mock('../src/services/supabase/client', () => ({
  supabase: { storage: { from: () => ({ upload: mockUpload, info: mockInfo }) } },
}));
jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: { fs: { readFile: async () => 'cGhvdG8=' } },
}));
jest.mock('../src/services/files/readFileAsBase64', () => ({
  readFileAsBase64: async () => 'cGhvdG8=',
}));
const input = {
  userId: 'owner', petId: 'pet', memoryId: 'memory',
  fileUri: 'file:///photo.png', mimeType: 'image/png',
  uploadId: '12345678-1234-4234-8234-123456789abc',
};
beforeEach(() => {
  jest.resetAllMocks();
  mockUpload.mockResolvedValue({ error: null });
});

it('uses an immutable path for a retried logical upload without overwriting', async () => {
  const first = await uploadMemoryImage(input);
  const second = await uploadMemoryImage(input);
  expect(second.path).toBe(first.path);
  expect(first.path).toMatch(/^owner\/pet\/memory_12345678-1234-4234-8234-123456789abc_[0-9a-f]{64}\.png$/);
  expect(mockUpload).toHaveBeenLastCalledWith(first.path, Buffer.from('photo'), {
    contentType: 'image/png', upsert: false,
  });
  const newTask = await uploadMemoryImage({ ...input, uploadId: '22345678-1234-4234-8234-123456789abc' });
  expect(newTask.path).not.toBe(first.path);
  expect(mockInfo).not.toHaveBeenCalled();
});

it('recovers a committed upload only after verifying the exact attempt object', async () => {
  mockUpload.mockResolvedValue({ error: new Error('response lost') });
  mockInfo.mockResolvedValue({ data: { size: 5, contentType: 'image/png' }, error: null });
  const result = await uploadMemoryImage(input);
  expect(mockInfo).toHaveBeenCalledWith(result.path);
  expect(mockUpload).toHaveBeenCalledTimes(1);
});

it.each([
  { data: null, error: new Error('offline') },
  { data: null, error: null },
  { data: { size: 4, contentType: 'image/png' }, error: null },
  { data: { size: 5, contentType: 'image/jpeg' }, error: null },
])('does not turn an unverified object into upload success: %j', async lookup => {
  const failure = new Error('upload not confirmed');
  mockUpload.mockResolvedValue({ error: failure });
  mockInfo.mockResolvedValue(lookup);
  await expect(uploadMemoryImage(input)).rejects.toBe(failure);
});

it('rejects an invalid attempt identity before reading or uploading', async () => {
  await expect(uploadMemoryImage({ ...input, uploadId: '../other' })).rejects.toThrow('MEMORY_UPLOAD_ID_INVALID');
  expect(mockUpload).not.toHaveBeenCalled();
});
