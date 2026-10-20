import { startWalkWithPermission } from '../src/services/walk/runtime/productStartPermission';
import type { WalkProductContext } from '../src/services/walk/runtime/productWalkService';
import type { LocationPermissionGrant } from '../src/services/location/permission';
const granted: LocationPermissionGrant = {
  status: 'granted',
  accuracy: 'precise',
};
function fixture() {
  let context: WalkProductContext = {
    ownerId: 'owned',
    foreground: true,
    revision: 1,
  };
  const check = jest.fn(async () => granted),
    request = jest.fn(async () => granted),
    start = jest.fn(async () => undefined);
  return {
    check,
    request,
    start,
    context: () => context,
    set: (c: WalkProductContext) => {
      context = c;
    },
  };
}
test('existing precise grant explicitly starts, no OS request; mere factory has no effect', async () => {
  const f = fixture();
  expect(f.check).not.toHaveBeenCalled();
  expect(await startWalkWithPermission(f)).toBe('STARTED');
  expect(f.request).not.toHaveBeenCalled();
  expect(f.start).toHaveBeenCalledTimes(1);
});
test('denial and approximate-only never allocate/start a session', async () => {
  const f = fixture();
  f.check.mockResolvedValue({ status: 'denied', accuracy: 'unknown' });
  f.request.mockResolvedValue({ status: 'granted', accuracy: 'approximate' });
  expect(await startWalkWithPermission(f)).toBe('DENIED');
  expect(f.start).not.toHaveBeenCalled();
});
test.each(['dialog-appstate', 'owner-ABA', 'route-blur'] as const)(
  '%s during permission prompts explicit retry, never silent/late GPS start',
  async kind => {
    const f = fixture();
    f.check.mockResolvedValue({ status: 'denied', accuracy: 'unknown' });
    f.request.mockImplementation(async () => {
      f.set({
        ownerId: 'owned',
        foreground: kind !== 'route-blur',
        revision: 3,
      });
      return granted;
    });
    expect(await startWalkWithPermission(f)).toBe('RETRY_EXPLICITLY');
    expect(f.start).not.toHaveBeenCalled();
    f.set({ ownerId: 'owned', foreground: true, revision: 4 });
    f.check.mockResolvedValue(granted);
    expect(await startWalkWithPermission(f)).toBe('STARTED');
    expect(f.start).toHaveBeenCalledTimes(1);
  },
);
