jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
    storage: { from: jest.fn() },
  },
}));

jest.mock('../src/services/supabase/storagePets', () => ({
  cleanupDeletedPetStorage: jest.fn(),
}));
jest.mock('../src/services/walk/product/finalDeletion', () => ({ captureWalkFinalDeletion: jest.fn(async () => ({ ticket: 'captured', ownerId: 'user-1', petId: 'pet-2' })), queueConfirmedWalkFinalDeletion: jest.fn(async () => true) }));
import { captureWalkFinalDeletion, queueConfirmedWalkFinalDeletion } from '../src/services/walk/product/finalDeletion';

import {
  deletePetSafely,
  getPetDeleteErrorMessage,
  PetDeleteError,
} from '../src/services/supabase/pets';

const { supabase } = jest.requireMock('../src/services/supabase/client') as {
  supabase: {
    from: jest.Mock;
    auth: { getUser: jest.Mock };
  };
};

const { cleanupDeletedPetStorage } = jest.requireMock(
  '../src/services/supabase/storagePets',
) as { cleanupDeletedPetStorage: jest.Mock };

function mockPetQueries(ownedPetIds: string[], deletedPetIds: string[] = []) {
  const order = jest.fn(() =>
    Promise.resolve({
      data: ownedPetIds.map(id => ({ id })),
      error: null,
    }),
  );
  const eqOwned = jest.fn(() => ({ order }));
  const selectOwned = jest.fn(() => ({ eq: eqOwned }));

  const selectDeleted = jest.fn(() =>
    Promise.resolve({
      data: deletedPetIds.map(id => ({ id })),
      error: null,
    }),
  );
  const eqDeleteUser = jest.fn(() => ({ select: selectDeleted }));
  const eqDeletePet = jest.fn(() => ({ eq: eqDeleteUser }));
  const remove = jest.fn(() => ({ eq: eqDeletePet }));

  supabase.from.mockReturnValue({ select: selectOwned, delete: remove });
  return { eqDeletePet, eqDeleteUser, remove };
}

describe('safe pet deletion service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    cleanupDeletedPetStorage.mockResolvedValue({ failedBuckets: [] });
  });

  it('blocks deleting the final remaining pet before issuing a delete', async () => {
    const { remove } = mockPetQueries(['pet-1']);

    await expect(deletePetSafely('pet-1')).rejects.toMatchObject({
      code: 'LAST_PET_REQUIRED',
    });
    expect(remove).not.toHaveBeenCalled();
    expect(cleanupDeletedPetStorage).not.toHaveBeenCalled();
  });

  it('deletes only the authenticated user pet and cleans that pet storage', async () => {
    const { eqDeletePet, eqDeleteUser } = mockPetQueries(
      ['pet-1', 'pet-2'],
      ['pet-2'],
    );

    await expect(deletePetSafely('pet-2')).resolves.toEqual({
      deletedPetId: 'pet-2',
      userId: 'user-1',
      storageCleanup: { failedBuckets: [] },
      walkCleanupPending: false,
    });

    expect(eqDeletePet).toHaveBeenCalledWith('id', 'pet-2');
    expect(eqDeleteUser).toHaveBeenCalledWith('user_id', 'user-1');
    expect(cleanupDeletedPetStorage).toHaveBeenCalledWith({
      userId: 'user-1',
      petId: 'pet-2',
    });
  });

  it('does not issue a delete for a pet outside the authenticated user list', async () => {
    const { remove } = mockPetQueries(['pet-1', 'pet-2']);

    await expect(deletePetSafely('other-user-pet')).rejects.toMatchObject({
      code: 'PET_NOT_FOUND',
    });
    expect(remove).not.toHaveBeenCalled();
    expect(captureWalkFinalDeletion).not.toHaveBeenCalled();
  });
  it('confirmed DB deletion survives local Walk cleanup pending and still cleans Storage/returns known deleted pet', async () => {
    mockPetQueries(['pet-1', 'pet-2'], ['pet-2']); jest.mocked(queueConfirmedWalkFinalDeletion).mockResolvedValueOnce(false);
    await expect(deletePetSafely('pet-2')).resolves.toMatchObject({ deletedPetId: 'pet-2', userId: 'user-1', walkCleanupPending: true });
    expect(cleanupDeletedPetStorage).toHaveBeenCalledTimes(1);
  });
  it('empty delete confirmation does not erase local Walk scope or infer final deletion', async () => {
    mockPetQueries(['pet-1', 'pet-2'], []);
    await expect(deletePetSafely('pet-2')).rejects.toMatchObject({ code: 'PET_NOT_FOUND' });
    expect(queueConfirmedWalkFinalDeletion).not.toHaveBeenCalled();
  });

  it('keeps backend details out of unknown user-facing failures', () => {
    expect(
      getPetDeleteErrorMessage(new Error('permission denied: raw detail')),
    ).toBe('아이 프로필을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
    expect(
      getPetDeleteErrorMessage(
        new PetDeleteError(
          'LAST_PET_REQUIRED',
          '최소 1개의 아이 프로필은 필요해요.',
        ),
      ),
    ).toBe('최소 1개의 아이 프로필은 필요해요.');
  });
});
