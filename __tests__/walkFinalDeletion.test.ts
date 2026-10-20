jest.mock('../src/services/walk/product/invalidation', () => ({
  purgeWalkProductAfterFinalDeletion: jest.fn(async () => undefined),
}));
import { NativeModules, Platform } from 'react-native';
import {
  confirmWalkFinalDeletion,
  isConfirmedFinalAccountDeletion,
  resumeConfirmedWalkFinalDeletions,
} from '../src/services/walk/product/finalDeletion';
import { purgeWalkProductAfterFinalDeletion } from '../src/services/walk/product/invalidation';
import type { AccountDeletionResult } from '../src/services/supabase/auth';
const owner = '11111111-1111-4111-8111-111111111111',
  pet = '22222222-2222-4222-8222-222222222222',
  ticket = '33333333-3333-4333-8333-333333333333';
const scope = { ownerId: owner, petId: pet, ticket };
function fixture() {
  Platform.OS = 'android';
  const command = jest.fn(async (op: string) =>
    op === 'PENDING'
      ? JSON.stringify([
          { ...scope, version: 1, confirmed: true, nativeDone: false },
        ])
      : op === 'READ'
      ? JSON.stringify({
          ...scope,
          version: 1,
          confirmed: true,
          nativeDone: false,
        })
      : op === 'STEP'
      ? 'DONE'
      : 'OK',
  );
  const binding = jest.fn(async () => '1'),
    product = jest.fn(async () => ticket);
  NativeModules.NuriWalk = {
    productGetBinding: binding,
    productCommand: product,
    finalCleanupCommand: command,
  };
  return { command, binding, product };
}
afterEach(() => {
  delete NativeModules.NuriWalk;
  jest.clearAllMocks();
});
test('already-confirmed V1 scope keeps exact legacy cleanup compatibility after unbinding without Auth/GPS', async () => {
  const f = fixture();
  expect(purgeWalkProductAfterFinalDeletion).not.toHaveBeenCalled();
  f.binding.mockRejectedValue(Error('now another owner'));
  await confirmWalkFinalDeletion(scope);
  expect(f.binding).not.toHaveBeenCalled();
  expect(f.product).not.toHaveBeenCalled();
  expect(f.command.mock.calls.map(call => call[0])).toEqual([
    'READ',
    'STEP',
    'ACK',
  ]);
  expect(purgeWalkProductAfterFinalDeletion).toHaveBeenCalledWith(
    owner,
    pet,
    'PET_FINAL',
  );
});
test.each([
  'pending_grace_period',
  'requested',
  'in_progress',
  'failed',
  'unknown_pending_confirmation',
  'cancelled',
] as const)(
  '%s never becomes a final purge based on lookup/actualStatus alone',
  status => {
    expect(
      isConfirmedFinalAccountDeletion({
        status,
        actualStatus: 'completed',
        canRestore: false,
      } as AccountDeletionResult),
    ).toBe(false);
  },
);
test.each([
  'db_deleted',
  'cleanup_pending',
  'completed',
  'completed_with_cleanup_pending',
] as const)(
  'explicit %s receipt is final only when not restorable and actual status final',
  status => {
    expect(
      isConfirmedFinalAccountDeletion({
        status,
        actualStatus: status,
        canRestore: false,
      } as AccountDeletionResult),
    ).toBe(true);
    expect(
      isConfirmedFinalAccountDeletion({
        status,
        actualStatus: status,
        canRestore: true,
      } as AccountDeletionResult),
    ).toBe(false);
  },
);
test('JS cleanup failure preserves confirmed journal without ACK; boot replays same scope, no binding/auth/GPS', async () => {
  const f = fixture();
  jest
    .mocked(purgeWalkProductAfterFinalDeletion)
    .mockRejectedValueOnce(Error('disk unavailable'));
  await expect(confirmWalkFinalDeletion(scope)).rejects.toThrow(
    'disk unavailable',
  );
  expect(f.command.mock.calls.map(c => c[0])).toEqual(['READ']);
  await resumeConfirmedWalkFinalDeletions();
  expect(f.binding).not.toHaveBeenCalled();
  expect(f.product).not.toHaveBeenCalled();
  expect(f.command.mock.calls.map(c => c[0])).toEqual([
    'READ',
    'PENDING',
    'READ',
    'STEP',
    'ACK',
  ]);
});
test('all native pages finish before acknowledgement; no foreign-scope draft/query purge', async () => {
  const f = fixture();
  let steps = 0;
  f.command.mockImplementation(async op =>
    op === 'READ'
      ? JSON.stringify({
          ...scope,
          version: 1,
          confirmed: true,
          nativeDone: false,
        })
      : op === 'STEP'
      ? ++steps === 1
        ? 'MORE'
        : 'DONE'
      : 'OK',
  );
  await confirmWalkFinalDeletion(scope);
  expect(f.command.mock.calls.map(c => c[0])).toEqual([
    'READ',
    'STEP',
    'STEP',
    'ACK',
  ]);
  expect(purgeWalkProductAfterFinalDeletion).toHaveBeenCalledTimes(1);
  expect(purgeWalkProductAfterFinalDeletion).toHaveBeenCalledWith(
    owner,
    pet,
    'PET_FINAL',
  );
});
