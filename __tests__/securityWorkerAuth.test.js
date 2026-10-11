import { verifyWorkerCredential } from '../supabase/functions/_shared/worker-auth';

const request = headers => ({ headers: { get: key => headers[key] ?? null } });
const fixtureCredential = 'isolated-unit-test-credential';
test.each([undefined, '', '   '])('missing worker secret denies', value => {
  expect(verifyWorkerCredential(request({}), value)).toBe(false);
  expect(verifyWorkerCredential(request({ 'x-cron-secret': fixtureCredential }), value)).toBe(false);
});
test.each([{}, { 'x-cron-secret': '' }, { 'x-cron-secret': 'wrong' }, { authorization: fixtureCredential }])('absent or incorrect request denies', headers => {
  expect(verifyWorkerCredential(request(headers), fixtureCredential)).toBe(false);
});
test('valid cron header or Bearer credential allows', () => {
  expect(verifyWorkerCredential(request({ 'x-cron-secret': fixtureCredential }), fixtureCredential)).toBe(true);
  expect(verifyWorkerCredential(request({ authorization: `Bearer ${fixtureCredential}` }), fixtureCredential)).toBe(true);
});
test('an explicitly invalid header cannot fall back to a valid bearer', () => {
  expect(verifyWorkerCredential(request({ 'x-cron-secret': '', authorization: `Bearer ${fixtureCredential}` }), fixtureCredential)).toBe(false);
});
