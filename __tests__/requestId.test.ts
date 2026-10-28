import { createRequestId, isRequestId } from '../src/utils/requestId';

it('generates independently unique secure RFC 4122 v4 submission identities', () => {
  const ids = Array.from({ length: 100 }, () => createRequestId());
  expect(new Set(ids).size).toBe(100);
  expect(
    ids.every(id =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        id,
      ),
    ),
  ).toBe(true);
});
it.each([null, '', 'memory', '8bb826c0-5c0b-1aa4-9fba-55e3840ae64d'])(
  'rejects a non-v4 identity: %s',
  value => {
    expect(isRequestId(value)).toBe(false);
  },
);
