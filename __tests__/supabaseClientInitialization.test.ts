const mockCreateClient = jest.fn(() => ({ contract: 'preserved' }));
jest.mock('@supabase/supabase-js', () => ({ createClient: mockCreateClient }));
jest.mock('../src/services/supabase/config', () => ({
  SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
  SUPABASE_ANON_KEY: `e30.${require('buffer')
    .Buffer.from(JSON.stringify({ role: 'anon', ref: 'abcdefghijklmnopqrst' }))
    .toString('base64url')}.signature`,
}));

it('validates deployment values and preserves the React Native session contract', () => {
  const { supabase } = require('../src/services/supabase/client');
  expect(supabase).toEqual({ contract: 'preserved' });
  expect(mockCreateClient).toHaveBeenCalledWith(
    'https://abcdefghijklmnopqrst.supabase.co',
    expect.any(String),
    expect.objectContaining({
      auth: expect.objectContaining({
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: expect.anything(),
      }),
    }),
  );
});
