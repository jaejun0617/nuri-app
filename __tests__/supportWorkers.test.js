/* global globalThis */
import { randomUUID } from 'node:crypto';
import {
  removeDeletedSupportPhoto,
  processDeletedSupportPhotos,
} from '../supabase/functions/_shared/support-photo-deletion';
import { processSupportReplies } from '../supabase/functions/_shared/support-reply-worker';

const id = '10000000-0000-4000-8000-000000000001';
const target = { bucket: 'support-ticket-photos', path: id + '.jpg' };
function client() {
  const remove = jest.fn().mockResolvedValue({ error: null });
  return {
    rpc: jest.fn(),
    storage: { from: jest.fn(() => ({ remove })) },
    remove,
  };
}
beforeAll(() => {
  if (!globalThis.crypto)
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID },
      configurable: true,
    });
});
it('rejects mismatched receipt targets without touching Storage', async () => {
  for (const value of [
    { ...target, path: 'other.jpg' },
    { ...target, bucket: 'other' },
  ]) {
    const db = client();
    db.rpc.mockResolvedValue({ data: value, error: null });
    await expect(removeDeletedSupportPhoto(db, id)).rejects.toThrow(
      'SUPPORT_CLEANUP_TARGET_MISMATCH',
    );
    expect(db.remove).not.toHaveBeenCalled();
  }
});
it('requires confirmation after official Storage removal', async () => {
  const db = client();
  db.rpc
    .mockResolvedValueOnce({ data: target, error: null })
    .mockResolvedValueOnce({ data: false, error: null });
  await expect(removeDeletedSupportPhoto(db, id)).rejects.toThrow(
    'SUPPORT_CLEANUP_UNCONFIRMED',
  );
  expect(db.remove).toHaveBeenCalledWith([id + '.jpg']);
});
it('does not treat a missing deletion receipt as deletion authorization', async () => {
  const db = client();
  db.rpc.mockResolvedValue({ data: null, error: null });
  expect(await removeDeletedSupportPhoto(db, id)).toEqual({
    id,
    removed: false,
  });
  expect(db.remove).not.toHaveBeenCalled();
});
it('rejects malformed cleanup or delivery batches before any work', async () => {
  for (const process of [processDeletedSupportPhotos, processSupportReplies]) {
    const db = client();
    db.rpc.mockResolvedValue({ data: ['../private'], error: null });
    await expect(process(db)).rejects.toThrow();
    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect(db.remove).not.toHaveBeenCalled();
  }
});
it('records uncertain delivery without reporting a lost response as confirmed failure', async () => {
  const db = client();
  db.rpc
    .mockResolvedValueOnce({ data: [id], error: null })
    .mockRejectedValueOnce(new Error('lost response'))
    .mockResolvedValueOnce({ data: false, error: null });
  expect(await processSupportReplies(db)).toEqual([
    { id, delivered: false, uncertain: true, recoveryRecorded: false },
  ]);
  expect(db.rpc.mock.calls.map(call => call[0])).toEqual([
    'support_reply_claim_v1',
    'support_reply_deliver_v1',
    'support_reply_fail_v1',
  ]);
});
