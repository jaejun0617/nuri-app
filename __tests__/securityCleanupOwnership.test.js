jest.mock('npm:@supabase/supabase-js@2.97.0', () => ({ createClient: jest.fn() }), { virtual: true });

import { removeCleanupChunk } from '../supabase/functions/_shared/account-deletion-worker';

const item = { cleanup_item_id: 'item-a', request_id: 'request-a', storage_path: 'owner/pet/original.jpg' };
function client(authorization) {
  const remove = jest.fn().mockResolvedValue({ error: null });
  return {
    rpc: jest.fn().mockResolvedValue({ data: authorization, error: null }),
    storage: { from: jest.fn(() => ({ remove })) },
    remove,
  };
}
const allowed = {
  allowed: true, bucket_name: 'memory-images', storage_path: item.storage_path, owner_user_id: 'owner',
};

describe('SEC-001 deletion ownership', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('never deletes rejected legacy paths', async () => {
    const db = client({ allowed: false });
    expect(await removeCleanupChunk(db, 'memory-images', [item])).toEqual([
      expect.objectContaining({ skippedSecurity: true, success: false }),
    ]);
    expect(db.remove).not.toHaveBeenCalled();
  });
  it('requires the server-approved bucket and path, not merely a truthy response', async () => {
    for (const authorization of [null, { ...allowed, storage_path: 'another/file' },
      { ...allowed, bucket_name: 'pet-profiles' }, { ...allowed, owner_user_id: null }]) {
      const db = client(authorization);
      await removeCleanupChunk(db, 'memory-images', [item]);
      expect(db.remove).not.toHaveBeenCalled();
    }
  });
  it('checks ownership immediately before removing an authorized object', async () => {
    const db = client(allowed);
    const result = await removeCleanupChunk(db, 'memory-images', [item]);
    expect(db.rpc).toHaveBeenCalledWith('authorize_account_deletion_cleanup_item', { p_cleanup_item_id: 'item-a' });
    expect(db.remove).toHaveBeenCalledWith([item.storage_path]);
    expect(result[0].success).toBe(true);
  });
  it('fails closed if the ownership service is unavailable', async () => {
    const db = client(allowed);
    db.rpc.mockResolvedValue({ data: null, error: { code: 'unavailable', message: 'unavailable' } });
    await expect(removeCleanupChunk(db, 'memory-images', [item])).rejects.toThrow('unavailable');
    expect(db.remove).not.toHaveBeenCalled();
  });
  it('revalidates before a retry and cannot delete a newly rejected object', async () => {
    const db = client(allowed);
    db.remove.mockResolvedValueOnce({ error: { statusCode: 503, message: 'temporary failure' } });
    db.rpc.mockResolvedValueOnce({ data: allowed, error: null })
      .mockResolvedValueOnce({ data: { allowed: false }, error: null });
    const result = await removeCleanupChunk(db, 'memory-images', [item]);
    expect(db.remove).toHaveBeenCalledTimes(1);
    expect(result[0].skippedSecurity).toBe(true);
  });
  it('missing already-removed objects remain idempotent', async () => {
    const db = client(allowed);
    db.remove.mockResolvedValue({ error: { statusCode: 404, message: 'Object not found' } });
    expect((await removeCleanupChunk(db, 'memory-images', [item]))[0].success).toBe(true);
  });
});
