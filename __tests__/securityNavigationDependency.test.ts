import { getStateFromPath, getPathFromState } from '@react-navigation/native';
import queryString from 'query-string';

it('preserves query parsing, Korean text and duplicate values through the ESM decoder bridge', () => {
  expect(queryString.parse('title=%EB%88%84%EB%A6%AC&tag=a&tag=b')).toEqual({
    title: '누리', tag: ['a', 'b'],
  });
  expect(queryString.stringify({ title: '누리' })).toBe('title=%EB%88%84%EB%A6%AC');
});

it('preserves navigation path and OAuth callback query semantics', () => {
  const config = { screens: { OAuthCallback: 'auth/callback', CommunityDetail: 'posts/:postId' } };
  const state = getStateFromPath('/auth/callback?code=synthetic-code&provider=google', config);
  expect(state?.routes[0]).toMatchObject({
    name: 'OAuthCallback', params: { code: 'synthetic-code', provider: 'google' },
  });
  expect(getPathFromState({ routes: [{ name: 'CommunityDetail', params: { postId: 'qa-post' } }] }, config)).toBe('/posts/qa-post');
});

it('handles a long malformed percent sequence without recursive exponential decoding', () => {
  const malformed = '%FE%FF'.repeat(1000);
  const start = Date.now();
  const parsed = queryString.parse(`value=${malformed}`);
  expect(typeof parsed.value).toBe('string');
  expect(Date.now() - start).toBeLessThan(1000);
});
